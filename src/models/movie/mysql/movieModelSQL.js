import { v4 as uuidv4 } from 'uuid'
import { DbConn } from '../../../database/dbConnection.js'
import { ERROR_TYPES, CustomError } from '../../../errors/customError.js'

export class MovieModel {
  constructor({ movieDbType }) {
    this.movieDbType = movieDbType
    this.databaseConnection = null
  }

  init = async () => {
    this.databaseConnection = new DbConn()
    await this.databaseConnection.init({ movieDbType: this.movieDbType })
  }

  async getAll({ genre }) {
    let query
    let queryParams = []

    if (genre) {
      query = `
        SELECT 
          movie.*,
          GROUP_CONCAT(DISTINCT genre.name) AS genre
        FROM 
          movie
        JOIN 
          movie_genre ON movie.id = movie_genre.movie_id
        JOIN 
          genre ON genre.id = movie_genre.genre_id
        WHERE 
          movie.id IN (
            SELECT movie.id
            FROM movie
            JOIN movie_genre ON movie.id = movie_genre.movie_id
            JOIN genre ON genre.id = movie_genre.genre_id
            WHERE LOWER(genre.name) = ?
          )
        GROUP BY 
          movie.id;
      `
      queryParams = [genre.toLowerCase()]
    }
    else {
      query = `
        SELECT 
          movie.*,
          GROUP_CONCAT(genre.name) AS genre
        FROM 
          movie
        LEFT JOIN 
          movie_genre ON movie.id = movie_genre.movie_id
        LEFT JOIN 
          genre ON genre.id = movie_genre.genre_id
        GROUP BY 
          movie.id;
      `
    }

    const movies = await this.databaseConnection.query({
      query,
      queryParams,
    })

    const mappedMovies = movies.map((movie) => {
      const movieResponse = { ...movie }

      if (movie.rate) {
        movieResponse.rate = String(movie.rate)
      }

      if (movie.genre) {
        movieResponse.genre = movie.genre
          .split(',')
          .map((g) => g.trim())
          .join(', ')
      }

      return movieResponse
    })

    return mappedMovies
  }

  async getById({ id }) {
    const queryParams = [id.toLowerCase()]
    const query = `
      SELECT 
        movie.title, 
        movie.year, 
        movie.director, 
        movie.duration, 
        movie.poster, 
        movie.rate, 
        movie.id AS id, 
        GROUP_CONCAT(DISTINCT genre.name) AS genre
      FROM 
        movie
      LEFT JOIN 
        movie_genre ON movie.id = movie_genre.movie_id
      LEFT JOIN 
        genre ON movie_genre.genre_id = genre.id
      WHERE 
        movie.id = ?
      GROUP BY 
        movie.id;
    `

    const movies = await this.databaseConnection.query({
      query,
      queryParams,
    })

    return movies.map((movie) => {
      const movieResponse = { ...movie }

      if (movie.genre) {
        if (Array.isArray(movie.genre)) {
          movieResponse.genre = movie.genre
        }
        else if (typeof movie.genre === 'string') {
          movieResponse.genre = movie.genre
            .split(',')
            .map((g) => g.trim())
        }
      }

      return movieResponse
    })
  }

  async create({ input }) {
    const { title, year, director, duration, poster, rate, genre } = input

    const uuid = uuidv4()

    const insertMovie = async () => await this.databaseConnection.query({
      query: `INSERT INTO movie (id, title, year, director, duration, poster, rate) 
              VALUES (?, ?, ?, ?, ?, ?, ?);`,
      queryParams: [uuid, title, year, director, duration, poster, rate],
    })

    const verifyAndInsertgenre = async () => {
      const genreIDs = await this.checkGenre(genre)
      await Promise.all(
        genreIDs.map(({ genreId }) =>
          this.databaseConnection.query({
            query: 'INSERT INTO movie_genre (movie_id, genre_id) VALUES (?, ?)',
            queryParams: [uuid, genreId],
          }),
        ),
      )
      return genreIDs
    }

    const [, genreIDs] = await this.databaseConnection.executeTransaction([
      insertMovie,
      verifyAndInsertgenre,
    ])

    return {
      id: uuid,
      title,
      year,
      director,
      duration,
      poster,
      rate,
      genre: genreIDs.map(({ genre: g }) => g),
    }
  }

  async delete({ id }) {
    const deleteRelations = async () => await this.databaseConnection.query({
      query: 'DELETE FROM movie_genre WHERE movie_id = ?',
      queryParams: [id],
    })

    const deleteMovie = async () => await this.databaseConnection.query({
      query: 'DELETE FROM movie WHERE id = ?',
      queryParams: [id],
    })

    const [, result] = await this.databaseConnection.executeTransaction([
      deleteRelations,
      deleteMovie,
    ])

    return result
  }

  async update({ id, fields, genre }) {
    let query, queryParams
    let genreIDs = null
    if (genre) {
      genreIDs = await this.checkGenre(genre)
    }

    const updateFields = async () => {
      if (fields.length > 0) {
        const setClause = fields.map(([key]) => `${key} = ?`).join(', ')
        const values = fields.map(([_, value]) => value)
        queryParams = [...values, id]

        query = `
          UPDATE movie
          SET ${setClause}
          WHERE id = ?;
        `

        const result = await this.databaseConnection.query({
          query,
          queryParams,
        })
        return result
      }
      else {
        return null
      }
    }

    const updategenre = async () => {
      if (genre) {
        query = 'DELETE FROM movie_genre WHERE movie_id = ?'
        queryParams = [id]

        await this.databaseConnection.query({
          query,
          queryParams,
        })

        await Promise.all(
          genreIDs.map(({ genreId }) => {
            query = 'INSERT INTO movie_genre (movie_id, genre_id) VALUES (?, ?)'
            queryParams = [id, genreId]
            return this.databaseConnection.query({
              query,
              queryParams,
            })
          }),
        )
        return genreIDs
      }
      else {
        return null
      }
    }

    const [result] = await this.databaseConnection.executeTransaction([updateFields, updategenre])
    return result
  }

  async checkGenre(received_genres) {
    console.log(`Checking ${received_genres}`)
    const genreIds = []
    const nonExistinggenre = []

    for (const genre of received_genres) {
      const trimmedGenre = genre.trim()
      const rows = await this.databaseConnection.query({
        query: `
          SELECT id, name FROM genre WHERE LOWER(name) = LOWER(?)`,
        queryParams: [trimmedGenre],
      })

      if (rows && rows.length > 0) {
        console.log(`El género "${trimmedGenre}" ya existe.`)
      }
      else {
        console.log(`El género "${trimmedGenre}" no existe.`)
        nonExistinggenre.push(trimmedGenre)
      }
    }

    if (nonExistinggenre.length > 0) {
      await Promise.all(
        nonExistinggenre.map((genre) => {
          return this.databaseConnection.query({
            query: 'INSERT INTO genre (name) VALUES (?)',
            queryParams: [genre],
          })
        }),
      )
    }

    for (const genre of received_genres) {
      const trimmedGenre = genre.trim()
      const rows = await this.databaseConnection.query({
        query: `
          SELECT id FROM genre WHERE LOWER(name) = LOWER(?)`,
        queryParams: [trimmedGenre],
      })

      if (!rows || rows.length === 0 || !rows[0]?.id) {
        const errorToLaunch = new CustomError({
          origError: new Error(`No ID found for genre: "${trimmedGenre}"`),
          errorType: ERROR_TYPES.general.NOT_FOUND,
        })

        throw errorToLaunch
      }

      genreIds.push({ genre: trimmedGenre, genreId: rows[0].id })
    }

    return genreIds
  }

  toString() {
    return `MovieModel: { movieDbType: ${
      this.movieDbType ? this.movieDbType.toString() : 'null'
    }, databaseConnection: ${
      this.databaseConnection ? 'Connected' : 'Disconnected'
    } }`
  }
}

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
          GROUP_CONCAT(DISTINCT genre.name) AS genres
        FROM 
          movie
        JOIN 
          movie_genres ON movie.id = movie_genres.movie_id
        JOIN 
          genre ON genre.id = movie_genres.genre_id
        WHERE 
          movie.id IN (
            SELECT movie.id
            FROM movie
            JOIN movie_genres ON movie.id = movie_genres.movie_id
            JOIN genre ON genre.id = movie_genres.genre_id
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
          GROUP_CONCAT(genre.name) AS genres
        FROM 
          movie
        LEFT JOIN 
          movie_genres ON movie.id = movie_genres.movie_id
        LEFT JOIN 
          genre ON genre.id = movie_genres.genre_id
        GROUP BY 
          movie.id;
      `
    }

    const movies = await this.databaseConnection.query({
      query,
      queryParams,
    })

    return movies.map((movie) => ({
      ...movie,
      rate: movie.rate ? String(movie.rate) : null,
      genres: movie.genres
        ? movie.genres
            .split(',')
            .map((g) => g.trim())
            .join(', ')
        : null,
    }))
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
        GROUP_CONCAT(DISTINCT genre.name) AS genres
      FROM 
        movie
      LEFT JOIN 
        movie_genres ON movie.id = movie_genres.movie_id
      LEFT JOIN 
        genre ON movie_genres.genre_id = genre.id
      WHERE 
        movie.id = ?
      GROUP BY 
        movie.id;
    `

    const movies = await this.databaseConnection.query({
      query,
      queryParams,
    })

    return movies.map((movie) => ({
      ...movie,
      genres: movie.genres
        ? movie.genres
            .split(',')
            .map((genre) => genre.trim())
            .join(', ')
        : null,
    }))
  }

  async create({ input }) {
    const { title, year, director, duration, poster, rate, genre } = input

    const uuid = uuidv4()

    const insertMovie = async () => await this.databaseConnection.query({
      query: `INSERT INTO movie (id, title, year, director, duration, poster, rate) 
              VALUES (?, ?, ?, ?, ?, ?, ?);`,
      queryParams: [uuid, title, year, director, duration, poster, rate],
    })

    let genresIDs = []
    const verifyAndInsertGenres = async () => {
      genresIDs = await this.checkGenres(genre)
      await Promise.all(
        genresIDs.map(({ genreId }) =>
          this.databaseConnection.query({
            query: 'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
            queryParams: [uuid, genreId],
          }),
        ),
      )
    }

    await this.databaseConnection.executeTransaction([
      insertMovie,
      verifyAndInsertGenres,
    ])

    return {
      id: uuid,
      title,
      year,
      director,
      duration,
      poster,
      rate,
      genres: genresIDs.map(({ genre: g }) => g),
    }
  }

  async delete({ id }) {
    let result

    const deleteRelations = async () => {
      await this.databaseConnection.query({
        query: 'DELETE FROM movie_genres WHERE movie_id = ?',
        queryParams: [id],
      })
    }

    const deleteMovie = async () => {
      result = await this.databaseConnection.query({
        query: 'DELETE FROM movie WHERE id = ?',
        queryParams: [id],
      })
    }

    await this.databaseConnection.executeTransaction([
      deleteRelations,
      deleteMovie,
    ])

    return result
  }

  async update({ id, fields, genre }) {
    let result, query, queryParams

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

        result = await this.databaseConnection.query({
          query,
          queryParams,
        })
      }
    }

    const updateGenres = async () => {
      if (genre) {
        query = 'DELETE FROM movie_genres WHERE movie_id = ?'
        queryParams = [id]

        await this.databaseConnection.query({
          query,
          queryParams,
        })

        const genresIDs = await this.checkGenres(genre)

        await Promise.all(
          genresIDs.map(({ genreId }) => {
            query = 'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)'
            queryParams = [id, genreId]
            return this.databaseConnection.query({
              query,
              queryParams,
            })
          }),
        )
      }
    }

    await this.databaseConnection.executeTransaction([updateFields, updateGenres])

    return result
  }

  async checkGenres(genres) {
    const genreIds = []
    const nonExistingGenres = []

    for (const genre of genres) {
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
        nonExistingGenres.push(trimmedGenre)
      }
    }

    if (nonExistingGenres.length > 0) {
      await Promise.all(
        nonExistingGenres.map((genre) => {
          return this.databaseConnection.query({
            query: 'INSERT INTO genre (name) VALUES (?)',
            queryParams: [genre],
          })
          // console.log(`El género "${genre}" fue insertado.`)
        }),
      )
    }

    for (const genre of genres) {
      const trimmedGenre = genre.trim()

      const rows = await this.databaseConnection.query({
        query: `
          SELECT id FROM genre WHERE LOWER(name) = LOWER(?)`,
        queryParams: [trimmedGenre],
      })

      if (!rows || rows.length === 0 || !rows[0]?.id) {
        throw new CustomError({
          origError: new Error(`No ID found for genre: "${trimmedGenre}"`),
          errorType: ERROR_TYPES.general.NOT_FOUND,
        })
      }

      genreIds.push({ genre: trimmedGenre, genreId: rows[0].id })
    }

    // console.log('IDs de géneros procesados:', genreIds)
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

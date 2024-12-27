import sinon from 'sinon'
import { DbConn } from '../../../src/database/dbConnection.js'
import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
const { expect } = chai
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'
import { checkErrorType } from '../../testUtils/checkErrorType.js'

describe('MovieModel', () => {
  let movieModel
  let dbConnMock
  let MockedMovieModel

  beforeEach(async () => {
    dbConnMock = {
      query: sinon.stub(),
      executeTransaction: sinon.stub(),
    }
    sinon.stub(DbConn.prototype, 'query').callsFake(dbConnMock.query)
    dbConnMock.executeTransaction.callsFake(async (queries) => {
      for (const query of queries) {
        await query()
      }
    })
    sinon.stub(DbConn.prototype, 'executeTransaction').callsFake(dbConnMock.executeTransaction)

    MockedMovieModel = await esmock(
      '../../../src/models/movie/mysql/movieModelSQL.js',
      {
        uuid: { v4: sinon.stub().returns('mocked-uuid') },
      },
    )
    movieModel = new MockedMovieModel.MovieModel({ movieDbType: 'sql' })
    movieModel.databaseConnection = new DbConn()
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('getAll', () => {
    it('debería devolver todas las películas cuando no se proporciona género', async () => {
      const mockMovies = [
        { id: '1', title: 'Movie A', rate: 4.5, genres: 'Action, Comedy' },
        { id: '2', title: 'Movie B', rate: null, genres: null },
      ]

      dbConnMock.query.resolves(mockMovies)

      const result = await movieModel.getAll({})

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0].query).to.include('LEFT JOIN')
      expect(dbConnMock.query.getCall(0).args[0].queryParams).to.deep.equal([])

      expect(result).to.deep.equal([
        { id: '1', title: 'Movie A', rate: '4.5', genres: 'Action, Comedy' },
        { id: '2', title: 'Movie B', rate: null, genres: null },
      ])
    })

    it('debería devolver películas filtradas por género', async () => {
      const mockMovies = [
        { id: '1', title: 'Movie A', rate: 4.5, genres: 'Action' },
      ]

      dbConnMock.query.resolves(mockMovies)

      const result = await movieModel.getAll({ genre: 'Action' })

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0].query).to.include('WHERE LOWER(genre.name) = ?')
      expect(dbConnMock.query.getCall(0).args[0].queryParams).to.deep.equal(['action'])

      expect(result).to.deep.equal([
        { id: '1', title: 'Movie A', rate: '4.5', genres: 'Action' },
      ])
    })
  })

  describe('getById', () => {
    it('debería devolver una película con sus géneros', async () => {
      const mockMovie = [
        {
          id: 'mocked-id',
          title: 'Mocked Movie',
          year: 2023,
          director: 'Mock Director',
          duration: 120,
          poster: 'mocked-poster',
          rate: 4.5,
          genres: 'Action, Comedy',
        },
      ]

      dbConnMock.query.resolves(mockMovie)

      const result = await movieModel.getById({ id: 'mocked-id' })

      expect(dbConnMock.query.calledOnce).to.be.true
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `
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
    `,
        queryParams: ['mocked-id'],
      })

      expect(result).to.deep.equal([
        {
          id: 'mocked-id',
          title: 'Mocked Movie',
          year: 2023,
          director: 'Mock Director',
          duration: 120,
          poster: 'mocked-poster',
          rate: 4.5,
          genres: 'Action, Comedy',
        },
      ])
    })
  })

  describe('create', () => {
    it('debería crear una película con sus géneros', async () => {
      const input = {
        title: 'Mocked Movie',
        year: 2023,
        director: 'Mock Director',
        duration: 120,
        poster: 'mocked-poster',
        rate: 4.5,
        genre: ['Action', 'Comedy'],
      }

      sinon.stub(movieModel, 'checkGenres').resolves([
        { genreId: '1', genre: 'Action' },
        { genreId: '2', genre: 'Comedy' },
      ])

      const result = await movieModel.create({ input })

      expect(result).to.deep.equal({
        id: 'mocked-uuid',
        title: input.title,
        year: input.year,
        director: input.director,
        duration: input.duration,
        poster: input.poster,
        rate: input.rate,
        genres: ['Action', 'Comedy'],
      })

      expect(dbConnMock.query.callCount).to.equal(3)
      expect(dbConnMock.query.getCall(0).args[0].query).to.include('INSERT INTO movie')
      expect(dbConnMock.query.getCall(1).args[0].queryParams).to.deep.equal(['mocked-uuid', '1'])
      expect(dbConnMock.query.getCall(2).args[0].queryParams).to.deep.equal(['mocked-uuid', '2'])
    })
  })

  describe('delete', () => {
    it('debería actualizar los campos y géneros de una película', async () => {
      const movieId = 'mocked-id'

      dbConnMock.query
        .onFirstCall().resolves()
        .onSecondCall().resolves({ affectedRows: 1 })

      const result = await movieModel.delete({ id: movieId })

      expect(dbConnMock.query.callCount).to.equal(2)

      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'DELETE FROM movie_genres WHERE movie_id = ?',
        queryParams: [movieId],
      })

      expect(dbConnMock.query.getCall(1).args[0]).to.deep.equal({
        query: 'DELETE FROM movie WHERE id = ?',
        queryParams: [movieId],
      })

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true

      expect(result).to.deep.equal({ affectedRows: 1 })
    })
  })

  describe('update', () => {
    it('debería actualizar los campos y géneros de una película', async () => {
      const movieId = 'mocked-id'
      const fields = [
        ['title', 'Updated Movie Title'],
        ['duration', 140],
      ]
      const genres = ['Action', 'Comedy']

      dbConnMock.query
        .onFirstCall().resolves({ affectedRows: 1 })
        .onSecondCall().resolves()
        .onThirdCall().resolves()
        .onCall(3).resolves()

      sinon.stub(movieModel, 'checkGenres').resolves([
        { genreId: '1', genre: 'Action' },
        { genreId: '2', genre: 'Comedy' },
      ])

      const result = await movieModel.update({ id: movieId, fields, genre: genres })

      expect(dbConnMock.query.callCount).to.equal(4)

      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `
          UPDATE movie
          SET title = ?, duration = ?
          WHERE id = ?;
        `,
        queryParams: ['Updated Movie Title', 140, movieId],
      })

      expect(dbConnMock.query.getCall(1).args[0]).to.deep.equal({
        query: 'DELETE FROM movie_genres WHERE movie_id = ?',
        queryParams: [movieId],
      })

      expect(dbConnMock.query.getCall(2).args[0]).to.deep.equal({
        query: 'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
        queryParams: [movieId, '1'],
      })

      expect(dbConnMock.query.getCall(3).args[0]).to.deep.equal({
        query: 'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
        queryParams: [movieId, '2'],
      })

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true

      expect(result).to.deep.equal({ affectedRows: 1 })
    })

    it('debería actualizar solo los campos de la película cuando no se proporcionan géneros', async () => {
      const movieId = 'mocked-id'
      const fields = [['title', 'Updated Movie Title']]

      dbConnMock.query.onFirstCall().resolves({ affectedRows: 1 })

      const result = await movieModel.update({ id: movieId, fields, genre: null })

      expect(dbConnMock.query.callCount).to.equal(1)

      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `
          UPDATE movie
          SET title = ?
          WHERE id = ?;
        `,
        queryParams: ['Updated Movie Title', movieId],
      })

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true

      expect(result).to.deep.equal({ affectedRows: 1 })
    })

    it('debería actualizar solo los géneros cuando no se proporcionan campos', async () => {
      const movieId = 'mocked-id'
      const genres = ['Drama', 'Thriller']

      dbConnMock.query
        .onFirstCall().resolves()
        .onCall(1).resolves()
        .onCall(2).resolves()

      sinon.stub(movieModel, 'checkGenres').resolves([
        { genreId: '3', genre: 'Drama' },
        { genreId: '4', genre: 'Thriller' },
      ])

      const result = await movieModel.update({ id: movieId, fields: [], genre: genres })

      expect(dbConnMock.query.callCount).to.equal(3)

      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: 'DELETE FROM movie_genres WHERE movie_id = ?',
        queryParams: [movieId],
      })

      expect(dbConnMock.query.getCall(1).args[0]).to.deep.equal({
        query: 'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
        queryParams: [movieId, '3'],
      })

      expect(dbConnMock.query.getCall(2).args[0]).to.deep.equal({
        query: 'INSERT INTO movie_genres (movie_id, genre_id) VALUES (?, ?)',
        queryParams: [movieId, '4'],
      })

      expect(dbConnMock.executeTransaction.calledOnce).to.be.true

      expect(result).to.deep.equal(undefined)
    })
  })

  describe('checkGenres', () => {
    it('debería manejar géneros existentes y no existentes', async () => {
      const genres = ['Action', 'New Genre']

      dbConnMock.query
        .onFirstCall().resolves([{ id: '1', name: 'Action' }])
        .onSecondCall().resolves([])
        .onThirdCall().resolves()
        .onCall(3).resolves([{ id: '1' }])
        .onCall(4).resolves([{ id: '2' }])

      const result = await movieModel.checkGenres(genres)

      expect(dbConnMock.query.callCount).to.equal(5)

      expect(dbConnMock.query.getCall(0).args[0].query.trim()).to.equal(
        'SELECT id, name FROM genre WHERE LOWER(name) = LOWER(?)',
      )
      expect(dbConnMock.query.getCall(0).args[0].queryParams).to.deep.equal(['Action'])

      expect(dbConnMock.query.getCall(1).args[0].query.trim()).to.equal(
        'SELECT id, name FROM genre WHERE LOWER(name) = LOWER(?)',
      )
      expect(dbConnMock.query.getCall(1).args[0].queryParams).to.deep.equal(['New Genre'])

      expect(dbConnMock.query.getCall(2).args[0].query.trim()).to.equal(
        'INSERT INTO genre (name) VALUES (?)',
      )
      expect(dbConnMock.query.getCall(2).args[0].queryParams).to.deep.equal(['New Genre'])

      expect(dbConnMock.query.getCall(3).args[0].query.trim()).to.equal(
        'SELECT id FROM genre WHERE LOWER(name) = LOWER(?)',
      )
      expect(dbConnMock.query.getCall(3).args[0].queryParams).to.deep.equal(['Action'])

      expect(dbConnMock.query.getCall(4).args[0].query.trim()).to.equal(
        'SELECT id FROM genre WHERE LOWER(name) = LOWER(?)',
      )
      expect(dbConnMock.query.getCall(4).args[0].queryParams).to.deep.equal(['New Genre'])

      expect(result).to.deep.equal([
        { genre: 'Action', genreId: '1' },
        { genre: 'New Genre', genreId: '2' },
      ])
    })

    it('debería lanzar un error si no se encuentra el ID de un género', async () => {
      const genres = ['NonExistentGenre']

      dbConnMock.query
        .onFirstCall().resolves([])
        .onSecondCall().resolves()
        .onCall(2).resolves([])

      try {
        await movieModel.checkGenres(genres)
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError).to.be.instanceOf(Error)
        expect(checkErrorType(error.errorType)).to.be.true
      }

      expect(dbConnMock.query.callCount).to.equal(3)

      dbConnMock.query.getCall(0).args[0].query = dbConnMock.query.getCall(0).args[0].query.trim()
      expect(dbConnMock.query.getCall(0).args[0]).to.deep.equal({
        query: `
                SELECT id, name FROM genre WHERE LOWER(name) = LOWER(?)`.trim(),
        queryParams: ['NonExistentGenre'],
      })

      dbConnMock.query.getCall(1).args[0].query = dbConnMock.query.getCall(1).args[0].query.trim()
      expect(dbConnMock.query.getCall(1).args[0]).to.deep.equal({
        query: 'INSERT INTO genre (name) VALUES (?)'.trim(),
        queryParams: ['NonExistentGenre'],
      })

      dbConnMock.query.getCall(2).args[0].query = dbConnMock.query.getCall(2).args[0].query.trim()
      expect(dbConnMock.query.getCall(2).args[0]).to.deep.equal({
        query: `
                SELECT id FROM genre WHERE LOWER(name) = LOWER(?)`.trim(),
        queryParams: ['NonExistentGenre'],
      })
    })
  })
})

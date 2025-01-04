import supertest from 'supertest'
import { createApp } from '../../src/app.js'
import { DbConn } from '../../src/database/dbConnection.js'
import { expect } from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import jwt from 'jsonwebtoken'

describe('Movie Routes (Functional Tests)', () => {
  let app, request, dbConn, userModel, movieModel
  let UserModel, MovieModel, jwtVerifyStub

  beforeEach(async () => {
    dbConn = new DbConn()
    await dbConn.init({ userDbType: 'local' })

    sinon.stub(dbConn, 'query').resolves([])
    sinon.stub(dbConn, 'executeTransaction').resolves({ rows: [] })
    jwtVerifyStub = sinon.stub(jwt, 'verify')

    UserModel = (await esmock('../../src/models/user/mysql/userModelSQL.js')).UserModel
    MovieModel = (await esmock('../../src/models/movie/mysql/movieModelSQL.js')).MovieModel

    userModel = new UserModel({ userDbType: 'local' })
    movieModel = new MovieModel({ movieDbType: 'local' })

    userModel.databaseConnection = dbConn
    movieModel.databaseConnection = dbConn

    app = createApp({ userModel, movieModel })
    request = supertest(app)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('GET /movie', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })

    it('should return 200 and a list of movies for valid token', async () => {
      const validToken = 'valid-token'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.onFirstCall().resolves([{ id: 1, token: validToken }])
      dbConn.query.onSecondCall().resolves([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
        { id: 2, title: 'Interstellar', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      const res = await request.get('/movie').set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
        { id: 2, title: 'Interstellar', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      sinon.assert.calledTwice(dbConn.query)
    })

    it('should return 200 and filter movies by genre', async () => {
      const validToken = 'valid-token'
      const genre = 'Sci-Fi'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.onFirstCall().resolves([{ id: 1, token: validToken }])
      dbConn.query.onSecondCall().resolves([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
        { id: 2, title: 'Interstellar', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      const res = await request.get('/movie').query({ genre }).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
        { id: 2, title: 'Interstellar', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      sinon.assert.calledTwice(dbConn.query)
    })

    it('should return 200 and an empty list if no movies match the genre', async () => {
      const validToken = 'valid-token'
      const genre = 'Horror'
      jwtVerifyStub.returns({ id: 1, role: 'user' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validToken }])

      dbConn.query.onSecondCall().resolves([])

      const res = await request.get('/movie').query({ genre }).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal([])

      sinon.assert.calledTwice(dbConn.query)
    })

    it('should return 200 and handle case-insensitive genre filtering', async () => {
      const validToken = 'valid-token'
      const genre = 'sci-fi'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.resolves([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      const res = await request.get('/movie').query({ genre }).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      sinon.assert.calledTwice(dbConn.query)
    })

    it('should return 401 if no token is provided', async () => {
      const res = await request.get('/movie')

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.get('/movie').set('Authorization', `Bearer ${invalidToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 500 if there is a database error', async () => {
      const validToken = 'valid-token'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.rejects(new Error('Database error'))

      const res = await request.get('/movie').set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected server error occurred.')
    })
  })

  describe('GET /movie/:id', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })

    it('should return 200 and a specific movie for valid token', async () => {
      const validToken = 'valid-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.resolves([
        { id: movieId, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      const res = await request.get(`/movie/${movieId}`).set('Authorization', `Bearer ${validToken}`)

      const expectedResult = [{
        id: movieId,
        title: 'Inception',
        genre: 'Sci-Fi',
        director: 'Christopher Nolan',
      }]

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal(expectedResult)

      sinon.assert.calledTwice(dbConn.query)
    })

    it('should return 404 if the movie is not found', async () => {
      const validToken = 'valid-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d000'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.onFirstCall().resolves([{ id: 1, token: validToken }])

      const res = await request.get(`/movie/${movieId}`).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', 'Movie not found.')
    })

    it('should return 401 if no token is provided', async () => {
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const res = await request.get(`/movie/${movieId}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.get(`/movie/${movieId}`).set('Authorization', `Bearer ${invalidToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 500 if there is a database error', async () => {
      const validToken = 'valid-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.rejects(new Error('Database error'))

      const res = await request.get(`/movie/${movieId}`).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected server error occurred.')
    })
  })
})

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

    sinon.stub(console, 'log')
    sinon.stub(console, 'warn')
    sinon.stub(console, 'error')

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

  describe('GET /movies', () => {
    it('should return 200 and a list of movies for valid token', async () => {
      const validToken = 'valid-token'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.resolves([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
        { id: 2, title: 'Interstellar', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      const res = await request.get('/movies').set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal([
        { id: 1, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
        { id: 2, title: 'Interstellar', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      sinon.assert.calledOnce(dbConn.query)
    })

    it('should return 401 if no token is provided', async () => {
      const res = await request.get('/movies')

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.get('/movies').set('Authorization', `Bearer ${invalidToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 500 if there is a database error', async () => {
      const validToken = 'valid-token'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.rejects(new Error('Database error'))

      const res = await request.get('/movies').set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected error occurred.')
    })
  })

  describe('GET /movies/:id', () => {
    it('should return 200 and a specific movie for valid token', async () => {
      const validToken = 'valid-token'
      const movieId = 'mocked-movie-id'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.resolves([
        { id: movieId, title: 'Inception', genre: 'Sci-Fi', director: 'Christopher Nolan' },
      ])

      const res = await request.get(`/movies/${movieId}`).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal({
        id: movieId,
        title: 'Inception',
        genre: 'Sci-Fi',
        director: 'Christopher Nolan',
      })

      sinon.assert.calledOnce(dbConn.query)
    })

    it('should return 401 if no token is provided', async () => {
      const movieId = 'mocked-movie-id'

      const res = await request.get(`/movies/${movieId}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieId = 'mocked-movie-id'

      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.get(`/movies/${movieId}`).set('Authorization', `Bearer ${invalidToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 404 if the movie is not found', async () => {
      const validToken = 'valid-token'
      const movieId = 'non-existent-movie-id'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.resolves([]) // Simulate no matching movie

      const res = await request.get(`/movies/${movieId}`).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', `Movie with ID ${movieId} not found`)

      sinon.assert.calledOnce(dbConn.query)
    })

    it('should return 500 if there is a database error', async () => {
      const validToken = 'valid-token'
      const movieId = 'mocked-movie-id'
      jwtVerifyStub.returns({ id: 1, role: 'user' })

      dbConn.query.rejects(new Error('Database error')) // Simulate a database error

      const res = await request.get(`/movies/${movieId}`).set('Authorization', `Bearer ${validToken}`)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected error occurred.')

      sinon.assert.calledOnce(dbConn.query)
    })
  })

  describe('POST /movies', () => {
    it('should return 201 and create a movie for valid admin token', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.query.onFirstCall().resolves()
      dbConn.executeTransaction.onFirstCall().resolves({ insertId: 1 })

      const res = await request.post('/movies').set('Authorization', `Bearer ${validAdminToken}`).send(movieData)

      expect(res.status).to.equal(201)
      expect(res.body).to.have.property('id', 1)
      expect(res.body).to.have.property('message', 'Movie created successfully.')

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 401 if no token is provided', async () => {
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }

      const res = await request.post('/movies').send(movieData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }

      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.post('/movies').set('Authorization', `Bearer ${invalidToken}`).send(movieData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 403 if a non-admin user tries to create a movie', async () => {
      const validNonAdminToken = 'valid-non-admin-token'
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }

      jwtVerifyStub.returns({ id: 1, role: 'user' })

      const res = await request.post('/movies').set('Authorization', `Bearer ${validNonAdminToken}`).send(movieData)

      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied. Admins only.')
    })

    it('should return 500 if there is a database error during creation', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.rejects(new Error('Database error'))

      const res = await request.post('/movies').set('Authorization', `Bearer ${validAdminToken}`).send(movieData)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected error occurred.')
    })
  })

  describe('DELETE /movies/:id', () => {
    it('should return 200 and delete the movie for valid admin token', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'mocked-movie-id'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.onFirstCall().resolves({ affectedRows: 1 })

      const res = await request.delete(`/movies/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Movie deleted successfully.')

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 401 if no token is provided', async () => {
      const movieId = 'mocked-movie-id'

      const res = await request.delete(`/movies/${movieId}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieId = 'mocked-movie-id'

      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.delete(`/movies/${movieId}`).set('Authorization', `Bearer ${invalidToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 403 if a non-admin user tries to delete a movie', async () => {
      const validNonAdminToken = 'valid-non-admin-token'
      const movieId = 'mocked-movie-id'

      jwtVerifyStub.returns({ id: 1, role: 'user' })

      const res = await request.delete(`/movies/${movieId}`).set('Authorization', `Bearer ${validNonAdminToken}`)

      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied. Admins only.')
    })

    it('should return 404 if the movie is not found', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'non-existent-movie-id'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.onFirstCall().resolves({ affectedRows: 0 }) // No movie deleted

      const res = await request.delete(`/movies/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', `Movie with ID ${movieId} not found`)

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 500 if there is a database error', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'mocked-movie-id'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.rejects(new Error('Database error')) // Simulate a database failure

      const res = await request.delete(`/movies/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected error occurred.')

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })
  })

  describe('PATCH /movies/:id', () => {
    it('should return 200 and update the movie for valid admin token', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'mocked-movie-id'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.onFirstCall().resolves({ affectedRows: 1 })

      const res = await request
        .patch(`/movies/${movieId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send(updateData)

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Movie updated successfully.')

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 401 if no token is provided', async () => {
      const movieId = 'mocked-movie-id'
      const updateData = { title: 'Dunkirk Updated' }

      const res = await request.patch(`/movies/${movieId}`).send(updateData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieId = 'mocked-movie-id'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request
        .patch(`/movies/${movieId}`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(updateData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 403 if a non-admin user tries to update a movie', async () => {
      const validNonAdminToken = 'valid-non-admin-token'
      const movieId = 'mocked-movie-id'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.returns({ id: 1, role: 'user' })

      const res = await request
        .patch(`/movies/${movieId}`)
        .set('Authorization', `Bearer ${validNonAdminToken}`)
        .send(updateData)

      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied. Admins only.')
    })

    it('should return 404 if the movie is not found', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'non-existent-movie-id'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.onFirstCall().resolves({ affectedRows: 0 }) // No movie updated

      const res = await request
        .patch(`/movies/${movieId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send(updateData)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', `Movie with ID ${movieId} not found`)

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 500 if there is a database error during update', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'mocked-movie-id'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.rejects(new Error('Database error')) // Simulate a database failure

      const res = await request
        .patch(`/movies/${movieId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send(updateData)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected error occurred.')

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })
  })
})

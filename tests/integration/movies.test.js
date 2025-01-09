import supertest from 'supertest'
import { createApp } from '../../src/app.js'
import { DbConn } from '../../src/database/dbConnection.js'
import { expect } from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import jwt from 'jsonwebtoken'

describe('Movie Routes (Integration Tests)', () => {
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

      const expectedResult = {
        id: movieId,
        title: 'Inception',
        genre: ['Sci-Fi'],
        director: 'Christopher Nolan',
      }

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

  describe('POST /movie', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })

    it('should return 201 and create a movie for valid admin token', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieData = { title: 'Dunkirk',
        genre: ['Drama', 'Action'],
        director: 'Christopher Nolan',
        year: 2017,
        duration: 106,
        rate: 8.5,
        poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Dunkirk_26-29_May_1940_NYP68075.jpg/1280px-Dunkirk_26-29_May_1940_NYP68075.jpg',
      }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      dbConn.executeTransaction.onFirstCall().resolves([,[{ genre: 'Drama', genreId: 1 }, { genre: 'Action', genreId: 2 }]])
      const res = await request.post('/movie').set('Authorization', `Bearer ${validAdminToken}`).send(movieData)

      console.log(res.body)
      expect(res.status).to.equal(201)
      expect(res.body).to.have.property('id')
      expect(res.body).to.have.property('title', 'Dunkirk')
      expect(res.body).to.have.property('genre').that.deep.equal(['Drama', 'Action'])
      expect(res.body).to.have.property('director', 'Christopher Nolan')
      expect(res.body).to.have.property('year', 2017)
      expect(res.body).to.have.property('duration', 106)
      expect(res.body).to.have.property('rate', 8.5)
      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 403 if the user is not an admin', async () => {
      const validUserToken = 'valid-user-token'
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }

      jwtVerifyStub.returns({ id: 1, role: 'user' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validUserToken }])

      const res = await request.post('/movie').set('Authorization', `Bearer ${validUserToken}`).send(movieData)

      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied.')
    })

    it('should return 401 if no token is provided', async () => {
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }
      const res = await request.post('/movie').send(movieData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieData = { title: 'Dunkirk', genre: 'War', director: 'Christopher Nolan' }
      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.post('/movie').set('Authorization', `Bearer ${invalidToken}`).send(movieData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 400 if the movie data is invalid', async () => {
      const validAdminToken = 'valid-admin-token'
      const invalidMovieData = { title: '', genre: 'War', director: 'Christopher Nolan' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      const res = await request.post('/movie').set('Authorization', `Bearer ${validAdminToken}`).send(invalidMovieData)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'Movie validation failed.')
    })

    it('should return 500 if there is a database error', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieData = { title: 'Dunkirk',
        genre: ['Drama', 'Action'],
        director: 'Christopher Nolan',
        year: 2017,
        duration: 106,
        rate: 8.5,
        poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Dunkirk_26-29_May_1940_NYP68075.jpg/1280px-Dunkirk_26-29_May_1940_NYP68075.jpg',
      }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      dbConn.executeTransaction.rejects(new Error('Database error'))

      const res = await request.post('/movie').set('Authorization', `Bearer ${validAdminToken}`).send(movieData)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected server error occurred.')
    })
  })

  describe('DELETE /movie/:id', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })

    it('should return 200 and delete the movie for valid admin token', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      dbConn.executeTransaction.onFirstCall().resolves([, { affectedRows: 1 }])

      const res = await request.delete(`/movie/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Movie deleted')

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 403 if the user is not an admin', async () => {
      const validUserToken = 'valid-user-token'
      const movieId = 'mocked-movie-id'

      jwtVerifyStub.returns({ id: 1, role: 'user' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validUserToken }])

      const res = await request.delete(`/movie/${movieId}`).set('Authorization', `Bearer ${validUserToken}`)

      console.log(`res body: ${JSON.stringify(res.body)}`)
      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied.')
    })

    it('should return 401 if no token is provided', async () => {
      const movieId = 'mocked-movie-id'
      const res = await request.delete(`/movie/${movieId}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieId = 'mocked-movie-id'
      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.delete(`/movie/${movieId}`).set('Authorization', `Bearer ${invalidToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 404 if the movie is not found', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      dbConn.executeTransaction.onFirstCall().resolves([, { affectedRows: 0 }])

      const res = await request.delete(`/movie/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', 'Movie not found.')
    })

    it('should return 500 if there is a database error', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      dbConn.executeTransaction.rejects(new Error('Database error'))

      const res = await request.delete(`/movie/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected server error occurred.')
    })
  })

  describe('PATCH /movie/:id', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })

    it('should return 200 and update the movie for valid admin token', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { title: 'Dunkirk Updated' }
      const movieData = { title: 'Dunkirk',
        genre: ['Drama', 'Action'],
        director: 'Christopher Nolan',
        year: 2017,
        duration: 106,
        rate: 8.5,
        poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Dunkirk_26-29_May_1940_NYP68075.jpg/1280px-Dunkirk_26-29_May_1940_NYP68075.jpg',
      }

      const updatedMovie = { ...movieData, ...updateData }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])
      dbConn.query.onCall(1).resolves([{ genre: 'Drama', id: 1 }])
      dbConn.query.onCall(2).resolves([{ genre: 'Action', id: 2 }])
      dbConn.query.onCall(3).resolves([{ genre: 'Drama', id: 1 }])
      dbConn.query.onCall(4).resolves([{ genre: 'Action', id: 2 }])
      dbConn.query.onCall(5).resolves([updatedMovie])
      dbConn.executeTransaction.onFirstCall().resolves([{ affectedRows: 1 }, updatedMovie])

      const res = await request.patch(`/movie/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`).send(updatedMovie)

      console.log(`Expected movie: ${JSON.stringify(updatedMovie)}`)
      console.log(`Res body: ${JSON.stringify(res.body.movie)}`)
      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Movie updated successfully')
      expect(res.body.movie).to.deep.equal(updatedMovie)

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 403 if the user is not an admin', async () => {
      const validUserToken = 'valid-user-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.returns({ id: 1, role: 'user' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validUserToken }])

      const res = await request.patch(`/movie/${movieId}`).set('Authorization', `Bearer ${validUserToken}`).send(updateData)

      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied.')
    })

    it('should return 401 if no token is provided', async () => {
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { title: 'Dunkirk Updated' }
      const res = await request.patch(`/movie/${movieId}`).send(updateData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if the token is invalid', async () => {
      const invalidToken = 'invalid-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { title: 'Dunkirk Updated' }
      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.patch(`/movie/${movieId}`).set('Authorization', `Bearer ${invalidToken}`).send(updateData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 400 if the update data is invalid', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const invalidUpdateData = { title: '' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      const res = await request.patch(`/movie/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`).send(invalidUpdateData)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'Movie validation failed.')
    })

    it('should return 404 if the movie is not found', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d000'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])
      dbConn.query.onSecondCall().resolves([])

      dbConn.executeTransaction.resolves([, [{ affectedRows: 1 }]])

      const res = await request.patch(`/movie/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`).send(updateData)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', 'Movie not found.')
    })

    it('should return 500 if there is a database error', async () => {
      const validAdminToken = 'valid-admin-token'
      const movieId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { title: 'Dunkirk Updated' }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])
      dbConn.executeTransaction.rejects(new Error('Database error'))

      const res = await request.patch(`/movie/${movieId}`).set('Authorization', `Bearer ${validAdminToken}`).send(updateData)

      expect(res.status).to.equal(500)
      expect(res.body).to.have.property('error', 'An unexpected server error occurred.')
    })
  })
})

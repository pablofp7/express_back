import supertest from 'supertest'
import { createApp } from '../../src/app.js'
import { DbConn } from '../../src/database/dbConnection.js'
import { expect } from 'chai'
import sinon from 'sinon'
import bcrypt from 'bcrypt'
import esmock from 'esmock'
import jwt from 'jsonwebtoken'

describe('User Routes (Integration Tests)', () => {
  let app, request, dbConn, userModel
  let UserModel, UserModelClass
  let hashedPassword
  let jwtVerifyStub

  beforeEach(async () => {
    dbConn = new DbConn()
    await dbConn.init({ userDbType: 'local' })

    sinon.stub(dbConn, 'query').resolves([])
    sinon.stub(dbConn, 'executeTransaction').resolves({ rows: [] })
    jwtVerifyStub = sinon.stub(jwt, 'verify')

    UserModelClass = await esmock('../../src/models/user/mysql/userModelSQL.js', {
      uuid: { v4: () => 'mocked-uuid' },
    })
    UserModel = UserModelClass.UserModel

    userModel = new UserModel({ userDbType: 'local' })
    userModel.databaseConnection = dbConn

    app = createApp({ userModel })
    request = supertest(app)
    const password = 'testPassword'
    hashedPassword = await bcrypt.hash(password, 10)
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('POST /user/login', () => {
    it('should return 200, set refreshToken cookie, and include Authorization header for valid credentials', async () => {
      sinon.stub(console, 'log')
      dbConn.query.resolves([{ id: 1, username: 'testUser', password: hashedPassword }])

      const res = await request.post('/user/login').send({
        username: 'testUser',
        password: 'testPassword',
      })

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Login successful')
      expect(res.headers).to.have.property('authorization').that.contains('Bearer ')
      expect(res.headers).to.have.property('set-cookie').that.is.an('array')
      const setCookieHeader = res.headers['set-cookie'][0]
      expect(setCookieHeader).to.contain('refreshToken')
      expect(setCookieHeader).to.contain('HttpOnly')
    })

    it('should return 401 for invalid credentials', async () => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
      dbConn.query.resolves([{ id: 1, username: 'testUser', password: hashedPassword }])

      const res = await request.post('/user/login').send({
        username: 'wrongUser',
        password: 'wrongPassword',
      })

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid username or password.')
    })
  })

  describe('POST /user/register', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 201 for successful registration', async () => {
      const input = {
        username: 'newUser',
        password: 'testPassword',
        email: 'user@example.com',
        age: 25,
      }

      const newId = 'mocked-uuid'

      dbConn.query
        .onFirstCall().resolves()
        .onSecondCall().resolves([{ id: '1' }])
        .onThirdCall().resolves()

      const res = await request.post('/user/register').send(input)

      expect(res.status).to.equal(201)
      expect(res.body).to.deep.equal({
        id: newId,
        username: input.username,
        email: input.email,
        age: input.age,
        role: 'User',
      })

      sinon.assert.calledOnce(dbConn.executeTransaction)
    })

    it('should return 400 for invalid registration data', async () => {
      dbConn.query.rejects(new Error('Invalid data'))

      const res = await request.post('/user/register').send({
        username: '',
        password: '',
        email: 'invalidEmail',
      })

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'User validation failed.')
    })
  })

  describe('GET /user/refresh-token', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 200 and a new access token for a valid refresh token', async () => {
      const validRefreshToken = 'valid-refresh-token'
      const refreshTokenData = {
        userId: 1,
        username: 'testUser',
        token: validRefreshToken,
        type: 'refresh',
        role: 'User',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      }

      jwtVerifyStub.returns(refreshTokenData)

      dbConn.query.onFirstCall().resolves([refreshTokenData]).onSecondCall().resolves()

      const res = await request.get('/user/refresh-token').set('Cookie', [`refreshToken=${validRefreshToken}`])

      expect(res.status).to.equal(200)
      expect(res.headers).to.have.property('authorization')
      expect(res.headers.authorization).to.match(/^Bearer\s[\w-]+\.[\w-]+\.[\w-]+$/)
    })

    it('should return 401 for an invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid-refresh-token'

      dbConn.query.resolves([])

      const res = await request.get('/user/refresh-token').set('Cookie', [`refreshToken=${invalidRefreshToken}`])

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or expired refresh token.')
    })

    it('should return 401 if the refresh token is valid but not found in the database', async () => {
      const refreshTokenData = {
        userId: 1,
        username: 'testUser',
        token: 'valid-but-unknown-refresh-token',
        type: 'refresh',
        role: 'User',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      }

      jwtVerifyStub.returns(refreshTokenData)

      dbConn.query.onFirstCall().resolves([])

      const res = await request.get('/user/refresh-token').set('Cookie', [`refreshToken='valid-but-unknown-refresh-token'`])
      console.log('\n\nResult body:', res.body)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or expired refresh token.')
    })

    it('should return 401 if no refresh token is provided', async () => {
      const res = await request.get('/user/refresh-token')

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No refresh token provided.')
    })
  })

  describe('POST /user/logout', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 200 and revoke tokens on successful logout', async () => {
      const validAccessToken = 'valid-access-token'
      const userId = 1
      const refreshTokenData = {
        userId,
        username: 'testUser',
        token: 'valid-but-unknown-refresh-token',
        type: 'refresh',
        role: 'User',
        expires_at: new Date(Date.now() + 60 * 60 * 1000),
      }

      jwtVerifyStub.returns({ userId, username: 'testUser' })

      dbConn.query.onFirstCall().resolves([refreshTokenData])
      dbConn.query.onSecondCall().resolves({ affectedRows: 1 })
      dbConn.query.onThirdCall().resolves({ affectedRows: 1 })

      const res = await request
        .post('/user/logout')
        .set('Authorization', `Bearer ${validAccessToken}`)
        .set('Cookie', ['refreshToken=valid-refresh-token'])

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Logout successful.')
    })

    it('should return 401 if no access token is provided', async () => {
      const res = await request.post('/user/logout')

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 if access token is invalid', async () => {
      const invalidAccessToken = 'invalid-access-token'

      jwtVerifyStub.throws(new jwt.JsonWebTokenError('Invalid token'))

      const res = await request.post('/user/logout').set('Authorization', `Bearer ${invalidAccessToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 401 if the refresh token is missing', async () => {
      const validAccessToken = 'valid-access-token'
      dbConn.query.onFirstCall().resolves([validAccessToken]).onSecondCall().resolves()

      jwtVerifyStub.returns({ userId: 1, username: 'testUser' })
      const res = await request.post('/user/logout').set('Authorization', `Bearer ${validAccessToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No refresh token provided.')
    })
  })

  describe('DELETE /:id', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 200 and delete the user for valid admin token and valid user ID', async () => {
      const validAdminToken = 'valid-admin-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.executeTransaction.onFirstCall().resolves([,{ affectedRows: 1 }])

      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      const res = await request
        .delete(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'User deleted successfully')
    })

    it('should return 400 for invalid UUID', async () => {
      const validAdminToken = 'valid-admin-token'
      const invalidUserId = '1234'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validAdminToken }])

      const res = await request
        .delete(`/user/${invalidUserId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'Invalid UUID format.')
    })

    it('should return 404 if the user is not found', async () => {
      const validAdminToken = 'valid-admin-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.query.onFirstCall().resolves([[{ id: 1, token: validAdminToken }]])
      dbConn.executeTransaction.onFirstCall().resolves([,{ affectedRows: 0 }])

      const res = await request
        .delete(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', `The requested resource was not found.`)
    })

    it('should return 401 if no token is provided', async () => {
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      const res = await request.delete(`/user/${validUserId}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 for invalid token', async () => {
      const invalidToken = 'invalid-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      jwtVerifyStub.throws(new Error('Invalid token'))

      const res = await request
        .delete(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${invalidToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 403 for non-admin user', async () => {
      const validNonAdminToken = 'valid-non-admin-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

      jwtVerifyStub.returns({ id: 1, role: 'user' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validNonAdminToken }])

      const res = await request
        .delete(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${validNonAdminToken}`)

      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied.')
    })
  })

  describe('PATCH /:id', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 200 and update the user for valid admin token and valid user ID', async () => {
      const validAdminToken = 'valid-admin-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { email: 'newemail@example.com', age: 30 }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.query.onFirstCall().resolves([{ id: validUserId }])
      dbConn.executeTransaction.onFirstCall().resolves({ rows: [] })

      const res = await request
        .patch(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send(updateData)

      sinon.assert.calledOnce(dbConn.query)
      sinon.assert.calledOnce(dbConn.executeTransaction)
      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'User updated successfully.')
    })

    it('should return 400 for invalid UUID', async () => {
      const validAdminToken = 'valid-admin-token'
      const invalidUserId = '1234'
      const updateData = { email: 'newemail@example.com', age: 30 }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })
      dbConn.query.onFirstCall().resolves([{ id: invalidUserId }])

      const res = await request
        .patch(`/user/${invalidUserId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send(updateData)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'Invalid UUID format.')
    })

    it('should return 404 if the user is not found', async () => {
      const validAdminToken = 'valid-admin-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { email: 'newemail@example.com', age: 30 }

      jwtVerifyStub.returns({ id: 1, role: 'admin' })

      dbConn.query.onFirstCall().resolves([])

      const res = await request
        .patch(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${validAdminToken}`)
        .send(updateData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
      sinon.assert.calledOnce(dbConn.query)
    })

    it('should return 401 if no token is provided', async () => {
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { email: 'newemail@example.com', age: 30 }

      const res = await request.patch(`/user/${validUserId}`).send(updateData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No token provided.')
    })

    it('should return 401 for invalid token', async () => {
      const invalidToken = 'invalid-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { email: 'newemail@example.com', age: 30 }

      jwtVerifyStub.throws(new Error('Invalid token'))

      const res = await request
        .patch(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${invalidToken}`)
        .send(updateData)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or malformed token.')
    })

    it('should return 403 for non-admin user', async () => {
      const validNonAdminToken = 'valid-non-admin-token'
      const validUserId = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      const updateData = { email: 'newemail@example.com', age: 30 }

      jwtVerifyStub.returns({ id: 1, role: 'user' })
      dbConn.query.onFirstCall().resolves([{ id: 1, token: validNonAdminToken }])

      const res = await request
        .patch(`/user/${validUserId}`)
        .set('Authorization', `Bearer ${validNonAdminToken}`)
        .send(updateData)

      expect(res.status).to.equal(403)
      expect(res.body).to.have.property('error', 'Access denied.')
    })
  })
  describe('GET /:username', () => {
    beforeEach(() => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
    })
    it('should return 200 and user details for an existing username', async () => {
      const username = 'testUser'
      dbConn.query.resolves([
        {
          id: 1,
          username,
          email: 'test@example.com',
          age: 30,
        },
      ])

      const res = await request.get(`/user/${username}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.deep.equal({
        id: 1,
        username,
        email: 'test@example.com',
        age: 30,
      })

      sinon.assert.calledOnce(dbConn.query)
    })

    it('should return 404 if the user does not exist', async () => {
      const username = 'nonExistentUser'

      dbConn.query.resolves([])

      const res = await request.get(`/user/${username}`)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', 'The requested resource was not found.')

      sinon.assert.calledOnce(dbConn.query)
    })
  })
})

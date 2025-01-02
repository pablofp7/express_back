import supertest from 'supertest'
import { createApp } from '../../src/app.js'
import { UserModel } from '../../src/models/user/mysql/userModelSQL.js'
import { DbConn } from '../../src/database/dbConnection.js'
import { expect } from 'chai'
import sinon from 'sinon'
import bcrypt from 'bcrypt'

describe('User Routes (Functional Tests)', () => {
  let app, request, dbConn, userModel

  before(async () => {
    // Use the real DbConn implementation
    dbConn = new DbConn()
    await dbConn.init({ userDbType: 'local' }) // Use 'local' as the database type

    // Stub the database methods to avoid real database interactions
    sinon.stub(dbConn, 'query').resolves([])
    sinon.stub(dbConn, 'executeTransaction').resolves({ rows: [] })

    // Initialize UserModel with the real but stubbed DbConn
    userModel = new UserModel({ userDbType: 'local' })
    userModel.databaseConnection = dbConn // Inject the stubbed DbConn into the UserModel

    // Create the app
    app = createApp({ userModel })
    request = supertest(app)
  })

  after(() => {
    sinon.restore() // Restore original methods
  })

  describe('POST /user/login', () => {
    it('should return 200, set refreshToken cookie, and include Authorization header for valid credentials', async () => {
      const password = 'testPassword'
      const hashedPassword = await bcrypt.hash(password, 10)
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
      dbConn.query.resolves([])

      const res = await request.post('/user/login').send({
        username: 'wrongUser',
        password: 'wrongPassword',
      })

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('message', 'Invalid credentials')
    })

    it('should return 401 for invalid credentials', async () => {
      dbConn.query.resolves([])

      const res = await request.post('/user/login').send({
        username: 'wrongUser',
        password: 'wrongPassword',
      })

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('message', 'Invalid credentials')
    })
  })

  describe('POST /user/register', () => {
    it('should return 201 for successful registration', async () => {
      dbConn.query.resolves([{ id: 1, username: 'newUser' }])

      const res = await request.post('/user/register').send({
        username: 'newUser',
        password: 'newPassword',
        email: 'user@example.com',
      })

      expect(res.status).to.equal(201)
      expect(res.body).to.have.property('id', 1)
      expect(res.body).to.have.property('username', 'newUser')
    })

    it('should return 400 for invalid registration data', async () => {
      dbConn.query.rejects({ status: 400, message: 'Invalid data' })

      const res = await request.post('/user/register').send({
        username: '',
        password: '',
        email: 'invalidEmail',
      })

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('message', 'Invalid data')
    })
  })
})

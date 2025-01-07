import sinon from 'sinon'
import { createApp } from '../../src/app.js'
import { MovieModel } from '../../src/models/movie/mysql/movieModelSQL.js'
import { UserModel } from '../../src/models/user/mysql/userModelSQL.js'
import { CustomError, ERROR_TYPES } from '../../src/errors/customError.js'
import supertest from 'supertest'
import { expect } from 'chai'
import { config } from '../../src/config/config.js'

let request, dbConn

before(async () => {
  const { appInstance, dbConn: connections } = await generateAppInstance()
  dbConn = connections
  request = supertest(appInstance)
})

after(async () => {
  console.log('Finish After sentece...')
  if (dbConn) {
    for (const conn of Object.values(dbConn)) {
      if (conn) {
        await conn.close()
      }
    }
  }
})

afterEach(() => {
  sinon.restore()
})

console.log(`
  IMPORTANT NOTES!!!:
  - Ensure the MySQL server is running with the configuration specified in the testsEnv file.
  - Initialize the required tables using the SQL scripts in the sqlScripts directory.
  - The first admin account must be upgraded directly via the database, as there is no way to upgrade a user to Admin without an existing admin account.
  - Set the NODE_ENV variable to "test" during execution to use the testsEnv configuration.
    - If using npx mocha /path/to/file, set NODE_ENV manually (NODE_ENV=test npx...).
    - If using package.json, it is already configured.
`)

describe('E2E Tests for User Routes', () => {
  describe('Register Route', () => {
    beforeEach(async () => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
      await cleanupTestUser({ dbConn: dbConn.userConn })
    })

    it('should return 201 for successful registration', async () => {
      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }

      const res = await request.post('/user/register').send(testUser)

      expect(res.status).to.equal(201)
      expect(res.body).to.have.property('id')
      expect(res.body).to.have.property('username', 'testUser')
      expect(res.body).to.have.property('email', 'testuser@example.com')
    })

    it('should return 400 for registration with repeated username', async () => {
      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }

      await request.post('/user/register').send(testUser)

      const res = await request.post('/user/register').send(testUser)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'User registration failed.')
    })

    it('should return 400 for registration with invalid data', async () => {
      const invalidUser = {
        username: '',
        password: 'password123',
        email: 'invalidemail',
      }

      const res = await request.post('/user/register').send(invalidUser)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'User validation failed.')
    })
  })

  describe('Login Route', () => {
    beforeEach(async () => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
      await cleanupTestUser({ dbConn: dbConn.userConn })
    })

    it('should return 200 for successful login', async () => {
      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }

      await request.post('/user/register').send(testUser)

      const res = await request.post('/user/login').send({
        username: 'testUser',
        password: 'password123',
      })

      expect(res.status).to.equal(200)

      expect(res.body).to.have.property('message', 'Login successful')

      expect(res.headers).to.have.property('authorization')
      const authHeader = res.headers.authorization
      expect(authHeader).to.match(/^Bearer /)

      expect(res.headers).to.have.property('set-cookie')
      const cookies = res.headers['set-cookie']
      const refreshTokenCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='))
      expect(refreshTokenCookie).to.exist

      if (refreshTokenCookie) {
        expect(refreshTokenCookie).to.include('HttpOnly')
        expect(refreshTokenCookie).to.include('SameSite=Strict')
        expect(refreshTokenCookie).to.include(`Max-Age=${config.refreshTokenLifetime}`)
        if (config.nodeEnv === 'production') {
          expect(refreshTokenCookie).to.include('Secure')
        }
      }
    })

    it('should return 401 for unsuccessful login with wrong password', async () => {
      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }

      await request.post('/user/register').send(testUser)

      const res = await request.post('/user/login').send({
        username: 'testUser',
        password: 'wrongpassword',
      })

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid username or password.')
    })

    it('should return 400 for login with invalid data', async () => {
      const invalidLoginData = {
        username: '',
        password: '',
      }

      const res = await request.post('/user/login').send(invalidLoginData)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'User validation failed.')
    })
  })
  describe('Refresh Token Route', () => {
    beforeEach(async () => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
      await cleanupTestUser({ dbConn: dbConn.userConn })
    })

    it('should return 200 and a new access token for a valid refresh token', async () => {
      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }

      await request.post('/user/register').send(testUser)

      const loginRes = await request.post('/user/login').send({
        username: 'testUser',
        password: 'password123',
      })

      const refreshToken = loginRes.headers['set-cookie']
        .find((cookie) => cookie.startsWith('refreshToken='))
        .split(';')[0]
        .split('=')[1]

      const res = await request
        .get('/user/refresh-token')
        .set('Cookie', [`refreshToken=${refreshToken}`])

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Token refreshed successfully')

      expect(res.headers).to.have.property('authorization')
      const authHeader = res.headers.authorization
      expect(authHeader).to.match(/^Bearer /)

      expect(res.headers).to.have.property('set-cookie')
      const cookies = res.headers['set-cookie']
      const refreshTokenCookie = cookies.find((cookie) => cookie.startsWith('refreshToken='))
      expect(refreshTokenCookie).to.exist
    })

    it('should return 401 for an invalid refresh token', async () => {
      const res = await request
        .get('/user/refresh-token')
        .set('Cookie', ['refreshToken=invalidToken'])

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Invalid or expired refresh token.')
    })

    it('should return 401 if no refresh token is provided', async () => {
      const res = await request.get('/user/refresh-token')

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No refresh token provided.')
    })
  })

  describe('Logout Route', () => {
    let accessToken, refreshToken

    beforeEach(async () => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
      await cleanupTestUser({ dbConn: dbConn.userConn })

      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }
      await request.post('/user/register').send(testUser)
      const loginRes = await request.post('/user/login').send({
        username: 'testUser',
        password: 'password123',
      })

      accessToken = loginRes.headers.authorization.split(' ')[1]
      refreshToken = loginRes.headers['set-cookie']
        .find((cookie) => cookie.startsWith('refreshToken='))
        .split(';')[0]
        .split('=')[1]
    })

    it('should return 200 for successful logout', async () => {
      const res = await request
        .post('/user/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', [`refreshToken=${refreshToken}`])

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'Logout successful')
    })

    it('should return 401 for logout with invalid refresh token', async () => {
      const res = await request
        .post('/user/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', ['refreshToken=invalidToken'])

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'Token not found or already revoked.')
    })

    it('should return 401 for logout with missing refresh token', async () => {
      const res = await request
        .post('/user/logout')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).to.equal(401)
      expect(res.body).to.have.property('error', 'No refresh token provided.')
    })
  })

  describe('Delete User Route', () => {
    let adminAccessToken, testUserId

    beforeEach(async () => {
      sinon.stub(console, 'log')
      sinon.stub(console, 'warn')
      sinon.stub(console, 'error')
      await cleanupTestUser({ dbConn: dbConn.userConn })

      const adminUser = {
        username: 'testUserAdmin',
        password: 'password123',
      }
      const loginRes = await request.post('/user/login').send(adminUser)
      adminAccessToken = loginRes.headers.authorization.split(' ')[1]

      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }
      const registerRes = await request.post('/user/register').send(testUser)
      testUserId = registerRes.body.id
    })

    it('should return 200 for successful user deletion', async () => {
      const res = await request
        .delete(`/user/${testUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)

      expect(res.status).to.equal(200)
      expect(res.body).to.have.property('message', 'User deleted successfully')
    })

    it('should return 400 for deletion with invalid UUID', async () => {
      const res = await request
        .delete('/user/invalidUUID')
        .set('Authorization', `Bearer ${adminAccessToken}`)

      expect(res.status).to.equal(400)
      expect(res.body).to.have.property('error', 'Invalid UUID format.')
    })

    it('should return 404 for deletion of non-existent user', async () => {
      const nonExistentUserId = '00000000-0000-0000-0000-000000000000'
      const res = await request
        .delete(`/user/${nonExistentUserId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)

      expect(res.status).to.equal(404)
      expect(res.body).to.have.property('error', 'The requested resource was not found.')
    })
  })
})

async function cleanupTestUser() {
  try {
    await dbConn.userConn.query({
      query: `
        DELETE FROM user_roles
        WHERE user_id IN (
          SELECT id FROM user WHERE username = ?
        )
      `,
      queryParams: ['testUser'],
    })

    await dbConn.userConn.query({
      query: 'DELETE FROM user WHERE username = ?',
      queryParams: ['testUser'],
    })
  }
  catch (error) {
    console.error('Error cleaning up test user:', error)
    throw error
  }
}

async function generateAppInstance() {
  try {
    const movieModel = new MovieModel({ movieDbType: 'local' })
    const userModel = new UserModel({ userDbType: 'local' })

    await Promise.all([movieModel.init(), userModel.init()])

    const appInstance = createApp({ movieModel, userModel })
    return { appInstance, dbConn: { movieConn: movieModel.databaseConnection, userConn: userModel.databaseConnection } }
  }
  catch (error) {
    if (error instanceof CustomError) {
      throw error
    }
    else {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.general.SERVER_ERROR,
      })
    }
  }
}

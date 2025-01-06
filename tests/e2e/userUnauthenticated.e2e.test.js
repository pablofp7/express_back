import sinon from 'sinon'
import { createApp, startServer, stopServer } from '../../src/app.js'
import { MovieModel } from '../../src/models/movie/mysql/movieModelSQL.js'
import { UserModel } from '../../src/models/user/mysql/userModelSQL.js'
import { CustomError, ERROR_TYPES } from '../../src/errors/customError.js'
import supertest from 'supertest'
import { expect } from 'chai'
import { DbConn } from '../../src/database/dbConnection.js'

let request, dbConn

before(async () => {
  const { appInstance, dbConn: connections } = await generateAppInstance()
  dbConn = connections
  request = supertest(appInstance)
})

after(async () => {
  if (dbConn) {
    for (const conn of Object.values(dbConn)) {
      if (conn) {
        await conn.close() // Close each connection
      }
    }
  }
})

afterEach(() => {
  sinon.restore()
})

console.log(`
  NOTE!!!: These tests require the MySQL server to be running with the appropriate configuration specified in the testsEnv file.
  Additionally, the required tables must be initialized using the SQL scripts located in the sqlScripts directory.
  Also, since there is no way to upgrade a user to Admin without an existing admin account, the first admin must be upgraded directly via the database.
  `)
describe('E2E Tests for Unauthenticated User', () => {
  describe('User Routes', () => {
    it('should return 201 for successful registration', async () => {
      const testUser = {
        username: 'testUser',
        password: 'password123',
        email: 'testuser@example.com',
      }
      await cleanupTestUser({ dbConn: dbConn.userConn })
      console.log('testUser limpiado')

      const res = await request.post('/user/register').send(testUser)

      console.log(`Respuesta devuelta: status ${res.status}. cuerpo: ${JSON.stringify(res.body)}`)

      expect(res.status).to.equal(201)
      expect(res.body).to.have.property('id')
      expect(res.body).to.have.property('username', 'testUser')
      expect(res.body).to.have.property('email', 'testuser@example.com')
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

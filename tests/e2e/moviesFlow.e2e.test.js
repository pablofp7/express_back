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

describe('E2E Tests for Movies Routes', () => {
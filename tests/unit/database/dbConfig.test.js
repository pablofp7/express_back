import * as chai from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'
import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised)
const { expect } = chai

describe('Database Configuration Validation', () => {
  let MockedDbConfig, getDatabaseConfigs, dbConfig, processExitStub

  beforeEach(async () => {
    const env = {
      DB_HOST_FREESQL: 'localhost',
      DB_USER_FREESQL: 'user',
      DB_PASSWORD_FREESQL: 'password',
      DB_NAME_FREESQL: 'test_db',
      DB_PORT_FREESQL: '3306',
      DB_URL_FREESQL: 'http://localhost',
      DB_NAME_SQL_LOCAL: 'local_db',
      DB_HOST_SQL_LOCAL: '127.0.0.1',
      DB_USER_SQL_LOCAL: 'local_user',
      DB_PASSWORD_SQL_LOCAL: 'local_password',
      DB_PORT_SQL_LOCAL: '3306',
      DB_URL_SQL_LOCAL: null,
      DB_URL_SQL_TURSO: 'https://turso-url',
      DB_TOKEN_SQL_TURSO: 'turso-token',
      NODE_ENV: 'test',
    }

    sinon.stub(process, 'env').value(env)
    processExitStub = sinon.stub(process, 'exit')

    MockedDbConfig = await esmock('../../../src/database/dbConfig.js', {})
    getDatabaseConfigs = MockedDbConfig.getDatabaseConfigs
    dbConfig = MockedDbConfig.dbConfig
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('Schema Parsing', () => {
    it('should successfully parse the database config schema', async () => {
      expect(dbConfig).to.have.property('freesql')
      expect(dbConfig.freesql).to.deep.equal({
        host: 'localhost',
        user: 'user',
        password: 'password',
        name: 'test_db',
        port: '3306',
        url: 'http://localhost',
      })
    })

    it('should call process.exit if a required environment variable is missing', async () => {
      const mockEnv = {
        DB_HOST_FREESQL: 'localhost',
        DB_USER_FREESQL: 'user',
        DB_PASSWORD_FREESQL: 'password',
        DB_NAME_FREESQL: 'test_db',
        DB_PORT_FREESQL: '3306',
        DB_URL_FREESQL: 'http://localhost',
        DB_NAME_SQL_LOCAL: undefined,
        DB_HOST_SQL_LOCAL: '127.0.0.1',
        DB_USER_SQL_LOCAL: 'local_user',
        DB_PASSWORD_SQL_LOCAL: 'local_password',
        DB_PORT_SQL_LOCAL: '3306',
        DB_URL_SQL_LOCAL: null,
        DB_URL_SQL_TURSO: 'https://turso-url',
        DB_TOKEN_SQL_TURSO: 'turso-token',
      }

      sinon.stub(console, 'error')
      sinon.stub(process, 'env').value(mockEnv)
      process.env.NODE_ENV = 'test'
      await esmock('../../../src/database/dbConfig.js', {})

      expect(processExitStub.calledOnceWithExactly(1)).to.be.true
    })
  })

  describe('getDatabaseConfigs Function', () => {
    it('should return the correct database configs for given db types', async () => {
      const result = await getDatabaseConfigs({ userDbType: 'freesql', movieDbType: 'local' })

      expect(result.userDbConfig).to.deep.equal({
        host: 'localhost',
        user: 'user',
        password: 'password',
        name: 'test_db',
        port: '3306',
        url: 'http://localhost',
      })

      expect(result.movieDbConfig).to.deep.equal({
        name: 'local_db',
        host: '127.0.0.1',
        user: 'local_user',
        password: 'local_password',
        port: '3306',
        url: null,
      })
    })

    it('should return undefined for unsupported db types', async () => {
      const result = await getDatabaseConfigs({ userDbType: 'unsupported', movieDbType: 'unknown' })

      expect(result.userDbConfig).to.be.undefined
      expect(result.movieDbConfig).to.be.undefined
    })
  })
})

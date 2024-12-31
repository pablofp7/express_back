import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'

const { expect } = chai

describe('DbConn', () => {
  let DbConn, dbConn, getDatabaseConfigsStub, createTursoClientStub, createMySQLConnectionPoolStub

  beforeEach(async () => {
    getDatabaseConfigsStub = sinon.stub()
    createTursoClientStub = sinon.stub()
    createMySQLConnectionPoolStub = sinon.stub()

    const mockedModule = await esmock('../../../src/database/dbConnection.js', {
      '../../../src/database/dbConfig.js': { getDatabaseConfigs: getDatabaseConfigsStub },
    })

    DbConn = mockedModule.DbConn
    dbConn = new DbConn()

    dbConn.createTursoClient = createTursoClientStub
    dbConn.createMySQLConnectionPool = createMySQLConnectionPoolStub
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('init', () => {
    it('should throw CustomError if no dbType is provided', async () => {
      try {
        await dbConn.init({})
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.database.MISSING_DB_CONFIG)
      }
    })

    it('should throw CustomError if getDatabaseConfigs fails', async () => {
      getDatabaseConfigsStub.rejects(new CustomError({
        origError: new Error('Failed to load configs'),
        errorType: ERROR_TYPES.database.INVALID_DB_TYPE,
      }))

      try {
        await dbConn.init({ userDbType: 'local' })
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.database.INVALID_DB_TYPE)
      }

      expect(getDatabaseConfigsStub.calledOnce).to.be.true
    })

    it('should call createMySQLConnectionPool for local dbType', async () => {
      const mockConfig = { userDbConfig: { name: 'test_db', host: 'localhost' } }
      getDatabaseConfigsStub.resolves(mockConfig)
      const mockPool = {}
      createMySQLConnectionPoolStub.resolves(mockPool)

      await dbConn.init({ userDbType: 'local' })

      expect(getDatabaseConfigsStub.calledOnceWith({ userDbType: 'local' })).to.be.true
      expect(createMySQLConnectionPoolStub.calledOnceWith({ dbParams: mockConfig.userDbConfig })).to.be.true
      expect(dbConn.client).to.equal(mockPool)
      expect(dbConn.type).to.equal('local')
    })

    it('should throw CustomError if createMySQLConnectionPool rejects', async () => {
      const mockConfig = { userDbConfig: { name: 'test_db', host: 'localhost' } }
      getDatabaseConfigsStub.resolves(mockConfig)
      createMySQLConnectionPoolStub.rejects(new CustomError({
        origError: new Error('Error in createPool'),
        errorType: ERROR_TYPES.database.CONNECTION_ERROR,
      }))

      try {
        await dbConn.init({ userDbType: 'local' })
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.database.CONNECTION_ERROR)
      }

      expect(getDatabaseConfigsStub.calledOnceWith({ userDbType: 'local' })).to.be.true
      expect(createMySQLConnectionPoolStub.calledOnceWith({ dbParams: mockConfig.userDbConfig })).to.be.true
    })

    it('should call createTursoClient for turso dbType', async () => {
      const mockConfig = { userDbConfig: { url: 'turso-url', token: 'turso-token' } }
      getDatabaseConfigsStub.resolves(mockConfig)
      const mockClient = {}
      createTursoClientStub.resolves(mockClient)

      await dbConn.init({ userDbType: 'turso' })

      expect(getDatabaseConfigsStub.calledOnceWith({ userDbType: 'turso' })).to.be.true
      expect(createTursoClientStub.calledOnceWith({ dbParams: mockConfig.userDbConfig })).to.be.true
      expect(dbConn.client).to.equal(mockClient)
      expect(dbConn.type).to.equal('turso')
    })

    it('should throw CustomError if createTursoClient rejects', async () => {
      const mockConfig = { userDbConfig: { url: 'turso-url', token: 'turso-token' } }
      getDatabaseConfigsStub.resolves(mockConfig)
      createTursoClientStub.rejects(new CustomError({
        origError: new Error('Error in createPool'),
        errorType: ERROR_TYPES.database.CONNECTION_ERROR,
      }))

      try {
        await dbConn.init({ userDbType: 'turso' })
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.database.CONNECTION_ERROR)
      }

      expect(getDatabaseConfigsStub.calledOnceWith({ userDbType: 'turso' })).to.be.true
      expect(createTursoClientStub.calledOnceWith({ dbParams: mockConfig.userDbConfig })).to.be.true
    })

    it('should throw CustomError for invalid dbType', async () => {
      getDatabaseConfigsStub.rejects(new CustomError({
        origError: new Error('Invalid database type'),
        errorType: ERROR_TYPES.database.INVALID_DB_TYPE,
      }))

      try {
        await dbConn.init({ userDbType: 'invalid' })
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.database.INVALID_DB_TYPE)
      }

      expect(getDatabaseConfigsStub.calledOnce).to.be.true
      expect(createMySQLConnectionPoolStub.called).to.be.false
      expect(createTursoClientStub.called).to.be.false
    })
  })
})

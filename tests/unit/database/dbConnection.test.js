import * as chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
chai.use(chaiAsPromised)
import sinon from 'sinon'
import esmock from 'esmock'
import { CustomError, ERROR_TYPES } from '../../../src/errors/customError.js'

const { expect } = chai

describe('DbConn', () => {
  let DbConn, dbConn, getDatabaseConfigsStub, createTursoClientStub
  let createPoolStub

  beforeEach(async () => {
    getDatabaseConfigsStub = sinon.stub()
    createTursoClientStub = sinon.stub()
    createPoolStub = sinon.stub()

    const mockedModule = await esmock('../../../src/database/dbConnection.js', {
      '../../../src/database/dbConfig.js': { getDatabaseConfigs: getDatabaseConfigsStub },
      'mysql2/promise': { createPool: createPoolStub },
      '@libsql/client': { createClient: createTursoClientStub },
    })

    DbConn = mockedModule.DbConn
    dbConn = new DbConn()
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
      const mockConfig = { userDbConfig: { name: 'test_db', host: 'localhost', user: 'test', password: '123test', port: 3306 } }
      const poolArgs = {
        host: mockConfig.userDbConfig.host,
        user: mockConfig.userDbConfig.user,
        password: mockConfig.userDbConfig.password,
        database: mockConfig.userDbConfig.name,
        port: mockConfig.userDbConfig.port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      }

      getDatabaseConfigsStub.resolves(mockConfig)
      const mockPool = {}
      createPoolStub.resolves(mockPool)

      await dbConn.init({ userDbType: 'local' })

      expect(getDatabaseConfigsStub.calledOnceWith({ userDbType: 'local' })).to.be.true
      expect(createPoolStub.calledOnceWithExactly(poolArgs)).to.be.true
      expect(dbConn.client).to.equal(mockPool)
      expect(dbConn.type).to.equal('local')
    })

    it('should throw CustomError if createMySQLConnectionPool rejects', async () => {
      const mockConfig = { userDbConfig: { name: 'test_db', host: 'localhost' } }
      getDatabaseConfigsStub.resolves(mockConfig)
      createPoolStub.rejects(new CustomError({
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
      expect(createPoolStub.calledOnce).to.be.true
    })

    it('should call createTursoClient for turso dbType', async () => {
      const mockConfig = { userDbConfig: { url: 'turso-url', token: 'turso-token' } }
      const clientArgs = {
        url: mockConfig.userDbConfig.url,
        authToken: mockConfig.userDbConfig.token,
      }
      getDatabaseConfigsStub.resolves(mockConfig)
      const mockClient = {}
      createTursoClientStub.resolves(mockClient)

      await dbConn.init({ userDbType: 'turso' })

      const actualArgs = createTursoClientStub.getCall(0)?.args[0]

      expect(actualArgs).to.deep.equal(clientArgs)

      expect(getDatabaseConfigsStub.calledOnceWithExactly({ userDbType: 'turso' })).to.be.true
      expect(dbConn.client).to.equal(mockClient)
      expect(dbConn.type).to.equal('turso')
    })

    it('should throw CustomError if createTursoClient rejects', async () => {
      const mockConfig = { userDbConfig: { url: 'turso-url', token: 'turso-token' } }
      const clientArgs = {
        url: mockConfig.userDbConfig.url,
        authToken: mockConfig.userDbConfig.token,
      }
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

      expect(getDatabaseConfigsStub.calledOnceWithExactly({ userDbType: 'turso' })).to.be.true
      expect(createTursoClientStub.calledOnceWithExactly(clientArgs)).to.be.true
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
      expect(createPoolStub.called).to.be.false
      expect(createTursoClientStub.called).to.be.false
    })
  })
  describe('createMySQLConnectionPool', () => {
    it('should return a MySQL connection pool when parameters are valid', async () => {
      const mockDbParams = {
        host: 'localhost',
        user: 'root',
        password: 'password',
        name: 'test_db',
        port: 3306,
      }

      const mockPool = { dbParams: mockDbParams }
      createPoolStub.returns(mockPool)

      const result = await dbConn.createMySQLConnectionPool({ dbParams: mockDbParams })

      expect(createPoolStub.calledOnceWithExactly({
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'test_db',
        port: 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })).to.be.true

      expect(result).to.equal(mockPool)
    })
    it('should throw CustomError for error during createPool', async () => {
      const mockDbParams = {
        host: 'localhost',
        user: 'root',
        password: 'password',
        name: 'test_db',
        port: 3306,
      }
      createPoolStub.throws(new Error('Error while creating the pool'))

      try {
        await dbConn.createMySQLConnectionPool({ dbParams: mockDbParams })
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.database.CONNECTION_ERROR)
      }
    })
  })

  describe('createTursoClient', () => {
    it('should return a Turso client when parameters are valid', async () => {
      const mockDbParams = { url: 'turso-url', token: 'turso-token' }
      const clientArgs = {
        url: mockDbParams.url,
        authToken: mockDbParams.token,
      }
      const mockClient = {}

      createTursoClientStub.resolves(mockClient)

      const result = await dbConn.createTursoClient({ dbParams: mockDbParams })

      expect(createTursoClientStub.calledOnceWithExactly(clientArgs)).to.be.true
      expect(result).to.equal(mockClient)
    })

    it('should throw CustomError for error during createClient', async () => {
      const mockDbParams = { url: 'turso-url', token: 'turso-token' }
      const clientArgs = {
        url: mockDbParams.url,
        authToken: mockDbParams.token,
      }

      createTursoClientStub.throws(new Error('Turso client creation failed'))

      try {
        await dbConn.createTursoClient({ dbParams: mockDbParams })
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.constructor).to.be.equal(Error)
        expect(error.errorType).to.equal(ERROR_TYPES.database.CONNECTION_ERROR)
      }

      expect(createTursoClientStub.calledOnceWithExactly(clientArgs)).to.be.true
    })
  })

  describe('query', () => {
    beforeEach(() => {
      dbConn = new DbConn()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should execute a query using the Turso client and return rows', async () => {
      dbConn.type = 'turso'
      const mockQuery = 'SELECT * FROM users WHERE id = ?'
      const mockQueryParams = [1]
      const mockResults = { rows: [{ id: 1, name: 'John Doe' }] }

      dbConn.client = { execute: sinon.stub().resolves(mockResults) }

      const result = await dbConn.query({ query: mockQuery, queryParams: mockQueryParams })

      expect(dbConn.client.execute.calledOnceWithExactly({
        sql: mockQuery,
        args: mockQueryParams,
      })).to.be.true

      expect(result).to.deep.equal(mockResults.rows)
    })

    it('should execute a query using the MySQL client and return results', async () => {
      dbConn.type = 'mysql'
      const mockQuery = 'SELECT * FROM users WHERE id = ?'
      const mockQueryParams = [1]
      const mockResults = [{ id: 1, name: 'John Doe' }]

      dbConn.client = { query: sinon.stub().resolves([mockResults]) }

      const result = await dbConn.query({ query: mockQuery, queryParams: mockQueryParams })

      expect(dbConn.client.query.calledOnceWithExactly({
        sql: mockQuery,
        values: mockQueryParams,
      })).to.be.true

      expect(result).to.deep.equal(mockResults)
    })

    it('should throw CustomError if Turso client throws an error during query', async () => {
      dbConn.type = 'turso'
      const mockQuery = 'SELECT * FROM users WHERE id = ?'
      const mockQueryParams = [1]

      dbConn.client = { execute: sinon.stub().rejects(new Error('Turso query failed')) }

      try {
        await dbConn.query({ query: mockQuery, queryParams: mockQueryParams })
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('Turso query failed')
        expect(error.errorType).to.equal(ERROR_TYPES.database.QUERY_ERROR)
      }
    })

    it('should throw CustomError if MySQL client throws an error during query', async () => {
      dbConn.type = 'mysql'
      const mockQuery = 'SELECT * FROM users WHERE id = ?'
      const mockQueryParams = [1]

      dbConn.client = { query: sinon.stub().rejects(new Error('MySQL query failed')) }

      try {
        await dbConn.query({ query: mockQuery, queryParams: mockQueryParams })
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('MySQL query failed')
        expect(error.errorType).to.equal(ERROR_TYPES.database.QUERY_ERROR)
      }
    })
  })

  describe('commitTransaction', () => {
    it('should commit a transaction using the Turso client', async () => {
      dbConn.type = 'turso'
      const mockTransaction = { commit: sinon.stub() }
      dbConn.transactionConnection = mockTransaction

      await dbConn.commitTransaction()

      expect(mockTransaction.commit.calledOnce).to.be.true
      expect(dbConn.transactionConnection).to.be.null
    })

    it('should commit and release a transaction using the MySQL client', async () => {
      dbConn.type = 'mysql'
      const mockConnection = { commit: sinon.stub(), release: sinon.stub() }
      dbConn.transactionConnection = mockConnection

      await dbConn.commitTransaction()

      expect(mockConnection.commit.calledOnce).to.be.true
      expect(mockConnection.release.calledOnce).to.be.true
      expect(dbConn.transactionConnection).to.be.null
    })

    it('should throw CustomError if Turso client fails to commit a transaction', async () => {
      dbConn.type = 'turso'
      const mockTransaction = { commit: sinon.stub().rejects(new Error('Turso commit failed')) }
      dbConn.transactionConnection = mockTransaction

      try {
        await dbConn.commitTransaction()
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('Turso commit failed')
        expect(error.errorType).to.equal(ERROR_TYPES.database.TRANSACTION_ERROR)
      }

      expect(dbConn.transactionConnection).to.be.null
    })

    it('should throw CustomError if MySQL client fails to commit a transaction', async () => {
      dbConn.type = 'mysql'
      const mockConnection = { commit: sinon.stub().rejects(new Error('MySQL commit failed')), release: sinon.stub() }
      dbConn.transactionConnection = mockConnection

      try {
        await dbConn.commitTransaction()
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('MySQL commit failed')
        expect(error.errorType).to.equal(ERROR_TYPES.database.TRANSACTION_ERROR)
      }

      expect(dbConn.transactionConnection).to.be.null
    })
  })

  describe('rollbackTransaction', () => {
    it('should rollback a transaction using the Turso client', async () => {
      dbConn.type = 'turso'
      const mockTransaction = { rollback: sinon.stub() }
      dbConn.transactionConnection = mockTransaction

      await dbConn.rollbackTransaction()

      expect(mockTransaction.rollback.calledOnce).to.be.true
      expect(dbConn.transactionConnection).to.be.null
    })

    it('should rollback and release a transaction using the MySQL client', async () => {
      dbConn.type = 'mysql'
      const mockConnection = { rollback: sinon.stub(), release: sinon.stub() }
      dbConn.transactionConnection = mockConnection

      await dbConn.rollbackTransaction()

      expect(mockConnection.rollback.calledOnce).to.be.true
      expect(mockConnection.release.calledOnce).to.be.true
      expect(dbConn.transactionConnection).to.be.null
    })

    it('should warn and exit gracefully if there is no active transaction', async () => {
      dbConn.transactionConnection = null

      const consoleWarnStub = sinon.stub(console, 'warn')
      await dbConn.rollbackTransaction()

      expect(consoleWarnStub.calledOnceWith('No active transaction to rollback.')).to.be.true
      expect(dbConn.transactionConnection).to.be.null

      consoleWarnStub.restore()
    })

    it('should throw CustomError if Turso client fails to rollback a transaction', async () => {
      dbConn.type = 'turso'
      const mockTransaction = { rollback: sinon.stub().rejects(new Error('Turso rollback failed')) }
      dbConn.transactionConnection = mockTransaction

      try {
        await dbConn.rollbackTransaction()
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('Turso rollback failed')
        expect(error.errorType).to.equal(ERROR_TYPES.database.TRANSACTION_ERROR)
      }

      expect(dbConn.transactionConnection).to.be.null
    })

    it('should throw CustomError if MySQL client fails to rollback a transaction', async () => {
      dbConn.type = 'mysql'
      const mockConnection = { rollback: sinon.stub().rejects(new Error('MySQL rollback failed')), release: sinon.stub() }
      dbConn.transactionConnection = mockConnection

      try {
        await dbConn.rollbackTransaction()
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('MySQL rollback failed')
        expect(error.errorType).to.equal(ERROR_TYPES.database.TRANSACTION_ERROR)
      }

      expect(dbConn.transactionConnection).to.be.null
    })
  })
  describe('executeTransaction', () => {
    beforeEach(() => {
      sinon.stub(dbConn, 'beginTransaction').resolves()
      sinon.stub(dbConn, 'commitTransaction').resolves()
      sinon.stub(dbConn, 'rollbackTransaction').resolves()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should execute all functions and commit the transaction', async () => {
      const mockFn1 = sinon.stub().resolves()
      const mockFn2 = sinon.stub().resolves()

      await dbConn.executeTransaction([mockFn1, mockFn2])

      expect(dbConn.beginTransaction.calledOnce).to.be.true
      expect(mockFn1.calledOnce).to.be.true
      expect(mockFn2.calledOnce).to.be.true
      expect(dbConn.commitTransaction.calledOnce).to.be.true
      expect(dbConn.rollbackTransaction.called).to.be.false
    })

    it('should rollback the transaction if a function throws an error', async () => {
      const mockFn1 = sinon.stub().resolves()
      const mockFn2 = sinon.stub().rejects(new Error('Execution failed'))

      try {
        await dbConn.executeTransaction([mockFn1, mockFn2])
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('Execution failed')
        expect(error.errorType).to.equal(ERROR_TYPES.database.TRANSACTION_ERROR)
      }

      expect(dbConn.beginTransaction.calledOnce).to.be.true
      expect(mockFn1.calledOnce).to.be.true
      expect(mockFn2.calledOnce).to.be.true
      expect(dbConn.commitTransaction.called).to.be.false
      expect(dbConn.rollbackTransaction.calledOnce).to.be.true
    })

    it('should throw CustomError if functionsToExecute is not an array', async () => {
      try {
        await dbConn.executeTransaction(null)
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('functionsToExecute must be an array of functions.')
        expect(error.errorType).to.equal(ERROR_TYPES.database.TRANSACTION_ERROR)
      }
    })

    it('should throw CustomError if functionsToExecute contains non-function elements', async () => {
      try {
        await dbConn.executeTransaction([() => {}, 'not a function'])
        throw new Error('Expected a CustomError to be thrown but none was thrown')
      }
      catch (error) {
        expect(error).to.be.instanceOf(CustomError)
        expect(error.origError.message).to.equal('Each item in functionsToExecute must be a function.')
        expect(error.errorType).to.equal(ERROR_TYPES.database.TRANSACTION_ERROR)
      }
    })
  })
})

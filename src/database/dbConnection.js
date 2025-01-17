import mysql from 'mysql2/promise'
import { createClient } from '@libsql/client'
import { CustomError, ERROR_TYPES } from '../errors/customError.js'
import { getDatabaseConfigs } from './dbConfig.js'

export class DbConn {
  constructor() {
    this.type = null
    this.client = null
    this.transactionConnection = null
  }

  async init({ userDbType, movieDbType }) {
    const dbType = userDbType || movieDbType

    if (!dbType) {
      throw new CustomError({
        origError: new Error('Database type is missing'),
        errorType: ERROR_TYPES.database.MISSING_DB_CONFIG,
      })
    }

    this.type = dbType

    try {
      const configResults = await getDatabaseConfigs({
        [userDbType ? 'userDbType' : 'movieDbType']: dbType,
      })

      if (!configResults) {
        throw new Error('Invalid database type: ${dbType}')
      }

      const dbParams = configResults.movieDbConfig || configResults.userDbConfig

      switch (dbType) {
        case 'turso':
          this.client = await this.createTursoClient({ dbParams })
          break
        case 'local':
        case 'freesql':
          this.client = await this.createMySQLConnectionPool({ dbParams })
          break
        default:
          throw new Error('Unexpected error on invalid database type')
      }
    }
    catch (error) {
      if (error instanceof CustomError) {
        throw error
      }

      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.INVALID_DB_TYPE,
      })
    }
  }

  async createMySQLConnectionPool({ dbParams }) {
    try {
      return mysql.createPool({
        host: dbParams.host,
        user: dbParams.user,
        password: dbParams.password,
        database: dbParams.name,
        port: dbParams.port,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      })
    }
    catch (error) {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.CONNECTION_ERROR,
      })
    }
  }

  async createTursoClient({ dbParams }) {
    try {
      return createClient({
        url: dbParams.url,
        authToken: dbParams.token,
      })
    }
    catch (error) {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.CONNECTION_ERROR,
      })
    }
  }

  async query({ query, queryParams }) {
    try {
      if (this.type === 'turso') {
        const results = await this.client.execute({
          sql: query,
          args: queryParams || [],
        })
        return results.rows
      }
      else {
        const [results] = await this.client.query({
          sql: query,
          values: queryParams,
        })
        return results
      }
    }
    catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new CustomError({
          origError: error,
          errorType: ERROR_TYPES.user.REGISTRATION_ERROR,
        })
      }
      else {
        throw new CustomError({
          origError: error,
          errorType: ERROR_TYPES.database.QUERY_ERROR,
        })
      }
    }
  }

  async beginTransaction() {
    try {
      if (this.type === 'turso') {
        this.transactionConnection = await this.client.transaction()
      }
      else {
        this.transactionConnection = await this.client.getConnection()
        await this.transactionConnection.beginTransaction()
      }
    }
    catch (error) {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR,
      })
    }
  }

  async commitTransaction() {
    try {
      if (this.type === 'turso') {
        await this.transactionConnection.commit()
      }
      else {
        await this.transactionConnection.commit()
        await this.transactionConnection.release()
      }
    }
    catch (error) {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR,
      })
    }
    finally {
      this.transactionConnection = null
    }
  }

  async rollbackTransaction() {
    try {
      if (!this.transactionConnection) {
        console.warn('No active transaction to rollback.')
        return
      }

      if (this.type === 'turso') {
        await this.transactionConnection.rollback()
      }
      else {
        await this.transactionConnection.rollback()
        await this.transactionConnection.release()
      }
    }
    catch (error) {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR,
      })
    }
    finally {
      this.transactionConnection = null
    }
  }

  async executeTransaction(functionsToExecute = []) {
    if (!Array.isArray(functionsToExecute)) {
      throw new CustomError({
        origError: new Error('functionsToExecute must be an array of functions.'),
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR,
      })
    }

    const results = []
    await this.beginTransaction()

    try {
      for (const fn of functionsToExecute) {
        if (typeof fn !== 'function') {
          throw new TypeError('Each item in functionsToExecute must be a function.')
        }
        const result = await fn()
        results.push(result)
      }

      await this.commitTransaction()
      return results
    }
    catch (error) {
      await this.rollbackTransaction()

      if (error instanceof CustomError) {
        throw error
      }
      else {
        throw new CustomError({
          origError: error,
          errorType: ERROR_TYPES.database.TRANSACTION_ERROR,
        })
      }
    }
  }

  async close() {
    try {
      if (this.client) {
        if (this.type === 'turso') {
          this.client = null
        }
        else {
          await this.client.end()
        }
      }
      console.log('Database connection closed successfully.')
    }
    catch (error) {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.CONNECTION_ERROR,
      })
    }
  }
}

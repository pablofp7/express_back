import mysql from 'mysql2/promise'
import { createClient } from '@libsql/client'
import { CustomError } from '../utils/customError.js'
import { ERROR_TYPES } from '../utils/errors.js'
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
      throw new CustomError(ERROR_TYPES.database.MISSING_DB_CONFIG.code)
    }

    this.type = dbType

    try {
      const configResults = await getDatabaseConfigs({
        [userDbType ? 'userDbType' : 'movieDbType']: dbType,
      })
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
          throw new CustomError(ERROR_TYPES.database.INVALID_DB_TYPE.code)
      }
    }
    catch (_error) {
      throw new CustomError(ERROR_TYPES.database.CONNECTION_ERROR.code)
    }
  }

  async createMySQLConnectionPool({ dbParams }) {
    try {
      return await mysql.createPool({
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
    catch (_error) {
      throw new CustomError(ERROR_TYPES.database.CONNECTION_ERROR.code)
    }
  }

  async createTursoClient({ dbParams }) {
    try {
      return await createClient({
        url: dbParams.url,
        authToken: dbParams.token,
      })
    }
    catch (_error) {
      throw new CustomError(ERROR_TYPES.database.CONNECTION_ERROR.code)
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
    catch (_error) {
      throw new CustomError(ERROR_TYPES.database.QUERY_ERROR.code)
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
    catch (_error) {
      throw new CustomError(ERROR_TYPES.database.TRANSACTION_ERROR.code)
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
    catch (_error) {
      throw new CustomError(ERROR_TYPES.database.TRANSACTION_ERROR.code)
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
    catch (_error) {
      throw new CustomError(ERROR_TYPES.database.TRANSACTION_ERROR.code)
    }
    finally {
      this.transactionConnection = null
    }
  }
}

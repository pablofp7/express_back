import mysql from 'mysql2/promise'
import { createClient } from '@libsql/client'
import { CustomError } from '../utils/customError.js'
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
      throw new CustomError('DB_CONNECTION_ERROR', {
        message: 'No database type specified during initialization',
      })
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
          throw new CustomError('DB_CONNECTION_ERROR', {
            message: `Invalid database type: ${dbType}`,
          })
      }
    }
    catch (error) {
      throw new CustomError('DB_CONNECTION_ERROR', {
        message: 'Error initializing database connection',
        dbType: this.type,
        originalError: error.message,
      })
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
    catch (error) {
      throw new CustomError('DB_CONNECTION_ERROR', {
        message: 'Error creating MySQL connection pool',
        originalError: error.message,
      })
    }
  }

  async createTursoClient({ dbParams }) {
    try {
      return await createClient({
        url: dbParams.url,
        authToken: dbParams.token,
      })
    }
    catch (error) {
      throw new CustomError('DB_CONNECTION_ERROR', {
        message: 'Error creating Turso client',
        originalError: error.message,
      })
    }
  }

  async query({
    query,
    queryParams,
    resource = 'Unknown',
    operation = 'Unknown',
  }) {
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
      throw new CustomError('DB_VALIDATION_ERROR', {
        message: 'Error executing query',
        dbType: this.type,
        resource,
        operation,
        query,
        queryParams,
        originalError: error.message,
      })
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
      throw new CustomError('DB_VALIDATION_ERROR', {
        message: 'Error starting transaction',
        dbType: this.type,
        operation: 'BEGIN_TRANSACTION',
        originalError: error.message,
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
      throw new CustomError('DB_VALIDATION_ERROR', {
        message: 'Error committing transaction',
        dbType: this.type,
        operation: 'COMMIT_TRANSACTION',
        originalError: error.message,
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
      throw new CustomError('DB_VALIDATION_ERROR', {
        message: 'Error rolling back transaction',
        dbType: this.type,
        operation: 'ROLLBACK_TRANSACTION',
        originalError: error.message,
      })
    }
    finally {
      this.transactionConnection = null
    }
  }
}

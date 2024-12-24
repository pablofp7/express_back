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
          throw new CustomError({
            origError: new Error(`Invalid database type: ${dbType}`),
            errorType: ERROR_TYPES.database.INVALID_DB_TYPE,
          })
      }
    }
    catch (error) {
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.CONNECTION_ERROR,
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
        errorType: ERROR_TYPES.database.CONNECTION_ERROR, // Este error existe y es adecuado para problemas de conexión
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
        errorType: ERROR_TYPES.database.CONNECTION_ERROR, // Error existente y apropiado
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
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.QUERY_ERROR,
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
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR, // Este error existe y es adecuado
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
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR, // Error existente y apropiado
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
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR, // Error existente y adecuado
      })
    }
    finally {
      this.transactionConnection = null
    }
  }

  async executeTransaction(functionsToExecute = []) {
    if (!Array.isArray(functionsToExecute)) {
      throw new TypeError('functionsToExecute must be an array of functions.')
    }

    await this.beginTransaction()

    try {
      // Ejecutar cada función en secuencia
      for (const fn of functionsToExecute) {
        if (typeof fn !== 'function') {
          throw new TypeError('Each item in functionsToExecute must be a function.')
        }
        await fn() // Ejecuta la función, que retorna una promesa
      }

      await this.commitTransaction()
    }
    catch (error) {
      await this.rollbackTransaction()
      throw new CustomError({
        origError: error,
        errorType: ERROR_TYPES.database.TRANSACTION_ERROR,
      })
    }
  }
}

import mysql from 'mysql2/promise'
import { createClient } from '@libsql/client'
import { getDatabaseConfigs } from './dbConfig.js'

export class DbConn {
  constructor() {
    this.type = null
    this.client = null
  }

  // Funcion asincrona para inicializar
  async init({ userDbType, movieDbType }) {
    // Logs para saber que está haciendo, log para ver qué tipo lo ha llamado
    const dbType = userDbType || movieDbType
    // const dbTypePropertyName = userDbType ? 'userDbType' : 'movieDbType'
    // console.log(`Inicializando dbConnections, userDbType: ${userDbType}, movieDbType: ${movieDbType}. Por lo tanto, ${dbTypePropertyName}: ${dbType} `)

    if (!dbType) {
      throw new Error(
        'No userDbType nor movieDbType parameter while creating database connection.',
      )
    }

    this.type = dbType
    const configResults = await getDatabaseConfigs({
      [userDbType ? 'userDbType' : 'movieDbType']: dbType,
    })
    const dbParams = configResults.movieDbConfig || configResults.userDbConfig

    // console.log('Parámetros obtenidos para esta conexión:', dbParams)

    switch (dbType) {
      case 'turso':
        this.client = await this.createTursoClient({ dbParams })
        break
      case 'local':
      case 'freesql': // Ambos casos utilizan el mismo cliente
        this.client = await this.createMySQLConnectionPool({ dbParams })
        break
      default:
        throw new Error(
          `Invalid ${userDbType ? 'USER' : 'MOVIE'} type of database while init dbConnection.`,
        )
    }
  }

  // pool de conexiones para cliente SQL normal
  createMySQLConnectionPool = async ({ dbParams }) => {
    // console.log('Creando pool de conexiones MySQL... ', dbParams)
    // printear uno por uno los parametros

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

  // Crear un cliente para Turso
  createTursoClient = async ({ dbParams }) => {
    // console.log('Creando cliente Turso... ', dbParams)
    return await createClient({
      url: dbParams.url,
      authToken: dbParams.token,
    })
  }

  // Abstraccion para que le sea transparente independientemente del cliente a BBDD se utilice
  query = async ({
    query,
    queryParams,
    resource = 'Unknown',
    operation = 'Unknown',
  }) => {
    try {
      if (this.type === 'turso') {
        if (queryParams === undefined) {
          queryParams = []
        }
        console.log('Parámetros de la consulta:', queryParams)
        const results = await this.client.execute({
          sql: query,
          args: queryParams,
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
      // Enriquecer el error con detalles adicionales
      error.dbType = this.type
      error.resource = resource
      error.resourceValue = queryParams?.[1] ?? 'unknown' // Asignar el username o un valor predeterminado
      error.operation = operation
      error.message = error.message || 'Database query error'
      // console.error('Error ejecutando la consulta:', { query, queryParams, error })
      throw error // Relanzar el error para ser manejado en niveles superiores
    }
  }

  // Iniciar una transacción
  // Iniciar una transacción
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
      error.dbType = this.type
      error.resource = 'beginTransaction'
      error.operation = 'BEGIN_TRANSACTION'
      error.message = error.message || 'Error starting transaction'
      throw error // Lanzar el error enriquecido
    }
  }

  // Confirmar una transacción
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
      error.dbType = this.type
      error.resource = 'commitTransaction'
      error.operation = 'COMMIT_TRANSACTION'
      error.message = error.message || 'Error committing transaction'
      throw error // Lanzar el error enriquecido
    }
    finally {
      this.transactionConnection = null
    }
  }

  // Revertir una transacción
  async rollbackTransaction() {
    try {
      if (!this.transactionConnection) {
        console.warn('No active transaction to rollback.')
        return // No lanzar error si no hay transacción activa
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
      error.dbType = this.type || 'unknown'
      error.resource = 'rollbackTransaction'
      error.operation = 'ROLLBACK_TRANSACTION'
      error.message = error.message || 'Error rolling back transaction'
      throw error // Lanzar error enriquecido para manejarlo en niveles superiores
    }
    finally {
      this.transactionConnection = null
    }
  }
}

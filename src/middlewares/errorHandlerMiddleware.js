import { ERROR_TYPES } from '../utils/errors.js'

export const errorHandlerMiddleware = (err, req, res, _next) => {
  const isDevelopment = config.node_env !== 'production'

  logError(err, isDevelopment)

  const response = mapError(err, isDevelopment)

  return respondWithError(res, response)
}

// Registra el error
const logError = (err, isDevelopment) => {
  if (isDevelopment) {
    console.error('[DEV ERROR]:', err)
  }
  else {
    console.error(`ERROR:\n\tStatus: ${err.status}\n\tMessage: ${err.message}`)
  }
}

// Mapea errores según `ERROR_TYPES`
const mapError = (error, isDevelopment) => {
  // Si el error coincide con un tipo predefinido
  const predefinedError = ERROR_TYPES[error.code]
  if (predefinedError) {
    return {
      status: predefinedError.statusCode,
      message: predefinedError.message,
      ...(isDevelopment && error.debug && { debug: error.debug }),
    }
  }

  // Si es un error de base de datos no mapeado
  if (error.dbType) {
    return handleDatabaseError(error, isDevelopment)
  }

  // Error desconocido
  return {
    status: 500,
    message: 'An unexpected error occurred.',
    ...(isDevelopment && { debug: extractDebugInfo(error) }),
  }
}

// Responde al cliente
const respondWithError = (res, { status, message, debug }) => {
  res.status(status).json({ error: message, ...(debug && { debug }) })
}

// Maneja errores de bases de datos
const handleDatabaseError = (error, isDevelopment) => {
  const errorMap = {
    mysql: handleMySqlError,
    postgresql: handlePostgresError,
    mongodb: handleMongoError,
    turso: handleTursoError,
  }

  const handler = errorMap[error.dbType]
  if (handler) {
    return handler(error, isDevelopment)
  }

  // Error de base de datos desconocido
  return {
    status: 500,
    message: `Unknown database error for type: ${error.dbType}`,
    ...(isDevelopment && { debug: extractDebugInfo(error) }),
  }
}

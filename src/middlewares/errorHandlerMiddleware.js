import { ERROR_TYPES } from '../utils/errors.js'
import { config } from '../config/config.js'

export const errorHandlerMiddleware = (err, req, res, _next) => {
  const isDevelopment = config.node_env !== 'production'

  // Determinar si el error es reconocido o no
  const isRecognizedError = Boolean(ERROR_TYPES[err.code])

  // Registrar el error en consola
  logError(err, isDevelopment, isRecognizedError)

  // Mapear el error para la respuesta
  const response = mapError(err, isDevelopment)

  // Responder al cliente
  return respondWithError(res, response)
}

// Registra el error según su tipo
const logError = (err, isDevelopment, isRecognizedError) => {
  if (isDevelopment) {
    if (isRecognizedError) {
      console.warn(`[DEV WARN - RECOGNIZED ERROR]:`, err)
    }
    else {
      console.error(`[DEV ERROR - UNRECOGNIZED ERROR]:`, err)
    }
  }
  else {
    console.error(
      `ERROR:\n\tStatus: ${err.status}\n\tMessage: ${err.message}\n\tStack: ${
        err.stack || 'No stack available'
      }`,
    )
  }
}

// Mapea errores según `ERROR_TYPES`
const mapError = (error, isDevelopment) => {
  // Si el error tiene un tipo predefinido
  const predefinedError = ERROR_TYPES[error.code]
  if (predefinedError) {
    return {
      status: predefinedError.statusCode,
      message: predefinedError.message,
      ...(isDevelopment && error.stack && { debug: extractDebugInfo(error) }),
    }
  }

  // Si es un error relacionado con bases de datos no mapeado
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

// Extrae información de depuración del error
const extractDebugInfo = (error) => {
  return {
    code: error.code,
    stack: error.stack,
    details: error.details || {},
  }
}

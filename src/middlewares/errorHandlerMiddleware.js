import { CustomError, ERROR_TYPES } from '../utils/customError.js'
import { config } from '../config/config.js'

export const errorHandlerMiddleware = (error, _req, res, _next) => {
  // Verificar si el error es un CustomError
  if (!(error instanceof CustomError)) {
    throw error
  }

  const isDevelopment = config.nodeEnv !== 'production'

  // Registrar el error en consola
  logError(error, isDevelopment)

  // Mapear el error para la respuesta
  const response = mapError(error, isDevelopment)

  // Responder al cliente
  return respondWithError(res, response)
}

// Registrar el error según el entorno
const logError = (error, isDevelopment) => {
  if (isDevelopment) {
    console.warn(`[DEV ERROR]:`, error)
  }
  else {
    console.error(
      `ERROR:\n\tCode: ${error.code}\n\tStatus: ${error.status}\n\tMessage: ${error.message}\n\tStack: ${
        error.stack || 'No stack available'
      }`,
    )
  }
}

// Mapear el error para el cliente
const mapError = (error, isDevelopment) => {
  return {
    status: error.status,
    message: error.message,
    ...(isDevelopment && { stack: error.stack }),
  }
}

// Responder al cliente con el error
// const respondWithError = (res, { status, message, debug }) => {
//   res.status(status).json({ error: message, ...(debug && { debug }) })
// }

// Responder al cliente con el error pero sin información de depuración en la respuesta
const respondWithError = (res, { status, message }) => {
  res.status(status).json({ error: message })
}

// Extraer información de depuración
// const extractDebugInfo = (error) => {
//   return {
//     code: error.code,
//     stack: error.stack,
//     details: error.details || {},
//   }
// }

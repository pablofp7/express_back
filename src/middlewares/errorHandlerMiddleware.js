import { CustomError, ERROR_TYPES } from '../utils/customError.js'
import { config } from '../config/config.js'

export const errorHandlerMiddleware = (err, _req, res, _next) => {
  // Verificar si el error es un CustomError
  if (!(err instanceof CustomError)) {
    throw err
  }

  const isDevelopment = config.node_env !== 'production'

  // Registrar el error en consola
  logError(err, isDevelopment)

  // Mapear el error para la respuesta
  const response = mapError(err, isDevelopment)

  // Responder al cliente
  return respondWithError(res, response)
}

// Registrar el error según el entorno
const logError = (err, isDevelopment) => {
  if (isDevelopment) {
    console.warn(`[DEV ERROR]:`, err)
  }
  else {
    console.error(
      `ERROR:\n\tCode: ${err.code}\n\tStatus: ${err.status}\n\tMessage: ${err.message}\n\tStack: ${
        err.stack || 'No stack available'
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

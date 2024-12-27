import { CustomError, ERROR_TYPES } from '../errors/customError.js'
import { config } from '../config/config.js'

export const errorHandlerMiddleware = (error, _req, res, _next) => {
  if (!(error instanceof CustomError)) {
    throw error
  }

  const isDevelopment = config.nodeEnv !== 'production'

  logError(error, isDevelopment)

  const response = mapError(error, isDevelopment)

  return respondWithError(res, response)
}

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

const mapError = (error, isDevelopment) => {
  return {
    status: error.status,
    message: error.message,
    ...(isDevelopment && { stack: error.stack }),
  }
}

const respondWithError = (res, { status, message }) => {
  res.status(status).json({ error: message })
}

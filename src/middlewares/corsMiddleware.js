import cors from 'cors'
import { ERROR_TYPES, CustomError } from '../errors/customError.js'

const ACCEPTED_ORIGINS = [
  /* 'http://example.com',
  'http://anotherdomain.com',
  */
]

// Export the custom origin function separately for testing
export const originCallback = (origin, callback) => {
  if (!origin) {
    return callback(null, true)
  }

  if (origin.startsWith('http://localhost')) {
    return callback(null, true)
  }

  if (ACCEPTED_ORIGINS.includes(origin)) {
    return callback(null, true)
  }

  console.error(`Blocked by CORS: origin not allowed - ${origin}`)
  return callback(
    new CustomError({
      origError: new Error(`Blocked by CORS: ${origin}`),
      errorType: ERROR_TYPES.auth.ACCESS_DENIED,
    }),
  )
}

// Use the custom originCallback in the cors middleware
export const corsMiddleware = cors({
  origin: originCallback,
})

import cors from 'cors'
import { ERROR_TYPES, CustomError } from '../utils/customError.js'

const ACCEPTED_ORIGINS = [
  // 'http://example.com', // Añade dominios específicos
  // 'http://anotherdomain.com' // Añade otros dominios según sea necesario
]

export const corsMiddleware = cors({
  origin: (origin, callback) => {
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
  },
})

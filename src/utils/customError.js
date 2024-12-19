export class CustomError extends Error {
  constructor({
    origError,
    errorType,
    ...additionalFields
  } = {}) {
    if (!origError) {
      throw new Error('The "origError" parameter is required to create a CustomError.')
    }

    // Validar si el errorType es válido; si no, asignar el error genérico
    const { code, message, statusCode } = errorType || ERROR_TYPES.general.SERVER_ERROR

    if (!code || !message || !statusCode) {
      throw new Error('The "errorType" parameter must be well-formed or will default to a generic error.')
    }

    // Usar el mensaje del errorType
    super(message)

    // Asignar propiedades principales
    this.code = code
    this.status = statusCode

    // Asignar campos adicionales
    Object.assign(this, additionalFields)

    // Preservar la pila del error original
    if (origError.stack) {
      this.stack = origError.stack
    }
  }
}

const createError = (category, code, statusCode, message) => ({
  code: `${category}_${code}`,
  statusCode,
  message,
})

export const ERROR_TYPES = {
  auth: {
    INVALID_TOKEN: createError('AUTH', 'INVALID_TOKEN', 401, 'Invalid or malformed token.'),
    EXPIRED_TOKEN: createError('AUTH', 'EXPIRED_TOKEN', 401, 'The token has expired.'),
    NO_TOKEN: createError('AUTH', 'NO_TOKEN', 401, 'No token provided.'),
    ACCESS_DENIED: createError('AUTH', 'ACCESS_DENIED', 403, 'Access denied.'),
    ADMIN_ONLY: createError('AUTH', 'ADMIN_ONLY', 403, 'Access restricted to administrators only.'),
    INVALID_REFRESH_TOKEN: createError('AUTH', 'INVALID_REFRESH_TOKEN', 401, 'Invalid or expired refresh token.'),
    NO_REFRESH_TOKEN: createError('AUTH', 'NO_REFRESH_TOKEN', 401, 'No refresh token provided.'),
    TOKEN_REVOKED: createError('AUTH', 'TOKEN_REVOKED', 401, 'Access token has been revoked.'), // Nuevo
  },

  user: {
    INVALID_CREDENTIALS: createError('USER', 'INVALID_CREDENTIALS', 401, 'Invalid username or password.'),
    VALIDATION_ERROR: createError('USER', 'VALIDATION_ERROR', 400, 'User validation failed.'),
    DUPLICATE: createError('USER', 'DUPLICATE', 409, 'Duplicate user entry.'),
    REGISTRATION_ERROR: createError('USER', 'REGISTRATION_ERROR', 400, 'User registration failed.'),
    MISSING_ID: createError('USER', 'MISSING_ID', 400, 'User ID is required.'),
    UPDATE_ERROR: createError('USER', 'UPDATE_ERROR', 400, 'Failed to update user data.'),
    // INACTIVE_ACCOUNT: createError('USER', 'INACTIVE_ACCOUNT', 403, 'User account is inactive.'), // Ejemplo extra
  },

  // Errores relacionados con bases de datos
  database: {
    DUPLICATE_ENTRY: createError('DB', 'DUPLICATE_ENTRY', 409, 'Duplicate database entry.'),
    VALIDATION_ERROR: createError('DB', 'VALIDATION_ERROR', 400, 'Database validation failed.'),
    CONNECTION_ERROR: createError('DB', 'CONNECTION_ERROR', 500, 'Database connection error.'),
    MISSING_DB_CONFIG: createError('DB', 'MISSING_DB_CONFIG', 500, 'Database configuration is missing.'),
    INVALID_DB_TYPE: createError('DB', 'INVALID_DB_TYPE', 400, 'Invalid database type provided.'),
    QUERY_TIMEOUT: createError('DB', 'QUERY_TIMEOUT', 504, 'The database query took too long to execute.'),
    TRANSACTION_ERROR: createError('DB', 'TRANSACTION_ERROR', 500, 'Database transaction failed.'),
    UNAUTHORIZED_ACCESS: createError('DB', 'UNAUTHORIZED_ACCESS', 401, 'Unauthorized access to the database.'),
    SCHEMA_MISMATCH: createError('DB', 'SCHEMA_MISMATCH', 500, 'Database schema does not match expected structure.'),
    POOL_EXHAUSTED: createError('DB', 'POOL_EXHAUSTED', 503, 'No available connections in the database pool.'),
    CONNECTION_CLOSED: createError('DB', 'CONNECTION_CLOSED', 500, 'The database connection is closed.'),
  },

  // Errores relacionados con películas
  movie: {
    FETCH_ERROR: createError('MOVIE', 'FETCH_ERROR', 500, 'Error fetching movie data.'),
    CREATE_ERROR: createError('MOVIE', 'CREATE_ERROR', 500, 'Error creating movie.'),
    VALIDATION_ERROR: createError('MOVIE', 'VALIDATION_ERROR', 400, 'Movie validation failed.'),
    NOT_FOUND: createError('MOVIE', 'NOT_FOUND', 404, 'Movie not found.'),
    DELETE_ERROR: createError('MOVIE', 'DELETE_ERROR', 500, 'Error deleting movie.'),
    UPDATE_ERROR: createError('MOVIE', 'UPDATE_ERROR', 500, 'Error updating movie.'),
  },

  // Errores generales
  general: {
    INVALID_INPUT: createError('GENERAL', 'INVALID_INPUT', 400, 'Invalid input provided.'),
    INVALID_UUID: createError('GENERAL', 'INVALID_UUID', 400, 'Invalid UUID format.'),
    NOT_FOUND: createError('GENERAL', 'NOT_FOUND', 404, 'The requested resource was not found.'),
    SERVER_ERROR: createError('GENERAL', 'SERVER_ERROR', 500, 'An unexpected server error occurred.'),
  },
}

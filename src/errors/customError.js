export class CustomError extends Error {
  constructor({
    origError,
    errorType,
    ...additionalFields
  } = {}) {
    if (!origError) {
      throw new Error('The "origError" parameter is required to create a CustomError.')
    }

    const { code, message, status } = errorType || ERROR_TYPES.general.SERVER_ERROR

    if (!code || !message || !status) {
      throw new Error('The "errorType" parameter must be well-formed or will default to a generic error.')
    }

    super(message)

    this.code = code
    this.status = status

    this.origError = origError
    this.errorType = errorType
    Object.assign(this, additionalFields)

    if (origError.stack) {
      this.stack = origError.stack
    }
  }

  toString() {
    return `CustomError: ${this.code} (Status: ${this.status}) - ${this.message}`
  }
}

const createError = (category, segmentCode, status, message) => ({
  code: `${category}_${segmentCode}`,
  status,
  message,
})

export const ERROR_TYPES = {

  general: {
    INVALID_INPUT: createError('GENERAL', 'INVALID_INPUT', 400, 'Invalid input provided.'),
    INVALID_UUID: createError('GENERAL', 'INVALID_UUID', 400, 'Invalid UUID format.'),
    NOT_FOUND: createError('GENERAL', 'NOT_FOUND', 404, 'The requested resource was not found.'),
    SERVER_ERROR: createError('GENERAL', 'SERVER_ERROR', 500, 'An unexpected server error occurred.'),
    TOO_MANY_REQUESTS: createError('GENERAL', 'TOO_MANY_REQUESTS', 429, 'Too many requests.'),
    INVALID_IP: createError('GENERAL', 'INVALID_IP', 400, 'Invalid IP address.'),
  },

  auth: {
    ACCESS_DENIED: createError('AUTH', 'ACCESS_DENIED', 403, 'Access denied.'),
    EXPIRED_TOKEN: createError('AUTH', 'EXPIRED_TOKEN', 401, 'The token has expired.'),
    INVALID_REFRESH_TOKEN: createError('AUTH', 'INVALID_REFRESH_TOKEN', 401, 'Invalid or expired refresh token.'),
    INVALID_TOKEN: createError('AUTH', 'INVALID_TOKEN', 401, 'Invalid or malformed token.'),
    NO_REFRESH_TOKEN: createError('AUTH', 'NO_REFRESH_TOKEN', 401, 'No refresh token provided.'),
    NO_TOKEN: createError('AUTH', 'NO_TOKEN', 401, 'No token provided.'),
    TOKEN_REVOKED: createError('AUTH', 'TOKEN_REVOKED', 401, 'Access token has been revoked.'),
  },

  database: {
    CONNECTION_CLOSED: createError('DB', 'CONNECTION_CLOSED', 500, 'The database connection is closed.'),
    CONNECTION_ERROR: createError('DB', 'CONNECTION_ERROR', 500, 'Database connection error.'),
    DUPLICATE_ENTRY: createError('DB', 'DUPLICATE_ENTRY', 409, 'Duplicate database entry.'),
    INVALID_DB_TYPE: createError('DB', 'INVALID_DB_TYPE', 400, 'Invalid database type provided.'),
    MISSING_DB_CONFIG: createError('DB', 'MISSING_DB_CONFIG', 500, 'Database configuration is missing.'),
    POOL_EXHAUSTED: createError('DB', 'POOL_EXHAUSTED', 503, 'No available connections in the database pool.'),
    QUERY_ERROR: createError('DB', 'QUERY_ERROR', 500, 'Database query error.'),
    QUERY_TIMEOUT: createError('DB', 'QUERY_TIMEOUT', 504, 'The database query took too long to execute.'),
    SCHEMA_MISMATCH: createError('DB', 'SCHEMA_MISMATCH', 500, 'Database schema does not match expected structure.'),
    TRANSACTION_ERROR: createError('DB', 'TRANSACTION_ERROR', 500, 'Database transaction failed.'),
    UNAUTHORIZED_ACCESS: createError('DB', 'UNAUTHORIZED_ACCESS', 401, 'Unauthorized access to the database.'),
    VALIDATION_ERROR: createError('DB', 'VALIDATION_ERROR', 400, 'Database validation failed.'),
  },

  movie: {
    CREATE_ERROR: createError('MOVIE', 'CREATE_ERROR', 500, 'Error creating movie.'),
    DELETE_ERROR: createError('MOVIE', 'DELETE_ERROR', 500, 'Error deleting movie.'),
    FETCH_ERROR: createError('MOVIE', 'FETCH_ERROR', 500, 'Error fetching movie data.'),
    NOT_FOUND: createError('MOVIE', 'NOT_FOUND', 404, 'Movie not found.'),
    UPDATE_ERROR: createError('MOVIE', 'UPDATE_ERROR', 500, 'Error updating movie.'),
    VALIDATION_ERROR: createError('MOVIE', 'VALIDATION_ERROR', 400, 'Movie validation failed.'),
  },

  user: {
    DUPLICATE: createError('USER', 'DUPLICATE', 409, 'Duplicate user entry.'),
    INVALID_CREDENTIALS: createError('USER', 'INVALID_CREDENTIALS', 401, 'Invalid username or password.'),
    MISSING_ID: createError('USER', 'MISSING_ID', 400, 'User ID is required.'),
    REGISTRATION_ERROR: createError('USER', 'REGISTRATION_ERROR', 400, 'User registration failed.'),
    UPDATE_ERROR: createError('USER', 'UPDATE_ERROR', 400, 'Failed to update user data.'),
    VALIDATION_ERROR: createError('USER', 'VALIDATION_ERROR', 400, 'User validation failed.'),
  },
}

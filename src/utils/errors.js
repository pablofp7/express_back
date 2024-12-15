export const ERROR_TYPES = {
  // Authentication and Token errors
  AUTH_INVALID_TOKEN: {
    code: 'AUTH_INVALID_TOKEN',
    statusCode: 401,
    message: 'Invalid or malformed token.',
  },
  AUTH_EXPIRED_TOKEN: {
    code: 'AUTH_EXPIRED_TOKEN',
    statusCode: 401,
    message: 'The token has expired.',
  },
  AUTH_NO_TOKEN: {
    code: 'AUTH_NO_TOKEN',
    statusCode: 401,
    message: 'No token provided.',
  },
  AUTH_ACCESS_DENIED: {
    code: 'AUTH_ACCESS_DENIED',
    statusCode: 403,
    message: 'Access denied.',
  },
  AUTH_NO_USER_MODEL: {
    code: 'AUTH_NO_USER_MODEL',
    statusCode: 500,
    message: 'UserModel instance is required for authentication.',
  },
  AUTH_ADMIN_ONLY: {
    code: 'AUTH_ADMIN_ONLY',
    statusCode: 403,
    message: 'Access restricted to administrators only.',
  },
  AUTH_REFRESH_TOKEN_EXPIRED: {
    code: 'AUTH_REFRESH_TOKEN_EXPIRED',
    statusCode: 401,
    message: 'The refresh token has expired.',
  },
  AUTH_INVALID_REFRESH_TOKEN: {
    code: 'AUTH_INVALID_REFRESH_TOKEN',
    statusCode: 401,
    message: 'Invalid or expired refresh token.',
  },

  // User-related errors
  USER_INVALID_CREDENTIALS: {
    code: 'USER_INVALID_CREDENTIALS',
    statusCode: 401,
    message: 'Invalid username or password.',
  },
  USER_VALIDATION_ERROR: {
    code: 'USER_VALIDATION_ERROR',
    statusCode: 400,
    message: 'User validation failed.',
  },
  USER_DUPLICATE: {
    code: 'USER_DUPLICATE',
    statusCode: 409,
    message: 'Duplicate user entry.',
  },
  USER_REFRESH_TOKEN_ERROR: {
    code: 'USER_REFRESH_TOKEN_ERROR',
    statusCode: 500,
    message: 'Error during token refresh.',
  },
  USER_REGISTRATION_ERROR: {
    code: 'USER_REGISTRATION_ERROR',
    statusCode: 400,
    message: 'User registration failed.',
  },
  USER_MISSING_ID: {
    code: 'USER_MISSING_ID',
    statusCode: 400,
    message: 'User ID is required.',
  },
  USER_UPDATE_ERROR: {
    code: 'USER_UPDATE_ERROR',
    statusCode: 400,
    message: 'Failed to update user data.',
  },
  USER_MISSING_USERNAME: {
    code: 'USER_MISSING_USERNAME',
    statusCode: 400,
    message: 'Username is required.',
  },
  USER_NO_REFRESH_TOKEN: {
    code: 'USER_NO_REFRESH_TOKEN',
    statusCode: 401,
    message: 'No refresh token provided.',
  },

  // Database errors
  DB_DUPLICATE_ENTRY: {
    code: 'DB_DUPLICATE_ENTRY',
    statusCode: 409,
    message: 'Duplicate database entry.',
  },
  DB_VALIDATION_ERROR: {
    code: 'DB_VALIDATION_ERROR',
    statusCode: 400,
    message: 'Database validation failed.',
  },
  DB_CONNECTION_ERROR: {
    code: 'DB_CONNECTION_ERROR',
    statusCode: 500,
    message: 'Database connection error.',
  },

  // Movie-related errors
  MOVIE_NOT_FOUND: {
    code: 'MOVIE_NOT_FOUND',
    statusCode: 404,
    message: 'Movie not found.',
  },
  MOVIE_FETCH_ERROR: {
    code: 'MOVIE_FETCH_ERROR',
    statusCode: 500,
    message: 'Error fetching movie data.',
  },
  MOVIE_CREATE_ERROR: {
    code: 'MOVIE_CREATE_ERROR',
    statusCode: 500,
    message: 'Error creating movie.',
  },
  MOVIE_VALIDATION_ERROR: {
    code: 'MOVIE_VALIDATION_ERROR',
    statusCode: 400,
    message: 'Movie validation failed.',
  },
  INVALID_MOVIE: {
    code: 'INVALID_MOVIE',
    statusCode: 400,
    message: 'Invalid movie input.',
  },

  // General errors
  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    statusCode: 400,
    message: 'Invalid input provided.',
  },
  INVALID_UUID: {
    code: 'INVALID_UUID',
    statusCode: 400,
    message: 'Invalid UUID format.',
  },
  GENERAL_NOT_FOUND: {
    code: 'GENERAL_NOT_FOUND',
    statusCode: 404,
    message: 'The requested resource was not found.',
  },
  SERVER_ERROR: {
    code: 'SERVER_ERROR',
    statusCode: 500,
    message: 'An unexpected server error occurred.',
  },
}

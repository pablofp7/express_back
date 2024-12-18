
# Error Types Documentation

## Overview

This document outlines the predefined error types used throughout the application. Errors are categorized to ensure clarity and ease of debugging. Each error is defined using a consistent structure:

```javascript
const createError = (category, code, statusCode, message) => ({
  code: `${category}_${code}`,
  statusCode,
  message,
});
```

## Error Categories

### Authentication (Auth)
| Code                     | Status Code | Message                                |
|--------------------------|-------------|----------------------------------------|
| `AUTH_INVALID_TOKEN`     | 401         | Invalid or malformed token.           |
| `AUTH_EXPIRED_TOKEN`     | 401         | The token has expired.                |
| `AUTH_NO_TOKEN`          | 401         | No token provided.                    |
| `AUTH_ACCESS_DENIED`     | 403         | Access denied.                        |
| `AUTH_ADMIN_ONLY`        | 403         | Access restricted to administrators.  |
| `AUTH_INVALID_REFRESH_TOKEN` | 401     | Invalid or expired refresh token.     |
| `AUTH_NO_REFRESH_TOKEN`  | 401         | No refresh token provided.            |
| `AUTH_TOKEN_REVOKED`     | 401         | Access token has been revoked.        |

### User
| Code                     | Status Code | Message                                |
|--------------------------|-------------|----------------------------------------|
| `USER_INVALID_CREDENTIALS` | 401       | Invalid username or password.         |
| `USER_VALIDATION_ERROR`  | 400         | User validation failed.               |
| `USER_DUPLICATE`         | 409         | Duplicate user entry.                 |
| `USER_REGISTRATION_ERROR` | 400        | User registration failed.             |
| `USER_MISSING_ID`        | 400         | User ID is required.                  |
| `USER_UPDATE_ERROR`      | 400         | Failed to update user data.           |

### Database (DB)
| Code                     | Status Code | Message                                |
|--------------------------|-------------|----------------------------------------|
| `DB_DUPLICATE_ENTRY`     | 409         | Duplicate database entry.             |
| `DB_VALIDATION_ERROR`    | 400         | Database validation failed.           |
| `DB_CONNECTION_ERROR`    | 500         | Database connection error.            |
| `DB_MISSING_DB_CONFIG`   | 500         | Database configuration is missing.    |
| `DB_INVALID_DB_TYPE`     | 400         | Invalid database type provided.       |
| `DB_QUERY_TIMEOUT`       | 504         | The database query took too long.     |
| `DB_TRANSACTION_ERROR`   | 500         | Database transaction failed.          |
| `DB_UNAUTHORIZED_ACCESS` | 401         | Unauthorized access to the database.  |
| `DB_SCHEMA_MISMATCH`     | 500         | Database schema mismatch.             |
| `DB_POOL_EXHAUSTED`      | 503         | No available connections in the pool. |
| `DB_CONNECTION_CLOSED`   | 500         | The database connection is closed.    |

### Movie
| Code                     | Status Code | Message                                |
|--------------------------|-------------|----------------------------------------|
| `MOVIE_FETCH_ERROR`      | 500         | Error fetching movie data.            |
| `MOVIE_CREATE_ERROR`     | 500         | Error creating movie.                 |
| `MOVIE_VALIDATION_ERROR` | 400         | Movie validation failed.              |
| `MOVIE_NOT_FOUND`        | 404         | Movie not found.                      |
| `MOVIE_DELETE_ERROR`     | 500         | Error deleting movie.                 |
| `MOVIE_UPDATE_ERROR`     | 500         | Error updating movie.                 |

### General
| Code                     | Status Code | Message                                |
|--------------------------|-------------|----------------------------------------|
| `GENERAL_INVALID_INPUT`  | 400         | Invalid input provided.               |
| `GENERAL_INVALID_UUID`   | 400         | Invalid UUID format.                  |
| `GENERAL_NOT_FOUND`      | 404         | Resource not found.                   |
| `GENERAL_SERVER_ERROR`   | 500         | An unexpected server error occurred.  |

---

## Usage

### Error Handling
Each error is constructed using the `CustomError` class, which integrates the error types into the application's error-handling middleware.

```javascript
throw new CustomError(ERROR_TYPES.auth.INVALID_TOKEN.code);
```

# Error Types Documentation

## Overview

This document explains how errors are defined and structured using the `CustomError` class, detailing the predefined error types categorized into logical groups. These error types provide a unified way to create and standardize error instances, simplifying debugging and ensuring consistency.

## Error Handling with CustomError

The `CustomError` class is used to standardize error handling in the application. It integrates the predefined error types from `ERROR_TYPES` to provide consistent error messages, status codes, and additional context.

### Example Usage

To throw an error using `CustomError`, refer to the relevant `ERROR_TYPES` key based on the context:

```javascript
import { CustomError, ERROR_TYPES } from './errors'

throw new CustomError({
  origError: new Error('Resource not found'),
  errorType: ERROR_TYPES.general.NOT_FOUND,
  ...additionalFields, // These can include any new properties
})
```

This structure ensures all errors follow a consistent format, making them easier to debug and handle.

---

## Predefined Error Types

The application defines a set of common error types grouped by category. Each error type is structured hierarchically:

- **Error Type**: The global object containing all predefined errors, which are organized into categories (e.g., `general`, `auth`, `movie`).
- **Category**: Represents the group or context under which specific errors are defined.
- **Concrete Error**: The specific error code under the category (e.g., `NOT_FOUND`, `INVALID_INPUT`).

To use these error types in `CustomError`, pass them using the structure `ERROR_TYPES.category.CODE`, where `CODE` corresponds to the specific error segment. In the program code, this `CODE` is referred to as the segment code, and the final error code takes the form `"category_segmentcode"`. The `category` and `segmentcode` are variables representing the group and specific error code, respectively. For example: `ERROR_TYPES.general.NOT_FOUND` or `ERROR_TYPES.auth.INVALID_TOKEN`.

Each error type includes:

- **Code**: A combination of the group and the concrete code error (e.g., `GENERAL_INVALID_UUID`).
- **Status Code**: The HTTP status code returned (e.g., `400`).
- **Message**: A descriptive error message (e.g., `Invalid UUID format`).

### Core System Errors (General)

| Key                 | Status Code | Message                               |
| ------------------- | ----------- | ------------------------------------- |
| `INVALID_INPUT`     | 400         | Invalid input provided.               |
| `INVALID_UUID`      | 400         | Invalid UUID format.                  |
| `NOT_FOUND`         | 404         | The requested resource was not found. |
| `SERVER_ERROR`      | 500         | An unexpected server error occurred.  |
| `TOO_MANY_REQUESTS` | 429         | Too many requests.                    |
| `INVALID_IP`        | 400         | Invalid IP address.                   |

### Security-Related Errors (Auth)

| Key                     | Status Code | Message                              |
| ----------------------- | ----------- | ------------------------------------ |
| `ACCESS_DENIED`         | 403         | Access denied.                       |
| `EXPIRED_TOKEN`         | 401         | The token has expired.               |
| `INVALID_REFRESH_TOKEN` | 401         | Invalid or expired refresh token.    |
| `INVALID_TOKEN`         | 401         | Invalid or malformed token.          |
| `NO_REFRESH_TOKEN`      | 401         | No refresh token provided.           |
| `NO_TOKEN`              | 401         | No token provided.                   |
| `TOKEN_REVOKED`         | 401         | Access token has been revoked.       |

### Infrastructure Layer Errors (Database)

| Key                   | Status Code | Message                               |
| --------------------- | ----------- | ------------------------------------- |
| `CONNECTION_CLOSED`   | 500         | The database connection is closed.    |
| `CONNECTION_ERROR`    | 500         | Database connection error.            |
| `DUPLICATE_ENTRY`     | 409         | Duplicate database entry.             |
| `INVALID_DB_TYPE`     | 400         | Invalid database type provided.       |
| `MISSING_DB_CONFIG`   | 500         | Database configuration is missing.    |
| `POOL_EXHAUSTED`      | 503         | No available connections in the pool. |
| `QUERY_ERROR`         | 500         | Database query error.                 |
| `QUERY_TIMEOUT`       | 504         | The database query took too long.     |
| `SCHEMA_MISMATCH`     | 500         | Database schema mismatch.             |
| `TRANSACTION_ERROR`   | 500         | Database transaction failed.          |
| `UNAUTHORIZED_ACCESS` | 401         | Unauthorized access to the database.  |
| `VALIDATION_ERROR`    | 400         | Database validation failed.           |

### Business Domain Errors (Movie)

| Key                | Status Code | Message                    |
| ------------------ | ----------- | -------------------------- |
| `CREATE_ERROR`     | 500         | Error creating movie.      |
| `DELETE_ERROR`     | 500         | Error deleting movie.      |
| `FETCH_ERROR`      | 500         | Error fetching movie data. |
| `NOT_FOUND`        | 404         | Movie not found.           |
| `UPDATE_ERROR`     | 500         | Error updating movie.      |
| `VALIDATION_ERROR` | 400         | Movie validation failed.   |

### Business Domain Errors (User)

| Key                   | Status Code | Message                       |
| --------------------- | ----------- | ----------------------------- |
| `DUPLICATE`           | 409         | Duplicate user entry.         |
| `INVALID_CREDENTIALS` | 401         | Invalid username or password. |
| `MISSING_ID`          | 400         | User ID is required.          |
| `REGISTRATION_ERROR`  | 400         | User registration failed.     |
| `UPDATE_ERROR`        | 400         | Failed to update user data.   |
| `VALIDATION_ERROR`    | 400         | User validation failed.       |

---
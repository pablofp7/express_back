# Error Handling Philosophy

## Overview

This document explains the overarching philosophy and structure of error handling within the application. The approach is designed to ensure clear separation of concerns across layers, consistent error responses, and adaptability to different database backends.

### Key Principle

All errors explicitly thrown within the application are instances of `CustomError`, which standardizes error handling and ensures consistent client responses. Normal errors (e.g., native JavaScript errors or errors from third-party libraries) are caught and either re-thrown as `CustomError` instances or handled as unexpected errors, depending on the context. Unknown errors that are not predefined in the [Error_Types.md](./Error_Types.md) file are treated as unexpected and logged accordingly.

---

## Centralized Error Handling

The API uses a centralized error-handling middleware (`errorHandlerMiddleware`) to catch and process errors, ensuring consistent responses to the client.

### Workflow of `errorHandlerMiddleware`

1. **Custom Error Verification:** Only instances of `CustomError` (see [Error_Types.md](./Error_Types.md) for more information) are processed; unrecognized errors are re-thrown to prevent unexpected behavior.

   ```javascript
   if (!(error instanceof CustomError)) {
       throw error;
   }
   ```

2. **Error Logging:** Errors are logged with different levels of detail depending on the environment:
   - **Development:** Full error details, including the stack trace, are logged to the console for debugging.
   - **Production:** Minimal error details are logged to avoid sensitive information leakage.

   ```javascript
   if (isDevelopment) {
       console.warn(`[DEV ERROR]:`, error);
   } else {
       console.error(`ERROR: Code: ${error.code}, Status: ${error.status}`);
   }
   ```

3. **Error Mapping for the Response:** The error is mapped to a standardized response structure, ensuring clients receive relevant information:
   - **Status Code:** The HTTP status code associated with the error.
   - **Error Message:** A descriptive message explaining the error.
   - **Optional Stack Trace (Development Mode):** Provides additional debugging information in non-production environments.

   ```javascript
   const response = {
       status: error.status,
       message: error.message,
       ...(isDevelopment && { stack: error.stack }),
   };
   ```

4. **Client Response:** A standardized JSON response is sent back to the client.

   ```javascript
   res.status(response.status).json({ error: response.message });
   ```

---

## Layered Error Handling

### Controller Layer
- **Responsibilities:**
  - Validate incoming requests.
  - Handle input-related errors (e.g., missing fields, invalid formats).
  - Map user input to model operations.
- **Error Management:**
  - Validation errors are caught and processed here.
  - Any issues detected before interacting with the model are handled directly.

### Model Layer
- **Responsibilities:**
  - Define business logic and data operations.
  - Generate SQL queries or invoke database actions through the `DatabaseConnection` abstraction.
- **Error Management:**
  - The model does not handle database or validation errors directly.
  - It relies on the `DatabaseConnection` layer for managing database-related issues.
  - Any validation errors are expected to be managed in the controller.

### DatabaseConnection Layer
- **Responsibilities:**
  - Serve as an abstraction for database interactions, supporting multiple database types (e.g., SQLite, MySQL).
  - Manage connection pooling, query execution, and error handling.
- **Error Management:**
  - Handles all database-related errors, such as connection issues, query timeouts, and schema mismatches.
  - Provides a unified interface to the model, abstracting database-specific logic.

---

## Why the Model Doesn't Throw Errors

The model layer is designed to focus exclusively on its primary role: generating queries for database interactions. Error handling is delegated to other layers for a clear separation of responsibilities:
- **Database Errors:** Managed by the DatabaseConnection class, which abstracts the execution process and handles issues such as connection failures or query errors.
- **Validation Errors:**  Handled in the controller layer (and some middlewares) before data reaches the model, ensuring that only valid input is processed.
- **Separation of concerns:** By delegating error management, the model avoids dependency on specific database types or error-handling logic, making it adaptable and easier to maintain. Its sole responsibility is to create queries and rely on DatabaseConnection for execution.

---

## Example Error Flow

1. **Controller:** Receives a request to create a resource, validates the input, and calls the model.
2. **Model:** Constructs an SQL query and delegates execution to the `DatabaseConnection`.
3. **DatabaseConnection:** Executes the query and throw any database-related `CustomError`.
4. **Middleware:** The `errorHandlerMiddleware` catches the `CustomError`, logs it, maps it for the client, and sends a standardized response.

---

## Benefits of This Approach

- **Consistency:** A standardized response format across the API.
- **Modularity:** Each layer has a clear and focused responsibility.
- **Flexibility:** The `DatabaseConnection` abstraction supports switching between databases without impacting other layers.
- **Debugging:** Detailed error logs in development mode while ensuring security in production.


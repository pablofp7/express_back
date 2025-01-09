
# API Testing Plan for Movie and User Management

## Introduction

This document outlines the testing plan for the Movie and User Management API based on the provided schema (OpenAPI 3.1.1). The tests are categorized into unit, integration, and functional tests, covering the endpoints defined in the `openapi.yaml` file. The objective is to ensure the API's quality and reliability across all layers.

---

## Types of Tests and Implementation Order

### 1. **Unit Tests**

Testing isolated units of code such as functions, middlewares, or controllers. These tests verify the correct behavior of individual API components.

#### **Components to Test**

- **`dbConnection.js`**** (Database connection abstraction):**

  - Validate connections to:
    - Local MySQL.
    - FreeSQL (online MySQL).
    - Turso (online SQLite).
  - Simulate basic queries (success and failure cases).

- **Controllers (****`src/controllers`****):**

  - Test individual controller methods for all endpoints.
  - Mock dependencies like database models.

- **Models (****`src/models`****):**

  - Validate schema definitions.
  - Test CRUD operations with in-memory databases or mocks.

- **Middlewares:**

  - **`authMiddleware.js`**:
    - Reject requests without tokens.
    - Accept requests with valid tokens.
    - Detect insufficient permissions.
  - **`blacklistMiddleware.js`**:
    - Restrict access based on client IP addresses.
    - Ensure blacklisted IPs cannot access protected routes.
  - **`corsMiddleware.js`**:
    - Enable cross-origin requests for allowed origins.
  - **`errorHandlerMiddleware.js`**:
    - Handle API errors, specifically `CustomError` instances.
    - Unrecognized errors are re-thrown for upstream handling.
    - Logs detailed error information based on environment (development or production).
    - Maps errors to client-friendly responses with appropriate HTTP status and message.
  - **`rateLimitMiddleware.js`**:
    - Enforce request rate limits to prevent abuse.
    - Test general and sensitive limiters.
  - **`validateRefreshMiddleware.js`**:
    - Validate cookies with refresh tokens.
    - Handle invalid or expired tokens.

- **Utilities (****`src/utils`****):**

  - Validate UUIDs.
  - Validate user schema.
  - Validate movie schema.
  - Validate received IPs (not well formed ones could crash the rate limiter).

- **Custom Errors (****`src/errors`****):**

  - Validate that errors are constructed correctly.
  - Test error-handling scenarios.

---

### 2. **Integration Tests**

Ensuring correct endpoint behavior and interaction with other components. These tests cover all routes and middlewares, stubbing the database query methods and the JWT verification functionality. This allows predefined responses for database operations and custom tokens without generating real JWTs.

#### **Endpoints to Test (Described in OpenAPI):**

### **Users**

- **POST ****`/user/login`**:

  - Test login with valid and invalid credentials.
  - Validate correct issuance of access and refresh tokens.

- **POST ****`/user/register`**:

  - Create users with valid data.
  - Handle validation errors.

- **GET ****`/user/refresh-token`**:

  - Request a new access token with a valid refresh token.
  - Handle errors for missing or invalid tokens.

- **POST ****`/user/logout`**:

  - Validate proper logout for authenticated users.
  - Test errors with missing or invalid tokens.

- **PATCH ****`/user/{id}`**:

  - Update a user with valid data (requires admin role).
  - Validate errors for insufficient permissions, invalid data, or non-existent users.

- **GET ****`/user/:username`**:

  - Retrieve user information by username.
  - Test errors when the user does not exist.

- **DELETE ****`/user/{id}`**:

  - Test user deletion with admin role.
  - Validate errors such as invalid tokens, insufficient permissions, or non-existent users.

### **Movies**

- **GET ****`/movie`**:

  - Validate it returns a list of movies with a valid token.

- **GET ****`/movie/{id}`**:

  - Retrieve a specific movie by ID.
  - Test errors when the movie does not exist or the ID is invalid.

- **POST ****`/movie`**:

  - Create movies with valid data (admin only).
  - Handle validation and permission errors.

- **PATCH ****`/movie/{id}`**:

  - Update movies with valid data.
  - Test errors for permissions, invalid IDs, or non-existent movies.

- **DELETE ****`/movie/{id}`**:

  - Delete movies as admin.
  - Validate errors such as non-existent movies or insufficient permissions.

---

### **3. End-to-End (E2E) Tests**

End-to-End (E2E) tests simulate the complete API usage from a client perspective, ensuring that all components work together as expected. These tests are divided into two files:

1. **`usersFlow.e2e.test.js`**: Tests for user-related routes.
2. **`moviesFlow.e2e.test.js`**: Tests for movie-related routes.

---

#### **1. User Routes (`usersFlow.e2e.test.js`)**

##### **Routes to Test**
- **Public Routes (No Authentication Required)**:
  - `POST /user/login`: User login.
  - `POST /user/register`: User registration.
  - `GET /user/:username`: Fetch user details by username.

- **Protected Routes (Authentication Required)**:
  - `GET /user/refresh-token`: Refresh access token using a valid refresh token.
  - `POST /user/logout`: Log out the user.

- **Admin-Only Routes (Authentication + Admin Role Required)**:
  - `DELETE /user/:id`: Delete a user by ID.
  - `PATCH /user/:id`: Update a user by ID.

##### **Testing Scenarios**
- **Unauthenticated User**:
  - Allowed: Register, login, fetch user details.
  - Unauthorized: Refresh token, logout, delete/update user.

- **Authenticated User (Non-Admin)**:
  - Allowed: Refresh token, logout, fetch user details.
  - Unauthorized: Delete/update user.

- **Authenticated Admin User**:
  - Allowed: All actions (refresh token, logout, fetch user details, delete/update user).

- **Invalid Data**:
  - Test invalid credentials, missing fields, invalid UUIDs, etc.

##### **Example Test Cases**
- **POST `/user/register`**:
  - Valid data: Expect `201 Created`.
  - Duplicate username: Expect `400 Bad Request`.

- **POST `/user/login`**:
  - Valid credentials: Expect `200 OK`.
  - Invalid credentials: Expect `401 Unauthorized`.

- **GET `/user/:username`**:
  - Valid username: Expect `200 OK`.
  - Non-existent username: Expect `404 Not Found`.

- **GET `/user/refresh-token`**:
  - Valid refresh token: Expect `200 OK`.
  - Invalid refresh token: Expect `401 Unauthorized`.

- **POST `/user/logout`**:
  - Valid access token: Expect `200 OK`.
  - Invalid access token: Expect `401 Unauthorized`.

- **DELETE `/user/:id`**:
  - Valid UUID and admin role: Expect `200 OK`.
  - Invalid UUID: Expect `400 Bad Request`.
  - Non-admin user: Expect `403 Forbidden`.

- **PATCH `/user/:id`**:
  - Valid UUID and admin role: Expect `200 OK`.
  - Invalid UUID: Expect `400 Bad Request`.
  - Non-admin user: Expect `403 Forbidden`.

---

#### **2. Movie Routes (`moviesFlow.e2e.test.js`)**

##### **Routes to Test**
- **Protected Routes (Authentication Required)**:
  - `GET /movies/`: Fetch all movies.
  - `GET /movies/:id`: Fetch a movie by ID.

- **Admin-Only Routes (Authentication + Admin Role Required)**:
  - `POST /movies/`: Create a new movie.
  - `DELETE /movies/:id`: Delete a movie by ID.
  - `PATCH /movies/:id`: Update a movie by ID.

##### **Testing Scenarios**
- **Unauthenticated User**:
  - Unauthorized: All movie routes.

- **Authenticated User (Non-Admin)**:
  - Allowed: Fetch all movies, fetch a movie by ID.
  - Unauthorized: Create, delete, or update a movie.

- **Authenticated Admin User**:
  - Allowed: All actions (fetch, create, delete, update movies).

- **Invalid Data**:
  - Test invalid UUIDs, missing fields, invalid access tokens, etc.

##### **Example Test Cases**
- **GET `/movies/`**:
  - Valid access token: Expect `200 OK`.
  - Invalid or missing access token: Expect `401 Unauthorized`.

- **GET `/movies/:id`**:
  - Valid UUID and access token: Expect `200 OK`.
  - Invalid UUID: Expect `400 Bad Request`.
  - Non-existent movie: Expect `404 Not Found`.

- **POST `/movies/`**:
  - Valid data and admin role: Expect `201 Created`.
  - Invalid data: Expect `400 Bad Request`.
  - Non-admin user: Expect `403 Forbidden`.

- **DELETE `/movies/:id`**:
  - Valid UUID and admin role: Expect `200 OK`.
  - Invalid UUID: Expect `400 Bad Request`.
  - Non-admin user: Expect `403 Forbidden`.

- **PATCH `/movies/:id`**:
  - Valid UUID and admin role: Expect `200 OK`.
  - Invalid UUID: Expect `400 Bad Request`.
  - Non-admin user: Expect `403 Forbidden`.

---

#### **Tools and Libraries**
- **Supertest**: For making HTTP requests and validating responses.
- **Mocha/Chai**: For writing and running tests.
- **Sinon**: For mocking and stubbing dependencies.
- **Database Cleanup**: Ensure a clean state before each test (e.g., delete test users and movies).

---

## Tools Used

- **Mocha:** Test framework.
- **Chai:** Assertion library.
- **Chai as Promised:** Extended assertions for promises (not used in all tests).
- **Supertest:** HTTP request simulation.
- **Sinon:** Mocks and stubs for unit tests.
- **ESMock:** Handles issues with ES module imports.

---
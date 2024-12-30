
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

### 2. **Functional Tests**

Testing the complete functionality of endpoints.

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

- **GET ****`/movies`**:

  - Validate it returns a list of movies with a valid token.

- **GET ****`/movies/{id}`**:

  - Retrieve a specific movie by ID.
  - Test errors when the movie does not exist or the ID is invalid.

- **POST ****`/movies`**:

  - Create movies with valid data (admin only).
  - Handle validation and permission errors.

- **PATCH ****`/movies/{id}`**:

  - Update movies with valid data.
  - Test errors for permissions, invalid IDs, or non-existent movies.

- **DELETE ****`/movies/{id}`**:

  - Delete movies as admin.
  - Validate errors such as non-existent movies or insufficient permissions.

---

### 3. **End-to-End (E2E) Tests**

Optional for simulating the complete API usage from a client perspective.

#### **Flows to Test:**

- **User:**

  1. Registration.
  2. Login.
  3. Create resources (e.g., movies).
  4. Update and delete resources.
  5. Logout.

- **Authentication and Authorization:**

  - Test access with different roles.
  - Verify handling of expired tokens.

---

## Tools Used

- **Mocha:** Test framework.
- **Chai:** Assertion library.
- **Chai as Promised:** Extended assertions for promises (not yet used in all tests).
- **Supertest:** HTTP request simulation.
- **Sinon:** Mocks and stubs for unit tests.
- **ESMock:** Handles issues with ES module imports.
- **nyc:** Code coverage measurement.

---

## Initial Setup

1. Install dependencies:
   ```bash
   npm install --save-dev mocha chai chai-as-promised supertest sinon nyc esmock
   ```
2. Create `tests/` directory with subdirectories for each component:
   ```
   tests/
   ├── controllers/
   ├── middlewares/
   ├── routes/
   ├── utils/
   └── models/
   ```
3. Configure the test script in `package.json`:
   ```json
   "scripts": {
     "test": "mocha --recursive tests"
   }
   ```
4. Run tests:
   ```bash
   npm test
   ```
5. Measure coverage:
   ```bash
   npx nyc npm test
   ```

---

## Next Steps

1. **Implement Unit Tests:**
  Start with middlewares and basic utilities to validate their isolated behavior.

2. **Design Functional Tests:**
  Simulate HTTP requests to endpoints, validating the complete request-to-response flow, including middleware, controllers, and database interactions.
  
3. **Define E2E Flows:**
  Simulate real-world scenarios from a client’s perspective to validate the entire API.

4. **Automate Tests:**
  Set up a CI/CD pipeline (e.g., GitHub Actions) to execute tests on every code change.
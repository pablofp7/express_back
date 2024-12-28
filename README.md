
# README - Back End for Movie and User Management

## Description

This project is a backend developed with **Express.js** that follows a **Model-Controller (MC)** architecture. It does not include a view layer, as there is no **Server-Side Rendering (SSR)**; instead, the responsibility for the user interface lies with the frontend. It is specifically designed and adapted for **REST APIs**.

## Main Features

### Users

- Registration of new users.
- Login with token issuance:
  - **Access Token**: Short-lived token to access protected resources.
  - **Refresh Token**: Long-lived token sent in a secure cookie.
- Renewal of the Access Token using the Refresh Token.
- Retrieval of user information.
- Updating and deletion of users (requires admin permissions).

### Movies

- Retrieval of the complete movie list.
- Creation, updating, and deletion of movies (requires admin permissions).
- Retrieval of movie information by ID.

## Technologies and Tools

- **Node.js**
- **Express.js**
- **MySQL**, **SQLite**, and **MongoDB** (supported by a `dbConnection.js` database abstraction layer).
- **JWT (JSON Web Tokens)** for authentication and authorization.
- **Custom middleware**:
  - `authMiddleware.js`: Verifies access tokens and permissions.
  - `validateRefreshMiddleware.js`: Validates refresh tokens for renewal.
  - `generalLimiter.js`: Implements general request rate limiting.
  - `sensitiveLimiter.js`: Adds stricter rate limiting for sensitive endpoints.
  - `corsMiddleware.js`: Handles Cross-Origin Resource Sharing (CORS) validation.
  - `ipBlacklistMiddleware.js`: Blocks requests from blacklisted IP addresses.
- **OpenAPI 3.1.1** for API documentation.

## Installation

1. Clone this repository:

   ```bash
   git clone <REPOSITORY_URL>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the environment variables:
   Copy the `.env.example` file and rename it to `.env`:

   ```bash
   cp .env.example .env
   ```

   Then edit the `.env` file and complete the necessary variables according to your environment.

4. Start the server based on the database you want to use:

   To use MySQL:

   ```bash
   npm run start:mysql
   ```

   To use the local database or MongoDB:

   ```bash
   npm run start:local
   ```

   or

   ```bash
   npm run start:mongo
   ```

   The server will run on the port defined in the `.env` file (default: 3000).

   **NOTE**: Local and MongoDB functionalities are not fully implemented. Development began with all three options to practice dependency injection with multiple models, but the final implementation focused only on SQL databases (several types are available).

## Usage

### **Key Endpoints**

Before diving into the key endpoints, you can explore and test all API endpoints interactively using **Swagger UI**.

- **GET `/api-docs`**:  
  Access the interactive documentation generated from the `openapi.yaml` file.  
  To access:  
  1. Ensure the server is running.  
  2. Open the following URL in your browser (replace `<api-port>` with the port configured in your environment, default is `3000`):  
     ```
     http://localhost:<api-port>/api-docs
     ```

#### Users

- **POST `/user/login`**:  
  Logs in and returns access and refresh tokens.
- **POST `/user/register`**:  
  Registers a new user.
- **GET `/user/refresh-token`**:  
  Renews the access token using the refresh token.
- **POST `/user/logout`**:  
  Logs out an authenticated user, invalidating their tokens.
- **DELETE `/user/{id}`**:  
  Deletes a user (requires admin role).
- **PATCH `/user/{id}`**:  
  Updates user information (requires admin role).
- **GET `/user/:username`**:  
  Retrieves user information by username.

#### Movies

- **GET `/movies`**:  
  Retrieves all movies.
- **POST `/movies`**:  
  Creates a new movie (requires admin role).
- **GET `/movies/{id}`**:  
  Retrieves movie information by ID.
- **PATCH `/movies/{id}`**:  
  Updates a movie (requires admin role).
- **DELETE `/movies/{id}`**:  
  Deletes a movie (requires admin role).

### Authentication

- **Access Token**: Sent in the `Authorization: Bearer <token>` header.
- **Refresh Token**: Sent in a `refresh-token` cookie with `HttpOnly` and `SameSite` properties for added security.

## Testing

This project includes a detailed testing plan divided into different levels:

- **Unit Tests**:  
  Validate the correct functionality of individual components, such as middleware, controllers, and utilities.

- **Functional Tests**:  
  Validate the complete behavior of key endpoints.

- **End-to-End (E2E) Tests**:  
  Simulate complete flows from the client perspective.

### **Running Tests**

You can run all tests or select a specific type using the following commands:

- **All tests**:

  ```bash
  npm test
  ```

- **Unit tests**:

  ```bash
  npm run test:unit
  ```

- **Integration tests**:

  ```bash
  npm run test:integration
  ```

- **Functional tests**:

  ```bash
  npm run test:functional
  ```

- **E2E tests**:
  ```bash
  npm run test:e2e
  ```

### **Test Coverage**

To measure test coverage, use the following command:

```bash
npx nyc npm test
```

This will generate a coverage report indicating which parts of the code are tested and which are not.

<!-- ## Contribution

1. Fork this repository.
2. Create a new branch for your changes:
   ```bash
   git checkout -b feature/new-feature
   ```
3. Submit your changes in a pull request.

## License

This project is licensed under the MIT License. See the `LICENSE` file for more information. -->
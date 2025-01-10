# README - Back End for Movie and User Management

## Description
This project is a backend developed with Express.js that follows a Model-Controller (MC) architecture. It does not include a view layer, as there is no Server-Side Rendering (SSR); instead, the responsibility for the user interface lies with the frontend. It is specifically designed and adapted for REST APIs.

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
- **JWT** (JSON Web Tokens) for authentication and authorization.
- Custom middleware:
  - `authMiddleware.js`: Verifies access tokens and permissions.
  - `validateRefreshMiddleware.js`: Validates refresh tokens for renewal.
  - `generalLimiter.js`: Implements general request rate limiting.
  - `sensitiveLimiter.js`: Adds stricter rate limiting for sensitive endpoints.
  - `corsMiddleware.js`: Handles Cross-Origin Resource Sharing (CORS) validation.
  - `ipBlacklistMiddleware.js`: Blocks requests from blacklisted IP addresses.
- **zod** for input and field validations.
- **OpenAPI 3.1.1** for API documentation.

## Installation

### Using Docker Compose
The easiest way to set up and run this project is by using Docker Compose, which includes both the backend and a MySQL server. Follow the steps below:

1. Clone this repository:

   ```bash
   git clone <REPOSITORY_URL>
   ```

2. Navigate to the project directory:

   ```bash
   cd <PROJECT_DIRECTORY>
   ```

3. Start the backend and MySQL server using Docker Compose:

   ```bash
   docker-compose up -d
   ```

   This will:
   - Start a MySQL server with the database initialized using the provided SQL scripts.
   - Start the backend server in a Node.js container.
   - The backend will be accessible at `http://localhost:33333`, and the MySQL server will be available at `localhost:3306`.

4. (Optional) If you need to stop the services

  If you need to stop the services, follow these steps to ensure only the relevant containers are stopped without affecting other running containers:

  - To stop only the containers for your services (`mysql_container` and `backend_container`), run:
    ```bash
    docker-compose stop mysql_container backend_container
    ```
    This will stop the specified services while leaving other running containers unaffected.

  - If you need to stop and remove the containers for your services but keep the volumes and networks:
    ```bash
    docker-compose rm -f mysql_container backend_container
    ```
    Use this if you want a clean restart for these services without losing any persistent data.

### Manual Installation (Without Docker)
If you prefer to set up the project manually, follow these steps:

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure the environment variables:
   Copy the `.env.example` file and rename it to `.env`:

   ```bash
   cp .env.example .env
   ```

   Then edit the `.env` file and complete the necessary variables according to your environment.

3. Start the server based on the database you want to use:

   - To use MySQL:

     ```bash
     npm run start:mysql
     ```

   - To use the local database or MongoDB:

     ```bash
     npm run start:local
     ```

     or

     ```bash
     npm run start:mongo
     ```

   The server will run on the port defined in the `.env` file (default: 3000).

   **NOTE**: Local and MongoDB functionalities are not fully implemented. Development began with all three options to practice dependency injection with multiple models, but the final implementation focused only on SQL databases (several types are available).

### Initialize the Database
If you're not using Docker Compose, you can populate the database with example data using the provided SQL scripts. Navigate to the `sqlScripts` directory and choose the script that corresponds to your database setup. Execute it in your database management tool or CLI.

```
sqlScripts
├── movie_turso_sqlite.sql       # For Turso DB (online SQLite)
├── script_movie_no_uuid.sql     # For FreeSQL (online SQL database, old version without UUID type support)
├── script_movie_original.sql    # For updated MySQL versions
├── tokens.sql                   # Initializes the tokens table
└── users.sql                    # Initializes the users table (ID uses CHAR to ensure compatibility)
```

## Usage

### Key Endpoints
Before diving into the key endpoints, you can explore and test all API endpoints interactively using Swagger UI.

- **GET /api-docs**:
  Access the interactive documentation generated from the `openapi.yaml` file.

  To access:

  - Ensure the server is running.
  - Open the following URL in your browser (replace `<api-port>` with the port configured in your environment, default is `3000`):

    ```
    http://localhost:<api-port>/api-docs
    ```

### Users
- **POST /user/login**: Logs in and returns access and refresh tokens.
- **POST /user/register**: Registers a new user.
- **GET /user/refresh-token**: Renews the access token using the refresh token.
- **POST /user/logout**: Logs out an authenticated user, invalidating their tokens.
- **DELETE /user/{id}**: Deletes a user (requires admin role).
- **PATCH /user/{id}**: Updates user information (requires admin role).
- **GET /user/:username**: Retrieves user information by username.

### Movies
- **GET /movie**: Retrieves all movies.
- **POST /movie**: Creates a new movie (requires admin role).
- **GET /movie/{id}**: Retrieves movie information by ID.
- **PATCH /movie/{id}**: Updates a movie (requires admin role).
- **DELETE /movie/{id}**: Deletes a movie (requires admin role).

## Authentication
- **Access Token**: Sent in the `Authorization: Bearer <token>` header.
- **Refresh Token**: Sent in a `refresh-token` cookie with `HttpOnly` and `SameSite` properties for added security.

## Testing

This project includes a detailed testing plan divided into different levels:

- **Unit Tests**: Validate the correct functionality of individual components, such as middleware, controllers, and utilities.
- **Integration Tests**: Validate the behavior of key endpoints.
- **End-to-End (E2E) Tests**: Simulate complete flows from the client perspective.

### Running Tests
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

- **E2E tests**:

  ```bash
  npm run test:e2e
  ```
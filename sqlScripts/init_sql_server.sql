-- This script initializes the mysql database and its tables
-- Necessary to test the API
-- THIS OPTION WHEN RUNNING MYSQL SERVER INSTEADS OF MYSQL CONTAINER

CREATE DATABASE IF NOT EXISTS testdb;

USE testdb;

CREATE TABLE movie (
    id CHAR(36) PRIMARY KEY, 
    title VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    director VARCHAR(255) NOT NULL,
    duration INT NOT NULL,
    poster TEXT,
    rate DECIMAL(3, 1) NOT NULL
);

CREATE TABLE genre (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE movie_genre (
    movie_id CHAR(36), 
    genre_id INT,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movie(id),
    FOREIGN KEY (genre_id) REFERENCES genre(id)
);

CREATE TABLE IF NOT EXISTS user (
    id CHAR(36) PRIMARY KEY, 
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,
    age INT
);

CREATE TABLE IF NOT EXISTS role (
    id CHAR(36) PRIMARY KEY, 
    name VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id CHAR(36),
    role_id CHAR(36),
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (role_id) REFERENCES role(id)
);

CREATE TABLE tokens (
    id CHAR(36) PRIMARY KEY, 
    user_id CHAR(36) NOT NULL, 
    token VARCHAR(512) NOT NULL UNIQUE, 
    type ENUM('access', 'refresh') NOT NULL, 
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
    expires_at DATETIME NOT NULL, 
    revoked DATETIME DEFAULT NULL, 
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

INSERT INTO genre (name) VALUES 
('Drama'),
('Action'),
('Crime'),
('Adventure'),
('Sci-Fi'),
('Romance');

INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES
(UUID(), "Inception", 2010, "Christopher Nolan", 148, "https://m.media-amazon.com/images/I/91Rc8cAmnAL._AC_UF1000,1000_QL80_.jpg", 8.8),
(UUID(), "The Shawshank Redemption", 1994, "Fran Darabont", 142, "https://i.ebayimg.com/images/g/4goAAOSwMyBe7hnQ/s-l1200.webp", 3.5),
(UUID(), "The Dark Knight", 2008, "Christopher Nolan", 152, "https://i.ebayimg.com/images/g/yokAAOSw8w1YARbm/s-l1200.jpg", 8.2);

INSERT INTO movie_genre (movie_id, genre_id)
VALUES 
    ((SELECT id FROM movie WHERE title='Inception'), (SELECT id FROM genre WHERE name='Sci-Fi')),
    ((SELECT id FROM movie WHERE title='Inception'), (SELECT id FROM genre WHERE name='Action')),
    ((SELECT id FROM movie WHERE title='The Shawshank Redemption'), (SELECT id FROM genre WHERE name='Drama')),
    ((SELECT id FROM movie WHERE title='The Dark Knight'), (SELECT id FROM genre WHERE name='Action'));

INSERT INTO role (id, name) VALUES 
("ad0e8400-e29b-41d4-a716-446655440001", "Admin"),
("890e8400-e29b-41d4-a716-446655440002", "User");

-- Insert users (password is 'password123' hashed)
INSERT INTO user (id, username, email, password) VALUES 
('23ae2d1b-de4e-466e-a752-8f6625c41694', 'testUser', 'testuser@example.com', '$2b$10$3.WnoO660claoTsB5qnn5e5QwshorpLchYXDSuXe5xClpE.QoU.FW'),
('cd82d865-6d7b-43a0-a1ac-ce23f50f0285', 'testUserAdmin', 'testuseradmin@example.com', '$2b$10$SPoo4bV6jS.sjanNd/.fv.HsCLVDvEZtC3EXDMzdjkcJSNfOvIeEe');

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) VALUES
('23ae2d1b-de4e-466e-a752-8f6625c41694', '890e8400-e29b-41d4-a716-446655440002'), -- testUser as User
('cd82d865-6d7b-43a0-a1ac-ce23f50f0285', 'ad0e8400-e29b-41d4-a716-446655440001'); -- testUserAdmin as Admin

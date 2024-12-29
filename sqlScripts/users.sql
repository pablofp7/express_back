-- This script initializes the users table.
-- It uses CHAR for the ID field to ensure compatibility across different SQL versions.


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




INSERT INTO role (id, name) VALUES 
("ad0e8400-e29b-41d4-a716-446655440001", "Admin"),
("890e8400-e29b-41d4-a716-446655440002", "User"),
("6e0e8400-e29b-41d4-a716-446655440003", "Guest");

-- -- Insertar usuarios
-- INSERT INTO user (id, username, email, password, age) VALUES
-- ("550e8400-e29b-41d4-a716-446655440004", "hamilton", "muli@hamilton.com", "hashed_password", 30),
-- ("abce8400-e29b-41d4-a716-446655440005", "nando_alonso", "nano@renault.com", "hashed_password", 25);

-- -- Asignar roles a usuarios
-- INSERT INTO user_roles (user_id, role_id) VALUES
-- ("550e8400-e29b-41d4-a716-446655440004", "550e8400-e29b-41d4-a716-446655440001"), -- X como Admin
-- ("abce8400-e29b-41d4-a716-446655440005", "550e8400-e29b-41d4-a716-446655440002"); -- Y como User

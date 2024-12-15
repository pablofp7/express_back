-- Crear la tabla movie
CREATE TABLE IF NOT EXISTS movie (
    id CHAR(36) PRIMARY KEY, -- Almacena el UUID como texto
    title VARCHAR(255) NOT NULL,
    year INT NOT NULL,
    director VARCHAR(255) NOT NULL,
    duration INT NOT NULL,
    poster TEXT,
    rate DECIMAL(3, 1) NOT NULL
);

-- Crear la tabla genre
CREATE TABLE IF NOT EXISTS genre (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE
);

-- Crear la tabla movie_genres
CREATE TABLE IF NOT EXISTS movie_genres (
    movie_id CHAR(36),
    genre_id INT,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movie(id),
    FOREIGN KEY (genre_id) REFERENCES genre(id)
);

-- Insertar géneros
INSERT OR IGNORE INTO genre (name) VALUES 
('Drama'),
('Action'),
('Crime'),
('Adventure'),
('Sci-Fi'),
('Romance');

-- Insertar películas con UUIDs generados
INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES
("550e8400-e29b-41d4-a716-446655440000", "Inception", 2010, "Christopher Nolan", 148, "https://m.media-amazon.com/images/I/91Rc8cAmnAL._AC_UF1000,1000_QL80_.jpg", 8.8),
("ab0e8400-e29b-41d4-a716-446655440001", "The Shawshank Redemption", 1994, "Fran Darabont", 142, "https://i.ebayimg.com/images/g/4goAAOSwMyBe7hnQ/s-l1200.webp", 3.5),
("yuse8400-e29b-41d4-a716-446655440002", "The Dark Knight", 2008, "Christopher Nolan", 152, "https://i.ebayimg.com/images/g/yokAAOSw8w1YARbm/s-l1200.jpg", 8.2);

-- Insertar relaciones en movie_genres
-- Usar subconsultas explícitas en lugar de VALUES
INSERT INTO movie_genres (movie_id, genre_id)
SELECT 
    (SELECT id FROM movie WHERE title='Inception') AS movie_id,
    (SELECT id FROM genre WHERE name='Sci-Fi') AS genre_id;

INSERT INTO movie_genres (movie_id, genre_id)
SELECT 
    (SELECT id FROM movie WHERE title='Inception') AS movie_id,
    (SELECT id FROM genre WHERE name='Action') AS genre_id;

INSERT INTO movie_genres (movie_id, genre_id)
SELECT 
    (SELECT id FROM movie WHERE title='The Shawshank Redemption') AS movie_id,
    (SELECT id FROM genre WHERE name='Drama') AS genre_id;

INSERT INTO movie_genres (movie_id, genre_id)
SELECT 
    (SELECT id FROM movie WHERE title='The Dark Knight') AS movie_id,
    (SELECT id FROM genre WHERE name='Action') AS genre_id;

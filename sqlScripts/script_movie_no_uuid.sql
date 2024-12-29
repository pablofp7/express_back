-- This script initializes the database for FreeSQL, an online SQL database.
-- It is designed for an older version that does not support UUID.


USE sql7746345;

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


CREATE TABLE movie_genres (
    movie_id CHAR(36),
    genre_id INT,
    PRIMARY KEY (movie_id, genre_id),
    FOREIGN KEY (movie_id) REFERENCES movie(id),
    FOREIGN KEY (genre_id) REFERENCES genre(id)
);


INSERT INTO genre (name) VALUES 
('Drama'),
('Action'),
('Crime'),
('Adventure'),
('Sci-Fi'),
('Romance');


INSERT INTO movie (id, title, year, director, duration, poster, rate) VALUES
("550e8400-e29b-41d4-a716-446655440000", "Inception", 2010, "Christopher Nolan", 148, "https://m.media-amazon.com/images/I/91Rc8cAmnAL._AC_UF1000,1000_QL80_.jpg", 8.8),
("ab0e8400-e29b-41d4-a716-446655440001", "The Shawshank Redemption", 1994, "Fran Darabont", 142, "https://i.ebayimg.com/images/g/4goAAOSwMyBe7hnQ/s-l1200.webp", 3.5),
("yuse8400-e29b-41d4-a716-446655440002", "The Dark Knight", 2008, "Christopher Nolan", 152, "https://i.ebayimg.com/images/g/yokAAOSw8w1YARbm/s-l1200.jpg", 8.2);


INSERT INTO movie_genres (movie_id, genre_id)
VALUES 
    ((SELECT id FROM movie WHERE title='Inception'), (SELECT id FROM genre WHERE name='Sci-Fi')),
    ((SELECT id FROM movie WHERE title='Inception'), (SELECT id FROM genre WHERE name='Action')),
    ((SELECT id FROM movie WHERE title='The Shawshank Redemption'), (SELECT id FROM genre WHERE name='Drama')),
    ((SELECT id FROM movie WHERE title='The Dark Knight'), (SELECT id FROM genre WHERE name='Action'));

CREATE TABLE tokens (
    id CHAR(36) PRIMARY KEY, -- UUID generado en el servidor
    user_id CHAR(36) NOT NULL, -- Relación con la tabla de usuarios
    token VARCHAR(512) NOT NULL UNIQUE, -- El token JWT (cambiado de TEXT a VARCHAR)
    type ENUM('access', 'refresh') NOT NULL, -- Tipo de token
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Fecha de emisión
    expires_at DATETIME NOT NULL, -- Fecha de expiración
    revoked DATETIME DEFAULT NULL, -- Fecha y hora de revocación (NULL si no está revocado)
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

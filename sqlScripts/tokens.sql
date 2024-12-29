-- This script initializes the tokens table.
-- It is designed to work across multiple SQL versions without requiring UUID.

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

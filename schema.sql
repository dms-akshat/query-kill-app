CREATE DATABASE IF NOT EXISTS query_killer_db;

USE query_killer_db;

CREATE TABLE IF NOT EXISTS killed_queries_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    pid INT,
    query_text TEXT,
    host VARCHAR(255),
    user VARCHAR(255),
    database_name VARCHAR(255),
    killed_by_user VARCHAR(255),
    killed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

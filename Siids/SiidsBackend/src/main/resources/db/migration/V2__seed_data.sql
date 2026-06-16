-- V2__seed_data.sql: Seed initial data

CREATE TABLE IF NOT EXISTS employee (
    employee_id VARCHAR(50) PRIMARY KEY,
    given_name VARCHAR(100),
    family_name VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(50)
);

INSERT INTO employee (employee_id, given_name, family_name, email, role) VALUES ('00763', 'Admin', 'User', 'admin@example.com', 'Admin');

-- Add other seed data as needed

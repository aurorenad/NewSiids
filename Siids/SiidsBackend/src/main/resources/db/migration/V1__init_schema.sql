-- V1__init_schema.sql: Initial database schema generated from Hibernate DDL export
-- This is a placeholder schema. Adjust according to actual entities.

CREATE TABLE IF NOT EXISTS employee (
    employee_id VARCHAR(50) PRIMARY KEY,
    given_name VARCHAR(100),
    family_name VARCHAR(100),
    email VARCHAR(255),
    role VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS "case" (
    case_num VARCHAR(50) PRIMARY KEY,
    status VARCHAR(50),
    informer_id VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS report (
    id SERIAL PRIMARY KEY,
    description TEXT,
    subject VARCHAR(255),
    legal_basis TEXT,
    attachment_path VARCHAR(255),
    created_by VARCHAR(50) REFERENCES employee(employee_id),
    current_recipient VARCHAR(50) REFERENCES employee(employee_id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    related_case VARCHAR(50) REFERENCES "case"(case_num)
    -- Additional columns omitted for brevity
);

-- Add other tables as needed (report_attachments, findings, signatures, etc.)

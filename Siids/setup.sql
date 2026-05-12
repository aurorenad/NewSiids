-- SIIDs Bootstrap Script (Improved Compatibility)
-- ==========================================
-- This script creates the initial Admin account required to log in for the first time.
-- Run this ONCE in your database management tool (pgAdmin, DBeaver, etc.) 
-- after the Spring Boot application has created the tables.

-- 1. Create the Employee record (Only if it doesn't exist)
INSERT INTO employees (employee_id, given_name, family_name, work_email, phone_number, profile_flag) 
SELECT '00763', 'System', 'Administrator', 'admin@siids.com', '0000000000', true
WHERE NOT EXISTS (
    SELECT 1 FROM employees WHERE employee_id = '00763'
);

-- 2. Create the User record (Only if it doesn't exist)
-- Username: 00763
-- Password: (The team's standard default password)
INSERT INTO users (username, password, role, is_active) 
SELECT '00763', '$2a$12$TSvyJmg63ogQEP3HAi0Hduo5SuYklBFsTSmYXe0Au.4a5zd4UcPQu', 'Admin', true
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE username = '00763'
);

-- ==========================================
-- Setup Complete.
-- ==========================================

-- 💡 FOR DEVELOPERS:
-- 1. To generate a NEW hash for a different password, use: https://bcrypt-generator.com/
--    (Make sure to set the 'Rounds/Cost' to 12)
--
-- 2. If the user '00763' already exists and you want to CHANGE the password, 
--    use the UPDATE command below instead of the INSERT above:
--
-- UPDATE users 
-- SET password = 'YOUR_NEW_BCRYPT_HASH_HERE' 
-- WHERE username = '00763';
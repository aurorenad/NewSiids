-- SQL Script to create default employee and user
-- Run this in your PostgreSQL database (siidsDB)

-- First, check if employee exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM employees WHERE employee_id = '26420') THEN
        -- Insert employee record (adjust department value as needed)
        INSERT INTO employees (
            employee_id, 
            given_name, 
            family_name, 
            work_email,
            profile_flag,
            curr_job_flag,
            rra_job_count,
            ext_job_count,
            is_punished,
            confirm_status,
            letter_confirm,
            job_descriptions_confirm,
            pmapp_confirm,
            appeal_letter_confirm
        ) VALUES (
            '26420',
            'Aurore',
            'Default',
            'aurore@example.com',
            false,
            false,
            0,
            0,
            false,
            false,
            0,
            0,
            0,
            0
        );
        RAISE NOTICE 'Employee 26420 created successfully';
    ELSE
        RAISE NOTICE 'Employee 26420 already exists';
    END IF;
END $$;

-- The user will be created automatically by the DataInitializer when the backend starts

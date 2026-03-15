import re
import sys

# Define the PostgreSQL schema for employees table
CREATE_Table_SQL = """
-- Employees Table Schema
DROP TABLE IF EXISTS employees CASCADE;
CREATE TABLE employees (
    employee_id VARCHAR(50) PRIMARY KEY,
    given_name VARCHAR(100),
    family_name VARCHAR(100),
    department INTEGER,
    gender VARCHAR(20),
    dob DATE,
    national_id VARCHAR(50),
    phone_number VARCHAR(50),
    work_email VARCHAR(100),
    personal_email VARCHAR(100),
    join_date DATE,
    profile_flag SMALLINT DEFAULT 0,
    curr_job_flag SMALLINT DEFAULT 0,
    curr_job_id INTEGER,
    rra_job_count INTEGER,
    ext_job_count INTEGER,
    is_punished SMALLINT DEFAULT 0,
    confirm_status SMALLINT DEFAULT 0,
    letter_confirm INTEGER,
    letter_conf_date TIMESTAMP,
    job_descriptions_confirm INTEGER,
    jds_conf_date TIMESTAMP,
    pmapp_confirm INTEGER,
    pmapp_conf_date TIMESTAMP,
    appeal_letter_confirm INTEGER,
    app_letter_conf_date TIMESTAMP
);
"""

# SQL to convert SMALLINT columns back to BOOLEAN after import
CONVERT_BOOLEANS_SQL = """
-- Convert integer flags to boolean
ALTER TABLE employees ALTER COLUMN profile_flag DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN profile_flag TYPE BOOLEAN USING profile_flag::int::boolean;
ALTER TABLE employees ALTER COLUMN profile_flag SET DEFAULT FALSE;

ALTER TABLE employees ALTER COLUMN curr_job_flag DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN curr_job_flag TYPE BOOLEAN USING curr_job_flag::int::boolean;
ALTER TABLE employees ALTER COLUMN curr_job_flag SET DEFAULT FALSE;

ALTER TABLE employees ALTER COLUMN is_punished DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN is_punished TYPE BOOLEAN USING is_punished::int::boolean;
ALTER TABLE employees ALTER COLUMN is_punished SET DEFAULT FALSE;

ALTER TABLE employees ALTER COLUMN confirm_status DROP DEFAULT;
ALTER TABLE employees ALTER COLUMN confirm_status TYPE BOOLEAN USING confirm_status::int::boolean;
ALTER TABLE employees ALTER COLUMN confirm_status SET DEFAULT FALSE;
"""

def convert_mysql_dump(input_file, output_file):
    print(f"Reading from {input_file}...")
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print(f"Error: File '{input_file}' not found.")
        print("Please save your SQL dump to this file first.")
        return

    # 1. Remove backticks
    content = content.replace("`", "")

    # 2. Handle invalid dates 0000-00-00 -> NULL
    # MySQL dumps often use '0000-00-00'
    content = content.replace("'0000-00-00'", "NULL")
    content = content.replace("'0000-00-00 00:00:00'", "NULL")

    # 3. Handle escaped quotes (MySQL uses \' or \", PostgreSQL uses '')
    # We need to be careful not to replace valid backslashes if they are not escaping quotes, 
    # but typically in dumps \' is the main issue.
    # Replace \' with ''
    content = content.replace(r"\'", "''")
    # Replace \" with " (PostgreSQL doesn't escape double quotes with backslash in standard strings)
    content = content.replace(r'\"', '"')

    # 3. Clean up engine/charset specific to MySQL (typo in original numbering, fixed here)
    content = re.sub(r'ENGINE=\w+\s+DEFAULT\s+CHARSET=\w+', '', content)
    content = re.sub(r'DEFAULT\s+CHARSET=\w+', '', content)
    
    # 4. Remove comments that are MySQL specific if any (like /*!40101 ... */)
    content = re.sub(r'/\*!.*?\*/;', '', content, flags=re.DOTALL)

    # 5. Clean up garbage at the end of the file
    # Find the last valid SQL statement ending (assumed to be );)
    last_semicolon = content.rfind(');')
    if last_semicolon != -1:
        # Check if there's significant content after it (more than just whitespace/newlines)
        trailing_content = content[last_semicolon+2:].strip()
        if trailing_content:
            print(f"Warning: Removed {len(trailing_content)} characters of garbage data at the end of the file.")
            # Keep only up to the semicolon
            content = content[:last_semicolon+2]


    print(f"Converting and writing to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- Generated import script for employees\n")
        f.write(CREATE_Table_SQL)
        f.write("\n\n-- Data Import\n")
        # Ensure we are writing valid INSERT statements
        f.write(content)
        f.write("\n\n-- Data Type Conversion\n")
        f.write(CONVERT_BOOLEANS_SQL)
        f.write("\n\n-- Verification\n")
        f.write("SELECT count(*) as total_employees FROM employees;\n")

    print("Done! You can now run the import script.")

if __name__ == "__main__":
    # Default filenames
    input_filename = "employees_mysql_dump.sql"
    output_filename = "import_employees.sql"
    
    if len(sys.argv) > 1:
        input_filename = sys.argv[1]
    
    convert_mysql_dump(input_filename, output_filename)

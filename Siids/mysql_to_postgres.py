"""
MySQL to PostgreSQL SQL Converter
Converts the SQL data you provided to PostgreSQL-compatible format
"""

import re

print("=" * 70)
print("MySQL to PostgreSQL Converter for SIIDS Data")
print("=" * 70)

# Instructions for the user
instructions = """
INSTRUCTIONS:
1. Copy your complete SQL data (the one you pasted in the chat)
2. Save it as 'mysql_data.sql' in this directory
3. Run this script: python mysql_to_postgres.py
4. It will create 'import_siids_data.sql' ready for PostgreSQL
5. Import using: psql -U postgres -d siidsDB -f import_siids_data.sql

Alternatively, I can create the file directly from your data.
"""

print(instructions)

def convert_mysql_to_postgres(mysql_sql):
    """Convert MySQL SQL syntax to PostgreSQL"""
    
    # Remove backticks (PostgreSQL doesn't use them)
    postgres_sql = mysql_sql.replace('`', '')
    
    # Replace MySQL-specific syntax
    postgres_sql = postgres_sql.replace('ENGINE=InnoDB DEFAULT CHARSET=utf8mb4', '')
    postgres_sql = postgres_sql.replace('DEFAULT CHARSET=utf8mb4', '')
    postgres_sql = postgres_sql.replace('ENGINE=InnoDB', '')
    
    # Replace current_timestamp() with CURRENT_TIMESTAMP
    postgres_sql = postgres_sql.replace('current_timestamp()', 'CURRENT_TIMESTAMP')
    
    # Replace MySQL data types with PostgreSQL equivalents
    postgres_sql = re.sub(r'int\(\d+\)', 'INTEGER', postgres_sql)
    postgres_sql = re.sub(r'tinyint\(\d+\)', 'SMALLINT', postgres_sql)
    postgres_sql = re.sub(r'datetime', 'TIMESTAMP', postgres_sql, flags=re.IGNORECASE)
    
    # Add PostgreSQL-specific optimizations
    header = """-- PostgreSQL Data Import Script for SIIDS
-- Generated automatically from MySQL data
-- Database: siidsDB

-- Disable triggers for faster import
SET session_replication_role = 'replica';

BEGIN;

"""
    
    footer = """
COMMIT;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify import
SELECT 'Structures count:' as info, COUNT(*) as count FROM structures
UNION ALL
SELECT 'Grades count:', COUNT(*) FROM grades
UNION ALL  
SELECT 'Job Masters count:', COUNT(*) FROM job_master;
"""
    
    return header + postgres_sql + footer

# Since you provided the data in the chat, I'll create a template
# You need to paste your SQL data here or in a separate file

template_sql = """
-- PASTE YOUR COMPLETE SQL DATA HERE
-- (The one you provided in the chat with all INSERT statements)
"""

print("\nTo use this converter:")
print("1. Edit this file and paste your SQL data in the template_sql variable")
print("2. Or save your SQL as 'mysql_data.sql' and uncomment the file reading code below")
print("\nConverting template...")

# Uncomment these lines if you save your SQL to a file:
# try:
#     with open('mysql_data.sql', 'r', encoding='utf-8') as f:
#         mysql_sql = f.read()
#     postgres_sql = convert_mysql_to_postgres(mysql_sql)
#     with open('import_siids_data.sql', 'w', encoding='utf-8') as f:
#         f.write(postgres_sql)
#     print("✓ Created import_siids_data.sql successfully!")
# except FileNotFoundError:
#     print("✗ mysql_data.sql not found. Please create it first.")

print("\n" + "=" * 70)

"""
Quick PostgreSQL Data Importer for SIIDS
This script prepares your SQL data for PostgreSQL import
"""

print("=" * 70)
print("SIIDS PostgreSQL Data Import - Quick Setup")
print("=" * 70)
print()

instructions = """
STEP-BY-STEP INSTRUCTIONS:
==========================

1. PREPARE YOUR SQL FILE:
   - Take the complete SQL data you provided in the chat
   - Copy it to a new file called 'siids_mysql_data.sql'
   - Save it in this directory: d:\\PROGRAMMING\\RRA\\siids\\Siids\\

2. RUN THIS CONVERSION:
   Run this command in PowerShell:
   
   (Get-Content siids_mysql_data.sql) -replace '`', '' -replace 'int\\(\\d+\\)', 'INTEGER' -replace 'tinyint\\(\\d+\\)', 'SMALLINT' -replace 'datetime', 'TIMESTAMP' -replace 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;', ';' | Set-Content import_siids_data.sql

3. IMPORT TO POSTGRESQL:
   psql -U postgres -d siidsDB -f import_siids_data.sql
   
   Password: 123

4. VERIFY:
   psql -U postgres -d siidsDB -c "SELECT COUNT(*) FROM structures;"
   psql -U postgres -d siidsDB -c "SELECT COUNT(*) FROM grades;"
   psql -U postgres -d siidsDB -c "SELECT COUNT(*) FROM job_master;"

EXPECTED RESULTS:
- structures: 255 records
- grades: 16 records  
- job_master: 500+ records

ALTERNATIVE - USE pgAdmin:
1. Open pgAdmin
2. Connect to siidsDB
3. Open Query Tool
4. Paste your SQL (with backticks removed)
5. Execute

"""

print(instructions)
print("=" * 70)
print()
print("✓ Ready to import!")
print()

"""
Enhanced SQL to CSV Converter for RRA SIIDS Database
Converts SQL INSERT statements to CSV files for Spring Boot data initialization
"""

import re
import csv
import sys

def clean_value(value):
    """Clean and unescape SQL values"""
    value = value.strip()
    # Remove quotes
    if value.startswith("'") and value.endswith("'"):
        value = value[1:-1]
    # Unescape HTML entities
    value = value.replace('&amp;', '&')
    value = value.replace('&lt;', '<')
    value = value.replace('&gt;', '>')
    value = value.replace('&quot;', '"')
    value = value.replace("''", "'")  # SQL escaped quotes
    value = value.replace('\\r\\n', '\n')  # Newlines
    value = value.replace('\\n', '\n')
    value = value.replace('\\t', '\t')
    return value

def parse_insert_values(insert_statement):
    """Parse VALUES from an INSERT statement"""
    # Find the VALUES clause
    values_match = re.search(r'VALUES\s+(.*);?$', insert_statement, re.DOTALL | re.IGNORECASE)
    if not values_match:
        return []
    
    values_text = values_match.group(1).strip().rstrip(';')
    
    rows = []
    current_row = []
    current_value = ''
    in_quotes = False
    paren_depth = 0
    
    i = 0
    while i < len(values_text):
        char = values_text[i]
        
        if char == '(' and not in_quotes:
            paren_depth += 1
            if paren_depth == 1:
                # Start of a new row
                current_row = []
                current_value = ''
                i += 1
                continue
        elif char == ')' and not in_quotes:
            paren_depth -= 1
            if paren_depth == 0:
                # End of row
                if current_value.strip() or len(current_row) > 0:
                    current_row.append(clean_value(current_value))
                rows.append(current_row)
                current_row = []
                current_value = ''
                i += 1
                # Skip comma and whitespace after closing paren
                while i < len(values_text) and values_text[i] in ', \n\r\t':
                    i += 1
                continue
        elif char == "'" and (i == 0 or values_text[i-1] != '\\'):
            in_quotes = not in_quotes
        elif char == ',' and not in_quotes and paren_depth == 1:
            # Field separator
            current_row.append(clean_value(current_value))
            current_value = ''
            i += 1
            # Skip whitespace
            while i < len(values_text) and values_text[i] in ' \n\r\t':
                i += 1
            continue
        
        if paren_depth > 0:
            current_value += char
        
        i += 1
    
    return rows

def extract_inserts_from_sql(sql_content, table_name):
    """Extract all INSERT statements for a specific table"""
    # Pattern to match INSERT statements
    pattern = rf"INSERT\s+INTO\s+`?{table_name}`?\s*\([^)]+\)\s+VALUES\s+.*?;"
    matches = re.findall(pattern, sql_content, re.DOTALL | re.IGNORECASE)
    
    all_rows = []
    for match in matches:
        rows = parse_insert_values(match)
        all_rows.extend(rows)
    
    return all_rows

def create_csv(filename, headers, rows):
    """Create CSV file"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"✓ Created {filename} with {len(rows)} rows")

# Read the SQL file
print("=" * 60)
print("RRA SIIDS Database - SQL to CSV Converter")
print("=" * 60)

try:
    with open('your_sql_data.sql', 'r', encoding='utf-8') as f:
        sql_content = f.read()
    print("✓ SQL file loaded successfully")
except FileNotFoundError:
    print("✗ Error: 'your_sql_data.sql' not found!")
    print("  Please save your SQL data to 'your_sql_data.sql' first.")
    sys.exit(1)

# Define table structures
structures_headers = ['structure_id', 'structure_name', 'structure_type', 'level', 'created_at', 'created_by', 'reference_id']
grades_headers = ['grade_id', 'category', 'grade_name', 'short_name', 'level', 'purpose_std', 'duties_std', 'num_staffs', 'grade_index', 'grade_iv', 'num_years']
job_master_headers = ['job_master_id', 'structure_id', 'grade_id', 'location_id', 'job_title', 'num_staffs', 'supervisor', 'working_mode', 'purpose', 'category_primary_id', 'category_exp_id', 'category_qualfc_id', 'num_years']

print("\nExtracting data from SQL...")
print("-" * 60)

# Extract and create CSV files
structures_data = extract_inserts_from_sql(sql_content, 'structures')
create_csv('structures.csv', structures_headers, structures_data)

grades_data = extract_inserts_from_sql(sql_content, 'grades')
create_csv('grades.csv', grades_headers, grades_data)

job_master_data = extract_inserts_from_sql(sql_content, 'job_master')
create_csv('job_master.csv', job_master_headers, job_master_data)

print("-" * 60)
print("✓ Conversion complete!")
print("\nNext steps:")
print("1. Move CSV files to: SiidsBackend\\src\\main\\resources\\data\\")
print("2. Run: .\\mvnw spring-boot:run")
print("3. Data will load automatically on startup!")
print("=" * 60)

"""
Improved SQL to CSV Converter for RRA SIIDS Database
Handles multi-row INSERT statements properly
"""

import re
import csv

def parse_multi_row_insert(sql_content, table_name):
    """Extract data from INSERT statements with multiple rows"""
    # Find the INSERT statement for this table
    pattern = rf"INSERT INTO `?{table_name}`?\s*\([^)]+\)\s+VALUES\s+(.*?);"
    match = re.search(pattern, sql_content, re.DOTALL | re.IGNORECASE)
    
    if not match:
        print(f"No INSERT statement found for table: {table_name}")
        return []
    
    values_text = match.group(1)
    rows = []
    
    # Split by "),(" to get individual rows, but handle quoted commas
    current_row = ""
    in_quotes = False
    paren_depth = 0
    
    for char in values_text:
        if char == "'" and (len(current_row) == 0 or current_row[-1] != '\\'):
            in_quotes = not in_quotes
        elif char == '(' and not in_quotes:
            paren_depth += 1
            if paren_depth == 1:
                current_row = ""
                continue
        elif char == ')' and not in_quotes:
            paren_depth -= 1
            if paren_depth == 0:
                # Process the row
                row_values = parse_row_values(current_row)
                if row_values:
                    rows.append(row_values)
                current_row = ""
                continue
        
        if paren_depth > 0:
            current_row += char
    
    return rows

def parse_row_values(row_text):
    """Parse individual values from a row"""
    values = []
    current_value = ""
    in_quotes = False
    
    for i, char in enumerate(row_text):
        if char == "'" and (i == 0 or row_text[i-1] != '\\'):
            in_quotes = not in_quotes
            continue
        elif char == ',' and not in_quotes:
            # End of value
            value = current_value.strip()
            # Clean up the value
            value = value.replace('&amp;', '&')
            value = value.replace('&lt;', '<')
            value = value.replace('&gt;', '>')
            value = value.replace("''", "'")
            values.append(value)
            current_value = ""
        else:
            current_value += char
    
    # Add the last value
    if current_value.strip():
        value = current_value.strip()
        value = value.replace('&amp;', '&')
        value = value.replace('&lt;', '<')
        value = value.replace('&gt;', '>')
        value = value.replace("''", "'")
        values.append(value)
    
    return values

def create_csv_file(filename, headers, rows):
    """Create CSV file from data"""
    with open(filename, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(headers)
        for row in rows:
            writer.writerow(row)
    print(f"✓ Created {filename} with {len(rows)} rows")

# Main execution
print("=" * 70)
print("RRA SIIDS Database - Improved SQL to CSV Converter")
print("=" * 70)

# Read SQL file
try:
    with open('your_sql_data.sql', 'r', encoding='utf-8') as f:
        sql_content = f.read()
    print("✓ SQL file loaded successfully\n")
except FileNotFoundError:
    print("✗ Error: 'your_sql_data.sql' not found!")
    exit(1)

# Define headers
structures_headers = ['structure_id', 'structure_name', 'structure_type', 'level', 'created_at', 'created_by', 'reference_id']
grades_headers = ['grade_id', 'category', 'grade_name', 'short_name', 'level', 'purpose_std', 'duties_std', 'num_staffs', 'grade_index', 'grade_iv', 'num_years']
job_master_headers = ['job_master_id', 'structure_id', 'grade_id', 'location_id', 'job_title', 'num_staffs', 'supervisor', 'working_mode', 'purpose', 'category_primary_id', 'category_exp_id', 'category_qualfc_id', 'num_years']

print("Extracting data...")
print("-" * 70)

# Extract structures
structures_data = parse_multi_row_insert(sql_content, 'structures')
create_csv_file('structures.csv', structures_headers, structures_data)

# Extract grades
grades_data = parse_multi_row_insert(sql_content, 'grades')
create_csv_file('grades.csv', grades_headers, grades_data)

# Extract job_master
job_master_data = parse_multi_row_insert(sql_content, 'job_master')
create_csv_file('job_master.csv', job_master_headers, job_master_data)

print("-" * 70)
print("✓ Conversion complete!")
print("\nNext steps:")
print("1. Move CSV files to: SiidsBackend\\src\\main\\resources\\data\\")
print("2. Run: .\\mvnw spring-boot:run")
print("3. Data will load automatically!")
print("=" * 70)

# PowerShell Script to Convert MySQL SQL to PostgreSQL Format
# This script reads your_sql_data.sql and creates import_siids_data.sql

Write-Host "=" * 70
Write-Host "MySQL to PostgreSQL Converter for SIIDS"
Write-Host "=" * 70
Write-Host ""

$inputFile = "your_sql_data.sql"
$outputFile = "import_siids_data.sql"

if (!(Test-Path $inputFile)) {
    Write-Host "ERROR: $inputFile not found!" -ForegroundColor Red
    Write-Host "Please make sure your_sql_data.sql exists in this directory."
    exit 1
}

Write-Host "Reading MySQL SQL file..." -ForegroundColor Yellow
$content = Get-Content $inputFile -Raw

Write-Host "Converting to PostgreSQL format..." -ForegroundColor Yellow

# Remove backticks
$content = $content -replace '`', ''

# Replace MySQL data types with PostgreSQL equivalents
$content = $content -replace 'int\(\d+\)', 'INTEGER'
$content = $content -replace 'tinyint\(\d+\)', 'SMALLINT'
$content = $content -replace 'datetime', 'TIMESTAMP'

# Replace current_timestamp() with CURRENT_TIMESTAMP
$content = $content -replace 'current_timestamp\(\)', 'CURRENT_TIMESTAMP'

# Remove MySQL-specific syntax
$content = $content -replace 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;', ';'
$content = $content -replace 'ENGINE=InnoDB;', ';'
$content = $content -replace 'DEFAULT CHARSET=utf8mb4', ''

# Add PostgreSQL header
$header = @"
-- PostgreSQL Data Import Script for SIIDS
-- Converted from MySQL format
-- Database: siidsDB
-- Tables: structures, grades, job_master

-- Disable triggers for faster import
SET session_replication_role = 'replica';

BEGIN;

"@

# Add PostgreSQL footer
$footer = @"

COMMIT;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Verify import
SELECT 'Structures:' as table_name, COUNT(*) as count FROM structures
UNION ALL
SELECT 'Grades:', COUNT(*) FROM grades
UNION ALL  
SELECT 'Job Masters:', COUNT(*) FROM job_master;
"@

# Combine and save
$finalContent = $header + $content + $footer

Write-Host "Saving PostgreSQL SQL file..." -ForegroundColor Yellow
$finalContent | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host ""
Write-Host "SUCCESS!" -ForegroundColor Green
Write-Host "Created: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "To import into PostgreSQL, run:" -ForegroundColor Cyan
Write-Host "  psql -U postgres -d siidsDB -f $outputFile" -ForegroundColor White
Write-Host "  Password: 123" -ForegroundColor White
Write-Host ""
Write-Host "=" * 70

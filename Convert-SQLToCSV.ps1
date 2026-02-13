# RRA SIIDS - SQL to CSV Converter (PowerShell)
# This script converts SQL INSERT statements to CSV files

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "RRA SIIDS Database - SQL to CSV Converter" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if SQL file exists
if (-not (Test-Path "your_sql_data.sql")) {
    Write-Host "Error: 'your_sql_data.sql' not found!" -ForegroundColor Red
    Write-Host "Please save your SQL data to 'your_sql_data.sql' first." -ForegroundColor Yellow
    exit 1
}

Write-Host "Reading SQL file..." -ForegroundColor Yellow
$sqlContent = Get-Content "your_sql_data.sql" -Raw

function Parse-SQLInserts {
    param(
        [string]$Content,
        [string]$TableName
    )
    
    # Extract INSERT statements for the table
    $pattern = "INSERT INTO ``?$TableName``?.*?VALUES\s+(.*?);"
    $matches = [regex]::Matches($Content, $pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline)
    
    $allRows = @()
    
    foreach ($match in $matches) {
        $valuesText = $match.Groups[1].Value
        
        # Split by "),(" to get individual rows
        $rows = $valuesText -split '\),\s*\('
        
        foreach ($row in $rows) {
            # Clean up the row
            $row = $row.Trim('(', ')', ' ', ';')
            
            # Parse values - simple approach for now
            $values = @()
            $currentValue = ""
            $inQuotes = $false
            
            for ($i = 0; $i -lt $row.Length; $i++) {
                $char = $row[$i]
                
                if ($char -eq "'" -and ($i -eq 0 -or $row[$i-1] -ne '\')) {
                    $inQuotes = -not $inQuotes
                }
                elseif ($char -eq ',' -and -not $inQuotes) {
                    $values += $currentValue.Trim().Trim("'") -replace '&amp;', '&'
                    $currentValue = ""
                }
                else {
                    $currentValue += $char
                }
            }
            
            # Add the last value
            if ($currentValue) {
                $values += $currentValue.Trim().Trim("'") -replace '&amp;', '&'
            }
            
            $allRows += ,@($values)
        }
    }
    
    return $allRows
}

function Create-CSV {
    param(
        [string]$Filename,
        [string[]]$Headers,
        [array]$Rows
    )
    
    # Create CSV content
    $csv = $Headers -join ','
    $csv += "`n"
    
    foreach ($row in $Rows) {
        $csvRow = $row | ForEach-Object {
            $value = $_
            # Escape quotes and wrap in quotes if contains comma
            if ($value -match '[,"]') {
                $value = $value -replace '"', '""'
                "`"$value`""
            } else {
                $value
            }
        }
        $csv += ($csvRow -join ',') + "`n"
    }
    
    $csv | Out-File -FilePath $Filename -Encoding UTF8 -NoNewline
    Write-Host "Created $Filename with $($Rows.Count) rows" -ForegroundColor Green
}

Write-Host "Extracting data from SQL..." -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

# Extract structures
$structuresHeaders = @('structure_id', 'structure_name', 'structure_type', 'level', 'created_at', 'created_by', 'reference_id')
$structuresData = Parse-SQLInserts -Content $sqlContent -TableName 'structures'
Create-CSV -Filename 'structures.csv' -Headers $structuresHeaders -Rows $structuresData

# Extract grades
$gradesHeaders = @('grade_id', 'category', 'grade_name', 'short_name', 'level', 'purpose_std', 'duties_std', 'num_staffs', 'grade_index', 'grade_iv', 'num_years')
$gradesData = Parse-SQLInserts -Content $sqlContent -TableName 'grades'
Create-CSV -Filename 'grades.csv' -Headers $gradesHeaders -Rows $gradesData

# Extract job_master
$jobMasterHeaders = @('job_master_id', 'structure_id', 'grade_id', 'location_id', 'job_title', 'num_staffs', 'supervisor', 'working_mode', 'purpose', 'category_primary_id', 'category_exp_id', 'category_qualfc_id', 'num_years')
$jobMasterData = Parse-SQLInserts -Content $sqlContent -TableName 'job_master'
Create-CSV -Filename 'job_master.csv' -Headers $jobMasterHeaders -Rows $jobMasterData

Write-Host "------------------------------------------------------------" -ForegroundColor Gray
Write-Host "Conversion complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Move CSV files to: SiidsBackend\src\main\resources\data\" -ForegroundColor White
Write-Host "2. Run: .\mvnw spring-boot:run" -ForegroundColor White
Write-Host "3. Data will load automatically on startup!" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan

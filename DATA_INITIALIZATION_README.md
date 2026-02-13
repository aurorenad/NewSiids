# Data Initialization Setup

## ✅ What's Been Created

1. **GradeRepository.java** - Repository for Grade entity
2. **JobMasterRepository.java** - Repository for JobMaster entity  
3. **DataInitializer.java** - Handles user creation on startup
4. **OrganizationalDataLoader.java** - Loads organizational data (structures, grades, job_master)

## 📋 How to Add Your Data

### Recommended Approach: Java-Based Loading

The easiest and most reliable way is to add your data directly in `OrganizationalDataLoader.java`:

1. Open `SiidsBackend/src/main/java/org/example/siidsbackend/Config/OrganizationalDataLoader.java`

2. Add your structures using the `createStructure()` method:
```java
createStructure(18, "Customs Operations", "Division", (short)5, "2021-06-08 11:24:19", "1", 5);
```

3. Add your grades using the `createGrade()` method:
```java
createGrade(4, "Manager", "Assistant Commissioner, Head of Division", "M3", "2.VII",
    "Strategic planning and execution.",
    "1. Initiate and develop strategic plans...",
    15, 2767, 840, 8);
```

4. Add your job masters using the `createJobMaster()` method:
```java
createJobMaster(9, 6, 3, 1, "Commissioner for Domestic Taxes", (short)1,
    "Commissioner General", "Office", "Ok",
    null, null, null, null);
```

### Alternative: CSV-Based Loading

If you prefer CSV files:

1. Create CSV files in `SiidsBackend/src/main/resources/data/`:
   - `structures.csv`
   - `grades.csv`
   - `job_master.csv`

2. Use the provided PowerShell script:
```powershell
.\Convert-SQLToCSV.ps1
```

## 🎯 What Happens on Startup

The application runs two initialization components in order:

1. **DataInitializer** (Order 1):
   - ✓ Creates default user if not exists

2. **OrganizationalDataLoader** (Order 2):
   - ✓ Loads structures if table is empty
   - ✓ Loads grades if table is empty  
   - ✓ Loads job masters if table is empty

## 📊 Expected Console Output

```
========================================
Starting Data Initialization...
========================================
✓ User 00763 already exists
========================================
User Initialization Completed!
========================================
========================================
Loading Organizational Data...
========================================
→ Loading structures...
✓ Loaded 255 structures
→ Loading grades...
✓ Loaded 16 grades
→ Loading job masters...
✓ Loaded 500+ job masters
========================================
Organizational Data Loaded Successfully!
========================================
```

## 🔧 Benefits of Java-Based Approach

- ✅ No CSV parsing errors
- ✅ Type-safe data entry
- ✅ Easy to debug
- ✅ IDE auto-completion
- ✅ Compile-time validation
- ✅ No external dependencies

## 📝 Adding All Your Data

To add all 255 structures, 16 grades, and 500+ job masters:

1. Copy the SQL INSERT values from your database
2. Convert each row to a `createStructure()`, `createGrade()`, or `createJobMaster()` call
3. Paste into the respective methods in `OrganizationalDataLoader.java`

**Example Pattern:**
```sql
-- SQL
INSERT INTO structures VALUES (18, 'Customs Operations', 'Division', 5, '2021-06-08 11:24:19', '1', 5);

// Java
createStructure(18, "Customs Operations", "Division", (short)5, "2021-06-08 11:24:19", "1", 5);
```

## ⚠️ Important Notes

- Data loads ONLY ONCE on first startup
- If tables have data, loading is skipped
- To reload, manually clear the tables first
- Foreign key relationships are preserved (grades load before job_master)

---

**Created by:** Antigravity AI Assistant  
**Date:** 2026-02-10

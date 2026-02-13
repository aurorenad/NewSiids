package org.example.siidsbackend.Config;

import org.example.siidsbackend.Model.Grade;
import org.example.siidsbackend.Model.JobMaster;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Model.structures;
import org.example.siidsbackend.Repository.GradeRepository;
import org.example.siidsbackend.Repository.JobMasterRepository;
import org.example.siidsbackend.Repository.StructureRepository;
import org.example.siidsbackend.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepo userRepo;

    @Autowired
    private StructureRepository structureRepository;

    @Autowired
    private GradeRepository gradeRepository;

    @Autowired
    private JobMasterRepository jobMasterRepository;

    private BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    @Override
    public void run(String... args) {
        System.out.println("========================================");
        System.out.println("Starting Data Initialization...");
        System.out.println("========================================");

        // Initialize default user
        initializeDefaultUser();

        // Initialize organizational data
        initializeStructures();
        initializeGrades();
        initializeJobMasters();

        System.out.println("========================================");
        System.out.println("Data Initialization Completed!");
        System.out.println("========================================");
    }

    private void initializeDefaultUser() {
        String employeeId = "00763";

        if (userRepo.findByUsername(employeeId) == null) {
            User user = new User();
            user.setUsername(employeeId);
            user.setPassword(encoder.encode("Aurore!@123"));
            user.setRole("User");
            userRepo.save(user);
            System.out.println("✓ User created for existing employee: " + employeeId + " with role: User");
        } else {
            System.out.println("✓ User " + employeeId + " already exists");
        }
    }

    private void initializeStructures() {
        long count = structureRepository.count();
        if (count > 0) {
            System.out.println("✓ Structures table already contains " + count + " records. Skipping initialization.");
            return;
        }

        System.out.println("→ Loading structures data...");
        try {
            ClassPathResource resource = new ClassPathResource("data/structures.csv");
            BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream()));

            String line;
            int loaded = 0;
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

            // Skip header
            reader.readLine();

            while ((line = reader.readLine()) != null) {
                String[] fields = line.split(",");
                if (fields.length >= 7) {
                    structures structure = new structures();
                    structure.setStructureId(Integer.parseInt(fields[0].trim()));
                    structure.setStructureName(fields[1].trim());
                    structure.setStructureType(fields[2].trim());
                    structure.setLevel(Short.parseShort(fields[3].trim()));
                    structure.setCreatedAt(LocalDateTime.parse(fields[4].trim(), formatter));
                    structure.setCreatedBy(fields[5].trim());
                    structure.setReferenceId(Integer.parseInt(fields[6].trim()));

                    structureRepository.save(structure);
                    loaded++;
                }
            }
            reader.close();
            System.out.println("✓ Loaded " + loaded + " structures successfully!");
        } catch (Exception e) {
            System.err.println("✗ Error loading structures: " + e.getMessage());
            System.err.println("  Note: Place structures.csv in src/main/resources/data/");
        }
    }

    private void initializeGrades() {
        long count = gradeRepository.count();
        if (count > 0) {
            System.out.println("✓ Grades table already contains " + count + " records. Skipping initialization.");
            return;
        }

        System.out.println("→ Loading grades data...");
        try {
            ClassPathResource resource = new ClassPathResource("data/grades.csv");
            BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream()));

            String line;
            int loaded = 0;

            // Skip header
            reader.readLine();

            while ((line = reader.readLine()) != null) {
                String[] fields = parseCsvLine(line);
                if (fields.length >= 11) {
                    Grade grade = new Grade();
                    grade.setGradeId(Integer.parseInt(fields[0].trim()));
                    grade.setCategory(fields[1].trim());
                    grade.setGradeName(fields[2].trim());
                    grade.setShortName(fields[3].trim());
                    grade.setLevel(fields[4].trim());
                    grade.setPurposeStd(fields[5].trim());
                    grade.setDutiesStd(fields[6].trim());
                    grade.setNumStaffs(Integer.parseInt(fields[7].trim()));
                    grade.setGradeIndex(Integer.parseInt(fields[8].trim()));
                    grade.setGradeIv(Integer.parseInt(fields[9].trim()));
                    grade.setNumYears(Integer.parseInt(fields[10].trim()));

                    gradeRepository.save(grade);
                    loaded++;
                }
            }
            reader.close();
            System.out.println("✓ Loaded " + loaded + " grades successfully!");
        } catch (Exception e) {
            System.err.println("✗ Error loading grades: " + e.getMessage());
            System.err.println("  Note: Place grades.csv in src/main/resources/data/");
        }
    }

    private void initializeJobMasters() {
        long count = jobMasterRepository.count();
        if (count > 0) {
            System.out.println("✓ JobMaster table already contains " + count + " records. Skipping initialization.");
            return;
        }

        System.out.println("→ Loading job_master data...");
        try {
            ClassPathResource resource = new ClassPathResource("data/job_master.csv");
            BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream()));

            String line;
            int loaded = 0;

            // Skip header
            reader.readLine();

            while ((line = reader.readLine()) != null) {
                String[] fields = parseCsvLine(line);
                if (fields.length >= 13) {
                    JobMaster jobMaster = new JobMaster();
                    jobMaster.setJobMasterId(Integer.parseInt(fields[0].trim()));
                    jobMaster.setStructureId(Integer.parseInt(fields[1].trim()));

                    // Load the Grade entity
                    int gradeId = Integer.parseInt(fields[2].trim());
                    Grade grade = gradeRepository.findById(gradeId).orElse(null);
                    jobMaster.setGradeId(grade);

                    jobMaster.setLocationId(fields[3].trim().isEmpty() ? null : Integer.parseInt(fields[3].trim()));
                    jobMaster.setJobTitle(fields[4].trim());
                    jobMaster.setNumStaffs(Short.parseShort(fields[5].trim()));
                    jobMaster.setSupervisor(fields[6].trim());
                    jobMaster.setWorkingMode(fields[7].trim());
                    jobMaster.setPurpose(fields[8].trim());
                    jobMaster.setCategoryPrimaryId(
                            fields[9].trim().isEmpty() ? null : Integer.parseInt(fields[9].trim()));
                    jobMaster
                            .setCategoryExpId(fields[10].trim().isEmpty() ? null : Integer.parseInt(fields[10].trim()));
                    jobMaster.setCategoryQualfcId(
                            fields[11].trim().isEmpty() ? null : Integer.parseInt(fields[11].trim()));
                    jobMaster.setNumYears(fields[12].trim().isEmpty() ? null : Integer.parseInt(fields[12].trim()));

                    jobMasterRepository.save(jobMaster);
                    loaded++;
                }
            }
            reader.close();
            System.out.println("✓ Loaded " + loaded + " job masters successfully!");
        } catch (Exception e) {
            System.err.println("✗ Error loading job_master: " + e.getMessage());
            System.err.println("  Note: Place job_master.csv in src/main/resources/data/");
        }
    }

    // Helper method to parse CSV lines with quoted fields
    private String[] parseCsvLine(String line) {
        return line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
    }
}

package org.example.siidsbackend.Config;

import org.example.siidsbackend.Model.Grade;
import org.example.siidsbackend.Model.JobMaster;
import org.example.siidsbackend.Model.structures;
import org.example.siidsbackend.Repository.GradeRepository;
import org.example.siidsbackend.Repository.JobMasterRepository;
import org.example.siidsbackend.Repository.StructureRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Order(2) // Run after DataInitializer
public class OrganizationalDataLoader implements CommandLineRunner {

    @Autowired
    private StructureRepository structureRepository;

    @Autowired
    private GradeRepository gradeRepository;

    @Autowired
    private JobMasterRepository jobMasterRepository;

    @Override
    public void run(String... args) {
        System.out.println("========================================");
        System.out.println("Loading Organizational Data...");
        System.out.println("========================================");

        loadStructures();
        loadGrades();
        loadJobMasters();

        System.out.println("========================================");
        System.out.println("Organizational Data Loaded Successfully!");
        System.out.println("========================================");
    }

    private void loadStructures() {
        if (structureRepository.count() > 0) {
            System.out.println("✓ Structures already loaded (" + structureRepository.count() + " records)");
            return;
        }

        System.out.println("→ Loading structures...");

        // Sample data - you can add all 255 structures here
        createStructure(1, "RRA", "Institution", (short) 1, "2021-06-06 03:14:18", "1", 0);
        createStructure(2, "Board of Directors", "Team", (short) 2, "2021-06-08 11:12:08", "1", 1);
        createStructure(3, "Commissioner General", "Office", (short) 3, "2021-06-08 11:12:56", "1", 2);
        createStructure(4, "Deputy Commissioner General", "Office", (short) 4, "2021-06-08 11:16:01", "1", 3);
        createStructure(5, "Customs Services", "Department", (short) 4, "2021-06-08 11:17:34", "1", 3);
        createStructure(6, "Domestic Taxes", "Department", (short) 4, "2021-06-08 11:17:53", "1", 3);
        createStructure(7, "Legal Services and Board Affairs", "Department", (short) 4, "2021-06-08 11:18:16", "1", 3);
        createStructure(8, "Internal Audit and Integrity", "Department", (short) 4, "2021-06-08 11:19:03", "1", 3);
        createStructure(10, "Strategic Intelligence and Investigation", "Division", (short) 4, "2021-06-08 11:19:38",
                "1", 3);
        createStructure(11, "Taxpayer Services and Communication", "Division", (short) 4, "2021-06-08 11:19:51", "1",
                3);
        createStructure(12, "Single Project Implementation Unit", "Office", (short) 4, "2021-06-08 11:20:31", "1", 3);
        createStructure(13, "IT and Digital Transformation", "Department", (short) 5, "2021-06-08 11:21:50", "1", 4);
        createStructure(14, "Strategy and Risk Analysis", "Department", (short) 5, "2021-06-08 11:22:09", "1", 4);
        createStructure(15, "Finance", "Department", (short) 5, "2021-06-08 11:22:24", "1", 4);
        createStructure(16, "Human Resource", "Division", (short) 5, "2021-06-08 11:22:46", "1", 4);
        createStructure(17, "Administration and Logistics", "Division", (short) 5, "2021-06-08 11:23:06", "1", 4);

        // Add more structures as needed...

        System.out.println("✓ Loaded " + structureRepository.count() + " structures");
    }

    private void loadGrades() {
        if (gradeRepository.count() > 0) {
            System.out.println("✓ Grades already loaded (" + gradeRepository.count() + " records)");
            return;
        }

        System.out.println("→ Loading grades...");

        createGrade(1, "Executive", "Commissioner General, Head of the institution", "E3", "D",
                "Overall institutional leadership responsibility.",
                "1.Provide executive guidance and monitoring of revenue collection compliance initiatives",
                1, 4201, 848, 0);

        createGrade(2, "Executive", "Deputy Commissioner General, Deputy Head of the Institution", "E2", "E",
                "Institutional leadership and responsibility.",
                "Deputises and assists the Commissioner General in all his/her responsibilities.",
                2, 3819, 848, 0);

        createGrade(3, "Executive", "Commissioner, Head of Department", "E1", "1.VII",
                "Overall leadership, strategy, and responsibility of a department.",
                "1.Identify and coordinate the development of strategic plans",
                7, 3471, 840, 10);

        // Add more grades as needed...

        System.out.println("✓ Loaded " + gradeRepository.count() + " grades");
    }

    private void loadJobMasters() {
        if (jobMasterRepository.count() > 0) {
            System.out.println("✓ Job Masters already loaded (" + jobMasterRepository.count() + " records)");
            return;
        }

        System.out.println("→ Loading job masters...");

        // Sample job masters - add more as needed
        createJobMaster(2, 7, 3, 1, "Commissioner for Legal Services and Board Affairs", (short) 1,
                "Commissioner General", "Hybrid",
                "The Commissioner for Legal Services is a member of the Executive Organ.",
                null, null, null, null);

        System.out.println("✓ Loaded " + jobMasterRepository.count() + " job masters");
    }

    private void createStructure(int id, String name, String type, short level, String createdAt, String createdBy,
            int refId) {
        structures structure = new structures();
        structure.setStructureId(id);
        structure.setStructureName(name);
        structure.setStructureType(type);
        structure.setLevel(level);
        structure.setCreatedAt(LocalDateTime.parse(createdAt.replace(" ", "T")));
        structure.setCreatedBy(createdBy);
        structure.setReferenceId(refId);
        structureRepository.save(structure);
    }

    private void createGrade(int id, String category, String name, String shortName, String level,
            String purpose, String duties, int numStaffs, int gradeIndex, int gradeIv, int numYears) {
        Grade grade = new Grade();
        grade.setGradeId(id);
        grade.setCategory(category);
        grade.setGradeName(name);
        grade.setShortName(shortName);
        grade.setLevel(level);
        grade.setPurposeStd(purpose);
        grade.setDutiesStd(duties);
        grade.setNumStaffs(numStaffs);
        grade.setGradeIndex(gradeIndex);
        grade.setGradeIv(gradeIv);
        grade.setNumYears(numYears);
        gradeRepository.save(grade);
    }

    private void createJobMaster(int id, int structureId, int gradeId, Integer locationId, String jobTitle,
            short numStaffs, String supervisor, String workingMode, String purpose,
            Integer categoryPrimaryId, Integer categoryExpId, Integer categoryQualfcId, Integer numYears) {
        JobMaster jobMaster = new JobMaster();
        jobMaster.setJobMasterId(id);
        jobMaster.setStructureId(structureId);

        Grade grade = gradeRepository.findById(gradeId).orElse(null);
        jobMaster.setGradeId(grade);

        jobMaster.setLocationId(locationId);
        jobMaster.setJobTitle(jobTitle);
        jobMaster.setNumStaffs(numStaffs);
        jobMaster.setSupervisor(supervisor);
        jobMaster.setWorkingMode(workingMode);
        jobMaster.setPurpose(purpose);
        jobMaster.setCategoryPrimaryId(categoryPrimaryId);
        jobMaster.setCategoryExpId(categoryExpId);
        jobMaster.setCategoryQualfcId(categoryQualfcId);
        jobMaster.setNumYears(numYears);
        jobMasterRepository.save(jobMaster);
    }
}

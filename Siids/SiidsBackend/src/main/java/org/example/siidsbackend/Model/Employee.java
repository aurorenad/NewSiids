package org.example.siidsbackend.Model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")
@Data
public class Employee {
    @Id
    @Column(name = "employee_id")
    private String employeeId;

    @Column(name = "given_name")
    private String givenName;

    @Column(name = "family_name")
    private String familyName;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "department", referencedColumnName = "department_id")
    private Department department;

    @Column(name = "gender")
    private String gender;

    @Column(name = "dob", nullable = true)
    private LocalDate dob;

    @Column(name = "national_id")
    private String nationalId;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "work_email")
    private String workEmail;

    @Column(name = "personal_email")
    private String personalEmail;

    @Column(name = "join_date", nullable = true)
    private LocalDate joinDate;

    @Column(name = "profile_flag")
    private boolean profileFlag;

    @Column(name = "curr_job_flag")
    private boolean currJobFlag;

    @JsonIgnore
    @Column(name = "curr_job_id", insertable = false, updatable = false)
    private int currJobId;

    @Column(name = "rra_job_count")
    private int rraJobCount;

    @Column(name = "ext_job_count")
    private int extJobCount;

    @Column(name = "is_punished")
    private boolean isPunished;

    @Column(name = "confirm_status")
    private boolean confirmStatus;

    @Column(name = "letter_confirm")
    private int letterConfirm;

    @Column(name = "letter_conf_date", nullable = true)
    private LocalDateTime letterConfDate;

    @Column(name = "job_descriptions_confirm")
    private int jobDescriptionsConfirm;

    @Column(name = "jds_conf_date", nullable = true)
    private LocalDateTime jdsConfDate;

    @Column(name = "pmapp_confirm")
    private int pmappConfirm;

    @Column(name = "pmapp_conf_date", nullable = true)
    private LocalDateTime pmappConfDate;

    @Column(name = "appeal_letter_confirm")
    private int appealLetterConfirm;

    @Column(name = "app_letter_conf_date", nullable = true)
    private LocalDateTime appLetterConfDate;

    @JsonIgnore
    @ManyToOne
    @JoinColumn(name = "curr_job_id", referencedColumnName = "job_master_id")
    private JobMaster currentJob;

    @OneToOne( mappedBy="employee" , cascade = CascadeType.ALL, orphanRemoval= false)
    private BankDetails bankDetails;

    @Transient
    private Placements placement;

    public Employee() {
    }

    public Employee(String employeeId, String givenName, String familyName, Department department, String gender, LocalDate dob, String nationalId, String phoneNumber, String workEmail, String personalEmail, LocalDate joinDate, boolean profileFlag, boolean currJobFlag, int currJobId, int rraJobCount, int extJobCount, boolean isPunished, boolean confirmStatus, int letterConfirm, LocalDateTime letterConfDate, int jobDescriptionsConfirm, LocalDateTime jdsConfDate, int pmappConfirm, LocalDateTime pmappConfDate, int appealLetterConfirm, LocalDateTime appLetterConfDate, JobMaster currentJob, BankDetails bankDetails, Placements placement) {
        this.employeeId = employeeId;
        this.givenName = givenName;
        this.familyName = familyName;
        this.department = department;
        this.gender = gender;
        this.dob = dob;
        this.nationalId = nationalId;
        this.phoneNumber = phoneNumber;
        this.workEmail = workEmail;
        this.personalEmail = personalEmail;
        this.joinDate = joinDate;
        this.profileFlag = profileFlag;
        this.currJobFlag = currJobFlag;
        this.currJobId = currJobId;
        this.rraJobCount = rraJobCount;
        this.extJobCount = extJobCount;
        this.isPunished = isPunished;
        this.confirmStatus = confirmStatus;
        this.letterConfirm = letterConfirm;
        this.letterConfDate = letterConfDate;
        this.jobDescriptionsConfirm = jobDescriptionsConfirm;
        this.jdsConfDate = jdsConfDate;
        this.pmappConfirm = pmappConfirm;
        this.pmappConfDate = pmappConfDate;
        this.appealLetterConfirm = appealLetterConfirm;
        this.appLetterConfDate = appLetterConfDate;
        this.currentJob = currentJob;
        this.bankDetails = bankDetails;
        this.placement = placement;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getGivenName() {
        return givenName;
    }

    public void setGivenName(String givenName) {
        this.givenName = givenName;
    }

    public String getFamilyName() {
        return familyName;
    }

    public void setFamilyName(String familyName) {
        this.familyName = familyName;
    }

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public String getNationalId() {
        return nationalId;
    }

    public void setNationalId(String nationalId) {
        this.nationalId = nationalId;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getWorkEmail() {
        return workEmail;
    }

    public void setWorkEmail(String workEmail) {
        this.workEmail = workEmail;
    }

    public String getPersonalEmail() {
        return personalEmail;
    }

    public void setPersonalEmail(String personalEmail) {
        this.personalEmail = personalEmail;
    }

    public LocalDate getJoinDate() {
        return joinDate;
    }

    public void setJoinDate(LocalDate joinDate) {
        this.joinDate = joinDate;
    }

    public boolean isProfileFlag() {
        return profileFlag;
    }

    public void setProfileFlag(boolean profileFlag) {
        this.profileFlag = profileFlag;
    }

    public boolean isCurrJobFlag() {
        return currJobFlag;
    }

    public void setCurrJobFlag(boolean currJobFlag) {
        this.currJobFlag = currJobFlag;
    }

    public int getCurrJobId() {
        return currJobId;
    }

    public void setCurrJobId(int currJobId) {
        this.currJobId = currJobId;
    }

    public int getRraJobCount() {
        return rraJobCount;
    }

    public void setRraJobCount(int rraJobCount) {
        this.rraJobCount = rraJobCount;
    }

    public int getExtJobCount() {
        return extJobCount;
    }

    public void setExtJobCount(int extJobCount) {
        this.extJobCount = extJobCount;
    }

    public boolean isPunished() {
        return isPunished;
    }

    public void setPunished(boolean punished) {
        isPunished = punished;
    }

    public boolean isConfirmStatus() {
        return confirmStatus;
    }

    public void setConfirmStatus(boolean confirmStatus) {
        this.confirmStatus = confirmStatus;
    }

    public int getLetterConfirm() {
        return letterConfirm;
    }

    public void setLetterConfirm(int letterConfirm) {
        this.letterConfirm = letterConfirm;
    }

    public LocalDateTime getLetterConfDate() {
        return letterConfDate;
    }

    public void setLetterConfDate(LocalDateTime letterConfDate) {
        this.letterConfDate = letterConfDate;
    }

    public int getJobDescriptionsConfirm() {
        return jobDescriptionsConfirm;
    }

    public void setJobDescriptionsConfirm(int jobDescriptionsConfirm) {
        this.jobDescriptionsConfirm = jobDescriptionsConfirm;
    }

    public LocalDateTime getJdsConfDate() {
        return jdsConfDate;
    }

    public void setJdsConfDate(LocalDateTime jdsConfDate) {
        this.jdsConfDate = jdsConfDate;
    }

    public int getPmappConfirm() {
        return pmappConfirm;
    }

    public void setPmappConfirm(int pmappConfirm) {
        this.pmappConfirm = pmappConfirm;
    }

    public LocalDateTime getPmappConfDate() {
        return pmappConfDate;
    }

    public void setPmappConfDate(LocalDateTime pmappConfDate) {
        this.pmappConfDate = pmappConfDate;
    }

    public int getAppealLetterConfirm() {
        return appealLetterConfirm;
    }

    public void setAppealLetterConfirm(int appealLetterConfirm) {
        this.appealLetterConfirm = appealLetterConfirm;
    }

    public LocalDateTime getAppLetterConfDate() {
        return appLetterConfDate;
    }

    public void setAppLetterConfDate(LocalDateTime appLetterConfDate) {
        this.appLetterConfDate = appLetterConfDate;
    }

    public JobMaster getCurrentJob() {
        return currentJob;
    }

    public void setCurrentJob(JobMaster currentJob) {
        this.currentJob = currentJob;
    }

    public BankDetails getBankDetails() {
        return bankDetails;
    }

    public void setBankDetails(BankDetails bankDetails) {
        this.bankDetails = bankDetails;
    }

    public Placements getPlacement() {
        return placement;
    }

    public void setPlacement(Placements placement) {
        this.placement = placement;
    }
}

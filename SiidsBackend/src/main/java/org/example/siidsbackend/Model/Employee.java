package org.example.siidsbackend.Model;


import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "employees")

public class Employee {

    @Id
    @Column(name = "employee_id", unique = true, nullable = false)
    private String employeeId;

    @Column(name = "given_name", columnDefinition = "VARCHAR(255)")
    private String givenName;

    @Column(name = "family_name", columnDefinition = "VARCHAR(255)")
    private String familyName;

    private String gender;

    private LocalDate dob;

    @Column(name = "minefotra_id")
    private String minefotraId;

    @Column(name = "phone_number")
    private String phoneNumber;

    @Column(name = "join_date")
    private LocalDate joinDate;

    @Column(name = "work_email")
    private String workEmail;

    @Column(name = "personal_email")
    private String personalEmail;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @JsonManagedReference
    @OneToOne
    private Placements placements;


    @ManyToOne
    @JoinColumn(name = "job_master_id")
    private JobMaster currentJob;

    public Employee() {
    }

    public Employee(String employeeId, String givenName, String familyName, String gender, LocalDate dob, String minefotraId, String phoneNumber, String workEmail, LocalDate joinDate, String personalEmail, LocalDateTime createdAt, Placements placements, JobMaster currentJob) {
        this.employeeId = employeeId;
        this.givenName = givenName;
        this.familyName = familyName;
        this.gender = gender;
        this.dob = dob;
        this.minefotraId = minefotraId;
        this.phoneNumber = phoneNumber;
        this.workEmail = workEmail;
        this.joinDate = joinDate;
        this.personalEmail = personalEmail;
        this.createdAt = createdAt;
        this.placements = placements;
        this.currentJob = currentJob;
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

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getMinefotraId() {
        return minefotraId;
    }

    public void setMinefotraId(String minefotraId) {
        this.minefotraId = minefotraId;
    }

    public LocalDate getJoinDate() {
        return joinDate;
    }

    public void setJoinDate(LocalDate joinDate) {
        this.joinDate = joinDate;
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

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Placements getPlacements() {
        return placements;
    }

    public void setPlacements(Placements placements) {
        this.placements = placements;
    }

    public JobMaster getCurrentJob() {
        return currentJob;
    }

    public void setCurrentJob(JobMaster currentJob) {
        this.currentJob = currentJob;
    }
}

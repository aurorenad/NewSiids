package org.example.siidsbackend.Model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;
import jakarta.persistence.Table;

@Entity
@Table(name = "grades")
@Data
public class Grade {
    @Id
    @Column(name = "grade_id")
    private int gradeId;

    @Column(name = "category")
    private String category;

    @Column(name = "grade_name")
    private String gradeName;

    @Column(name = "short_name")
    private String shortName;

    @Column(name = "level")
    private String level;

    @Column(name = "purpose_std", columnDefinition = "TEXT")
    private String purposeStd;

    @Column(name = "duties_std", columnDefinition = "TEXT")
    private String dutiesStd;

    @Column(name = "num_staffs")
    private int numStaffs;

    @Column(name = "grade_index")
    private int gradeIndex;

    @Column(name = "grade_iv")
    private int gradeIv;

    @Column(name = "num_years")
    private int numYears;
}


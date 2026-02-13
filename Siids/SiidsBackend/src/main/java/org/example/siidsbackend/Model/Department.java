package org.example.siidsbackend.Model;

import lombok.Data;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;



@Entity
@Table(name = "departments")
@Data
public class Department {
    @Id
    @Column(name = "department_id")
    private int departmentId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "category")
    private String category;

//     @JsonIgnore
//     @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, orphanRemoval = false)
//     private List<Employee> Employee = new ArrayList<>();

}

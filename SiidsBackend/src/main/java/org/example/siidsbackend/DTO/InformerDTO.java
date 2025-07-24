package org.example.siidsbackend.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class InformerDTO {
    private Integer nationalId;
    private String informerId;
    private String name;
    private String gender;
    private String phoneNum;
    private String address;
    private String email;
}
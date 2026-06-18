package org.example.siidsbackend.DTO.Response;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponseDTO {
    private Integer id;
    private String username;
    private String role;
    private Boolean active;
    private String authProvider;
    private Boolean mustChangePassword;
}

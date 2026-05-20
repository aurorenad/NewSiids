package org.example.siidsbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SiidsBackendApplication {
 
    public static void main(String[] args) {
        SpringApplication.run(SiidsBackendApplication.class, args);
    }

}

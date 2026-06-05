package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.SeizureReason;
import org.example.siidsbackend.Repository.SeizureReasonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class SeizureReasonInitializer implements CommandLineRunner {

    @Autowired
    private SeizureReasonRepository seizureReasonRepo;

    @Override
    public void run(String... args) throws Exception {
        // Initialize Seizure Reasons
        List<String> reasons = Arrays.asList(
            "Smuggling", 
            "Transit Violation", 
            "Expired Entry Card",
            "Lack of proper documentation",
            "Counterfeit goods",
            "Other" // Some legacy ones might be here
        );

        for (String reason : reasons) {
            if (!seizureReasonRepo.existsByReason(reason)) {
                SeizureReason sr = new SeizureReason();
                sr.setReason(reason);
                seizureReasonRepo.save(sr);
            }
        }
    }
}

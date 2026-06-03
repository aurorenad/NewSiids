package org.example.siidsbackend.Config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@Profile("!test")
public class DatabaseFixer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        try {
            log.info("Checking for stale check constraints on audit_logs...");
            jdbcTemplate.execute("ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check");
            log.info("Successfully dropped audit_logs_action_check if it existed.");
            
            // Also drop other potential enum constraints that might cause issues
            jdbcTemplate.execute("ALTER TABLE \"case\" DROP CONSTRAINT IF EXISTS case_status_check");
            log.info("Successfully dropped case_status_check if it existed.");
        } catch (Exception e) {
            log.warn("Could not drop constraints (this is normal if they don't exist or on some databases): {}", e.getMessage());
        }
    }
}

package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.JobMaster;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface JobMasterRepository extends JpaRepository<JobMaster, Integer> {
}

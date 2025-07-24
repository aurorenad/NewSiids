package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Informer;
import org.example.siidsbackend.Repository.InformerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class InformerService {
    @Autowired
    private InformerRepository informerRepository;

    public Informer addInformer(Informer informer) {
        return informerRepository.save(informer);
    }

    public Optional<Informer> findByNationalId(Integer nationalId) {
        return informerRepository.findInformerByNationalId(nationalId);
    }

    public List<Informer> getAllInformers() {
        return informerRepository.findAll();
    }
}

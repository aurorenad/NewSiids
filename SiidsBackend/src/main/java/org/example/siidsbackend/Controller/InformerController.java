package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Model.Informer;
import org.example.siidsbackend.Service.InformerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/informers")
public class InformerController {

    @Autowired
    private InformerService informerService;

    @PostMapping
    public ResponseEntity<Informer> createInformer(@RequestBody Informer informer) {
        Informer saved = informerService.addInformer(informer);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{nationalId}")
    public ResponseEntity<Informer> getInformerById(@PathVariable Integer nationalId) {
        return informerService.findByNationalId(nationalId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public List<Informer> getAllInformers() {
        return informerService.getAllInformers();
    }
}

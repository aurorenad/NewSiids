package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.Model.Informer;
import org.example.siidsbackend.Service.InformerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/informers")
@RequiredArgsConstructor
public class InformerController {

    private final InformerService informerService;

    @PostMapping
    @PreAuthorize("hasAuthority('INFORMER_MANAGE')")
    public ResponseEntity<Informer> createInformer(@RequestBody Informer informer) {
        Informer saved = informerService.addInformer(informer);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{nationalId}")
    @PreAuthorize("hasAuthority('INFORMER_VIEW')")
    public ResponseEntity<Informer> getInformerById(@PathVariable String nationalId) {
        return informerService.findByNationalId(nationalId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    @PreAuthorize("hasAuthority('INFORMER_VIEW')")
    public List<Informer> getAllInformers() {
        return informerService.getAllInformers();
    }


}

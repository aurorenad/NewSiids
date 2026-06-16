package org.example.siidsbackend.Service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FileStorageServiceTest {

    @TempDir
    private Path tempDir;

    @Test
    void storePdf_ShouldStoreUnderRequestedSubDirectory() throws Exception {
        FileStorageService service = new FileStorageService(tempDir.toString());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "evidence.pdf",
                "application/pdf",
                "%PDF-1.7\ncontent".getBytes());

        String storedPath = service.storePdf(file, "stock-documents");

        assertTrue(storedPath.startsWith("stock-documents/"));
        assertTrue(storedPath.endsWith(".pdf"));
        assertTrue(Files.exists(tempDir.resolve(storedPath)));
    }

    @Test
    void storePdf_ShouldRejectNonPdfExtension() {
        FileStorageService service = new FileStorageService(tempDir.toString());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "evidence.txt",
                "text/plain",
                "not a pdf".getBytes());

        assertThrows(IllegalArgumentException.class, () -> service.storePdf(file, "stock-documents"));
    }

    @Test
    void store_ShouldStoreAllowedDocumentExtension() throws Exception {
        FileStorageService service = new FileStorageService(tempDir.toString());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "return-note.docx",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "document".getBytes());

        String storedPath = service.store(file, "return-documents", Set.of(".pdf", ".doc", ".docx"));

        assertTrue(storedPath.startsWith("return-documents/"));
        assertTrue(storedPath.endsWith(".docx"));
        assertTrue(Files.exists(tempDir.resolve(storedPath)));
    }

    @Test
    void storeBytes_ShouldStoreSanitizedFilenameUnderSubDirectory() throws Exception {
        FileStorageService service = new FileStorageService(tempDir.toString());

        String storedPath = service.storeBytes(
                "%PDF-1.7\ncontent".getBytes(),
                "../SeizureNote-SN-TEST.pdf",
                "seizure-notes",
                Set.of(".pdf"));

        assertEquals("seizure-notes/SeizureNote-SN-TEST.pdf", storedPath);
        assertTrue(Files.exists(tempDir.resolve(storedPath)));
    }

    @Test
    void resolveStoredPath_ShouldRejectTraversal() {
        FileStorageService service = new FileStorageService(tempDir.toString());

        assertThrows(Exception.class, () -> service.resolveStoredPath("../secret.pdf"));
    }

    @Test
    void extractDownloadFilename_ShouldReturnStoredFilenameOnly() {
        FileStorageService service = new FileStorageService(tempDir.toString());

        // If stored filename is UUID_original.pdf, extraction should return the original name
        assertEquals("file.pdf", service.extractDownloadFilename("stock-documents/123e4567_file.pdf"));
    }
}

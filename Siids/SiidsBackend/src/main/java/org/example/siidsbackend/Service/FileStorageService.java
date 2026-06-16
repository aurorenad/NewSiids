package org.example.siidsbackend.Service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.UUID;

@Service
public class FileStorageService {

    private final Path uploadRoot;

    public FileStorageService(@Value("${file.upload-dir}") String uploadDir) {
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    public String storePdf(MultipartFile file, String subDirectory) throws IOException {
        return store(file, subDirectory, Set.of(".pdf"));
    }

    public String storeBytes(byte[] data, String filename, String subDirectory, Set<String> allowedExtensions)
            throws IOException {
        if (data == null || data.length == 0) {
            return null;
        }

        String safeFilename = sanitizeFilename(filename);
        String extension = getExtension(safeFilename);
        Set<String> normalizedAllowedExtensions = normalizeExtensions(allowedExtensions);
        if (!normalizedAllowedExtensions.contains(extension)) {
            throw new IllegalArgumentException("Unsupported file type: " + extension);
        }

        Path targetDirectory = resolveDirectory(subDirectory);
        Files.createDirectories(targetDirectory);

        Path targetFile = targetDirectory.resolve(safeFilename).normalize();
        if (!targetFile.startsWith(targetDirectory)) {
            throw new IOException("Invalid file path - security violation");
        }

        Files.write(targetFile, data);
        return StringUtils.hasText(subDirectory)
                ? subDirectory.replace('\\', '/') + "/" + safeFilename
                : safeFilename;
    }

    public String store(MultipartFile file, String subDirectory, Set<String> allowedExtensions) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = getExtension(originalFilename);
        Set<String> normalizedAllowedExtensions = normalizeExtensions(allowedExtensions);
        if (!normalizedAllowedExtensions.contains(extension.toLowerCase(Locale.ROOT))) {
            throw new IllegalArgumentException("Unsupported file type: " + extension);
        }

        Path targetDirectory = resolveDirectory(subDirectory);
        Files.createDirectories(targetDirectory);

        // Preserve original filename for user-friendly downloads while ensuring uniqueness
        String cleanedOriginal = sanitizeFilename(originalFilename);
        String secureFilename = UUID.randomUUID() + "_" + cleanedOriginal;
        Path targetFile = targetDirectory.resolve(secureFilename).normalize();
        if (!targetFile.startsWith(targetDirectory)) {
            throw new IOException("Invalid file path - security violation");
        }

        Files.copy(file.getInputStream(), targetFile, StandardCopyOption.REPLACE_EXISTING);
        return StringUtils.hasText(subDirectory)
                ? subDirectory.replace('\\', '/') + "/" + secureFilename
                : secureFilename;
    }

    public Path resolveStoredPath(String relativePath) throws IOException {
        if (!StringUtils.hasText(relativePath)) {
            throw new IOException("Missing file path");
        }

        Path resolvedPath = uploadRoot.resolve(relativePath).normalize();
        if (!resolvedPath.startsWith(uploadRoot)) {
            throw new IOException("Invalid file path - security violation");
        }
        return resolvedPath;
    }

    public String extractDownloadFilename(String relativePath) {
        if (!StringUtils.hasText(relativePath)) {
            return "document.pdf";
        }
        Path filename = Paths.get(relativePath).getFileName();
        if (filename == null) return "document.pdf";
        String name = filename.toString();
        // If saved as UUID_originalName.ext, return only the original name for downloads
        int underscore = name.indexOf('_');
        return underscore > 0 && underscore < name.length() - 1 ? name.substring(underscore + 1) : name;
    }

    private String getExtension(String filename) {
        int extensionIndex = filename.lastIndexOf('.');
        if (extensionIndex < 0 || extensionIndex == filename.length() - 1) {
            throw new IllegalArgumentException("File must have an extension");
        }
        return filename.substring(extensionIndex).toLowerCase(Locale.ROOT);
    }

    private String sanitizeFilename(String filename) {
        String cleanFilename = StringUtils.cleanPath(Objects.requireNonNull(filename));
        Path fileNameOnly = Paths.get(cleanFilename).getFileName();
        if (fileNameOnly == null || !StringUtils.hasText(fileNameOnly.toString())) {
            throw new IllegalArgumentException("Filename is required");
        }
        return fileNameOnly.toString();
    }

    private Set<String> normalizeExtensions(Set<String> extensions) {
        if (extensions == null || extensions.isEmpty()) {
            throw new IllegalArgumentException("At least one file extension must be allowed");
        }
        return extensions.stream()
                .flatMap(extension -> Arrays.stream(extension.split(",")))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(extension -> extension.startsWith(".") ? extension : "." + extension)
                .map(extension -> extension.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    private Path resolveDirectory(String subDirectory) throws IOException {
        Path targetDirectory = StringUtils.hasText(subDirectory)
                ? uploadRoot.resolve(subDirectory).normalize()
                : uploadRoot;
        if (!targetDirectory.startsWith(uploadRoot)) {
            throw new IOException("Invalid upload directory - security violation");
        }
        return targetDirectory;
    }
}

package org.example.siidsbackend.Config;

import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Response.ApiResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.UUID;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse> handleIllegalArgument(IllegalArgumentException e) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        log.error("[{}] Validation error: {}", requestId, e.getMessage());
        return ResponseEntity.badRequest()
                .body(new ApiResponse(false, e.getMessage(), null));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiResponse> handleIllegalState(IllegalStateException e) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        log.error("[{}] State error: {}", requestId, e.getMessage());
        return ResponseEntity.badRequest()
                .body(new ApiResponse(false, e.getMessage(), null));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiResponse> handleRuntime(RuntimeException e) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        log.error("[{}] Runtime error: {}", requestId, e.getMessage(), e);
        return ResponseEntity.badRequest()
                .body(new ApiResponse(false, e.getMessage(), null));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneral(Exception e) {
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        log.error("[{}] Unexpected error: {}", requestId, e.getMessage(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ApiResponse(false, "An unexpected error occurred. Request ID: " + requestId, null));
    }
}

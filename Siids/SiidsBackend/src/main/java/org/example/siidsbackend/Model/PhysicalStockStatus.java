package org.example.siidsbackend.Model;

/**
 * State machine for goods within the SIIDS system.
 * Main Flow: PENDING_REVIEW -> IN_STOCK -> PENDING_RELEASE -> RELEASED
 * Return Flow: PENDING_REVIEW -> RETURNED -> PENDING_REVIEW (Surveillance correction)
 */
public enum PhysicalStockStatus {
    // New State Machine States
    PENDING_REVIEW,     // Goods awaiting Stock Manager intake review
    IN_STOCK,           // Goods approved and physically in Main Stock warehouse
    PENDING_RELEASE,    // Release request submitted to PRSO
    RELEASED,           // PRSO approved and goods released to auction/owner
    RETURNED,           // Rejected by Stock Manager for correction
    
    // Legacy / Surveillance Initial States (Compatibility)
    IN_TEMPORARY_STOCK,
    PENDING_JUSTIFICATION,
    RELEASED_FROM_TEMP,
    ESCALATED,
    IN_MAIN_STOCK,                 // Legacy Main Stock status
    PENDING_PRSO_EDIT_APPROVAL,
    PENDING_PRSO_RELEASE_APPROVAL, // Alias for PENDING_RELEASE
    RELEASED_FROM_MAIN,            // Alias for RELEASED
    RETURNED_FOR_CORRECTION        // Alias for RETURNED
}

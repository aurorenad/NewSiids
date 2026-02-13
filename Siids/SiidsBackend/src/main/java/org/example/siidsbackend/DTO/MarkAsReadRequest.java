// MarkAsReadRequest.java
package org.example.siidsbackend.DTO;

import lombok.Data;
import java.util.List;

@Data
public class MarkAsReadRequest {
    private List<Integer> notificationIds;
}
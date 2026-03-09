package dev.auditkit;

import java.util.Collections;
import java.util.Map;

/**
 * Exception thrown by the AuditKit client for API errors.
 */
public class AuditKitException extends RuntimeException {

    private final String code;
    private final int status;
    private final Map<String, Object> details;

    public AuditKitException(String message, String code, int status) {
        this(message, code, status, Collections.emptyMap());
    }

    public AuditKitException(String message, String code, int status, Map<String, Object> details) {
        super(message);
        this.code = code;
        this.status = status;
        this.details = details != null ? Collections.unmodifiableMap(details) : Collections.emptyMap();
    }

    public AuditKitException(String message, Throwable cause) {
        super(message, cause);
        this.code = "UNKNOWN";
        this.status = 0;
        this.details = Collections.emptyMap();
    }

    /** API error code (e.g. "VALIDATION_ERROR", "HTTP_ERROR"). */
    public String code() { return code; }

    /** HTTP status code, or 0 for non-HTTP errors. */
    public int status() { return status; }

    /** Additional error details from the API response. */
    public Map<String, Object> details() { return details; }

    @Override
    public String toString() {
        return String.format("AuditKitException{code='%s', status=%d, message='%s'}", code, status, getMessage());
    }
}

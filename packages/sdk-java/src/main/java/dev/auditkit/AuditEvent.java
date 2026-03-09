package dev.auditkit;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Immutable representation of an audit event to be sent to AuditKit.
 * Use {@link #builder()} to construct instances.
 *
 * <pre>{@code
 * AuditEvent event = AuditEvent.builder()
 *     .action("document.updated")
 *     .tenantId("org_acme")
 *     .actorId("user_123")
 *     .actorName("Jane")
 *     .targetType("document")
 *     .targetId("doc_456")
 *     .severity("info")
 *     .build();
 * }</pre>
 */
public final class AuditEvent {

    private final String action;
    private final String tenantId;
    private final String actorId;
    private final String actorType;
    private final String actorName;
    private final String actorEmail;
    private final Map<String, Object> actorMetadata;
    private final String targetType;
    private final String targetId;
    private final String targetName;
    private final Map<String, Object> targetMetadata;
    private final String contextIp;
    private final String contextUserAgent;
    private final String contextRequestId;
    private final String contextSessionId;
    private final String description;
    private final String category;
    private final String severity;
    private final Map<String, Object> metadata;
    private final List<String> tags;
    private final boolean isFailure;
    private final boolean isAnonymous;
    private final String errorMessage;
    private final Instant occurredAt;
    private final String idempotencyKey;

    private AuditEvent(Builder builder) {
        this.action = Objects.requireNonNull(builder.action, "action is required");
        this.tenantId = builder.tenantId;
        this.actorId = Objects.requireNonNull(builder.actorId, "actorId is required");
        this.actorType = builder.actorType;
        this.actorName = builder.actorName;
        this.actorEmail = builder.actorEmail;
        this.actorMetadata = builder.actorMetadata == null
            ? Collections.emptyMap()
            : Collections.unmodifiableMap(new LinkedHashMap<>(builder.actorMetadata));
        this.targetType = builder.targetType;
        this.targetId = builder.targetId;
        this.targetName = builder.targetName;
        this.targetMetadata = builder.targetMetadata == null
            ? Collections.emptyMap()
            : Collections.unmodifiableMap(new LinkedHashMap<>(builder.targetMetadata));
        this.contextIp = builder.contextIp;
        this.contextUserAgent = builder.contextUserAgent;
        this.contextRequestId = builder.contextRequestId;
        this.contextSessionId = builder.contextSessionId;
        this.description = builder.description;
        this.category = builder.category;
        this.severity = builder.severity;
        this.metadata = builder.metadata == null
            ? Collections.emptyMap()
            : Collections.unmodifiableMap(new LinkedHashMap<>(builder.metadata));
        this.tags = builder.tags == null
            ? Collections.emptyList()
            : Collections.unmodifiableList(List.copyOf(builder.tags));
        this.isFailure = builder.isFailure;
        this.isAnonymous = builder.isAnonymous;
        this.errorMessage = builder.errorMessage;
        this.occurredAt = builder.occurredAt;
        this.idempotencyKey = builder.idempotencyKey;
    }

    public static Builder builder() {
        return new Builder();
    }

    // --- Getters ---

    public String action() { return action; }
    public String tenantId() { return tenantId; }
    public String actorId() { return actorId; }
    public String actorType() { return actorType; }
    public String actorName() { return actorName; }
    public String actorEmail() { return actorEmail; }
    public Map<String, Object> actorMetadata() { return actorMetadata; }
    public String targetType() { return targetType; }
    public String targetId() { return targetId; }
    public String targetName() { return targetName; }
    public Map<String, Object> targetMetadata() { return targetMetadata; }
    public String contextIp() { return contextIp; }
    public String contextUserAgent() { return contextUserAgent; }
    public String contextRequestId() { return contextRequestId; }
    public String contextSessionId() { return contextSessionId; }
    public String description() { return description; }
    public String category() { return category; }
    public String severity() { return severity; }
    public Map<String, Object> metadata() { return metadata; }
    public List<String> tags() { return tags; }
    public boolean isFailure() { return isFailure; }
    public boolean isAnonymous() { return isAnonymous; }
    public String errorMessage() { return errorMessage; }
    public Instant occurredAt() { return occurredAt; }
    public String idempotencyKey() { return idempotencyKey; }

    /**
     * Serializes the event to a JSON-compatible map using the API's snake_case convention.
     */
    Map<String, Object> toMap() {
        var map = new LinkedHashMap<String, Object>();
        map.put("action", action);
        if (tenantId != null) map.put("tenant_id", tenantId);

        var actor = new LinkedHashMap<String, Object>();
        actor.put("id", actorId);
        if (actorType != null) actor.put("type", actorType);
        if (actorName != null) actor.put("name", actorName);
        if (actorEmail != null) actor.put("email", actorEmail);
        if (!actorMetadata.isEmpty()) actor.put("metadata", actorMetadata);
        map.put("actor", actor);

        if (targetType != null || targetId != null) {
            var target = new LinkedHashMap<String, Object>();
            if (targetType != null) target.put("type", targetType);
            if (targetId != null) target.put("id", targetId);
            if (targetName != null) target.put("name", targetName);
            if (!targetMetadata.isEmpty()) target.put("metadata", targetMetadata);
            map.put("target", target);
        }

        if (contextIp != null || contextUserAgent != null || contextRequestId != null || contextSessionId != null) {
            var context = new LinkedHashMap<String, Object>();
            if (contextIp != null) context.put("ip", contextIp);
            if (contextUserAgent != null) context.put("user_agent", contextUserAgent);
            if (contextRequestId != null) context.put("request_id", contextRequestId);
            if (contextSessionId != null) context.put("session_id", contextSessionId);
            map.put("context", context);
        }

        if (description != null) map.put("description", description);
        if (category != null) map.put("category", category);
        map.put("severity", severity != null ? severity : "info");
        if (!metadata.isEmpty()) map.put("metadata", metadata);
        if (!tags.isEmpty()) map.put("tags", tags);
        if (isFailure) map.put("is_failure", true);
        if (isAnonymous) map.put("is_anonymous", true);
        if (errorMessage != null) map.put("error_message", errorMessage);
        if (occurredAt != null) map.put("occurred_at", occurredAt.toString());
        if (idempotencyKey != null) map.put("idempotency_key", idempotencyKey);

        return map;
    }

    public static final class Builder {
        private String action;
        private String tenantId;
        private String actorId;
        private String actorType = "user";
        private String actorName;
        private String actorEmail;
        private Map<String, Object> actorMetadata;
        private String targetType;
        private String targetId;
        private String targetName;
        private Map<String, Object> targetMetadata;
        private String contextIp;
        private String contextUserAgent;
        private String contextRequestId;
        private String contextSessionId;
        private String description;
        private String category;
        private String severity = "info";
        private Map<String, Object> metadata;
        private List<String> tags;
        private boolean isFailure;
        private boolean isAnonymous;
        private String errorMessage;
        private Instant occurredAt;
        private String idempotencyKey;

        private Builder() {}

        public Builder action(String action) { this.action = action; return this; }
        public Builder tenantId(String tenantId) { this.tenantId = tenantId; return this; }
        public Builder actorId(String actorId) { this.actorId = actorId; return this; }
        public Builder actorType(String actorType) { this.actorType = actorType; return this; }
        public Builder actorName(String actorName) { this.actorName = actorName; return this; }
        public Builder actorEmail(String actorEmail) { this.actorEmail = actorEmail; return this; }
        public Builder actorMetadata(Map<String, Object> actorMetadata) { this.actorMetadata = actorMetadata; return this; }
        public Builder targetType(String targetType) { this.targetType = targetType; return this; }
        public Builder targetId(String targetId) { this.targetId = targetId; return this; }
        public Builder targetName(String targetName) { this.targetName = targetName; return this; }
        public Builder targetMetadata(Map<String, Object> targetMetadata) { this.targetMetadata = targetMetadata; return this; }
        public Builder contextIp(String contextIp) { this.contextIp = contextIp; return this; }
        public Builder contextUserAgent(String contextUserAgent) { this.contextUserAgent = contextUserAgent; return this; }
        public Builder contextRequestId(String contextRequestId) { this.contextRequestId = contextRequestId; return this; }
        public Builder contextSessionId(String contextSessionId) { this.contextSessionId = contextSessionId; return this; }
        public Builder description(String description) { this.description = description; return this; }
        public Builder category(String category) { this.category = category; return this; }
        public Builder severity(String severity) { this.severity = severity; return this; }
        public Builder metadata(Map<String, Object> metadata) { this.metadata = metadata; return this; }
        public Builder tags(List<String> tags) { this.tags = tags; return this; }
        public Builder isFailure(boolean isFailure) { this.isFailure = isFailure; return this; }
        public Builder isAnonymous(boolean isAnonymous) { this.isAnonymous = isAnonymous; return this; }
        public Builder errorMessage(String errorMessage) { this.errorMessage = errorMessage; return this; }
        public Builder occurredAt(Instant occurredAt) { this.occurredAt = occurredAt; return this; }
        public Builder idempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; return this; }

        public AuditEvent build() {
            return new AuditEvent(this);
        }
    }
}

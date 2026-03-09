package dev.auditkit;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tenant-scoped AuditKit client. All operations automatically set the tenant ID.
 *
 * <pre>{@code
 * TenantClient tenant = client.forTenant("org_acme");
 * tenant.log(AuditEvent.builder()
 *     .action("document.updated")
 *     .actorId("user_123")
 *     .build());
 * }</pre>
 */
public final class TenantClient {

    private final AuditKit client;
    private final String tenantId;

    TenantClient(AuditKit client, String tenantId) {
        this.client = client;
        this.tenantId = tenantId;
    }

    /**
     * Log a single audit event scoped to this tenant.
     */
    public Map<String, Object> log(AuditEvent event) {
        var scoped = AuditEvent.builder()
            .action(event.action())
            .actorId(event.actorId())
            .actorType(event.actorType())
            .actorName(event.actorName())
            .actorEmail(event.actorEmail())
            .targetType(event.targetType())
            .targetId(event.targetId())
            .targetName(event.targetName())
            .tenantId(tenantId)
            .severity(event.severity())
            .description(event.description())
            .category(event.category())
            .metadata(event.metadata())
            .tags(event.tags())
            .isFailure(event.isFailure())
            .errorMessage(event.errorMessage())
            .idempotencyKey(event.idempotencyKey())
            .build();
        return client.log(scoped);
    }

    /**
     * Search audit events scoped to this tenant.
     */
    public Map<String, Object> search(String query) {
        return client.search(query, Map.of("tenant_id", tenantId));
    }

    /**
     * Search audit events scoped to this tenant with additional parameters.
     */
    public Map<String, Object> search(String query, Map<String, String> params) {
        var allParams = new LinkedHashMap<>(params);
        allParams.put("tenant_id", tenantId);
        return client.search(query, allParams);
    }

    /**
     * Create a viewer token scoped to this tenant.
     */
    public Map<String, Object> createViewerToken(List<String> scopes, String expiresIn) {
        return client.createViewerToken(tenantId, scopes, expiresIn);
    }
}

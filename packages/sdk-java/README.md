# AuditKit Java SDK

Drop-in audit logs for B2B SaaS. Java client for the [AuditKit](https://auditkit.dev) API.

Requires Java 17+. Uses `java.net.http.HttpClient` with zero external dependencies.

## Installation

### Gradle

```groovy
implementation 'dev.auditkit:auditkit:0.1.0'
```

### Maven

```xml
<dependency>
    <groupId>dev.auditkit</groupId>
    <artifactId>auditkit</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Quick Start

```java
import dev.auditkit.AuditKit;
import dev.auditkit.AuditKitConfig;
import dev.auditkit.AuditEvent;

// Create client
AuditKit client = AuditKit.create(
    AuditKit.builder()
        .apiKey("ak_live_...")
        .build()
);

// Log a single event
client.log(AuditEvent.builder()
    .action("document.updated")
    .actorId("user_123")
    .actorName("Jane")
    .targetType("document")
    .targetId("doc_456")
    .tenantId("org_acme")
    .metadata(Map.of("field", "title", "old_value", "Draft", "new_value", "Final"))
    .build());

// Bulk log events
client.bulkLog(List.of(
    AuditEvent.builder().action("user.login").actorId("user_1").tenantId("org_acme").build(),
    AuditEvent.builder().action("user.login").actorId("user_2").tenantId("org_acme").build()
));

// Search events
var results = client.search("document.updated", Map.of(
    "tenant_id", "org_acme",
    "limit", "50"
));

// Verify integrity
var verification = client.verify("evt_abc123");
```

## Configuration

```java
AuditKit client = AuditKit.create(
    AuditKit.builder()
        .apiKey("ak_live_...")
        .baseUrl("https://api.auditkit.dev")
        .environment("production")
        .maxRetries(3)
        .timeout(Duration.ofSeconds(30))
        .debug(false)
        .build()
);
```

## Error Handling

```java
import dev.auditkit.AuditKitException;

try {
    client.log(event);
} catch (AuditKitException e) {
    System.err.printf("Error %s (HTTP %d): %s%n", e.code(), e.status(), e.getMessage());
}
```

## License

AGPL-3.0-or-later

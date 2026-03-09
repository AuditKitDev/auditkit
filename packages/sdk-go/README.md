# AuditKit Go SDK

Drop-in audit logs for B2B SaaS. Go client for the [AuditKit](https://auditkit.dev) API.

## Installation

```bash
go get github.com/auditkit/auditkit-go
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    "log"

    auditkit "github.com/auditkit/auditkit-go"
)

func main() {
    client := auditkit.NewClient("ak_live_...",
        auditkit.WithBaseURL("https://api.auditkit.dev"),
    )

    ctx := context.Background()

    // Log a single event
    resp, err := client.Log(ctx, auditkit.EventInput{
        Action:   "document.updated",
        TenantID: "org_acme",
        Actor:    auditkit.AuditActor{ID: "user_123", Name: "Jane"},
        Target:   &auditkit.AuditTarget{Type: "document", ID: "doc_456"},
        Metadata: map[string]interface{}{
            "field":     "title",
            "old_value": "Draft",
            "new_value": "Final",
        },
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Logged event: %s\n", resp.EventID)

    // Bulk log events
    bulkResp, err := client.BulkLog(ctx, []auditkit.EventInput{
        {Action: "user.login", Actor: auditkit.AuditActor{ID: "user_1"}, TenantID: "org_acme"},
        {Action: "user.login", Actor: auditkit.AuditActor{ID: "user_2"}, TenantID: "org_acme"},
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Logged %d events\n", bulkResp.Count)

    // Search events
    results, err := client.Search(ctx, "document.updated", &auditkit.SearchOptions{
        TenantID: "org_acme",
        Limit:    50,
    })
    if err != nil {
        log.Fatal(err)
    }
    for _, event := range results.Data {
        fmt.Printf("%s by %s at %s\n", event.Action, event.ActorID, event.OccurredAt)
    }

    // Verify integrity
    verification, err := client.Verify(ctx, "evt_abc123")
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Chain valid: %t\n", verification.Valid)
}
```

## Configuration

```go
client := auditkit.NewClient("ak_live_...",
    auditkit.WithBaseURL("https://api.auditkit.dev"),
    auditkit.WithEnvironment("production"),
    auditkit.WithMaxRetries(3),
    auditkit.WithDebug(true),
)
```

## Error Handling

```go
resp, err := client.Log(ctx, event)
if err != nil {
    var apiErr *auditkit.Error
    if errors.As(err, &apiErr) {
        fmt.Printf("API error %s (HTTP %d): %s\n", apiErr.Code, apiErr.Status, apiErr.Message)
    }
}
```

## License

AGPL-3.0-or-later

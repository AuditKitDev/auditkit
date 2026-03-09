# AuditKit Terraform Provider

Manage AuditKit resources with Terraform using the [Terraform Plugin Framework](https://developer.hashicorp.com/terraform/plugin/framework).

## Requirements

- [Terraform](https://developer.hashicorp.com/terraform/downloads) >= 1.0
- [Go](https://golang.org/doc/install) >= 1.21

## Building

```bash
go build -o terraform-provider-auditkit
```

## Provider Configuration

```hcl
terraform {
  required_providers {
    auditkit = {
      source  = "auditkit/auditkit"
      version = "~> 0.1"
    }
  }
}

provider "auditkit" {
  api_key  = var.auditkit_api_key   # or set AUDITKIT_API_KEY env var
  base_url = "https://api.auditkit.dev"  # optional, this is the default
}
```

## Resources

### auditkit_project

```hcl
resource "auditkit_project" "main" {
  name   = "Production App"
  slug   = "production-app"
  region = "us-east-1"
}
```

### auditkit_api_key

```hcl
resource "auditkit_api_key" "backend" {
  project_id  = auditkit_project.main.id
  name        = "Backend Service Key"
  environment = "production"
  scopes      = ["read", "write"]
}
```

### auditkit_webhook

```hcl
resource "auditkit_webhook" "slack_alerts" {
  project_id = auditkit_project.main.id
  url        = "https://hooks.slack.com/services/T00/B00/xxx"
  events     = ["event.created", "anomaly.detected"]
  is_active  = true
}
```

### auditkit_retention_policy

```hcl
resource "auditkit_retention_policy" "default" {
  project_id     = auditkit_project.main.id
  retention_days = 365
  legal_hold     = false
}

resource "auditkit_retention_policy" "hipaa_tenant" {
  project_id     = auditkit_project.main.id
  tenant_id      = "tenant_healthcare"
  retention_days = 2555  # 7 years
  legal_hold     = true
  legal_hold_until = "2030-12-31T00:00:00Z"
}
```

### auditkit_notification_rule

```hcl
resource "auditkit_notification_rule" "critical_alerts" {
  project_id   = auditkit_project.main.id
  name         = "Critical Event Alerts"
  conditions   = jsonencode({
    severity = "error"
    action   = "user.delete"
  })
  channel_type   = "slack"
  channel_config = jsonencode({
    webhook_url = "https://hooks.slack.com/services/T00/B00/xxx"
    channel     = "#security-alerts"
  })
  is_active = true
}
```

### auditkit_siem_connector

```hcl
resource "auditkit_siem_connector" "datadog" {
  project_id = auditkit_project.main.id
  type       = "datadog"
  name       = "Datadog Production"
  config     = jsonencode({
    api_key = var.datadog_api_key
    site    = "datadoghq.com"
    source  = "auditkit"
  })
  is_active = true
}

resource "auditkit_siem_connector" "splunk" {
  project_id = auditkit_project.main.id
  type       = "splunk"
  name       = "Splunk Cloud"
  config     = jsonencode({
    hec_endpoint = "https://splunk.example.com:8088"
    hec_token    = var.splunk_hec_token
    index        = "audit_logs"
  })
}
```

### auditkit_redaction_rule

```hcl
resource "auditkit_redaction_rule" "ssn" {
  project_id  = auditkit_project.main.id
  field_path  = "metadata.ssn"
  pattern     = "\\d{3}-\\d{2}-\\d{4}"
  replacement = "[SSN REDACTED]"
  enabled     = true
}

resource "auditkit_redaction_rule" "email_in_metadata" {
  project_id  = auditkit_project.main.id
  field_path  = "metadata.email"
  pattern     = "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
  replacement = "[EMAIL REDACTED]"
}
```

## Development Status

This provider is a structural stub. The resource schemas and CRUD lifecycle methods are implemented, but the actual HTTP calls to the AuditKit API are marked with TODO placeholders. To complete the provider:

1. Implement an HTTP client in the `APIClient` struct
2. Replace TODO comments in each resource's Create/Read/Update/Delete methods with actual API calls
3. Add proper error handling and response parsing
4. Add acceptance tests

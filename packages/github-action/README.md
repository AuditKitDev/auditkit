# AuditKit GitHub Action

Log audit events to AuditKit directly from your GitHub Actions workflows. Automatically captures CI/CD context including commit SHA, branch, author, PR number, and workflow metadata.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `api_key` | Yes | | AuditKit API key (store as a GitHub secret) |
| `tenant_id` | Yes | | The tenant ID to associate the event with |
| `action` | No | `deployment` | The action name (e.g., `deployment`, `release`, `config.change`) |
| `severity` | No | `info` | Event severity (`info`, `warn`, `error`) |
| `metadata` | No | `{}` | Additional metadata as a JSON string |
| `description` | No | Auto-generated | Human-readable description |
| `target_type` | No | `repository` | Target resource type |
| `target_id` | No | `owner/repo` | Target resource identifier |
| `base_url` | No | `https://api.auditkit.dev` | AuditKit API base URL |

## Outputs

| Output | Description |
|--------|-------------|
| `event_id` | The ID of the created audit event |
| `hash` | The integrity hash of the created event |

## Auto-Captured Context

The action automatically captures and includes the following GitHub context as event metadata:

- Commit SHA
- Branch name
- Repository (owner/repo)
- Workflow name
- Run ID and number
- Event name (push, pull_request, etc.)
- Actor (who triggered the workflow)
- PR number and title (when applicable)
- Direct link to the workflow run

## Usage Examples

### Log deployments

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to production
        run: ./deploy.sh

      - name: Log deployment to AuditKit
        uses: auditkit/github-action@v1
        with:
          api_key: ${{ secrets.AUDITKIT_API_KEY }}
          tenant_id: ${{ vars.AUDITKIT_TENANT_ID }}
          action: deployment
          severity: info
          description: "Deployed to production"
          metadata: |
            {
              "environment": "production",
              "version": "${{ github.sha }}"
            }
```

### Log releases

```yaml
name: Release
on:
  release:
    types: [published]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Log release to AuditKit
        uses: auditkit/github-action@v1
        with:
          api_key: ${{ secrets.AUDITKIT_API_KEY }}
          tenant_id: ${{ vars.AUDITKIT_TENANT_ID }}
          action: release.published
          description: "Release ${{ github.event.release.tag_name }} published"
          metadata: |
            {
              "tag": "${{ github.event.release.tag_name }}",
              "prerelease": ${{ github.event.release.prerelease }},
              "release_url": "${{ github.event.release.html_url }}"
            }
```

### Log config changes

```yaml
name: Config Change Audit
on:
  push:
    paths:
      - 'config/**'
      - '.env.example'
      - 'terraform/**'

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log config change to AuditKit
        uses: auditkit/github-action@v1
        with:
          api_key: ${{ secrets.AUDITKIT_API_KEY }}
          tenant_id: ${{ vars.AUDITKIT_TENANT_ID }}
          action: config.change
          severity: warn
          target_type: configuration
          target_id: ${{ github.repository }}
          description: "Configuration files changed"
```

### Log failed workflows

```yaml
name: CI Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  audit-failure:
    runs-on: ubuntu-latest
    needs: test
    if: failure()
    steps:
      - name: Log CI failure to AuditKit
        uses: auditkit/github-action@v1
        with:
          api_key: ${{ secrets.AUDITKIT_API_KEY }}
          tenant_id: ${{ vars.AUDITKIT_TENANT_ID }}
          action: ci.failure
          severity: error
          description: "CI pipeline failed"
```

### Use outputs

```yaml
      - name: Log event
        id: audit
        uses: auditkit/github-action@v1
        with:
          api_key: ${{ secrets.AUDITKIT_API_KEY }}
          tenant_id: ${{ vars.AUDITKIT_TENANT_ID }}
          action: deployment

      - name: Use event ID
        run: |
          echo "Audit event: ${{ steps.audit.outputs.event_id }}"
          echo "Hash: ${{ steps.audit.outputs.hash }}"
```

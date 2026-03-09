const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');
const http = require('http');

async function run() {
  try {
    // --- Read inputs ---
    const apiKey = core.getInput('api_key', { required: true });
    const action = core.getInput('action') || 'deployment';
    const metadataStr = core.getInput('metadata') || '{}';
    const tenantId = core.getInput('tenant_id', { required: true });
    const severity = core.getInput('severity') || 'info';
    const baseUrl = core.getInput('base_url') || 'https://api.auditkit.dev';
    const description = core.getInput('description') || '';
    const targetType = core.getInput('target_type') || '';
    const targetId = core.getInput('target_id') || '';

    // --- Parse metadata ---
    let metadata;
    try {
      metadata = JSON.parse(metadataStr);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      core.warning(`Failed to parse metadata JSON, using empty object: ${message}`);
      metadata = {};
    }

    // --- Capture GitHub context ---
    const context = github.context;
    const { repo, sha, ref, workflow, runId, runNumber, actor, eventName } = context;

    // Extract branch name from ref
    const branch = ref.replace('refs/heads/', '').replace('refs/tags/', '');

    // Extract PR number if available
    const prNumber = context.payload.pull_request?.number || null;
    const prTitle = context.payload.pull_request?.title || null;

    // --- Build the audit event payload ---
    const eventPayload = {
      tenant_id: tenantId,
      action: action,
      severity: severity,
      description: description || `${action} triggered by GitHub Actions workflow "${workflow}"`,
      actor: {
        id: actor,
        type: 'ci',
        name: actor,
      },
      metadata: {
        ...metadata,
        github: {
          commit_sha: sha,
          branch: branch,
          repository: `${repo.owner}/${repo.repo}`,
          workflow: workflow,
          run_id: runId,
          run_number: runNumber,
          event_name: eventName,
          ref: ref,
          pr_number: prNumber,
          pr_title: prTitle,
          actor: actor,
          server_url: context.serverUrl,
          run_url: `${context.serverUrl}/${repo.owner}/${repo.repo}/actions/runs/${runId}`,
        },
      },
      tags: ['ci', 'github-actions', eventName],
    };

    // Add target if provided
    if (targetType || targetId) {
      eventPayload.target = {
        type: targetType || 'repository',
        id: targetId || `${repo.owner}/${repo.repo}`,
        name: targetId || `${repo.owner}/${repo.repo}`,
      };
    } else {
      eventPayload.target = {
        type: 'repository',
        id: `${repo.owner}/${repo.repo}`,
        name: `${repo.owner}/${repo.repo}`,
      };
    }

    // --- Send to AuditKit API ---
    core.info(`Logging ${action} event to AuditKit...`);
    core.info(`  Tenant: ${tenantId}`);
    core.info(`  Commit: ${sha.substring(0, 7)}`);
    core.info(`  Branch: ${branch}`);
    core.info(`  Actor: ${actor}`);
    if (prNumber) {
      core.info(`  PR: #${prNumber}`);
    }

    const apiUrl = `${baseUrl}/v1/events`;
    const responseData = await postJSON(apiUrl, eventPayload, apiKey);

    // --- Set outputs ---
    const eventId = responseData.event_id || responseData.id;
    const hash = responseData.row_hash;

    core.setOutput('event_id', eventId);
    core.setOutput('hash', hash);

    core.info(`Event logged successfully.`);
    core.info(`  Event ID: ${eventId}`);
    core.info(`  Hash: ${hash}`);
  } catch (error) {
    core.setFailed(`AuditKit action failed: ${error.message}`);
  }
}

/**
 * POST JSON to a URL and return the parsed response.
 */
function postJSON(targetUrl, data, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);
    const parsed = new URL(targetUrl);

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'AuditKit-GitHub-Action/1.0',
      },
    };

    const transport = parsed.protocol === 'https:' ? https : http;

    const req = transport.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseBody));
          } catch (_error) {
            reject(new Error(`Failed to parse API response: ${responseBody}`));
          }
        } else {
          reject(
            new Error(
              `AuditKit API returned ${res.statusCode}: ${responseBody}`
            )
          );
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    req.write(body);
    req.end();
  });
}

run();

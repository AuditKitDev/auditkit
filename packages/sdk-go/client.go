package auditkit

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// Client is the AuditKit API client.
type Client struct {
	apiKey     string
	baseURL    string
	env        string
	maxRetries int
	debug      bool
	httpClient *http.Client
}

// NewClient creates a new AuditKit client.
func NewClient(apiKey string, opts ...Option) *Client {
	cfg := &clientConfig{
		baseURL:     DefaultBaseURL,
		environment: "production",
		maxRetries:  3,
		debug:       false,
	}

	for _, opt := range opts {
		opt(cfg)
	}

	return &Client{
		apiKey:     apiKey,
		baseURL:    strings.TrimRight(cfg.baseURL, "/"),
		env:        cfg.environment,
		maxRetries: cfg.maxRetries,
		debug:      cfg.debug,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// Log sends a single audit event.
func (c *Client) Log(ctx context.Context, event EventInput) (*IngestResponse, error) {
	if event.Severity == "" {
		event.Severity = SeverityInfo
	}

	body, err := json.Marshal(event)
	if err != nil {
		return nil, fmt.Errorf("auditkit: failed to marshal event: %w", err)
	}

	headers := map[string]string{}
	if event.IdempotencyKey != "" {
		headers["Idempotency-Key"] = event.IdempotencyKey
	}

	var result IngestResponse
	if err := c.doRequest(ctx, http.MethodPost, "/v1/events", body, headers, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// BulkLog sends multiple audit events at once.
func (c *Client) BulkLog(ctx context.Context, events []EventInput) (*BulkIngestResponse, error) {
	for i := range events {
		if events[i].Severity == "" {
			events[i].Severity = SeverityInfo
		}
	}

	payload := struct {
		Events []EventInput `json:"events"`
	}{Events: events}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("auditkit: failed to marshal events: %w", err)
	}

	var result BulkIngestResponse
	if err := c.doRequest(ctx, http.MethodPost, "/v1/events/bulk", body, nil, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// Search queries audit events.
func (c *Client) Search(ctx context.Context, query string, opts *SearchOptions) (*SearchResponse, error) {
	params := url.Values{}
	if query != "" {
		params.Set("query", query)
	}

	if opts != nil {
		if opts.TenantID != "" {
			params.Set("tenant_id", opts.TenantID)
		}
		if opts.Action != "" {
			params.Set("action", opts.Action)
		}
		if opts.ActorID != "" {
			params.Set("actor_id", opts.ActorID)
		}
		if opts.TargetType != "" {
			params.Set("target_type", opts.TargetType)
		}
		if opts.TargetID != "" {
			params.Set("target_id", opts.TargetID)
		}
		if len(opts.Severity) > 0 {
			severities := make([]string, len(opts.Severity))
			for i, s := range opts.Severity {
				severities[i] = string(s)
			}
			params.Set("severity", strings.Join(severities, ","))
		}
		if len(opts.Tags) > 0 {
			params.Set("tags", strings.Join(opts.Tags, ","))
		}
		if opts.From != nil {
			params.Set("from", opts.From.UTC().Format(time.RFC3339))
		}
		if opts.To != nil {
			params.Set("to", opts.To.UTC().Format(time.RFC3339))
		}
		if opts.Limit > 0 {
			params.Set("limit", strconv.Itoa(opts.Limit))
		}
		if opts.Cursor != "" {
			params.Set("cursor", opts.Cursor)
		}
	}

	path := "/v1/events"
	if encoded := params.Encode(); encoded != "" {
		path += "?" + encoded
	}

	var result SearchResponse
	if err := c.doRequest(ctx, http.MethodGet, path, nil, nil, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// Verify checks hash chain integrity for a specific event.
func (c *Client) Verify(ctx context.Context, eventID string) (*ChainVerificationResult, error) {
	var result ChainVerificationResult
	if err := c.doRequest(ctx, http.MethodGet, "/v1/verify/"+url.PathEscape(eventID), nil, nil, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// CreateViewerToken generates a short-lived scoped token for the embedded React viewer.
func (c *Client) CreateViewerToken(ctx context.Context, req ViewerTokenRequest) (*ViewerTokenResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("auditkit: failed to marshal viewer token request: %w", err)
	}

	var result ViewerTokenResponse
	if err := c.doRequest(ctx, http.MethodPost, "/v1/viewer-tokens", body, nil, &result); err != nil {
		return nil, err
	}

	return &result, nil
}

// ForTenant returns a tenant-scoped client that automatically sets the tenant ID on all operations.
func (c *Client) ForTenant(tenantID string) *TenantClient {
	return &TenantClient{client: c, tenantID: tenantID}
}

// doRequest executes an HTTP request with retry logic and exponential backoff.
func (c *Client) doRequest(
	ctx context.Context,
	method string,
	path string,
	body []byte,
	extraHeaders map[string]string,
	result interface{},
) error {
	fullURL := c.baseURL + path
	var lastErr error

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		if c.debug {
			log.Printf("[AuditKit] %s %s (attempt %d)", method, path, attempt+1)
		}

		var bodyReader io.Reader
		if body != nil {
			bodyReader = bytes.NewReader(body)
		}

		req, err := http.NewRequestWithContext(ctx, method, fullURL, bodyReader)
		if err != nil {
			return fmt.Errorf("auditkit: failed to create request: %w", err)
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+c.apiKey)
		req.Header.Set("User-Agent", "auditkit-go/"+Version)
		req.Header.Set("X-AuditKit-Environment", c.env)

		for k, v := range extraHeaders {
			req.Header.Set(k, v)
		}

		resp, err := c.httpClient.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("auditkit: request failed: %w", err)

			if attempt < c.maxRetries {
				c.backoff(ctx, attempt)
			}
			continue
		}

		defer resp.Body.Close()
		respBody, err := io.ReadAll(resp.Body)
		if err != nil {
			lastErr = fmt.Errorf("auditkit: failed to read response: %w", err)
			if attempt < c.maxRetries {
				c.backoff(ctx, attempt)
			}
			continue
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			if result != nil {
				if err := json.Unmarshal(respBody, result); err != nil {
					return fmt.Errorf("auditkit: failed to decode response: %w", err)
				}
			}
			return nil
		}

		// Parse error response
		var apiErr Error
		if err := json.Unmarshal(respBody, &apiErr); err != nil {
			apiErr = Error{
				Code:    "HTTP_ERROR",
				Message: fmt.Sprintf("HTTP %d", resp.StatusCode),
				Status:  resp.StatusCode,
			}
		}
		apiErr.Status = resp.StatusCode

		// Don't retry 4xx except 429
		if resp.StatusCode >= 400 && resp.StatusCode < 500 && resp.StatusCode != 429 {
			return &apiErr
		}

		// Handle rate limiting with Retry-After header
		if resp.StatusCode == 429 {
			if retryAfter := resp.Header.Get("Retry-After"); retryAfter != "" {
				if seconds, err := strconv.ParseFloat(retryAfter, 64); err == nil {
					if attempt < c.maxRetries {
						select {
						case <-ctx.Done():
							return ctx.Err()
						case <-time.After(time.Duration(seconds * float64(time.Second))):
						}
						continue
					}
				}
			}
		}

		lastErr = &apiErr

		if attempt < c.maxRetries {
			c.backoff(ctx, attempt)
		}
	}

	if lastErr != nil {
		return lastErr
	}
	return &Error{Code: "UNKNOWN", Message: "unknown error", Status: 0}
}

// backoff waits with exponential backoff, respecting context cancellation.
func (c *Client) backoff(ctx context.Context, attempt int) {
	delay := time.Duration(math.Min(math.Pow(2, float64(attempt)), 30)) * time.Second
	select {
	case <-ctx.Done():
	case <-time.After(delay):
	}
}

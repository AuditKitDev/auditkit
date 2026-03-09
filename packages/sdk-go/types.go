package auditkit

import "time"

// AuditSeverity represents the severity level of an audit event.
type AuditSeverity string

const (
	SeverityInfo     AuditSeverity = "info"
	SeverityWarn     AuditSeverity = "warn"
	SeverityError    AuditSeverity = "error"
	SeverityCritical AuditSeverity = "critical"
)

// AuditActor represents the entity that performed an action.
type AuditActor struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type,omitempty"`
	Name     string                 `json:"name,omitempty"`
	Email    string                 `json:"email,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// AuditTarget represents the entity that was acted upon.
type AuditTarget struct {
	Type     string                 `json:"type"`
	ID       string                 `json:"id"`
	Name     string                 `json:"name,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// AuditContext represents contextual information about an event.
type AuditContext struct {
	IP        string `json:"ip,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
	RequestID string `json:"request_id,omitempty"`
	SessionID string `json:"session_id,omitempty"`
}

// EventInput represents the data sent to create an audit event.
type EventInput struct {
	Action         string                 `json:"action"`
	TenantID       string                 `json:"tenant_id,omitempty"`
	Actor          AuditActor             `json:"actor"`
	Target         *AuditTarget           `json:"target,omitempty"`
	Context        *AuditContext          `json:"context,omitempty"`
	Description    string                 `json:"description,omitempty"`
	Category       string                 `json:"category,omitempty"`
	Severity       AuditSeverity          `json:"severity,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	Tags           []string               `json:"tags,omitempty"`
	IsFailure      bool                   `json:"is_failure,omitempty"`
	IsAnonymous    bool                   `json:"is_anonymous,omitempty"`
	ErrorMessage   string                 `json:"error_message,omitempty"`
	OccurredAt     *time.Time             `json:"occurred_at,omitempty"`
	IdempotencyKey string                 `json:"idempotency_key,omitempty"`
}

// AuditEvent represents a full audit event as returned by the API.
type AuditEvent struct {
	ID             string                 `json:"id"`
	EventID        string                 `json:"eventId"`
	ProjectID      string                 `json:"projectId"`
	TenantID       string                 `json:"tenantId"`
	Environment    string                 `json:"environment"`
	Action         string                 `json:"action"`
	Category       *string                `json:"category"`
	Description    *string                `json:"description"`
	Severity       AuditSeverity          `json:"severity"`
	ActorID        string                 `json:"actorId"`
	ActorType      string                 `json:"actorType"`
	ActorName      *string                `json:"actorName"`
	ActorEmail     *string                `json:"actorEmail"`
	ActorMetadata  map[string]interface{} `json:"actorMetadata"`
	TargetType     *string                `json:"targetType"`
	TargetID       *string                `json:"targetId"`
	TargetName     *string                `json:"targetName"`
	TargetMetadata map[string]interface{} `json:"targetMetadata"`
	SourceIP       *string                `json:"sourceIp"`
	IPCountry      *string                `json:"ipCountry"`
	IPCity         *string                `json:"ipCity"`
	UserAgent      *string                `json:"userAgent"`
	RequestID      *string                `json:"requestId"`
	SessionID      *string                `json:"sessionId"`
	IsFailure      bool                   `json:"isFailure"`
	IsAnonymous    bool                   `json:"isAnonymous"`
	ErrorMessage   *string                `json:"errorMessage"`
	Metadata       map[string]interface{} `json:"metadata"`
	Tags           []string               `json:"tags"`
	OccurredAt     string                 `json:"occurredAt"`
	IngestedAt     string                 `json:"ingestedAt"`
	PrevHash       *string                `json:"prevHash"`
	RowHash        string                 `json:"rowHash"`
	IsAnomalous    bool                   `json:"isAnomalous"`
	AnomalyReasons []string               `json:"anomalyReasons"`
}

// IngestResponse is the response from logging a single event.
type IngestResponse struct {
	ID         string `json:"id"`
	EventID    string `json:"eventId"`
	Action     string `json:"action"`
	RowHash    string `json:"rowHash"`
	IngestedAt string `json:"ingestedAt"`
}

// BulkIngestResponse is the response from logging multiple events.
type BulkIngestResponse struct {
	Events []IngestResponse `json:"events"`
	Count  int              `json:"count"`
}

// SearchOptions contains parameters for searching audit events.
type SearchOptions struct {
	TenantID   string
	Action     string
	ActorID    string
	TargetType string
	TargetID   string
	Severity   []AuditSeverity
	Tags       []string
	From       *time.Time
	To         *time.Time
	Limit      int
	Cursor     string
}

// SearchResponse is the response from searching events.
type SearchResponse struct {
	Data       []AuditEvent `json:"data"`
	Pagination Pagination   `json:"pagination"`
}

// Pagination contains pagination information.
type Pagination struct {
	HasMore bool    `json:"hasMore"`
	Cursor  *string `json:"cursor"`
}

// ChainVerificationResult is the response from verifying hash chain integrity.
type ChainVerificationResult struct {
	Valid         bool         `json:"valid"`
	EventsChecked int          `json:"eventsChecked"`
	FirstEvent    *string      `json:"firstEvent"`
	LastEvent     *string      `json:"lastEvent"`
	ChainRootHash *string      `json:"chainRootHash"`
	VerifiedAt    string       `json:"verifiedAt"`
	BrokenLinks   []BrokenLink `json:"brokenLinks,omitempty"`
}

// BrokenLink represents a break in the hash chain.
type BrokenLink struct {
	EventID    string `json:"eventId"`
	OccurredAt string `json:"occurredAt"`
	Expected   string `json:"expected"`
	Actual     string `json:"actual"`
}

// ViewerTokenRequest is the request to create a viewer token.
type ViewerTokenRequest struct {
	TenantID  string   `json:"tenant_id"`
	Scopes    []string `json:"scopes,omitempty"`
	ExpiresIn string   `json:"expires_in,omitempty"`
}

// ViewerTokenResponse is the response from creating a viewer token.
type ViewerTokenResponse struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expires_at"`
}

// TenantClient is a tenant-scoped client that auto-sets tenant_id on all operations.
type TenantClient struct {
	client   *Client
	tenantID string
}

// Log sends a single audit event scoped to this tenant.
func (tc *TenantClient) Log(ctx context.Context, event EventInput) (*IngestResponse, error) {
	event.TenantID = tc.tenantID
	return tc.client.Log(ctx, event)
}

// BulkLog sends multiple audit events scoped to this tenant.
func (tc *TenantClient) BulkLog(ctx context.Context, events []EventInput) (*BulkIngestResponse, error) {
	for i := range events {
		events[i].TenantID = tc.tenantID
	}
	return tc.client.BulkLog(ctx, events)
}

// Search queries audit events scoped to this tenant.
func (tc *TenantClient) Search(ctx context.Context, query string, opts *SearchOptions) (*SearchResponse, error) {
	if opts == nil {
		opts = &SearchOptions{}
	}
	opts.TenantID = tc.tenantID
	return tc.client.Search(ctx, query, opts)
}

// CreateViewerToken generates a viewer token scoped to this tenant.
func (tc *TenantClient) CreateViewerToken(ctx context.Context, scopes []string, expiresIn string) (*ViewerTokenResponse, error) {
	return tc.client.CreateViewerToken(ctx, ViewerTokenRequest{
		TenantID:  tc.tenantID,
		Scopes:    scopes,
		ExpiresIn: expiresIn,
	})
}

// Error represents an API error response.
type Error struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Status  int                    `json:"status"`
	Details map[string]interface{} `json:"details,omitempty"`
}

func (e *Error) Error() string {
	return e.Message
}

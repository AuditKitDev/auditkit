// Package auditkit provides a Go client for the AuditKit API.
//
// AuditKit offers drop-in audit logs for B2B SaaS applications with
// hash-chain integrity verification, anomaly detection, and compliance
// features.
//
// Basic usage:
//
//	client := auditkit.NewClient("ak_live_...")
//
//	resp, err := client.Log(ctx, auditkit.EventInput{
//	    Action:   "document.updated",
//	    TenantID: "org_acme",
//	    Actor:    auditkit.AuditActor{ID: "user_123", Name: "Jane"},
//	    Target:   &auditkit.AuditTarget{Type: "document", ID: "doc_456"},
//	})
package auditkit

const (
	// Version is the SDK version.
	Version = "0.1.0"

	// DefaultBaseURL is the default AuditKit API base URL.
	DefaultBaseURL = "https://api.auditkit.dev"
)

// Option configures a Client.
type Option func(*clientConfig)

type clientConfig struct {
	baseURL     string
	environment string
	maxRetries  int
	debug       bool
}

// WithBaseURL sets the API base URL.
func WithBaseURL(url string) Option {
	return func(c *clientConfig) {
		c.baseURL = url
	}
}

// WithEnvironment sets the environment header (production, staging, development).
func WithEnvironment(env string) Option {
	return func(c *clientConfig) {
		c.environment = env
	}
}

// WithMaxRetries sets the maximum number of retries for failed requests.
func WithMaxRetries(n int) Option {
	return func(c *clientConfig) {
		c.maxRetries = n
	}
}

// WithDebug enables debug logging.
func WithDebug(debug bool) Option {
	return func(c *clientConfig) {
		c.debug = debug
	}
}

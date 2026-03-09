package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/hashicorp/terraform-plugin-framework/datasource"
	"github.com/hashicorp/terraform-plugin-framework/path"
	"github.com/hashicorp/terraform-plugin-framework/provider"
	"github.com/hashicorp/terraform-plugin-framework/provider/schema"
	"github.com/hashicorp/terraform-plugin-framework/resource"
	"github.com/hashicorp/terraform-plugin-framework/types"
)

// Ensure provider satisfies the interface.
var _ provider.Provider = &AuditKitProvider{}

// AuditKitProvider implements the Terraform provider for AuditKit.
type AuditKitProvider struct {
	version string
}

// AuditKitProviderModel describes the provider configuration data.
type AuditKitProviderModel struct {
	APIKey  types.String `tfsdk:"api_key"`
	BaseURL types.String `tfsdk:"base_url"`
}

// APIClient holds the configuration for making API calls.
type APIClient struct {
	APIKey  string
	BaseURL string
}

func (c *APIClient) doRequest(method, path string, body interface{}) (map[string]interface{}, error) {
	var bodyReader io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request: %w", err)
		}
		bodyReader = bytes.NewReader(data)
	}

	url := c.BaseURL + path
	req, err := http.NewRequest(method, url, bodyReader)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("User-Agent", "auditkit-terraform/0.1.0")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (HTTP %d): %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if len(respBody) > 0 {
		if err := json.Unmarshal(respBody, &result); err != nil {
			return nil, fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return result, nil
}

// New creates a new provider instance.
func New() provider.Provider {
	return &AuditKitProvider{
		version: "0.1.0",
	}
}

func (p *AuditKitProvider) Metadata(_ context.Context, _ provider.MetadataRequest, resp *provider.MetadataResponse) {
	resp.TypeName = "auditkit"
	resp.Version = p.version
}

func (p *AuditKitProvider) Schema(_ context.Context, _ provider.SchemaRequest, resp *provider.SchemaResponse) {
	resp.Schema = schema.Schema{
		Description: "The AuditKit provider allows you to manage AuditKit resources such as projects, API keys, webhooks, retention policies, notification rules, SIEM connectors, and redaction rules.",
		Attributes: map[string]schema.Attribute{
			"api_key": schema.StringAttribute{
				Description: "The API key for authenticating with the AuditKit API. Can also be set via the AUDITKIT_API_KEY environment variable.",
				Optional:    true,
				Sensitive:   true,
			},
			"base_url": schema.StringAttribute{
				Description: "The base URL for the AuditKit API. Defaults to https://api.auditkit.dev. Can also be set via the AUDITKIT_BASE_URL environment variable.",
				Optional:    true,
			},
		},
	}
}

func (p *AuditKitProvider) Configure(ctx context.Context, req provider.ConfigureRequest, resp *provider.ConfigureResponse) {
	var config AuditKitProviderModel
	diags := req.Config.Get(ctx, &config)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	// Resolve API key
	apiKey := os.Getenv("AUDITKIT_API_KEY")
	if !config.APIKey.IsNull() {
		apiKey = config.APIKey.ValueString()
	}
	if apiKey == "" {
		resp.Diagnostics.AddAttributeError(
			path.Root("api_key"),
			"Missing AuditKit API Key",
			"The provider cannot create the AuditKit API client because the API key is missing. "+
				"Set the api_key attribute in the provider configuration or the AUDITKIT_API_KEY environment variable.",
		)
		return
	}

	// Resolve base URL
	baseURL := os.Getenv("AUDITKIT_BASE_URL")
	if !config.BaseURL.IsNull() {
		baseURL = config.BaseURL.ValueString()
	}
	if baseURL == "" {
		baseURL = "https://api.auditkit.dev"
	}

	client := &APIClient{
		APIKey:  apiKey,
		BaseURL: baseURL,
	}

	resp.DataSourceData = client
	resp.ResourceData = client
}

func (p *AuditKitProvider) Resources(_ context.Context) []func() resource.Resource {
	return []func() resource.Resource{
		NewProjectResource,
		NewAPIKeyResource,
		NewWebhookResource,
		NewRetentionPolicyResource,
		NewNotificationRuleResource,
		NewSIEMConnectorResource,
		NewRedactionRuleResource,
	}
}

func (p *AuditKitProvider) DataSources(_ context.Context) []func() datasource.DataSource {
	return []func() datasource.DataSource{}
}

// ============================================
// auditkit_project
// ============================================

var _ resource.Resource = &ProjectResource{}

type ProjectResource struct {
	client *APIClient
}

type ProjectResourceModel struct {
	ID     types.String `tfsdk:"id"`
	Name   types.String `tfsdk:"name"`
	Slug   types.String `tfsdk:"slug"`
	Region types.String `tfsdk:"region"`
}

func NewProjectResource() resource.Resource {
	return &ProjectResource{}
}

func (r *ProjectResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_project"
}

func (r *ProjectResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = resource.Schema{
		Description: "Manages an AuditKit project.",
		Attributes: map[string]resource.Attribute{
			"id": resource.StringAttribute{
				Computed:    true,
				Description: "The unique identifier of the project.",
			},
			"name": resource.StringAttribute{
				Required:    true,
				Description: "The display name of the project.",
			},
			"slug": resource.StringAttribute{
				Required:    true,
				Description: "The URL-friendly slug for the project.",
			},
			"region": resource.StringAttribute{
				Optional:    true,
				Computed:    true,
				Description: "The region where the project data is stored. Defaults to us-east-1.",
			},
		},
	}
}

func (r *ProjectResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*APIClient)
}

func (r *ProjectResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan ProjectResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	region := "us-east-1"
	if !plan.Region.IsNull() {
		region = plan.Region.ValueString()
	}

	result, err := r.client.doRequest("POST", "/dashboard/projects", map[string]interface{}{
		"name":   plan.Name.ValueString(),
		"slug":   plan.Slug.ValueString(),
		"region": region,
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to create project", err.Error())
		return
	}

	if id, ok := result["id"].(string); ok {
		plan.ID = types.StringValue(id)
	}
	plan.Region = types.StringValue(region)

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *ProjectResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state ProjectResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	result, err := r.client.doRequest("GET", "/dashboard/projects/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to read project", err.Error())
		return
	}

	if name, ok := result["name"].(string); ok {
		state.Name = types.StringValue(name)
	}
	if slug, ok := result["slug"].(string); ok {
		state.Slug = types.StringValue(slug)
	}
	if region, ok := result["region"].(string); ok {
		state.Region = types.StringValue(region)
	}

	diags = resp.State.Set(ctx, state)
	resp.Diagnostics.Append(diags...)
}

func (r *ProjectResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan ProjectResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("PATCH", "/dashboard/projects/"+plan.ID.ValueString(), map[string]interface{}{
		"name":   plan.Name.ValueString(),
		"slug":   plan.Slug.ValueString(),
		"region": plan.Region.ValueString(),
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to update project", err.Error())
		return
	}

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *ProjectResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state ProjectResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("DELETE", "/dashboard/projects/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to delete project", err.Error())
		return
	}
}

// ============================================
// auditkit_api_key
// ============================================

var _ resource.Resource = &APIKeyResource{}

type APIKeyResource struct {
	client *APIClient
}

type APIKeyResourceModel struct {
	ID          types.String `tfsdk:"id"`
	ProjectID   types.String `tfsdk:"project_id"`
	Name        types.String `tfsdk:"name"`
	Environment types.String `tfsdk:"environment"`
	Scopes      types.List   `tfsdk:"scopes"`
	KeyPrefix   types.String `tfsdk:"key_prefix"`
	Key         types.String `tfsdk:"key"`
}

func NewAPIKeyResource() resource.Resource {
	return &APIKeyResource{}
}

func (r *APIKeyResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_api_key"
}

func (r *APIKeyResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = resource.Schema{
		Description: "Manages an AuditKit API key for a project.",
		Attributes: map[string]resource.Attribute{
			"id": resource.StringAttribute{
				Computed:    true,
				Description: "The unique identifier of the API key.",
			},
			"project_id": resource.StringAttribute{
				Required:    true,
				Description: "The project this API key belongs to.",
			},
			"name": resource.StringAttribute{
				Required:    true,
				Description: "A descriptive name for the API key.",
			},
			"environment": resource.StringAttribute{
				Optional:    true,
				Computed:    true,
				Description: "The environment (production, staging, development). Defaults to production.",
			},
			"scopes": resource.ListAttribute{
				Optional:    true,
				Computed:    true,
				ElementType: types.StringType,
				Description: "The permission scopes for this key (read, write).",
			},
			"key_prefix": resource.StringAttribute{
				Computed:    true,
				Description: "The prefix of the generated API key (for identification).",
			},
			"key": resource.StringAttribute{
				Computed:    true,
				Sensitive:   true,
				Description: "The full API key. Only available at creation time.",
			},
		},
	}
}

func (r *APIKeyResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*APIClient)
}

func (r *APIKeyResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan APIKeyResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	environment := "production"
	if !plan.Environment.IsNull() {
		environment = plan.Environment.ValueString()
	}

	result, err := r.client.doRequest("POST", "/dashboard/api-keys", map[string]interface{}{
		"name":        plan.Name.ValueString(),
		"environment": environment,
		"project_id":  plan.ProjectID.ValueString(),
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to create API key", err.Error())
		return
	}

	if id, ok := result["id"].(string); ok {
		plan.ID = types.StringValue(id)
	}
	if keyPrefix, ok := result["key_prefix"].(string); ok {
		plan.KeyPrefix = types.StringValue(keyPrefix)
	}
	if key, ok := result["key"].(string); ok {
		plan.Key = types.StringValue(key)
	}
	plan.Environment = types.StringValue(environment)

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *APIKeyResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state APIKeyResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	result, err := r.client.doRequest("GET", "/dashboard/api-keys", nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to read API keys", err.Error())
		return
	}

	// Find the matching key by ID from the list response
	if keys, ok := result["data"].([]interface{}); ok {
		for _, k := range keys {
			if keyMap, ok := k.(map[string]interface{}); ok {
				if id, ok := keyMap["id"].(string); ok && id == state.ID.ValueString() {
					if name, ok := keyMap["name"].(string); ok {
						state.Name = types.StringValue(name)
					}
					if env, ok := keyMap["environment"].(string); ok {
						state.Environment = types.StringValue(env)
					}
					if projectID, ok := keyMap["project_id"].(string); ok {
						state.ProjectID = types.StringValue(projectID)
					}
					if keyPrefix, ok := keyMap["key_prefix"].(string); ok {
						state.KeyPrefix = types.StringValue(keyPrefix)
					}
					break
				}
			}
		}
	}

	diags = resp.State.Set(ctx, state)
	resp.Diagnostics.Append(diags...)
}

func (r *APIKeyResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan APIKeyResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	// API keys do not support updates; just set state
	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *APIKeyResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state APIKeyResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("DELETE", "/dashboard/api-keys/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to delete API key", err.Error())
		return
	}
}

// ============================================
// auditkit_webhook
// ============================================

var _ resource.Resource = &WebhookResource{}

type WebhookResource struct {
	client *APIClient
}

type WebhookResourceModel struct {
	ID        types.String `tfsdk:"id"`
	ProjectID types.String `tfsdk:"project_id"`
	URL       types.String `tfsdk:"url"`
	Events    types.List   `tfsdk:"events"`
	IsActive  types.Bool   `tfsdk:"is_active"`
	Secret    types.String `tfsdk:"secret"`
}

func NewWebhookResource() resource.Resource {
	return &WebhookResource{}
}

func (r *WebhookResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_webhook"
}

func (r *WebhookResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = resource.Schema{
		Description: "Manages an AuditKit webhook endpoint.",
		Attributes: map[string]resource.Attribute{
			"id": resource.StringAttribute{
				Computed:    true,
				Description: "The unique identifier of the webhook.",
			},
			"project_id": resource.StringAttribute{
				Required:    true,
				Description: "The project this webhook belongs to.",
			},
			"url": resource.StringAttribute{
				Required:    true,
				Description: "The URL to send webhook events to.",
			},
			"events": resource.ListAttribute{
				Optional:    true,
				Computed:    true,
				ElementType: types.StringType,
				Description: "The event types to subscribe to. Defaults to all events (*).",
			},
			"is_active": resource.BoolAttribute{
				Optional:    true,
				Computed:    true,
				Description: "Whether the webhook is active. Defaults to true.",
			},
			"secret": resource.StringAttribute{
				Computed:    true,
				Sensitive:   true,
				Description: "The webhook signing secret.",
			},
		},
	}
}

func (r *WebhookResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*APIClient)
}

func (r *WebhookResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan WebhookResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	isActive := true
	if !plan.IsActive.IsNull() {
		isActive = plan.IsActive.ValueBool()
	}

	// Convert events list to []string
	var events []string
	if !plan.Events.IsNull() {
		diags = plan.Events.ElementsAs(ctx, &events, false)
		resp.Diagnostics.Append(diags...)
		if resp.Diagnostics.HasError() {
			return
		}
	}

	result, err := r.client.doRequest("POST", "/v1/webhooks", map[string]interface{}{
		"url":       plan.URL.ValueString(),
		"events":    events,
		"is_active": isActive,
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to create webhook", err.Error())
		return
	}

	if id, ok := result["id"].(string); ok {
		plan.ID = types.StringValue(id)
	}
	if secret, ok := result["secret"].(string); ok {
		plan.Secret = types.StringValue(secret)
	}
	plan.IsActive = types.BoolValue(isActive)

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *WebhookResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state WebhookResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	result, err := r.client.doRequest("GET", "/v1/webhooks", nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to read webhooks", err.Error())
		return
	}

	// Find the matching webhook by ID from the list response
	if webhooks, ok := result["data"].([]interface{}); ok {
		for _, w := range webhooks {
			if whMap, ok := w.(map[string]interface{}); ok {
				if id, ok := whMap["id"].(string); ok && id == state.ID.ValueString() {
					if url, ok := whMap["url"].(string); ok {
						state.URL = types.StringValue(url)
					}
					if isActive, ok := whMap["is_active"].(bool); ok {
						state.IsActive = types.BoolValue(isActive)
					}
					if projectID, ok := whMap["project_id"].(string); ok {
						state.ProjectID = types.StringValue(projectID)
					}
					break
				}
			}
		}
	}

	diags = resp.State.Set(ctx, state)
	resp.Diagnostics.Append(diags...)
}

func (r *WebhookResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan WebhookResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	// Convert events list to []string
	var events []string
	if !plan.Events.IsNull() {
		diags = plan.Events.ElementsAs(ctx, &events, false)
		resp.Diagnostics.Append(diags...)
		if resp.Diagnostics.HasError() {
			return
		}
	}

	_, err := r.client.doRequest("PATCH", "/v1/webhooks/"+plan.ID.ValueString(), map[string]interface{}{
		"url":       plan.URL.ValueString(),
		"events":    events,
		"is_active": plan.IsActive.ValueBool(),
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to update webhook", err.Error())
		return
	}

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *WebhookResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state WebhookResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("DELETE", "/v1/webhooks/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to delete webhook", err.Error())
		return
	}
}

// ============================================
// auditkit_retention_policy
// ============================================

var _ resource.Resource = &RetentionPolicyResource{}

type RetentionPolicyResource struct {
	client *APIClient
}

type RetentionPolicyResourceModel struct {
	ID             types.String `tfsdk:"id"`
	ProjectID      types.String `tfsdk:"project_id"`
	TenantID       types.String `tfsdk:"tenant_id"`
	RetentionDays  types.Int64  `tfsdk:"retention_days"`
	LegalHold      types.Bool   `tfsdk:"legal_hold"`
	LegalHoldUntil types.String `tfsdk:"legal_hold_until"`
}

func NewRetentionPolicyResource() resource.Resource {
	return &RetentionPolicyResource{}
}

func (r *RetentionPolicyResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_retention_policy"
}

func (r *RetentionPolicyResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = resource.Schema{
		Description: "Manages an AuditKit data retention policy.",
		Attributes: map[string]resource.Attribute{
			"id": resource.StringAttribute{
				Computed:    true,
				Description: "The unique identifier of the retention policy.",
			},
			"project_id": resource.StringAttribute{
				Required:    true,
				Description: "The project this policy belongs to.",
			},
			"tenant_id": resource.StringAttribute{
				Optional:    true,
				Description: "Optional tenant ID to scope the policy. If omitted, applies to all tenants.",
			},
			"retention_days": resource.Int64Attribute{
				Required:    true,
				Description: "Number of days to retain audit events.",
			},
			"legal_hold": resource.BoolAttribute{
				Optional:    true,
				Computed:    true,
				Description: "Whether a legal hold is in effect (prevents deletion). Defaults to false.",
			},
			"legal_hold_until": resource.StringAttribute{
				Optional:    true,
				Description: "ISO 8601 timestamp for when the legal hold expires.",
			},
		},
	}
}

func (r *RetentionPolicyResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*APIClient)
}

func (r *RetentionPolicyResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan RetentionPolicyResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	legalHold := false
	if !plan.LegalHold.IsNull() {
		legalHold = plan.LegalHold.ValueBool()
	}

	body := map[string]interface{}{
		"project_id":     plan.ProjectID.ValueString(),
		"retention_days": plan.RetentionDays.ValueInt64(),
		"legal_hold":     legalHold,
	}
	if !plan.TenantID.IsNull() {
		body["tenant_id"] = plan.TenantID.ValueString()
	}
	if !plan.LegalHoldUntil.IsNull() {
		body["legal_hold_until"] = plan.LegalHoldUntil.ValueString()
	}

	result, err := r.client.doRequest("POST", "/dashboard/retention", body)
	if err != nil {
		resp.Diagnostics.AddError("Failed to create retention policy", err.Error())
		return
	}

	if id, ok := result["id"].(string); ok {
		plan.ID = types.StringValue(id)
	}
	plan.LegalHold = types.BoolValue(legalHold)

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *RetentionPolicyResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state RetentionPolicyResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	result, err := r.client.doRequest("GET", "/dashboard/retention/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to read retention policy", err.Error())
		return
	}

	if projectID, ok := result["project_id"].(string); ok {
		state.ProjectID = types.StringValue(projectID)
	}
	if tenantID, ok := result["tenant_id"].(string); ok {
		state.TenantID = types.StringValue(tenantID)
	}
	if retentionDays, ok := result["retention_days"].(float64); ok {
		state.RetentionDays = types.Int64Value(int64(retentionDays))
	}
	if legalHold, ok := result["legal_hold"].(bool); ok {
		state.LegalHold = types.BoolValue(legalHold)
	}
	if legalHoldUntil, ok := result["legal_hold_until"].(string); ok {
		state.LegalHoldUntil = types.StringValue(legalHoldUntil)
	}

	diags = resp.State.Set(ctx, state)
	resp.Diagnostics.Append(diags...)
}

func (r *RetentionPolicyResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan RetentionPolicyResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	body := map[string]interface{}{
		"project_id":     plan.ProjectID.ValueString(),
		"retention_days": plan.RetentionDays.ValueInt64(),
		"legal_hold":     plan.LegalHold.ValueBool(),
	}
	if !plan.TenantID.IsNull() {
		body["tenant_id"] = plan.TenantID.ValueString()
	}
	if !plan.LegalHoldUntil.IsNull() {
		body["legal_hold_until"] = plan.LegalHoldUntil.ValueString()
	}

	_, err := r.client.doRequest("PATCH", "/dashboard/retention/"+plan.ID.ValueString(), body)
	if err != nil {
		resp.Diagnostics.AddError("Failed to update retention policy", err.Error())
		return
	}

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *RetentionPolicyResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state RetentionPolicyResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("DELETE", "/dashboard/retention/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to delete retention policy", err.Error())
		return
	}
}

// ============================================
// auditkit_notification_rule
// ============================================

var _ resource.Resource = &NotificationRuleResource{}

type NotificationRuleResource struct {
	client *APIClient
}

type NotificationRuleResourceModel struct {
	ID            types.String `tfsdk:"id"`
	ProjectID     types.String `tfsdk:"project_id"`
	Name          types.String `tfsdk:"name"`
	Conditions    types.String `tfsdk:"conditions"`
	ChannelType   types.String `tfsdk:"channel_type"`
	ChannelConfig types.String `tfsdk:"channel_config"`
	IsActive      types.Bool   `tfsdk:"is_active"`
}

func NewNotificationRuleResource() resource.Resource {
	return &NotificationRuleResource{}
}

func (r *NotificationRuleResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_notification_rule"
}

func (r *NotificationRuleResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = resource.Schema{
		Description: "Manages an AuditKit notification rule that triggers alerts on matching events.",
		Attributes: map[string]resource.Attribute{
			"id": resource.StringAttribute{
				Computed:    true,
				Description: "The unique identifier of the notification rule.",
			},
			"project_id": resource.StringAttribute{
				Required:    true,
				Description: "The project this rule belongs to.",
			},
			"name": resource.StringAttribute{
				Required:    true,
				Description: "A descriptive name for the notification rule.",
			},
			"conditions": resource.StringAttribute{
				Required:    true,
				Description: "JSON string defining the conditions that trigger this rule.",
			},
			"channel_type": resource.StringAttribute{
				Required:    true,
				Description: "The notification channel type (slack, discord, email, webhook).",
			},
			"channel_config": resource.StringAttribute{
				Required:    true,
				Description: "JSON string with the channel configuration (e.g., webhook URL, email address).",
			},
			"is_active": resource.BoolAttribute{
				Optional:    true,
				Computed:    true,
				Description: "Whether the rule is active. Defaults to true.",
			},
		},
	}
}

func (r *NotificationRuleResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*APIClient)
}

func (r *NotificationRuleResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan NotificationRuleResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	isActive := true
	if !plan.IsActive.IsNull() {
		isActive = plan.IsActive.ValueBool()
	}

	result, err := r.client.doRequest("POST", "/dashboard/notifications", map[string]interface{}{
		"project_id":     plan.ProjectID.ValueString(),
		"name":           plan.Name.ValueString(),
		"conditions":     plan.Conditions.ValueString(),
		"channel_type":   plan.ChannelType.ValueString(),
		"channel_config": plan.ChannelConfig.ValueString(),
		"is_active":      isActive,
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to create notification rule", err.Error())
		return
	}

	if id, ok := result["id"].(string); ok {
		plan.ID = types.StringValue(id)
	}
	plan.IsActive = types.BoolValue(isActive)

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *NotificationRuleResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state NotificationRuleResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	result, err := r.client.doRequest("GET", "/dashboard/notifications/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to read notification rule", err.Error())
		return
	}

	if projectID, ok := result["project_id"].(string); ok {
		state.ProjectID = types.StringValue(projectID)
	}
	if name, ok := result["name"].(string); ok {
		state.Name = types.StringValue(name)
	}
	if conditions, ok := result["conditions"].(string); ok {
		state.Conditions = types.StringValue(conditions)
	}
	if channelType, ok := result["channel_type"].(string); ok {
		state.ChannelType = types.StringValue(channelType)
	}
	if channelConfig, ok := result["channel_config"].(string); ok {
		state.ChannelConfig = types.StringValue(channelConfig)
	}
	if isActive, ok := result["is_active"].(bool); ok {
		state.IsActive = types.BoolValue(isActive)
	}

	diags = resp.State.Set(ctx, state)
	resp.Diagnostics.Append(diags...)
}

func (r *NotificationRuleResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan NotificationRuleResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("PATCH", "/dashboard/notifications/"+plan.ID.ValueString(), map[string]interface{}{
		"project_id":     plan.ProjectID.ValueString(),
		"name":           plan.Name.ValueString(),
		"conditions":     plan.Conditions.ValueString(),
		"channel_type":   plan.ChannelType.ValueString(),
		"channel_config": plan.ChannelConfig.ValueString(),
		"is_active":      plan.IsActive.ValueBool(),
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to update notification rule", err.Error())
		return
	}

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *NotificationRuleResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state NotificationRuleResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("DELETE", "/dashboard/notifications/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to delete notification rule", err.Error())
		return
	}
}

// ============================================
// auditkit_siem_connector
// ============================================

var _ resource.Resource = &SIEMConnectorResource{}

type SIEMConnectorResource struct {
	client *APIClient
}

type SIEMConnectorResourceModel struct {
	ID        types.String `tfsdk:"id"`
	ProjectID types.String `tfsdk:"project_id"`
	Type      types.String `tfsdk:"type"`
	Name      types.String `tfsdk:"name"`
	Config    types.String `tfsdk:"config"`
	IsActive  types.Bool   `tfsdk:"is_active"`
}

func NewSIEMConnectorResource() resource.Resource {
	return &SIEMConnectorResource{}
}

func (r *SIEMConnectorResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_siem_connector"
}

func (r *SIEMConnectorResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = resource.Schema{
		Description: "Manages an AuditKit SIEM connector for streaming audit events to external systems.",
		Attributes: map[string]resource.Attribute{
			"id": resource.StringAttribute{
				Computed:    true,
				Description: "The unique identifier of the SIEM connector.",
			},
			"project_id": resource.StringAttribute{
				Required:    true,
				Description: "The project this connector belongs to.",
			},
			"type": resource.StringAttribute{
				Required:    true,
				Description: "The SIEM type (splunk, datadog, s3, custom_http, sentinel, gcs, bigquery, elastic).",
			},
			"name": resource.StringAttribute{
				Required:    true,
				Description: "A descriptive name for the connector.",
			},
			"config": resource.StringAttribute{
				Required:    true,
				Sensitive:   true,
				Description: "JSON string with the connector configuration (endpoints, credentials, etc.).",
			},
			"is_active": resource.BoolAttribute{
				Optional:    true,
				Computed:    true,
				Description: "Whether the connector is active. Defaults to true.",
			},
		},
	}
}

func (r *SIEMConnectorResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*APIClient)
}

func (r *SIEMConnectorResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan SIEMConnectorResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	isActive := true
	if !plan.IsActive.IsNull() {
		isActive = plan.IsActive.ValueBool()
	}

	result, err := r.client.doRequest("POST", "/dashboard/siem", map[string]interface{}{
		"project_id": plan.ProjectID.ValueString(),
		"type":       plan.Type.ValueString(),
		"name":       plan.Name.ValueString(),
		"config":     plan.Config.ValueString(),
		"is_active":  isActive,
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to create SIEM connector", err.Error())
		return
	}

	if id, ok := result["id"].(string); ok {
		plan.ID = types.StringValue(id)
	}
	plan.IsActive = types.BoolValue(isActive)

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *SIEMConnectorResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state SIEMConnectorResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	result, err := r.client.doRequest("GET", "/dashboard/siem/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to read SIEM connector", err.Error())
		return
	}

	if projectID, ok := result["project_id"].(string); ok {
		state.ProjectID = types.StringValue(projectID)
	}
	if t, ok := result["type"].(string); ok {
		state.Type = types.StringValue(t)
	}
	if name, ok := result["name"].(string); ok {
		state.Name = types.StringValue(name)
	}
	if config, ok := result["config"].(string); ok {
		state.Config = types.StringValue(config)
	}
	if isActive, ok := result["is_active"].(bool); ok {
		state.IsActive = types.BoolValue(isActive)
	}

	diags = resp.State.Set(ctx, state)
	resp.Diagnostics.Append(diags...)
}

func (r *SIEMConnectorResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan SIEMConnectorResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("PATCH", "/dashboard/siem/"+plan.ID.ValueString(), map[string]interface{}{
		"project_id": plan.ProjectID.ValueString(),
		"type":       plan.Type.ValueString(),
		"name":       plan.Name.ValueString(),
		"config":     plan.Config.ValueString(),
		"is_active":  plan.IsActive.ValueBool(),
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to update SIEM connector", err.Error())
		return
	}

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *SIEMConnectorResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state SIEMConnectorResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("DELETE", "/dashboard/siem/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to delete SIEM connector", err.Error())
		return
	}
}

// ============================================
// auditkit_redaction_rule
// ============================================

var _ resource.Resource = &RedactionRuleResource{}

type RedactionRuleResource struct {
	client *APIClient
}

type RedactionRuleResourceModel struct {
	ID          types.String `tfsdk:"id"`
	ProjectID   types.String `tfsdk:"project_id"`
	FieldPath   types.String `tfsdk:"field_path"`
	Pattern     types.String `tfsdk:"pattern"`
	Replacement types.String `tfsdk:"replacement"`
	Enabled     types.Bool   `tfsdk:"enabled"`
}

func NewRedactionRuleResource() resource.Resource {
	return &RedactionRuleResource{}
}

func (r *RedactionRuleResource) Metadata(_ context.Context, req resource.MetadataRequest, resp *resource.MetadataResponse) {
	resp.TypeName = req.ProviderTypeName + "_redaction_rule"
}

func (r *RedactionRuleResource) Schema(_ context.Context, _ resource.SchemaRequest, resp *resource.SchemaResponse) {
	resp.Schema = resource.Schema{
		Description: "Manages an AuditKit PII redaction rule that automatically redacts sensitive data from audit events.",
		Attributes: map[string]resource.Attribute{
			"id": resource.StringAttribute{
				Computed:    true,
				Description: "The unique identifier of the redaction rule.",
			},
			"project_id": resource.StringAttribute{
				Required:    true,
				Description: "The project this rule belongs to.",
			},
			"field_path": resource.StringAttribute{
				Required:    true,
				Description: "The JSON path of the field to redact (e.g., metadata.ssn, actor.email).",
			},
			"pattern": resource.StringAttribute{
				Required:    true,
				Description: "The regex pattern to match for redaction.",
			},
			"replacement": resource.StringAttribute{
				Optional:    true,
				Computed:    true,
				Description: "The replacement string. Defaults to [REDACTED].",
			},
			"enabled": resource.BoolAttribute{
				Optional:    true,
				Computed:    true,
				Description: "Whether the rule is enabled. Defaults to true.",
			},
		},
	}
}

func (r *RedactionRuleResource) Configure(_ context.Context, req resource.ConfigureRequest, resp *resource.ConfigureResponse) {
	if req.ProviderData == nil {
		return
	}
	r.client = req.ProviderData.(*APIClient)
}

func (r *RedactionRuleResource) Create(ctx context.Context, req resource.CreateRequest, resp *resource.CreateResponse) {
	var plan RedactionRuleResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	replacement := "[REDACTED]"
	if !plan.Replacement.IsNull() {
		replacement = plan.Replacement.ValueString()
	}

	enabled := true
	if !plan.Enabled.IsNull() {
		enabled = plan.Enabled.ValueBool()
	}

	result, err := r.client.doRequest("POST", "/dashboard/redaction", map[string]interface{}{
		"project_id":  plan.ProjectID.ValueString(),
		"field_path":  plan.FieldPath.ValueString(),
		"pattern":     plan.Pattern.ValueString(),
		"replacement": replacement,
		"enabled":     enabled,
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to create redaction rule", err.Error())
		return
	}

	if id, ok := result["id"].(string); ok {
		plan.ID = types.StringValue(id)
	}
	plan.Replacement = types.StringValue(replacement)
	plan.Enabled = types.BoolValue(enabled)

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *RedactionRuleResource) Read(ctx context.Context, req resource.ReadRequest, resp *resource.ReadResponse) {
	var state RedactionRuleResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	result, err := r.client.doRequest("GET", "/dashboard/redaction/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to read redaction rule", err.Error())
		return
	}

	if projectID, ok := result["project_id"].(string); ok {
		state.ProjectID = types.StringValue(projectID)
	}
	if fieldPath, ok := result["field_path"].(string); ok {
		state.FieldPath = types.StringValue(fieldPath)
	}
	if pattern, ok := result["pattern"].(string); ok {
		state.Pattern = types.StringValue(pattern)
	}
	if replacement, ok := result["replacement"].(string); ok {
		state.Replacement = types.StringValue(replacement)
	}
	if enabled, ok := result["enabled"].(bool); ok {
		state.Enabled = types.BoolValue(enabled)
	}

	diags = resp.State.Set(ctx, state)
	resp.Diagnostics.Append(diags...)
}

func (r *RedactionRuleResource) Update(ctx context.Context, req resource.UpdateRequest, resp *resource.UpdateResponse) {
	var plan RedactionRuleResourceModel
	diags := req.Plan.Get(ctx, &plan)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("PATCH", "/dashboard/redaction/"+plan.ID.ValueString(), map[string]interface{}{
		"project_id":  plan.ProjectID.ValueString(),
		"field_path":  plan.FieldPath.ValueString(),
		"pattern":     plan.Pattern.ValueString(),
		"replacement": plan.Replacement.ValueString(),
		"enabled":     plan.Enabled.ValueBool(),
	})
	if err != nil {
		resp.Diagnostics.AddError("Failed to update redaction rule", err.Error())
		return
	}

	diags = resp.State.Set(ctx, plan)
	resp.Diagnostics.Append(diags...)
}

func (r *RedactionRuleResource) Delete(ctx context.Context, req resource.DeleteRequest, resp *resource.DeleteResponse) {
	var state RedactionRuleResourceModel
	diags := req.State.Get(ctx, &state)
	resp.Diagnostics.Append(diags...)
	if resp.Diagnostics.HasError() {
		return
	}

	_, err := r.client.doRequest("DELETE", "/dashboard/redaction/"+state.ID.ValueString(), nil)
	if err != nil {
		resp.Diagnostics.AddError("Failed to delete redaction rule", err.Error())
		return
	}
}

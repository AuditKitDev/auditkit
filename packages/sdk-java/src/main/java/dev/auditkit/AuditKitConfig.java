package dev.auditkit;

import java.time.Duration;

/**
 * Configuration for the AuditKit client. Use {@link #builder()} to create instances.
 *
 * <pre>{@code
 * AuditKitConfig config = AuditKitConfig.builder()
 *     .apiKey("ak_live_...")
 *     .baseUrl("https://api.auditkit.dev")
 *     .build();
 * }</pre>
 */
public final class AuditKitConfig {

    private final String apiKey;
    private final String baseUrl;
    private final String environment;
    private final int maxRetries;
    private final Duration timeout;
    private final boolean debug;

    private AuditKitConfig(Builder builder) {
        if (builder.apiKey == null || builder.apiKey.isBlank()) {
            throw new IllegalArgumentException("AuditKit: apiKey is required");
        }
        this.apiKey = builder.apiKey;
        this.baseUrl = builder.baseUrl;
        this.environment = builder.environment;
        this.maxRetries = builder.maxRetries;
        this.timeout = builder.timeout;
        this.debug = builder.debug;
    }

    public static Builder builder() {
        return new Builder();
    }

    public String apiKey() { return apiKey; }
    public String baseUrl() { return baseUrl; }
    public String environment() { return environment; }
    public int maxRetries() { return maxRetries; }
    public Duration timeout() { return timeout; }
    public boolean debug() { return debug; }

    public static final class Builder {
        private String apiKey;
        private String baseUrl = "https://api.auditkit.dev";
        private String environment = "production";
        private int maxRetries = 3;
        private Duration timeout = Duration.ofSeconds(30);
        private boolean debug = false;

        private Builder() {}

        public Builder apiKey(String apiKey) {
            this.apiKey = apiKey;
            return this;
        }

        public Builder baseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
            return this;
        }

        public Builder environment(String environment) {
            this.environment = environment;
            return this;
        }

        public Builder maxRetries(int maxRetries) {
            this.maxRetries = maxRetries;
            return this;
        }

        public Builder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }

        public Builder debug(boolean debug) {
            this.debug = debug;
            return this;
        }

        public AuditKitConfig build() {
            return new AuditKitConfig(this);
        }
    }
}

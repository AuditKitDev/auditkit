package dev.auditkit;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * AuditKit client for logging and querying audit events.
 *
 * <pre>{@code
 * AuditKit client = AuditKit.builder()
 *     .apiKey("ak_live_...")
 *     .build();
 *
 * client.log(AuditEvent.builder()
 *     .action("document.updated")
 *     .actorId("user_123")
 *     .actorName("Jane")
 *     .targetType("document")
 *     .targetId("doc_456")
 *     .tenantId("org_acme")
 *     .build());
 * }</pre>
 */
public final class AuditKit implements AutoCloseable {

    public static final String VERSION = "0.1.0";

    private static final Logger LOG = Logger.getLogger(AuditKit.class.getName());

    private final AuditKitConfig config;
    private final HttpClient httpClient;

    private AuditKit(AuditKitConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(config.timeout())
            .build();
    }

    /**
     * Creates a new builder for configuring an AuditKit client.
     */
    public static AuditKitConfig.Builder builder() {
        return AuditKitConfig.builder();
    }

    /**
     * Creates an AuditKit client from the given configuration.
     */
    public static AuditKit create(AuditKitConfig config) {
        return new AuditKit(config);
    }

    /**
     * Convenience: creates a client from a builder directly.
     */
    public static AuditKit create(AuditKitConfig.Builder builder) {
        return new AuditKit(builder.build());
    }

    /**
     * Log a single audit event.
     *
     * @param event the event to log
     * @return parsed ingest response
     * @throws AuditKitException on API errors
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> log(AuditEvent event) {
        var body = toJson(event.toMap());
        var headers = new LinkedHashMap<String, String>();
        if (event.idempotencyKey() != null) {
            headers.put("Idempotency-Key", event.idempotencyKey());
        }
        return (Map<String, Object>) doRequest("POST", "/v1/events", body, headers);
    }

    /**
     * Log multiple audit events at once.
     *
     * @param events the events to log
     * @return parsed bulk ingest response
     * @throws AuditKitException on API errors
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> bulkLog(List<AuditEvent> events) {
        var eventMaps = events.stream().map(AuditEvent::toMap).toList();
        var payload = Map.of("events", eventMaps);
        var body = toJson(payload);
        return (Map<String, Object>) doRequest("POST", "/v1/events/bulk", body, Map.of());
    }

    /**
     * Search audit events.
     *
     * @param query search query string (nullable)
     * @return parsed search response
     * @throws AuditKitException on API errors
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> search(String query) {
        return search(query, Map.of());
    }

    /**
     * Search audit events with additional parameters.
     *
     * @param query  search query string (nullable)
     * @param params additional query parameters (tenant_id, limit, cursor, etc.)
     * @return parsed search response
     * @throws AuditKitException on API errors
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> search(String query, Map<String, String> params) {
        var allParams = new LinkedHashMap<>(params);
        if (query != null && !query.isBlank()) {
            allParams.put("query", query);
        }
        var queryString = buildQueryString(allParams);
        var path = "/v1/events" + (queryString.isEmpty() ? "" : "?" + queryString);
        return (Map<String, Object>) doRequest("GET", path, null, Map.of());
    }

    /**
     * Verify hash chain integrity for a specific event.
     *
     * @param eventId the event ID to verify
     * @return parsed verification result
     * @throws AuditKitException on API errors
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> verify(String eventId) {
        var encodedId = URLEncoder.encode(eventId, StandardCharsets.UTF_8);
        return (Map<String, Object>) doRequest("GET", "/v1/verify/" + encodedId, null, Map.of());
    }

    /**
     * Create a short-lived viewer token for the embedded React viewer.
     *
     * @param tenantId  the tenant to scope the token to
     * @param scopes    optional permission scopes (nullable)
     * @param expiresIn optional expiration duration e.g. "1h" (nullable)
     * @return parsed viewer token response containing token and expires_at
     * @throws AuditKitException on API errors
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> createViewerToken(String tenantId, List<String> scopes, String expiresIn) {
        var payload = new LinkedHashMap<String, Object>();
        payload.put("tenant_id", tenantId);
        if (scopes != null && !scopes.isEmpty()) {
            payload.put("scopes", scopes);
        }
        if (expiresIn != null && !expiresIn.isBlank()) {
            payload.put("expires_in", expiresIn);
        }
        var body = toJson(payload);
        return (Map<String, Object>) doRequest("POST", "/v1/viewer-tokens", body, Map.of());
    }

    /**
     * Create a tenant-scoped client. All subsequent calls automatically set the tenant ID.
     *
     * @param tenantId the tenant ID to scope to
     * @return a new TenantClient
     */
    public TenantClient forTenant(String tenantId) {
        return new TenantClient(this, tenantId);
    }

    @Override
    public void close() {
        // HttpClient doesn't require explicit closing in Java 11+
    }

    // --- Internal ---

    private Object doRequest(String method, String path, String body, Map<String, String> extraHeaders) {
        var url = config.baseUrl().replaceAll("/+$", "") + path;
        Exception lastError = null;

        for (int attempt = 0; attempt <= config.maxRetries(); attempt++) {
            if (config.debug()) {
                LOG.info(() -> String.format("[AuditKit] %s %s (attempt %d)", method, path, attempt + 1));
            }

            try {
                var reqBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + config.apiKey())
                    .header("User-Agent", "auditkit-java/" + VERSION)
                    .header("X-AuditKit-Environment", config.environment())
                    .timeout(config.timeout());

                for (var entry : extraHeaders.entrySet()) {
                    reqBuilder.header(entry.getKey(), entry.getValue());
                }

                if ("POST".equals(method)) {
                    reqBuilder.POST(HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
                } else {
                    reqBuilder.GET();
                }

                var response = httpClient.send(reqBuilder.build(), HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                if (status >= 200 && status < 300) {
                    return parseJson(response.body());
                }

                // Parse error
                Map<String, Object> errorBody;
                try {
                    @SuppressWarnings("unchecked")
                    var parsed = (Map<String, Object>) parseJson(response.body());
                    errorBody = parsed;
                } catch (Exception e) {
                    errorBody = Map.of();
                }

                var errorMsg = errorBody.getOrDefault("message", "HTTP " + status).toString();
                var errorCode = errorBody.getOrDefault("code", "HTTP_ERROR").toString();
                var exception = new AuditKitException(errorMsg, errorCode, status, errorBody);

                // Don't retry 4xx except 429
                if (status >= 400 && status < 500 && status != 429) {
                    throw exception;
                }

                // Handle rate limiting
                if (status == 429) {
                    var retryAfter = response.headers().firstValue("retry-after");
                    if (retryAfter.isPresent() && attempt < config.maxRetries()) {
                        try {
                            long seconds = (long) (Double.parseDouble(retryAfter.get()) * 1000);
                            Thread.sleep(seconds);
                        } catch (NumberFormatException | InterruptedException ignored) {
                        }
                        continue;
                    }
                }

                lastError = exception;

            } catch (AuditKitException e) {
                throw e;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new AuditKitException("Request interrupted", e);
            } catch (IOException e) {
                lastError = e;
            } catch (Exception e) {
                lastError = e;
            }

            // Exponential backoff
            if (attempt < config.maxRetries()) {
                long delay = (long) Math.min(Math.pow(2, attempt) * 1000, 30000);
                try {
                    Thread.sleep(delay);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new AuditKitException("Retry interrupted", e);
                }
            }
        }

        if (lastError instanceof AuditKitException ake) {
            throw ake;
        }
        throw new AuditKitException(
            lastError != null ? lastError.getMessage() : "Unknown error",
            "UNKNOWN",
            0
        );
    }

    // --- Minimal JSON helpers (no external dependency) ---

    private static String toJson(Object obj) {
        if (obj == null) return "null";
        if (obj instanceof String s) return "\"" + escapeJson(s) + "\"";
        if (obj instanceof Number n) return n.toString();
        if (obj instanceof Boolean b) return b.toString();
        if (obj instanceof Map<?, ?> map) {
            var joiner = new StringJoiner(",", "{", "}");
            for (var entry : map.entrySet()) {
                joiner.add("\"" + escapeJson(entry.getKey().toString()) + "\":" + toJson(entry.getValue()));
            }
            return joiner.toString();
        }
        if (obj instanceof List<?> list) {
            var joiner = new StringJoiner(",", "[", "]");
            for (var item : list) {
                joiner.add(toJson(item));
            }
            return joiner.toString();
        }
        return "\"" + escapeJson(obj.toString()) + "\"";
    }

    private static String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    @SuppressWarnings("unchecked")
    private static Object parseJson(String json) {
        json = json.trim();
        if (json.startsWith("{")) return parseJsonObject(json, new int[]{0});
        if (json.startsWith("[")) return parseJsonArray(json, new int[]{0});
        if (json.startsWith("\"")) return parseJsonString(json, new int[]{0});
        if ("true".equals(json)) return true;
        if ("false".equals(json)) return false;
        if ("null".equals(json)) return null;
        try { return Long.parseLong(json); } catch (NumberFormatException e) {}
        try { return Double.parseDouble(json); } catch (NumberFormatException e) {}
        return json;
    }

    private static Map<String, Object> parseJsonObject(String json, int[] pos) {
        var map = new LinkedHashMap<String, Object>();
        pos[0]++; // skip {
        skipWhitespace(json, pos);
        while (pos[0] < json.length() && json.charAt(pos[0]) != '}') {
            skipWhitespace(json, pos);
            if (json.charAt(pos[0]) == ',') { pos[0]++; skipWhitespace(json, pos); continue; }
            if (json.charAt(pos[0]) == '}') break;
            var key = parseJsonString(json, pos);
            skipWhitespace(json, pos);
            pos[0]++; // skip :
            skipWhitespace(json, pos);
            var value = parseJsonValue(json, pos);
            map.put(key, value);
            skipWhitespace(json, pos);
        }
        if (pos[0] < json.length()) pos[0]++; // skip }
        return map;
    }

    private static List<Object> parseJsonArray(String json, int[] pos) {
        var list = new java.util.ArrayList<Object>();
        pos[0]++; // skip [
        skipWhitespace(json, pos);
        while (pos[0] < json.length() && json.charAt(pos[0]) != ']') {
            if (json.charAt(pos[0]) == ',') { pos[0]++; skipWhitespace(json, pos); continue; }
            list.add(parseJsonValue(json, pos));
            skipWhitespace(json, pos);
        }
        if (pos[0] < json.length()) pos[0]++; // skip ]
        return list;
    }

    private static Object parseJsonValue(String json, int[] pos) {
        skipWhitespace(json, pos);
        char c = json.charAt(pos[0]);
        if (c == '{') return parseJsonObject(json, pos);
        if (c == '[') return parseJsonArray(json, pos);
        if (c == '"') return parseJsonString(json, pos);
        if (c == 't') { pos[0] += 4; return true; }
        if (c == 'f') { pos[0] += 5; return false; }
        if (c == 'n') { pos[0] += 4; return null; }
        return parseJsonNumber(json, pos);
    }

    private static String parseJsonString(String json, int[] pos) {
        pos[0]++; // skip opening "
        var sb = new StringBuilder();
        while (pos[0] < json.length()) {
            char c = json.charAt(pos[0]);
            if (c == '\\') {
                pos[0]++;
                char next = json.charAt(pos[0]);
                switch (next) {
                    case '"', '\\', '/' -> sb.append(next);
                    case 'n' -> sb.append('\n');
                    case 'r' -> sb.append('\r');
                    case 't' -> sb.append('\t');
                    case 'u' -> {
                        sb.append((char) Integer.parseInt(json.substring(pos[0] + 1, pos[0] + 5), 16));
                        pos[0] += 4;
                    }
                    default -> sb.append(next);
                }
            } else if (c == '"') {
                pos[0]++;
                return sb.toString();
            } else {
                sb.append(c);
            }
            pos[0]++;
        }
        return sb.toString();
    }

    private static Number parseJsonNumber(String json, int[] pos) {
        int start = pos[0];
        boolean isFloat = false;
        while (pos[0] < json.length()) {
            char c = json.charAt(pos[0]);
            if (c == '.' || c == 'e' || c == 'E') isFloat = true;
            if (Character.isDigit(c) || c == '-' || c == '+' || c == '.' || c == 'e' || c == 'E') {
                pos[0]++;
            } else {
                break;
            }
        }
        var numStr = json.substring(start, pos[0]);
        if (isFloat) return Double.parseDouble(numStr);
        return Long.parseLong(numStr);
    }

    private static void skipWhitespace(String json, int[] pos) {
        while (pos[0] < json.length() && Character.isWhitespace(json.charAt(pos[0]))) {
            pos[0]++;
        }
    }

    private static String buildQueryString(Map<String, String> params) {
        var joiner = new StringJoiner("&");
        for (var entry : params.entrySet()) {
            joiner.add(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8) + "="
                    + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return joiner.toString();
    }
}

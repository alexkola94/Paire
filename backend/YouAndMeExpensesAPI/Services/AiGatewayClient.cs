using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using YouAndMeExpensesAPI.Configuration;
using YouAndMeExpensesAPI.DTOs.AiGateway;

namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// HTTP client for the AI Microservice Gateway.
/// Forwards user JWT or uses X-Gateway-Secret + X-Tenant-Id.
/// </summary>
public class AiGatewayClient : IAiGatewayClient
{
    private readonly HttpClient _httpClient;
    private readonly AiGatewayOptions _options;
    private readonly ILogger<AiGatewayClient> _logger;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public AiGatewayClient(HttpClient httpClient, IOptions<AiGatewayOptions> options, ILogger<AiGatewayClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _httpClient.Timeout = TimeSpan.FromSeconds(120);
    }

    /// <inheritdoc />
    public async Task<GenerateResponse> GenerateAsync(GenerateRequest request, string? accessToken = null, CancellationToken cancellationToken = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1/generate";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        SetAuthHeaders(req, accessToken);
        req.Content = JsonContent.Create(request);
        var response = await _httpClient.SendAsync(req, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, url, cancellationToken);
        var result = await response.Content.ReadFromJsonAsync<GenerateResponse>(JsonOptions, cancellationToken);
        return result ?? throw new InvalidOperationException("AI Gateway returned empty generate response.");
    }

    /// <inheritdoc />
    public async Task<ChatResponse> ChatAsync(ChatRequest request, string? accessToken = null, CancellationToken cancellationToken = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1/chat";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        SetAuthHeaders(req, accessToken);
        req.Content = JsonContent.Create(request);

        var response = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, url, cancellationToken);

        // Gateway returns NDJSON stream; aggregate chunks into a single ChatResponse
        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);
        var contentBuilder = new StringBuilder();
        string? model = null;
        bool fallbackUsed = false;
        long totalDurationNs = 0;
        int? evalCount = null;

        while (await reader.ReadLineAsync(cancellationToken) is { } line)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;
            var chunk = JsonSerializer.Deserialize<ChatStreamChunkDto>(line, JsonOptions);
            if (chunk == null) continue;
            if (!string.IsNullOrEmpty(chunk.Content))
                contentBuilder.Append(chunk.Content);
            if (chunk.Done)
            {
                model = chunk.Model;
                fallbackUsed = chunk.FallbackUsed;
                if (chunk.TotalDuration.HasValue) totalDurationNs = chunk.TotalDuration.Value;
                if (chunk.EvalCount.HasValue) evalCount = chunk.EvalCount.Value;
                break;
            }
        }

        return new ChatResponse
        {
            Message = new ChatMessage { Role = "assistant", Content = contentBuilder.ToString() },
            Model = model ?? "unknown",
            FallbackUsed = fallbackUsed,
            TenantId = _options.TenantId,
            DurationMs = totalDurationNs > 0 ? totalDurationNs / 1_000_000 : 0,
            Timestamp = DateTime.UtcNow,
            Usage = evalCount.HasValue ? new TokenUsage { PromptTokens = 0, CompletionTokens = evalCount.Value } : null
        };
    }

    private void SetAuthHeaders(HttpRequestMessage request, string? accessToken)
    {
        request.Headers.Remove("X-Tenant-Id");
        request.Headers.Add("X-Tenant-Id", _options.TenantId);

        // User JWT: forward so gateway can optionally use it for user context
        if (!string.IsNullOrWhiteSpace(accessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken.Trim());

        // Always send gateway secret when configured so the AI Gateway can authenticate
        // this service and accept the tenant (X-Tenant-Id). Required for tenant resolution
        // when the gateway uses X-Gateway-Secret to validate the caller.
        if (!string.IsNullOrWhiteSpace(_options.GatewaySecret))
            request.Headers.Add("X-Gateway-Secret", _options.GatewaySecret);
    }

    private async Task EnsureSuccessOrThrowAsync(HttpResponseMessage response, string url, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogWarning(
            "AI Gateway request failed: {Url} -> {StatusCode} {ReasonPhrase}. Response body: {Body}. Check gateway logs and Gateway:AllowedTenantIds / X-Tenant-Id / X-Gateway-Secret.",
            url, (int)response.StatusCode, response.ReasonPhrase, body);
        throw new HttpRequestException($"AI Gateway returned {(int)response.StatusCode}: {response.ReasonPhrase}");
    }

    /// <summary>
    /// DTO for a single NDJSON line from /v1/chat stream.
    /// </summary>
    private class ChatStreamChunkDto
    {
        public string Content { get; set; } = string.Empty;
        public bool Done { get; set; }
        public string? Model { get; set; }
        public int? EvalCount { get; set; }
        public long? TotalDuration { get; set; }
        public bool FallbackUsed { get; set; }
    }
}

using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Paire.Modules.AI.Core.DTOs.AiGateway;
using Paire.Modules.AI.Core.Exceptions;
using Paire.Modules.AI.Core.Interfaces;
using Paire.Modules.AI.Core.Options;

namespace Paire.Modules.AI.Infrastructure;

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

    public async Task<ChatResponse> ChatAsync(ChatRequest request, string? accessToken = null, CancellationToken cancellationToken = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1/chat";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        SetAuthHeaders(req, accessToken);
        req.Content = JsonContent.Create(request);

        var response = await _httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, url, cancellationToken);

        var contentType = response.Content.Headers.ContentType?.MediaType ?? "";
        if (contentType.Contains("ndjson", StringComparison.OrdinalIgnoreCase) || contentType.Contains("stream", StringComparison.OrdinalIgnoreCase))
        {
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
                Message = new ChatMessageDto { Role = "assistant", Content = contentBuilder.ToString() },
                Model = model ?? "unknown",
                FallbackUsed = fallbackUsed,
                TenantId = _options.TenantId ?? "",
                DurationMs = totalDurationNs > 0 ? totalDurationNs / 1_000_000 : 0,
                Timestamp = DateTime.UtcNow,
                Usage = evalCount.HasValue ? new TokenUsage { PromptTokens = 0, CompletionTokens = evalCount.Value } : null
            };
        }

        var aggregated = await response.Content.ReadFromJsonAsync<ChatResponse>(JsonOptions, cancellationToken);
        return aggregated ?? throw new InvalidOperationException("AI Gateway returned empty chat response.");
    }

    public async Task PingAiAsync(CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            _logger.LogDebug("AI Gateway warmup skipped because AiGateway is disabled.");
            return;
        }
        var url = $"{_options.BaseUrl.TrimEnd('/')}/health";
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        SetAuthHeaders(req, null);
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(3));
        try
        {
            using var res = await _httpClient.SendAsync(req, cts.Token);
            _logger.LogDebug("AI Gateway warmup ping to {Url} -> {StatusCode}", url, (int)res.StatusCode);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { }
        catch (Exception ex) { _logger.LogDebug(ex, "AI Gateway warmup ping failed for {Url}", url); }
    }

    private void SetAuthHeaders(HttpRequestMessage request, string? accessToken)
    {
        if (!string.IsNullOrWhiteSpace(_options.TenantId))
            request.Headers.TryAddWithoutValidation("X-Tenant-Id", _options.TenantId);
        if (!string.IsNullOrWhiteSpace(accessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken.Trim());
        if (!string.IsNullOrWhiteSpace(_options.GatewaySecret))
            request.Headers.TryAddWithoutValidation("X-Gateway-Secret", _options.GatewaySecret);
    }

    private async Task EnsureSuccessOrThrowAsync(HttpResponseMessage response, string url, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;
        var body = response.Content != null
            ? await response.Content.ReadAsStringAsync(cancellationToken)
            : null;
        body = body?.Trim();
        var detail = string.IsNullOrEmpty(body) ? (response.ReasonPhrase ?? "No response body") : body;
        var bodyPreview = string.IsNullOrEmpty(body) ? "(empty)" : (body.Length > 500 ? body.Substring(0, 500) + "..." : body);
        _logger.LogWarning(
            "AI Gateway request failed: {Url} -> {StatusCode}. Body length: {BodyLength}. Body: {BodyPreview}",
            url, (int)response.StatusCode, body?.Length ?? 0, bodyPreview);
        throw new RemoteServiceException($"AI Gateway returned {(int)response.StatusCode}: {detail}", (int)response.StatusCode, detail);
    }

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

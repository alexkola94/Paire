using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using YouAndMeExpensesAPI.Configuration;
using YouAndMeExpensesAPI.DTOs.AiGateway;

namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// HTTP client for the RAG service. Forwards user JWT or uses X-Gateway-Secret + X-Tenant-Id.
/// Supports document management for automatic per-user context sync.
/// </summary>
public class RagClient : IRagClient
{
    private readonly HttpClient _httpClient;
    private readonly RagServiceOptions _options;
    private readonly ILogger<RagClient> _logger;
    private static readonly System.Text.Json.JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    public RagClient(HttpClient httpClient, IOptions<RagServiceOptions> options, ILogger<RagClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _httpClient.Timeout = TimeSpan.FromSeconds(120);
    }

    /// <inheritdoc />
    public async Task<RagQueryResponse> RagQueryAsync(
        RagQueryRequest request,
        string? category = null,
        string? accessToken = null,
        CancellationToken cancellationToken = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1/query";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        SetAuthHeaders(req, accessToken);

        // For user-scoped category, use more lenient retrieval defaults to improve recall (e.g. TF-IDF fallback)
        var isUserCategory = !string.IsNullOrEmpty(category) && category.StartsWith("user_", StringComparison.OrdinalIgnoreCase);
        var topK = request.TopK ?? (isUserCategory ? 10 : 5);
        var minScore = request.MinRelevanceScore ?? (isUserCategory ? 0.2 : 0.3);

        // RAG service expects { Query, Category, TopK, MinRelevanceScore, ... }
        var body = new { request.Query, Category = category, TopK = topK, MinRelevanceScore = minScore };
        req.Content = JsonContent.Create(body);

        var response = await _httpClient.SendAsync(req, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, url, cancellationToken);

        // RAG service returns { Response, Sources, ... }; map to our DTO
        var dto = await response.Content.ReadFromJsonAsync<RagServiceQueryResponse>(JsonOptions, cancellationToken);
        if (dto == null)
            throw new InvalidOperationException("RAG service returned empty response.");

        return new RagQueryResponse
        {
            Answer = dto.Response ?? string.Empty,
            Sources = dto.Sources?.Select(s => new RagSourceInfo
            {
                Id = s.DocumentId,
                Title = s.Title ?? string.Empty
            }).ToList(),
            RagUsed = dto.RagUsed,
            ChunksRetrieved = dto.ChunksRetrieved
        };
    }

    /// <inheritdoc />
    public async Task<RagDocumentInfo> CreateDocumentAsync(
        string title,
        string content,
        string? category = null,
        string sourceType = "auto_sync",
        string[]? tags = null,
        CancellationToken cancellationToken = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1/documents";
        using var req = new HttpRequestMessage(HttpMethod.Post, url);
        SetAuthHeaders(req, null);

        // Match RAG service CreateDocumentRequest shape
        var body = new
        {
            Title = title,
            Content = content,
            Category = category,
            SourceType = sourceType,
            Tags = tags
        };
        req.Content = JsonContent.Create(body);

        var response = await _httpClient.SendAsync(req, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, url, cancellationToken);

        var dto = await response.Content.ReadFromJsonAsync<RagServiceDocumentDto>(JsonOptions, cancellationToken);
        if (dto == null)
            throw new InvalidOperationException("RAG service returned empty document response.");

        return new RagDocumentInfo
        {
            Id = dto.Id,
            Title = dto.Title ?? title,
            Category = dto.Category,
            SourceType = dto.SourceType,
            IsActive = dto.IsActive,
            ChunkCount = dto.ChunkCount,
            CreatedAt = dto.CreatedAt,
            UpdatedAt = dto.UpdatedAt
        };
    }

    /// <inheritdoc />
    public async Task<RagDocumentListResult> ListDocumentsAsync(
        string? category = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        // Build URL with query params
        var baseUrl = $"{_options.BaseUrl.TrimEnd('/')}/v1/documents";
        var queryParams = new List<string> { $"page={page}", $"pageSize={pageSize}" };
        if (!string.IsNullOrEmpty(category))
            queryParams.Add($"category={Uri.EscapeDataString(category)}");
        var url = $"{baseUrl}?{string.Join("&", queryParams)}";

        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        SetAuthHeaders(req, null);

        var response = await _httpClient.SendAsync(req, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, url, cancellationToken);

        var dto = await response.Content.ReadFromJsonAsync<RagServiceDocumentListResponse>(JsonOptions, cancellationToken);
        if (dto == null)
            throw new InvalidOperationException("RAG service returned empty document list response.");

        return new RagDocumentListResult
        {
            Documents = dto.Documents?.Select(d => new RagDocumentInfo
            {
                Id = d.Id,
                Title = d.Title ?? string.Empty,
                Category = d.Category,
                SourceType = d.SourceType,
                IsActive = d.IsActive,
                ChunkCount = d.ChunkCount,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt
            }).ToList() ?? new List<RagDocumentInfo>(),
            TotalCount = dto.TotalCount,
            Page = dto.Page,
            PageSize = dto.PageSize
        };
    }

    /// <inheritdoc />
    public async Task DeleteDocumentAsync(int documentId, CancellationToken cancellationToken = default)
    {
        var url = $"{_options.BaseUrl.TrimEnd('/')}/v1/documents/{documentId}";
        using var req = new HttpRequestMessage(HttpMethod.Delete, url);
        SetAuthHeaders(req, null);

        var response = await _httpClient.SendAsync(req, cancellationToken);
        await EnsureSuccessOrThrowAsync(response, url, cancellationToken);
    }

    private void SetAuthHeaders(HttpRequestMessage request, string? accessToken)
    {
        request.Headers.Remove("X-Tenant-Id");
        request.Headers.Add("X-Tenant-Id", _options.TenantId);

        if (!string.IsNullOrWhiteSpace(accessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken.Trim());

        if (!string.IsNullOrWhiteSpace(_options.GatewaySecret))
            request.Headers.Add("X-Gateway-Secret", _options.GatewaySecret);
    }

    private async Task EnsureSuccessOrThrowAsync(HttpResponseMessage response, string url, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode) return;
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        _logger.LogWarning("RAG service failed: {Url} -> {StatusCode}. {Body}", url, (int)response.StatusCode, body);
        throw new HttpRequestException($"RAG service returned {(int)response.StatusCode}: {response.ReasonPhrase}");
    }

    #region Internal DTOs matching RAG service response shapes

    /// <summary>
    /// DTO matching RAG service /v1/query response shape.
    /// </summary>
    private class RagServiceQueryResponse
    {
        public string? Response { get; set; }
        public List<RagServiceSourceInfo>? Sources { get; set; }
        public bool RagUsed { get; set; }
        public int ChunksRetrieved { get; set; }
    }

    private class RagServiceSourceInfo
    {
        public int DocumentId { get; set; }
        public string? Title { get; set; }
    }

    /// <summary>
    /// DTO matching RAG service DocumentDto shape.
    /// </summary>
    private class RagServiceDocumentDto
    {
        public int Id { get; set; }
        public string? Title { get; set; }
        public string? Category { get; set; }
        public string? SourceType { get; set; }
        public bool IsActive { get; set; }
        public int ChunkCount { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO matching RAG service DocumentListResponse shape.
    /// </summary>
    private class RagServiceDocumentListResponse
    {
        public List<RagServiceDocumentDto>? Documents { get; set; }
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    #endregion
}

using YouAndMeExpensesAPI.DTOs.AiGateway;

namespace YouAndMeExpensesAPI.Services;

/// <summary>
/// Client for the optional AI Microservice Gateway (generate and chat).
/// </summary>
public interface IAiGatewayClient
{
    /// <summary>
    /// POST /v1/generate - single prompt completion.
    /// </summary>
    /// <param name="request">Generate request body.</param>
    /// <param name="accessToken">Optional Shield JWT; if null, uses X-Gateway-Secret when configured.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task<GenerateResponse> GenerateAsync(GenerateRequest request, string? accessToken = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// POST /v1/chat - multi-turn chat; aggregates streaming response into a single ChatResponse.
    /// </summary>
    Task<ChatResponse> ChatAsync(ChatRequest request, string? accessToken = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Lightweight warmup ping to the AI Gateway used to trigger cold-start spin-up.
    /// Should use a very short timeout and swallow errors.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task PingAiAsync(CancellationToken cancellationToken = default);
}

using Paire.Modules.AI.Core.DTOs.AiGateway;

namespace Paire.Modules.AI.Core.Interfaces;

/// <summary>
/// Client for the optional AI Microservice Gateway (generate and chat).
/// </summary>
public interface IAiGatewayClient
{
    Task<GenerateResponse> GenerateAsync(GenerateRequest request, string? accessToken = null, CancellationToken cancellationToken = default);
    Task<ChatResponse> ChatAsync(ChatRequest request, string? accessToken = null, CancellationToken cancellationToken = default);
    Task PingAiAsync(CancellationToken cancellationToken = default);
}

namespace Paire.Shared.Kernel.Contracts;

/// <summary>
/// Cross-cutting contract for session validation.
/// Used by SessionValidationMiddleware to validate JWT session claims without coupling to Identity internals.
/// </summary>
public interface ISessionValidator
{
    Task<bool> ValidateSessionAsync(string sessionId);
}

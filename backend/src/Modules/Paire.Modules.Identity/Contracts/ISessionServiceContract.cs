namespace Paire.Modules.Identity.Contracts;

/// <summary>
/// Cross-module contract for session validation.
/// Other modules (e.g., Admin) can depend on this to check session validity
/// without taking a dependency on the Identity module internals.
/// </summary>
public interface ISessionServiceContract
{
    /// <summary>
    /// Validate if a session is still active by its token ID.
    /// </summary>
    Task<bool> IsSessionValidAsync(string tokenId);

    /// <summary>
    /// Revoke a session by token ID.
    /// </summary>
    Task RevokeSessionAsync(string tokenId);

    /// <summary>
    /// Revoke all sessions for a user (except an optional excluded token).
    /// </summary>
    Task RevokeAllUserSessionsAsync(string userId, string? excludeTokenId = null);
}

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service interface for managing user sessions
    /// </summary>
    public interface ISessionService
    {
        /// <summary>
        /// Create a new session for a user
        /// </summary>
        Task<string> CreateSessionAsync(string userId, string tokenId, string? refreshToken, string? ipAddress, string? userAgent, DateTime expiresAt);

        /// <summary>
        /// Validate if a session is still active
        /// </summary>
        Task<bool> IsSessionValidAsync(string tokenId);

        /// <summary>
        /// Revoke a session by token ID
        /// </summary>
        Task RevokeSessionAsync(string tokenId);

        /// <summary>
        /// Revoke all sessions for a user (except the current one)
        /// </summary>
        Task RevokeAllUserSessionsAsync(string userId, string? excludeTokenId = null);

        /// <summary>
        /// Update last accessed time for a session
        /// </summary>
        Task UpdateLastAccessedAsync(string tokenId);

        /// <summary>
        /// Get all sessions (for admin monitoring)
        /// </summary>
        Task<List<YouAndMeExpensesAPI.Models.UserSession>> GetAllSessionsAsync();

        /// <summary>
        /// Clean up expired sessions
        /// </summary>
        Task CleanupExpiredSessionsAsync();
    }
}


using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for managing user sessions
    /// Handles session creation, validation, and revocation
    /// </summary>
    public class SessionService : ISessionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<SessionService> _logger;

        public SessionService(AppDbContext context, ILogger<SessionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Create a new session for a user
        /// </summary>
        public async Task<string> CreateSessionAsync(string userId, string tokenId, string? refreshToken, string? ipAddress, string? userAgent, DateTime expiresAt)
        {
            try
            {
                // Hash refresh token for security
                string? refreshTokenHash = null;
                if (!string.IsNullOrEmpty(refreshToken))
                {
                    refreshTokenHash = HashToken(refreshToken);
                }

                var session = new UserSession
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    TokenId = tokenId,
                    RefreshTokenHash = refreshTokenHash,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = expiresAt,
                    LastAccessedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _context.UserSessions.Add(session);
                await _context.SaveChangesAsync();

                _logger.LogInformation($"Session created for user {userId}, token ID: {tokenId}");

                return session.Id.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error creating session for user {userId}");
                throw;
            }
        }

        /// <summary>
        /// Validate if a session is still active
        /// </summary>
        public async Task<bool> IsSessionValidAsync(string tokenId)
        {
            try
            {
                var session = await _context.UserSessions
                    .FirstOrDefaultAsync(s => s.TokenId == tokenId);

                if (session == null)
                {
                    return false;
                }

                // Check if session is active and not expired
                if (!session.IsActive || session.RevokedAt.HasValue)
                {
                    return false;
                }

                if (session.ExpiresAt <= DateTime.UtcNow)
                {
                    // Mark as inactive
                    session.IsActive = false;
                    await _context.SaveChangesAsync();
                    return false;
                }

                // Update last accessed time
                session.LastAccessedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error validating session {tokenId}");
                return false;
            }
        }

        /// <summary>
        /// Revoke a session by token ID
        /// </summary>
        public async Task RevokeSessionAsync(string tokenId)
        {
            try
            {
                var session = await _context.UserSessions
                    .FirstOrDefaultAsync(s => s.TokenId == tokenId);

                if (session != null)
                {
                    session.IsActive = false;
                    session.RevokedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();

                    _logger.LogInformation($"Session revoked: {tokenId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error revoking session {tokenId}");
                throw;
            }
        }

        /// <summary>
        /// Revoke all sessions for a user (except the current one)
        /// </summary>
        public async Task RevokeAllUserSessionsAsync(string userId, string? excludeTokenId = null)
        {
            try
            {
                var sessions = await _context.UserSessions
                    .Where(s => s.UserId == userId && s.IsActive && s.ExpiresAt > DateTime.UtcNow)
                    .ToListAsync();

                var revokedCount = 0;
                foreach (var session in sessions)
                {
                    // Skip the current session if specified
                    if (!string.IsNullOrEmpty(excludeTokenId) && session.TokenId == excludeTokenId)
                    {
                        continue;
                    }

                    session.IsActive = false;
                    session.RevokedAt = DateTime.UtcNow;
                    revokedCount++;
                }

                if (revokedCount > 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Revoked {revokedCount} sessions for user {userId}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error revoking sessions for user {userId}");
                throw;
            }
        }

        /// <summary>
        /// Update last accessed time for a session
        /// </summary>
        public async Task UpdateLastAccessedAsync(string tokenId)
        {
            try
            {
                var session = await _context.UserSessions
                    .FirstOrDefaultAsync(s => s.TokenId == tokenId);

                if (session != null)
                {
                    session.LastAccessedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating last accessed for session {tokenId}");
                // Don't throw - this is a non-critical operation
            }
        }

        /// <summary>
        /// Clean up expired sessions
        /// </summary>
        public async Task CleanupExpiredSessionsAsync()
        {
            try
            {
                var expiredSessions = await _context.UserSessions
                    .Where(s => s.ExpiresAt <= DateTime.UtcNow && s.IsActive)
                    .ToListAsync();

                foreach (var session in expiredSessions)
                {
                    session.IsActive = false;
                }

                if (expiredSessions.Count > 0)
                {
                    await _context.SaveChangesAsync();
                    _logger.LogInformation($"Cleaned up {expiredSessions.Count} expired sessions");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning up expired sessions");
                // Don't throw - this is a background cleanup operation
            }
        }

        /// <summary>
        /// Hash a token using SHA256
        /// </summary>
        private string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }
    }
}


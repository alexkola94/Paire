using System.Collections.Generic;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// JWT token service interface
    /// </summary>
    public interface IJwtTokenService
    {
        /// <summary>
        /// Generate JWT access token for user
        /// </summary>
        string GenerateAccessToken(ApplicationUser user, IList<string> roles);

        /// <summary>
        /// Generate refresh token
        /// </summary>
        string GenerateRefreshToken();

        /// <summary>
        /// Validate token and get user ID
        /// </summary>
        string? ValidateToken(string token);

        /// <summary>
        /// Extract token ID (JTI) from token
        /// </summary>
        string? GetTokenId(string token);
    }
}


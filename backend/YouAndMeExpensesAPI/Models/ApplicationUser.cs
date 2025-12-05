using Microsoft.AspNetCore.Identity;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Application user model extending ASP.NET Core Identity
    /// </summary>
    public class ApplicationUser : IdentityUser
    {
        /// <summary>
        /// Display name for the user (shown in UI as name tag)
        /// </summary>
        public string? DisplayName { get; set; }

        /// <summary>
        /// Avatar/profile picture URL
        /// </summary>
        public string? AvatarUrl { get; set; }

        /// <summary>
        /// When the user account was created
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When the user account was last updated
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Whether email notifications are enabled
        /// </summary>
        public bool EmailNotificationsEnabled { get; set; } = true;

        /// <summary>
        /// Email confirmation token (for custom email verification)
        /// </summary>
        public string? EmailVerificationToken { get; set; }

        /// <summary>
        /// Password reset token
        /// </summary>
        public string? PasswordResetToken { get; set; }

        /// <summary>
        /// When the password reset token expires
        /// </summary>
        public DateTime? PasswordResetTokenExpires { get; set; }

        // =====================================================
        // Two-Factor Authentication Fields
        // =====================================================
        // Note: TwoFactorEnabled is already inherited from IdentityUser

        /// <summary>
        /// Secret key for TOTP two-factor authentication (Base32 encoded)
        /// </summary>
        public string? TwoFactorSecret { get; set; }

        /// <summary>
        /// Backup recovery codes for 2FA (JSON array of hashed codes)
        /// Used when user loses access to their authenticator app
        /// </summary>
        public string? BackupCodes { get; set; }
    }
}


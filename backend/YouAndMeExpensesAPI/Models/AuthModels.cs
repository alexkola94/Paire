using System.ComponentModel.DataAnnotations;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Register request DTO
    /// </summary>
    public class RegisterRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        [Compare("Password")]
        public string ConfirmPassword { get; set; } = string.Empty;

        public string? DisplayName { get; set; }
        
        public bool EmailNotificationsEnabled { get; set; } = true;
        
        public string? SecretKey { get; set; }
    }

    /// <summary>
    /// Login request DTO
    /// </summary>
    public class LoginRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// Authentication response DTO
    /// </summary>
    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime Expires { get; set; }
        public UserDto User { get; set; } = null!;
    }

    /// <summary>
    /// User DTO for responses
    /// </summary>
    public class UserDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
        public bool EmailConfirmed { get; set; }
        public bool TwoFactorEnabled { get; set; }
        public DateTime CreatedAt { get; set; }
        public IList<string> Roles { get; set; } = new List<string>();
    }

    /// <summary>
    /// Email confirmation request
    /// </summary>
    public class ConfirmEmailRequest
    {
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Required]
        public string Token { get; set; } = string.Empty;
    }

    /// <summary>
    /// Forgot password request
    /// </summary>
    public class ForgotPasswordRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }

    /// <summary>
    /// Reset password request
    /// </summary>
    public class ResetPasswordRequest
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        [Compare("NewPassword")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    /// <summary>
    /// Change password request
    /// </summary>
    public class ChangePasswordRequest
    {
        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string NewPassword { get; set; } = string.Empty;

        [Required]
        [Compare("NewPassword")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    /// <summary>
    /// Refresh token request
    /// </summary>
    public class RefreshTokenRequest
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        [Required]
        public string RefreshToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// JWT settings configuration
    /// </summary>
    public class JwtSettings
    {
        public string Secret { get; set; } = string.Empty;
        public string Issuer { get; set; } = string.Empty;
        public string Audience { get; set; } = string.Empty;
        public int ExpirationMinutes { get; set; } = 60;
        public int RefreshTokenExpirationDays { get; set; } = 7;
    }

    // =====================================================
    // Two-Factor Authentication DTOs
    // =====================================================

    /// <summary>
    /// Response when enabling 2FA - contains QR code and secret
    /// </summary>
    public class TwoFactorSetupResponse
    {
        public string Secret { get; set; } = string.Empty;
        public string QrCodeUrl { get; set; } = string.Empty;
        public string ManualEntryKey { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to verify and enable 2FA
    /// </summary>
    public class EnableTwoFactorRequest
    {
        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to disable 2FA
    /// </summary>
    public class DisableTwoFactorRequest
    {
        [Required]
        public string Password { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to verify 2FA code during login
    /// </summary>
    public class VerifyTwoFactorRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// Temporary token received after successful password verification
        /// </summary>
        [Required]
        public string TempToken { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response indicating 2FA is required
    /// </summary>
    public class TwoFactorRequiredResponse
    {
        public bool RequiresTwoFactor { get; set; } = true;
        public string TempToken { get; set; } = string.Empty;
        public string Message { get; set; } = "Two-factor authentication required";
    }

    /// <summary>
    /// Response containing backup codes
    /// </summary>
    public class BackupCodesResponse
    {
        public List<string> Codes { get; set; } = new List<string>();
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request to verify backup code
    /// </summary>
    public class VerifyBackupCodeRequest
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Code { get; set; } = string.Empty;

        [Required]
        public string TempToken { get; set; } = string.Empty;
    }
}


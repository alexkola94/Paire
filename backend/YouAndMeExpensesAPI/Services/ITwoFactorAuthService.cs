namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for Two-Factor Authentication operations using TOTP
    /// </summary>
    public interface ITwoFactorAuthService
    {
        /// <summary>
        /// Generate a new secret key for TOTP
        /// </summary>
        string GenerateSecret();

        /// <summary>
        /// Generate QR code as base64 string for authenticator app setup
        /// </summary>
        string GenerateQrCode(string email, string secret, string issuer = "Paire Expenses");

        /// <summary>
        /// Verify a TOTP code against the user's secret
        /// </summary>
        bool VerifyCode(string secret, string code);

        /// <summary>
        /// Generate backup recovery codes
        /// Returns list of plain text codes (store hashed version in DB)
        /// </summary>
        List<string> GenerateBackupCodes(int count = 10);

        /// <summary>
        /// Hash a backup code for storage
        /// </summary>
        string HashBackupCode(string code);

        /// <summary>
        /// Verify a backup code against hashed codes
        /// </summary>
        bool VerifyBackupCode(string code, List<string> hashedCodes);
    }
}


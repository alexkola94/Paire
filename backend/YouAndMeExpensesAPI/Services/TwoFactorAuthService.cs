using OtpNet;
using QRCoder;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service for handling Two-Factor Authentication using TOTP (Time-based One-Time Password)
    /// Compatible with Google Authenticator, Microsoft Authenticator, Authy, etc.
    /// </summary>
    public class TwoFactorAuthService : ITwoFactorAuthService
    {
        private readonly ILogger<TwoFactorAuthService> _logger;

        public TwoFactorAuthService(ILogger<TwoFactorAuthService> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Generate a new Base32-encoded secret key for TOTP
        /// This secret is shared between the server and the authenticator app
        /// </summary>
        public string GenerateSecret()
        {
            try
            {
                // Generate 20 bytes (160 bits) of random data for the secret
                var key = KeyGeneration.GenerateRandomKey(20);
                
                // Convert to Base32 string (required format for TOTP)
                var base32Secret = Base32Encoding.ToString(key);
                
                _logger.LogInformation("Generated new 2FA secret");
                return base32Secret;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating 2FA secret");
                throw;
            }
        }

        /// <summary>
        /// Generate QR code image as base64 string for easy setup in authenticator apps
        /// Format: otpauth://totp/Issuer:email?secret=SECRET&issuer=Issuer
        /// </summary>
        public string GenerateQrCode(string email, string secret, string issuer = "Paire Expenses")
        {
            try
            {
                // Create the otpauth URI that authenticator apps understand
                var otpauthUrl = $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(email)}?secret={secret}&issuer={Uri.EscapeDataString(issuer)}";

                // Generate QR code
                using var qrGenerator = new QRCodeGenerator();
                var qrCodeData = qrGenerator.CreateQrCode(otpauthUrl, QRCodeGenerator.ECCLevel.Q);
                using var qrCode = new PngByteQRCode(qrCodeData);
                var qrCodeImage = qrCode.GetGraphic(20);

                // Convert to base64 string for easy transmission
                var base64String = Convert.ToBase64String(qrCodeImage);
                
                _logger.LogInformation($"Generated QR code for user: {email}");
                return $"data:image/png;base64,{base64String}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating QR code");
                throw;
            }
        }

        /// <summary>
        /// Verify a 6-digit TOTP code against the user's secret
        /// Allows for time drift (checks current, previous, and next time window)
        /// </summary>
        public bool VerifyCode(string secret, string code)
        {
            try
            {
                // Remove any spaces or dashes from the code
                code = code.Replace(" ", "").Replace("-", "").Trim();

                // Validate code format (must be 6 digits)
                if (code.Length != 6 || !code.All(char.IsDigit))
                {
                    _logger.LogWarning("Invalid 2FA code format");
                    return false;
                }

                // Convert Base32 secret to bytes
                var secretBytes = Base32Encoding.ToBytes(secret);
                
                // Create TOTP instance (30 second time step, standard for most apps)
                var totp = new Totp(secretBytes, step: 30);

                // Verify code with time window tolerance (allows ±1 time step for clock drift)
                // This gives users a 90-second window (30 seconds before, current, 30 seconds after)
                long timeStepMatched;
                var window = new VerificationWindow(previous: 1, future: 1);
                var isValid = totp.VerifyTotp(code, out timeStepMatched, window);

                if (isValid)
                {
                    _logger.LogInformation("2FA code verified successfully");
                }
                else
                {
                    _logger.LogWarning("2FA code verification failed");
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying 2FA code");
                return false;
            }
        }

        /// <summary>
        /// Generate backup recovery codes for account recovery
        /// Returns plain text codes - MUST be hashed before storing in database
        /// </summary>
        public List<string> GenerateBackupCodes(int count = 10)
        {
            try
            {
                var codes = new List<string>();

                for (int i = 0; i < count; i++)
                {
                    // Generate 8 random bytes
                    var bytes = new byte[8];
                    using (var rng = RandomNumberGenerator.Create())
                    {
                        rng.GetBytes(bytes);
                    }

                    // Convert to readable format (XXXX-XXXX pattern)
                    var code = Convert.ToHexString(bytes).ToUpper();
                    var formattedCode = $"{code.Substring(0, 8)}-{code.Substring(8, 8)}";
                    
                    codes.Add(formattedCode);
                }

                _logger.LogInformation($"Generated {count} backup codes");
                return codes;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating backup codes");
                throw;
            }
        }

        /// <summary>
        /// Hash a backup code using SHA256 for secure storage
        /// </summary>
        public string HashBackupCode(string code)
        {
            try
            {
                // Remove formatting for consistency
                code = code.Replace("-", "").Replace(" ", "").Trim().ToUpper();

                using var sha256 = SHA256.Create();
                var bytes = Encoding.UTF8.GetBytes(code);
                var hash = sha256.ComputeHash(bytes);
                
                return Convert.ToBase64String(hash);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error hashing backup code");
                throw;
            }
        }

        /// <summary>
        /// Verify a backup code against stored hashed codes
        /// </summary>
        public bool VerifyBackupCode(string code, List<string> hashedCodes)
        {
            try
            {
                // Hash the provided code
                var hashedInput = HashBackupCode(code);

                // Check if it matches any stored hash
                var isValid = hashedCodes.Contains(hashedInput);

                if (isValid)
                {
                    _logger.LogInformation("Backup code verified successfully");
                }
                else
                {
                    _logger.LogWarning("Backup code verification failed");
                }

                return isValid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying backup code");
                return false;
            }
        }
    }
}


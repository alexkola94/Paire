using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Authentication controller
    /// Handles user registration, login, email confirmation, password reset
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly IEmailService _emailService;
        private readonly ITwoFactorAuthService _twoFactorAuthService;
        private readonly ISessionService _sessionService;
        private readonly AppDbContext _context;
        private readonly ILogger<AuthController> _logger;
        private readonly IConfiguration _configuration;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtTokenService jwtTokenService,
            IEmailService emailService,
            ITwoFactorAuthService twoFactorAuthService,
            ISessionService sessionService,
            AppDbContext context,
            ILogger<AuthController> logger,
            IConfiguration configuration)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtTokenService = jwtTokenService;
            _emailService = emailService;
            _twoFactorAuthService = twoFactorAuthService;
            _sessionService = sessionService;
            _context = context;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Register new user account
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            _logger.LogInformation("Registration attempt for email: {Email}", request?.Email ?? "null");
            
            try
            {
                if (request == null)
                {
                    _logger.LogWarning("Register request body is null");
                    return BadRequest(new { error = "Request body is required" });
                }

                // Check if user already exists in Identity tables
                var existingUser = await _userManager.FindByEmailAsync(request.Email);
                if (existingUser != null)
                {
                    return BadRequest(new { error = "User with this email already exists" });
                }

                // Check if user profile already exists (in case of partial registration)
                var existingProfile = await _context.UserProfiles
                    .FirstOrDefaultAsync(p => p.Email == request.Email);
                
                if (existingProfile != null)
                {
                    return BadRequest(new { error = "A profile with this email already exists" });
                }

                // Create new user
                var user = new ApplicationUser
                {
                    UserName = request.Email,
                    Email = request.Email,
                    DisplayName = request.DisplayName ?? request.Email.Split('@')[0],
                    EmailNotificationsEnabled = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var result = await _userManager.CreateAsync(user, request.Password);

                if (!result.Succeeded)
                {
                    _logger.LogWarning("Failed to create user: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                    return BadRequest(new { 
                        error = "Failed to create user", 
                        details = result.Errors.Select(e => e.Description).ToList() 
                    });
                }

                _logger.LogInformation("User created successfully: {Email}, ID: {UserId}", user.Email, user.Id);

                // Create user profile first (before email operations)
                try
                {
                    var userProfile = await _context.UserProfiles
                        .FirstOrDefaultAsync(p => p.Id == Guid.Parse(user.Id));
                    
                    if (userProfile == null)
                    {
                        _logger.LogInformation("Creating user profile for {Email}", user.Email);
                        userProfile = new UserProfile
                        {
                            Id = Guid.Parse(user.Id),
                            DisplayName = user.DisplayName,
                            Email = user.Email,
                            AvatarUrl = user.AvatarUrl,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };

                        _context.UserProfiles.Add(userProfile);
                        await _context.SaveChangesAsync();
                        _logger.LogInformation("User profile created successfully for {Email}", user.Email);
                    }
                    else
                    {
                        _logger.LogInformation("User profile already exists for {Email}", user.Email);
                    }
                }
                catch (Exception profileEx)
                {
                    _logger.LogError(profileEx, "Error creating user profile for {Email}, but continuing with registration", user.Email);
                    // Continue even if profile creation fails - user can still log in
                }

                // Generate email confirmation token BEFORE starting background task
                // This must be done in the request scope before UserManager is disposed
                _logger.LogInformation("Generating email confirmation token for {Email}", user.Email);
                var emailToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                _logger.LogInformation("Email token generated successfully for {Email}", user.Email);

                // Store user info for background task (since user object might be disposed)
                var userEmail = user.Email;
                var userId = user.Id;
                var userDisplayName = user.DisplayName;

                // Send email in background with retry (token already generated)
                // Do this after profile creation so registration response is not delayed
                // Email confirmation is CRITICAL - user cannot login without it
                _ = Task.Run(async () =>
                {
                    const int maxRetries = 3;
                    const int retryDelayMs = 2000; // 2 seconds between retries
                    
                    for (int attempt = 1; attempt <= maxRetries; attempt++)
                    {
                        try
                        {
                            _logger.LogInformation("Attempt {Attempt}/{MaxRetries}: Sending confirmation email to {Email}", 
                                attempt, maxRetries, userEmail);
                            
                            var emailSent = await SendConfirmationEmailWithRetry(userEmail, userDisplayName, userId, emailToken, attempt, maxRetries);
                            
                            if (emailSent)
                            {
                                _logger.LogInformation("✅ Confirmation email sent successfully to {Email} on attempt {Attempt}", 
                                    userEmail, attempt);
                                return; // Success - exit retry loop
                            }
                            
                            // If email sending failed and we have more retries, wait before retrying
                            if (attempt < maxRetries)
                            {
                                var delay = retryDelayMs * attempt; // Exponential backoff
                                _logger.LogWarning("Email sending failed for {Email} on attempt {Attempt}, retrying in {Delay}ms...", 
                                    userEmail, attempt, delay);
                                await Task.Delay(delay);
                            }
                        }
                        catch (Exception emailEx)
                        {
                            _logger.LogError(emailEx, "Error sending confirmation email to {Email} on attempt {Attempt}/{MaxRetries}", 
                                userEmail, attempt, maxRetries);
                            
                            // If this was the last attempt, log critical error
                            if (attempt == maxRetries)
                            {
                                _logger.LogCritical("❌ CRITICAL: Failed to send confirmation email to {Email} after {MaxRetries} attempts. " +
                                    "User {UserId} cannot login until email is confirmed. User should use /api/auth/resend-confirmation endpoint.", 
                                    userEmail, maxRetries, userId);
                            }
                            else
                            {
                                // Wait before retrying
                                var delay = retryDelayMs * attempt;
                                await Task.Delay(delay);
                            }
                        }
                    }
                });

                _logger.LogInformation("New user registered successfully: {Email}", user.Email);

                return Ok(new 
                { 
                    message = "Registration successful! Please check your email to verify your account.",
                    userId = user.Id,
                    email = user.Email
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during user registration");
                return StatusCode(500, new { error = "An error occurred during registration" });
            }
        }

        /// <summary>
        /// Login user - Step 1: Password verification
        /// Returns auth tokens if 2FA is disabled, or temp token if 2FA is enabled
        /// </summary>
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            _logger.LogInformation($"Login attempt for email: {request?.Email ?? "null"}");
            try
            {
                if (request == null || string.IsNullOrEmpty(request.Email))
                {
                    _logger.LogWarning("Login request is null or email is empty");
                    return BadRequest(new { error = "Email and password are required" });
                }

                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    return Unauthorized(new { error = "Invalid email or password" });
                }

                // Check if email is confirmed
                if (!user.EmailConfirmed)
                {
                    return Unauthorized(new { 
                        error = "Email not confirmed. Please check your email and confirm your account." 
                    });
                }

                var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

                if (!result.Succeeded)
                {
                    if (result.IsLockedOut)
                    {
                        return Unauthorized(new { error = "Account locked due to multiple failed login attempts. Please try again later." });
                    }
                    return Unauthorized(new { error = "Invalid email or password" });
                }

                // Check if 2FA is enabled
                if (user.TwoFactorEnabled && !string.IsNullOrEmpty(user.TwoFactorSecret))
                {
                    // Generate temporary token for 2FA verification (valid for 5 minutes)
                    var tempToken = await _userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultPhoneProvider);
                    
                    _logger.LogInformation($"User requires 2FA: {user.Email}");

                    return Ok(new TwoFactorRequiredResponse
                    {
                        RequiresTwoFactor = true,
                        TempToken = tempToken,
                        Message = "Two-factor authentication required"
                    });
                }

                // No 2FA required - generate tokens and complete login
                var accessToken = _jwtTokenService.GenerateAccessToken(user);
                var refreshToken = _jwtTokenService.GenerateRefreshToken();
                var tokenId = _jwtTokenService.GetTokenId(accessToken);

                // Revoke all existing sessions for this user (except current if same user logs in again)
                if (!string.IsNullOrEmpty(tokenId))
                {
                    await _sessionService.RevokeAllUserSessionsAsync(user.Id, tokenId);
                }

                // Get IP address and user agent for session tracking
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = Request.Headers["User-Agent"].ToString();

                // Create new session
                var expiresAt = DateTime.UtcNow.AddMinutes(60);
                if (!string.IsNullOrEmpty(tokenId))
                {
                    await _sessionService.CreateSessionAsync(
                        user.Id,
                        tokenId,
                        refreshToken,
                        ipAddress,
                        userAgent,
                        expiresAt
                    );
                }

                // Update user's last login
                user.UpdatedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    EmailConfirmed = user.EmailConfirmed,
                    TwoFactorEnabled = user.TwoFactorEnabled,
                    CreatedAt = user.CreatedAt
                };

                var response = new AuthResponse
                {
                    Token = accessToken,
                    RefreshToken = refreshToken,
                    Expires = expiresAt,
                    User = userDto
                };

                _logger.LogInformation($"User logged in: {user.Email}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return StatusCode(500, new { error = "An error occurred during login" });
            }
        }

        /// <summary>
        /// Confirm email address
        /// </summary>
        [HttpPost("confirm-email")]
        public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequest request)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                var result = await _userManager.ConfirmEmailAsync(user, request.Token);
                
                if (!result.Succeeded)
                {
                    return BadRequest(new { 
                        error = "Email confirmation failed", 
                        details = result.Errors.Select(e => e.Description).ToList() 
                    });
                }

                _logger.LogInformation($"Email confirmed for user: {user.Email}");

                return Ok(new { message = "Email confirmed successfully! You can now log in." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming email");
                return StatusCode(500, new { error = "An error occurred during email confirmation" });
            }
        }

        /// <summary>
        /// Request password reset
        /// </summary>
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null || !user.EmailConfirmed)
                {
                    // Don't reveal that the user doesn't exist
                    return Ok(new { message = "If an account with that email exists, a password reset link has been sent." });
                }

                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                
                // Send password reset email
                await SendPasswordResetEmail(user, resetToken);

                _logger.LogInformation($"Password reset requested for: {user.Email}");

                return Ok(new { message = "If an account with that email exists, a password reset link has been sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password reset request");
                return StatusCode(500, new { error = "An error occurred while processing your request" });
            }
        }

        /// <summary>
        /// Reset password
        /// </summary>
        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    return BadRequest(new { error = "Invalid reset token" });
                }

                var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);
                
                if (!result.Succeeded)
                {
                    return BadRequest(new { 
                        error = "Password reset failed", 
                        details = result.Errors.Select(e => e.Description).ToList() 
                    });
                }

                _logger.LogInformation($"Password reset successful for: {user.Email}");

                return Ok(new { message = "Password reset successfully! You can now log in with your new password." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password reset");
                return StatusCode(500, new { error = "An error occurred during password reset" });
            }
        }

        /// <summary>
        /// Change password (authenticated user)
        /// </summary>
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
                
                if (!result.Succeeded)
                {
                    return BadRequest(new { 
                        error = "Password change failed", 
                        details = result.Errors.Select(e => e.Description).ToList() 
                    });
                }

                _logger.LogInformation($"Password changed for: {user.Email}");

                return Ok(new { message = "Password changed successfully!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during password change");
                return StatusCode(500, new { error = "An error occurred during password change" });
            }
        }

        /// <summary>
        /// Get current user info
        /// </summary>
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    EmailConfirmed = user.EmailConfirmed,
                    TwoFactorEnabled = user.TwoFactorEnabled,
                    CreatedAt = user.CreatedAt
                };

                return Ok(userDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user");
                return StatusCode(500, new { error = "An error occurred" });
            }
        }

        /// <summary>
        /// Logout - Revoke current session
        /// Revokes the current session on the server side
        /// </summary>
        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                // Extract token ID from current request
                var tokenId = _jwtTokenService.GetTokenId(Request.Headers["Authorization"].ToString().Replace("Bearer ", ""));
                
                if (!string.IsNullOrEmpty(tokenId))
                {
                    // Revoke the current session
                    await _sessionService.RevokeSessionAsync(tokenId);
                    _logger.LogInformation($"Session revoked: {tokenId}");
                }

                await _signInManager.SignOutAsync();
                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                // Still return success even if revocation fails
                return Ok(new { message = "Logged out successfully" });
            }
        }

        /// <summary>
        /// Resend email confirmation
        /// </summary>
        [HttpPost("resend-confirmation")]
        public async Task<IActionResult> ResendConfirmation([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null || user.EmailConfirmed)
                {
                    return Ok(new { message = "If an unconfirmed account exists, a confirmation email has been sent." });
                }

                var emailToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                await SendConfirmationEmail(user, emailToken);

                return Ok(new { message = "If an unconfirmed account exists, a confirmation email has been sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resending confirmation email");
                return StatusCode(500, new { error = "An error occurred" });
            }
        }

        // =====================================================
        // Two-Factor Authentication Endpoints
        // =====================================================

        /// <summary>
        /// Setup 2FA - Generate secret and QR code for authenticator app
        /// </summary>
        [Authorize]
        [HttpPost("2fa/setup")]
        public async Task<IActionResult> SetupTwoFactor()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                // Generate new secret
                var secret = _twoFactorAuthService.GenerateSecret();
                
                // Store secret temporarily (not enabled yet until verified)
                user.TwoFactorSecret = secret;
                await _userManager.UpdateAsync(user);

                // Generate QR code
                var qrCodeUrl = _twoFactorAuthService.GenerateQrCode(user.Email!, secret);

                _logger.LogInformation($"2FA setup initiated for user: {user.Email}");

                return Ok(new TwoFactorSetupResponse
                {
                    Secret = secret,
                    QrCodeUrl = qrCodeUrl,
                    ManualEntryKey = secret
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting up 2FA");
                return StatusCode(500, new { error = "An error occurred during 2FA setup" });
            }
        }

        /// <summary>
        /// Enable 2FA - Verify code and enable 2FA
        /// </summary>
        [Authorize]
        [HttpPost("2fa/enable")]
        public async Task<IActionResult> EnableTwoFactor([FromBody] EnableTwoFactorRequest request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                if (string.IsNullOrEmpty(user.TwoFactorSecret))
                {
                    return BadRequest(new { error = "2FA not set up. Please call /2fa/setup first." });
                }

                // Verify the code
                if (!_twoFactorAuthService.VerifyCode(user.TwoFactorSecret, request.Code))
                {
                    return BadRequest(new { error = "Invalid verification code" });
                }

                // Generate backup codes
                var backupCodes = _twoFactorAuthService.GenerateBackupCodes();
                var hashedCodes = backupCodes.Select(code => _twoFactorAuthService.HashBackupCode(code)).ToList();
                
                // Enable 2FA
                user.TwoFactorEnabled = true;
                user.BackupCodes = System.Text.Json.JsonSerializer.Serialize(hashedCodes);
                await _userManager.UpdateAsync(user);

                _logger.LogInformation($"2FA enabled for user: {user.Email}");

                return Ok(new BackupCodesResponse
                {
                    Codes = backupCodes,
                    Message = "Two-factor authentication enabled successfully! Save these backup codes in a secure place."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enabling 2FA");
                return StatusCode(500, new { error = "An error occurred while enabling 2FA" });
            }
        }

        /// <summary>
        /// Disable 2FA - Requires password confirmation
        /// </summary>
        [Authorize]
        [HttpPost("2fa/disable")]
        public async Task<IActionResult> DisableTwoFactor([FromBody] DisableTwoFactorRequest request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                // Verify password
                var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
                if (!result.Succeeded)
                {
                    return BadRequest(new { error = "Invalid password" });
                }

                // Disable 2FA
                user.TwoFactorEnabled = false;
                user.TwoFactorSecret = null;
                user.BackupCodes = null;
                await _userManager.UpdateAsync(user);

                _logger.LogInformation($"2FA disabled for user: {user.Email}");

                return Ok(new { message = "Two-factor authentication disabled successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error disabling 2FA");
                return StatusCode(500, new { error = "An error occurred while disabling 2FA" });
            }
        }

        /// <summary>
        /// Verify 2FA code during login - Step 2 of login process
        /// </summary>
        [HttpPost("2fa/verify")]
        public async Task<IActionResult> VerifyTwoFactor([FromBody] VerifyTwoFactorRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    return Unauthorized(new { error = "Invalid request" });
                }

                // Verify temp token
                var isValidTempToken = await _userManager.VerifyTwoFactorTokenAsync(
                    user, 
                    TokenOptions.DefaultPhoneProvider, 
                    request.TempToken);

                if (!isValidTempToken)
                {
                    return Unauthorized(new { error = "Invalid or expired temporary token" });
                }

                if (string.IsNullOrEmpty(user.TwoFactorSecret))
                {
                    return BadRequest(new { error = "2FA not configured" });
                }

                // Verify 2FA code
                if (!_twoFactorAuthService.VerifyCode(user.TwoFactorSecret, request.Code))
                {
                    return Unauthorized(new { error = "Invalid verification code" });
                }

                // Generate tokens and complete login
                var accessToken = _jwtTokenService.GenerateAccessToken(user);
                var refreshToken = _jwtTokenService.GenerateRefreshToken();
                var tokenId = _jwtTokenService.GetTokenId(accessToken);

                // Revoke all existing sessions for this user
                if (!string.IsNullOrEmpty(tokenId))
                {
                    await _sessionService.RevokeAllUserSessionsAsync(user.Id, tokenId);
                }

                // Get IP address and user agent for session tracking
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = Request.Headers["User-Agent"].ToString();

                // Create new session
                var expiresAt = DateTime.UtcNow.AddMinutes(60);
                if (!string.IsNullOrEmpty(tokenId))
                {
                    await _sessionService.CreateSessionAsync(
                        user.Id,
                        tokenId,
                        refreshToken,
                        ipAddress,
                        userAgent,
                        expiresAt
                    );
                }

                // Update user's last login
                user.UpdatedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    EmailConfirmed = user.EmailConfirmed,
                    TwoFactorEnabled = user.TwoFactorEnabled,
                    CreatedAt = user.CreatedAt
                };

                var response = new AuthResponse
                {
                    Token = accessToken,
                    RefreshToken = refreshToken,
                    Expires = expiresAt,
                    User = userDto
                };

                _logger.LogInformation($"User logged in with 2FA: {user.Email}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying 2FA code");
                return StatusCode(500, new { error = "An error occurred during verification" });
            }
        }

        /// <summary>
        /// Verify backup code during login - Alternative to 2FA code
        /// </summary>
        [HttpPost("2fa/verify-backup")]
        public async Task<IActionResult> VerifyBackupCode([FromBody] VerifyBackupCodeRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    return Unauthorized(new { error = "Invalid request" });
                }

                // Verify temp token
                var isValidTempToken = await _userManager.VerifyTwoFactorTokenAsync(
                    user, 
                    TokenOptions.DefaultPhoneProvider, 
                    request.TempToken);

                if (!isValidTempToken)
                {
                    return Unauthorized(new { error = "Invalid or expired temporary token" });
                }

                if (string.IsNullOrEmpty(user.BackupCodes))
                {
                    return BadRequest(new { error = "No backup codes available" });
                }

                // Deserialize backup codes
                var hashedCodes = System.Text.Json.JsonSerializer.Deserialize<List<string>>(user.BackupCodes);
                if (hashedCodes == null || hashedCodes.Count == 0)
                {
                    return BadRequest(new { error = "No backup codes available" });
                }

                // Verify backup code
                if (!_twoFactorAuthService.VerifyBackupCode(request.Code, hashedCodes))
                {
                    return Unauthorized(new { error = "Invalid backup code" });
                }

                // Remove used backup code
                var hashedInput = _twoFactorAuthService.HashBackupCode(request.Code);
                hashedCodes.Remove(hashedInput);
                user.BackupCodes = System.Text.Json.JsonSerializer.Serialize(hashedCodes);
                await _userManager.UpdateAsync(user);

                // Generate tokens and complete login
                var accessToken = _jwtTokenService.GenerateAccessToken(user);
                var refreshToken = _jwtTokenService.GenerateRefreshToken();
                var tokenId = _jwtTokenService.GetTokenId(accessToken);

                // Revoke all existing sessions for this user
                if (!string.IsNullOrEmpty(tokenId))
                {
                    await _sessionService.RevokeAllUserSessionsAsync(user.Id, tokenId);
                }

                // Get IP address and user agent for session tracking
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = Request.Headers["User-Agent"].ToString();

                // Create new session
                var expiresAt = DateTime.UtcNow.AddMinutes(60);
                if (!string.IsNullOrEmpty(tokenId))
                {
                    await _sessionService.CreateSessionAsync(
                        user.Id,
                        tokenId,
                        refreshToken,
                        ipAddress,
                        userAgent,
                        expiresAt
                    );
                }

                // Update user's last login
                user.UpdatedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    EmailConfirmed = user.EmailConfirmed,
                    TwoFactorEnabled = user.TwoFactorEnabled,
                    CreatedAt = user.CreatedAt
                };

                var response = new AuthResponse
                {
                    Token = accessToken,
                    RefreshToken = refreshToken,
                    Expires = expiresAt,
                    User = userDto
                };

                _logger.LogInformation($"User logged in with backup code: {user.Email}");

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying backup code");
                return StatusCode(500, new { error = "An error occurred during verification" });
            }
        }

        /// <summary>
        /// Regenerate backup codes - Requires password confirmation
        /// </summary>
        [Authorize]
        [HttpPost("2fa/regenerate-backup-codes")]
        public async Task<IActionResult> RegenerateBackupCodes([FromBody] DisableTwoFactorRequest request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                if (!user.TwoFactorEnabled)
                {
                    return BadRequest(new { error = "2FA is not enabled" });
                }

                // Verify password
                var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: false);
                if (!result.Succeeded)
                {
                    return BadRequest(new { error = "Invalid password" });
                }

                // Generate new backup codes
                var backupCodes = _twoFactorAuthService.GenerateBackupCodes();
                var hashedCodes = backupCodes.Select(code => _twoFactorAuthService.HashBackupCode(code)).ToList();
                
                user.BackupCodes = System.Text.Json.JsonSerializer.Serialize(hashedCodes);
                await _userManager.UpdateAsync(user);

                _logger.LogInformation($"Backup codes regenerated for user: {user.Email}");

                return Ok(new BackupCodesResponse
                {
                    Codes = backupCodes,
                    Message = "Backup codes regenerated successfully! Save these in a secure place."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error regenerating backup codes");
                return StatusCode(500, new { error = "An error occurred while regenerating backup codes" });
            }
        }

        /// <summary>
        /// Get 2FA status for current user
        /// </summary>
        [Authorize]
        [HttpGet("2fa/status")]
        public async Task<IActionResult> GetTwoFactorStatus()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { error = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { error = "User not found" });
                }

                return Ok(new 
                { 
                    twoFactorEnabled = user.TwoFactorEnabled,
                    hasBackupCodes = !string.IsNullOrEmpty(user.BackupCodes)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting 2FA status");
                return StatusCode(500, new { error = "An error occurred" });
            }
        }

        // =====================================================
        // Private Helper Methods
        // =====================================================

        /// <summary>
        /// Send email confirmation email with retry logic (for background tasks)
        /// </summary>
        private async Task<bool> SendConfirmationEmailWithRetry(string userEmail, string? userDisplayName, string userId, string token, int attempt, int maxRetries)
        {
            try
            {
                await SendConfirmationEmail(userEmail, userDisplayName, userId, token);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send confirmation email to {Email} on attempt {Attempt}/{MaxRetries}", 
                    userEmail, attempt, maxRetries);
                return false;
            }
        }

        /// <summary>
        /// Send email confirmation email (overload for ApplicationUser)
        /// </summary>
        private async Task SendConfirmationEmail(ApplicationUser user, string token)
        {
            await SendConfirmationEmail(user.Email!, user.DisplayName, user.Id, token);
        }

        /// <summary>
        /// Send email confirmation email
        /// </summary>
        private async Task SendConfirmationEmail(string userEmail, string? userDisplayName, string userId, string token)
        {
            // Get frontend URL from configuration
            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:5173";
            
            // Generate frontend confirmation URL (frontend will handle the UI and call the backend API)
            var confirmUrl = $"{frontendUrl}/confirm-email?userId={userId}&token={Uri.EscapeDataString(token)}";

            var emailBody = $@"
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        <h2 style='color: #4CAF50;'>Welcome to You & Me Expenses! 🎉</h2>
        
        <p>Hi {userDisplayName ?? "User"},</p>
        
        <p>Thank you for registering! Please confirm your email address by clicking the button below:</p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{confirmUrl}' 
               style='display: inline-block; padding: 12px 30px; background: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;'>
                Confirm Email Address
            </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style='word-break: break-all; color: #666; font-size: 12px;'>{confirmUrl}</p>
        
        <p>If you didn't create an account, please ignore this email.</p>
        
        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'/>
        <p style='font-size: 12px; color: #999;'>
            You & Me Expenses - Shared Finance Management
        </p>
    </div>
</body>
</html>";

            var emailMessage = new EmailMessage
            {
                ToEmail = userEmail,
                ToName = userDisplayName ?? "User",
                Subject = "Confirm Your Email - You & Me Expenses",
                Body = emailBody,
                IsHtml = true
            };

            var emailSent = await _emailService.SendEmailAsync(emailMessage);
            if (!emailSent)
            {
                throw new InvalidOperationException($"Failed to send confirmation email to {userEmail}. Email service returned false.");
            }
        }

        /// <summary>
        /// Send password reset email
        /// </summary>
        private async Task SendPasswordResetEmail(ApplicationUser user, string token)
        {
            // Get frontend URL from configuration
            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:5173";
            
            // Generate frontend reset URL (frontend will handle the UI and call the backend API)
            var resetUrl = $"{frontendUrl}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(user.Email!)}";

            var emailBody = $@"
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        <h2 style='color: #FF9800;'>Password Reset Request</h2>
        
        <p>Hi {user.DisplayName},</p>
        
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style='text-align: center; margin: 30px 0;'>
            <a href='{resetUrl}' 
               style='display: inline-block; padding: 12px 30px; background: #FF9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;'>
                Reset Password
            </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style='word-break: break-all; color: #666; font-size: 12px;'>{resetUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
        
        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'/>
        <p style='font-size: 12px; color: #999;'>
            You & Me Expenses - Shared Finance Management
        </p>
    </div>
</body>
</html>";

            var emailMessage = new EmailMessage
            {
                ToEmail = user.Email!,
                ToName = user.DisplayName ?? "User",
                Subject = "Password Reset - You & Me Expenses",
                Body = emailBody,
                IsHtml = true
            };

            await _emailService.SendEmailAsync(emailMessage);
        }
    }
}


using System.Text.Json;
using System.Security.Claims;
using Google.Apis.Auth;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Identity.Core.Interfaces;
using Paire.Modules.Identity.Core.Services;
using Paire.Modules.Identity.Infrastructure;
using Paire.Shared.Infrastructure.Email;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Paire.Modules.Identity.Api.Controllers
{
    /// <summary>
    /// Authentication controller (Proxy to Shield)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IShieldAuthService _shieldAuthService;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly IJwtTokenService _jwtTokenService;
        private readonly ISessionService _sessionService;
        // TODO: Replace IdentityDbContext with IdentityDbContext when created
        private readonly IdentityDbContext _context;
        private readonly IUserSyncService _userSyncService;
        // TODO: IEmailService belongs to Notifications module - use cross-module contract
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly IStreakService _streakService;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IShieldAuthService shieldAuthService,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtTokenService jwtTokenService,
            ISessionService sessionService,
            IdentityDbContext context,
            IUserSyncService userSyncService,
            IEmailService emailService,
            IConfiguration configuration,
            IStreakService streakService,
            ILogger<AuthController> logger)
        {
            _shieldAuthService = shieldAuthService;
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtTokenService = jwtTokenService;
            _sessionService = sessionService;
            _context = context;
            _userSyncService = userSyncService;
            _emailService = emailService;
            _configuration = configuration;
            _streakService = streakService;
            _logger = logger;
        }

        // ==================================================================================
        // PROXY ENDPOINTS TO SHIELD
        // ==================================================================================

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var shieldResponse = await _shieldAuthService.LoginAsync(new { Username = request.Email, request.Password });

            if (!shieldResponse.IsSuccess)
            {
                return HandleProxyResponse(shieldResponse);
            }

            try 
            {
                var responseData = JsonSerializer.Deserialize<JsonElement>(shieldResponse.Content);
                var accessToken = responseData.TryGetProperty("accessToken", out var at) ? at.GetString() : null;
                var refreshToken = responseData.TryGetProperty("refreshToken", out var rt) ? rt.GetString() : null;

                if (!string.IsNullOrEmpty(accessToken))
                {
                    var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                    var jwt = handler.ReadJwtToken(accessToken);
                    
                    var identity = new ClaimsIdentity(jwt.Claims);
                    var principal = new ClaimsPrincipal(identity);
                    
                    var user = await _userSyncService.SyncUserAsync(principal);
                    
                    if (user != null)
                    {
                        var roles = await _userManager.GetRolesAsync(user);
                        var userDto = new UserDto
                        {
                           Id = user.Id,
                           Email = user.Email!,
                           DisplayName = user.DisplayName,
                           AvatarUrl = user.AvatarUrl,
                           EmailConfirmed = user.EmailConfirmed,
                           TwoFactorEnabled = user.TwoFactorEnabled,
                           CreatedAt = user.CreatedAt,
                           Roles = roles
                        };

                        return Ok(new 
                        { 
                            token = accessToken, 
                            refreshToken, 
                            user = userDto 
                        });
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing login response");
            }

            return HandleProxyResponse(shieldResponse);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Request body is required", errors = new[] { "Email, password and confirmPassword are required." } });
            }
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(new { message = "Validation failed", errors });
            }

            var tenantId = Request.Headers["X-Tenant-Id"].FirstOrDefault() ?? "thepaire";

            var payload = new
            {
                Username = request.Email,
                request.Email,
                request.Password,
                FullName = request.DisplayName ?? string.Empty
            };

            var response = await _shieldAuthService.RegisterAsync(payload, tenantId);

            if (!response.IsSuccess)
            {
                _logger.LogWarning("Shield register returned {StatusCode}: {Content}", response.StatusCode, response.Content);
            }
            
            if (response.IsSuccess)
            {
                try
                {
                    using var doc = JsonDocument.Parse(response.Content);
                    if (doc.RootElement.TryGetProperty("emailConfirmationToken", out var tokenProp) && 
                        doc.RootElement.TryGetProperty("userId", out var userIdProp))
                    {
                        var token = tokenProp.GetString();
                        var userId = userIdProp.GetString();

                        if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(userId))
                        {
                            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                            if (frontendUrl.Contains(';')) frontendUrl = frontendUrl.Split(';')[0].Trim();

                            var verifyLink = $"{frontendUrl}/confirm-email?token={System.Net.WebUtility.UrlEncode(token)}&userId={System.Net.WebUtility.UrlEncode(userId)}";
                            // TODO: _emailService.CreateVerificationEmailTemplate is from Notifications module
                            var emailBody = _emailService.CreateVerificationEmailTemplate(verifyLink);
                            var emailMessage = new EmailMessage
                            {
                                ToEmail = request.Email,
                                Subject = "Verify Your Email - Paire",
                                Body = emailBody,
                                IsHtml = true
                            };

                            await _emailService.SendEmailAsync(emailMessage);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending registration verification email");
                }
            }

            return HandleProxyResponse(response);
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.RefreshToken))
                return BadRequest(new { error = "Refresh token is required" });

            var shieldResponse = await _shieldAuthService.RefreshTokenAsync(request);
            if (shieldResponse.IsSuccess && shieldResponse.StatusCode >= 200 && shieldResponse.StatusCode < 300)
                return HandleProxyResponse(shieldResponse);

            var sessionInfo = await _sessionService.GetSessionByRefreshTokenAsync(request.RefreshToken);
            if (sessionInfo == null)
                return HandleProxyResponse(shieldResponse);

            var (userId, oldTokenId) = sessionInfo.Value;
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return Unauthorized(new { error = "User not found" });

            var roles = await _userManager.GetRolesAsync(user);
            var accessToken = _jwtTokenService.GenerateAccessToken(user, roles);
            var newRefreshToken = _jwtTokenService.GenerateRefreshToken();
            var tokenId = _jwtTokenService.GetTokenId(accessToken) ?? Guid.NewGuid().ToString();
            var jwtSettings = _configuration.GetSection("JwtSettings").Get<JwtSettings>() ?? new JwtSettings();
            var expiresAt = DateTime.UtcNow.AddDays(jwtSettings.RefreshTokenExpirationDays > 0 ? jwtSettings.RefreshTokenExpirationDays : 7);

            await _sessionService.RevokeSessionAsync(oldTokenId);
            await _sessionService.CreateSessionAsync(userId, tokenId, newRefreshToken, null, null, expiresAt);

            var userDto = new UserDto
            {
                Id = user.Id,
                Email = user.Email!,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                EmailConfirmed = user.EmailConfirmed,
                TwoFactorEnabled = user.TwoFactorEnabled,
                CreatedAt = user.CreatedAt,
                Roles = roles
            };

            try { await _streakService.RecordActivityAsync(user.Id, "login"); }
            catch (Exception streakEx) { _logger.LogWarning(streakEx, "Failed to record login streak"); }

            return Ok(new { token = accessToken, refreshToken = newRefreshToken, user = userDto });
        }

        /// <summary>
        /// Sign in with Google ID token (from Google Identity Services).
        /// Creates or finds user; returns same shape as login (token, refreshToken, user).
        /// </summary>
        [HttpPost("google")]
        public async Task<IActionResult> Google([FromBody] GoogleLoginRequest googleRequest)
        {
            if (googleRequest == null || string.IsNullOrWhiteSpace(googleRequest.IdToken))
                return BadRequest(new { error = "ID token is required" });

            var clientId = _configuration["Google:ClientId"];
            if (string.IsNullOrEmpty(clientId))
            {
                _logger.LogWarning("Google:ClientId is not configured");
                return StatusCode(500, new { error = "Google sign-in is not configured" });
            }

            GoogleJsonWebSignature.Payload? payload;
            try
            {
                var validationSettings = new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } };
                payload = await GoogleJsonWebSignature.ValidateAsync(googleRequest.IdToken, validationSettings);
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogWarning(ex, "Invalid Google ID token");
                return BadRequest(new { error = "Invalid Google sign-in. Please try again." });
            }

            if (payload == null)
                return BadRequest(new { error = "Invalid Google sign-in. Please try again." });

            var email = payload.Email;
            if (string.IsNullOrEmpty(email))
                return BadRequest(new { error = "Google account did not provide an email." });

            var name = payload.Name ?? payload.GivenName ?? email.Split('@')[0];

            var existingUser = await _userManager.FindByEmailAsync(email);
            if (existingUser != null && !string.IsNullOrEmpty(existingUser.PasswordHash))
                return BadRequest(new { error = "This email is already registered. Please sign in with your password." });

            ApplicationUser? user;
            if (existingUser != null)
                user = existingUser;
            else
                user = await _userSyncService.SyncUserFromGoogleAsync(email, name);

            if (user == null)
                return StatusCode(500, new { error = "Failed to create or find user." });

            var roles = await _userManager.GetRolesAsync(user);
            var accessToken = _jwtTokenService.GenerateAccessToken(user, roles);
            var refreshToken = _jwtTokenService.GenerateRefreshToken();
            var tokenId = _jwtTokenService.GetTokenId(accessToken) ?? Guid.NewGuid().ToString();
            var jwtSettings = _configuration.GetSection("JwtSettings").Get<JwtSettings>() ?? new JwtSettings();
            var expiresAt = DateTime.UtcNow.AddDays(jwtSettings.RefreshTokenExpirationDays > 0 ? jwtSettings.RefreshTokenExpirationDays : 7);

            var ipAddress = Request.HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = Request.Headers.UserAgent.ToString();
            await _sessionService.CreateSessionAsync(user.Id, tokenId, refreshToken, ipAddress, userAgent, expiresAt);

            var userDto = new UserDto
            {
                Id = user.Id,
                Email = user.Email!,
                DisplayName = user.DisplayName,
                AvatarUrl = user.AvatarUrl,
                EmailConfirmed = user.EmailConfirmed,
                TwoFactorEnabled = user.TwoFactorEnabled,
                CreatedAt = user.CreatedAt,
                Roles = roles
            };

            return Ok(new { token = accessToken, refreshToken, user = userDto });
        }

        [Authorize]
        [HttpPost("revoke")]
        public async Task<IActionResult> Revoke()
            => HandleProxyResponse(await _shieldAuthService.RevokeAsync(GetToken()));

        /// <summary>
        /// Request a password reset email.
        /// SECURITY: Always returns a generic response to prevent user enumeration.
        /// The reset token is NEVER exposed to the client - only sent via email.
        /// </summary>
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                var response = await _shieldAuthService.ForgotPasswordAsync(request);

                if (response.IsSuccess)
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(response.Content);
                        if (doc.RootElement.TryGetProperty("passwordResetToken", out var tokenProp))
                        {
                            var token = tokenProp.GetString();
                            if (!string.IsNullOrEmpty(token))
                            {
                                var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                                if (frontendUrl.Contains(';')) frontendUrl = frontendUrl.Split(';')[0].Trim();

                                var resetLink = $"{frontendUrl}/reset-password?token={System.Net.WebUtility.UrlEncode(token)}&email={System.Net.WebUtility.UrlEncode(request.Email)}";
                                
                                // TODO: _emailService.CreatePasswordResetEmailTemplate is from Notifications module
                                var emailBody = _emailService.CreatePasswordResetEmailTemplate(resetLink);
                                var emailMessage = new EmailMessage
                                {
                                    ToEmail = request.Email,
                                    Subject = "Reset Your Password - Paire",
                                    Body = emailBody,
                                    IsHtml = true
                                };

                                await _emailService.SendEmailAsync(emailMessage);
                                _logger.LogInformation("Password reset email sent to {Email}", request.Email);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error sending forgot password email for {Email}", request.Email);
                    }
                }
                else
                {
                    _logger.LogWarning("Forgot password request failed for {Email}: Shield returned non-success", request.Email);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Forgot password request error for {Email}", request.Email);
            }

            return Ok(new { 
                status = "Success", 
                message = "If this email is registered, a password reset link has been sent." 
            });
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
            => HandleProxyResponse(await _shieldAuthService.ResetPasswordAsync(new { request.Email, request.Token, request.NewPassword }));

        [HttpPost("verify-email")]
        [HttpPost("confirm-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] ConfirmEmailRequest request)
            => HandleProxyResponse(await _shieldAuthService.VerifyEmailAsync(new { request.UserId, request.Token }));

        [HttpPost("resend-verification-email")]
        [HttpPost("resend-confirmation")]
        public async Task<IActionResult> ResendConfirmation([FromBody] ForgotPasswordRequest request)
        {
            var response = await _shieldAuthService.ResendVerificationEmailAsync(request);

            if (response.IsSuccess)
            {
                try
                {
                    using var doc = JsonDocument.Parse(response.Content);
                    if (doc.RootElement.TryGetProperty("emailConfirmationToken", out var tokenProp) &&
                        doc.RootElement.TryGetProperty("userId", out var userIdProp))
                    {
                        var token = tokenProp.GetString();
                        var userId = userIdProp.GetString();

                        if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(userId))
                        {
                            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                            if (frontendUrl.Contains(';')) frontendUrl = frontendUrl.Split(';')[0].Trim();

                            var verifyLink = $"{frontendUrl}/confirm-email?token={System.Net.WebUtility.UrlEncode(token)}&userId={System.Net.WebUtility.UrlEncode(userId)}";
                            // TODO: _emailService.CreateVerificationEmailTemplate is from Notifications module
                            var emailBody = _emailService.CreateVerificationEmailTemplate(verifyLink);
                            var emailMessage = new EmailMessage
                            {
                                ToEmail = request.Email,
                                Subject = "Verify Your Email - Paire",
                                Body = emailBody,
                                IsHtml = true
                            };

                            await _emailService.SendEmailAsync(emailMessage);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending resend verification email");
                }
            }

            return HandleProxyResponse(response);
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
            => HandleProxyResponse(await _shieldAuthService.ChangePasswordAsync(request, GetToken()));

        [Authorize]
        [HttpDelete("delete-account")]
        public async Task<IActionResult> DeleteAccount([FromBody] LoginRequest request)
            => HandleProxyResponse(await _shieldAuthService.DeleteAccountAsync(new { request.Password }, GetToken()));

        [Authorize]
        [HttpGet("user-tenant")]
        public async Task<IActionResult> GetUserTenant()
            => HandleProxyResponse(await _shieldAuthService.GetUserTenantAsync(GetToken()));

        // ==================================================================================
        // TWO-FACTOR AUTHENTICATION PROXY ENDPOINTS
        // ==================================================================================

        [Authorize]
        [HttpPost("2fa/setup")]
        public async Task<IActionResult> Setup2FA()
            => HandleProxyResponse(await _shieldAuthService.Setup2FAAsync(GetToken()));

        [Authorize]
        [HttpPost("2fa/enable")]
        public async Task<IActionResult> Enable2FA([FromBody] object request)
        {
            var response = await _shieldAuthService.Enable2FAAsync(request, GetToken());
            if (response.StatusCode >= 200 && response.StatusCode < 300)
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    var user = await _userManager.FindByIdAsync(userId);
                    if (user != null)
                    {
                        user.TwoFactorEnabled = true;
                        await _userManager.UpdateAsync(user);
                    }
                }
            }
            return HandleProxyResponse(response);
        }

        [Authorize]
        [HttpPost("2fa/disable")]
        public async Task<IActionResult> Disable2FA([FromBody] object request)
        {
            var response = await _shieldAuthService.Disable2FAAsync(request, GetToken());
            if (response.StatusCode >= 200 && response.StatusCode < 300)
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (!string.IsNullOrEmpty(userId))
                {
                    var user = await _userManager.FindByIdAsync(userId);
                    if (user != null)
                    {
                        user.TwoFactorEnabled = false;
                        await _userManager.UpdateAsync(user);
                    }
                }
            }
            return HandleProxyResponse(response);
        }

        [HttpPost("2fa/verify")]
        public async Task<IActionResult> Verify2FA([FromBody] object request)
            => HandleProxyResponse(await _shieldAuthService.Verify2FAAsync(request));

        [HttpPost("2fa/verify-backup")]
        public async Task<IActionResult> VerifyBackupCode([FromBody] object request)
            => HandleProxyResponse(await _shieldAuthService.VerifyBackupCodeAsync(request));

        [Authorize]
        [HttpPost("2fa/regenerate-backup-codes")]
        public async Task<IActionResult> RegenerateBackupCodes([FromBody] object request)
            => HandleProxyResponse(await _shieldAuthService.RegenerateBackupCodesAsync(request, GetToken()));

        [Authorize]
        [HttpGet("2fa/status")]
        public async Task<IActionResult> Get2FAStatus()
            => HandleProxyResponse(await _shieldAuthService.Get2FAStatusAsync(GetToken()));

        // ==================================================================================
        // LOCAL ENDPOINTS (Resource Server Logic)
        // ==================================================================================

        /// <summary>
        /// Get current user info &amp; Synchronize Shadow User
        /// </summary>
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var user = await _userSyncService.SyncUserAsync(User);
                
                if (user == null)
                    return Unauthorized(new { error = "User sync failed. Invalid token or claims." });

                var roles = await _userManager.GetRolesAsync(user);

                var userDto = new UserDto
                {
                    Id = user.Id,
                    Email = user.Email!,
                    DisplayName = user.DisplayName,
                    AvatarUrl = user.AvatarUrl,
                    EmailConfirmed = user.EmailConfirmed,
                    TwoFactorEnabled = user.TwoFactorEnabled,
                    CreatedAt = user.CreatedAt,
                    Roles = roles
                };

                return Ok(userDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user");
                return StatusCode(500, new { error = "An error occurred" });
            }
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                await _shieldAuthService.RevokeAsync(GetToken());
                
                var tokenId = _jwtTokenService.GetTokenId(GetToken());
                if (!string.IsNullOrEmpty(tokenId))
                {
                    await _sessionService.RevokeSessionAsync(tokenId);
                }

                await _signInManager.SignOutAsync();
                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return Ok(new { message = "Logged out successfully" });
            }
        }

        // ==================================================================================
        // HELPERS
        // ==================================================================================

        private IActionResult HandleProxyResponse(ProxyAuthResponse response)
        {
             return new ContentResult
             {
                 Content = response.Content,
                 ContentType = response.ContentType,
                 StatusCode = response.StatusCode
             };
        }

        private string GetToken()
        {
            return Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        }
    }
}

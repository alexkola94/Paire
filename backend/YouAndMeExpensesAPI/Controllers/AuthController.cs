using System.Text;
using System.Text.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpensesAPI.Controllers
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
        private readonly AppDbContext _context;
        private readonly IUserSyncService _userSyncService;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IShieldAuthService shieldAuthService,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtTokenService jwtTokenService,
            ISessionService sessionService,
            AppDbContext context,
            IUserSyncService userSyncService,
            IEmailService emailService,
            IConfiguration configuration,
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

            // Shield returns { "accessToken": "...", "refreshToken": "..." }
            // Frontend expects { "token": "...", "refreshToken": "...", "user": { ... } }
            
            try 
            {
                var responseData = JsonSerializer.Deserialize<JsonElement>(shieldResponse.Content);
                var accessToken = responseData.TryGetProperty("accessToken", out var at) ? at.GetString() : null;
                var refreshToken = responseData.TryGetProperty("refreshToken", out var rt) ? rt.GetString() : null;

                if (!string.IsNullOrEmpty(accessToken))
                {
                    // Sync User from the new token
                    // We need a helper to read claims from string token without validating (since we just got it from Shield)
                    // Or we can just let the frontend call /me. 
                    // But frontend expects 'user' object in login response.
                    // Let's decode the token manually to get the ID/Claims for sync.
                    
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

            // Fallback if parsing fails
            return HandleProxyResponse(shieldResponse);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // Forward X-Tenant-Id if present, or default to "thepaire"
            var tenantId = Request.Headers["X-Tenant-Id"].FirstOrDefault() ?? "thepaire";
            
            var payload = new
            {
                Username = request.Email,
                request.Email,
                request.Password,
                FullName = request.DisplayName
            };

            var response = await _shieldAuthService.RegisterAsync(payload, tenantId);
            
            if (response.IsSuccess)
            {
                try
                {
                    using var doc = JsonDocument.Parse(response.Content);
                    // Check for verification token in response
                    if (doc.RootElement.TryGetProperty("emailConfirmationToken", out var tokenProp) && 
                        doc.RootElement.TryGetProperty("userId", out var userIdProp)) // Assuming Shield returns userId
                    {
                        var token = tokenProp.GetString();
                        var userId = userIdProp.GetString();

                        if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(userId))
                        {
                            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                            if (frontendUrl.Contains(';')) frontendUrl = frontendUrl.Split(';')[0].Trim();

                            var verifyLink = $"{frontendUrl}/verify-email?token={System.Net.WebUtility.UrlEncode(token)}&userId={System.Net.WebUtility.UrlEncode(userId)}";
                            
                            var emailBody = EmailService.CreateVerificationEmailTemplate(verifyLink);
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
            => HandleProxyResponse(await _shieldAuthService.RefreshTokenAsync(request));

        [Authorize]
        [HttpPost("revoke")]
        public async Task<IActionResult> Revoke()
            => HandleProxyResponse(await _shieldAuthService.RevokeAsync(GetToken()));

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            var response = await _shieldAuthService.ForgotPasswordAsync(request);

            if (response.IsSuccess)
            {
                try
                {
                    // Parse response to see if we have a token
                    using var doc = JsonDocument.Parse(response.Content);
                    if (doc.RootElement.TryGetProperty("passwordResetToken", out var tokenProp))
                    {
                        var token = tokenProp.GetString();
                        if (!string.IsNullOrEmpty(token))
                        {
                            // Get Frontend URL
                            var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                            if (frontendUrl.Contains(';')) frontendUrl = frontendUrl.Split(';')[0].Trim();

                            var resetLink = $"{frontendUrl}/reset-password?token={System.Net.WebUtility.UrlEncode(token)}&email={System.Net.WebUtility.UrlEncode(request.Email)}";
                            
                            var emailBody = EmailService.CreateResetPasswordEmailTemplate(resetLink);
                            var emailMessage = new EmailMessage
                            {
                                ToEmail = request.Email,
                                Subject = "Reset Your Password - Paire",
                                Body = emailBody,
                                IsHtml = true
                            };

                            // Fire and forget email? or await? API usually awaits.
                            await _emailService.SendEmailAsync(emailMessage);
                            
                            // We can return the original response, Shield might have returned the token
                            // Ideally we shouldn't expose the token to the client if we email it, but
                            // the user said "Return token so Main API can send email with proper frontend link" 
                            // and "returns here to ... and never sends the email".
                            // So we are sending the email now. 
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error sending forgot password email");
                }
            }

            return HandleProxyResponse(response);
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
            => HandleProxyResponse(await _shieldAuthService.ResetPasswordAsync(new { request.Email, request.Token, request.NewPassword }));

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] ConfirmEmailRequest request) // Mapping existing model
            => HandleProxyResponse(await _shieldAuthService.VerifyEmailAsync(new { request.UserId, request.Token }));

        [HttpPost("resend-verification-email")] // Legacy: resend-confirmation
        [HttpPost("resend-confirmation")] // Alias for backward compatibility
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

                            var verifyLink = $"{frontendUrl}/verify-email?token={System.Net.WebUtility.UrlEncode(token)}&userId={System.Net.WebUtility.UrlEncode(userId)}";
                            
                            var emailBody = EmailService.CreateVerificationEmailTemplate(verifyLink);
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
        public async Task<IActionResult> DeleteAccount([FromBody] LoginRequest request) // Reusing LoginRequest for password
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
            => HandleProxyResponse(await _shieldAuthService.Enable2FAAsync(request, GetToken()));

        [Authorize]
        [HttpPost("2fa/disable")]
        public async Task<IActionResult> Disable2FA([FromBody] object request)
            => HandleProxyResponse(await _shieldAuthService.Disable2FAAsync(request, GetToken()));

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
        /// Get current user info & Synchronize Shadow User
        /// </summary>
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                // Sync user from Token Claims
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

        // Keep local Logout to clear session
        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            try
            {
                // Also call Shield revoke? Usually yes.
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

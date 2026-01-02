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
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IShieldAuthService shieldAuthService,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtTokenService jwtTokenService,
            ISessionService sessionService,
            AppDbContext context,
            IUserSyncService userSyncService,
            ILogger<AuthController> logger)
        {
            _shieldAuthService = shieldAuthService;
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtTokenService = jwtTokenService;
            _sessionService = sessionService;
            _context = context;
            _userSyncService = userSyncService;
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
            => HandleProxyResponse(await _shieldAuthService.ForgotPasswordAsync(request));

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
            => HandleProxyResponse(await _shieldAuthService.ResetPasswordAsync(new { request.Email, request.Token, request.NewPassword }));

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] ConfirmEmailRequest request) // Mapping existing model
            => HandleProxyResponse(await _shieldAuthService.VerifyEmailAsync(new { request.UserId, request.Token }));

        [HttpPost("resend-verification-email")] // Legacy: resend-confirmation
        [HttpPost("resend-confirmation")] // Alias for backward compatibility
        public async Task<IActionResult> ResendConfirmation([FromBody] ForgotPasswordRequest request)
            => HandleProxyResponse(await _shieldAuthService.ResendVerificationEmailAsync(request));

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

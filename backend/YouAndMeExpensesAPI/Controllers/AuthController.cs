using System.Text;
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
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IShieldAuthService shieldAuthService,
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            IJwtTokenService jwtTokenService,
            ISessionService sessionService,
            AppDbContext context,
            ILogger<AuthController> logger)
        {
            _shieldAuthService = shieldAuthService;
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtTokenService = jwtTokenService;
            _sessionService = sessionService;
            _context = context;
            _logger = logger;
        }

        // ==================================================================================
        // PROXY ENDPOINTS TO SHIELD
        // ==================================================================================

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
            => HandleProxyResponse(await _shieldAuthService.LoginAsync(new { Username = request.Email, request.Password }));

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request, [FromServices] RoleManager<IdentityRole> roleManager)
        {
            // Forward X-Tenant-Id if present
            var tenantId = Request.Headers["X-Tenant-Id"].FirstOrDefault();
            
            var payload = new
            {
                Username = request.Email,
                request.Email,
                request.Password,
                FullName = request.DisplayName
            };

            var response = await _shieldAuthService.RegisterAsync(payload, tenantId);
            
            // If Shield registration succeeded, check for Admin Secret Key
            if (response.IsSuccess && !string.IsNullOrEmpty(request.SecretKey))
            {
                try 
                {
                    // Verify Secret Key (In production, use config/KV)
                    const string AdminSecretKey = "AdminSecretKey123!@#"; 
                    if (request.SecretKey == AdminSecretKey)
                    {
                         _logger.LogInformation("Admin Secret Key matched for {Email}. Assigning Admin role.", request.Email);
                         
                         // We need the user to exist locally. Shield created it in the DB (Shared DB assumption).
                         // Wait for a moment or try to find immediately?
                         // Ideally, find immediately.
                         var user = await _userManager.FindByEmailAsync(request.Email);
                         if (user != null)
                         {
                             if (!await roleManager.RoleExistsAsync("Admin"))
                             {
                                 await roleManager.CreateAsync(new IdentityRole { Name = "Admin" });
                             }
                             await _userManager.AddToRoleAsync(user, "Admin");
                         }
                         else
                         {
                             _logger.LogWarning("User {Email} not found locally after Shield creation. Separation of concern?", request.Email);
                         }
                    }
                }
                catch (Exception ex)
                {
                     _logger.LogError(ex, "Error assigning admin role after registration");
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
        /// Get current user info & Lazy Initialize Profile
        /// </summary>
        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { error = "User not authenticated" });

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                    return NotFound(new { error = "User not found in system" });

                await EnsureUserProfileExists(user);

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

        private async Task EnsureUserProfileExists(ApplicationUser user)
        {
            try 
            {
                var userProfile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.Id == Guid.Parse(user.Id));
                if (userProfile == null)
                {
                    _logger.LogInformation("Lazy-initializing user profile for {Email}", user.Email);
                    userProfile = new UserProfile
                    {
                        Id = Guid.Parse(user.Id),
                        DisplayName = user.DisplayName ?? user.Email?.Split('@')[0],
                        Email = user.Email,
                        AvatarUrl = user.AvatarUrl,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.UserProfiles.Add(userProfile);
                    
                    var preferences = await _context.ReminderPreferences.FirstOrDefaultAsync(p => p.UserId == Guid.Parse(user.Id));
                    if (preferences == null)
                    {
                        _context.ReminderPreferences.Add(new ReminderPreferences
                        {
                            Id = Guid.NewGuid(),
                            UserId = Guid.Parse(user.Id),
                            EmailEnabled = user.EmailNotificationsEnabled,
                            BillRemindersEnabled = true,
                            BillReminderDays = 3,
                            LoanRemindersEnabled = true,
                            LoanReminderDays = 7,
                            BudgetAlertsEnabled = true,
                            BudgetAlertThreshold = 90,
                            SavingsMilestonesEnabled = true,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                    await _context.SaveChangesAsync();
                }
            }
            catch(Exception ex)
            {
                _logger.LogError(ex, "Failed to lazy-initialize profile for {Email}", user.Email);
            }
        }

        private string GetToken()
        {
            return Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        }
    }
}

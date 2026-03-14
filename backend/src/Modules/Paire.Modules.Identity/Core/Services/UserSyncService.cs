using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Identity.Core.Interfaces;
using Paire.Modules.Identity.Infrastructure;

namespace Paire.Modules.Identity.Core.Services
{
    public class UserSyncService : IUserSyncService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        // TODO: Replace IdentityDbContext with IdentityDbContext when created
        private readonly IdentityDbContext _context;
        private readonly ILogger<UserSyncService> _logger;

        public UserSyncService(
            UserManager<ApplicationUser> userManager,
            IdentityDbContext context,
            ILogger<UserSyncService> logger)
        {
            _userManager = userManager;
            _context = context;
            _logger = logger;
        }

        public async Task<ApplicationUser?> SyncUserAsync(ClaimsPrincipal principal)
        {
            try
            {
                var email = principal.FindFirst(ClaimTypes.Email)?.Value 
                            ?? principal.FindFirst("email")?.Value
                            ?? principal.FindFirst(ClaimTypes.Name)?.Value;

                if (string.IsNullOrEmpty(email))
                {
                    _logger.LogWarning("Cannot sync user: Missing Email/Name in claims. Claims found: {Claims}", 
                        string.Join(", ", principal.Claims.Select(c => $"{c.Type}={c.Value}")));
                    return null;
                }

                var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                  ?? principal.FindFirst("sub")?.Value 
                                  ?? principal.FindFirst("uid")?.Value;

                string? userId = userIdClaim;

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogInformation("User ID claim missing. Attempting lookup by Email: {Email}", email);
                    var existingUser = await _userManager.FindByEmailAsync(email);
                    if (existingUser != null)
                    {
                        userId = existingUser.Id;
                    }
                    else
                    {
                        userId = Guid.NewGuid().ToString();
                        _logger.LogInformation("Generated new local ID for Shadow User: {Id}", userId);
                    }
                }

                var name = principal.FindFirst("name")?.Value 
                           ?? principal.FindFirst(ClaimTypes.GivenName)?.Value 
                           ?? email.Split('@')[0];

                return await EnsureShadowUserAsync(userId, email, name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error syncing user from claims.");
                return null;
            }
        }

        public async Task<ApplicationUser?> SyncUserExplicitAsync(string userId, string email, string displayName)
        {
             return await EnsureShadowUserAsync(userId, email, displayName);
        }

        public async Task<ApplicationUser?> SyncUserFromGoogleAsync(string email, string? displayName)
        {
            var userId = Guid.NewGuid().ToString();
            _logger.LogInformation("Creating user from Google sign-in for {Email}", email);
            return await EnsureShadowUserAsync(userId, email, displayName ?? email.Split('@')[0]);
        }

        private async Task<ApplicationUser?> EnsureShadowUserAsync(string userId, string email, string? displayName)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogInformation("Creating Shadow User for {Email} ({Id})", email, userId);
                    user = new ApplicationUser
                    {
                        Id = userId,
                        UserName = email,
                        Email = email,
                        EmailConfirmed = true,
                        DisplayName = displayName,
                        CreatedAt = DateTime.UtcNow,
                        SecurityStamp = Guid.NewGuid().ToString()
                    };
                    
                    var result = await _userManager.CreateAsync(user);
                    if (!result.Succeeded)
                    {
                        _logger.LogError("Failed to create Shadow User: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                        return null;
                    }
                }

                var profile = await _context.UserProfiles.FirstOrDefaultAsync(p => p.Id == Guid.Parse(userId));
                if (profile == null)
                {
                    _logger.LogInformation("Creating UserProfile for {Email}", email);
                    profile = new UserProfile
                    {
                        Id = Guid.Parse(userId),
                        Email = email,
                        DisplayName = displayName ?? email.Split('@')[0],
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.UserProfiles.Add(profile);
                    
                    await _context.SaveChangesAsync();
                    
                    // TODO: Phase 6 -- publish UserCreatedEvent so Notifications module
                    // can create default ReminderPreferences for this user
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to ensure shadow user.");
                throw;
            }
        }
    }
}

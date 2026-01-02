using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IUserSyncService
    {
        /// <summary>
        /// Synchronizes the local Shadow User and Profile with the provided claims.
        /// </summary>
        Task<ApplicationUser?> SyncUserAsync(ClaimsPrincipal principal);

        /// <summary>
        /// Synchronizes the local Shadow User and Profile with explicit data (e.g. from Register response).
        /// </summary>
        Task<ApplicationUser?> SyncUserExplicitAsync(string userId, string email, string displayName);
    }

    public class UserSyncService : IUserSyncService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly AppDbContext _context;
        private readonly ILogger<UserSyncService> _logger;

        public UserSyncService(
            UserManager<ApplicationUser> userManager,
            AppDbContext context,
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
                // 1. Extract Email (Critical for lookup)
                var email = principal.FindFirst(ClaimTypes.Email)?.Value 
                            ?? principal.FindFirst("email")?.Value
                            ?? principal.FindFirst(ClaimTypes.Name)?.Value; // Log shows Name has the email

                if (string.IsNullOrEmpty(email))
                {
                    _logger.LogWarning("Cannot sync user: Missing Email/Name in claims. Claims found: {Claims}", 
                        string.Join(", ", principal.Claims.Select(c => $"{c.Type}={c.Value}")));
                    return null;
                }

                // 2. Extract ID (May be missing in Shield JWT)
                var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                                  ?? principal.FindFirst("sub")?.Value 
                                  ?? principal.FindFirst("uid")?.Value;

                string userId = userIdClaim;

                // 3. If ID is missing, try to resolve by Email
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
                        // New Shadow User -> Generate new ID
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

        private async Task<ApplicationUser?> EnsureShadowUserAsync(string userId, string email, string? displayName)
        {
            try
            {
                // 1. Check ApplicationUser (Identity)
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _logger.LogInformation("Creating Shadow User for {Email} ({Id})", email, userId);
                    user = new ApplicationUser
                    {
                        Id = userId, // KEY: Use external ID
                        UserName = email,
                        Email = email,
                        EmailConfirmed = true, // Trusted from Shield
                        DisplayName = displayName,
                        CreatedAt = DateTime.UtcNow,
                        SecurityStamp = Guid.NewGuid().ToString() // Required for some Identity checks
                    };
                    
                    // We must use CreateAsync but without password
                    var result = await _userManager.CreateAsync(user);
                    if (!result.Succeeded)
                    {
                        _logger.LogError("Failed to create Shadow User: {Errors}", string.Join(", ", result.Errors.Select(e => e.Description)));
                        return null;
                    }
                }
                else
                {
                    // Optional: Update email/name if changed?
                    // For now, let's keep it simple. Only sync if critical? 
                    // Let's assume Email is immutable or handled via separate flow for now to avoid locking.
                }

                // 2. Check UserProfile (App Data)
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
                    
                    // Add default preferences
                    _context.ReminderPreferences.Add(new ReminderPreferences
                    {
                        Id = Guid.NewGuid(),
                        UserId = Guid.Parse(userId),
                        EmailEnabled = true,
                        BillRemindersEnabled = true,
                        LoanRemindersEnabled = true,
                        BudgetAlertsEnabled = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                    
                    await _context.SaveChangesAsync();
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

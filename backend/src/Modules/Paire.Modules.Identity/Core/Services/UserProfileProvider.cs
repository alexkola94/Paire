using Microsoft.EntityFrameworkCore;
using Paire.Modules.Identity.Contracts;
using Paire.Modules.Identity.Infrastructure;

namespace Paire.Modules.Identity.Core.Services;

/// <summary>
/// Cross-module implementation of IUserProfileProvider.
/// Allows Travel, Shopping, Notifications, etc. to resolve display names and avatars.
/// </summary>
public class UserProfileProvider : IUserProfileProvider
{
    private readonly IdentityDbContext _db;

    public UserProfileProvider(IdentityDbContext db)
    {
        _db = db;
    }

    public async Task<string?> GetDisplayNameAsync(Guid userId)
    {
        var profile = await _db.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == userId);
        return profile?.DisplayName;
    }

    public async Task<string?> GetAvatarUrlAsync(Guid userId)
    {
        var profile = await _db.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == userId);
        return profile?.AvatarUrl;
    }

    public async Task<UserProfileInfo?> GetProfileInfoAsync(Guid userId)
    {
        var profile = await _db.UserProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == userId);
        if (profile == null)
            return null;

        return new UserProfileInfo
        {
            Id = profile.Id,
            DisplayName = profile.DisplayName ?? string.Empty,
            Email = profile.Email,
            AvatarUrl = profile.AvatarUrl
        };
    }
}

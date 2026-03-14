using Microsoft.EntityFrameworkCore;
using Paire.Modules.Partnership.Contracts;
using Paire.Modules.Partnership.Core.Entities;
using Paire.Modules.Partnership.Infrastructure;

namespace Paire.Modules.Partnership.Core.Services;

public class PartnershipResolver : IPartnershipResolver
{
    private readonly PartnershipDbContext _dbContext;

    public PartnershipResolver(PartnershipDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<string?> GetPartnerUserIdAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var uid)) return null;

        var partnership = await _dbContext.Partnerships
            .AsNoTracking()
            .FirstOrDefaultAsync(p =>
                p.Status == PartnershipStatus.Active &&
                (p.User1Id == uid || p.User2Id == uid));

        if (partnership == null) return null;
        return (partnership.User1Id == uid ? partnership.User2Id : partnership.User1Id).ToString();
    }

    public async Task<bool> ArePartnersAsync(string userId1, string userId2)
    {
        if (!Guid.TryParse(userId1, out var uid1) || !Guid.TryParse(userId2, out var uid2)) return false;

        return await _dbContext.Partnerships.AnyAsync(p =>
            p.Status == PartnershipStatus.Active &&
            ((p.User1Id == uid1 && p.User2Id == uid2) || (p.User1Id == uid2 && p.User2Id == uid1)));
    }

    public async Task<List<string>> GetHouseholdUserIdsAsync(string userId)
    {
        if (!Guid.TryParse(userId, out var uid)) return new List<string> { userId };

        var partnerId = await GetPartnerUserIdAsync(userId);
        var ids = new List<string> { userId };
        if (partnerId != null) ids.Add(partnerId);
        return ids;
    }
}

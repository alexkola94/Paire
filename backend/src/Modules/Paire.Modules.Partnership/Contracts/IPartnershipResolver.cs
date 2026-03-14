namespace Paire.Modules.Partnership.Contracts;

/// <summary>
/// Cross-module contract for resolving partnership relationships.
/// Used by Finance, Travel, Analytics modules to get partner context.
/// </summary>
public interface IPartnershipResolver
{
    Task<string?> GetPartnerUserIdAsync(string userId);
    Task<bool> ArePartnersAsync(string userId1, string userId2);
    Task<List<string>> GetHouseholdUserIdsAsync(string userId);
}

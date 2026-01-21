using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Controllers;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service contract for managing partnerships and invitations.
    /// </summary>
    public interface IPartnershipService
    {
        Task<IReadOnlyList<object>> GetMyPartnershipsAsync(Guid userId);
        Task<Partnership> CreatePartnershipAsync(Guid userId, Guid partnerId);
        Task SendInvitationAsync(Guid userId, SendInvitationRequest request);
        Task<IReadOnlyList<object>> GetPendingInvitationsAsync(Guid userId);
        Task<(bool success, string message, Guid? partnershipId)> AcceptInvitationAsync(Guid userId, string token);
        Task<object?> GetInvitationDetailsAsync(string token);
        Task<bool> EndPartnershipAsync(Guid userId, Guid partnershipId);
    }
}


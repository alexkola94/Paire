using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Partnership.Api.Controllers;
using Paire.Modules.Partnership.Core.Entities;
using Paire.Modules.Partnership.Core.Interfaces;
using Paire.Modules.Partnership.Infrastructure;
using Paire.Shared.Infrastructure.Email;

namespace Paire.Modules.Partnership.Core.Services;

public class PartnershipService : IPartnershipService
{
    private readonly PartnershipDbContext _dbContext;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ILogger<PartnershipService> _logger;

    public PartnershipService(
        PartnershipDbContext dbContext,
        IEmailService emailService,
        IConfiguration configuration,
        UserManager<ApplicationUser> userManager,
        ILogger<PartnershipService> logger)
    {
        _dbContext = dbContext;
        _emailService = emailService;
        _configuration = configuration;
        _userManager = userManager;
        _logger = logger;
    }

    public async Task<IReadOnlyList<object>> GetMyPartnershipsAsync(Guid userId)
    {
        var partnerships = await _dbContext.Partnerships
            .Where(p => p.User1Id == userId || p.User2Id == userId)
            .AsNoTracking()
            .ToListAsync();

        var responseList = new List<object>();
        foreach (var partnership in partnerships)
        {
            var user1 = await _dbContext.UserProfiles.AsNoTracking().FirstOrDefaultAsync(u => u.Id == partnership.User1Id);
            var user2 = await _dbContext.UserProfiles.AsNoTracking().FirstOrDefaultAsync(u => u.Id == partnership.User2Id);

            responseList.Add(new
            {
                id = partnership.Id,
                user1_id = partnership.User1Id,
                user2_id = partnership.User2Id,
                user1 = user1 != null ? new { id = user1.Id, email = user1.Email, display_name = user1.DisplayName, avatar_url = user1.AvatarUrl } : null,
                user2 = user2 != null ? new { id = user2.Id, email = user2.Email, display_name = user2.DisplayName, avatar_url = user2.AvatarUrl } : null,
                created_at = partnership.CreatedAt
            });
        }
        return responseList;
    }

    public async Task<Entities.Partnership> CreatePartnershipAsync(Guid userId, Guid partnerId)
    {
        var existing = await _dbContext.Partnerships.FirstOrDefaultAsync(p =>
            (p.User1Id == userId && p.User2Id == partnerId) || (p.User1Id == partnerId && p.User2Id == userId));
        if (existing != null) throw new InvalidOperationException("You already have an active partnership with this user");

        var partnerExists = await _dbContext.UserProfiles.AnyAsync(u => u.Id == partnerId);
        if (!partnerExists) throw new KeyNotFoundException("Partner user not found");

        var partnership = new Entities.Partnership
        {
            Id = Guid.NewGuid(),
            User1Id = userId,
            User2Id = partnerId,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Partnerships.Add(partnership);
        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Partnership created between {User1} and {User2}", userId, partnerId);

        // TODO: Phase 6 -- publish PartnershipCreatedEvent for Analytics achievements
        return partnership;
    }

    public async Task SendInvitationAsync(Guid userId, SendInvitationRequest request)
    {
        var inviteeUser = await _userManager.FindByEmailAsync(request.Email.ToLower());
        if (inviteeUser == null)
        {
            _logger.LogInformation("Partnership invite attempted for non-existent email: {Email} by user {UserId}", request.Email, userId);
            return;
        }

        var inviteeId = Guid.Parse(inviteeUser.Id);
        var existingPartnership = await _dbContext.Partnerships.FirstOrDefaultAsync(p =>
            (p.User1Id == userId && p.User2Id == inviteeId) || (p.User1Id == inviteeId && p.User2Id == userId));
        if (existingPartnership != null) { _logger.LogInformation("Partnership already exists"); return; }

        var existingInvitation = await _dbContext.PartnershipInvitations.FirstOrDefaultAsync(i =>
            i.InviterId == userId && i.InviteeEmail.ToLower() == request.Email.ToLower() && i.Status == "pending" && i.ExpiresAt > DateTime.UtcNow);
        if (existingInvitation != null) { _logger.LogInformation("Pending invitation already exists"); return; }

        var inviterProfile = await _dbContext.UserProfiles.FirstOrDefaultAsync(p => p.Id == userId);
        if (inviterProfile == null) throw new InvalidOperationException("Please complete your profile first");

        var token = GenerateInvitationToken();
        var invitation = new PartnershipInvitation
        {
            Id = Guid.NewGuid(),
            InviterId = userId,
            InviteeEmail = request.Email.ToLower(),
            Token = token,
            Status = "pending",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.PartnershipInvitations.Add(invitation);
        await _dbContext.SaveChangesAsync();

        var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
        var emailBody = $@"<html><body style='font-family: Arial, sans-serif;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h2 style='color: #7c3aed;'>Partnership Invitation</h2>
                <p><strong>{inviterProfile.DisplayName ?? inviterProfile.Email}</strong> has invited you to become their financial partner on <strong>Paire</strong>.</p>
                <p style='margin: 30px 0;'><a href='{frontendUrl}/login' style='background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;'>Log In</a></p>
                <p style='font-size: 12px; color: #666;'>This invitation expires in 7 days.</p>
            </div></body></html>";

        await _emailService.SendEmailAsync(new EmailMessage
        {
            ToEmail = request.Email,
            ToName = request.Email,
            Subject = $"{inviterProfile.DisplayName ?? inviterProfile.Email} invited you to be their financial partner",
            Body = emailBody,
            IsHtml = true
        });

        _logger.LogInformation("Invitation sent from {InviterId} to {Email}", userId, request.Email);
    }

    public async Task<IReadOnlyList<object>> GetPendingInvitationsAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || string.IsNullOrEmpty(user.Email)) throw new KeyNotFoundException("User not found");

        var invitations = await _dbContext.PartnershipInvitations
            .Where(i => i.InviteeEmail.ToLower() == user.Email.ToLower() && i.Status == "pending" && i.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(i => i.CreatedAt).AsNoTracking().ToListAsync();

        var list = new List<object>();
        foreach (var inv in invitations)
        {
            var inviterProfile = await _dbContext.UserProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == inv.InviterId);
            list.Add(new
            {
                id = inv.Id, token = inv.Token, inviterId = inv.InviterId,
                inviterName = inviterProfile?.DisplayName ?? "Unknown", inviterEmail = inviterProfile?.Email ?? "Unknown",
                inviteeEmail = inv.InviteeEmail, status = inv.Status, expiresAt = inv.ExpiresAt,
                createdAt = inv.CreatedAt, isExpired = inv.ExpiresAt < DateTime.UtcNow
            });
        }
        return list;
    }

    public async Task<(bool success, string message, Guid? partnershipId)> AcceptInvitationAsync(Guid userId, string token)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null || string.IsNullOrEmpty(user.Email)) return (false, "User not found", null);

        var invitation = await _dbContext.PartnershipInvitations.FirstOrDefaultAsync(i => i.Token == token && i.Status == "pending");
        if (invitation == null) return (false, "Invitation not found or already used", null);
        if (user.Email.ToLower() != invitation.InviteeEmail.ToLower()) return (false, "This invitation is for a different email address", null);

        if (invitation.ExpiresAt < DateTime.UtcNow)
        {
            invitation.Status = "expired";
            await _dbContext.SaveChangesAsync();
            return (false, "This invitation has expired", null);
        }

        var existing = await _dbContext.Partnerships.FirstOrDefaultAsync(p =>
            (p.User1Id == userId && p.User2Id == invitation.InviterId) || (p.User1Id == invitation.InviterId && p.User2Id == userId));
        if (existing != null)
        {
            invitation.Status = "accepted"; invitation.AcceptedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            return (true, "You are already partners with this user", existing.Id);
        }

        var partnership = new Entities.Partnership
        {
            Id = Guid.NewGuid(), User1Id = invitation.InviterId, User2Id = userId,
            Status = "active", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Partnerships.Add(partnership);
        invitation.Status = "accepted"; invitation.AcceptedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        _logger.LogInformation("Partnership created via invitation between {User1} and {User2}", invitation.InviterId, userId);
        return (true, "Partnership created successfully", partnership.Id);
    }

    public async Task<object?> GetInvitationDetailsAsync(string token)
    {
        var invitation = await _dbContext.PartnershipInvitations.AsNoTracking().FirstOrDefaultAsync(i => i.Token == token);
        if (invitation == null) return null;

        var inviterProfile = await _dbContext.UserProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.Id == invitation.InviterId);
        return new
        {
            id = invitation.Id, inviterEmail = inviterProfile?.Email ?? "Unknown",
            inviterName = inviterProfile?.DisplayName ?? "Unknown", inviteeEmail = invitation.InviteeEmail,
            status = invitation.Status, expiresAt = invitation.ExpiresAt, isExpired = invitation.ExpiresAt < DateTime.UtcNow
        };
    }

    public async Task<bool> EndPartnershipAsync(Guid userId, Guid partnershipId)
    {
        var partnership = await _dbContext.Partnerships.FirstOrDefaultAsync(p =>
            p.Id == partnershipId && (p.User1Id == userId || p.User2Id == userId));
        if (partnership == null) return false;

        _dbContext.Partnerships.Remove(partnership);
        await _dbContext.SaveChangesAsync();
        _logger.LogInformation("Partnership {PartnershipId} ended by user {UserId}", partnershipId, userId);
        return true;
    }

    private static string GenerateInvitationToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "")[..43];
    }
}

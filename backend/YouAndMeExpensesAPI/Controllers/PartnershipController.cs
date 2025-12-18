using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;
using System.Security.Cryptography;
using System.Text;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing partnerships between users
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class PartnershipController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly IAchievementService _achievementService;
        private readonly ILogger<PartnershipController> _logger;
        private readonly IEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly UserManager<ApplicationUser> _userManager;

        public PartnershipController(
            AppDbContext dbContext,
            IAchievementService achievementService,
            ILogger<PartnershipController> logger,
            IEmailService emailService,
            IConfiguration configuration,
            UserManager<ApplicationUser> userManager)
        {
            _dbContext = dbContext;
            _achievementService = achievementService;
            _logger = logger;
            _emailService = emailService;
            _configuration = configuration;
            _userManager = userManager;
        }

        /// <summary>
        /// Gets the authenticated user's partnership
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyPartnership()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var partnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => 
                        p.User1Id == userId || p.User2Id == userId);

                // Return null instead of 404 - no partnership is a valid state, not an error
                if (partnership == null)
                {
                    return Ok((object?)null);
                }

                // Load partner profiles
                var user1 = await _dbContext.UserProfiles.FirstOrDefaultAsync(u => u.Id == partnership.User1Id);
                var user2 = await _dbContext.UserProfiles.FirstOrDefaultAsync(u => u.Id == partnership.User2Id);

                var response = new
                {
                    id = partnership.Id,
                    user1_id = partnership.User1Id,
                    user2_id = partnership.User2Id,
                    user1 = user1 != null ? new { 
                        id = user1.Id, 
                        email = user1.Email, 
                        display_name = user1.DisplayName,
                        avatar_url = user1.AvatarUrl
                    } : null,
                    user2 = user2 != null ? new { 
                        id = user2.Id, 
                        email = user2.Email, 
                        display_name = user2.DisplayName,
                        avatar_url = user2.AvatarUrl
                    } : null,
                    created_at = partnership.CreatedAt
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting partnership for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving partnership", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new partnership with another user
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreatePartnership([FromBody] CreatePartnershipRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Check if user already has a partnership
                var existingPartnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => 
                        p.User1Id == userId || p.User2Id == userId);

                if (existingPartnership != null)
                {
                    return BadRequest(new { message = "You already have an active partnership" });
                }

                // Check if partner exists
                var partnerExists = await _dbContext.UserProfiles
                    .AnyAsync(u => u.Id == request.PartnerId);

                if (!partnerExists)
                {
                    return NotFound(new { message = "Partner user not found" });
                }

                // Check if partner already has a partnership
                var partnerPartnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => 
                        p.User1Id == request.PartnerId || 
                        p.User2Id == request.PartnerId);

                if (partnerPartnership != null)
                {
                    return BadRequest(new { message = "Partner already has an active partnership" });
                }

                // Create partnership
                var partnership = new Partnership
                {
                    Id = Guid.NewGuid(),
                    User1Id = userId,
                    User2Id = request.PartnerId,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.Partnerships.Add(partnership);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Partnership created between {User1} and {User2}", userId, request.PartnerId);

                // Check for new achievements for both users after creating partnership
                try
                {
                    await _achievementService.CheckPartnershipAchievementsAsync(userId.ToString());
                    await _achievementService.CheckPartnershipAchievementsAsync(request.PartnerId.ToString());
                }
                catch (Exception ex)
                {
                    // Log but don't fail the partnership creation if achievement check fails
                    _logger.LogWarning(ex, "Error checking achievements after partnership creation");
                }

                return Ok(partnership);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating partnership for user {UserId}", userId);
                return StatusCode(500, new { message = "Error creating partnership", error = ex.Message });
            }
        }

        /// <summary>
        /// Sends a partnership invitation via email
        /// </summary>
        [HttpPost("invite")]
        public async Task<IActionResult> SendInvitation([FromBody] SendInvitationRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Validate email
                if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
                {
                    return BadRequest(new { message = "Invalid email address" });
                }

                // Check if user already has a partnership
                var existingPartnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => 
                        p.User1Id == userId || p.User2Id == userId);

                if (existingPartnership != null)
                {
                    return BadRequest(new { message = "You already have an active partnership" });
                }

                // Check if the invitee exists (they must sign up first)
                var inviteeUser = await _userManager.FindByEmailAsync(request.Email.ToLower());
                if (inviteeUser == null)
                {
                    return BadRequest(new { message = "The user with this email address must sign up first before you can invite them" });
                }

                // Check if invitee already has a partnership
                var inviteePartnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => 
                        p.User1Id == Guid.Parse(inviteeUser.Id) || p.User2Id == Guid.Parse(inviteeUser.Id));

                if (inviteePartnership != null)
                {
                    return BadRequest(new { message = "This user already has an active partnership" });
                }

                // Check if there's already a pending invitation to this email
                var existingInvitation = await _dbContext.PartnershipInvitations
                    .FirstOrDefaultAsync(i => 
                        i.InviterId == userId && 
                        i.InviteeEmail.ToLower() == request.Email.ToLower() &&
                        i.Status == "pending" &&
                        i.ExpiresAt > DateTime.UtcNow);

                if (existingInvitation != null)
                {
                    return BadRequest(new { message = "An invitation has already been sent to this email" });
                }

                // Get inviter's profile
                var inviterProfile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == userId);

                if (inviterProfile == null)
                {
                    return BadRequest(new { message = "Please complete your profile first" });
                }

                // Generate unique token
                var token = GenerateInvitationToken();
                var expiresAt = DateTime.UtcNow.AddDays(7); // Invitation expires in 7 days

                // Create invitation
                var invitation = new PartnershipInvitation
                {
                    Id = Guid.NewGuid(),
                    InviterId = userId,
                    InviteeEmail = request.Email.ToLower(),
                    Token = token,
                    Status = "pending",
                    ExpiresAt = expiresAt,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.PartnershipInvitations.Add(invitation);
                await _dbContext.SaveChangesAsync();

                // Send invitation email
                var frontendUrl = _configuration["AppSettings:FrontendUrl"] ?? "http://localhost:3000";
                var loginUrl = $"{frontendUrl}/login";

                var emailBody = $@"
                    <html>
                    <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
                        <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                            <h2 style='color: #7c3aed;'>Partnership Invitation</h2>
                            <p>Hello!</p>
                            <p><strong>{inviterProfile.DisplayName ?? inviterProfile.Email}</strong> has invited you to become their financial partner on <strong>Paire Expenses</strong>.</p>
                            <p>By accepting this invitation, you'll be able to:</p>
                            <ul>
                                <li>Share expenses, income, and financial data</li>
                                <li>Track who added each transaction</li>
                                <li>View partner comparison in Analytics</li>
                                <li>Manage household budget together</li>
                            </ul>
                            <p style='margin: 30px 0;'>
                                <a href='{loginUrl}' 
                                   style='background: linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%); 
                                          color: white; 
                                          padding: 12px 30px; 
                                          text-decoration: none; 
                                          border-radius: 6px; 
                                          display: inline-block; 
                                          font-weight: bold;'>
                                    Log In
                                </a>
                            </p>
                            <p style='font-size: 12px; color: #666;'>
                                This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
                            </p>
                        </div>
                    </body>
                    </html>";

                var emailMessage = new EmailMessage
                {
                    ToEmail = request.Email,
                    ToName = request.Email,
                    Subject = $"{inviterProfile.DisplayName ?? inviterProfile.Email} invited you to be their financial partner",
                    Body = emailBody,
                    IsHtml = true
                };

                await _emailService.SendEmailAsync(emailMessage);

                _logger.LogInformation("Invitation sent from {InviterId} to {Email}", userId, request.Email);

                return Ok(new { message = "Invitation sent successfully", invitationId = invitation.Id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending invitation for user {UserId}", userId);
                return StatusCode(500, new { message = "Error sending invitation", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets pending invitations for the authenticated user
        /// </summary>
        [HttpGet("pending-invitations")]
        public async Task<IActionResult> GetPendingInvitations()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get user's email
                var user = await _userManager.FindByIdAsync(userId.ToString());
                if (user == null || string.IsNullOrEmpty(user.Email))
                {
                    return NotFound(new { message = "User not found" });
                }

                // Find pending invitations for this user's email
                var invitations = await _dbContext.PartnershipInvitations
                    .Where(i => i.InviteeEmail.ToLower() == user.Email.ToLower() &&
                               i.Status == "pending" &&
                               i.ExpiresAt > DateTime.UtcNow)
                    .OrderByDescending(i => i.CreatedAt)
                    .ToListAsync();

                // Get inviter profiles
                var invitationList = new List<object>();
                foreach (var invitation in invitations)
                {
                    var inviterProfile = await _dbContext.UserProfiles
                        .FirstOrDefaultAsync(p => p.Id == invitation.InviterId);

                    invitationList.Add(new
                    {
                        id = invitation.Id,
                        token = invitation.Token,
                        inviterId = invitation.InviterId,
                        inviterName = inviterProfile?.DisplayName ?? "Unknown",
                        inviterEmail = inviterProfile?.Email ?? "Unknown",
                        inviteeEmail = invitation.InviteeEmail,
                        status = invitation.Status,
                        expiresAt = invitation.ExpiresAt,
                        createdAt = invitation.CreatedAt,
                        isExpired = invitation.ExpiresAt < DateTime.UtcNow
                    });
                }

                return Ok(invitationList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending invitations for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving invitations", error = ex.Message });
            }
        }

        /// <summary>
        /// Accepts a partnership invitation (requires authentication)
        /// User must be logged in and their email must match the invitation
        /// </summary>
        [HttpPost("accept-invitation")]
        public async Task<IActionResult> AcceptInvitation([FromBody] AcceptInvitationRequest request)
        {
            try
            {
                var (userId, error) = GetAuthenticatedUser();
                if (error != null) return error;

                if (string.IsNullOrWhiteSpace(request.Token))
                {
                    return BadRequest(new { message = "Token is required" });
                }

                // Get authenticated user's email
                var user = await _userManager.FindByIdAsync(userId.ToString());
                if (user == null || string.IsNullOrEmpty(user.Email))
                {
                    return NotFound(new { message = "User not found" });
                }

                // Find invitation by token
                var invitation = await _dbContext.PartnershipInvitations
                    .FirstOrDefaultAsync(i => i.Token == request.Token && i.Status == "pending");

                if (invitation == null)
                {
                    return NotFound(new { message = "Invitation not found or already used" });
                }

                // Verify the authenticated user's email matches the invitation
                if (user.Email.ToLower() != invitation.InviteeEmail.ToLower())
                {
                    return BadRequest(new { message = "This invitation is for a different email address" });
                }

                // Check if invitation has expired
                if (invitation.ExpiresAt < DateTime.UtcNow)
                {
                    invitation.Status = "expired";
                    await _dbContext.SaveChangesAsync();
                    return BadRequest(new { message = "This invitation has expired" });
                }

                // Check if user already has a partnership
                var existingPartnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => 
                        p.User1Id == userId || p.User2Id == userId);

                if (existingPartnership != null)
                {
                    return BadRequest(new { message = "You already have an active partnership" });
                }

                // Check if inviter still exists and doesn't have a partnership
                var inviterPartnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => 
                        p.User1Id == invitation.InviterId || p.User2Id == invitation.InviterId);

                if (inviterPartnership != null)
                {
                    invitation.Status = "cancelled";
                    await _dbContext.SaveChangesAsync();
                    return BadRequest(new { message = "The inviter already has an active partnership" });
                }

                // Create partnership
                var partnership = new Partnership
                {
                    Id = Guid.NewGuid(),
                    User1Id = invitation.InviterId,
                    User2Id = userId,
                    Status = "active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _dbContext.Partnerships.Add(partnership);
                invitation.Status = "accepted";
                invitation.AcceptedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Partnership created via invitation between {User1} and {User2}", 
                    invitation.InviterId, userId);

                // Check for new achievements for both users after accepting partnership
                try
                {
                    await _achievementService.CheckPartnershipAchievementsAsync(invitation.InviterId.ToString());
                    await _achievementService.CheckPartnershipAchievementsAsync(userId.ToString());
                }
                catch (Exception ex)
                {
                    // Log but don't fail the partnership creation if achievement check fails
                    _logger.LogWarning(ex, "Error checking achievements after partnership acceptance");
                }

                return Ok(new { 
                    message = "Partnership created successfully", 
                    partnershipId = partnership.Id
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error accepting invitation with token {Token}", request.Token);
                return StatusCode(500, new { message = "Error accepting invitation", error = ex.Message });
            }
        }

        /// <summary>
        /// Gets invitation details by token (public endpoint for landing page)
        /// </summary>
        [AllowAnonymous]
        [HttpGet("invitation/{token}")]
        public async Task<IActionResult> GetInvitationDetails(string token)
        {
            try
            {
                var invitation = await _dbContext.PartnershipInvitations
                    .FirstOrDefaultAsync(i => i.Token == token);

                if (invitation == null)
                {
                    return NotFound(new { message = "Invitation not found" });
                }

                // Get inviter's profile
                var inviterProfile = await _dbContext.UserProfiles
                    .FirstOrDefaultAsync(p => p.Id == invitation.InviterId);

                var response = new
                {
                    id = invitation.Id,
                    inviterEmail = inviterProfile?.Email ?? "Unknown",
                    inviterName = inviterProfile?.DisplayName ?? "Unknown",
                    inviteeEmail = invitation.InviteeEmail,
                    status = invitation.Status,
                    expiresAt = invitation.ExpiresAt,
                    isExpired = invitation.ExpiresAt < DateTime.UtcNow
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting invitation details for token {Token}", token);
                return StatusCode(500, new { message = "Error retrieving invitation", error = ex.Message });
            }
        }

        /// <summary>
        /// Ends/deletes a partnership
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> EndPartnership(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var partnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p => p.Id == id && 
                        (p.User1Id == userId || p.User2Id == userId));

                if (partnership == null)
                {
                    return NotFound(new { message = "Partnership not found" });
                }

                _dbContext.Partnerships.Remove(partnership);
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("Partnership {PartnershipId} ended by user {UserId}", id, userId);

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ending partnership {Id}", id);
                return StatusCode(500, new { message = "Error ending partnership", error = ex.Message });
            }
        }

        /// <summary>
        /// Generates a unique token for partnership invitations
        /// </summary>
        private string GenerateInvitationToken()
        {
            var bytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(bytes);
            }
            return Convert.ToBase64String(bytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "")
                .Substring(0, 43); // Ensure consistent length
        }
    }

    /// <summary>
    /// Request model for creating a partnership
    /// </summary>
    public class CreatePartnershipRequest
    {
        public Guid PartnerId { get; set; }
    }

    /// <summary>
    /// Request model for sending an invitation
    /// </summary>
    public class SendInvitationRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request model for accepting an invitation
    /// </summary>
    public class AcceptInvitationRequest
    {
        public string Token { get; set; } = string.Empty;
    }
}


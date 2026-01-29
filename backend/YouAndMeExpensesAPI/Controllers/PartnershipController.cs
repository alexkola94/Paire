using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing partnerships between users
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class PartnershipController : BaseApiController
    {
        private readonly IPartnershipService _partnershipService;
        private readonly ILogger<PartnershipController> _logger;
        private readonly UserManager<ApplicationUser> _userManager;

        public PartnershipController(
            IPartnershipService partnershipService,
            ILogger<PartnershipController> logger,
            UserManager<ApplicationUser> userManager)
        {
            _partnershipService = partnershipService;
            _logger = logger;
            _userManager = userManager;
        }

        /// <summary>
        /// Gets the authenticated user's partnerships
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyPartnerships()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var partnerships = await _partnershipService.GetMyPartnershipsAsync(userId);
                return Ok(partnerships);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting partnerships for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving partnerships", error = ex.Message });
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
                var partnership = await _partnershipService.CreatePartnershipAsync(userId, request.PartnerId);
                return Ok(partnership);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating partnership for user {UserId}", userId);
                return StatusCode(500, new { message = "Error creating partnership", error = ex.Message });
            }
        }

        /// <summary>
        /// Sends a partnership invitation via email.
        /// SECURITY: Always returns a generic success message to prevent user enumeration.
        /// </summary>
        [HttpPost("invite")]
        public async Task<IActionResult> SendInvitation([FromBody] SendInvitationRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Basic email format validation - this is safe to report
                if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
                {
                    return BadRequest(new { message = "Invalid email address" });
                }

                try
                {
                    await _partnershipService.SendInvitationAsync(userId, request);
                }
                catch (InvalidOperationException ex)
                {
                    // Only propagate errors about the requester's own profile
                    if (ex.Message.Contains("complete your profile"))
                    {
                        return BadRequest(new { message = ex.Message });
                    }
                    // Log but don't reveal other errors to client
                    _logger.LogWarning(ex, "Invitation error for user {UserId}", userId);
                }

                // SECURITY: Always return generic success message
                // Never reveal if email exists, if partnership exists, or if invitation was already sent
                return Ok(new { message = "If this email is registered, an invitation will be sent." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending invitation for user {UserId}", userId);
                // SECURITY: Still return generic success to prevent information disclosure
                return Ok(new { message = "If this email is registered, an invitation will be sent." });
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
                try
                {
                    var invitations = await _partnershipService.GetPendingInvitationsAsync(userId);
                    return Ok(invitations);
                }
                catch (KeyNotFoundException)
                {
                    return NotFound(new { message = "User not found" });
                }
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

                var (success, message, partnershipId) = await _partnershipService.AcceptInvitationAsync(userId, request.Token);

                if (!success)
                {
                    if (message.Contains("not found") || message.Contains("already used"))
                    {
                        return NotFound(new { message });
                    }

                    if (message.Contains("different email") || message.Contains("expired") || message.Contains("Token is required"))
                    {
                        return BadRequest(new { message });
                    }
                }

                return Ok(new
                {
                    message,
                    partnershipId
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
                var details = await _partnershipService.GetInvitationDetailsAsync(token);

                if (details == null)
                {
                    return NotFound(new { message = "Invitation not found" });
                }

                return Ok(details);
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
                var success = await _partnershipService.EndPartnershipAsync(userId, id);

                if (!success)
                {
                    return NotFound(new { message = "Partnership not found" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ending partnership {Id}", id);
                return StatusCode(500, new { message = "Error ending partnership", error = ex.Message });
            }
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


using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Paire.Modules.Identity.Core.Entities;
using Paire.Modules.Partnership.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Partnership.Api.Controllers;

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

    [HttpGet]
    public async Task<IActionResult> GetMyPartnerships()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _partnershipService.GetMyPartnershipsAsync(userId)); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting partnerships"); return StatusCode(500, new { message = "Error retrieving partnerships" }); }
    }

    [HttpPost]
    public async Task<IActionResult> CreatePartnership([FromBody] CreatePartnershipRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _partnershipService.CreatePartnershipAsync(userId, request.PartnerId)); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (Exception ex) { _logger.LogError(ex, "Error creating partnership"); return StatusCode(500, new { message = "Error creating partnership" }); }
    }

    [HttpPost("invite")]
    public async Task<IActionResult> SendInvitation([FromBody] SendInvitationRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
                return BadRequest(new { message = "Invalid email address" });
            try { await _partnershipService.SendInvitationAsync(userId, request); }
            catch (InvalidOperationException ex) when (ex.Message.Contains("complete your profile")) { return BadRequest(new { message = ex.Message }); }
            catch (InvalidOperationException) { /* silent */ }
            return Ok(new { message = "If this email is registered, an invitation will be sent." });
        }
        catch (Exception) { return Ok(new { message = "If this email is registered, an invitation will be sent." }); }
    }

    [HttpGet("pending-invitations")]
    public async Task<IActionResult> GetPendingInvitations()
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try { return Ok(await _partnershipService.GetPendingInvitationsAsync(userId)); }
        catch (KeyNotFoundException) { return NotFound(new { message = "User not found" }); }
        catch (Exception ex) { _logger.LogError(ex, "Error getting invitations"); return StatusCode(500, new { message = "Error retrieving invitations" }); }
    }

    [HttpPost("accept-invitation")]
    public async Task<IActionResult> AcceptInvitation([FromBody] AcceptInvitationRequest request)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        if (string.IsNullOrWhiteSpace(request.Token)) return BadRequest(new { message = "Token is required" });
        try
        {
            var (success, message, partnershipId) = await _partnershipService.AcceptInvitationAsync(userId, request.Token);
            if (!success)
            {
                if (message.Contains("not found") || message.Contains("already used")) return NotFound(new { message });
                if (message.Contains("different email") || message.Contains("expired")) return BadRequest(new { message });
            }
            return Ok(new { message, partnershipId });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error accepting invitation"); return StatusCode(500, new { message = "Error accepting invitation" }); }
    }

    [AllowAnonymous]
    [HttpGet("invitation/{token}")]
    public async Task<IActionResult> GetInvitationDetails(string token)
    {
        try
        {
            var details = await _partnershipService.GetInvitationDetailsAsync(token);
            return details == null ? NotFound(new { message = "Invitation not found" }) : Ok(details);
        }
        catch (Exception ex) { _logger.LogError(ex, "Error getting invitation details"); return StatusCode(500, new { message = "Error retrieving invitation" }); }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> EndPartnership(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;
        try
        {
            var success = await _partnershipService.EndPartnershipAsync(userId, id);
            return success ? NoContent() : NotFound(new { message = "Partnership not found" });
        }
        catch (Exception ex) { _logger.LogError(ex, "Error ending partnership"); return StatusCode(500, new { message = "Error ending partnership" }); }
    }
}

public class CreatePartnershipRequest { public Guid PartnerId { get; set; } }
public class SendInvitationRequest { public string Email { get; set; } = string.Empty; }
public class AcceptInvitationRequest { public string Token { get; set; } = string.Empty; }

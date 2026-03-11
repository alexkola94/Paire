using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;
using System.Security.Claims;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Controller for handling data clearing requests with partner confirmation
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("api/[controller]")]
    public class DataClearingController : ControllerBase
    {
        private readonly IDataClearingService _dataClearingService;
        private readonly ILogger<DataClearingController> _logger;

        public DataClearingController(
            IDataClearingService dataClearingService,
            ILogger<DataClearingController> logger)
        {
            _dataClearingService = dataClearingService;
            _logger = logger;
        }

        /// <summary>
        /// Initiate a data clearing request
        /// Checks for active partnership and sends confirmation email if needed
        /// </summary>
        [HttpPost("initiate")]
        public async Task<IActionResult> InitiateDataClearing([FromQuery] string userId, [FromBody] InitiateDataClearingRequest request)
        {
            var authUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(authUserId))
            {
                return Unauthorized();
            }

            if (string.IsNullOrEmpty(userId))
            {
                userId = authUserId;
            }
            else if (!string.Equals(userId, authUserId, StringComparison.Ordinal))
            {
                return Forbid();
            }

            try
            {
                var response = await _dataClearingService.InitiateDataClearingAsync(userId, request);
                _logger.LogInformation("Initiated data clearing request for user {UserId}", userId);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating data clearing request");
                return StatusCode(500, new { error = "Failed to initiate data clearing request", details = ex.Message });
            }
        }

        /// <summary>
        /// Confirm or deny a data clearing request (partner)
        /// </summary>
        [HttpPost("confirm")]
        public async Task<IActionResult> ConfirmDataClearing([FromBody] ConfirmDataClearingRequest request)
        {
            try
            {
                var result = await _dataClearingService.ConfirmDataClearingAsync(request);

                _logger.LogInformation(
                    "Processed data clearing confirmation for token prefix {TokenPrefix}",
                    string.IsNullOrEmpty(request.Token) ? "<empty>" : request.Token[..Math.Min(8, request.Token.Length)]);

                // Maintain existing status codes based on response content
                if (result is { } && result.GetType().GetProperty("error") != null)
                {
                    var errorValue = result.GetType().GetProperty("error")!.GetValue(result) as string;
                    if (errorValue != null && errorValue.Contains("expired", StringComparison.OrdinalIgnoreCase))
                    {
                        return BadRequest(result);
                    }

                    return NotFound(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming data clearing request");
                return StatusCode(500, new { error = "Failed to confirm data clearing request", details = ex.Message });
            }
        }

        /// <summary>
        /// Get status of user's data clearing request
        /// </summary>
        [HttpGet("status")]
        public async Task<IActionResult> GetStatus([FromQuery] string userId)
        {
            var authUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(authUserId))
            {
                return Unauthorized();
            }

            if (string.IsNullOrEmpty(userId))
            {
                userId = authUserId;
            }
            else if (!string.Equals(userId, authUserId, StringComparison.Ordinal))
            {
                return Forbid();
            }

            try
            {
                var result = await _dataClearingService.GetStatusAsync(userId);
                _logger.LogInformation("Retrieved data clearing status for user {UserId}", userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting data clearing status");
                return StatusCode(500, new { error = "Failed to get status" });
            }
        }

        /// <summary>
        /// Cancel a pending data clearing request
        /// </summary>
        [HttpDelete("cancel")]
        public async Task<IActionResult> CancelRequest([FromQuery] string userId, [FromQuery] Guid requestId)
        {
            var authUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(authUserId))
            {
                return Unauthorized();
            }

            if (string.IsNullOrEmpty(userId))
            {
                userId = authUserId;
            }
            else if (!string.Equals(userId, authUserId, StringComparison.Ordinal))
            {
                return Forbid();
            }

            try
            {
                var result = await _dataClearingService.CancelRequestAsync(userId, requestId);

                var errorProp = result.GetType().GetProperty("error");
                if (errorProp != null)
                {
                    var errorValue = errorProp.GetValue(result) as string;
                    if (errorValue == "Request not found")
                    {
                        return NotFound(result);
                    }

                    return BadRequest(result);
                }

                _logger.LogInformation(
                    "Cancelled data clearing request {RequestId} for user {UserId}",
                    requestId, userId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling data clearing request");
                return StatusCode(500, new { error = "Failed to cancel request" });
            }
        }
    }
}


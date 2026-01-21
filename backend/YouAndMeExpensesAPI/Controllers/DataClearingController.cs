using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Controller for handling data clearing requests with partner confirmation
    /// </summary>
    [ApiController]
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
            try
            {
                var response = await _dataClearingService.InitiateDataClearingAsync(userId, request);
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
            try
            {
                var result = await _dataClearingService.GetStatusAsync(userId);
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


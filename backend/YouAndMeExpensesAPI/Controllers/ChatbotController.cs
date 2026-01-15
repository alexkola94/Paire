using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// Chatbot API Controller
    /// Provides intelligent financial assistant capabilities
    /// Includes report generation and download features
    /// </summary>
    [Route("api/[controller]")]
    public class ChatbotController : BaseApiController
    {
        private readonly IChatbotService _chatbotService;
        private readonly IReportGenerationService _reportService;
        private readonly ILogger<ChatbotController> _logger;

        public ChatbotController(
            IChatbotService chatbotService, 
            IReportGenerationService reportService,
            ILogger<ChatbotController> logger)
        {
            _chatbotService = chatbotService;
            _reportService = reportService;
            _logger = logger;
        }

        /// <summary>
        /// Process a chatbot query
        /// </summary>
        /// <param name="request">Chatbot query request</param>
        /// <returns>Chatbot response</returns>
        [HttpPost("query")]
        public async Task<IActionResult> ProcessQuery([FromBody] ChatbotQuery request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest(new { message = "Query cannot be empty" });
            }

            try
            {
                var language = request.Language ?? "en";
                var response = await _chatbotService.ProcessQueryAsync(userId.ToString(), request.Query, request.History, language);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chatbot query for user {UserId}", userId);
                return StatusCode(500, new { message = "Error processing query", error = ex.Message });
            }
        }

        /// <summary>
        /// Get suggested questions for the user
        /// </summary>
        /// <returns>List of suggested questions</returns>
        [HttpGet("suggestions")]
        public async Task<IActionResult> GetSuggestions([FromQuery] string? language = "en")
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                var suggestions = await _chatbotService.GetSuggestedQuestionsAsync(userId.ToString(), language ?? "en");
                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting chatbot suggestions for user {UserId}", userId);
                return StatusCode(500, new { message = "Error getting suggestions", error = ex.Message });
            }
        }

        /// <summary>
        /// Generate and download a report file (CSV or PDF)
        /// </summary>
        /// <param name="request">Report generation request with parameters</param>
        /// <returns>File download</returns>
        [HttpPost("generate-report")]
        public async Task<IActionResult> GenerateReport([FromBody] GenerateReportRequest request)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                _logger.LogInformation("Generating {Format} report: {ReportType} for user {UserId}", 
                    request.Format, request.ReportType, userId);

                byte[] fileData;
                string fileName;
                string contentType;

                if (request.Format.ToLower() == "pdf")
                {
                    (fileData, fileName) = await _reportService.GeneratePdfReportAsync(userId.ToString(), request);
                    contentType = "application/pdf";
                }
                else
                {
                    (fileData, fileName) = await _reportService.GenerateCsvReportAsync(userId.ToString(), request);
                    contentType = "text/csv";
                }

                return File(fileData, contentType, fileName);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid report request for user {UserId}", userId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating report for user {UserId}", userId);
                return StatusCode(500, new { message = "Error generating report", error = ex.Message });
            }
        }

        /// <summary>
        /// Get available report types
        /// </summary>
        /// <returns>List of available report types</returns>
        [HttpGet("report-types")]
        public IActionResult GetReportTypes()
        {
            var (_, error) = GetAuthenticatedUser();
            if (error != null) return error;

            var reportTypes = _reportService.GetAvailableReportTypes();
            return Ok(reportTypes);
        }
    }
}


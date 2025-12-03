using Microsoft.AspNetCore.Mvc;

namespace YouAndMeExpenses.Controllers
{
    /// <summary>
    /// System controller for health checks and system information
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SystemController : ControllerBase
    {
        private readonly ILogger<SystemController> _logger;

        public SystemController(ILogger<SystemController> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Health check endpoint
        /// </summary>
        /// <returns>System health status</returns>
        [HttpGet("health")]
        public IActionResult GetHealth()
        {
            _logger.LogInformation("Health check requested");
            
            return Ok(new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                version = "1.0.0",
                service = "You & Me Expenses API"
            });
        }

        /// <summary>
        /// API information endpoint
        /// </summary>
        /// <returns>API information</returns>
        [HttpGet("info")]
        public IActionResult GetInfo()
        {
            return Ok(new
            {
                name = "You & Me Expenses API",
                version = "1.0.0",
                description = "API for managing couple expenses, income, and loans",
                documentation = "/swagger",
                endpoints = new
                {
                    health = "/api/system/health",
                    info = "/api/system/info"
                }
            });
        }
    }
}


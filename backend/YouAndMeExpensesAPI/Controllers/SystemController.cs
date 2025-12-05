using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

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
        private readonly AppDbContext _context;

        public SystemController(ILogger<SystemController> logger, AppDbContext context)
        {
            _logger = logger;
            _context = context;
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
                    info = "/api/system/info",
                    clearData = "/api/system/clear-data (DELETE)"
                }
            });
        }

        /// <summary>
        /// Clears all data from the database (keeps table structure)
        /// WARNING: This is irreversible! Use only in development.
        /// </summary>
        /// <returns>Success message</returns>
        [HttpDelete("clear-data")]
        public async Task<IActionResult> ClearAllData()
        {
            try
            {
                _logger.LogWarning("⚠️ CLEARING ALL DATABASE DATA - This action is irreversible!");

                // Execute raw SQL to truncate all tables
                // Order matters due to foreign key constraints
                await _context.Database.ExecuteSqlRawAsync(@"
                    -- Disable triggers temporarily
                    SET session_replication_role = 'replica';

                    -- Clear all tables in correct order
                    TRUNCATE TABLE shopping_list_items CASCADE;
                    TRUNCATE TABLE shopping_lists CASCADE;
                    TRUNCATE TABLE loan_payments CASCADE;
                    TRUNCATE TABLE loans CASCADE;
                    TRUNCATE TABLE recurring_bills CASCADE;
                    TRUNCATE TABLE savings_goals CASCADE;
                    TRUNCATE TABLE budgets CASCADE;
                    TRUNCATE TABLE transactions CASCADE;
                    TRUNCATE TABLE reminder_preferences CASCADE;
                    TRUNCATE TABLE partnerships CASCADE;
                    TRUNCATE TABLE user_profiles CASCADE;

                    -- Reset sequences (auto-increment IDs)
                    ALTER SEQUENCE IF EXISTS shopping_list_items_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS shopping_lists_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS loan_payments_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS loans_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS recurring_bills_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS savings_goals_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS budgets_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS reminder_preferences_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS partnerships_id_seq RESTART WITH 1;

                    -- Re-enable triggers
                    SET session_replication_role = 'origin';
                ");

                _logger.LogInformation("✅ All database data cleared successfully");

                return Ok(new
                {
                    success = true,
                    message = "All data has been cleared successfully!",
                    timestamp = DateTime.UtcNow,
                    warning = "This action was irreversible. Database is now empty."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing database data");
                return StatusCode(500, new
                {
                    success = false,
                    message = "Error clearing data",
                    error = ex.Message
                });
            }
        }
    }
}


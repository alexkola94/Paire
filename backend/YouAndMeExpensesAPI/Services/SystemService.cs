using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for system health, metadata, changelog, data clearing, and diagnostics.
    /// Contains all filesystem, database, and network logic so controllers remain thin.
    /// </summary>
    public class SystemService : ISystemService
    {
        private readonly ILogger<SystemService> _logger;
        private readonly AppDbContext _context;

        public SystemService(ILogger<SystemService> logger, AppDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public Task<object> GetHealthAsync()
        {
            _logger.LogInformation("Health check requested");

            var version = GetType().Assembly.GetName().Version?.ToString() ?? "2.0.0";

            var result = new
            {
                status = "healthy",
                timestamp = DateTime.UtcNow,
                version,
                service = "Paire API"
            };

            return Task.FromResult<object>(result);
        }

        public Task<object> GetInfoAsync()
        {
            try
            {
                var version = GetType().Assembly.GetName().Version?.ToString() ?? "2.0.0";

                var result = new
                {
                    name = "Paire API",
                    version,
                    description = "API for managing couple expenses, income, and loans",
                    documentation = "/swagger",
                    endpoints = new
                    {
                        health = "/api/system/health",
                        info = "/api/system/info",
                        changelog = "/api/system/changelog",
                        clearData = "/api/system/clear-data (DELETE)"
                    }
                };

                return Task.FromResult<object>(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting system info");
                throw;
            }
        }

        public async Task<object> GetChangelogAsync()
        {
            try
            {
                var possiblePaths = new[]
                {
                    Path.Combine(Directory.GetCurrentDirectory(), "../../CHANGELOG.md"),
                    Path.Combine(Directory.GetCurrentDirectory(), "../CHANGELOG.md"),
                    Path.Combine(Directory.GetCurrentDirectory(), "CHANGELOG.md"),
                    Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "CHANGELOG.md")
                };

                var checkedPaths = new List<string>();

                foreach (var path in possiblePaths)
                {
                    var fullPath = Path.GetFullPath(path);
                    checkedPaths.Add(fullPath);
                    if (File.Exists(fullPath))
                    {
                        var content = await File.ReadAllTextAsync(fullPath);
                        return new { content };
                    }
                }

                _logger.LogWarning("CHANGELOG.md not found in any expected location: {Paths}", string.Join(", ", checkedPaths));
                return new { message = "Changelog not found", checkedPaths };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error reading changelog");
                throw;
            }
        }

        public async Task<object> ClearAllDataAsync()
        {
            try
            {
                _logger.LogWarning("⚠️ CLEARING ALL DATABASE DATA - This action is irreversible!");

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

                return new
                {
                    success = true,
                    message = "All data has been cleared successfully!",
                    timestamp = DateTime.UtcNow,
                    warning = "This action was irreversible. Database is now empty."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing database data");
                throw;
            }
        }

        public async Task<object> TestSmtpConnectivityAsync()
        {
            var results = new Dictionary<string, string>();
            var logs = new List<string>();

            void Log(string message)
            {
                _logger.LogInformation(message);
                logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] {message}");
            }

            try
            {
                Log("🔍 Starting SMTP Connectivity Test...");

                // 1. DNS Resolution
                Log("1️⃣ Testing DNS Resolution for smtp.gmail.com...");
                try
                {
                    var addresses = await System.Net.Dns.GetHostAddressesAsync("smtp.gmail.com");
                    foreach (var addr in addresses)
                    {
                        Log($"   Found IP: {addr} ({addr.AddressFamily})");
                    }
                    results["DNS"] = "✅ Success";
                }
                catch (Exception ex)
                {
                    Log($"❌ DNS Lookup Failed: {ex.Message}");
                    results["DNS"] = "❌ Failed";
                }

                // 2. TCP Connection Test to 587
                Log("2️⃣ Testing TCP Connect to smtp.gmail.com:587 (STARTTLS)...");
                try
                {
                    using var tcp = new System.Net.Sockets.TcpClient();
                    var connectTask = tcp.ConnectAsync("smtp.gmail.com", 587);
                    var completedTask = await Task.WhenAny(connectTask, Task.Delay(5000));

                    if (completedTask == connectTask)
                    {
                        await connectTask;
                        Log("✅ TCP Connection Established on Port 587");
                        results["TCP-587"] = "✅ Success";
                    }
                    else
                    {
                        Log("❌ TCP Connection Timed Out on Port 587 after 5s");
                        results["TCP-587"] = "❌ Timed Out";
                    }
                }
                catch (Exception ex)
                {
                    Log($"❌ TCP Connection Failed on Port 587: {ex.Message}");
                    results["TCP-587"] = "❌ Failed";
                }

                // 3. TCP Connection Test to 465
                Log("3️⃣ Testing TCP Connect to smtp.gmail.com:465 (SSL)...");
                try
                {
                    using var tcp = new System.Net.Sockets.TcpClient();
                    var connectTask = tcp.ConnectAsync("smtp.gmail.com", 465);
                    var completedTask = await Task.WhenAny(connectTask, Task.Delay(5000));

                    if (completedTask == connectTask)
                    {
                        await connectTask;
                        Log("✅ TCP Connection Established on Port 465");
                        results["TCP-465"] = "✅ Success";
                    }
                    else
                    {
                        Log("❌ TCP Connection Timed Out on Port 465 after 5s");
                        results["TCP-465"] = "❌ Timed Out";
                    }
                }
                catch (Exception ex)
                {
                    Log($"❌ TCP Connection Failed on Port 465: {ex.Message}");
                    results["TCP-465"] = "❌ Failed";
                }

                return new
                {
                    status = "Completed",
                    results,
                    logs
                };
            }
            catch (Exception ex)
            {
                return new
                {
                    status = "Error",
                    error = ex.Message,
                    logs
                };
            }
        }
    }
}


using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [ApiController]
    [Route("api/open-banking")]
    public class OpenBankingController : BaseApiController
    {
        private readonly IPlaidService _plaidService;
        private readonly IBankTransactionImportService _transactionImportService;
        private readonly AppDbContext _context;
        private readonly ILogger<OpenBankingController> _logger;

        public OpenBankingController(
            IPlaidService plaidService,
            IBankTransactionImportService transactionImportService,
            AppDbContext context,
            ILogger<OpenBankingController> logger)
        {
            _plaidService = plaidService;
            _transactionImportService = transactionImportService;
            _context = context;
            _logger = logger;
        }

        [HttpPost("link-token")]
        [Authorize]
        public async Task<IActionResult> CreateLinkToken()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var linkToken = await _plaidService.CreateLinkTokenAsync(userId);
                return Ok(new { link_token = linkToken });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating link token");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpPost("exchange-token")]
        [Authorize]
        public async Task<IActionResult> ExchangeToken([FromBody] ExchangeTokenRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var accessToken = await _plaidService.ExchangePublicTokenAsync(request.PublicToken);
                
                // Get accounts info immediately to store them
                var accounts = await _plaidService.GetAccountsAsync(accessToken);

                // Save or Update Connection
                // Plaid usually returns one Item (Connection) which has an ID, but here we used exchange token which gives access token.
                // We'll treat the AccessToken as the unique key for the connection or generate our own ID.
                
                var connection = new BankConnection
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    AccessToken = accessToken, 
                    BankName = request.InstitutionName ?? "Plaid Bank",
                    ConsentId = request.InstitutionId, // Storing Institution ID here for now
                    TokenExpiresAt = DateTime.UtcNow.AddDays(90), // Plaid tokens don't expire usually but we set a date
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                // Deactivate old connections for same bank if needed? 
                // For simplified logic, we just add new.

                _context.Set<BankConnection>().Add(connection);

                foreach (var acc in accounts)
                {
                    var stored = new StoredBankAccount
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        BankConnectionId = connection.Id,
                        AccountId = acc.AccountId,
                        AccountName = acc.Name,
                        AccountType = acc.Type.ToString(),
                        Currency = acc.Balances.IsoCurrencyCode ?? "EUR",
                        CurrentBalance = acc.Balances.Current ?? 0,
                        LastBalanceUpdate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Set<StoredBankAccount>().Add(stored);
                }

                await _context.SaveChangesAsync();

                // Trigger initial sync (background-like but inline for first time to show data immediately)
                try
                {
                    await _transactionImportService.ImportTransactionsAsync(userId, DateTime.UtcNow.AddDays(-30));
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Initial transaction sync failed");
                    // Don't fail the main request
                }

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging token");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        public class ExchangeTokenRequest
        {
            public string PublicToken { get; set; } = string.Empty;
            public string? InstitutionId { get; set; }
            public string? InstitutionName { get; set; }
        }

        [HttpGet("accounts")]
        [Authorize]
        public async Task<IActionResult> GetAccounts()
        {
             var userId = GetCurrentUserId();
             var accounts = await _context.Set<StoredBankAccount>()
                .Where(a => a.UserId == userId)
                .Join(_context.Set<BankConnection>(),
                    account => account.BankConnectionId,
                    connection => connection.Id,
                    (account, connection) => new 
                    {
                        account.Id,
                        account.AccountId,
                        account.AccountName,
                        account.AccountType,
                        account.Currency,
                        account.CurrentBalance,
                        account.Iban,
                        account.LastBalanceUpdate,
                        BankName = connection.BankName,
                        InstitutionId = connection.ConsentId // storing institution_id in ConsentId field for now
                    })
                .ToListAsync();

             return Ok(new { accounts });
        }

        [HttpDelete("disconnect")]
        [Authorize]
        public async Task<IActionResult> DisconnectAll()
        {
            try
            {
                var userId = GetCurrentUserId();
                var connections = await _context.Set<BankConnection>()
                    .Where(c => c.UserId == userId && c.IsActive)
                    .ToListAsync();

                foreach (var conn in connections)
                {
                    conn.IsActive = false;
                    // Ideally call Plaid to remove Item here
                }

                var accounts = await _context.Set<StoredBankAccount>().Where(a => a.UserId == userId).ToListAsync();
                _context.Set<StoredBankAccount>().RemoveRange(accounts);

                await _context.SaveChangesAsync();
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}

using Going.Plaid;
using Going.Plaid.Entity;
using Going.Plaid.Link;
using Going.Plaid.Item;
using Going.Plaid.Accounts;
using Going.Plaid.Transactions;
using Microsoft.Extensions.Options;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class PlaidService : IPlaidService
    {
        private readonly PlaidClient _client;
        private readonly PlaidSettings _settings;
        private readonly ILogger<PlaidService> _logger;

        // Using IOptions<PlaidOptions> if Going.Plaid uses it, or just our settings if we manually configure
        public PlaidService(PlaidClient client, IOptions<PlaidSettings> settings, ILogger<PlaidService> logger)
        {
            _client = client;
            _settings = settings.Value;
            _logger = logger;
        }

        public async Task<string> CreateLinkTokenAsync(string userId)
        {
            var request = new LinkTokenCreateRequest()
            {
                User = new LinkTokenCreateRequestUser { ClientUserId = userId },
                ClientName = "You & Me Expenses",
                Products = new[] { Products.Transactions },
                CountryCodes = new[] { CountryCode.Gb, CountryCode.Fr, CountryCode.Es, CountryCode.Ie, CountryCode.Nl, CountryCode.De, CountryCode.It, CountryCode.Pt, CountryCode.Pl, CountryCode.Dk, CountryCode.Se, CountryCode.Ee, CountryCode.Lt, CountryCode.Lv }, // Common EU + UK. Add GR if supported explicitly by enum, otherwise maybe generic EU?
                Language = Language.English,
                RedirectUri = !string.IsNullOrEmpty(_settings.RedirectUri) ? _settings.RedirectUri : "http://localhost:3000/", // Required for OAuth
            };

            // Add GR (Greece) if enum exists, otherwise rely on general support? 
            // Going.Plaid enums might be updated. It seems I should check enum or just pass string cast if needed. 
            // For now, I'll stick to a safe list. Plaid Europe supports: UK, FR, ES, IE, NL, DE, IT, PT, PL, DK, SE, EE, LT, LV. 
            // Greece might be covered but check enum via intellisense effectively or assume safe list.
            // If Greece is missing from Enum, I might need to cast or updated package.
            // Let's rely on what's available or check standard.

            var response = await _client.LinkTokenCreateAsync(request);

            if (response.Error != null)
            {
                throw new Exception($"Plaid Error: {response.Error.ErrorMessage} ({response.Error.ErrorCode})");
            }

            return response.LinkToken;
        }

        public async Task<string> ExchangePublicTokenAsync(string publicToken)
        {
            var request = new ItemPublicTokenExchangeRequest()
            {
                PublicToken = publicToken
            };

            var response = await _client.ItemPublicTokenExchangeAsync(request);

            if (response.Error != null)
            {
                throw new Exception($"Plaid Error: {response.Error.ErrorMessage}");
            }

            return response.AccessToken;
        }

        public async Task<(List<Going.Plaid.Entity.Transaction> Transactions, List<Account> Accounts)> GetTransactionsAsync(string accessToken, DateTime startDate, DateTime endDate)
        {
            // Plaid Transactions Sync is preferred over Get, but Get is simpler for stateless fetch
            // Let's use TransactionsGet for simplicity first, or Sync if we stored cursor.
            // Since interface asks for date range, we use Get.
            
            var request = new TransactionsGetRequest()
            {
                AccessToken = accessToken,
                StartDate = DateOnly.FromDateTime(startDate),
                EndDate = DateOnly.FromDateTime(endDate),
                Options = new TransactionsGetRequestOptions
                {
                    Count = 500,
                    Offset = 0
                }
            };

            var allTransactions = new List<Going.Plaid.Entity.Transaction>();
            var response = await _client.TransactionsGetAsync(request);

            if (response.Error != null)
            {
                throw new Exception($"Plaid Error: {response.Error.ErrorMessage}");
            }

            allTransactions.AddRange(response.Transactions);

            // Pagination logic if total > count
            while (allTransactions.Count < response.TotalTransactions)
            {
                request.Options.Offset = allTransactions.Count;
                response = await _client.TransactionsGetAsync(request);
                if (response.Error != null || response.Transactions.Count == 0) break;
                allTransactions.AddRange(response.Transactions);
            }

            // Return both transactions and accurate account balances from the same response
            return (allTransactions, response.Accounts.ToList());
        }

        public async Task<List<Account>> GetAccountsAsync(string accessToken)
        {
            var request = new AccountsGetRequest()
            {
                AccessToken = accessToken
            };

            var response = await _client.AccountsGetAsync(request);

            if (response.Error != null)
            {
                throw new Exception($"Plaid Error: {response.Error.ErrorMessage}");
            }

            return response.Accounts.ToList();
        }

        public async Task<List<Account>> GetBalancesAsync(string accessToken)
        {
            var request = new AccountsBalanceGetRequest()
            {
                AccessToken = accessToken
            };

            var response = await _client.AccountsBalanceGetAsync(request);

            if (response.Error != null)
            {
                throw new Exception($"Plaid Error: {response.Error.ErrorMessage}");
            }

            return response.Accounts.ToList();
        }
    }
}

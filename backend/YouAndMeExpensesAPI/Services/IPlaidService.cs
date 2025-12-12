using Going.Plaid.Entity;
using Going.Plaid.Link;

namespace YouAndMeExpensesAPI.Services
{
    public interface IPlaidService
    {
        Task<string> CreateLinkTokenAsync(string userId);
        Task<string> ExchangePublicTokenAsync(string publicToken);
        // Returns both transactions and the latest account data (balances)
        Task<(List<Going.Plaid.Entity.Transaction> Transactions, List<Account> Accounts)> GetTransactionsAsync(string accessToken, DateTime startDate, DateTime endDate);
        Task<List<Account>> GetAccountsAsync(string accessToken);
        Task<List<Account>> GetBalancesAsync(string accessToken);
    }
}

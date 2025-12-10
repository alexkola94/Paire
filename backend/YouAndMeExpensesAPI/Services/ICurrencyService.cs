using System.Collections.Generic;
using System.Threading.Tasks;

namespace YouAndMeExpensesAPI.Services
{
    public interface ICurrencyService
    {
        Task<Dictionary<string, string>> GetCurrenciesAsync();
        Task<Dictionary<string, decimal>> GetExchangeRatesAsync(string baseCurrency);
        Task<decimal> ConvertCurrencyAsync(string from, string to, decimal amount);
    }
}

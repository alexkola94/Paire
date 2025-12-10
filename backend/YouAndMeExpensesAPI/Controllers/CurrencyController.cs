using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpensesAPI.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class CurrencyController : ControllerBase
    {
        private readonly ICurrencyService _currencyService;

        public CurrencyController(ICurrencyService currencyService)
        {
            _currencyService = currencyService;
        }

        [HttpGet("list")]
        public async Task<IActionResult> GetCurrencies()
        {
            var currencies = await _currencyService.GetCurrenciesAsync();
            return Ok(currencies);
        }

        [HttpGet("rates")]
        public async Task<IActionResult> GetRates([FromQuery] string baseCurrency = "EUR")
        {
            var rates = await _currencyService.GetExchangeRatesAsync(baseCurrency);
            return Ok(rates);
        }

        [HttpGet("convert")]
        public async Task<IActionResult> Convert([FromQuery] string from, [FromQuery] string to, [FromQuery] decimal amount)
        {
            if (string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to) || amount < 0)
            {
                return BadRequest("Invalid parameters");
            }

            var result = await _currencyService.ConvertCurrencyAsync(from, to, amount);
            return Ok(new { from, to, amount, result });
        }
    }
}

using Microsoft.Extensions.Logging;
using Paire.Modules.Banking.Core.Interfaces;

namespace Paire.Modules.Banking.Core.Services;

public class EnableBankingService : IEnableBankingService
{
    private readonly ILogger<EnableBankingService> _logger;

    public EnableBankingService(ILogger<EnableBankingService> logger) => _logger = logger;

    public Task<List<AspspDto>> GetAspspsAsync(string country)
    {
        _logger.LogInformation("GetAspspsAsync called for country {Country}", country);
        return Task.FromResult(new List<AspspDto>());
    }
}

namespace Paire.Modules.Banking.Core.Interfaces;

public interface IEnableBankingService
{
    Task<List<AspspDto>> GetAspspsAsync(string country);
}

public class AspspDto
{
    public string Name { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string? Title { get; set; }
    public string? Logo { get; set; }
}

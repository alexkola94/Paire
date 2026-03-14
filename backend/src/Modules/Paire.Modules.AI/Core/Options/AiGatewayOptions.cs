namespace Paire.Modules.AI.Core.Options;

public class AiGatewayOptions
{
    public const string SectionName = "AiGateway";
    public bool Enabled { get; set; }
    public string BaseUrl { get; set; } = string.Empty;
    public string? TenantId { get; set; }
    public string? GatewaySecret { get; set; }
}

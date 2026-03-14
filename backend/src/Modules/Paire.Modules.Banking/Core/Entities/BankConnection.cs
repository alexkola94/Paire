using System.ComponentModel.DataAnnotations.Schema;

namespace Paire.Modules.Banking.Core.Entities;

[Table("bank_connections")]
public class BankConnection
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string AccessToken { get; set; } = string.Empty;
    public string? RefreshToken { get; set; }
    public DateTime? TokenExpiresAt { get; set; }
    public string? BankName { get; set; }
    public string[]? AccountIds { get; set; }
    public string? ConsentId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastSyncAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

[Table("bank_accounts")]
public class StoredBankAccount
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public Guid BankConnectionId { get; set; }
    public string AccountId { get; set; } = string.Empty;
    public string? Iban { get; set; }
    public string? AccountName { get; set; }
    public string? AccountType { get; set; }
    public string? Currency { get; set; }
    public string? BankName { get; set; }
    public decimal? CurrentBalance { get; set; }
    public DateTime? LastBalanceUpdate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

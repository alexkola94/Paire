using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Enable Banking configuration settings
    /// Supports both PEM private key (for JWT client assertion) and client secret
    /// </summary>
    public class EnableBankingSettings
    {
        public string ClientId { get; set; } = string.Empty;
        
        /// <summary>
        /// Client secret (for basic auth) - used if PrivateKeyPem is not provided
        /// </summary>
        public string ClientSecret { get; set; } = string.Empty;
        
        /// <summary>
        /// PEM private key content (for JWT client assertion)
        /// Can be provided as a string or file path
        /// </summary>
        public string? PrivateKeyPem { get; set; }
        
        /// <summary>
        /// Path to PEM private key file (alternative to PrivateKeyPem)
        /// </summary>
        public string? PrivateKeyPemPath { get; set; }
        
        /// <summary>
        /// Key ID (kid) for the private key (if required by Enable Banking)
        /// </summary>
        public string? KeyId { get; set; }
        
        public string RedirectUri { get; set; } = string.Empty;
        public string BaseUrl { get; set; } = "https://api.enablebanking.com";
        public string AuthorizationUrl { get; set; } = "https://api.enablebanking.com/auth"; 
        public string TokenUrl { get; set; } = "https://api.enablebanking.com/oauth2/token"; // Likely unused now
        public string[] Scopes { get; set; } = new[] { "accounts", "details", "transactions" };
    }

    public class PlaidSettings
    {
        public string ClientId { get; set; } = string.Empty;
        public string Secret { get; set; } = string.Empty;
        public string Environment { get; set; } = "Sandbox";
        public string RedirectUri { get; set; } = string.Empty;
    }

    /// <summary>
    /// ASPSP (Account Servicing Payment Service Provider) - i.e., Bank
    /// </summary>
    public class Aspsp
    {
        [Newtonsoft.Json.JsonProperty("name")]
        public string Name { get; set; } = string.Empty;

        [Newtonsoft.Json.JsonProperty("country")]
        public string Country { get; set; } = string.Empty;
        
        [Newtonsoft.Json.JsonProperty("title")]
        public string? Title { get; set; }
        
        [Newtonsoft.Json.JsonProperty("logo")]
        public string? Logo { get; set; }
    }

    public class AspspResponse 
    {
        [Newtonsoft.Json.JsonProperty("aspsps")]
        public List<Aspsp> Aspsps { get; set; } = new List<Aspsp>();
    }

    /// <summary>
    /// OAuth token response from Enable Banking
    /// </summary>
    public class EnableBankingTokenResponse
    {
        [Newtonsoft.Json.JsonProperty("access_token")]
        public string AccessToken { get; set; } = string.Empty;

        [Newtonsoft.Json.JsonProperty("token_type")]
        public string TokenType { get; set; } = "Bearer";

        [Newtonsoft.Json.JsonProperty("expires_in")]
        public int ExpiresIn { get; set; }

        [Newtonsoft.Json.JsonProperty("refresh_token")]
        public string? RefreshToken { get; set; }

        [Newtonsoft.Json.JsonProperty("scope")]
        public string? Scope { get; set; }
    }

    /// <summary>
    /// Bank account information from Enable Banking API
    /// </summary>
    public class BankAccount
    {
        [Newtonsoft.Json.JsonProperty("uid")]
        public string AccountId { get; set; } = string.Empty; // Changed from account_id to uid for consistency with Enable Banking

        [Newtonsoft.Json.JsonProperty("iban")]
        public string? Iban { get; set; }

        // Mapped from account_id if not present as separate field in some contexts
        [Newtonsoft.Json.JsonProperty("account_id")] 
        public string? AlternateAccountId { get; set; }

        [Newtonsoft.Json.JsonProperty("currency")]
        public string? Currency { get; set; }
    }

    /// <summary>
    /// Bank account balance information
    /// </summary>
    public class BankBalance
    {
        public string AccountId { get; set; } = string.Empty;
        // Wrapper for the balance response structure
        // structure: { "balances": [ { "amount": { "amount": "123.45", "currency": "EUR" }, ... } ] }
        // Flattened here for simplicity in internal model, but serialization logic in service handles mapping
        public decimal Balance { get; set; }
        public string Currency { get; set; } = string.Empty;
        public DateTime? LastUpdated { get; set; }
    }

    /// <summary>
    /// Bank transaction from Enable Banking API
    /// </summary>
    public class BankTransaction
    {
        [Newtonsoft.Json.JsonProperty("transaction_id")]
        public string TransactionId { get; set; } = string.Empty;
        
        [Newtonsoft.Json.JsonProperty("remittance_information_unstructured")]
        public string? Description { get; set; }

        [Newtonsoft.Json.JsonProperty("transaction_amount")]
        public TransactionAmount AmountData { get; set; } = new TransactionAmount();

        // Helpers to flatten access
        public decimal Amount => decimal.TryParse(AmountData?.Amount, out var val) ? val : 0;
        public string Currency => AmountData?.Currency ?? "";

        [Newtonsoft.Json.JsonProperty("value_date")]
        public DateTime? ValueDate { get; set; }
        
        [Newtonsoft.Json.JsonProperty("booking_date")]
        public DateTime? TransactionDate { get; set; }
        
        // Additional fields based on API...
    }

    public class TransactionAmount 
    {
        [Newtonsoft.Json.JsonProperty("amount")]
        public string Amount { get; set; } = "0";
        
        [Newtonsoft.Json.JsonProperty("currency")]
        public string Currency { get; set; } = "";
    }

    /// <summary>
    /// Stored bank connection for a user
    /// Maps to database table
    /// </summary>
    [Table("bank_connections")]
    public class BankConnection
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        // For Enable Banking, we might store the session ID or refresh token if applicable.
        // The service typically uses the App JWT for everything, but user context is needed.
        // We will store the ValidUntil date.
        
        [Column("access_token")]
        public string AccessToken { get; set; } = string.Empty; // Treating Session ID as Access Token for compatibility

        [Column("refresh_token")]
        public string? RefreshToken { get; set; }

        [Column("token_expires_at")]
        public DateTime? TokenExpiresAt { get; set; }

        [Column("bank_name")]
        public string? BankName { get; set; }

        [Column("account_ids")]
        public string[]? AccountIds { get; set; }

        [Column("consent_id")]
        public string? ConsentId { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("last_sync_at")]
        public DateTime? LastSyncAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Stored bank account in our database
    /// </summary>
    [Table("bank_accounts")]
    public class StoredBankAccount
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("bank_connection_id")]
        public Guid BankConnectionId { get; set; }

        [Column("account_id")]
        public string AccountId { get; set; } = string.Empty; // External account ID from Enable Banking

        [Column("iban")]
        public string? Iban { get; set; }

        [Column("account_name")]
        public string? AccountName { get; set; }

        [Column("account_type")]
        public string? AccountType { get; set; }

        [Column("currency")]
        public string? Currency { get; set; }

        [Column("bank_name")]
        public string? BankName { get; set; }

        [Column("current_balance")]
        public decimal? CurrentBalance { get; set; }

        [Column("last_balance_update")]
        public DateTime? LastBalanceUpdate { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}

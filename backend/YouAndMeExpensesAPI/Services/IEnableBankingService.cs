using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Interface for Enable Banking Open Banking service
    /// Handles valid Aggregation API flow
    /// </summary>
    public interface IEnableBankingService
    {
        /// <summary>
        /// Gets list of available ASPSPs (Banks) for a country
        /// </summary>
        Task<List<Aspsp>> GetAspspsAsync(string country);

        /// <summary>
        /// Starts user authorization session for a specific bank
        /// </summary>
        /// <returns>Authorization response with URL and consent_id</returns>
        Task<AuthorizationResponse> StartUserAuthorizationAsync(string bankName, string country, string redirectUrl, string state);

        /// <summary>
        /// Creates a user session after callback with code
        /// </summary>
        /// <returns>Session information including accounts</returns>
        Task<dynamic> CreateUserSessionAsync(string code);

        /// <summary>
        /// Gets list of accounts from an active session or by fetching fresh
        /// Note: In Enable Banking, accounts are returned in the Session object.
        /// This method might be used if we need to refresh the list or get details.
        /// </summary>
        Task<List<BankAccount>> GetAccountsAsync(string? sessionJson = null);

        /// <summary>
        /// Gets balance for a specific account UID
        /// </summary>
        Task<BankBalance> GetBalanceAsync(string accountUid);

        /// <summary>
        /// Gets transactions for a specific account UID
        /// </summary>
        Task<List<BankTransaction>> GetTransactionsAsync(string accountUid, DateTime? fromDate = null, DateTime? toDate = null);
        
        /// <summary>
        /// Revokes a consent (disconnects bank connection)
        /// </summary>
        Task<bool> RevokeConsentAsync(string consentId);
        
        /// <summary>
        /// Gets all consents for the application
        /// </summary>
        Task<List<ConsentInfo>> GetConsentsAsync();
        
        // Removed: RefreshTokenAsync - Enable Banking sessions have a valid_until time, but "refresh tokens" in OAuth sense aren't used the same way.
        // We might need to re-authenticate if session expires.
    }
    
    /// <summary>
    /// Authorization response from Enable Banking
    /// </summary>
    public class AuthorizationResponse
    {
        [Newtonsoft.Json.JsonProperty("url")]
        public string Url { get; set; } = string.Empty;
        
        [Newtonsoft.Json.JsonProperty("consent_id")]
        public string? ConsentId { get; set; }
        
        [Newtonsoft.Json.JsonProperty("expires_at")]
        public DateTime? ExpiresAt { get; set; }
    }
    
    /// <summary>
    /// Consent information from Enable Banking
    /// </summary>
    public class ConsentInfo
    {
        [Newtonsoft.Json.JsonProperty("consent_id")]
        public string ConsentId { get; set; } = string.Empty;
        
        [Newtonsoft.Json.JsonProperty("status")]
        public string? Status { get; set; }
        
        [Newtonsoft.Json.JsonProperty("expires_at")]
        public DateTime? ExpiresAt { get; set; }
    }
    
    /// <summary>
    /// Consents response from Enable Banking
    /// </summary>
    public class ConsentsResponse
    {
        [Newtonsoft.Json.JsonProperty("consents")]
        public List<ConsentInfo> Consents { get; set; } = new List<ConsentInfo>();
    }
}

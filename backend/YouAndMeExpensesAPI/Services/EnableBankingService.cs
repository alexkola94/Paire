using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System.Security.Cryptography;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using YouAndMeExpensesAPI.Models;
using System.Net.Http.Headers;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Enable Banking Open Banking service implementation
    /// Handles Aggregation API flow (Self-signed JWT -> API calls)
    /// </summary>
    public class EnableBankingService : IEnableBankingService
    {
        private readonly EnableBankingSettings _settings;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<EnableBankingService> _logger;

        public EnableBankingService(
            IOptions<EnableBankingSettings> settings,
            IHttpClientFactory httpClientFactory,
            ILogger<EnableBankingService> logger)
        {
            _settings = settings.Value;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        /// <summary>
        /// Generates the self-signed JWT required for all Enable Banking API calls
        /// </summary>
        private string GenerateApiToken()
        {
            try
            {
                _logger.LogInformation("Generating Enable Banking API Token...");
                _logger.LogInformation($"Using ClientId: '{_settings?.ClientId}'"); // Log ClientId to verify
                
                var pemContent = LoadPrivateKeyPem();
                _logger.LogInformation($"PEM Content Loaded. Length: {pemContent?.Length ?? 0}");

                var privateKey = LoadPrivateKeyFromPem(pemContent);
                _logger.LogInformation("Private Key parsed successfully.");

                var now = DateTime.UtcNow;
                var iat = (long)(now - new DateTime(1970, 1, 1)).TotalSeconds;
                var exp = iat + 3600; // 1 hour expiration

                var payload = new Dictionary<string, object>
                {
                    { "iss", "enablebanking.com" },
                    { "aud", "api.enablebanking.com" },
                    { "iat", iat },
                    { "exp", exp }
                };
                
                _logger.LogInformation($"JWT Payload: iss=enablebanking.com, aud=api.enablebanking.com, iat={iat}, exp={exp}");

                // Create Header
                // KID corresponds to the Application ID (which is usually the file name of the PEM or assigned ID)
                // We use ClientId setting for this application ID.
                var header = new JwtHeader(new SigningCredentials(privateKey, SecurityAlgorithms.RsaSha256));
                header["typ"] = "JWT";
                if (!string.IsNullOrEmpty(_settings.ClientId))
                {
                    header["kid"] = _settings.ClientId;
                }
                
                _logger.LogInformation($"JWT Header: kid={header["kid"]}, alg={header["alg"]}, typ={header["typ"]}");

                var payloadSec = new JwtPayload();
                foreach (var kvp in payload)
                {
                    payloadSec.Add(kvp.Key, kvp.Value);
                }

                var token = new JwtSecurityToken(header, payloadSec);
                var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
                
                _logger.LogInformation("JWT Token generated successfully.");
                return tokenString;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Enable Banking API Token");
                throw;
            }
        }

        private HttpClient CreateClient()
        {
            var token = GenerateApiToken();
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        public async Task<List<Aspsp>> GetAspspsAsync(string country)
        {
            try
            {
                var client = CreateClient();
                var url = $"{_settings.BaseUrl}/aspsps?country={country}";
                var response = await client.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    throw new Exception($"Failed to get ASPSPs: {response.StatusCode} - {error}");
                }

                var content = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<AspspResponse>(content);
                return result?.Aspsps ?? new List<Aspsp>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching ASPSPs");
                throw;
            }
        }

        public async Task<AuthorizationResponse> StartUserAuthorizationAsync(string bankName, string country, string redirectUrl, string state)
        {
            try
            {
                var client = CreateClient();
                
                var validUntil = DateTime.UtcNow.AddDays(89).ToString("yyyy-MM-ddTHH:mm:sszzz"); // 90 days usually max for consent without re-auth

                var body = new
                {
                    access = new { valid_until = validUntil },
                    aspsp = new { name = bankName, country = country },
                    state = state,
                    redirect_url = redirectUrl,
                    psu_type = "personal" // or business, maybe make configurable
                };

                var response = await client.PostAsJsonAsync($"{_settings.BaseUrl}/auth", body);
                 
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Enable Banking authorization failed. Status: {StatusCode}, Error: {Error}, RedirectUrl: {RedirectUrl}", 
                        response.StatusCode, error, redirectUrl);
                    throw new Exception($"Failed to start authorization: {response.StatusCode} - {error}. Redirect URL used: {redirectUrl}");
                }

                var content = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<AuthorizationResponse>(content);
                
                if (result == null || string.IsNullOrEmpty(result.Url))
                {
                    throw new Exception("Invalid authorization response from Enable Banking");
                }
                
                _logger.LogInformation("Authorization started. Consent ID: {ConsentId}, URL: {Url}", result.ConsentId, result.Url);
                
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting user authorization");
                throw;
            }
        }

        public async Task<dynamic> CreateUserSessionAsync(string code)
        {
            try
            {
                var client = CreateClient();
                var body = new { code = code };
                
                var response = await client.PostAsJsonAsync($"{_settings.BaseUrl}/sessions", body);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    throw new Exception($"Failed to create session: {response.StatusCode} - {error}");
                }

                var content = await response.Content.ReadAsStringAsync();
                _logger.LogInformation("Enable Banking session response: {Content}", content);
                
                // We return dynamic because the session object contains 'accounts' which we want, and 'uid' (session id)
                var sessionData = JsonConvert.DeserializeObject<dynamic>(content);
                
                // Log the structure to help debug
                if (sessionData != null)
                {
                    try
                    {
                        var jObject = sessionData as Newtonsoft.Json.Linq.JObject;
                        if (jObject != null)
                        {
                            _logger.LogInformation("Session data properties: {Properties}", 
                                string.Join(", ", jObject.Properties().Select(p => $"{p.Name}: {p.Value?.Type}")));
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not log session data structure");
                    }
                }
                
                return sessionData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating user session");
                throw;
            }
        }

        public async Task<List<BankAccount>> GetAccountsAsync(string? sessionJson = null)
        {
            // If we have the session JSON from the creation step, we can parse accounts directly from it.
            // Enable Banking doesn't always have a simple "Get All Accounts" endpoint detached from session creation 
            // without using the session ID or account UIDs.
            // If calling fresh, we might need to rely on stored account UIDs in our DB.
            
            // However, typically you get accounts at session creation time.
            // If we want to refresh 'details', we call /accounts/{uid} for each account.
            
            // For now, let's assume this method processes the session object or similar context.
            // If sessionJson is passed (from CreateUserSession), parse it.
            
            if (!string.IsNullOrEmpty(sessionJson))
            {
                 var session = JsonConvert.DeserializeObject<dynamic>(sessionJson);
                 if (session?.accounts != null)
                 {
                     var accounts = new List<BankAccount>();
                     foreach (var acc in session.accounts)
                     {
                         // Map dynamic to BankAccount
                         accounts.Add(new BankAccount 
                         { 
                             AccountId = acc.uid,
                             Iban = acc.account_id?.iban, // Structure varies by bank
                             Currency = acc.currency
                         });
                    }
                    return accounts;
                 }
            }

            return new List<BankAccount>();
        }

        public async Task<BankBalance> GetBalanceAsync(string accountUid)
        {
            try
            {
                var client = CreateClient();
                var url = $"{_settings.BaseUrl}/accounts/{accountUid}/balances";
                var response = await client.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"Failed to get balance: {response.StatusCode}");
                }

                var content = await response.Content.ReadAsStringAsync();
                var json = JsonConvert.DeserializeObject<dynamic>(content);
                
                // Parse the first balance found
                var balances = json.balances;
                if (balances != null && balances.Count > 0)
                {
                    var first = balances[0];
                    return new BankBalance
                    {
                        AccountId = accountUid,
                        Balance = (decimal)first.amount.amount,
                        Currency = (string)first.amount.currency,
                        LastUpdated = DateTime.UtcNow
                    };
                }
                
                return new BankBalance();
            }
            catch (Exception ex)
            {
                 _logger.LogError(ex, $"Error getting balance for {accountUid}");
                 throw;
            }
        }

        public async Task<List<BankTransaction>> GetTransactionsAsync(string accountUid, DateTime? fromDate = null, DateTime? toDate = null)
        {
            try
            {
                 var client = CreateClient();
                 var url = $"{_settings.BaseUrl}/accounts/{accountUid}/transactions";
                 // Add query params if needed (Enable Banking might use different param names, check docs, assuming none for basic GET or handled internally)
                 
                 var response = await client.GetAsync(url);
                 if (!response.IsSuccessStatusCode) throw new Exception($"Failed: {response.StatusCode}");
                 
                 var content = await response.Content.ReadAsStringAsync();
                 var json = JsonConvert.DeserializeObject<dynamic>(content);
                 
                 var transactions = new List<BankTransaction>();
                 if (json.transactions != null)
                 {
                     foreach (var t in json.transactions)
                     {
                         transactions.Add(new BankTransaction
                         {
                             TransactionId = t.transaction_id,
                             AmountData = new TransactionAmount { Amount = t.transaction_amount.amount, Currency = t.transaction_amount.currency },
                             Description = t.remittance_information_unstructured,
                             TransactionDate = t.booking_date,
                             ValueDate = t.value_date
                         });
                     }
                 }
                 return transactions;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting transactions");
                throw;
            }
        }

        /// <summary>
        /// Revokes a consent (disconnects bank connection)
        /// DELETE /v3/consents/{consent_id}
        /// </summary>
        public async Task<bool> RevokeConsentAsync(string consentId)
        {
            try
            {
                var client = CreateClient();
                var response = await client.DeleteAsync($"{_settings.BaseUrl}/v3/consents/{consentId}");
                
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to revoke consent {ConsentId}. Status: {StatusCode}, Error: {Error}", 
                        consentId, response.StatusCode, error);
                    return false;
                }
                
                _logger.LogInformation("Successfully revoked consent {ConsentId}", consentId);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error revoking consent {ConsentId}", consentId);
                return false;
            }
        }

        /// <summary>
        /// Gets all consents for the application
        /// GET /v3/consents
        /// </summary>
        public async Task<List<ConsentInfo>> GetConsentsAsync()
        {
            try
            {
                var client = CreateClient();
                var response = await client.GetAsync($"{_settings.BaseUrl}/v3/consents");
                
                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Failed to get consents. Status: {StatusCode}, Error: {Error}", 
                        response.StatusCode, error);
                    return new List<ConsentInfo>();
                }
                
                var content = await response.Content.ReadAsStringAsync();
                var result = JsonConvert.DeserializeObject<ConsentsResponse>(content);
                
                return result?.Consents ?? new List<ConsentInfo>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting consents");
                return new List<ConsentInfo>();
            }
        }

        // Helpers for Key Loading
        private string LoadPrivateKeyPem()
        {
            if (!string.IsNullOrEmpty(_settings.PrivateKeyPemPath))
            {
                if (!File.Exists(_settings.PrivateKeyPemPath)) throw new FileNotFoundException($"Key file not found: {_settings.PrivateKeyPemPath}");
                return File.ReadAllText(_settings.PrivateKeyPemPath);
            }
            if (!string.IsNullOrEmpty(_settings.PrivateKeyPem)) return _settings.PrivateKeyPem;
            throw new Exception("Private key not configured");
        }

        private RsaSecurityKey LoadPrivateKeyFromPem(string pemContent)
        {
            var privateKeyBase64 = pemContent
                .Replace("-----BEGIN PRIVATE KEY-----", "")
                .Replace("-----END PRIVATE KEY-----", "")
                .Replace("-----BEGIN RSA PRIVATE KEY-----", "")
                .Replace("-----END RSA PRIVATE KEY-----", "")
                .Replace("\r", "").Replace("\n", "").Replace(" ", "");

            var privateKeyBytes = Convert.FromBase64String(privateKeyBase64);
            using var rsa = RSA.Create();
            
            try { rsa.ImportPkcs8PrivateKey(privateKeyBytes, out _); }
            catch { rsa.ImportRSAPrivateKey(privateKeyBytes, out _); }
            
            return new RsaSecurityKey(rsa.ExportParameters(true));
        }
    }
}

using System.Text;
using System.Text.Json;
using System.Net.Http.Headers;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public interface IShieldAuthService
    {
        Task<ProxyAuthResponse> LoginAsync(object request);
        Task<ProxyAuthResponse> RegisterAsync(object request, string? tenantId = null);
        Task<ProxyAuthResponse> RefreshTokenAsync(object request);
        Task<ProxyAuthResponse> RevokeAsync(string token);
        Task<ProxyAuthResponse> ForgotPasswordAsync(object request);
        Task<ProxyAuthResponse> ResetPasswordAsync(object request);
        Task<ProxyAuthResponse> VerifyEmailAsync(object request);
        Task<ProxyAuthResponse> ResendVerificationEmailAsync(object request);
        Task<ProxyAuthResponse> ChangePasswordAsync(object request, string token);
        Task<ProxyAuthResponse> DeleteAccountAsync(object request, string token);
        Task<ProxyAuthResponse> GetUserTenantAsync(string token);
        Task<bool> ValidateSessionAsync(string sessionId);
        Task<bool> ValidatePasswordAsync(string token, string password);
        
        // Two-Factor Authentication
        Task<ProxyAuthResponse> Setup2FAAsync(string token);
        Task<ProxyAuthResponse> Enable2FAAsync(object request, string token);
        Task<ProxyAuthResponse> Disable2FAAsync(object request, string token);
        Task<ProxyAuthResponse> Verify2FAAsync(object request);
        Task<ProxyAuthResponse> VerifyBackupCodeAsync(object request);
        Task<ProxyAuthResponse> RegenerateBackupCodesAsync(object request, string token);
        Task<ProxyAuthResponse> Get2FAStatusAsync(string token);

        /// <summary>
        /// Lightweight warmup ping to the Shield Auth service used to trigger cold-start spin-up.
        /// Should use a very short timeout and swallow errors.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task PingAsync(CancellationToken cancellationToken = default);
    }

    public class ShieldAuthService : IShieldAuthService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ShieldAuthService> _logger;
        private readonly string _baseUrl;

        public ShieldAuthService(HttpClient httpClient, ILogger<ShieldAuthService> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _baseUrl = configuration["Shield:BaseUrl"] ?? "http://localhost:5002/api/v1/auth";
        }

        public async Task<ProxyAuthResponse> LoginAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/login", request);

        public async Task<ProxyAuthResponse> RegisterAsync(object request, string? tenantId = null)
        {
            var headers = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(tenantId))
            {
                headers.Add("X-Tenant-Id", tenantId);
            }
            return await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/register", request, null, headers);
        }

        public async Task<ProxyAuthResponse> RefreshTokenAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/refresh-token", request);

        public async Task<ProxyAuthResponse> RevokeAsync(string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/revoke", null, token);

        public async Task<ProxyAuthResponse> ForgotPasswordAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/forgot-password", request);

        public async Task<ProxyAuthResponse> ResetPasswordAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/reset-password", request);

        public async Task<ProxyAuthResponse> VerifyEmailAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/verify-email", request);

        public async Task<ProxyAuthResponse> ResendVerificationEmailAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/resend-verification-email", request);

        public async Task<ProxyAuthResponse> ChangePasswordAsync(object request, string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/change-password", request, token);

        public async Task<ProxyAuthResponse> DeleteAccountAsync(object request, string token)
            => await ProxyRequestAsync(HttpMethod.Delete, $"{_baseUrl}/delete-account", request, token);

        public async Task<ProxyAuthResponse> GetUserTenantAsync(string token)
            => await ProxyRequestAsync(HttpMethod.Get, $"{_baseUrl}/user-tenant", null, token);

        public async Task<bool> ValidateSessionAsync(string sessionId)
        {
            // We use a direct HTTP call (via ProxyRequest logic or simplified)
            // Since ValidateSession returns a boolean wrapped in JSON { isValid: true/false }
            var response = await ProxyRequestAsync(HttpMethod.Get, $"{_baseUrl}/sessions/{sessionId}/validate");
            if (response.IsSuccess)
            {
                 try 
                 {
                     using var doc = JsonDocument.Parse(response.Content);
                     if (doc.RootElement.TryGetProperty("isValid", out var isValidProp))
                     {
                         return isValidProp.GetBoolean();
                     }
                 } 
                 catch {}
            }
            return false; // Fail safe
        }

        public async Task<bool> ValidatePasswordAsync(string token, string password)
        {
             var response = await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/validate-password", new { Password = password }, token);
             if (response.IsSuccess)
             {
                 return true;
             }
             return false;
        }

        // Two-Factor Authentication
        public async Task<ProxyAuthResponse> Setup2FAAsync(string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/2fa/setup", null, token);

        public async Task<ProxyAuthResponse> Enable2FAAsync(object request, string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/2fa/enable", request, token);

        public async Task<ProxyAuthResponse> Disable2FAAsync(object request, string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/2fa/disable", request, token);

        public async Task<ProxyAuthResponse> Verify2FAAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/2fa/verify", request);

        public async Task<ProxyAuthResponse> VerifyBackupCodeAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/2fa/verify-backup", request);

        public async Task<ProxyAuthResponse> RegenerateBackupCodesAsync(object request, string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{_baseUrl}/2fa/regenerate-backup-codes", request, token);

        public async Task<ProxyAuthResponse> Get2FAStatusAsync(string token)
            => await ProxyRequestAsync(HttpMethod.Get, $"{_baseUrl}/2fa/status", null, token);

        public async Task PingAsync(CancellationToken cancellationToken = default)
        {
            var url = $"{_baseUrl.TrimEnd('/')}/health";
            using var request = new HttpRequestMessage(HttpMethod.Get, url);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(3));

            try
            {
                using var response = await _httpClient.SendAsync(request, cts.Token);
                _logger.LogDebug("Shield warmup ping to {Url} -> {StatusCode}", url, (int)response.StatusCode);
            }
            catch (OperationCanceledException ex) when (cts.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
            {
                _logger.LogDebug(ex, "Shield warmup ping timed out for {Url}", url);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Shield warmup ping failed for {Url}", url);
            }
        }

        private async Task<ProxyAuthResponse> ProxyRequestAsync(HttpMethod method, string url, object? payload = null, string? token = null, Dictionary<string, string>? headers = null)
        {
            try
            {
                var request = new HttpRequestMessage(method, url);

                if (payload != null)
                {
                    var jsonOptions = new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                    };
                    var json = JsonSerializer.Serialize(payload, jsonOptions);
                    request.Content = new StringContent(json, Encoding.UTF8, "application/json");
                }

                if (!string.IsNullOrEmpty(token))
                {
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Replace("Bearer ", ""));
                }

                if (headers != null)
                {
                    foreach (var header in headers)
                    {
                        request.Headers.Add(header.Key, header.Value);
                    }
                }

                var response = await _httpClient.SendAsync(request);
                var responseContent = await response.Content.ReadAsStringAsync();

                return new ProxyAuthResponse
                {
                    IsSuccess = response.IsSuccessStatusCode,
                    StatusCode = (int)response.StatusCode,
                    Content = responseContent,
                    ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to connect to Shield Auth Service at {Url}", url);
                return new ProxyAuthResponse 
                { 
                    IsSuccess = false, 
                    StatusCode = 503, 
                    Content = JsonSerializer.Serialize(new { error = "Auth Service Unavailable", details = ex.Message }) 
                };
            }
        }
    }

    public class ProxyAuthResponse
    {
        public bool IsSuccess { get; set; }
        public int StatusCode { get; set; }
        public string Content { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/json";
    }
}

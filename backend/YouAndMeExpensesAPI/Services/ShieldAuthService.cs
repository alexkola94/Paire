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
    }

    public class ShieldAuthService : IShieldAuthService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<ShieldAuthService> _logger;
        // Using localhost directly as per user config
        private const string BaseUrl = "http://localhost:5002/api/v1/auth";

        public ShieldAuthService(HttpClient httpClient, ILogger<ShieldAuthService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<ProxyAuthResponse> LoginAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/login", request);

        public async Task<ProxyAuthResponse> RegisterAsync(object request, string? tenantId = null)
        {
            var headers = new Dictionary<string, string>();
            if (!string.IsNullOrEmpty(tenantId))
            {
                headers.Add("X-Tenant-Id", tenantId);
            }
            return await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/register", request, null, headers);
        }

        public async Task<ProxyAuthResponse> RefreshTokenAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/refresh-token", request);

        public async Task<ProxyAuthResponse> RevokeAsync(string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/revoke", null, token);

        public async Task<ProxyAuthResponse> ForgotPasswordAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/forgot-password", request);

        public async Task<ProxyAuthResponse> ResetPasswordAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/reset-password", request);

        public async Task<ProxyAuthResponse> VerifyEmailAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/verify-email", request);

        public async Task<ProxyAuthResponse> ResendVerificationEmailAsync(object request)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/resend-verification-email", request);

        public async Task<ProxyAuthResponse> ChangePasswordAsync(object request, string token)
            => await ProxyRequestAsync(HttpMethod.Post, $"{BaseUrl}/change-password", request, token);

        public async Task<ProxyAuthResponse> DeleteAccountAsync(object request, string token)
            => await ProxyRequestAsync(HttpMethod.Delete, $"{BaseUrl}/delete-account", request, token);

        public async Task<ProxyAuthResponse> GetUserTenantAsync(string token)
            => await ProxyRequestAsync(HttpMethod.Get, $"{BaseUrl}/user-tenant", null, token);

        private async Task<ProxyAuthResponse> ProxyRequestAsync(HttpMethod method, string url, object? payload = null, string? token = null, Dictionary<string, string>? headers = null)
        {
            try
            {
                var request = new HttpRequestMessage(method, url);

                if (payload != null)
                {
                    request.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
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

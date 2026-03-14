using Paire.Modules.Identity.Core.Services;

namespace Paire.Modules.Identity.Core.Interfaces
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
        Task PingAsync(CancellationToken cancellationToken = default);
    }
}

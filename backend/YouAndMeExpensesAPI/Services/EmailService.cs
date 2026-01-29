using Microsoft.Extensions.Options;
using System.Text;
using System.Text.Json;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Email service implementation using Resend HTTP API
    /// Switches from SMTP to HTTP to avoid port blocking issues
    /// </summary>
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;
        private readonly HttpClient _httpClient;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger, HttpClient httpClient)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
            _httpClient = httpClient;
            
            // Validate email settings on startup
            ValidateEmailSettings();
        }

        /// <summary>
        /// Validates that email settings are properly configured
        /// </summary>
        private void ValidateEmailSettings()
        {
            var missingSettings = new List<string>();
            
            // For API we mostly need the Key (Password) and From Address
            if (string.IsNullOrWhiteSpace(_emailSettings.SenderEmail))
                missingSettings.Add("SenderEmail");
            
            if (string.IsNullOrWhiteSpace(_emailSettings.Password))
                missingSettings.Add("Password (API Key)");
            
            if (missingSettings.Any())
            {
                _logger.LogWarning("⚠️ Email settings are incomplete. Missing: {MissingSettings}. " +
                    "Configure these in Render.com environment variables.",
                    string.Join(", ", missingSettings));
            }
            else
            {
                _logger.LogInformation("✅ Email Service Configured (Resend API mode). From: {SenderEmail}", _emailSettings.SenderEmail);
            }
        }

        /// <summary>
        /// Sends a single email via Resend Web API
        /// </summary>
        public async Task<bool> SendEmailAsync(EmailMessage emailMessage)
        {
            try
            {
                var requestBody = new
                {
                    from = $"{_emailSettings.SenderName} <{_emailSettings.SenderEmail}>",
                    to = new[] { emailMessage.ToEmail },
                    subject = emailMessage.Subject,
                    html = emailMessage.IsHtml ? emailMessage.Body : null,
                    text = !emailMessage.IsHtml ? emailMessage.Body : null
                };

                var json = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                // Set Authorization Header (Bearer Token)
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _emailSettings.Password);

                var response = await _httpClient.PostAsync("/emails", content);

                if (response.IsSuccessStatusCode)
                {
                    var responseData = await response.Content.ReadAsStringAsync();
                    _logger.LogInformation($"✅ Email sent successfully to {emailMessage.ToEmail}. Response: {responseData}");
                    return true;
                }
                else
                {
                    var errorData = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"❌ Failed to send email to {emailMessage.ToEmail}. Status: {response.StatusCode}. Error: {errorData}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Exception when sending email to {ToEmail}", emailMessage.ToEmail);
                return false;
            }
        }

        /// <summary>
        /// Sends multiple emails in bulk
        /// </summary>
        public async Task<int> SendBulkEmailAsync(List<EmailMessage> emailMessages)
        {
            int successCount = 0;
            foreach (var emailMessage in emailMessages)
            {
                if (await SendEmailAsync(emailMessage))
                {
                    successCount++;
                }
                // Small delay to be polite to the API
                await Task.Delay(100);
            }
            return successCount;
        }

        /// <summary>
        /// Sends a test email to verify Configuration
        /// </summary>
        public async Task<bool> SendTestEmailAsync(string toEmail)
        {
            var emailMessage = new EmailMessage
            {
                ToEmail = toEmail,
                ToName = "Test User",
                Subject = "Test Email from Paire (Resend API)",
                Body = GetTestEmailTemplate(),
                IsHtml = true
            };

            return await SendEmailAsync(emailMessage);
        }

        private string GetTestEmailTemplate()
        {
            var frontendUrl = "http://localhost:3000"; 
            var message = @"
                <p>Hi there!</p>
                <p>This is a test email sent via the <strong>Resend Web API</strong>.</p>
                <p>If you are reading this, your SMTP port blocking issues are resolved permanently!</p>";
            
            return CreateReminderEmailTemplate("✅ API Email Working!", message, frontendUrl);
        }

        /// <summary>
        /// Creates the shared HTML email template with Paire branding.
        /// When actionUrl is provided (e.g. reset/verification), the message already contains the CTA so we do not add a duplicate "Open App" block.
        /// When actionUrl is empty, shows a single "Open App" button linking to login.
        /// </summary>
        public static string CreateReminderEmailTemplate(string title, string message, string frontendUrl = "", string actionUrl = "")
        {
            if (string.IsNullOrEmpty(frontendUrl)) frontendUrl = "http://localhost:3000";
            if (frontendUrl.Contains(';')) frontendUrl = frontendUrl.Split(';')[0].Trim();

            var loginUrl = $"{frontendUrl}/login";
            // Only show footer CTA when no action URL was provided (reminder/test emails); reset/verification emails already have their button in the message body
            var showOpenAppCta = string.IsNullOrEmpty(actionUrl);
            var ctaBlock = showOpenAppCta
                ? $@"<div style=""text-align: center; margin-top: 30px;""><a href=""{loginUrl}"" class=""button"">Open App</a></div>"
                : "";

            return $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #F9FAFB; padding: 20px; }}
        .email-wrapper {{ max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); color: white; padding: 32px 24px; text-align: center; }}
        .header .brand {{ font-size: 14px; font-weight: 600; letter-spacing: 0.05em; opacity: 0.95; margin-bottom: 8px; }}
        .header h1 {{ font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }}
        .content {{ padding: 32px 24px; }}
        .content p {{ margin-bottom: 12px; }}
        .button {{ display: inline-block; background: #8B5CF6; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: 600; transition: opacity 0.2s; }}
        .button:hover {{ opacity: 0.9; }}
    </style>
</head>
<body>
    <div class=""email-wrapper"">
        <div class=""header"">
            <div class=""brand"">Paire</div>
            <h1>{title}</h1>
        </div>
        <div class=""content"">
            {message}
            {ctaBlock}
        </div>
    </div>
</body>
</html>";
        }
        public static string CreateResetPasswordEmailTemplate(string resetLink)
        {
            var title = "Reset Your Password";
            var message = $@"
                <p>Hello,</p>
                <p>We received a request to reset your password. Click the button below to proceed:</p>
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{resetLink}' class='button'>Reset Password</a>
                </div>
                <p>If you didn't request this change, you can safely ignore this email.</p>
                <p><small>Or copy this link: <a href='{resetLink}'>{resetLink}</a></small></p>";

            return CreateReminderEmailTemplate(title, message, "", resetLink);
        }

        public static string CreateVerificationEmailTemplate(string verificationLink)
        {
            var title = "Verify Your Email";
            var message = $@"
                <p>Welcome to Paire!</p>
                <p>Please verify your email address to get started:</p>
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='{verificationLink}' class='button'>Verify Email</a>
                </div>
                <p><small>Or copy this link: <a href='{verificationLink}'>{verificationLink}</a></small></p>";

            return CreateReminderEmailTemplate(title, message, "", verificationLink);
        }
    }
}

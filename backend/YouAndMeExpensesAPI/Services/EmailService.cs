using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Email service implementation using MailKit
    /// Handles all email sending functionality with Gmail SMTP
    /// </summary>
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
            
            // Validate email settings on startup
            ValidateEmailSettings();
        }

        /// <summary>
        /// Validates that email settings are properly configured
        /// </summary>
        private void ValidateEmailSettings()
        {
            var missingSettings = new List<string>();
            
            if (string.IsNullOrWhiteSpace(_emailSettings.SmtpServer))
                missingSettings.Add("SmtpServer");
            
            if (_emailSettings.SmtpPort <= 0)
                missingSettings.Add("SmtpPort");
            
            if (string.IsNullOrWhiteSpace(_emailSettings.SenderEmail))
                missingSettings.Add("SenderEmail");
            
            if (string.IsNullOrWhiteSpace(_emailSettings.Username))
                missingSettings.Add("Username");
            
            if (string.IsNullOrWhiteSpace(_emailSettings.Password))
                missingSettings.Add("Password");
            
            if (missingSettings.Any())
            {
                _logger.LogWarning("⚠️ Email settings are incomplete. Missing: {MissingSettings}. " +
                    "Emails will not be sent. Configure these in Render.com environment variables: " +
                    "EmailSettings__SmtpServer, EmailSettings__SmtpPort, EmailSettings__SenderEmail, " +
                    "EmailSettings__Username, EmailSettings__Password",
                    string.Join(", ", missingSettings));
            }
            else
            {
                _logger.LogInformation("✅ Email settings configured: Server={SmtpServer}, Port={SmtpPort}, From={SenderEmail}",
                    _emailSettings.SmtpServer, _emailSettings.SmtpPort, _emailSettings.SenderEmail);
            }
        }

        /// <summary>
        /// Sends a single email via Gmail SMTP
        /// </summary>
        public async Task<bool> SendEmailAsync(EmailMessage emailMessage)
        {
            try
            {
                // Create email message
                var message = new MimeMessage();
                message.From.Add(new MailboxAddress(_emailSettings.SenderName, _emailSettings.SenderEmail));
                message.To.Add(new MailboxAddress(emailMessage.ToName, emailMessage.ToEmail));
                message.Subject = emailMessage.Subject;

                // Create body
                var bodyBuilder = new BodyBuilder();
                if (emailMessage.IsHtml)
                {
                    bodyBuilder.HtmlBody = emailMessage.Body;
                }
                else
                {
                    bodyBuilder.TextBody = emailMessage.Body;
                }

                // Add attachments if any
                if (emailMessage.Attachments != null && emailMessage.Attachments.Any())
                {
                    foreach (var attachment in emailMessage.Attachments)
                    {
                        if (File.Exists(attachment))
                        {
                            bodyBuilder.Attachments.Add(attachment);
                        }
                    }
                }

                message.Body = bodyBuilder.ToMessageBody();

                // Send email via SMTP with timeout
                using (var client = new SmtpClient())
                {
                    // Set timeout to prevent hanging (30 seconds)
                    client.Timeout = 30000;
                    
                    // Connect to Gmail SMTP server with timeout
                    using (var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30)))
                    {
                        // Determine correct socket options based on port
                        // Port 465: Implicit SSL (SslOnConnect) - Preferred for cloud environments
                        // Port 587: Explicit SSL (StartTls)
                        var socketOptions = _emailSettings.SmtpPort == 465 
                            ? SecureSocketOptions.SslOnConnect 
                            : SecureSocketOptions.StartTls;

                        await client.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.SmtpPort, socketOptions, cts.Token);

                        // Authenticate
                        await client.AuthenticateAsync(_emailSettings.Username, _emailSettings.Password, cts.Token);

                        // Send email
                        await client.SendAsync(message, cts.Token);

                        // Disconnect
                        await client.DisconnectAsync(true, cts.Token);
                    }

                    _logger.LogInformation($"Email sent successfully to {emailMessage.ToEmail}");
                    return true;
                }
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError(ex, "❌ SMTP connection timeout when sending email to {ToEmail}. " +
                    "Check: 1) SMTP server is correct (smtp.gmail.com), 2) Port is correct ({SmtpPort}), " +
                    "3) Firewall allows outbound connections, 4) Gmail App Password is correct",
                    emailMessage.ToEmail, _emailSettings.SmtpPort);
                return false;
            }
            catch (System.Net.Sockets.SocketException ex)
            {
                _logger.LogError(ex, "❌ SMTP connection failed to {SmtpServer}:{SmtpPort}. " +
                    "Check: 1) Server address is correct, 2) Port is correct, 3) Network connectivity",
                    _emailSettings.SmtpServer, _emailSettings.SmtpPort);
                return false;
            }
            catch (MailKit.Security.AuthenticationException ex)
            {
                _logger.LogError(ex, "❌ SMTP authentication failed. Check: 1) Username is correct, " +
                    "2) Password is a Gmail App Password (not regular password), 3) 2FA is enabled on Gmail account");
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send email to {ToEmail}. Error: {ErrorType} - {ErrorMessage}",
                    emailMessage.ToEmail, ex.GetType().Name, ex.Message);
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
                bool success = await SendEmailAsync(emailMessage);
                if (success)
                {
                    successCount++;
                }

                // Small delay to avoid rate limiting
                await Task.Delay(100);
            }

            _logger.LogInformation($"Sent {successCount} out of {emailMessages.Count} emails successfully");
            return successCount;
        }

        /// <summary>
        /// Sends a test email to verify SMTP configuration
        /// </summary>
        public async Task<bool> SendTestEmailAsync(string toEmail)
        {
            var emailMessage = new EmailMessage
            {
                ToEmail = toEmail,
                ToName = "Test User",
                Subject = "Test Email from Paire",
                Body = GetTestEmailTemplate(),
                IsHtml = true
            };

            return await SendEmailAsync(emailMessage);
        }

        /// <summary>
        /// HTML template for test emails with modern design
        /// </summary>
        private string GetTestEmailTemplate()
        {
            var frontendUrl = "http://localhost:3000"; // Default for test emails
            var message = @"
                <p>Hi there!</p>
                <p>This is a test email to confirm that your <strong>Paire</strong> email reminder system is working correctly.</p>
                <p>You will now receive:</p>
                <ul style='margin: 15px 0; padding-left: 25px;'>
                    <li style='margin: 8px 0;'>📅 Bill payment reminders</li>
                    <li style='margin: 8px 0;'>💰 Loan payment notifications</li>
                    <li style='margin: 8px 0;'>📊 Budget alerts</li>
                    <li style='margin: 8px 0;'>🎯 Savings goal updates</li>
                </ul>
                <p>Stay on top of your finances effortlessly!</p>";
            
            return EmailService.CreateReminderEmailTemplate(
                "✅ Email Configuration Successful!",
                message,
                frontendUrl
            );
        }

        /// <summary>
        /// Creates a beautiful HTML email template for reminders with modern, clean design
        /// </summary>
        public static string CreateReminderEmailTemplate(string title, string message, string frontendUrl = "", string actionUrl = "")
        {
            // Default frontend URL if not provided
            if (string.IsNullOrEmpty(frontendUrl))
            {
                frontendUrl = "http://localhost:3000";
            }
            
            // Extract first URL if multiple are provided (comma-separated)
            if (frontendUrl.Contains(';'))
            {
                frontendUrl = frontendUrl.Split(';')[0].Trim();
            }
            
            var loginUrl = $"{frontendUrl}/login";
            
            return $@"
<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6; 
            color: #2d3748; 
            background-color: #f7fafc;
            margin: 0; 
            padding: 20px;
        }}
        .email-wrapper {{
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
        }}
        .header {{ 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center;
        }}
        .header h1 {{
            font-size: 24px;
            font-weight: 600;
            margin: 0;
            letter-spacing: -0.5px;
        }}
        .content {{ 
            background: #ffffff; 
            padding: 40px 30px;
        }}
        .alert-box {{ 
            background: linear-gradient(135deg, #fff5e6 0%, #ffeaa7 100%);
            border-left: 4px solid #fdcb6e;
            padding: 20px; 
            margin: 25px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }}
        .alert-box h3 {{
            color: #d63031;
            font-size: 18px;
            margin-bottom: 12px;
            font-weight: 600;
        }}
        .alert-box p {{
            margin: 8px 0;
            color: #2d3748;
        }}
        .alert-box strong {{
            color: #1a202c;
            font-weight: 600;
        }}
        .button-container {{
            text-align: center;
            margin: 30px 0;
        }}
        .button {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            display: inline-block;
            font-weight: 600;
            font-size: 15px;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
        }}
        .button:hover {{
            transform: translateY(-2px);
            box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
        }}
        .button-secondary {{
            background: #e2e8f0;
            color: #2d3748;
            margin-left: 12px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }}
        .button-secondary:hover {{
            background: #cbd5e0;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }}
        .message-content {{
            color: #4a5568;
            font-size: 15px;
            line-height: 1.7;
        }}
        .message-content p {{
            margin: 12px 0;
        }}
        .footer {{ 
            text-align: center; 
            color: #718096; 
            font-size: 13px; 
            padding: 30px;
            background: #f7fafc;
            border-top: 1px solid #e2e8f0;
        }}
        .footer p {{
            margin: 6px 0;
        }}
        .footer small {{
            color: #a0aec0;
            font-size: 12px;
        }}
        @media only screen and (max-width: 600px) {{
            body {{ padding: 10px; }}
            .content {{ padding: 30px 20px; }}
            .header {{ padding: 30px 20px; }}
            .header h1 {{ font-size: 20px; }}
            .button-container {{
                display: flex;
                flex-direction: column;
                gap: 12px;
            }}
            .button {{
                width: 100%;
                margin: 0;
            }}
            .button-secondary {{
                margin-left: 0;
            }}
        }}
    </style>
</head>
<body>
    <div class=""email-wrapper"">
        <div class=""header"">
            <h1>{title}</h1>
        </div>
        <div class=""content"">
            <div class=""message-content"">
                {message}
            </div>
            <div class=""button-container"">
                {(string.IsNullOrEmpty(actionUrl) ? "" : $"<a href='{actionUrl}' class='button'>View Details</a>")}
                <a href='{loginUrl}' class='button button-secondary'>Login to App</a>
            </div>
        </div>
        <div class=""footer"">
            <p><strong>Paire</strong></p>
            <p>Your Personal Finance Manager</p>
            <p><small>You're receiving this because you have email reminders enabled.</small></p>
        </div>
    </div>
</body>
</html>";
        }
    }
}


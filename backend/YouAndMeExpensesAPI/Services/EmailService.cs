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

                // Send email via SMTP
                using (var client = new SmtpClient())
                {
                    // Connect to Gmail SMTP server
                    await client.ConnectAsync(_emailSettings.SmtpServer, _emailSettings.SmtpPort, SecureSocketOptions.StartTls);

                    // Authenticate
                    await client.AuthenticateAsync(_emailSettings.Username, _emailSettings.Password);

                    // Send email
                    await client.SendAsync(message);

                    // Disconnect
                    await client.DisconnectAsync(true);

                    _logger.LogInformation($"Email sent successfully to {emailMessage.ToEmail}");
                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {emailMessage.ToEmail}");
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
                Subject = "Test Email from You & Me Expenses",
                Body = GetTestEmailTemplate(),
                IsHtml = true
            };

            return await SendEmailAsync(emailMessage);
        }

        /// <summary>
        /// HTML template for test emails
        /// </summary>
        private string GetTestEmailTemplate()
        {
            return @"
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .button { background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>✅ Email Configuration Successful!</h1>
        </div>
        <div class='content'>
            <p>Hi there!</p>
            <p>This is a test email to confirm that your <strong>You & Me Expenses</strong> email reminder system is working correctly.</p>
            <p>You will now receive:</p>
            <ul>
                <li>📅 Bill payment reminders</li>
                <li>💰 Loan payment notifications</li>
                <li>📊 Budget alerts</li>
                <li>🎯 Savings goal updates</li>
            </ul>
            <p>Stay on top of your finances effortlessly!</p>
        </div>
        <div class='footer'>
            <p>You & Me Expenses - Your Personal Finance Manager</p>
        </div>
    </div>
</body>
</html>";
        }

        /// <summary>
        /// Creates a beautiful HTML email template for reminders
        /// </summary>
        public static string CreateReminderEmailTemplate(string title, string message, string actionUrl = "")
        {
            return $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }}
        .alert-box {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
        .button {{ background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #999; font-size: 12px; padding: 20px; background: #f9f9f9; border-radius: 0 0 10px 10px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>{title}</h1>
        </div>
        <div class='content'>
            {message}
            {(string.IsNullOrEmpty(actionUrl) ? "" : $"<a href='{actionUrl}' class='button'>View Details</a>")}
        </div>
        <div class='footer'>
            <p>You & Me Expenses - Your Personal Finance Manager</p>
            <p><small>You're receiving this because you have email reminders enabled.</small></p>
        </div>
    </div>
</body>
</html>";
        }
    }
}


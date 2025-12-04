using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Email service interface for sending emails via SMTP
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Sends a single email
        /// </summary>
        /// <param name="emailMessage">Email message to send</param>
        /// <returns>True if successful, false otherwise</returns>
        Task<bool> SendEmailAsync(EmailMessage emailMessage);

        /// <summary>
        /// Sends multiple emails (bulk send)
        /// </summary>
        /// <param name="emailMessages">List of email messages</param>
        /// <returns>Number of successfully sent emails</returns>
        Task<int> SendBulkEmailAsync(List<EmailMessage> emailMessages);

        /// <summary>
        /// Sends a test email to verify configuration
        /// </summary>
        /// <param name="toEmail">Recipient email address</param>
        /// <returns>True if successful</returns>
        Task<bool> SendTestEmailAsync(string toEmail);
    }
}


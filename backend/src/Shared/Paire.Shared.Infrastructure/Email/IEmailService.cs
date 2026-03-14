namespace Paire.Shared.Infrastructure.Email;

public interface IEmailService
{
    Task<bool> SendEmailAsync(EmailMessage message);
    string CreateVerificationEmailTemplate(string verificationLink);
    string CreatePasswordResetEmailTemplate(string resetLink);
    /// <summary>
    /// Creates the shared HTML email template with Paire branding for reminders and notifications.
    /// </summary>
    string CreateReminderEmailTemplate(string title, string message, string frontendUrl = "", string actionUrl = "");

    /// <summary>
    /// Sends a test email to verify email configuration.
    /// </summary>
    Task<bool> SendTestEmailAsync(string toEmail);
}

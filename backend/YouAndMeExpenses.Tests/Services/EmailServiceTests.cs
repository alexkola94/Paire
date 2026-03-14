using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using Paire.Shared.Infrastructure.Email;

namespace YouAndMeExpenses.Tests.Services
{
    public class EmailServiceTests
    {
        private readonly Mock<IOptions<EmailSettings>> _mockEmailSettings;
        private readonly Mock<ILogger<EmailService>> _mockLogger;
        private readonly EmailService _emailService;

        public EmailServiceTests()
        {
            var emailSettings = new EmailSettings
            {
                SmtpServer = "smtp.gmail.com",
                SmtpPort = 587,
                SenderEmail = "test@test.com",
                SenderName = "Test Sender",
                Username = "test@test.com",
                Password = "test-password",
                EnableSsl = true
            };

            _mockEmailSettings = new Mock<IOptions<EmailSettings>>();
            _mockEmailSettings.Setup(x => x.Value).Returns(emailSettings);
            _mockLogger = new Mock<ILogger<EmailService>>();
            _emailService = new EmailService(_mockEmailSettings.Object, _mockLogger.Object, new HttpClient());
        }

        [Fact]
        public void CreateReminderEmailTemplate_Should_Return_Valid_Html_When_ActionUrl_Provided()
        {
            var title = "Test Title";
            var message = "Test Message";
            var actionUrl = "https://test.com";

            var result = _emailService.CreateReminderEmailTemplate(title, message, "", actionUrl);

            result.Should().Contain(title);
            result.Should().Contain(message);
            result.Should().Contain("<!DOCTYPE html>");
            result.Should().Contain("Paire");
            result.Should().NotContain("Open App");
        }

        [Fact]
        public void CreateReminderEmailTemplate_Should_Show_Open_App_Cta_When_ActionUrl_Empty()
        {
            var title = "Test Title";
            var message = "Test Message";

            var result = _emailService.CreateReminderEmailTemplate(title, message, "");

            result.Should().Contain(title);
            result.Should().Contain(message);
            result.Should().Contain("Open App");
            result.Should().Contain("href=");
        }

        [Theory]
        [InlineData("smtp.gmail.com", 587)]
        [InlineData("smtp.office365.com", 587)]
        public void EmailSettings_Should_Accept_Valid_Smtp_Configurations(string server, int port)
        {
            var settings = new EmailSettings
            {
                SmtpServer = server,
                SmtpPort = port,
                SenderEmail = "test@test.com",
                Username = "test@test.com",
                Password = "password"
            };

            settings.SmtpServer.Should().Be(server);
            settings.SmtpPort.Should().Be(port);
        }

        [Fact]
        public void EmailMessage_Should_Initialize_With_Valid_Properties()
        {
            var emailMessage = new EmailMessage
            {
                ToEmail = "recipient@test.com",
                ToName = "Recipient Name",
                Subject = "Test Subject",
                Body = "Test Body",
                IsHtml = true
            };

            emailMessage.ToEmail.Should().Be("recipient@test.com");
            emailMessage.ToName.Should().Be("Recipient Name");
            emailMessage.Subject.Should().Be("Test Subject");
            emailMessage.Body.Should().Be("Test Body");
            emailMessage.IsHtml.Should().BeTrue();
        }
    }
}


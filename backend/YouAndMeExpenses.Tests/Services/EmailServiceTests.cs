using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpenses.Tests.Services
{
    public class EmailServiceTests
    {
        private readonly Mock<IOptions<EmailSettings>> _mockEmailSettings;
        private readonly Mock<ILogger<EmailService>> _mockLogger;
        private readonly EmailSettings _emailSettings;

        public EmailServiceTests()
        {
            _emailSettings = new EmailSettings
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
            _mockEmailSettings.Setup(x => x.Value).Returns(_emailSettings);

            _mockLogger = new Mock<ILogger<EmailService>>();
        }

        [Fact]
        public void CreateReminderEmailTemplate_Should_Return_Valid_Html()
        {
            // Arrange
            var title = "Test Title";
            var message = "Test Message";
            var actionUrl = "https://test.com";

            // Act
            var result = EmailService.CreateReminderEmailTemplate(title, message, actionUrl);

            // Assert
            result.Should().Contain(title);
            result.Should().Contain(message);
            result.Should().Contain(actionUrl);
            result.Should().Contain("<!DOCTYPE html>");
        }

        [Fact]
        public void CreateReminderEmailTemplate_Should_Handle_Empty_ActionUrl()
        {
            // Arrange
            var title = "Test Title";
            var message = "Test Message";

            // Act
            var result = EmailService.CreateReminderEmailTemplate(title, message, "");

            // Assert
            result.Should().Contain(title);
            result.Should().Contain(message);
            result.Should().NotContain("href=");
        }

        [Theory]
        [InlineData("smtp.gmail.com", 587)]
        [InlineData("smtp.office365.com", 587)]
        public void EmailSettings_Should_Accept_Valid_Smtp_Configurations(string server, int port)
        {
            // Arrange
            var settings = new EmailSettings
            {
                SmtpServer = server,
                SmtpPort = port,
                SenderEmail = "test@test.com",
                Username = "test@test.com",
                Password = "password"
            };

            // Assert
            settings.SmtpServer.Should().Be(server);
            settings.SmtpPort.Should().Be(port);
        }

        [Fact]
        public void EmailMessage_Should_Initialize_With_Valid_Properties()
        {
            // Arrange & Act
            var emailMessage = new EmailMessage
            {
                ToEmail = "recipient@test.com",
                ToName = "Recipient Name",
                Subject = "Test Subject",
                Body = "Test Body",
                IsHtml = true
            };

            // Assert
            emailMessage.ToEmail.Should().Be("recipient@test.com");
            emailMessage.ToName.Should().Be("Recipient Name");
            emailMessage.Subject.Should().Be("Test Subject");
            emailMessage.Body.Should().Be("Test Body");
            emailMessage.IsHtml.Should().BeTrue();
        }
    }
}


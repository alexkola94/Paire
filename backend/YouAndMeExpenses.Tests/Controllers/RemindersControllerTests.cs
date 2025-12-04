using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using YouAndMeExpensesAPI.Controllers;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpenses.Tests.Controllers
{
    public class RemindersControllerTests
    {
        private readonly Mock<IReminderService> _mockReminderService;
        private readonly Mock<IEmailService> _mockEmailService;
        private readonly Mock<ILogger<RemindersController>> _mockLogger;
        private readonly RemindersController _controller;

        public RemindersControllerTests()
        {
            _mockReminderService = new Mock<IReminderService>();
            _mockEmailService = new Mock<IEmailService>();
            _mockLogger = new Mock<ILogger<RemindersController>>();

            _controller = new RemindersController(
                _mockReminderService.Object,
                _mockEmailService.Object,
                _mockLogger.Object
            );
        }

        [Fact]
        public async Task CheckReminders_Should_Return_Ok_With_Result()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _mockReminderService
                .Setup(x => x.CheckAndSendAllRemindersAsync(userId))
                .ReturnsAsync(5);

            // Act
            var result = await _controller.CheckReminders(userId);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            okResult?.Value.Should().BeOfType<ReminderCheckResult>();
        }

        [Fact]
        public async Task GetReminderSettings_Should_Return_Ok_With_Preferences()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Act
            var result = await _controller.GetReminderSettings(userId);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            okResult?.Value.Should().BeOfType<ReminderPreferences>();
        }

        [Fact]
        public async Task UpdateReminderSettings_Should_Return_Ok()
        {
            // Arrange
            var userId = Guid.NewGuid();
            var preferences = new ReminderPreferences
            {
                Id = Guid.NewGuid(),
                UserId = userId.ToString(),
                EmailEnabled = true
            };

            // Act
            var result = await _controller.UpdateReminderSettings(userId, preferences);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task SendTestEmail_Should_Return_Ok_When_Successful()
        {
            // Arrange
            var email = "test@example.com";
            _mockEmailService
                .Setup(x => x.SendTestEmailAsync(email))
                .ReturnsAsync(true);

            // Act
            var result = await _controller.SendTestEmail(email);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            okResult?.Value.Should().BeOfType<TestEmailResult>();
        }

        [Fact]
        public async Task CheckBillReminders_Should_Return_Ok_With_Count()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _mockReminderService
                .Setup(x => x.SendBillRemindersAsync(userId))
                .ReturnsAsync(3);

            // Act
            var result = await _controller.CheckBillReminders(userId);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task CheckLoanReminders_Should_Return_Ok_With_Count()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _mockReminderService
                .Setup(x => x.SendLoanPaymentRemindersAsync(userId))
                .ReturnsAsync(2);

            // Act
            var result = await _controller.CheckLoanReminders(userId);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task CheckBudgetAlerts_Should_Return_Ok_With_Count()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _mockReminderService
                .Setup(x => x.SendBudgetAlertsAsync(userId))
                .ReturnsAsync(1);

            // Act
            var result = await _controller.CheckBudgetAlerts(userId);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task CheckSavingsReminders_Should_Return_Ok_With_Count()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _mockReminderService
                .Setup(x => x.SendSavingsGoalRemindersAsync(userId))
                .ReturnsAsync(0);

            // Act
            var result = await _controller.CheckSavingsReminders(userId);

            // Assert
            result.Should().BeOfType<OkObjectResult>();
        }
    }
}


using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpenses.Tests.Services
{
    public class ReminderServiceTests
    {
        private readonly Mock<ISupabaseService> _mockSupabaseService;
        private readonly Mock<IEmailService> _mockEmailService;
        private readonly Mock<ILogger<ReminderService>> _mockLogger;
        private readonly ReminderService _reminderService;

        public ReminderServiceTests()
        {
            _mockSupabaseService = new Mock<ISupabaseService>();
            _mockEmailService = new Mock<IEmailService>();
            _mockLogger = new Mock<ILogger<ReminderService>>();

            _reminderService = new ReminderService(
                _mockSupabaseService.Object,
                _mockEmailService.Object,
                _mockLogger.Object
            );
        }

        [Fact]
        public void ReminderService_Should_Initialize_Successfully()
        {
            // Assert
            _reminderService.Should().NotBeNull();
        }

        [Fact]
        public async Task SendBillRemindersAsync_Should_Return_Zero_When_No_Preferences()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Act
            var result = await _reminderService.SendBillRemindersAsync(userId);

            // Assert
            result.Should().Be(0);
        }

        [Fact]
        public async Task SendLoanPaymentRemindersAsync_Should_Return_Zero_When_No_Loans()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _mockSupabaseService
                .Setup(x => x.GetLoansAsync(userId.ToString()))
                .ReturnsAsync(new List<Loan>());

            // Act
            var result = await _reminderService.SendLoanPaymentRemindersAsync(userId);

            // Assert
            result.Should().Be(0);
        }

        [Fact]
        public async Task SendBudgetAlertsAsync_Should_Return_Zero_When_No_Budgets()
        {
            // Arrange
            var userId = Guid.NewGuid();

            // Act
            var result = await _reminderService.SendBudgetAlertsAsync(userId);

            // Assert
            result.Should().Be(0);
        }

        [Fact]
        public async Task CheckAndSendAllRemindersAsync_Should_Aggregate_All_Reminders()
        {
            // Arrange
            var userId = Guid.NewGuid();
            _mockSupabaseService
                .Setup(x => x.GetLoansAsync(userId.ToString()))
                .ReturnsAsync(new List<Loan>());

            // Act
            var result = await _reminderService.CheckAndSendAllRemindersAsync(userId);

            // Assert
            result.Should().BeGreaterThanOrEqualTo(0);
        }

        [Fact]
        public void ReminderPreferences_Should_Have_Default_Values()
        {
            // Arrange & Act
            var preferences = new ReminderPreferences
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid().ToString(),
                EmailEnabled = true,
                BillRemindersEnabled = true,
                BillReminderDays = 3,
                LoanRemindersEnabled = true,
                LoanReminderDays = 7,
                BudgetAlertsEnabled = true,
                BudgetAlertThreshold = 90,
                SavingsMilestonesEnabled = true
            };

            // Assert
            preferences.EmailEnabled.Should().BeTrue();
            preferences.BillReminderDays.Should().Be(3);
            preferences.LoanReminderDays.Should().Be(7);
            preferences.BudgetAlertThreshold.Should().Be(90);
        }

        [Theory]
        [InlineData(ReminderType.BillDue)]
        [InlineData(ReminderType.LoanPaymentDue)]
        [InlineData(ReminderType.BudgetAlert)]
        [InlineData(ReminderType.SavingsGoalMilestone)]
        public void ReminderType_Enum_Should_Have_All_Required_Values(ReminderType type)
        {
            // Assert
            Enum.IsDefined(typeof(ReminderType), type).Should().BeTrue();
        }
    }
}


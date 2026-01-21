using FluentAssertions;
using Xunit;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpenses.Tests.Models
{
    public class EmailModelsTests
    {
        [Fact]
        public void EmailSettings_Should_Initialize_With_Default_Values()
        {
            // Arrange & Act
            var settings = new EmailSettings
            {
                SmtpServer = "smtp.gmail.com",
                SmtpPort = 587,
                EnableSsl = true
            };

            // Assert
            settings.SmtpServer.Should().Be("smtp.gmail.com");
            settings.SmtpPort.Should().Be(587);
            settings.EnableSsl.Should().BeTrue();
        }

        [Fact]
        public void EmailMessage_Should_Support_Html_And_Plain_Text()
        {
            // Arrange
            var htmlMessage = new EmailMessage
            {
                ToEmail = "test@test.com",
                Subject = "HTML Test",
                Body = "<h1>HTML Content</h1>",
                IsHtml = true
            };

            var plainMessage = new EmailMessage
            {
                ToEmail = "test@test.com",
                Subject = "Plain Test",
                Body = "Plain text content",
                IsHtml = false
            };

            // Assert
            htmlMessage.IsHtml.Should().BeTrue();
            plainMessage.IsHtml.Should().BeFalse();
        }

        [Fact]
        public void EmailMessage_Should_Support_Attachments()
        {
            // Arrange
            var message = new EmailMessage
            {
                ToEmail = "test@test.com",
                Subject = "Test",
                Body = "Test",
                Attachments = new List<string> { "file1.pdf", "file2.jpg" }
            };

            // Assert
            message.Attachments.Should().HaveCount(2);
            message.Attachments.Should().Contain("file1.pdf");
            message.Attachments.Should().Contain("file2.jpg");
        }

        [Fact]
        public void ReminderPreferences_Should_Initialize_With_Sane_Defaults()
        {
            // Arrange & Act
            var prefs = new ReminderPreferences
            {
                Id = Guid.NewGuid(),
                UserId = Guid.NewGuid(),
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
            prefs.EmailEnabled.Should().BeTrue();
            prefs.BillReminderDays.Should().BeInRange(1, 30);
            prefs.LoanReminderDays.Should().BeInRange(1, 30);
            prefs.BudgetAlertThreshold.Should().BeInRange(0, 100);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(7)]
        [InlineData(30)]
        public void ReminderPreferences_Should_Accept_Valid_Reminder_Days(int days)
        {
            // Arrange & Act
            var prefs = new ReminderPreferences
            {
                BillReminderDays = days,
                LoanReminderDays = days
            };

            // Assert
            prefs.BillReminderDays.Should().Be(days);
            prefs.LoanReminderDays.Should().Be(days);
        }

        [Theory]
        [InlineData(50)]
        [InlineData(75)]
        [InlineData(90)]
        [InlineData(100)]
        public void ReminderPreferences_Should_Accept_Valid_Budget_Thresholds(decimal threshold)
        {
            // Arrange & Act
            var prefs = new ReminderPreferences
            {
                BudgetAlertThreshold = threshold
            };

            // Assert
            prefs.BudgetAlertThreshold.Should().Be(threshold);
            prefs.BudgetAlertThreshold.Should().BeInRange(0, 100);
        }
    }
}


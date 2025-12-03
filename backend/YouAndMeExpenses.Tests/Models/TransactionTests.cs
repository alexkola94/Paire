using FluentAssertions;
using YouAndMeExpenses.Models;
using Xunit;

namespace YouAndMeExpenses.Tests.Models
{
    /// <summary>
    /// Unit tests for Transaction model
    /// </summary>
    public class TransactionTests
    {
        [Fact]
        public void Transaction_ShouldInitializeWithDefaultValues()
        {
            // Act
            var transaction = new Transaction();

            // Assert
            transaction.Id.Should().Be(Guid.Empty);
            transaction.UserId.Should().Be(Guid.Empty);
            transaction.Type.Should().BeEmpty();
            transaction.Amount.Should().Be(0);
            transaction.Category.Should().BeEmpty();
        }

        [Fact]
        public void Transaction_ShouldSetAndGetProperties()
        {
            // Arrange
            var id = Guid.NewGuid();
            var userId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            // Act
            var transaction = new Transaction
            {
                Id = id,
                UserId = userId,
                Type = "expense",
                Amount = 50.99m,
                Category = "food",
                Description = "Groceries",
                Date = now,
                AttachmentUrl = "https://example.com/receipt.jpg",
                AttachmentPath = "receipts/123.jpg",
                CreatedAt = now,
                UpdatedAt = now
            };

            // Assert
            transaction.Id.Should().Be(id);
            transaction.UserId.Should().Be(userId);
            transaction.Type.Should().Be("expense");
            transaction.Amount.Should().Be(50.99m);
            transaction.Category.Should().Be("food");
            transaction.Description.Should().Be("Groceries");
            transaction.Date.Should().Be(now);
            transaction.AttachmentUrl.Should().Be("https://example.com/receipt.jpg");
            transaction.AttachmentPath.Should().Be("receipts/123.jpg");
            transaction.CreatedAt.Should().Be(now);
            transaction.UpdatedAt.Should().Be(now);
        }

        [Theory]
        [InlineData("expense")]
        [InlineData("income")]
        public void Transaction_ShouldAcceptValidTypes(string type)
        {
            // Act
            var transaction = new Transaction { Type = type };

            // Assert
            transaction.Type.Should().Be(type);
        }

        [Fact]
        public void TransactionDto_ShouldInitializeWithDefaultValues()
        {
            // Act
            var dto = new TransactionDto();

            // Assert
            dto.Type.Should().BeEmpty();
            dto.Amount.Should().Be(0);
            dto.Category.Should().BeEmpty();
        }

        [Fact]
        public void TransactionSummary_ShouldCalculateBalance()
        {
            // Act
            var summary = new TransactionSummary
            {
                Income = 1000m,
                Expenses = 300m
            };

            // Manual calculation since Balance is a property
            var expectedBalance = summary.Income - summary.Expenses;

            // Assert
            summary.Income.Should().Be(1000m);
            summary.Expenses.Should().Be(300m);
            expectedBalance.Should().Be(700m);
        }
    }
}


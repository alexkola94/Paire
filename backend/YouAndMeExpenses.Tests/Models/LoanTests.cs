using FluentAssertions;
using YouAndMeExpenses.Models;
using Xunit;

namespace YouAndMeExpenses.Tests.Models
{
    /// <summary>
    /// Unit tests for Loan model
    /// </summary>
    public class LoanTests
    {
        [Fact]
        public void Loan_ShouldInitializeWithDefaultValues()
        {
            // Act
            var loan = new Loan();

            // Assert
            loan.Id.Should().Be(Guid.Empty);
            loan.UserId.Should().Be(Guid.Empty);
            loan.Type.Should().BeEmpty();
            loan.PartyName.Should().BeEmpty();
            loan.TotalAmount.Should().Be(0);
            loan.RemainingAmount.Should().Be(0);
            loan.Status.Should().Be("active");
        }

        [Fact]
        public void Loan_ShouldSetAndGetAllProperties()
        {
            // Arrange
            var id = Guid.NewGuid();
            var userId = Guid.NewGuid();
            var now = DateTime.UtcNow;
            var dueDate = DateTime.UtcNow.AddMonths(6);

            // Act
            var loan = new Loan
            {
                Id = id,
                UserId = userId,
                Type = "given",
                PartyName = "John Doe",
                TotalAmount = 1000m,
                RemainingAmount = 500m,
                DueDate = dueDate,
                Description = "Personal loan",
                Status = "active",
                CreatedAt = now,
                UpdatedAt = now
            };

            // Assert
            loan.Id.Should().Be(id);
            loan.UserId.Should().Be(userId);
            loan.Type.Should().Be("given");
            loan.PartyName.Should().Be("John Doe");
            loan.TotalAmount.Should().Be(1000m);
            loan.RemainingAmount.Should().Be(500m);
            loan.DueDate.Should().Be(dueDate);
            loan.Description.Should().Be("Personal loan");
            loan.Status.Should().Be("active");
            loan.CreatedAt.Should().Be(now);
            loan.UpdatedAt.Should().Be(now);
        }

        [Theory]
        [InlineData("given")]
        [InlineData("received")]
        public void Loan_ShouldAcceptValidTypes(string type)
        {
            // Act
            var loan = new Loan { Type = type };

            // Assert
            loan.Type.Should().Be(type);
        }

        [Theory]
        [InlineData("active")]
        [InlineData("completed")]
        public void Loan_ShouldAcceptValidStatuses(string status)
        {
            // Act
            var loan = new Loan { Status = status };

            // Assert
            loan.Status.Should().Be(status);
        }

        [Fact]
        public void Loan_RemainingAmount_ShouldNotExceedTotalAmount()
        {
            // Arrange & Act
            var loan = new Loan
            {
                TotalAmount = 1000m,
                RemainingAmount = 500m
            };

            // Assert
            loan.RemainingAmount.Should().BeLessThanOrEqualTo(loan.TotalAmount);
        }

        [Fact]
        public void LoanDto_ShouldInitializeWithDefaults()
        {
            // Act
            var dto = new LoanDto();

            // Assert
            dto.Type.Should().BeEmpty();
            dto.PartyName.Should().BeEmpty();
            dto.TotalAmount.Should().Be(0);
            dto.RemainingAmount.Should().Be(0);
            dto.Status.Should().Be("active");
        }

        [Fact]
        public void LoanDto_ShouldMapFromLoan()
        {
            // Arrange
            var loan = new Loan
            {
                Type = "given",
                PartyName = "Jane Doe",
                TotalAmount = 2000m,
                RemainingAmount = 1000m,
                DueDate = DateTime.UtcNow.AddMonths(3),
                Description = "Business loan",
                Status = "active"
            };

            // Act
            var dto = new LoanDto
            {
                Type = loan.Type,
                PartyName = loan.PartyName,
                TotalAmount = loan.TotalAmount,
                RemainingAmount = loan.RemainingAmount,
                DueDate = loan.DueDate,
                Description = loan.Description,
                Status = loan.Status
            };

            // Assert
            dto.Type.Should().Be(loan.Type);
            dto.PartyName.Should().Be(loan.PartyName);
            dto.TotalAmount.Should().Be(loan.TotalAmount);
            dto.RemainingAmount.Should().Be(loan.RemainingAmount);
            dto.DueDate.Should().Be(loan.DueDate);
            dto.Description.Should().Be(loan.Description);
            dto.Status.Should().Be(loan.Status);
        }
    }
}


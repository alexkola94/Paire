using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpenses.Tests.Services;

public class TransactionsServiceTests
{
    private static AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetTransactionsAsync_OrdersByCreatedAtThenDateDescending()
    {
        // Arrange
        using var db = CreateInMemoryContext();

        var userId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();

        var baseDate = new DateTime(2024, 1, 10, 12, 0, 0, DateTimeKind.Utc);

        db.Transactions.AddRange(
            new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId.ToString(),
                Type = "expense",
                Amount = 10,
                Category = "food",
                Date = baseDate, // same logical date
                CreatedAt = baseDate.AddMinutes(1),
                UpdatedAt = baseDate.AddMinutes(1)
            },
            new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId.ToString(),
                Type = "expense",
                Amount = 20,
                Category = "food",
                Date = baseDate,
                CreatedAt = baseDate.AddMinutes(5), // newest by CreatedAt
                UpdatedAt = baseDate.AddMinutes(5)
            },
            new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId.ToString(),
                Type = "expense",
                Amount = 30,
                Category = "food",
                Date = baseDate.AddDays(-1), // older logical date
                CreatedAt = baseDate.AddMinutes(3),
                UpdatedAt = baseDate.AddMinutes(3)
            },
            new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = otherUserId.ToString(), // different household; should still be included if partnership is configured
                Type = "expense",
                Amount = 40,
                Category = "food",
                Date = baseDate,
                CreatedAt = baseDate.AddMinutes(10),
                UpdatedAt = baseDate.AddMinutes(10)
            }
        );

        await db.SaveChangesAsync();

        var storage = Mock.Of<IStorageService>();
        var achievements = Mock.Of<IAchievementService>();
        var budgets = Mock.Of<IBudgetService>();
        var import = Mock.Of<IBankStatementImportService>();
        var logger = Mock.Of<ILogger<TransactionsService>>();

        var service = new TransactionsService(db, storage, achievements, budgets, import, logger);

        // Act
        var result = await service.GetTransactionsAsync(userId, type: "expense", startDate: null, endDate: null, page: 1, pageSize: 10, search: null);

        // Assert
        result.Items.Should().NotBeNull();
        result.Items.Should().HaveCount(3); // only current user; partnership logic is tested elsewhere

        var orderedByCreatedAtThenDate = result.Items
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Date)
            .Select(t => t.Id)
            .ToList();

        var actualOrder = result.Items.Select(t => t.Id).ToList();

        actualOrder.Should().BeEquivalentTo(orderedByCreatedAtThenDate, options => options.WithStrictOrdering());
    }
}


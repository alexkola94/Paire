using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

namespace YouAndMeExpenses.Tests.Services;

public class TransactionsServicePagingTests
{
    private static AppDbContext CreateInMemoryContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new AppDbContext(options);
    }

    [Fact]
    public async Task GetTransactionsAsync_ClampsPageSizeAndDefaultsWhenMissing()
    {
        using var db = CreateInMemoryContext();

        var userId = Guid.NewGuid();

        for (var i = 0; i < 500; i++)
        {
            db.Transactions.Add(new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId.ToString(),
                Type = "expense",
                Amount = 10,
                Category = "misc",
                Date = DateTime.UtcNow.AddDays(-i),
                CreatedAt = DateTime.UtcNow.AddMinutes(-i),
                UpdatedAt = DateTime.UtcNow.AddMinutes(-i)
            });
        }

        await db.SaveChangesAsync();

        var storage = Mock.Of<IStorageService>();
        var achievements = Mock.Of<IAchievementService>();
        var budgets = Mock.Of<IBudgetService>();
        var import = Mock.Of<IBankStatementImportService>();
        var logger = Mock.Of<ILogger<TransactionsService>>();

        var service = new TransactionsService(db, storage, achievements, budgets, import, logger);

        // Large requested pageSize should be clamped to 200
        var resultLarge = await service.GetTransactionsAsync(userId, null, null, null, page: 1, pageSize: 1000, search: null);
        resultLarge.Items.Should().HaveCount(200);
        resultLarge.Page.Should().Be(1);
        resultLarge.PageSize.Should().Be(200);

        // When page is provided but pageSize is null, default should be applied
        var resultDefault = await service.GetTransactionsAsync(userId, null, null, null, page: 1, pageSize: null, search: null);
        resultDefault.Items.Should().HaveCount(50);
        resultDefault.Page.Should().Be(1);
        resultDefault.PageSize.Should().Be(50);
    }
}


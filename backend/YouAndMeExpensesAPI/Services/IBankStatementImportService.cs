namespace YouAndMeExpensesAPI.Services
{
    public interface IBankStatementImportService
    {
        Task<BankTransactionImportResult> ImportStatementAsync(string userId, IFormFile file, CancellationToken cancellationToken = default);
    }
}

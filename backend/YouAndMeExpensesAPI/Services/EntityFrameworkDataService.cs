using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Entity Framework implementation of data service
    /// Uses EF Core for all database operations
    /// </summary>
    public class EntityFrameworkDataService : ISupabaseService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<EntityFrameworkDataService> _logger;

        public EntityFrameworkDataService(
            AppDbContext dbContext,
            ILogger<EntityFrameworkDataService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        // ============================================
        // TRANSACTIONS
        // ============================================

        public async Task<List<Transaction>> GetTransactionsAsync(string userId)
        {
            return await _dbContext.Transactions
                .Where(t => t.UserId == userId)
                .OrderByDescending(t => t.Date)
                .ToListAsync();
        }

        public async Task<Transaction?> GetTransactionByIdAsync(Guid id, string userId)
        {
            return await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        }

        public async Task<Transaction> CreateTransactionAsync(Transaction transaction)
        {
            transaction.Id = Guid.NewGuid();
            transaction.CreatedAt = DateTime.UtcNow;
            transaction.UpdatedAt = DateTime.UtcNow;

            // Ensure Date is UTC
            if (transaction.Date.Kind == DateTimeKind.Unspecified)
            {
                transaction.Date = DateTime.SpecifyKind(transaction.Date, DateTimeKind.Utc);
            }
            else if (transaction.Date.Kind == DateTimeKind.Local)
            {
                transaction.Date = transaction.Date.ToUniversalTime();
            }

            // Ensure RecurrenceEndDate is UTC if provided
            if (transaction.RecurrenceEndDate.HasValue)
            {
                if (transaction.RecurrenceEndDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    transaction.RecurrenceEndDate = DateTime.SpecifyKind(transaction.RecurrenceEndDate.Value, DateTimeKind.Utc);
                }
                else if (transaction.RecurrenceEndDate.Value.Kind == DateTimeKind.Local)
                {
                    transaction.RecurrenceEndDate = transaction.RecurrenceEndDate.Value.ToUniversalTime();
                }
            }

            _dbContext.Transactions.Add(transaction);
            await _dbContext.SaveChangesAsync();

            return transaction;
        }

        public async Task<Transaction> UpdateTransactionAsync(Transaction transaction)
        {
            transaction.UpdatedAt = DateTime.UtcNow;

            // Ensure Date is UTC
            if (transaction.Date.Kind == DateTimeKind.Unspecified)
            {
                transaction.Date = DateTime.SpecifyKind(transaction.Date, DateTimeKind.Utc);
            }
            else if (transaction.Date.Kind == DateTimeKind.Local)
            {
                transaction.Date = transaction.Date.ToUniversalTime();
            }

            // Ensure RecurrenceEndDate is UTC if provided
            if (transaction.RecurrenceEndDate.HasValue)
            {
                if (transaction.RecurrenceEndDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    transaction.RecurrenceEndDate = DateTime.SpecifyKind(transaction.RecurrenceEndDate.Value, DateTimeKind.Utc);
                }
                else if (transaction.RecurrenceEndDate.Value.Kind == DateTimeKind.Local)
                {
                    transaction.RecurrenceEndDate = transaction.RecurrenceEndDate.Value.ToUniversalTime();
                }
            }

            _dbContext.Transactions.Update(transaction);
            await _dbContext.SaveChangesAsync();

            return transaction;
        }

        public async Task<bool> DeleteTransactionAsync(Guid id, string userId)
        {
            var transaction = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null)
                return false;

            _dbContext.Transactions.Remove(transaction);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        // ============================================
        // LOANS
        // ============================================

        public async Task<List<Loan>> GetLoansAsync(string userId)
        {
            return await _dbContext.Loans
                .Where(l => l.UserId == userId)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
        }

        public async Task<Loan?> GetLoanByIdAsync(Guid id, string userId)
        {
            return await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId);
        }

        public async Task<Loan> CreateLoanAsync(Loan loan)
        {
            loan.Id = Guid.NewGuid();
            loan.CreatedAt = DateTime.UtcNow;
            loan.UpdatedAt = DateTime.UtcNow;

            // Ensure Date is UTC
            if (loan.Date == default)
            {
                loan.Date = DateTime.UtcNow;
            }
            else if (loan.Date.Kind == DateTimeKind.Unspecified)
            {
                loan.Date = DateTime.SpecifyKind(loan.Date, DateTimeKind.Utc);
            }
            else if (loan.Date.Kind == DateTimeKind.Local)
            {
                loan.Date = loan.Date.ToUniversalTime();
            }

            // Ensure DueDate is UTC if provided
            if (loan.DueDate.HasValue)
            {
                if (loan.DueDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    loan.DueDate = DateTime.SpecifyKind(loan.DueDate.Value, DateTimeKind.Utc);
                }
                else if (loan.DueDate.Value.Kind == DateTimeKind.Local)
                {
                    loan.DueDate = loan.DueDate.Value.ToUniversalTime();
                }
            }

            // Ensure NextPaymentDate is UTC if provided
            if (loan.NextPaymentDate.HasValue)
            {
                if (loan.NextPaymentDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    loan.NextPaymentDate = DateTime.SpecifyKind(loan.NextPaymentDate.Value, DateTimeKind.Utc);
                }
                else if (loan.NextPaymentDate.Value.Kind == DateTimeKind.Local)
                {
                    loan.NextPaymentDate = loan.NextPaymentDate.Value.ToUniversalTime();
                }
            }

            // Ensure SettledDate is UTC if provided
            if (loan.SettledDate.HasValue)
            {
                if (loan.SettledDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    loan.SettledDate = DateTime.SpecifyKind(loan.SettledDate.Value, DateTimeKind.Utc);
                }
                else if (loan.SettledDate.Value.Kind == DateTimeKind.Local)
                {
                    loan.SettledDate = loan.SettledDate.Value.ToUniversalTime();
                }
            }

            _dbContext.Loans.Add(loan);
            await _dbContext.SaveChangesAsync();

            return loan;
        }

        public async Task<Loan> UpdateLoanAsync(Loan loan)
        {
            loan.UpdatedAt = DateTime.UtcNow;

            // Ensure Date is UTC
            if (loan.Date.Kind == DateTimeKind.Unspecified)
            {
                loan.Date = DateTime.SpecifyKind(loan.Date, DateTimeKind.Utc);
            }
            else if (loan.Date.Kind == DateTimeKind.Local)
            {
                loan.Date = loan.Date.ToUniversalTime();
            }

            // Ensure DueDate is UTC if provided
            if (loan.DueDate.HasValue)
            {
                if (loan.DueDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    loan.DueDate = DateTime.SpecifyKind(loan.DueDate.Value, DateTimeKind.Utc);
                }
                else if (loan.DueDate.Value.Kind == DateTimeKind.Local)
                {
                    loan.DueDate = loan.DueDate.Value.ToUniversalTime();
                }
            }

            // Ensure NextPaymentDate is UTC if provided
            if (loan.NextPaymentDate.HasValue)
            {
                if (loan.NextPaymentDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    loan.NextPaymentDate = DateTime.SpecifyKind(loan.NextPaymentDate.Value, DateTimeKind.Utc);
                }
                else if (loan.NextPaymentDate.Value.Kind == DateTimeKind.Local)
                {
                    loan.NextPaymentDate = loan.NextPaymentDate.Value.ToUniversalTime();
                }
            }

            // Ensure SettledDate is UTC if provided
            if (loan.SettledDate.HasValue)
            {
                if (loan.SettledDate.Value.Kind == DateTimeKind.Unspecified)
                {
                    loan.SettledDate = DateTime.SpecifyKind(loan.SettledDate.Value, DateTimeKind.Utc);
                }
                else if (loan.SettledDate.Value.Kind == DateTimeKind.Local)
                {
                    loan.SettledDate = loan.SettledDate.Value.ToUniversalTime();
                }
            }

            _dbContext.Loans.Update(loan);
            await _dbContext.SaveChangesAsync();

            return loan;
        }

        public async Task<bool> DeleteLoanAsync(Guid id, string userId)
        {
            var loan = await _dbContext.Loans
                .FirstOrDefaultAsync(l => l.Id == id && l.UserId == userId);

            if (loan == null)
                return false;

            _dbContext.Loans.Remove(loan);
            await _dbContext.SaveChangesAsync();

            return true;
        }

        // ============================================
        // STORAGE - Local File Storage Implementation
        // ============================================
        // TODO: Implement local file storage (replacing Supabase Storage)
        // Options: Local filesystem, Azure Blob Storage, AWS S3, etc.

        public async Task<string> UploadReceiptAsync(Stream file, string fileName, string userId)
        {
            // TODO: Implement local file storage
            // For now, return a placeholder indicating file storage not yet implemented
            _logger.LogWarning("File upload not yet implemented - Supabase Storage removed");
            await Task.CompletedTask;
            throw new NotImplementedException("File storage not yet implemented. Please implement local file storage.");
        }

        public async Task<bool> DeleteReceiptAsync(string fileName, string userId)
        {
            // TODO: Implement local file deletion
            _logger.LogWarning("File deletion not yet implemented - Supabase Storage removed");
            await Task.CompletedTask;
            throw new NotImplementedException("File storage not yet implemented. Please implement local file storage.");
        }
    }
}


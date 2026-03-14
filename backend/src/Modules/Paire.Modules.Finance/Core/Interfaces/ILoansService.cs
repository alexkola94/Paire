using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface ILoansService
{
    Task<IReadOnlyList<object>> GetLoansAsync(Guid userId);
    Task<Loan?> GetLoanAsync(Guid userId, Guid loanId);
    Task<Loan> CreateLoanAsync(Guid userId, Loan loan);
    Task<Loan?> UpdateLoanAsync(Guid userId, Guid loanId, Loan updatedLoan);
    Task<bool> DeleteLoanAsync(Guid userId, Guid loanId);
    Task<object> GetLoanSummaryAsync(Guid userId);
    Task<(Loan? loan, bool alreadySettled)> SettleLoanAsync(Guid userId, Guid loanId);
}

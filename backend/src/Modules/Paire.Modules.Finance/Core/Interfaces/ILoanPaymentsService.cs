using Paire.Modules.Finance.Core.Entities;

namespace Paire.Modules.Finance.Core.Interfaces;

public interface ILoanPaymentsService
{
    Task<IReadOnlyList<LoanPayment>> GetLoanPaymentsAsync(Guid userId, Guid loanId);
    Task<IReadOnlyList<LoanPayment>> GetAllPaymentsAsync(Guid userId);
    Task<LoanPayment?> GetLoanPaymentAsync(Guid userId, Guid paymentId);
    Task<LoanPayment> CreateLoanPaymentAsync(Guid userId, LoanPayment payment);
    Task<LoanPayment?> UpdateLoanPaymentAsync(Guid userId, Guid paymentId, LoanPayment payment);
    Task<bool> DeleteLoanPaymentAsync(Guid userId, Guid paymentId);
    Task<object?> GetLoanPaymentSummaryAsync(Guid userId, Guid loanId);
}

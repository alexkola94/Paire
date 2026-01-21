using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service contract for managing recurring bills, their summaries,
    /// and related attachments and transactions.
    /// </summary>
    public interface IRecurringBillsService
    {
        Task<IReadOnlyList<object>> GetRecurringBillsAsync(Guid userId);
        Task<RecurringBill?> GetRecurringBillAsync(Guid userId, Guid billId);
        Task<RecurringBill> CreateRecurringBillAsync(Guid userId, RecurringBill bill);
        Task<RecurringBill?> UpdateRecurringBillAsync(Guid userId, Guid billId, RecurringBill updates);
        Task<bool> DeleteRecurringBillAsync(Guid userId, Guid billId);
        Task<RecurringBill?> MarkBillPaidAsync(Guid userId, Guid billId);
        Task<RecurringBill?> UnmarkBillPaidAsync(Guid userId, Guid billId);
        Task<IReadOnlyList<RecurringBill>> GetUpcomingBillsAsync(Guid userId, int days);
        Task<object> GetSummaryAsync(Guid userId);
        Task<object?> UploadAttachmentAsync(Guid userId, Guid billId, IFormFile file);
        Task<bool> DeleteAttachmentAsync(Guid userId, Guid billId, Guid attachmentId);
    }
}


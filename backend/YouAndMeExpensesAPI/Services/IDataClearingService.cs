using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Service contract for partner-confirmed data clearing flows.
    /// Encapsulates tokens, emails, and destructive SQL so controllers stay thin.
    /// </summary>
    public interface IDataClearingService
    {
        Task<DataClearingRequestResponse> InitiateDataClearingAsync(string userId, InitiateDataClearingRequest request);
        Task<object> ConfirmDataClearingAsync(ConfirmDataClearingRequest request);
        Task<object> GetStatusAsync(string userId);
        Task<object> CancelRequestAsync(string userId, Guid requestId);
    }
}


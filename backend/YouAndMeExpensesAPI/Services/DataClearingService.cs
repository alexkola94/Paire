using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for handling data clearing requests with partner confirmation.
    /// Contains all DB access, token generation, and email side effects.
    /// </summary>
    public class DataClearingService : IDataClearingService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<DataClearingService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public DataClearingService(
            AppDbContext context,
            IEmailService emailService,
            ILogger<DataClearingService> logger,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<DataClearingRequestResponse> InitiateDataClearingAsync(string userId, InitiateDataClearingRequest request)
        {
            // Parse and validate userId
            if (!Guid.TryParse(userId, out var userGuid))
            {
                throw new ArgumentException("Invalid user ID format", nameof(userId));
            }

            // Validate confirmation phrase
            if (request.ConfirmationPhrase != "DELETE ALL MY DATA")
            {
                throw new InvalidOperationException("Invalid confirmation phrase. Please type 'DELETE ALL MY DATA' exactly.");
            }

            // Check if user has an active partnership
            var partnership = await _context.Partnerships
                .FirstOrDefaultAsync(p =>
                    (p.User1Id == userGuid || p.User2Id == userGuid) &&
                    p.Status == "accepted");

            Guid? partnerId = null;
            if (partnership != null)
            {
                partnerId = partnership.User1Id == userGuid ? partnership.User2Id : partnership.User1Id;
            }

            // Check for existing pending requests
            var existingRequest = await _context.DataClearingRequests
                .FirstOrDefaultAsync(r =>
                    r.RequesterUserId == userGuid &&
                    r.Status == "pending");

            if (existingRequest != null)
            {
                throw new InvalidOperationException("You already have a pending data clearing request.");
            }

            // Create new clearing request
            var clearingRequest = new DataClearingRequest
            {
                Id = Guid.NewGuid(),
                RequesterUserId = userGuid,
                PartnerUserId = partnerId,
                RequesterConfirmed = true,
                PartnerConfirmed = partnerId == null,
                ConfirmationToken = partnerId != null ? GenerateSecureToken() : null,
                Status = "pending",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(48),
                Notes = request.Notes
            };

            _context.DataClearingRequests.Add(clearingRequest);
            await _context.SaveChangesAsync();

            // If no partner, execute immediately
            if (partnerId == null)
            {
                await ExecuteDataClearingAsync(clearingRequest.Id);

                return new DataClearingRequestResponse
                {
                    RequestId = clearingRequest.Id,
                    Status = "executed",
                    RequiresPartnerApproval = false,
                    PartnerConfirmed = true,
                    ExpiresAt = clearingRequest.ExpiresAt,
                    Message = "All data has been cleared successfully!"
                };
            }

            // Send confirmation email to partner
            var partnerProfile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.Id == partnerId.Value);

            var requesterProfile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.Id == userGuid);

            if (partnerProfile?.Email != null)
            {
                await SendPartnerConfirmationEmailAsync(
                    partnerProfile.Email,
                    partnerProfile.DisplayName,
                    requesterProfile?.DisplayName ?? "Your partner",
                    clearingRequest.ConfirmationToken!,
                    clearingRequest.Id);
            }

            _logger.LogInformation("Data clearing request initiated by {UserId}, requires partner approval", userId);

            return new DataClearingRequestResponse
            {
                RequestId = clearingRequest.Id,
                Status = "pending",
                RequiresPartnerApproval = true,
                PartnerConfirmed = false,
                ExpiresAt = clearingRequest.ExpiresAt,
                Message = "A confirmation email has been sent to your partner. The data will be cleared once they approve."
            };
        }

        public async Task<object> ConfirmDataClearingAsync(ConfirmDataClearingRequest request)
        {
            var clearingRequest = await _context.DataClearingRequests
                .FirstOrDefaultAsync(r =>
                    r.ConfirmationToken == request.Token &&
                    r.Status == "pending");

            if (clearingRequest == null)
            {
                return new { error = "Invalid or expired confirmation token" };
            }

            // Check if expired
            if (clearingRequest.ExpiresAt < DateTime.UtcNow)
            {
                clearingRequest.Status = "expired";
                await _context.SaveChangesAsync();
                return new { error = "This request has expired" };
            }

            if (request.Approve)
            {
                // Partner approved - execute data clearing
                clearingRequest.PartnerConfirmed = true;
                clearingRequest.Status = "approved";
                await _context.SaveChangesAsync();

                await ExecuteDataClearingAsync(clearingRequest.Id);

                return new { message = "Data clearing approved and executed successfully" };
            }

            // Partner denied - cancel request
            clearingRequest.Status = "cancelled";
            await _context.SaveChangesAsync();

            // Notify requester about denial
            var requesterProfile = await _context.UserProfiles
                .FirstOrDefaultAsync(p => p.Id == clearingRequest.RequesterUserId);

            if (requesterProfile?.Email != null)
            {
                await SendDenialEmailAsync(requesterProfile.Email, requesterProfile.DisplayName);
            }

            return new { message = "Data clearing request has been denied" };
        }

        public async Task<object> GetStatusAsync(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                throw new ArgumentException("Invalid user ID format", nameof(userId));
            }

            var request = await _context.DataClearingRequests
                .Where(r => r.RequesterUserId == userGuid)
                .OrderByDescending(r => r.CreatedAt)
                .FirstOrDefaultAsync();

            if (request == null)
            {
                return new { hasActiveRequest = false };
            }

            return new
            {
                hasActiveRequest = request.Status == "pending",
                requestId = request.Id,
                status = request.Status,
                requiresPartnerApproval = request.PartnerUserId != null,
                partnerConfirmed = request.PartnerConfirmed,
                expiresAt = request.ExpiresAt,
                createdAt = request.CreatedAt
            };
        }

        public async Task<object> CancelRequestAsync(string userId, Guid requestId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
            {
                throw new ArgumentException("Invalid user ID format", nameof(userId));
            }

            var request = await _context.DataClearingRequests
                .FirstOrDefaultAsync(r => r.Id == requestId && r.RequesterUserId == userGuid);

            if (request == null)
            {
                return new { error = "Request not found" };
            }

            if (request.Status != "pending")
            {
                return new { error = "Can only cancel pending requests" };
            }

            request.Status = "cancelled";
            await _context.SaveChangesAsync();

            return new { message = "Data clearing request cancelled" };
        }

        private async Task ExecuteDataClearingAsync(Guid requestId)
        {
            var request = await _context.DataClearingRequests.FindAsync(requestId);
            if (request == null) return;

            try
            {
                _logger.LogWarning("⚠️ Executing data clearing request {RequestId}", requestId);

                await _context.Database.ExecuteSqlRawAsync(@"
                    SET session_replication_role = 'replica';
                    
                    TRUNCATE TABLE shopping_list_items CASCADE;
                    TRUNCATE TABLE shopping_lists CASCADE;
                    TRUNCATE TABLE loan_payments CASCADE;
                    TRUNCATE TABLE loans CASCADE;
                    TRUNCATE TABLE recurring_bills CASCADE;
                    TRUNCATE TABLE savings_goals CASCADE;
                    TRUNCATE TABLE budgets CASCADE;
                    TRUNCATE TABLE transactions CASCADE;
                    TRUNCATE TABLE reminder_preferences CASCADE;
                    TRUNCATE TABLE partnerships CASCADE;
                    TRUNCATE TABLE user_profiles CASCADE;
                    TRUNCATE TABLE data_clearing_requests CASCADE;
                    
                    ALTER SEQUENCE IF EXISTS shopping_list_items_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS shopping_lists_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS loan_payments_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS loans_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS recurring_bills_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS savings_goals_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS budgets_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS transactions_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS reminder_preferences_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS partnerships_id_seq RESTART WITH 1;
                    ALTER SEQUENCE IF EXISTS data_clearing_requests_id_seq RESTART WITH 1;
                    
                    SET session_replication_role = 'origin';
                ");

                _logger.LogInformation("✅ Data clearing executed successfully for request {RequestId}", requestId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing data clearing for request {RequestId}", requestId);
                throw;
            }
        }

        private string GenerateSecureToken()
        {
            var randomBytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create())
            {
                rng.GetBytes(randomBytes);
            }
            return Convert.ToBase64String(randomBytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
        }

        private async Task SendPartnerConfirmationEmailAsync(string partnerEmail, string partnerName, string requesterName, string token, Guid requestId)
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var scheme = httpContext?.Request.Scheme ?? "https";
            var host = httpContext?.Request.Host.Value ?? "localhost";

            var approveUrl = $"{scheme}://{host}/api/dataclearing/confirm?token={token}&approve=true";
            var denyUrl = $"{scheme}://{host}/api/dataclearing/confirm?token={token}&approve=false";

            var subject = "⚠️ Data Clearing Request - Your Approval Needed";
            var body = $@"
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        <h2 style='color: #e74c3c;'>⚠️ Data Clearing Request</h2>
        
        <p>Hi {partnerName},</p>
        
        <p><strong>{requesterName}</strong> has requested to <strong>clear all data</strong> from your shared Paire account.</p>
        
        <div style='background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;'>
            <strong>⚠️ Warning:</strong> This will permanently delete:
            <ul>
                <li>All transactions (expenses & income)</li>
                <li>All loans and payments</li>
                <li>All budgets and savings goals</li>
                <li>All recurring bills and shopping lists</li>
                <li>All user profiles and partnership data</li>
            </ul>
            <p><strong>This action cannot be undone!</strong></p>
        </div>
        
        <p>As a partner in this account, your approval is required before the data can be cleared.</p>
        
        <div style='margin: 30px 0; text-align: center;'>
            <a href='{approveUrl}' 
               style='display: inline-block; padding: 12px 30px; background: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 10px;'>
                ✅ Approve Data Clearing
            </a>
            <br/>
            <a href='{denyUrl}' 
               style='display: inline-block; padding: 12px 30px; background: #6c757d; color: white; text-decoration: none; border-radius: 5px; margin: 10px;'>
                ❌ Deny Request
            </a>
        </div>
        
        <p style='font-size: 12px; color: #666; margin-top: 30px;'>
            This request will expire in 48 hours if not acted upon.<br/>
            Request ID: {requestId}
        </p>
        
        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'/>
        <p style='font-size: 12px; color: #999;'>
            Paire - Shared Finance Management
        </p>
    </div>
</body>
</html>";

            var emailMessage = new EmailMessage
            {
                ToEmail = partnerEmail,
                ToName = partnerName,
                Subject = subject,
                Body = body,
                IsHtml = true
            };
            await _emailService.SendEmailAsync(emailMessage);
        }

        private async Task SendDenialEmailAsync(string requesterEmail, string requesterName)
        {
            var subject = "Data Clearing Request Denied";
            var body = $@"
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
    <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
        <h2 style='color: #6c757d;'>Data Clearing Request Denied</h2>
        
        <p>Hi {requesterName},</p>
        
        <p>Your partner has <strong>denied</strong> the request to clear all data from your shared account.</p>
        
        <p>No data has been deleted. Your account remains unchanged.</p>
        
        <p>If you need to discuss this with your partner, please do so directly.</p>
        
        <hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'/>
        <p style='font-size: 12px; color: #999;'>
            Paire - Shared Finance Management
        </p>
    </div>
</body>
</html>";

            var emailMessage = new EmailMessage
            {
                ToEmail = requesterEmail,
                ToName = requesterName,
                Subject = subject,
                Body = body,
                IsHtml = true
            };
            await _emailService.SendEmailAsync(emailMessage);
        }
    }
}


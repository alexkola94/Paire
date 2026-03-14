using Paire.Modules.Travel.Core.DTOs;
using Paire.Modules.Travel.Core.Interfaces;
using Paire.Modules.Travel.Infrastructure;
using Paire.Shared.Infrastructure.Services;

namespace Paire.Modules.Travel.Core.Services;

public class TravelAttachmentService : ITravelAttachmentService
{
    private readonly ITravelRepository _repository;
    private readonly IStorageService _storageService;
    private readonly ILogger<TravelAttachmentService> _logger;
    private const long MaxBytes = 5 * 1024 * 1024;

    public TravelAttachmentService(ITravelRepository repository, IStorageService storageService, ILogger<TravelAttachmentService> logger)
    {
        _repository = repository;
        _storageService = storageService;
        _logger = logger;
    }

    public async Task<(TravelAttachmentDto? attachment, string? errorMessage, int? statusCode)> UploadAttachmentAsync(
        string userId, Guid tripId, IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0) return (null, "No file uploaded", 400);
        if (file.Length > MaxBytes) return (null, "File too large. Max size is 5MB.", 400);

        try
        {
            var tripExists = await _repository.TripExistsForUserAsync(tripId, userId);
            if (!tripExists) return (null, "Trip not found", 404);

            var extension = Path.GetExtension(file.FileName);
            var storageFileName = $"travel/{userId}/{tripId}/{Guid.NewGuid()}{extension}";
            var url = await _storageService.UploadFileAsync(file, storageFileName, "receipts");

            return (new TravelAttachmentDto { Url = url, Name = file.FileName, Type = file.ContentType, Size = file.Length, Path = storageFileName }, null, 200);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading travel attachment for trip {TripId}", tripId);
            return (null, "Error uploading attachment", 500);
        }
    }
}

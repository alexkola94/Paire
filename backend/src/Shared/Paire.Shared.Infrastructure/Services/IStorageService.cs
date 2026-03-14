using Microsoft.AspNetCore.Http;

namespace Paire.Shared.Infrastructure.Services;

public interface IStorageService
{
    Task<string> UploadFileAsync(IFormFile file, string fileName, string bucketName);
    Task DeleteFileAsync(string fileName, string bucketName);
}

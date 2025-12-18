using Microsoft.AspNetCore.Http;

namespace YouAndMeExpensesAPI.Services
{
    public interface IStorageService
    {
        /// <summary>
        /// Uploads a file to the storage provider
        /// </summary>
        /// <param name="file">The file to upload</param>
        /// <param name="fileName">The target file name</param>
        /// <param name="bucketName">The bucket to upload to</param>
        /// <returns>The public URL of the uploaded file</returns>
        Task<string> UploadFileAsync(IFormFile file, string fileName, string bucketName);

        /// <summary>
        /// Deletes a file from the storage provider
        /// </summary>
        /// <param name="fileName">The file name to delete</param>
        /// <param name="bucketName">The bucket the file is in</param>
        Task DeleteFileAsync(string fileName, string bucketName);
    }
}

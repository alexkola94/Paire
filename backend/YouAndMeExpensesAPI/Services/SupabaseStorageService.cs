using Supabase;
using Microsoft.Extensions.Options;

namespace YouAndMeExpensesAPI.Services
{
    public class SupabaseStorageService : IStorageService
    {
        private readonly Client? _supabaseClient;
        private readonly ILogger<SupabaseStorageService> _logger;

        public SupabaseStorageService(IConfiguration configuration, ILogger<SupabaseStorageService> logger)
        {
            _logger = logger;
            
            var url = configuration["Supabase:Url"];
            var key = configuration["Supabase:Key"];

            if (string.IsNullOrEmpty(url) || string.IsNullOrEmpty(key))
            {
                _logger.LogWarning("Supabase credentials not found in configuration. Storage operations will fail.");
            }
            else
            {
                var options = new SupabaseOptions
                {
                    AutoRefreshToken = true,
                    AutoConnectRealtime = true
                };
                
                // key can be anon or service_role. 
                // Since this is backend, service_role allows bypassing RLS if needed, 
                // but anon is safer if policies are correct.
                _supabaseClient = new Client(url, key, options);
                _supabaseClient.InitializeAsync().Wait();
            }
        }

        public async Task<string> UploadFileAsync(IFormFile file, string fileName, string bucketName)
        {
            if (_supabaseClient == null)
            {
                throw new InvalidOperationException("Supabase client is not initialized. Check configuration.");
            }

            try
            {
                using var memoryStream = new MemoryStream();
                await file.CopyToAsync(memoryStream);
                var bytes = memoryStream.ToArray();

                var storage = _supabaseClient.Storage;
                var bucket = storage.From(bucketName);

                // Upload
                await bucket.Upload(bytes, fileName, new Supabase.Storage.FileOptions { Upsert = true });

                // Get Public URL
                var publicUrl = bucket.GetPublicUrl(fileName);
                
                return publicUrl;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading file to Supabase Storage");
                throw;
            }
        }

        public async Task DeleteFileAsync(string fileName, string bucketName)
        {
            if (_supabaseClient == null) return;

            try
            {
                var storage = _supabaseClient.Storage;
                var bucket = storage.From(bucketName);
                
                // Remove takes a list of paths
                await bucket.Remove(new List<string> { fileName });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting file from Supabase Storage");
                // Don't throw if delete fails, just log
            }
        }
    }
}

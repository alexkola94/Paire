using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using YouAndMeExpensesAPI.Models;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using System.Text.RegularExpressions;

namespace YouAndMeExpensesAPI.Services
{
    public class BankStatementImportService : IBankStatementImportService
    {
        private readonly IBankTransactionImportService _transactionImportService;
        private readonly ILogger<BankStatementImportService> _logger;

        public BankStatementImportService(
            IBankTransactionImportService transactionImportService,
            ILogger<BankStatementImportService> logger)
        {
            _transactionImportService = transactionImportService;
            _logger = logger;
        }

        public async Task<BankTransactionImportResult> ImportStatementAsync(string userId, IFormFile file, CancellationToken cancellationToken = default)
        {
            var result = new BankTransactionImportResult();

            if (file == null || file.Length == 0)
            {
                result.ErrorMessages.Add("No file uploaded.");
                return result;
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".csv" && extension != ".xlsx" && extension != ".xls" && extension != ".pdf")
            {
                 result.ErrorMessages.Add("Invalid file format. Please upload a CSV, Excel, or PDF file.");
                 return result;
            }

            try
            {
                List<ImportedTransactionDTO> transactions = new List<ImportedTransactionDTO>();

                if (extension == ".csv")
                {
                    transactions = ParseCsv(file);
                }
                else if (extension == ".pdf")
                {
                    transactions = ParsePdf(file);
                }
                else
                {
                    // Excel support can be added later using EPPlus or NPOI
                    result.ErrorMessages.Add("Excel support is coming soon. Please upload a CSV or PDF.");
                    return result;
                }

                if (!transactions.Any())
                {
                    result.ErrorMessages.Add("No transactions found in the file.");
                    return result;
                }

                // Process the parsed transactions
                // Create Import History record first
                var importHistory = new ImportHistory
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    FileName = file.FileName,
                    ImportDate = DateTime.UtcNow,
                    TransactionCount = transactions.Count,
                    TotalAmount = transactions.Sum(t => t.Amount),
                    Status = "completed"
                };

                // We need to persist this history record. 
                // Since this service doesn't have direct DbContext access (it uses IBankTransactionImportService),
                // we should pass the history object or ID to the transaction service.
                // Let's modify the DTOs to include the HistoryID or handle it in the next service.
                // Better yet, let's inject DbContext here to save the history record, OR pass it down.
                // Passing it down is cleaner if we want to keep this service focused on parsing.
                // Let's add ImportHistoryId to ImportedTransactionDTO? No, that repeats.
                // Let's update ProcessImportedTransactionsAsync to accept the history metadata.

                // For now, let's assume we update the interface to accept the ImportHistory object or similar metadata.
                // Actually, looking at the code, IBankTransactionImportService is where the DB logic lives.
                // I will update ProcessImportedTransactionsAsync to take an optional ImportHistoryId or create it there.
                
                // Let's pass the metadata to the service.
                return await _transactionImportService.ProcessImportedTransactionsAsync(userId, transactions, cancellationToken, importHistory);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error importing statement");
                result.Errors++;
                result.ErrorMessages.Add($"Import failed: {ex.Message}");
                return result;
            }
        }

        private List<ImportedTransactionDTO> ParseCsv(IFormFile file)
        {
            var transactions = new List<ImportedTransactionDTO>();

            using (var reader = new StreamReader(file.OpenReadStream()))
            {
                // We need a flexible configuration because bank CSVs vary wildly
                var config = new CsvConfiguration(CultureInfo.InvariantCulture)
                {
                    HasHeaderRecord = true,
                    MissingFieldFound = null,
                    HeaderValidated = null,
                    Delimiter = DetectDelimiter(reader), // Helper to sniff ; vs ,
                    PrepareHeaderForMatch = args => args.Header.ToLower(),
                };
                
                // Reset stream after sensing delimiter
                file.OpenReadStream().Seek(0, SeekOrigin.Begin);
                using var streamReader = new StreamReader(file.OpenReadStream()); // New reader for actual parsing
                using var csv = new CsvReader(streamReader, config);

                // Read records dynamically
                var records = csv.GetRecords<dynamic>();

                foreach (var record in records)
                {
                    // Heuristic Parsing: Try to find Date, Amount, Description columns
                    var dict = (IDictionary<string, object>)record;
                    
                    var date = ParseDate(dict);
                    var amount = ParseAmount(dict);
                    var description = ParseDescription(dict);
                    
                    if (date != default && amount != 0)
                    {
                        transactions.Add(new ImportedTransactionDTO
                        {
                            // Generate a deterministic ID based on content since CSVs might not have one
                            TransactionId = GenerateId(date, amount, description), 
                            Date = date,
                            Amount = amount,
                            Description = description,
                            Category = "Uncategorized", // Import service will try to map this later based on description
                            Currency = "EUR" // Default to EUR for Greece
                        });
                    }
                }
            }

            return transactions;
        }

        private List<ImportedTransactionDTO> ParsePdf(IFormFile file)
        {
            var transactions = new List<ImportedTransactionDTO>();

            // Copy stream to memory because PdfPig needs a seekable stream or byte array
            using var ms = new MemoryStream();
            file.CopyTo(ms);
            ms.Position = 0;

            try 
            {
                using (var document = PdfDocument.Open(ms))
                {
                    foreach (var page in document.GetPages())
                    {
                        var text = page.Text;
                        // Split by lines based on typical PDF coordinate sorting or raw text (PdfPig returns text in order)
                        // A simple line split 'might' work if the PDF is simple text.
                        // Better approach: Regex over the entire page text or line by line
                        
                        var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

                        foreach (var line in lines)
                        {
                            // Heuristic: Look for lines that contain a Date and a Money Amount
                            // Date formats: dd/MM/yyyy, dd-MM-yyyy, d/M/yy
                            // Amount formats: 1.000,00 or 1,000.00 or -12,50
                            
                            // 1. Extract Date
                            var dateMatch = Regex.Match(line, @"\b(\d{1,2}[/\.-]\d{1,2}[/\.-]\d{2,4})\b");
                            if (!dateMatch.Success) continue;

                            if (!TryStandardDateParse(dateMatch.Value, out DateTime date)) continue;

                            // 2. Extract Amount(s)
                            // Look for numbers with at least one decimal separator (comma or dot) and 2 digits likely at the end?
                            // This is tricky. Let's look for things that look like amounts.
                            
                            var amountMatches = Regex.Matches(line, @"-?[\d\.,]+\d{2}");
                            if (amountMatches.Count == 0) continue;

                            // Assume the last number is the amount (balance is often last, transaction amount is second to last... 
                            // but often PDFs have [Date] [Description] [Amount] [Balance])
                            // Let's try to parse the last match as the amount.
                            
                            decimal amount = 0;
                            string description = "";
                            bool foundAmount = false;

                            // We iterate backwards. If we find a valid amount, we assume it's the transaction amount.
                            for (int i = amountMatches.Count - 1; i >= 0; i--)
                            {
                                var val = amountMatches[i].Value;
                                // Clean it common garbage
                                if (TryStandardAmountParse(val, out decimal amt))
                                {
                                    amount = amt;
                                    // Make sure it's not a year (like 2023) or a small integer index
                                    if (Math.Abs(amt) > 2020 && Math.Abs(amt) < 2030 && !val.Contains(',') && !val.Contains('.')) continue; // likely a year
                                    
                                    foundAmount = true;
                                    break;
                                }
                            }

                            if (!foundAmount) continue;

                            // 3. Extract Description
                            // Remove date and amount from line to get description
                            description = line.Replace(dateMatch.Value, "").Replace(amount.ToString("N2", new CultureInfo("el-GR")), "").Replace(amount.ToString(), "").Trim();
                            // Cleanup extra spaces or odd chars
                            description = Regex.Replace(description, @"\s+", " ").Trim();
                            if (string.IsNullOrEmpty(description)) description = "Imported PDF Transaction";

                            transactions.Add(new ImportedTransactionDTO
                            {
                                TransactionId = GenerateId(date, amount, description),
                                Date = date,
                                Amount = amount,
                                Description = description,
                                Category = "Uncategorized",
                                Currency = "EUR"
                            });
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "PDF Parsing error");
                throw new Exception("Could not parse PDF. Only text-based PDFs are supported (scanned images are not).");
            }

            return transactions;
        }

        private bool TryStandardDateParse(string val, out DateTime date)
        {
             if (DateTime.TryParse(val, CultureInfo.InvariantCulture, DateTimeStyles.None, out date)) return true;
             if (DateTime.TryParseExact(val, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out date)) return true;
             if (DateTime.TryParseExact(val, "dd-MM-yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out date)) return true;
             if (DateTime.TryParseExact(val, "d/M/yy", CultureInfo.InvariantCulture, DateTimeStyles.None, out date)) return true;
             return false;
        }

        private bool TryStandardAmountParse(string val, out decimal amount)
        {
             // Try Greek format (1.000,00)
             if (decimal.TryParse(val, NumberStyles.Any, new CultureInfo("el-GR"), out amount)) return true;
             // Try US format (1,000.00)
             if (decimal.TryParse(val, NumberStyles.Any, CultureInfo.InvariantCulture, out amount)) return true;
             
             amount = 0;
             return false;
        }

        private string DetectDelimiter(StreamReader reader)
        {
            // Simple sniffer
            var line = reader.ReadLine();
            if (string.IsNullOrEmpty(line)) return ",";
            if (line.Contains(';')) return ";";
            return ",";
        }

        private DateTime ParseDate(IDictionary<string, object> row)
        {
            // Look for common Date headers
            string[] dateHeaders = { "date", "hmerominia", "transaction date", "booking date", "time" };
            
            foreach (var header in dateHeaders)
            {
                var key = row.Keys.FirstOrDefault(k => k.ToLower().Contains(header));
                if (key != null && row[key] is string val && !string.IsNullOrWhiteSpace(val))
                {
                     if (TryStandardDateParse(val, out DateTime dt)) return dt;
                }
            }
            return default;
        }

        private decimal ParseAmount(IDictionary<string, object> row)
        {
            string[] amountHeaders = { "amount", "poso", "value", "euro", "eur" };
             foreach (var header in amountHeaders)
            {
                var key = row.Keys.FirstOrDefault(k => k.ToLower().Contains(header));
                if (key != null && row[key] is string val && !string.IsNullOrWhiteSpace(val))
                {
                     // Clean up currency symbols and handle 1.000,00 vs 1,000.00
                     var cleanVal = val.Replace("€", "").Trim();
                     if (TryStandardAmountParse(cleanVal, out decimal d)) return d;
                }
            }
            return 0;
        }

        private string ParseDescription(IDictionary<string, object> row)
        {
            string[] descHeaders = { "description", "perigrafi", "details", "memo", "notes", "transaction details" };
             foreach (var header in descHeaders)
            {
                var key = row.Keys.FirstOrDefault(k => k.ToLower().Contains(header));
                if (key != null && row[key] is string val) return val;
            }
            // Fallback: Concatenate unknown string columns? For now just return unknown
            return "Unknown Transaction";
        }
        
        private string GenerateId(DateTime date, decimal amount, string description)
        {
            var raw = $"{date:yyyyMMdd}_{amount}_{description}";
            using (var md5 = System.Security.Cryptography.MD5.Create())
            {
                var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
        }
    }
}

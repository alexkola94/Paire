using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Microsoft.AspNetCore.Http;
using Paire.Modules.Finance.Core.DTOs;
using Paire.Modules.Finance.Core.Entities;
using Paire.Modules.Finance.Core.Interfaces;
using UglyToad.PdfPig;
using System.Text.RegularExpressions;

namespace Paire.Modules.Finance.Core.Services;

public class BankStatementImportService : IBankStatementImportService
{
    private readonly IBankTransactionImportService _transactionImportService;
    private readonly ILogger<BankStatementImportService> _logger;

    public BankStatementImportService(IBankTransactionImportService transactionImportService, ILogger<BankStatementImportService> logger)
    {
        _transactionImportService = transactionImportService;
        _logger = logger;
    }

    public async Task<BankTransactionImportResult> ImportStatementAsync(string userId, IFormFile file, CancellationToken cancellationToken = default)
    {
        var result = new BankTransactionImportResult();

        if (file == null || file.Length == 0) { result.ErrorMessages.Add("No file uploaded."); return result; }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (extension != ".csv" && extension != ".xlsx" && extension != ".xls" && extension != ".pdf")
        {
            result.ErrorMessages.Add("Invalid file format. Please upload a CSV, Excel, or PDF file.");
            return result;
        }

        try
        {
            List<ImportedTransactionDTO> transactions;

            if (extension == ".csv") transactions = ParseCsv(file);
            else if (extension == ".pdf") transactions = ParsePdf(file);
            else { result.ErrorMessages.Add("Excel support is coming soon. Please upload a CSV or PDF."); return result; }

            if (!transactions.Any()) { result.ErrorMessages.Add("No transactions found in the file."); return result; }

            var importHistory = new ImportHistory
            {
                Id = Guid.NewGuid(), UserId = userId, FileName = file.FileName,
                ImportDate = DateTime.UtcNow, TransactionCount = transactions.Count,
                TotalAmount = transactions.Sum(t => t.Amount), Status = "completed"
            };

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
            var config = new CsvConfiguration(CultureInfo.InvariantCulture)
            {
                HasHeaderRecord = true, MissingFieldFound = null, HeaderValidated = null,
                Delimiter = DetectDelimiter(reader),
                PrepareHeaderForMatch = args => args.Header.ToLower(),
            };

            file.OpenReadStream().Seek(0, SeekOrigin.Begin);
            using var streamReader = new StreamReader(file.OpenReadStream());
            using var csv = new CsvReader(streamReader, config);
            var records = csv.GetRecords<dynamic>();

            foreach (var record in records)
            {
                var dict = (IDictionary<string, object>)record;
                var date = ParseDate(dict);
                var amount = ParseAmount(dict);
                var description = ParseDescription(dict);

                if (date != default && amount != 0)
                {
                    transactions.Add(new ImportedTransactionDTO
                    {
                        TransactionId = GenerateId(date, amount, description),
                        Date = date, Amount = amount, Description = description,
                        Category = "Uncategorized", Currency = "EUR"
                    });
                }
            }
        }
        return transactions;
    }

    private List<ImportedTransactionDTO> ParsePdf(IFormFile file)
    {
        var transactions = new List<ImportedTransactionDTO>();
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
                    var lines = text.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

                    foreach (var line in lines)
                    {
                        string pattern = @"(\d{1,2}/\d{1,2})(.*?)(949|99|96)?(-?(?:0|[1-9]\d{0,2}(?:\.\d{3})*),\d{2})(\d{1,2}/\d{1,2}/(?:20\d{2}|\d{2}))";
                        var matches = Regex.Matches(line, pattern);

                        foreach (Match match in matches)
                        {
                            try
                            {
                                string startDateStr = match.Groups[1].Value;
                                string descStr = match.Groups[2].Value;
                                string bankCode = match.Groups[3].Value;
                                string amountStr = match.Groups[4].Value;
                                string endDateStr = match.Groups[5].Value;

                                if (!TryStandardDateParse(endDateStr, out DateTime endDate)) continue;
                                if (!TryStandardDateParse(startDateStr + "/" + endDate.Year, out DateTime date)) date = endDate;
                                date = DateTime.SpecifyKind(date, DateTimeKind.Utc);

                                if (!TryStandardAmountParse(amountStr, out decimal amount)) continue;

                                if (amount == 0 && !string.IsNullOrEmpty(bankCode))
                                {
                                    if (TryStandardAmountParse(bankCode + amountStr, out decimal combinedAmount))
                                        amount = combinedAmount;
                                }

                                string description = Regex.Replace(descStr.Trim(), @"\s+", " ").Trim();
                                if (string.IsNullOrEmpty(description)) description = "Imported PDF Transaction";

                                transactions.Add(new ImportedTransactionDTO
                                {
                                    TransactionId = GenerateId(date, amount, description),
                                    Date = date, Amount = amount, Description = description,
                                    Category = "Uncategorized", Currency = "EUR"
                                });
                            }
                            catch (Exception ex) { _logger.LogError(ex, "Error parsing match: {Match}", match.Value); }
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "PDF Parsing error");
            throw new Exception("Could not parse PDF. Only text-based PDFs are supported.");
        }
        return transactions;
    }

    private bool TryStandardDateParse(string val, out DateTime date)
    {
        if (DateTime.TryParse(val, CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
        {
            if (date.Year < 2000) date = date.AddYears(2000);
            return true;
        }
        if (DateTime.TryParseExact(val, "dd/MM/yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out date)) return true;
        if (DateTime.TryParseExact(val, "dd-MM-yyyy", CultureInfo.InvariantCulture, DateTimeStyles.None, out date)) return true;
        if (DateTime.TryParseExact(val, "d/M/yy", CultureInfo.InvariantCulture, DateTimeStyles.None, out date))
        {
            if (date.Year < 2000) date = date.AddYears(2000);
            return true;
        }
        return false;
    }

    private bool TryStandardAmountParse(string val, out decimal amount)
    {
        if (decimal.TryParse(val, NumberStyles.Any, new CultureInfo("el-GR"), out amount)) return true;
        if (decimal.TryParse(val, NumberStyles.Any, CultureInfo.InvariantCulture, out amount)) return true;
        amount = 0;
        return false;
    }

    private string DetectDelimiter(StreamReader reader)
    {
        var line = reader.ReadLine();
        if (string.IsNullOrEmpty(line)) return ",";
        return line.Contains(';') ? ";" : ",";
    }

    private DateTime ParseDate(IDictionary<string, object> row)
    {
        string[] dateHeaders = { "date", "hmerominia", "transaction date", "booking date", "time" };
        foreach (var header in dateHeaders)
        {
            var key = row.Keys.FirstOrDefault(k => k.ToLower().Contains(header));
            if (key != null && row[key] is string val && !string.IsNullOrWhiteSpace(val))
                if (TryStandardDateParse(val, out DateTime dt)) return dt;
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
        return "Unknown Transaction";
    }

    private string GenerateId(DateTime date, decimal amount, string description)
    {
        var raw = $"{date:yyyyMMdd}_{amount}_{description}";
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
        return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
    }
}

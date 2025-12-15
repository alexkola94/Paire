namespace YouAndMeExpensesAPI.Models
{
    public class ImportedTransactionDTO
    {
        public string TransactionId { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public decimal Amount { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
    }
}

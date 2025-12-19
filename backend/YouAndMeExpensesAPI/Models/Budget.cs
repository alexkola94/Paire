using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Budget model for household expense planning
    /// Helps couples manage monthly/yearly budgets by category
    /// Uses Entity Framework Core
    /// </summary>
    [Table("budgets")]
    public class Budget
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("category")]
        public string Category { get; set; } = string.Empty;

        [Column("amount")]
        public decimal Amount { get; set; }

        [Column("period")]
        public string Period { get; set; } = "monthly"; // "monthly", "yearly"

        [Column("start_date")]
        public DateTime StartDate { get; set; }

        [Column("end_date")]
        public DateTime? EndDate { get; set; }

        [Column("spent_amount")]
        public decimal SpentAmount { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Savings goals for household financial planning
    /// Uses Entity Framework Core
    /// </summary>
    [Table("savings_goals")]
    public class SavingsGoal
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("target_amount")]
        public decimal TargetAmount { get; set; }

        [Column("current_amount")]
        public decimal CurrentAmount { get; set; }

        [Column("target_date")]
        public DateTime? TargetDate { get; set; }

        [Column("priority")]
        public string Priority { get; set; } = "medium"; // "low", "medium", "high"

        [Column("category")]
        public string? Category { get; set; } // "vacation", "emergency", "house", "car", etc.

        [Column("icon")]
        public string? Icon { get; set; }

        [Column("color")]
        public string? Color { get; set; }

        [Column("is_achieved")]
        public bool IsAchieved { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Recurring bills and subscriptions
    /// Uses Entity Framework Core
    /// </summary>
    [Table("recurring_bills")]
    public class RecurringBill
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("amount")]
        public decimal Amount { get; set; }

        [Column("category")]
        public string Category { get; set; } = string.Empty;

        [Column("frequency")]
        public string Frequency { get; set; } = "monthly"; // "weekly", "monthly", "quarterly", "yearly"

        [Column("due_day")]
        public int DueDay { get; set; } // Day of month/week

        [Column("next_due_date")]
        public DateTime NextDueDate { get; set; }

        [Column("auto_pay")]
        public bool AutoPay { get; set; }

        [Column("reminder_days")]
        public int ReminderDays { get; set; } = 3; // Remind X days before due date

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        // Navigation property for attachments
        public virtual ICollection<RecurringBillAttachment> Attachments { get; set; } = new List<RecurringBillAttachment>();
    }

    /// <summary>
    /// Shopping list for household items
    /// Uses Entity Framework Core
    /// </summary>
    [Table("shopping_lists")]
    public class ShoppingList
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("user_id")]
        public string UserId { get; set; } = string.Empty;

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("category")]
        public string? Category { get; set; } // "groceries", "household", "personal", etc.

        [Column("is_completed")]
        public bool IsCompleted { get; set; }

        [Column("completed_date")]
        public DateTime? CompletedDate { get; set; }

        [Column("estimated_total")]
        public decimal? EstimatedTotal { get; set; }

        [Column("actual_total")]
        public decimal? ActualTotal { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// Items in a shopping list
    /// Uses Entity Framework Core
    /// </summary>
    [Table("shopping_list_items")]
    public class ShoppingListItem
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        [Column("shopping_list_id")]
        public Guid ShoppingListId { get; set; }

        [Column("name")]
        public string Name { get; set; } = string.Empty;

        [Column("quantity")]
        public int Quantity { get; set; } = 1;

        [Column("unit")]
        public string? Unit { get; set; } // "kg", "liters", "pieces", etc.

        [Column("estimated_price")]
        public decimal? EstimatedPrice { get; set; }

        [Column("actual_price")]
        public decimal? ActualPrice { get; set; }

        [Column("is_checked")]
        public bool IsChecked { get; set; }

        [Column("category")]
        public string? Category { get; set; }

        [Column("notes")]
        public string? Notes { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}


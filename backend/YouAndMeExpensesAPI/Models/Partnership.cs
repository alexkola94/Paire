using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// Partnership model linking two users together for data sharing
    /// Enables couples to see all expenses/transactions from both partners
    /// Uses Entity Framework Core
    /// </summary>
    [Table("partnerships")]
    public class Partnership
    {
        /// <summary>
        /// Partnership ID
        /// </summary>
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        /// <summary>
        /// First user in the partnership
        /// </summary>
        [Column("user1_id")]
        public Guid User1Id { get; set; }

        /// <summary>
        /// Second user in the partnership
        /// </summary>
        [Column("user2_id")]
        public Guid User2Id { get; set; }

        /// <summary>
        /// Partnership status: "active" or "inactive"
        /// When active, data is shared between partners
        /// When inactive, sharing is disabled
        /// </summary>
        [Column("status")]
        public string Status { get; set; } = "active";

        /// <summary>
        /// When the partnership was created
        /// </summary>
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// When the partnership was last updated
        /// </summary>
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO for creating a new partnership
    /// </summary>
    public class CreatePartnershipDto
    {
        /// <summary>
        /// Email of the user to partner with
        /// </summary>
        public string PartnerEmail { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO for updating partnership status
    /// </summary>
    public class UpdatePartnershipDto
    {
        /// <summary>
        /// New status: "active" or "inactive"
        /// </summary>
        public string Status { get; set; } = string.Empty;
    }

    /// <summary>
    /// Response model for partnership information
    /// </summary>
    public class PartnershipResponse
    {
        /// <summary>
        /// Partnership ID
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Current user's profile
        /// </summary>
        public UserProfile CurrentUser { get; set; } = null!;

        /// <summary>
        /// Partner's profile
        /// </summary>
        public UserProfile Partner { get; set; } = null!;

        /// <summary>
        /// Partnership status
        /// </summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>
        /// When the partnership was created
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Whether the partnership is currently active
        /// </summary>
        public bool IsActive => Status.Equals("active", StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Constants for partnership status values
    /// </summary>
    public static class PartnershipStatus
    {
        public const string Active = "active";
        public const string Inactive = "inactive";
    }
}


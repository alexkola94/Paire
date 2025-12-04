using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace YouAndMeExpensesAPI.Models
{
    /// <summary>
    /// User profile model containing display information
    /// Used to show name tags and identify who added what
    /// Uses Entity Framework Core
    /// </summary>
    [Table("user_profiles")]
    public class UserProfile
    {
        /// <summary>
        /// User ID (references auth.users)
        /// </summary>
        [Key]
        [Column("id")]
        public Guid Id { get; set; }

        /// <summary>
        /// Display name shown in the app (e.g., "Alex", "Partner Name")
        /// This is the "name tag" that identifies who added each transaction
        /// </summary>
        [Column("display_name")]
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>
        /// User's email address
        /// </summary>
        [Column("email")]
        public string? Email { get; set; }

        /// <summary>
        /// URL to user's avatar/profile picture
        /// </summary>
        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        /// <summary>
        /// When the profile was created
        /// </summary>
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// When the profile was last updated
        /// </summary>
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO for creating or updating a user profile
    /// </summary>
    public class UserProfileDto
    {
        /// <summary>
        /// Display name to show in the app
        /// </summary>
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>
        /// User's email
        /// </summary>
        public string? Email { get; set; }

        /// <summary>
        /// Avatar URL
        /// </summary>
        public string? AvatarUrl { get; set; }
    }

    /// <summary>
    /// Response model for user profile with partner information
    /// </summary>
    public class UserProfileResponse
    {
        /// <summary>
        /// Current user's profile
        /// </summary>
        public UserProfile Profile { get; set; } = null!;

        /// <summary>
        /// Partner's profile (if partnership exists)
        /// </summary>
        public UserProfile? Partner { get; set; }

        /// <summary>
        /// Whether user is in an active partnership
        /// </summary>
        public bool HasActivePartnership { get; set; }
    }
}


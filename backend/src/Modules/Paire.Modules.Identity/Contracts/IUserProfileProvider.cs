namespace Paire.Modules.Identity.Contracts;

/// <summary>
/// Cross-module contract for retrieving user profile information.
/// Other modules (e.g., Finance, Partnership) can depend on this to look up
/// user display names and avatars without coupling to Identity internals.
/// </summary>
public interface IUserProfileProvider
{
    /// <summary>
    /// Get a user's display name by their ID.
    /// </summary>
    Task<string?> GetDisplayNameAsync(Guid userId);

    /// <summary>
    /// Get a user's avatar URL by their ID.
    /// </summary>
    Task<string?> GetAvatarUrlAsync(Guid userId);

    /// <summary>
    /// Get basic profile info (id, display_name, email, avatar_url) for a user.
    /// Returns null if user not found.
    /// </summary>
    Task<UserProfileInfo?> GetProfileInfoAsync(Guid userId);
}

/// <summary>
/// Lightweight DTO for cross-module user profile information.
/// </summary>
public class UserProfileInfo
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }
}

namespace Paire.Modules.Finance.Core.Entities;

public class UserProfileReadModel
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
}

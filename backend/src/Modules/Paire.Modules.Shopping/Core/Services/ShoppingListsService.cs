using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Paire.Modules.Identity.Contracts;
using Paire.Modules.Partnership.Contracts;
using Paire.Modules.Shopping.Core.Entities;
using Paire.Modules.Shopping.Core.Interfaces;
using Paire.Modules.Shopping.Infrastructure;

namespace Paire.Modules.Shopping.Core.Services;

public class ShoppingListsService : IShoppingListsService
{
    private readonly ShoppingDbContext _dbContext;
    private readonly IPartnershipResolver _partnershipResolver;
    private readonly IUserProfileProvider _userProfileProvider;
    private readonly ILogger<ShoppingListsService> _logger;

    public ShoppingListsService(
        ShoppingDbContext dbContext,
        IPartnershipResolver partnershipResolver,
        IUserProfileProvider userProfileProvider,
        ILogger<ShoppingListsService> logger)
    {
        _dbContext = dbContext;
        _partnershipResolver = partnershipResolver;
        _userProfileProvider = userProfileProvider;
        _logger = logger;
    }

    public async Task<IReadOnlyList<object>> GetShoppingListsAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var lists = await _dbContext.ShoppingLists
            .Where(l => allUserIds.Contains(l.UserId))
            .OrderByDescending(l => l.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        var listIds = lists.Select(l => l.Id).ToList();
        var allItems = await _dbContext.ShoppingListItems
            .Where(i => listIds.Contains(i.ShoppingListId))
            .OrderBy(i => i.IsChecked)
            .ThenBy(i => i.CreatedAt)
            .AsNoTracking()
            .ToListAsync();
        var itemsByListId = allItems.GroupBy(i => i.ShoppingListId).ToDictionary(g => g.Key, g => g.ToList());

        var userIds = lists.Select(l => l.UserId).Distinct().ToList();
        var profileDict = new Dictionary<Guid, object>();
        foreach (var uid in userIds)
        {
            var profile = await _userProfileProvider.GetProfileInfoAsync(uid);
            if (profile != null)
            {
                profileDict[uid] = new
                {
                    id = profile.Id,
                    email = profile.Email,
                    display_name = profile.DisplayName,
                    avatar_url = profile.AvatarUrl
                };
            }
        }

        var enrichedLists = lists
            .Select(l => new
            {
                id = l.Id,
                user_id = l.UserId,
                name = l.Name,
                category = l.Category,
                is_completed = l.IsCompleted,
                estimated_total = l.EstimatedTotal,
                actual_total = l.ActualTotal,
                notes = l.Notes,
                completed_date = l.CompletedDate,
                created_at = l.CreatedAt,
                updated_at = l.UpdatedAt,
                user_profiles = profileDict.TryGetValue(l.UserId, out var p) ? p : null,
                items = itemsByListId.TryGetValue(l.Id, out var listItems) ? listItems : new List<ShoppingListItem>()
            })
            .Cast<object>()
            .ToList();

        return enrichedLists;
    }

    public async Task<object?> GetShoppingListAsync(Guid userId, Guid listId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var list = await _dbContext.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (list == null)
            return null;

        var items = await _dbContext.ShoppingListItems
            .Where(i => i.ShoppingListId == listId)
            .OrderBy(i => i.IsChecked)
            .ThenBy(i => i.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return new
        {
            list,
            items,
            itemCount = items.Count,
            checkedCount = items.Count(i => i.IsChecked)
        };
    }

    public async Task<ShoppingList> CreateShoppingListAsync(Guid userId, ShoppingList list)
    {
        list.Id = Guid.NewGuid();
        list.UserId = userId;
        list.CreatedAt = DateTime.UtcNow;
        list.UpdatedAt = DateTime.UtcNow;
        list.IsCompleted = false;

        _dbContext.ShoppingLists.Add(list);
        await _dbContext.SaveChangesAsync();

        return list;
    }

    public async Task<ShoppingList?> UpdateShoppingListAsync(Guid userId, Guid listId, ShoppingList updated)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var existingList = await _dbContext.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (existingList == null)
            return null;

        existingList.Name = updated.Name;
        existingList.Category = updated.Category;
        existingList.IsCompleted = updated.IsCompleted;
        existingList.EstimatedTotal = updated.EstimatedTotal;
        existingList.ActualTotal = updated.ActualTotal;
        existingList.Notes = updated.Notes;
        existingList.UpdatedAt = DateTime.UtcNow;

        if (updated.IsCompleted && !existingList.CompletedDate.HasValue)
            existingList.CompletedDate = DateTime.UtcNow;
        else if (!updated.IsCompleted)
            existingList.CompletedDate = null;

        await _dbContext.SaveChangesAsync();

        return existingList;
    }

    public async Task<bool> DeleteShoppingListAsync(Guid userId, Guid listId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var list = await _dbContext.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (list == null)
            return false;

        var items = await _dbContext.ShoppingListItems
            .Where(i => i.ShoppingListId == listId)
            .ToListAsync();

        _dbContext.ShoppingListItems.RemoveRange(items);
        _dbContext.ShoppingLists.Remove(list);
        await _dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<IReadOnlyList<ShoppingListItem>> GetShoppingListItemsAsync(Guid userId, Guid listId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var list = await _dbContext.ShoppingLists
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (list == null)
            return Array.Empty<ShoppingListItem>();

        var items = await _dbContext.ShoppingListItems
            .Where(i => i.ShoppingListId == listId)
            .OrderBy(i => i.IsChecked)
            .ThenBy(i => i.CreatedAt)
            .AsNoTracking()
            .ToListAsync();

        return items;
    }

    public async Task<ShoppingListItem?> AddShoppingListItemAsync(Guid userId, Guid listId, ShoppingListItem item)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var list = await _dbContext.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (list == null)
            return null;

        item.Id = Guid.NewGuid();
        item.ShoppingListId = listId;
        item.CreatedAt = DateTime.UtcNow;
        item.IsChecked = false;

        if (item.Quantity <= 0)
            item.Quantity = 1;

        _dbContext.ShoppingListItems.Add(item);

        if (item.EstimatedPrice.HasValue && item.EstimatedPrice.Value > 0)
            list.EstimatedTotal = (list.EstimatedTotal ?? 0) + (item.EstimatedPrice.Value * item.Quantity);

        list.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return item;
    }

    public async Task<ShoppingListItem?> UpdateShoppingListItemAsync(Guid userId, Guid listId, Guid itemId, ShoppingListItem updated)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var list = await _dbContext.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (list == null)
            return null;

        var existingItem = await _dbContext.ShoppingListItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

        if (existingItem == null)
            return null;

        var oldEstimate = (existingItem.EstimatedPrice ?? 0) * existingItem.Quantity;
        var newEstimate = (updated.EstimatedPrice ?? 0) * updated.Quantity;

        existingItem.Name = updated.Name;
        existingItem.Quantity = updated.Quantity;
        existingItem.Unit = updated.Unit;
        existingItem.EstimatedPrice = updated.EstimatedPrice;
        existingItem.ActualPrice = updated.ActualPrice;
        existingItem.IsChecked = updated.IsChecked;
        existingItem.Category = updated.Category;
        existingItem.Notes = updated.Notes;

        list.EstimatedTotal = (list.EstimatedTotal ?? 0) - oldEstimate + newEstimate;

        if (updated.ActualPrice.HasValue)
        {
            var actualChange = updated.ActualPrice.Value * updated.Quantity;
            list.ActualTotal = (list.ActualTotal ?? 0) + actualChange;
        }

        list.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return existingItem;
    }

    public async Task<ShoppingListItem?> ToggleShoppingListItemAsync(Guid userId, Guid listId, Guid itemId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var list = await _dbContext.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (list == null)
            return null;

        var item = await _dbContext.ShoppingListItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

        if (item == null)
            return null;

        item.IsChecked = !item.IsChecked;
        list.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        return item;
    }

    public async Task<bool> DeleteShoppingListItemAsync(Guid userId, Guid listId, Guid itemId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var list = await _dbContext.ShoppingLists
            .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

        if (list == null)
            return false;

        var item = await _dbContext.ShoppingListItems
            .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

        if (item == null)
            return false;

        if (item.EstimatedPrice.HasValue)
            list.EstimatedTotal = (list.EstimatedTotal ?? 0) - (item.EstimatedPrice.Value * item.Quantity);

        _dbContext.ShoppingListItems.Remove(item);
        list.UpdatedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync();

        return true;
    }

    public async Task<object> GetSummaryAsync(Guid userId)
    {
        var allUserIds = await GetHouseholdUserIdsAsync(userId);

        var lists = await _dbContext.ShoppingLists
            .Where(l => allUserIds.Contains(l.UserId))
            .AsNoTracking()
            .ToListAsync();

        var activeLists = lists.Where(l => !l.IsCompleted).ToList();
        var completedLists = lists.Where(l => l.IsCompleted).ToList();

        return new
        {
            totalLists = lists.Count,
            activeLists = activeLists.Count,
            completedLists = completedLists.Count,
            totalEstimated = activeLists.Sum(l => l.EstimatedTotal ?? 0),
            totalSpent = completedLists.Sum(l => l.ActualTotal ?? 0)
        };
    }

    private async Task<List<Guid>> GetHouseholdUserIdsAsync(Guid userId)
    {
        try
        {
            var ids = await _partnershipResolver.GetHouseholdUserIdsAsync(userId.ToString());
            return ids.Select(s => Guid.TryParse(s, out var g) ? g : userId).Distinct().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting household IDs for user: {UserId}", userId);
            return new List<Guid> { userId };
        }
    }
}

using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service for shopping lists and items. Encapsulates all data access and
    /// business rules so that controllers remain thin.
    /// </summary>
    public class ShoppingListsService : IShoppingListsService
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ShoppingListsService> _logger;

        public ShoppingListsService(AppDbContext dbContext, ILogger<ShoppingListsService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<IReadOnlyList<object>> GetShoppingListsAsync(Guid userId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var lists = await _dbContext.ShoppingLists
                .Where(l => allUserIds.Contains(l.UserId))
                .OrderByDescending(l => l.CreatedAt)
                .AsNoTracking()
                .ToListAsync();

            var userIds = lists.Select(l => l.UserId).Distinct().ToList();
            var userProfiles = await _dbContext.UserProfiles
                .Where(up => userIds.Contains(up.Id.ToString()))
                .AsNoTracking()
                .ToListAsync();

            var profileDict = userProfiles.ToDictionary(
                p => p.Id.ToString(),
                p => new
                {
                    id = p.Id,
                    email = p.Email,
                    display_name = p.DisplayName,
                    avatar_url = p.AvatarUrl
                });

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
                    user_profiles = profileDict.ContainsKey(l.UserId) ? profileDict[l.UserId] : null
                })
                .Cast<object>()
                .ToList();

            return enrichedLists;
        }

        public async Task<object?> GetShoppingListAsync(Guid userId, Guid listId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var list = await _dbContext.ShoppingLists
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (list == null)
            {
                return null;
            }

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
            list.UserId = userId.ToString();
            list.CreatedAt = DateTime.UtcNow;
            list.UpdatedAt = DateTime.UtcNow;
            list.IsCompleted = false;

            _dbContext.ShoppingLists.Add(list);
            await _dbContext.SaveChangesAsync();

            return list;
        }

        public async Task<ShoppingList?> UpdateShoppingListAsync(Guid userId, Guid listId, ShoppingList updated)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var existingList = await _dbContext.ShoppingLists
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (existingList == null)
            {
                return null;
            }

            existingList.Name = updated.Name;
            existingList.Category = updated.Category;
            existingList.IsCompleted = updated.IsCompleted;
            existingList.EstimatedTotal = updated.EstimatedTotal;
            existingList.ActualTotal = updated.ActualTotal;
            existingList.Notes = updated.Notes;
            existingList.UpdatedAt = DateTime.UtcNow;

            if (updated.IsCompleted && !existingList.CompletedDate.HasValue)
            {
                existingList.CompletedDate = DateTime.UtcNow;
            }
            else if (!updated.IsCompleted)
            {
                existingList.CompletedDate = null;
            }

            await _dbContext.SaveChangesAsync();

            return existingList;
        }

        public async Task<bool> DeleteShoppingListAsync(Guid userId, Guid listId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var list = await _dbContext.ShoppingLists
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (list == null)
            {
                return false;
            }

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
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var list = await _dbContext.ShoppingLists
                .AsNoTracking()
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (list == null)
            {
                return Array.Empty<ShoppingListItem>();
            }

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
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var list = await _dbContext.ShoppingLists
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (list == null)
            {
                return null;
            }

            item.Id = Guid.NewGuid();
            item.ShoppingListId = listId;
            item.CreatedAt = DateTime.UtcNow;
            item.IsChecked = false;

            if (item.Quantity <= 0)
            {
                item.Quantity = 1;
            }

            _dbContext.ShoppingListItems.Add(item);

            if (item.EstimatedPrice.HasValue && item.EstimatedPrice.Value > 0)
            {
                list.EstimatedTotal = (list.EstimatedTotal ?? 0) + (item.EstimatedPrice.Value * item.Quantity);
            }

            list.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            return item;
        }

        public async Task<ShoppingListItem?> UpdateShoppingListItemAsync(Guid userId, Guid listId, Guid itemId, ShoppingListItem updated)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var list = await _dbContext.ShoppingLists
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (list == null)
            {
                return null;
            }

            var existingItem = await _dbContext.ShoppingListItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

            if (existingItem == null)
            {
                return null;
            }

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
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var list = await _dbContext.ShoppingLists
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (list == null)
            {
                return null;
            }

            var item = await _dbContext.ShoppingListItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

            if (item == null)
            {
                return null;
            }

            item.IsChecked = !item.IsChecked;
            list.UpdatedAt = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            return item;
        }

        public async Task<bool> DeleteShoppingListItemAsync(Guid userId, Guid listId, Guid itemId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

            var list = await _dbContext.ShoppingLists
                .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

            if (list == null)
            {
                return false;
            }

            var item = await _dbContext.ShoppingListItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

            if (item == null)
            {
                return false;
            }

            if (item.EstimatedPrice.HasValue)
            {
                list.EstimatedTotal = (list.EstimatedTotal ?? 0) - (item.EstimatedPrice.Value * item.Quantity);
            }

            _dbContext.ShoppingListItems.Remove(item);
            list.UpdatedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            return true;
        }

        public async Task<object> GetSummaryAsync(Guid userId)
        {
            var partnerIds = await GetPartnerIdsAsync(userId);
            var allUserIds = new List<string> { userId.ToString() };
            allUserIds.AddRange(partnerIds);

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

        private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
        {
            try
            {
                var partnership = await _dbContext.Partnerships
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p =>
                        (p.User1Id == userId || p.User2Id == userId) &&
                        p.Status == "active");

                if (partnership == null)
                {
                    return new List<string>();
                }

                var partnerId = partnership.User1Id == userId
                    ? partnership.User2Id
                    : partnership.User1Id;

                return new List<string> { partnerId.ToString() };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting partner IDs for user: {UserId}", userId);
                return new List<string>();
            }
        }
    }
}


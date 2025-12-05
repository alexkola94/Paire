using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Controllers
{
    /// <summary>
    /// API controller for managing shopping lists and items
    /// Helps users track shopping needs and budget estimation
    /// Uses Entity Framework Core for data access
    /// </summary>
    [Route("api/[controller]")]
    public class ShoppingListsController : BaseApiController
    {
        private readonly AppDbContext _dbContext;
        private readonly ILogger<ShoppingListsController> _logger;

        public ShoppingListsController(AppDbContext dbContext, ILogger<ShoppingListsController> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        // ==========================================
        // SHOPPING LISTS ENDPOINTS
        // ==========================================

        /// <summary>
        /// Gets all shopping lists for the authenticated user and their partner (if partnership exists)
        /// Includes user profile information to show who created each list
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetShoppingLists()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Get shopping lists from user and partner(s)
                var lists = await _dbContext.ShoppingLists
                    .Where(l => allUserIds.Contains(l.UserId))
                    .OrderByDescending(l => l.CreatedAt)
                    .ToListAsync();

                // Get user profiles for all list creators
                var userIds = lists.Select(l => l.UserId).Distinct().ToList();
                var userProfiles = await _dbContext.UserProfiles
                    .Where(up => userIds.Contains(up.Id.ToString()))
                    .ToListAsync();

                // Create a dictionary for quick lookup
                var profileDict = userProfiles.ToDictionary(
                    p => p.Id.ToString(),
                    p => new
                    {
                        id = p.Id,
                        email = p.Email,
                        display_name = p.DisplayName,
                        avatar_url = p.AvatarUrl
                    }
                );

                // Enrich lists with user profile data
                var enrichedLists = lists.Select(l => new
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
                }).ToList();

                return Ok(enrichedLists);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting shopping lists for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving shopping lists", error = ex.Message });
            }
        }

        /// <summary>
        /// Helper method to get partner user IDs for the current user
        /// </summary>
        /// <param name="userId">Current user ID</param>
        /// <returns>List of partner user IDs as strings</returns>
        private async Task<List<string>> GetPartnerIdsAsync(Guid userId)
        {
            try
            {
                var partnership = await _dbContext.Partnerships
                    .FirstOrDefaultAsync(p =>
                        (p.User1Id == userId || p.User2Id == userId) &&
                        p.Status == "active");

                if (partnership == null)
                {
                    return new List<string>();
                }

                // Return the partner's ID
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

        /// <summary>
        /// Gets a specific shopping list by ID with all its items
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetShoppingList(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == id && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

                // Get all items for this list
                var items = await _dbContext.ShoppingListItems
                    .Where(i => i.ShoppingListId == id)
                    .OrderBy(i => i.IsChecked)
                    .ThenBy(i => i.CreatedAt)
                    .ToListAsync();

                var result = new
                {
                    list = list,
                    items = items,
                    itemCount = items.Count,
                    checkedCount = items.Count(i => i.IsChecked)
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting shopping list {Id}", id);
                return StatusCode(500, new { message = "Error retrieving shopping list", error = ex.Message });
            }
        }

        /// <summary>
        /// Creates a new shopping list
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> CreateShoppingList([FromBody] ShoppingList list)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (string.IsNullOrEmpty(list.Name))
            {
                return BadRequest(new { message = "List name is required" });
            }

            try
            {
                list.Id = Guid.NewGuid();
                list.UserId = userId.ToString();
                list.CreatedAt = DateTime.UtcNow;
                list.UpdatedAt = DateTime.UtcNow;
                list.IsCompleted = false;

                _dbContext.ShoppingLists.Add(list);
                await _dbContext.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetShoppingList),
                    new { id = list.Id },
                    list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating shopping list");
                return StatusCode(500, new { message = "Error creating shopping list", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing shopping list
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateShoppingList(
            Guid id,
            [FromBody] ShoppingList list)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (id != list.Id)
            {
                return BadRequest(new { message = "Shopping list ID mismatch" });
            }

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to update the shopping list
                var existingList = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == id && allUserIds.Contains(l.UserId));

                if (existingList == null)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

                existingList.Name = list.Name;
                existingList.Category = list.Category;
                existingList.IsCompleted = list.IsCompleted;
                existingList.EstimatedTotal = list.EstimatedTotal;
                existingList.ActualTotal = list.ActualTotal;
                existingList.Notes = list.Notes;
                existingList.UpdatedAt = DateTime.UtcNow;

                if (list.IsCompleted && !existingList.CompletedDate.HasValue)
                {
                    existingList.CompletedDate = DateTime.UtcNow;
                }
                else if (!list.IsCompleted)
                {
                    existingList.CompletedDate = null;
                }

                await _dbContext.SaveChangesAsync();

                return Ok(existingList);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating shopping list {Id}", id);
                return StatusCode(500, new { message = "Error updating shopping list", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes a shopping list and all its items
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteShoppingList(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Allow user or partner to delete the shopping list
                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == id && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

                // Delete all items in the list first
                var items = await _dbContext.ShoppingListItems
                    .Where(i => i.ShoppingListId == id)
                    .ToListAsync();

                _dbContext.ShoppingListItems.RemoveRange(items);
                _dbContext.ShoppingLists.Remove(list);
                await _dbContext.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting shopping list {Id}", id);
                return StatusCode(500, new { message = "Error deleting shopping list", error = ex.Message });
            }
        }

        // ==========================================
        // SHOPPING LIST ITEMS ENDPOINTS
        // ==========================================

        /// <summary>
        /// Gets all items for a specific shopping list
        /// </summary>
        [HttpGet("{listId}/items")]
        public async Task<IActionResult> GetShoppingListItems(Guid listId)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Verify list belongs to user or partner
                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found" });
                }

                var items = await _dbContext.ShoppingListItems
                    .Where(i => i.ShoppingListId == listId)
                    .OrderBy(i => i.IsChecked)
                    .ThenBy(i => i.CreatedAt)
                    .ToListAsync();

                return Ok(items);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting items for shopping list {ListId}", listId);
                return StatusCode(500, new { message = "Error retrieving items", error = ex.Message });
            }
        }

        /// <summary>
        /// Adds a new item to a shopping list
        /// </summary>
        [HttpPost("{listId}/items")]
        public async Task<IActionResult> AddShoppingListItem(
            Guid listId,
            [FromBody] ShoppingListItem item)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (string.IsNullOrEmpty(item.Name))
            {
                return BadRequest(new { message = "Item name is required" });
            }

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Verify list belongs to user or partner
                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found" });
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

                // Update list estimated total if item has estimated price
                if (item.EstimatedPrice.HasValue && item.EstimatedPrice.Value > 0)
                {
                    list.EstimatedTotal = (list.EstimatedTotal ?? 0) + (item.EstimatedPrice.Value * item.Quantity);
                }

                list.UpdatedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                return CreatedAtAction(
                    nameof(GetShoppingListItems),
                    new { listId = listId },
                    item);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding item to shopping list {ListId}", listId);
                return StatusCode(500, new { message = "Error adding item", error = ex.Message });
            }
        }

        /// <summary>
        /// Updates a shopping list item
        /// </summary>
        [HttpPut("{listId}/items/{itemId}")]
        public async Task<IActionResult> UpdateShoppingListItem(
            Guid listId,
            Guid itemId,
            [FromBody] ShoppingListItem item)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            if (itemId != item.Id)
            {
                return BadRequest(new { message = "Item ID mismatch" });
            }

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Verify list belongs to user or partner
                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found" });
                }

                var existingItem = await _dbContext.ShoppingListItems
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

                if (existingItem == null)
                {
                    return NotFound(new { message = $"Item {itemId} not found" });
                }

                // Calculate estimated total change
                var oldEstimate = (existingItem.EstimatedPrice ?? 0) * existingItem.Quantity;
                var newEstimate = (item.EstimatedPrice ?? 0) * item.Quantity;

                existingItem.Name = item.Name;
                existingItem.Quantity = item.Quantity;
                existingItem.Unit = item.Unit;
                existingItem.EstimatedPrice = item.EstimatedPrice;
                existingItem.ActualPrice = item.ActualPrice;
                existingItem.IsChecked = item.IsChecked;
                existingItem.Category = item.Category;
                existingItem.Notes = item.Notes;

                // Update list totals
                list.EstimatedTotal = (list.EstimatedTotal ?? 0) - oldEstimate + newEstimate;

                if (item.ActualPrice.HasValue)
                {
                    var actualChange = (item.ActualPrice.Value * item.Quantity);
                    list.ActualTotal = (list.ActualTotal ?? 0) + actualChange;
                }

                list.UpdatedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                return Ok(existingItem);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating item {ItemId}", itemId);
                return StatusCode(500, new { message = "Error updating item", error = ex.Message });
            }
        }

        /// <summary>
        /// Toggles an item's checked status
        /// </summary>
        [HttpPost("{listId}/items/{itemId}/toggle")]
        public async Task<IActionResult> ToggleItemChecked(
            Guid listId,
            Guid itemId)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Verify list belongs to user or partner
                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found" });
                }

                var item = await _dbContext.ShoppingListItems
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

                if (item == null)
                {
                    return NotFound(new { message = $"Item {itemId} not found" });
                }

                item.IsChecked = !item.IsChecked;
                list.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();

                return Ok(item);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling item {ItemId}", itemId);
                return StatusCode(500, new { message = "Error toggling item", error = ex.Message });
            }
        }

        /// <summary>
        /// Deletes an item from a shopping list
        /// </summary>
        [HttpDelete("{listId}/items/{itemId}")]
        public async Task<IActionResult> DeleteShoppingListItem(
            Guid listId,
            Guid itemId)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                // Verify list belongs to user or partner
                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == listId && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found" });
                }

                var item = await _dbContext.ShoppingListItems
                    .FirstOrDefaultAsync(i => i.Id == itemId && i.ShoppingListId == listId);

                if (item == null)
                {
                    return NotFound(new { message = $"Item {itemId} not found" });
                }

                // Update list estimated total
                if (item.EstimatedPrice.HasValue)
                {
                    list.EstimatedTotal = (list.EstimatedTotal ?? 0) - (item.EstimatedPrice.Value * item.Quantity);
                }

                _dbContext.ShoppingListItems.Remove(item);
                list.UpdatedAt = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting item {ItemId}", itemId);
                return StatusCode(500, new { message = "Error deleting item", error = ex.Message });
            }
        }

        /// <summary>
        /// Marks a shopping list as completed
        /// </summary>
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteShoppingList(Guid id)
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var list = await _dbContext.ShoppingLists
                    .FirstOrDefaultAsync(l => l.Id == id && allUserIds.Contains(l.UserId));

                if (list == null)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

                list.IsCompleted = true;
                list.CompletedDate = DateTime.UtcNow;
                list.UpdatedAt = DateTime.UtcNow;

                await _dbContext.SaveChangesAsync();

                return Ok(list);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing shopping list {Id}", id);
                return StatusCode(500, new { message = "Error completing shopping list", error = ex.Message });
            }
        }

        /// <summary>
        /// Get shopping lists summary
        /// </summary>
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var (userId, error) = GetAuthenticatedUser();
            if (error != null) return error;

            try
            {
                // Get partner IDs if partnership exists
                var partnerIds = await GetPartnerIdsAsync(userId);
                var allUserIds = new List<string> { userId.ToString() };
                allUserIds.AddRange(partnerIds);

                var lists = await _dbContext.ShoppingLists
                    .Where(l => allUserIds.Contains(l.UserId))
                    .ToListAsync();

                var activeLists = lists.Where(l => !l.IsCompleted).ToList();
                var completedLists = lists.Where(l => l.IsCompleted).ToList();

                var summary = new
                {
                    totalLists = lists.Count,
                    activeLists = activeLists.Count,
                    completedLists = completedLists.Count,
                    totalEstimated = activeLists.Sum(l => l.EstimatedTotal ?? 0),
                    totalSpent = completedLists.Sum(l => l.ActualTotal ?? 0)
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting shopping lists summary for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving summary", error = ex.Message });
            }
        }
    }
}


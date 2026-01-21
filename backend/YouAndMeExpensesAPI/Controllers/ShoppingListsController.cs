using Microsoft.AspNetCore.Mvc;
using YouAndMeExpensesAPI.Models;
using YouAndMeExpensesAPI.Services;

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
        private readonly IShoppingListsService _shoppingListsService;
        private readonly ILogger<ShoppingListsController> _logger;

        public ShoppingListsController(
            IShoppingListsService shoppingListsService,
            ILogger<ShoppingListsController> logger)
        {
            _shoppingListsService = shoppingListsService;
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
                var lists = await _shoppingListsService.GetShoppingListsAsync(userId);
                return Ok(lists);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting shopping lists for user {UserId}", userId);
                return StatusCode(500, new { message = "Error retrieving shopping lists", error = ex.Message });
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
                var result = await _shoppingListsService.GetShoppingListAsync(userId, id);

                if (result == null)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

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
                var created = await _shoppingListsService.CreateShoppingListAsync(userId, list);

                return CreatedAtAction(
                    nameof(GetShoppingList),
                    new { id = created.Id },
                    created);
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
                var updated = await _shoppingListsService.UpdateShoppingListAsync(userId, id, list);

                if (updated == null)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

                return Ok(updated);
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
                var deleted = await _shoppingListsService.DeleteShoppingListAsync(userId, id);

                if (!deleted)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

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
                var items = await _shoppingListsService.GetShoppingListItemsAsync(userId, listId);

                if (items.Count == 0)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found" });
                }

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
                var created = await _shoppingListsService.AddShoppingListItemAsync(userId, listId, item);

                if (created == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found" });
                }

                return CreatedAtAction(
                    nameof(GetShoppingListItems),
                    new { listId },
                    created);
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
                var updated = await _shoppingListsService.UpdateShoppingListItemAsync(userId, listId, itemId, item);

                if (updated == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found or item {itemId} not found" });
                }

                return Ok(updated);
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
                var item = await _shoppingListsService.ToggleShoppingListItemAsync(userId, listId, itemId);

                if (item == null)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found or item {itemId} not found" });
                }

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
                var deleted = await _shoppingListsService.DeleteShoppingListItemAsync(userId, listId, itemId);

                if (!deleted)
                {
                    return NotFound(new { message = $"Shopping list {listId} not found or item {itemId} not found" });
                }

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
                var updated = await _shoppingListsService.UpdateShoppingListAsync(
                    userId,
                    id,
                    new ShoppingList { Id = id, IsCompleted = true });

                if (updated == null)
                {
                    return NotFound(new { message = $"Shopping list {id} not found" });
                }

                return Ok(updated);
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
                var summary = await _shoppingListsService.GetSummaryAsync(userId);
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


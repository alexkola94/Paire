using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Paire.Modules.Shopping.Core.Entities;
using Paire.Modules.Shopping.Core.Interfaces;
using Paire.Shared.Kernel.Api;

namespace Paire.Modules.Shopping.Api.Controllers;

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

    [HttpGet("{id}")]
    public async Task<IActionResult> GetShoppingList(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var result = await _shoppingListsService.GetShoppingListAsync(userId, id);

            if (result == null)
                return NotFound(new { message = $"Shopping list {id} not found" });

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shopping list {Id}", id);
            return StatusCode(500, new { message = "Error retrieving shopping list", error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateShoppingList([FromBody] ShoppingList list)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        if (string.IsNullOrEmpty(list.Name))
            return BadRequest(new { message = "List name is required" });

        try
        {
            var created = await _shoppingListsService.CreateShoppingListAsync(userId, list);

            _logger.LogInformation(
                "Created shopping list {ListId} for user {UserId}",
                created.Id, userId);

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

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateShoppingList(Guid id, [FromBody] ShoppingList list)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        if (id != list.Id)
            return BadRequest(new { message = "Shopping list ID mismatch" });

        try
        {
            var updated = await _shoppingListsService.UpdateShoppingListAsync(userId, id, list);

            if (updated == null)
                return NotFound(new { message = $"Shopping list {id} not found" });

            _logger.LogInformation(
                "Updated shopping list {ListId} for user {UserId}",
                id, userId);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating shopping list {Id}", id);
            return StatusCode(500, new { message = "Error updating shopping list", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteShoppingList(Guid id)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var deleted = await _shoppingListsService.DeleteShoppingListAsync(userId, id);

            if (!deleted)
                return NotFound(new { message = $"Shopping list {id} not found" });

            _logger.LogInformation(
                "Deleted shopping list {ListId} for user {UserId}",
                id, userId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting shopping list {Id}", id);
            return StatusCode(500, new { message = "Error deleting shopping list", error = ex.Message });
        }
    }

    [HttpGet("{listId}/items")]
    public async Task<IActionResult> GetShoppingListItems(Guid listId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var items = await _shoppingListsService.GetShoppingListItemsAsync(userId, listId);

            if (items.Count == 0)
                return NotFound(new { message = $"Shopping list {listId} not found" });

            return Ok(items);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting items for shopping list {ListId}", listId);
            return StatusCode(500, new { message = "Error retrieving items", error = ex.Message });
        }
    }

    [HttpPost("{listId}/items")]
    public async Task<IActionResult> AddShoppingListItem(Guid listId, [FromBody] ShoppingListItem item)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        if (string.IsNullOrEmpty(item.Name))
            return BadRequest(new { message = "Item name is required" });

        try
        {
            var created = await _shoppingListsService.AddShoppingListItemAsync(userId, listId, item);

            if (created == null)
                return NotFound(new { message = $"Shopping list {listId} not found" });

            _logger.LogInformation(
                "Added item {ItemId} to shopping list {ListId} for user {UserId}",
                created.Id, listId, userId);

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

    [HttpPut("{listId}/items/{itemId}")]
    public async Task<IActionResult> UpdateShoppingListItem(Guid listId, Guid itemId, [FromBody] ShoppingListItem item)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        if (itemId != item.Id)
            return BadRequest(new { message = "Item ID mismatch" });

        try
        {
            var updated = await _shoppingListsService.UpdateShoppingListItemAsync(userId, listId, itemId, item);

            if (updated == null)
                return NotFound(new { message = $"Shopping list {listId} not found or item {itemId} not found" });

            _logger.LogInformation(
                "Updated item {ItemId} in shopping list {ListId} for user {UserId}",
                itemId, listId, userId);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item {ItemId}", itemId);
            return StatusCode(500, new { message = "Error updating item", error = ex.Message });
        }
    }

    [HttpPost("{listId}/items/{itemId}/toggle")]
    public async Task<IActionResult> ToggleItemChecked(Guid listId, Guid itemId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var item = await _shoppingListsService.ToggleShoppingListItemAsync(userId, listId, itemId);

            if (item == null)
                return NotFound(new { message = $"Shopping list {listId} not found or item {itemId} not found" });

            _logger.LogInformation(
                "Toggled item {ItemId} in shopping list {ListId} for user {UserId}. New IsChecked={IsChecked}",
                itemId, listId, userId, item.IsChecked);
            return Ok(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling item {ItemId}", itemId);
            return StatusCode(500, new { message = "Error toggling item", error = ex.Message });
        }
    }

    [HttpDelete("{listId}/items/{itemId}")]
    public async Task<IActionResult> DeleteShoppingListItem(Guid listId, Guid itemId)
    {
        var (userId, error) = GetAuthenticatedUser();
        if (error != null) return error;

        try
        {
            var deleted = await _shoppingListsService.DeleteShoppingListItemAsync(userId, listId, itemId);

            if (!deleted)
                return NotFound(new { message = $"Shopping list {listId} not found or item {itemId} not found" });

            _logger.LogInformation(
                "Deleted item {ItemId} from shopping list {ListId} for user {UserId}",
                itemId, listId, userId);
            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting item {ItemId}", itemId);
            return StatusCode(500, new { message = "Error deleting item", error = ex.Message });
        }
    }

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
                return NotFound(new { message = $"Shopping list {id} not found" });

            _logger.LogInformation(
                "Marked shopping list {ListId} as completed for user {UserId}",
                id, userId);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing shopping list {Id}", id);
            return StatusCode(500, new { message = "Error completing shopping list", error = ex.Message });
        }
    }

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

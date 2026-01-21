using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Domain service contract for managing shopping lists and items.
    /// </summary>
    public interface IShoppingListsService
    {
        Task<IReadOnlyList<object>> GetShoppingListsAsync(Guid userId);
        Task<object?> GetShoppingListAsync(Guid userId, Guid listId);
        Task<ShoppingList> CreateShoppingListAsync(Guid userId, ShoppingList list);
        Task<ShoppingList?> UpdateShoppingListAsync(Guid userId, Guid listId, ShoppingList list);
        Task<bool> DeleteShoppingListAsync(Guid userId, Guid listId);

        Task<IReadOnlyList<ShoppingListItem>> GetShoppingListItemsAsync(Guid userId, Guid listId);
        Task<ShoppingListItem?> AddShoppingListItemAsync(Guid userId, Guid listId, ShoppingListItem item);
        Task<ShoppingListItem?> UpdateShoppingListItemAsync(Guid userId, Guid listId, Guid itemId, ShoppingListItem item);
        Task<ShoppingListItem?> ToggleShoppingListItemAsync(Guid userId, Guid listId, Guid itemId);
        Task<bool> DeleteShoppingListItemAsync(Guid userId, Guid listId, Guid itemId);

        Task<object> GetSummaryAsync(Guid userId);
    }
}


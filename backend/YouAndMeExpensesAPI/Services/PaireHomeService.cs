using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.Models;

namespace YouAndMeExpensesAPI.Services
{
    public class PaireHomeService : IPaireHomeService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<PaireHomeService> _logger;

        private static readonly Dictionary<string, string[]> RoomCategoryMapping = new(StringComparer.OrdinalIgnoreCase)
        {
            ["kitchen"] = ["food", "groceries", "dining", "restaurant", "supermarket"],
            ["living_room"] = ["entertainment", "streaming", "subscriptions"],
            ["bedroom"] = ["housing", "rent", "mortgage"],
            ["office"] = ["education", "work", "office"],
            ["garden"] = ["health", "fitness", "gym", "wellness"],
            ["garage"] = ["transport", "fuel", "gas", "car", "parking"],
            ["bathroom"] = ["utilities", "bills", "water", "electricity"]
        };

        private const int UnlockThreshold = 100;
        private static readonly int[] LevelThresholds = [250, 500, 1000];

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        public PaireHomeService(AppDbContext context, ILogger<PaireHomeService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<PaireHome> GetOrCreateHomeAsync(string userId)
        {
            var home = await _context.PaireHomes
                .FirstOrDefaultAsync(h => h.UserId == userId);

            if (home != null)
                return home;

            home = new PaireHome
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                HomeName = "Love Nest",
                Level = 1,
                TotalPoints = 0,
                UnlockedRooms = JsonSerializer.Serialize(new[] { "kitchen" }, JsonOptions),
                RoomLevels = JsonSerializer.Serialize(new Dictionary<string, int> { ["kitchen"] = 1 }, JsonOptions),
                RoomPoints = JsonSerializer.Serialize(new Dictionary<string, int> { ["kitchen"] = 0 }, JsonOptions),
                Decorations = "{}",
                SeasonalTheme = "default",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.PaireHomes.Add(home);
            await _context.SaveChangesAsync();
            _logger.LogInformation("Created default Paire Home for user {UserId}", userId);
            return home;
        }

        public async Task<PaireHome> ProcessExpenseAsync(string userId, string category, decimal amount)
        {
            var home = await GetOrCreateHomeAsync(userId);
            var room = MapCategoryToRoom(category);
            if (string.IsNullOrEmpty(room))
                room = "living_room";

            var pointsToAdd = (int)Math.Floor(amount);
            if (pointsToAdd <= 0)
                return home;

            var roomPoints = DeserializeRoomPoints(home.RoomPoints);
            var roomLevels = DeserializeRoomLevels(home.RoomLevels);
            var unlockedRooms = DeserializeUnlockedRooms(home.UnlockedRooms);

            var currentPoints = roomPoints.GetValueOrDefault(room, 0);
            var newPoints = currentPoints + pointsToAdd;
            roomPoints[room] = newPoints;

            var currentLevel = roomLevels.GetValueOrDefault(room, 0);
            var newLevel = ComputeLevel(newPoints);
            var wasUnlocked = unlockedRooms.Contains(room);

            if (newPoints >= UnlockThreshold && !wasUnlocked)
            {
                unlockedRooms.Add(room);
                _logger.LogInformation("User {UserId} unlocked room {Room} with {Points} points", userId, room, newPoints);
            }

            if (newLevel > currentLevel)
            {
                roomLevels[room] = newLevel;
                _logger.LogInformation("User {UserId} leveled up room {Room} to level {Level}", userId, room, newLevel);
            }

            // Furniture unlock check
            await CheckAndUnlockFurnitureAsync(userId, room, newPoints);

            home.RoomPoints = JsonSerializer.Serialize(roomPoints, JsonOptions);
            home.RoomLevels = JsonSerializer.Serialize(roomLevels, JsonOptions);
            home.UnlockedRooms = JsonSerializer.Serialize(unlockedRooms, JsonOptions);
            home.TotalPoints += pointsToAdd;
            home.Level = ComputeHomeLevel(unlockedRooms, roomLevels);
            home.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return home;
        }

        private async Task CheckAndUnlockFurnitureAsync(string userId, string room, int roomPoints)
        {
            if (!FurnitureCatalog.RoomFurniture.TryGetValue(room, out var furnitureList))
                return;

            var existingUnlocks = await _context.HomeFurniture
                .Where(f => f.UserId == userId && f.RoomName == room)
                .Select(f => f.FurnitureCode)
                .ToListAsync();

            for (int i = 0; i < furnitureList.Length; i++)
            {
                var code = furnitureList[i];
                var threshold = FurnitureCatalog.GetUnlockPointsThreshold(i);

                if (roomPoints >= threshold && !existingUnlocks.Contains(code))
                {
                    _context.HomeFurniture.Add(new HomeFurniture
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        RoomName = room,
                        FurnitureCode = code,
                        UnlockedAt = DateTime.UtcNow
                    });
                    _logger.LogInformation("User {UserId} unlocked furniture {Furniture} in {Room}", userId, code, room);
                }
            }
        }

        public async Task<object> GetFurnitureAsync(string userId)
        {
            var unlocked = await _context.HomeFurniture
                .Where(f => f.UserId == userId)
                .OrderBy(f => f.RoomName)
                .ThenBy(f => f.UnlockedAt)
                .ToListAsync();

            var home = await GetOrCreateHomeAsync(userId);
            var decorations = DeserializeDecorations(home.Decorations);

            var result = new Dictionary<string, object>();
            foreach (var (room, catalog) in FurnitureCatalog.RoomFurniture)
            {
                var roomUnlocked = unlocked.Where(f => f.RoomName == room).Select(f => f.FurnitureCode).ToList();
                var roomEquipped = decorations.TryGetValue(room, out var equipped) ? equipped : new List<string>();

                result[room] = new
                {
                    catalog = catalog.Select((code, index) => new
                    {
                        code,
                        unlocked = roomUnlocked.Contains(code),
                        equipped = roomEquipped.Contains(code),
                        unlockPoints = FurnitureCatalog.GetUnlockPointsThreshold(index)
                    }),
                    equippedCount = roomEquipped.Count,
                    unlockedCount = roomUnlocked.Count,
                    totalCount = catalog.Length
                };
            }

            return result;
        }

        public async Task<object> EquipFurnitureAsync(string userId, string room, string furnitureCode, bool equip)
        {
            var isOwned = await _context.HomeFurniture
                .AnyAsync(f => f.UserId == userId && f.RoomName == room && f.FurnitureCode == furnitureCode);

            if (!isOwned)
                throw new InvalidOperationException($"Furniture {furnitureCode} is not unlocked");

            var home = await GetOrCreateHomeAsync(userId);
            var decorations = DeserializeDecorations(home.Decorations);

            if (!decorations.ContainsKey(room))
                decorations[room] = new List<string>();

            if (equip && !decorations[room].Contains(furnitureCode))
                decorations[room].Add(furnitureCode);
            else if (!equip)
                decorations[room].Remove(furnitureCode);

            home.Decorations = JsonSerializer.Serialize(decorations, JsonOptions);
            home.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new { room, furnitureCode, equipped = equip, decorations };
        }

        public async Task<PaireHome> SetSeasonalThemeAsync(string userId, string theme)
        {
            var validThemes = new[] { "default", "spring", "summer", "autumn", "winter", "holiday" };
            if (!validThemes.Contains(theme.ToLowerInvariant()))
                throw new ArgumentException($"Invalid theme: {theme}");

            var home = await GetOrCreateHomeAsync(userId);
            home.SeasonalTheme = theme.ToLowerInvariant();
            home.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return home;
        }

        public async Task<object> GetCoupleHomeAsync(string userId)
        {
            var partnership = await _context.Partnerships
                .FirstOrDefaultAsync(p =>
                    (p.User1Id.ToString() == userId || p.User2Id.ToString() == userId) && p.Status == "active");

            if (partnership == null)
                return new { hasPartner = false };

            var partnerId = partnership.User1Id.ToString() == userId
                ? partnership.User2Id.ToString()
                : partnership.User1Id.ToString();

            var myHome = await GetOrCreateHomeAsync(userId);
            var partnerHome = await GetOrCreateHomeAsync(partnerId);

            var myRoomPoints = DeserializeRoomPoints(myHome.RoomPoints);
            var partnerRoomPoints = DeserializeRoomPoints(partnerHome.RoomPoints);

            var combinedPoints = new Dictionary<string, int>();
            foreach (var room in RoomCategoryMapping.Keys)
            {
                combinedPoints[room] = myRoomPoints.GetValueOrDefault(room, 0)
                    + partnerRoomPoints.GetValueOrDefault(room, 0);
            }

            return new
            {
                hasPartner = true,
                combinedLevel = myHome.Level + partnerHome.Level,
                combinedPoints = myHome.TotalPoints + partnerHome.TotalPoints,
                roomPoints = combinedPoints,
                myLevel = myHome.Level,
                partnerLevel = partnerHome.Level,
                seasonalTheme = myHome.SeasonalTheme
            };
        }

        public async Task<object> GetRoomsAsync(string userId)
        {
            var home = await GetOrCreateHomeAsync(userId);
            var roomPoints = DeserializeRoomPoints(home.RoomPoints);
            var roomLevels = DeserializeRoomLevels(home.RoomLevels);
            var unlockedRooms = DeserializeUnlockedRooms(home.UnlockedRooms);

            var rooms = new List<object>();
            foreach (var (roomKey, categories) in RoomCategoryMapping)
            {
                var points = roomPoints.GetValueOrDefault(roomKey, 0);
                var level = roomLevels.GetValueOrDefault(roomKey, 0);
                var isUnlocked = roomKey == "kitchen" || unlockedRooms.Contains(roomKey);
                if (isUnlocked && level == 0)
                    level = 1;

                var pointsToNextLevel = GetPointsToNextLevel(points, level);

                rooms.Add(new
                {
                    name = roomKey,
                    category = string.Join(", ", categories),
                    level,
                    points,
                    isUnlocked,
                    pointsToNextLevel
                });
            }

            return rooms;
        }

        public async Task<PaireHome> UpgradeRoomAsync(string userId, string room)
        {
            var home = await GetOrCreateHomeAsync(userId);
            var roomKey = room.ToLowerInvariant();
            if (!RoomCategoryMapping.ContainsKey(roomKey))
            {
                _logger.LogWarning("Invalid room {Room} for upgrade by user {UserId}", room, userId);
                throw new ArgumentException($"Invalid room: {room}");
            }

            var roomPoints = DeserializeRoomPoints(home.RoomPoints);
            var roomLevels = DeserializeRoomLevels(home.RoomLevels);
            var unlockedRooms = DeserializeUnlockedRooms(home.UnlockedRooms);

            var points = roomPoints.GetValueOrDefault(roomKey, 0);
            var currentLevel = roomLevels.GetValueOrDefault(roomKey, 0);
            var isUnlocked = roomKey == "kitchen" || unlockedRooms.Contains(roomKey);

            if (!isUnlocked && points < UnlockThreshold)
                throw new InvalidOperationException($"Room {room} needs {UnlockThreshold} points to unlock");

            var newLevel = ComputeLevel(points);
            if (newLevel <= currentLevel)
                throw new InvalidOperationException($"Room {room} does not have enough points for next level");

            roomLevels[roomKey] = newLevel;
            if (!unlockedRooms.Contains(roomKey))
                unlockedRooms.Add(roomKey);

            home.RoomLevels = JsonSerializer.Serialize(roomLevels, JsonOptions);
            home.UnlockedRooms = JsonSerializer.Serialize(unlockedRooms, JsonOptions);
            home.Level = ComputeHomeLevel(unlockedRooms, roomLevels);
            home.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("User {UserId} manually upgraded room {Room} to level {Level}", userId, roomKey, newLevel);
            return home;
        }

        private static string? MapCategoryToRoom(string category)
        {
            var normalized = category?.Trim().ToLowerInvariant() ?? "";
            foreach (var (room, categories) in RoomCategoryMapping)
            {
                if (categories.Any(c => c.Equals(normalized, StringComparison.OrdinalIgnoreCase)))
                    return room;
            }
            return null;
        }

        private static int ComputeLevel(int points)
        {
            if (points < UnlockThreshold)
                return 0;
            var level = 1;
            foreach (var threshold in LevelThresholds)
            {
                if (points >= threshold)
                    level++;
                else
                    break;
            }
            return level;
        }

        private static int ComputeHomeLevel(List<string> unlockedRooms, Dictionary<string, int> roomLevels)
        {
            var totalLevel = 0;
            foreach (var room in unlockedRooms)
            {
                totalLevel += roomLevels.GetValueOrDefault(room, 1);
            }
            return Math.Max(1, totalLevel);
        }

        private static int? GetPointsToNextLevel(int points, int level)
        {
            if (level >= 4)
                return null;
            if (level == 0)
                return UnlockThreshold - points;
            var nextThreshold = LevelThresholds[level - 1];
            return nextThreshold - points;
        }

        private static Dictionary<string, int> DeserializeRoomPoints(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new Dictionary<string, int>();
            }
            catch
            {
                return new Dictionary<string, int>();
            }
        }

        private static Dictionary<string, int> DeserializeRoomLevels(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new Dictionary<string, int>();
            }
            catch
            {
                return new Dictionary<string, int>();
            }
        }

        private static List<string> DeserializeUnlockedRooms(string json)
        {
            try
            {
                var list = JsonSerializer.Deserialize<List<string>>(json);
                return list ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }

        private static Dictionary<string, List<string>> DeserializeDecorations(string json)
        {
            try
            {
                return JsonSerializer.Deserialize<Dictionary<string, List<string>>>(json) ?? new Dictionary<string, List<string>>();
            }
            catch
            {
                return new Dictionary<string, List<string>>();
            }
        }
    }
}

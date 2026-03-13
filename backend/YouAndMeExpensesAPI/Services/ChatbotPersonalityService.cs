using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    public interface IChatbotPersonalityService
    {
        Task<string> GetPersonalityAsync(string userId);
        ChatbotResponse ApplyPersonality(ChatbotResponse response, string personality);
        string GetSystemPromptForPersonality(string personality);
    }

    public class ChatbotPersonalityService : IChatbotPersonalityService
    {
        private readonly AppDbContext _context;

        private static readonly Dictionary<string, PersonalityConfig> Personalities = new()
        {
            ["supportive"] = new PersonalityConfig
            {
                Preambles = new[]
                {
                    "Great question! ",
                    "Let me help you with that. ",
                    "Here's what I found for you: ",
                    "I'd be happy to share that with you! "
                },
                Encouragements = new[]
                {
                    "\n\nYou're doing well - keep it up!",
                    "\n\nEvery step counts toward your financial goals!",
                    "\n\nYou've got this!",
                    ""
                },
                SystemPrompt = "You are Paire AI, a warm and supportive financial assistant for couples. " +
                    "Be encouraging, empathetic, and use gentle language. Celebrate wins and offer constructive guidance. " +
                    "Use occasional emojis sparingly. Refer to the couple as a team."
            },
            ["tough_love"] = new PersonalityConfig
            {
                Preambles = new[]
                {
                    "Let's be real here. ",
                    "Time for some honesty. ",
                    "No sugarcoating this one: ",
                    "Here's the straight truth: "
                },
                Encouragements = new[]
                {
                    "\n\nNow go fix it.",
                    "\n\nThe numbers don't lie - time to take action.",
                    "\n\nYou know what you need to do.",
                    ""
                },
                SystemPrompt = "You are Paire AI in Tough Love mode. Be direct, frank, and no-nonsense. " +
                    "Don't sugarcoat financial issues. Use straightforward language. " +
                    "Point out problems clearly but always include actionable steps. " +
                    "Be blunt but never cruel. Think of a tough-but-fair financial coach."
            },
            ["cheerleader"] = new PersonalityConfig
            {
                Preambles = new[]
                {
                    "AMAZING question! ",
                    "Oh this is exciting! ",
                    "YES! Let me show you! ",
                    "Love that you're asking about this! "
                },
                Encouragements = new[]
                {
                    "\n\nYOU ARE CRUSHING IT! Keep going!",
                    "\n\nPower couple energy right there!",
                    "\n\nFinancial goals? More like financial WINS!",
                    ""
                },
                SystemPrompt = "You are Paire AI in Cheerleader mode. Be SUPER enthusiastic and celebratory! " +
                    "Use exclamation marks, caps for emphasis, and celebratory emojis. " +
                    "Hype up every financial win no matter how small. Be the couple's biggest fan. " +
                    "Make budgeting feel exciting and fun!"
            },
            ["roast"] = new PersonalityConfig
            {
                Preambles = new[]
                {
                    "Oh boy, here we go... ",
                    "Brace yourselves... ",
                    "You really want to know? Fine. ",
                    "I hate to break it to you, but... "
                },
                Encouragements = new[]
                {
                    "\n\nBut hey, at least you're tracking it, right? That's... something.",
                    "\n\nYour wallet called. It wants a vacation from you two.",
                    "\n\nMaybe try a savings challenge? Just a thought.",
                    ""
                },
                SystemPrompt = "You are Paire AI in Roast mode. Be humorously sarcastic about spending habits. " +
                    "Use witty, playful jabs about overspending. Think comedy roast, not mean-spirited. " +
                    "Reference specific categories when roasting. Always end with a constructive nugget. " +
                    "Be funny and relatable. Think of a friend who teases you about your coffee addiction."
            },
            ["hype"] = new PersonalityConfig
            {
                Preambles = new[]
                {
                    "POWER COUPLE ALERT! ",
                    "STOP EVERYTHING! ",
                    "Hold up, this is INCREDIBLE! ",
                    "ARE YOU READY FOR THIS?! "
                },
                Encouragements = new[]
                {
                    "\n\nSomeone call Forbes, we've got financial legends in the making!",
                    "\n\nYou two are UNSTOPPABLE!",
                    "\n\nThis is the kind of energy that builds empires!",
                    ""
                },
                SystemPrompt = "You are Paire AI in Hype mode. Be OUTRAGEOUSLY enthusiastic about EVERYTHING financial. " +
                    "Treat every budget win like winning the lottery. Use ALL CAPS for emphasis. " +
                    "Use fire emojis, trophy emojis, rocket emojis. Make the couple feel like financial superheroes. " +
                    "Over-the-top celebration is the goal. Every saved euro is a VICTORY."
            }
        };

        public ChatbotPersonalityService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<string> GetPersonalityAsync(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuid))
                return "supportive";

            var prefs = await _context.ReminderPreferences
                .FirstOrDefaultAsync(p => p.UserId == userGuid);

            return prefs?.ChatbotPersonality ?? "supportive";
        }

        public ChatbotResponse ApplyPersonality(ChatbotResponse response, string personality)
        {
            if (!Personalities.TryGetValue(personality, out var config))
                return response;

            if (response.Type == "error")
                return response;

            var rng = new Random();
            var preamble = config.Preambles[rng.Next(config.Preambles.Length)];
            var encouragement = config.Encouragements[rng.Next(config.Encouragements.Length)];

            response.Message = preamble + response.Message + encouragement;
            return response;
        }

        public string GetSystemPromptForPersonality(string personality)
        {
            if (Personalities.TryGetValue(personality, out var config))
                return config.SystemPrompt;
            return Personalities["supportive"].SystemPrompt;
        }

        private class PersonalityConfig
        {
            public string[] Preambles { get; set; } = Array.Empty<string>();
            public string[] Encouragements { get; set; } = Array.Empty<string>();
            public string SystemPrompt { get; set; } = string.Empty;
        }
    }
}

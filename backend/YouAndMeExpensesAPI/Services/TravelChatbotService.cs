using YouAndMeExpensesAPI.DTOs;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Rule-based travel chatbot service for trip planning and travel tips.
    /// Uses pattern matching to detect travel intents and return helpful responses.
    /// </summary>
    public class TravelChatbotService : ITravelChatbotService
    {
        private readonly ILogger<TravelChatbotService> _logger;

        // Travel intent patterns (case-insensitive)
        private static readonly Dictionary<string, List<string>> TravelPatterns = new()
        {
            ["packing"] = new()
            {
                "packing", "what to bring", "what to pack", "packing list", "luggage",
                "essentials", "checklist", "τι να πάρω", "πακέτο", "αποσκευές",
                "qué llevar", "lista de equipaje", "quoi emporter", "liste de voyage"
            },
            ["best_time"] = new()
            {
                "best time", "when to visit", "when to go", "season", "weather",
                "καλύτερη εποχή", "πότε να πάω", "πού να πάω",
                "mejor época", "cuándo visitar", "meilleure période", "quand partir"
            },
            ["weather"] = new()
            {
                "weather", "temperature", "rain", "climate", "forecast",
                "καιρός", "θερμοκρασία", "clima", "temperatura", "météo"
            },
            ["customs"] = new()
            {
                "customs", "etiquette", "local", "culture", "phrases", "language",
                "έθιμα", "τρόποι", "costumbres", "etiqueta", "coutumes", "phrases"
            },
            ["budget"] = new()
            {
                "budget", "cost", "expensive", "cheap", "money", "currency", "price",
                "trip budget", "expenses for my trip", "cost of my trip", "how much for my trip",
                "προϋπολογισμός", "κόστος", "presupuesto", "moneda", "budget voyage",
                "έξοδα ταξιδιού", "κόστος ταξιδιού"
            },
            ["visa_documents"] = new()
            {
                "visa", "passport", "documents", "entry", "requirements", "safety",
                "βίζα", "διαβατήριο", "visado", "pasaporte", "documents voyage"
            },
            ["itinerary"] = new()
            {
                "itinerary", "things to do", "recommendations", "sights", "attractions",
                "day trip", "plan", "δρομολόγιο", "αξιοθέατα", "itinerario", "recomendaciones"
            },
            ["help"] = new()
            {
                "help", "what can you do", "options", "βοήθεια", "ayuda", "aide"
            }
        };

        public TravelChatbotService(ILogger<TravelChatbotService> logger)
        {
            _logger = logger;
        }

        /// <inheritdoc />
        public Task<ChatbotResponse> ProcessQueryAsync(string userId, string query, List<ChatMessage>? history = null, string language = "en", TripContext? tripContext = null)
        {
            var normalized = (query ?? "").Trim();
            if (string.IsNullOrEmpty(normalized))
            {
                return Task.FromResult(GetUnknownResponse(null, language));
            }

            _logger.LogInformation("Travel chatbot query for user {UserId}: {Query} (Language: {Language}, Trip: {Destination})", userId, normalized, language, tripContext?.Destination ?? "none");

            var intent = DetectIntent(normalized);
            var response = intent switch
            {
                "packing" => GetPackingResponse(language),
                "best_time" => GetBestTimeResponse(language),
                "weather" => GetWeatherResponse(language),
                "customs" => GetCustomsResponse(language),
                "budget" => GetBudgetResponse(language),
                "visa_documents" => GetVisaDocumentsResponse(language),
                "itinerary" => GetItineraryResponse(language),
                "help" => GetHelpResponse(language),
                _ => GetUnknownResponse(normalized, language)
            };

            // Personalize response with trip context when available
            if (tripContext != null && !string.IsNullOrWhiteSpace(tripContext.Destination))
            {
                var prefix = BuildTripContextPrefix(tripContext, language);
                response = new ChatbotResponse
                {
                    Message = prefix + response.Message,
                    Type = response.Type,
                    Data = response.Data,
                    QuickActions = response.QuickActions,
                    ActionLink = response.ActionLink
                };
            }

            return Task.FromResult(response);
        }

        /// <summary>
        /// Build a short prefix for responses when user has an active trip (e.g. "For your trip to **Paris** (Dec 1–10):\n\n").
        /// When CityNames are present, includes "Cities: X, Y, Z" in the prefix.
        /// </summary>
        private static string BuildTripContextPrefix(TripContext ctx, string language)
        {
            var dest = ctx.Destination?.Trim() ?? "";
            if (string.IsNullOrEmpty(dest)) return "";

            var hasDates = !string.IsNullOrWhiteSpace(ctx.StartDate) && !string.IsNullOrWhiteSpace(ctx.EndDate);
            var hasBudget = ctx.Budget.HasValue && ctx.Budget.Value > 0;
            var citiesPart = ctx.CityNames != null && ctx.CityNames.Count > 0
                ? " " + (language == "el" ? "Πόλεις: " : "Cities: ") + string.Join(", ", ctx.CityNames) + "."
                : "";

            if (language == "el")
            {
                if (hasDates && hasBudget)
                    return $"Για το ταξίδι σας στο **{dest}**{citiesPart} ({ctx.StartDate}–{ctx.EndDate}, προϋπολογισμός: €{ctx.Budget:N0}):\n\n";
                if (hasDates)
                    return $"Για το ταξίδι σας στο **{dest}**{citiesPart} ({ctx.StartDate}–{ctx.EndDate}):\n\n";
                if (hasBudget)
                    return $"Για το ταξίδι σας στο **{dest}**{citiesPart} (προϋπολογισμός: €{ctx.Budget:N0}):\n\n";
                return $"Για το ταξίδι σας στο **{dest}**{citiesPart}:\n\n";
            }

            if (hasDates && hasBudget)
                return $"For your trip to **{dest}**{citiesPart} ({ctx.StartDate}–{ctx.EndDate}, budget: €{ctx.Budget:N0}):\n\n";
            if (hasDates)
                return $"For your trip to **{dest}**{citiesPart} ({ctx.StartDate}–{ctx.EndDate}):\n\n";
            if (hasBudget)
                return $"For your trip to **{dest}**{citiesPart} (budget: €{ctx.Budget:N0}):\n\n";
            return $"For your trip to **{dest}**{citiesPart}:\n\n";
        }

        /// <inheritdoc />
        public Task<List<string>> GetSuggestedQuestionsAsync(string userId, string language = "en")
        {
            var suggestions = GetSuggestionsForLanguage(language);
            return Task.FromResult(suggestions);
        }

        private static string DetectIntent(string query)
        {
            var lower = query.ToLowerInvariant();
            foreach (var (intent, keywords) in TravelPatterns)
            {
                if (keywords.Any(k => lower.Contains(k)))
                    return intent;
            }
            return "unknown";
        }

        private static ChatbotResponse GetPackingResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse
                {
                    Message = "🧳 **Λίστα συσκευασίας:**\n\n• Έγγραφα (διαβατήριο, βίζα, ασφάλιση)\n• Ρούχα ανά εποχή και ένα ζευγάρι άνετα παπούτσια\n• Φάρμακα και βασικά πρώτα βοήθειας\n• Φορητή φόρτιση και adapter\n• Αντίγραφα εγγράφων στο cloud\n\nΧρησιμοποιήστε τη σελίδα **Packing** για να δείτε και να τσεκάρετε τα αντικείμενα του ταξιδιού σας.",
                    Type = "insight",
                    QuickActions = new List<string> { "Άνοιγμα λίστας packing", "Τι να πάρω για 1 εβδομάδα;" },
                    ActionLink = "/travel?page=packing"
                };
            if (language == "es")
                return new ChatbotResponse
                {
                    Message = "🧳 **Lista de equipaje:**\n\n• Documentos (pasaporte, visado, seguro)\n• Ropa según temporada y calzado cómodo\n• Medicamentos y botiquín básico\n• Cargador y adaptador\n• Copias de documentos en la nube\n\nUse la página **Packing** para ver y marcar los elementos de su viaje.",
                    Type = "insight",
                    QuickActions = new List<string> { "Abrir lista de packing", "¿Qué llevar para 1 semana?" },
                    ActionLink = "/travel?page=packing"
                };
            if (language == "fr")
                return new ChatbotResponse
                {
                    Message = "🧳 **Liste de voyage :**\n\n• Documents (passeport, visa, assurance)\n• Vêtements selon la saison et chaussures confortables\n• Médicaments et trousse de premiers secours\n• Chargeur et adaptateur\n• Copies des documents dans le cloud\n\nUtilisez la page **Packing** pour voir et cocher les articles de votre voyage.",
                    Type = "insight",
                    QuickActions = new List<string> { "Ouvrir la liste packing", "Quoi emporter pour 1 semaine ?" },
                    ActionLink = "/travel?page=packing"
                };
            return new ChatbotResponse
            {
                Message = "🧳 **Packing essentials:**\n\n• Documents (passport, visa, insurance)\n• Clothes for the season and comfortable shoes\n• Medications and basic first aid\n• Portable charger and adapter\n• Cloud copies of important documents\n\nUse the **Packing** page to view and check off your trip items.",
                Type = "insight",
                QuickActions = new List<string> { "Open packing list", "What to pack for 1 week?" },
                ActionLink = "/travel?page=packing"
            };
        }

        private static ChatbotResponse GetBestTimeResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse
                {
                    Message = "📅 Η **καλύτερη εποχή** εξαρτάται από τον προορισμό και τι θέλετε να κάνετε (να αράξετε, να εξερευνήσετε, σκι). Ρωτήστε με για συγκεκριμένη χώρα ή πόλη και θα σας δώσω συμβουλές. Μπορείτε επίσης να δείτε τον **καιρό** στην σελίδα Explore.",
                    Type = "text",
                    QuickActions = new List<string> { "Καιρός τώρα", "Πότε να πάω στην Ιταλία;" }
                };
            if (language == "es")
                return new ChatbotResponse
                {
                    Message = "📅 La **mejor época** depende del destino y de lo que quieras hacer (playa, explorar, esquí). Pregúntame por un país o ciudad concreta y te doy consejos. También puedes ver el **tiempo** en la página Explore.",
                    Type = "text",
                    QuickActions = new List<string> { "Tiempo ahora", "¿Cuándo visitar Italia?" }
                };
            if (language == "fr")
                return new ChatbotResponse
                {
                    Message = "📅 La **meilleure période** dépend de la destination et de ce que vous voulez faire (plage, exploration, ski). Demandez-moi un pays ou une ville précise et je vous conseillerai. Vous pouvez aussi voir la **météo** sur la page Explore.",
                    Type = "text",
                    QuickActions = new List<string> { "Météo maintenant", "Quand partir en Italie ?" }
                };
            return new ChatbotResponse
            {
                Message = "📅 **Best time to visit** depends on your destination and what you want to do (beach, explore, ski). Ask me for a specific country or city and I’ll give you tips. You can also check **weather** on the Explore page.",
                Type = "text",
                QuickActions = new List<string> { "Weather now", "When to visit Italy?" }
            };
        }

        private static ChatbotResponse GetWeatherResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse { Message = "🌤️ Για τρέχοντα καιρό και πρόγνωση, χρησιμοποιήστε την σελίδα **Explore** — εμφανίζει τον καιρό για τον προορισμό του ταξιδιού σας.", Type = "text", ActionLink = "/travel?page=explore" };
            if (language == "es")
                return new ChatbotResponse { Message = "🌤️ Para tiempo actual y pronóstico, use la página **Explore** — muestra el tiempo para el destino de su viaje.", Type = "text", ActionLink = "/travel?page=explore" };
            if (language == "fr")
                return new ChatbotResponse { Message = "🌤️ Pour la météo actuelle et les prévisions, utilisez la page **Explore** — elle affiche la météo pour la destination de votre voyage.", Type = "text", ActionLink = "/travel?page=explore" };
            return new ChatbotResponse { Message = "🌤️ For current weather and forecast, use the **Explore** page — it shows weather for your trip destination.", Type = "text", ActionLink = "/travel?page=explore" };
        }

        private static ChatbotResponse GetCustomsResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse { Message = "🌍 Για **έθιμα και τρόπους** ρωτήστε με για συγκεκριμένη χώρα. Μπορείτε να δείτε χρήσιμες **φράσεις** και πληροφορίες έκτακτης ανάγκης στην σελίδα Explore.", Type = "text", ActionLink = "/travel?page=explore" };
            if (language == "es")
                return new ChatbotResponse { Message = "🌍 Para **costumbres y etiqueta** pregúntame por un país concreto. Puede ver **frases** útiles e información de emergencia en la página Explore.", Type = "text", ActionLink = "/travel?page=explore" };
            if (language == "fr")
                return new ChatbotResponse { Message = "🌍 Pour les **coutumes et l’étiquette**, demandez-moi un pays précis. Vous pouvez voir des **phrases** utiles et les urgences sur la page Explore.", Type = "text", ActionLink = "/travel?page=explore" };
            return new ChatbotResponse { Message = "🌍 For **local customs and etiquette** ask me for a specific country. You can find useful **phrases** and emergency info on the Explore page.", Type = "text", ActionLink = "/travel?page=explore" };
        }

        private static ChatbotResponse GetBudgetResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse
                {
                    Message = "💰 Για **προϋπολογισμό ταξιδιού** και παρακολούθηση εξόδων χρησιμοποιήστε την σελίδα **Budget**. Μπορείτε να ορίσετε κατηγορίες και να δείτε πόσο έχετε ξοδέψει.",
                    Type = "insight",
                    QuickActions = new List<string> { "Άνοιγμα Budget", "Πόσα χρήματα να πάρω;" },
                    ActionLink = "/travel?page=budget"
                };
            if (language == "es")
                return new ChatbotResponse
                {
                    Message = "💰 Para **presupuesto de viaje** y seguimiento de gastos use la página **Budget**. Puede definir categorías y ver cuánto ha gastado.",
                    Type = "insight",
                    QuickActions = new List<string> { "Abrir Budget", "¿Cuánto dinero llevar?" },
                    ActionLink = "/travel?page=budget"
                };
            if (language == "fr")
                return new ChatbotResponse
                {
                    Message = "💰 Pour le **budget voyage** et le suivi des dépenses, utilisez la page **Budget**. Vous pouvez définir des catégories et voir combien vous avez dépensé.",
                    Type = "insight",
                    QuickActions = new List<string> { "Ouvrir Budget", "Combien d'argent emporter ?" },
                    ActionLink = "/travel?page=budget"
                };
            return new ChatbotResponse
            {
                Message = "💰 For **trip budget** and expense tracking use the **Budget** page. You can set categories and see how much you've spent.",
                Type = "insight",
                QuickActions = new List<string> { "Open Budget", "How much money to bring?" },
                ActionLink = "/travel?page=budget"
            };
        }

        private static ChatbotResponse GetVisaDocumentsResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse { Message = "📄 Για **βίζα και έγγραφα** ελέγξτε πάντα τις επίσημες απαιτήσεις της χώρας προέλευσης και του προορισμού. Αποθηκεύστε αντίγραφα εγγράφων στην σελίδα **Documents** και ρωτήστε με για συγκεκριμένη χώρα αν χρειάζεστε γενικές συμβουλές.", Type = "text", ActionLink = "/travel?page=documents" };
            if (language == "es")
                return new ChatbotResponse { Message = "📄 Para **visado y documentos** compruebe siempre los requisitos oficiales del país de origen y del destino. Guarde copias en la página **Documents** y pregúnteme por un país concreto si necesita consejos generales.", Type = "text", ActionLink = "/travel?page=documents" };
            if (language == "fr")
                return new ChatbotResponse { Message = "📄 Pour **visa et documents** vérifiez toujours les exigences officielles du pays d’origine et de destination. Stockez des copies sur la page **Documents** et demandez-moi un pays précis pour des conseils généraux.", Type = "text", ActionLink = "/travel?page=documents" };
            return new ChatbotResponse { Message = "📄 For **visa and documents** always check official requirements for your origin and destination. Store document copies on the **Documents** page and ask me for a specific country if you need general tips.", Type = "text", ActionLink = "/travel?page=documents" };
        }

        private static ChatbotResponse GetItineraryResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse
                {
                    Message = "📋 Δημιουργήστε και επεξεργαστείτε το **δρομολόγιό** σας στην σελίδα **Itinerary**. Μπορείτε να προσθέσετε γεγονότα ανά ημέρα και να δείτε πληροφορίες για αξιοθέατα στην Explore.",
                    Type = "text",
                    QuickActions = new List<string> { "Άνοιγμα Itinerary", "Ιδέες για αξιοθέατα" },
                    ActionLink = "/travel?page=itinerary"
                };
            if (language == "es")
                return new ChatbotResponse
                {
                    Message = "📋 Cree y edite su **itinerario** en la página **Itinerary**. Puede añadir eventos por día y ver información de atracciones en Explore.",
                    Type = "text",
                    QuickActions = new List<string> { "Abrir Itinerary", "Ideas de atracciones" },
                    ActionLink = "/travel?page=itinerary"
                };
            if (language == "fr")
                return new ChatbotResponse
                {
                    Message = "📋 Créez et modifiez votre **itinéraire** sur la page **Itinerary**. Vous pouvez ajouter des événements par jour et voir les infos des lieux sur Explore.",
                    Type = "text",
                    QuickActions = new List<string> { "Ouvrir Itinerary", "Idées d'attractions" },
                    ActionLink = "/travel?page=itinerary"
                };
            return new ChatbotResponse
            {
                Message = "📋 Create and edit your **itinerary** on the **Itinerary** page. You can add events per day and see attraction info on Explore.",
                Type = "text",
                QuickActions = new List<string> { "Open Itinerary", "Ideas for things to do" },
                ActionLink = "/travel?page=itinerary"
            };
        }

        private static ChatbotResponse GetHelpResponse(string language)
        {
            if (language == "el")
                return new ChatbotResponse
                {
                    Message = "🧭 Είμαι ο **Travel Guide** σας. Μπορώ να βοηθήσω με:\n\n• 🧳 Συσκευασία / λίστα packing\n• 📅 Καλύτερη εποχή / καιρός\n• 🌍 Έθιμα και φράσεις\n• 💰 Προϋπολογισμός ταξιδιού\n• 📄 Βίζα και έγγραφα\n• 📋 Δρομολόγιο και αξιοθέατα\n\nΡωτήστε με οτιδήποτε για το ταξίδι σας ή επιλέξτε μια πρόταση παρακάτω.",
                    Type = "text",
                    QuickActions = new List<string> { "Τι να πάρω;", "Καλύτερη εποχή", "Προϋπολογισμός" }
                };
            if (language == "es")
                return new ChatbotResponse
                {
                    Message = "🧭 Soy tu **Travel Guide**. Puedo ayudarte con:\n\n• 🧳 Equipaje / lista de packing\n• 📅 Mejor época / tiempo\n• 🌍 Costumbres y frases\n• 💰 Presupuesto del viaje\n• 📄 Visado y documentos\n• 📋 Itinerario y atracciones\n\nPregúntame lo que quieras sobre tu viaje o elige una sugerencia abajo.",
                    Type = "text",
                    QuickActions = new List<string> { "¿Qué llevar?", "Mejor época", "Presupuesto" }
                };
            if (language == "fr")
                return new ChatbotResponse
                {
                    Message = "🧭 Je suis votre **Travel Guide**. Je peux vous aider pour :\n\n• 🧳 Bagages / liste de voyage\n• 📅 Meilleure période / météo\n• 🌍 Coutumes et phrases\n• 💰 Budget voyage\n• 📄 Visa et documents\n• 📋 Itinéraire et attractions\n\nPosez-moi vos questions sur votre voyage ou choisissez une suggestion ci-dessous.",
                    Type = "text",
                    QuickActions = new List<string> { "Quoi emporter ?", "Meilleure période", "Budget" }
                };
            return new ChatbotResponse
            {
                Message = "🧭 I'm your **Travel Guide**. I can help with:\n\n• 🧳 Packing / what to bring\n• 📅 Best time to visit / weather\n• 🌍 Local customs and phrases\n• 💰 Trip budget\n• 📄 Visa and documents\n• 📋 Itinerary and things to do\n\nAsk me anything about your trip or pick a suggestion below.",
                Type = "text",
                QuickActions = new List<string> { "What to pack?", "Best time to visit", "Trip budget" }
            };
        }

        private static ChatbotResponse GetUnknownResponse(string? query, string language)
        {
            if (language == "el")
                return new ChatbotResponse
                {
                    Message = "🤔 Δεν είμαι σίγουρος τι ψάχνετε. Δοκιμάστε: \"Τι να πάρω;\", \"Καλύτερη εποχή για ταξίδι\", \"Προϋπολογισμός ταξιδιού\" ή ενεργοποιήστε τη λειτουργία **AI** για πιο ελεύθερη συνομιλία.",
                    Type = "text",
                    QuickActions = new List<string> { "Βοήθεια", "Τι να πάρω;", "Προϋπολογισμός" }
                };
            if (language == "es")
                return new ChatbotResponse
                {
                    Message = "🤔 No estoy seguro de qué busca. Pruebe: \"¿Qué llevar?\", \"Mejor época para viajar\", \"Presupuesto del viaje\" o active el modo **AI** para una conversación más libre.",
                    Type = "text",
                    QuickActions = new List<string> { "Ayuda", "¿Qué llevar?", "Presupuesto" }
                };
            if (language == "fr")
                return new ChatbotResponse
                {
                    Message = "🤔 Je ne suis pas sûr de ce que vous cherchez. Essayez : \"Quoi emporter ?\", \"Meilleure période pour voyager\", \"Budget voyage\" ou activez le mode **AI** pour une conversation plus libre.",
                    Type = "text",
                    QuickActions = new List<string> { "Aide", "Quoi emporter ?", "Budget" }
                };
            return new ChatbotResponse
            {
                Message = "🤔 I'm not sure what you're looking for. Try: \"What to pack?\", \"Best time to visit\", \"Trip budget\" or turn on **AI** mode for a more open conversation.",
                Type = "text",
                QuickActions = new List<string> { "Help", "What to pack?", "Trip budget" }
            };
        }

        private static List<string> GetSuggestionsForLanguage(string language)
        {
            return language switch
            {
                "el" => new List<string>
                {
                    "Τι να πάρω στο ταξίδι μου;",
                    "Ποια είναι η καλύτερη εποχή για να πάω;",
                    "Συμβουλές για προϋπολογισμό ταξιδιού",
                    "Τοπικά έθιμα και φράσεις",
                    "Βίζα και έγγραφα που χρειάζομαι;",
                    "Ιδέες για αξιοθέατα"
                },
                "es" => new List<string>
                {
                    "¿Qué debo llevar en mi viaje?",
                    "¿Cuál es la mejor época para visitar?",
                    "Consejos de presupuesto para viajes",
                    "Costumbres y frases locales",
                    "¿Qué visa y documentos necesito?",
                    "Ideas de cosas que hacer"
                },
                "fr" => new List<string>
                {
                    "Quoi emporter pour mon voyage ?",
                    "Quelle est la meilleure période pour partir ?",
                    "Conseils budget voyage",
                    "Coutumes et phrases locales",
                    "Quels documents et visa ?",
                    "Idées de choses à faire"
                },
                _ => new List<string>
                {
                    "What should I pack for my trip?",
                    "What's the best time to visit?",
                    "Trip budget tips",
                    "Local customs and phrases",
                    "What visa and documents do I need?",
                    "Ideas for things to do"
                }
            };
        }
    }
}

using Microsoft.EntityFrameworkCore;
using YouAndMeExpensesAPI.Data;
using YouAndMeExpensesAPI.DTOs;
using YouAndMeExpensesAPI.Models;
using System.Text.RegularExpressions;

namespace YouAndMeExpensesAPI.Services
{
    /// <summary>
    /// Rule-based chatbot service for financial insights
    /// Uses pattern matching to understand and respond to user queries
    /// Uses Entity Framework Core for data access
    /// </summary>
    public class ChatbotService : IChatbotService
    {
        private readonly AppDbContext _dbContext;
        private readonly IAnalyticsService _analyticsService;
        private readonly ILogger<ChatbotService> _logger;

        // Pattern definitions for query recognition (enhanced with more patterns)
        private readonly Dictionary<string, List<string>> _queryPatterns = new()
        {
            // Spending queries
            ["total_spending"] = new() { 
                "how much.*spent", "total.*spending", "what.*spent", "spending.*total",
                "expenses.*total", "money.*spent", "spent.*so far", "expenditure"
            },
            ["category_spending"] = new() { 
                "spent.*on (\\w+)", "spending.*on (\\w+)", 
                "how much.*(groceries|food|transport|entertainment|bills|shopping|dining|health|utilities)",
                "expenses.*for (\\w+)", "(\\w+).*spending", "(\\w+).*expenses"
            },
            ["monthly_spending"] = new() { 
                "spent.*month", "spending.*month", "monthly.*spending",
                "this month.*expenses", "month.*expenditure"
            },
            ["daily_average"] = new() { 
                "average.*day", "daily.*average", "spending.*per day",
                "per day.*spending", "daily.*expenses", "day.*average"
            },
            
            // Income queries
            ["total_income"] = new() { 
                "how much.*earned", "total.*income", "what.*income", "income.*total",
                "earnings", "money.*made", "revenue", "earned.*so far"
            },
            ["income_sources"] = new() { 
                "income.*from", "where.*income", "income.*sources",
                "earning.*sources", "where.*money.*from"
            },
            
            // Balance queries
            ["current_balance"] = new() { 
                "what.*balance", "current.*balance", "how much.*left", "balance.*now",
                "remaining.*money", "net.*balance", "financial.*position"
            },
            ["savings"] = new() { 
                "savings", "saved.*money", "how much.*saved",
                "saving.*amount", "money.*saved"
            },
            
            // Comparison queries
            ["compare_months"] = new() { 
                "compare.*month", "last month.*this month", "month.*comparison",
                "versus.*last month", "vs.*previous month", "month.*over.*month"
            },
            ["compare_partners"] = new() { 
                "who.*spent.*more", "compare.*spending", "partner.*comparison",
                "spending.*between", "who.*paid.*more"
            },
            
            // Loan queries
            ["total_loans"] = new() { 
                "total.*loans", "how much.*owed", "loan.*total",
                "debt.*amount", "outstanding.*loans"
            },
            ["loan_status"] = new() { 
                "loan.*status", "active.*loans", "pending.*loans",
                "loan.*summary", "debt.*status"
            },
            ["next_payment"] = new() { 
                "next.*payment", "when.*pay", "payment.*due",
                "upcoming.*payment", "when.*payment.*due"
            },
            
            // Budget queries
            ["budget_status"] = new() { 
                "budget.*status", "within.*budget", "over.*budget", "budget.*remaining",
                "budget.*progress", "spending.*limit", "budget.*health"
            },
            ["budget_categories"] = new() { 
                "budget.*for (\\w+)", "budget.*(groceries|food|transport|entertainment)",
                "(\\w+).*budget", "limit.*for (\\w+)"
            },
            
            // Insights and suggestions
            ["spending_insights"] = new() { 
                "insights", "analysis", "tell me.*spending", "financial.*health",
                "money.*habits", "spending.*pattern", "financial.*overview"
            },
            ["save_money"] = new() { 
                "how.*save", "save.*money", "reduce.*spending", "cut.*costs",
                "save.*more", "tips.*saving", "reduce.*expenses"
            },
            ["spending_trends"] = new() { 
                "spending.*trend", "trend.*spending", "pattern.*spending",
                "spending.*over time", "expense.*pattern"
            },
            
            // Top spenders
            ["top_expenses"] = new() { 
                "top.*expenses", "biggest.*expenses", "highest.*spending", "most.*spent",
                "largest.*expenses", "major.*expenses"
            },
            ["top_categories"] = new() { 
                "top.*categories", "which.*category", "spent.*most.*on",
                "main.*categories", "primary.*expenses"
            },
            
            // Goals
            ["savings_goals"] = new() { 
                "savings.*goal", "goal.*progress", "how close.*goal",
                "saving.*target", "goal.*status", "progress.*toward"
            },
            
            // Predictions
            ["predict_spending"] = new() { 
                "predict.*spending", "forecast.*expenses", "estimate.*month",
                "future.*spending", "projected.*expenses", "expected.*spending"
            },
            
            // Loan Scenarios & What-If Analysis
            ["loan_payoff_scenario"] = new() {
                "pay.*more.*loan", "extra.*payment.*loan", "payoff.*faster",
                "how.*long.*pay.*off", "debt.*free.*when", "loan.*payoff.*time",
                "increase.*loan.*payment", "accelerate.*loan", "years.*to.*pay",
                "pay.*off.*early", "additional.*loan.*payment"
            },
            ["debt_free_timeline"] = new() {
                "when.*debt.*free", "debt.*free.*date", "pay.*off.*all.*debt",
                "eliminate.*debt", "debt.*freedom", "clear.*all.*loans"
            },
            
            // What-If Scenarios
            ["what_if_reduce_spending"] = new() {
                "what.*if.*reduce", "what.*if.*cut", "what.*if.*save",
                "if.*reduce.*(\\d+)", "scenario.*reduce", "if.*spend.*less",
                "simulate.*reduce", "if.*cut.*(\\w+)", "hypothetical.*reduce"
            },
            ["category_optimization"] = new() {
                "optimize.*(\\w+)", "reduce.*(groceries|food|transport|entertainment)",
                "cut.*(\\w+).*by", "lower.*(\\w+).*spending", "minimize.*(\\w+)"
            },
            
            // Financial Milestones
            ["financial_milestones"] = new() {
                "financial.*milestone", "when.*reach.*goal", "timeline.*to",
                "how.*long.*until", "when.*can.*afford", "time.*to.*save"
            },
            ["wealth_projection"] = new() {
                "wealth.*projection", "net.*worth.*projection", "future.*wealth",
                "long.*term.*savings", "retirement.*projection", "compound.*interest"
            },
            
            // Tax & Financial Planning
            ["tax_planning"] = new() {
                "tax.*tips", "tax.*deduction", "tax.*save", "reduce.*tax",
                "tax.*strategy", "tax.*planning", "deductible.*expenses"
            },
            ["financial_health_score"] = new() {
                "financial.*health.*score", "how.*doing.*financially", "financial.*grade",
                "rate.*my.*finances", "financial.*assessment", "money.*health"
            },
            
            // Subscriptions & Recurring
            ["subscription_analysis"] = new() {
                "subscription.*analysis", "recurring.*expenses", "subscriptions.*list",
                "cancel.*subscription", "subscription.*audit", "monthly.*subscriptions"
            },
            
            // Bill Management
            ["bill_negotiation"] = new() {
                "negotiate.*bill", "lower.*bill", "reduce.*bill", "bill.*negotiation",
                "cut.*bill.*cost", "cheaper.*bill"
            },
            
            // Investment Basics
            ["investment_advice"] = new() {
                "should.*invest", "investment.*tip", "where.*invest", "investment.*advice",
                "start.*investing", "investment.*basics", "how.*invest"
            },
            
            // Seasonal Patterns
            ["seasonal_spending"] = new() {
                "seasonal.*spending", "spending.*pattern.*month", "holiday.*spending",
                "month.*comparison", "spending.*by.*month"
            },
            
            // Financial Ratios
            ["financial_ratios"] = new() {
                "debt.*to.*income", "savings.*rate", "financial.*ratio",
                "expense.*ratio", "income.*ratio"
            },
            
            // Money Tips & Education
            ["money_tips"] = new() {
                "money.*tip", "financial.*tip", "smart.*money", "money.*advice",
                "financial.*wisdom", "money.*hack"
            },
            
            // Help
            ["help"] = new() { 
                "help", "what.*can.*do", "commands", "capabilities",
                "how.*use", "what.*questions", "guide"
            }
        };

        // Greek pattern definitions for query recognition
        private readonly Dictionary<string, List<string>> _greekQueryPatterns = new()
        {
            // Spending queries (Greek)
            ["total_spending"] = new() { 
                "πόσο.*ξόδεψα", "συνολικά.*έξοδα", "τι.*ξόδεψα", "έξοδα.*σύνολο",
                "χρήματα.*ξόδεψα", "ξόδεψα.*μέχρι.*τώρα", "δαπάνες"
            },
            ["category_spending"] = new() { 
                "ξόδεψα.*για (\\w+)", "έξοδα.*για (\\w+)", 
                "πόσο.*(φαγητό|τροφές|μεταφορικά|ψυχαγωγία|λογαριασμοί|ψώνια|εστιατόριο|υγεία|κοινόχρηστα)",
                "δαπάνες.*για (\\w+)", "(\\w+).*έξοδα", "(\\w+).*δαπάνες"
            },
            ["monthly_spending"] = new() { 
                "ξόδεψα.*μήνα", "έξοδα.*μήνα", "μηνιαία.*έξοδα",
                "αυτό.*μήνα.*έξοδα", "μήνας.*δαπάνες"
            },
            ["daily_average"] = new() { 
                "μέσος.*ημέρα", "ημερήσιος.*μέσος", "έξοδα.*ανά.*ημέρα",
                "ανά.*ημέρα.*έξοδα", "ημερήσια.*έξοδα", "ημέρα.*μέσος"
            },
            
            // Income queries (Greek)
            ["total_income"] = new() { 
                "πόσο.*έβγαλα", "συνολικά.*έσοδα", "τι.*έσοδα", "έσοδα.*σύνολο",
                "κερδισμένα", "χρήματα.*έβγαλα", "έσοδα", "έβγαλα.*μέχρι.*τώρα"
            },
            ["income_sources"] = new() { 
                "έσοδα.*από", "από.*που.*έσοδα", "πηγές.*εσόδων",
                "πηγές.*κερδών", "από.*που.*χρήματα"
            },
            
            // Balance queries (Greek)
            ["current_balance"] = new() { 
                "τι.*υπόλοιπο", "τρέχον.*υπόλοιπο", "πόσο.*έμεινε", "υπόλοιπο.*τώρα",
                "υπόλοιπα.*χρήματα", "καθαρό.*υπόλοιπο", "οικονομική.*θέση"
            },
            ["savings"] = new() { 
                "αποταμιεύσεις", "αποταμιευμένα.*χρήματα", "πόσο.*αποταμιεύσα",
                "ποσό.*αποταμίευσης", "χρήματα.*αποταμιεύθηκαν"
            },
            
            // Comparison queries (Greek)
            ["compare_months"] = new() { 
                "σύγκρινε.*μήνα", "προηγούμενος.*μήνας.*αυτό.*μήνα", "σύγκριση.*μήνα",
                "έναντι.*προηγούμενος.*μήνας", "vs.*προηγούμενος.*μήνας", "μήνας.*πάνω.*μήνας"
            },
            ["compare_partners"] = new() { 
                "ποιος.*ξόδεψε.*περισσότερο", "σύγκρισε.*έξοδα", "σύγκριση.*συνεργάτες",
                "έξοδα.*μεταξύ", "ποιος.*πλήρωσε.*περισσότερο"
            },
            
            // Loan queries (Greek)
            ["total_loans"] = new() { 
                "συνολικά.*δάνεια", "πόσο.*οφείλω", "δάνεια.*σύνολο",
                "ποσό.*χρέους", "εκκρεμή.*δάνεια"
            },
            ["loan_status"] = new() { 
                "κατάσταση.*δανείου", "ενεργά.*δάνεια", "εκκρεμή.*δάνεια",
                "περίληψη.*δανείου", "κατάσταση.*χρέους"
            },
            ["next_payment"] = new() { 
                "επόμενη.*πληρωμή", "πότε.*πληρώσω", "πληρωμή.*οφείλεται",
                "επερχόμενη.*πληρωμή", "πότε.*πληρωμή.*οφείλεται"
            },
            
            // Budget queries (Greek)
            ["budget_status"] = new() { 
                "κατάσταση.*προϋπολογισμού", "εντός.*προϋπολογισμού", "πάνω.*από.*προϋπολογισμό", "προϋπολογισμός.*υπόλοιπο",
                "πρόοδος.*προϋπολογισμού", "όριο.*δαπανών", "υγεία.*προϋπολογισμού"
            },
            ["budget_categories"] = new() { 
                "προϋπολογισμός.*για (\\w+)", "προϋπολογισμός.*(τροφές|φαγητό|μεταφορικά|ψυχαγωγία)",
                "(\\w+).*προϋπολογισμός", "όριο.*για (\\w+)"
            },
            
            // Insights and suggestions (Greek)
            ["spending_insights"] = new() { 
                "ανάλυση", "πες.*μου.*έξοδα", "οικονομική.*υγεία",
                "οικονομικές.*συνήθειες", "μοτίβο.*δαπανών", "οικονομική.*επισκόπηση"
            },
            ["save_money"] = new() { 
                "πώς.*αποταμιεύσω", "αποταμιεύω.*χρήματα", "μείωσε.*έξοδα", "κόψε.*κόστος",
                "αποταμιεύω.*περισσότερο", "συμβουλές.*αποταμίευσης", "μείωσε.*δαπάνες"
            },
            ["spending_trends"] = new() { 
                "τάση.*δαπανών", "μοτίβο.*δαπανών", "δαπάνες.*με.*το.*χρόνο", "μοτίβο.*εξόδων"
            },
            
            // Top spenders (Greek)
            ["top_expenses"] = new() { 
                "δείξε.*κύρια.*έξοδα", "δείξε.*μεγαλύτερα.*έξοδα", "κύρια.*έξοδα", "μεγαλύτερα.*έξοδα", 
                "υψηλότερες.*δαπάνες", "περισσότερα.*ξόδεψα", "μεγαλύτερες.*δαπάνες", "σημαντικά.*έξοδα",
                "δείξε.*έξοδα", "κύρια.*δαπάνες"
            },
            ["top_categories"] = new() { 
                "κύριες.*κατηγορίες", "ποια.*κατηγορία", "ξόδεψα.*περισσότερο.*για",
                "κύριες.*κατηγορίες", "πρωταρχικά.*έξοδα"
            },
            
            // Goals (Greek)
            ["savings_goals"] = new() { 
                "στόχος.*αποταμίευσης", "πρόοδος.*στόχου", "πόσο.*κοντά.*στόχος",
                "στόχος.*αποταμίευσης", "κατάσταση.*στόχου", "πρόοδος.*προς"
            },
            ["predict_spending"] = new() { 
                "πρόβλεψη.*δαπανών", "πρόβλεψη.*εξόδων", "εκτίμηση.*μήνα",
                "μελλοντικές.*δαπάνες", "προβλεπόμενα.*έξοδα", "αναμενόμενα.*έξοδα"
            },
            
            // Loan Scenarios (Greek)
            ["loan_payoff_scenario"] = new() {
                "πλήρωσε.*περισσότερο.*δάνειο", "επιπλέον.*πληρωμή.*δάνειο", "ξεπλήρωσε.*γρηγορότερα",
                "πόσο.*χρόνο.*ξεπληρώσω", "χρέος.*ελεύθερος.*πότε", "χρόνος.*ξεπληρωμής.*δανείου",
                "αύξησε.*πληρωμή.*δανείου", "επιτάχυνε.*δάνειο", "χρόνια.*για.*πληρωμή",
                "ξεπλήρωσε.*νωρίτερα", "επιπλέον.*πληρωμή.*δανείου"
            },
            ["debt_free_timeline"] = new() {
                "πότε.*χρέος.*ελεύθερος", "ημερομηνία.*χρέος.*ελεύθερος", "ξεπλήρωσε.*όλα.*χρέη",
                "εξάλειψε.*χρέος", "ελευθερία.*χρέους", "καθάρισε.*όλα.*δάνεια"
            },
            
            // Help (Greek)
            ["help"] = new() { 
                "βοήθεια", "τι.*μπορώ.*να.*κάνω", "εντολές", "δυνατότητες",
                "πώς.*χρησιμοποιώ", "τι.*ερωτήσεις", "οδηγός"
            }
        };

        /// <summary>
        /// Get query patterns based on language
        /// </summary>
        private Dictionary<string, List<string>> GetQueryPatterns(string language)
        {
            return language == "el" ? _greekQueryPatterns : _queryPatterns;
        }

        public ChatbotService(
            AppDbContext dbContext,
            IAnalyticsService analyticsService,
            ILogger<ChatbotService> logger)
        {
            _dbContext = dbContext;
            _analyticsService = analyticsService;
            _logger = logger;
        }

        /// <summary>
        /// Process user query and generate response with conversation context
        /// </summary>
        public async Task<ChatbotResponse> ProcessQueryAsync(string userId, string query, List<ChatMessage>? history = null, string language = "en")
        {
            try
            {
                _logger.LogInformation("Processing chatbot query for user {UserId}: {Query} (Language: {Language})", userId, query, language);

                var normalizedQuery = query.ToLowerInvariant().Trim();
                
                // Enhance query with conversation context if available
                var contextualQuery = EnhanceQueryWithContext(normalizedQuery, history);
                
                // Detect multiple intents in the query
                var intents = DetectMultipleIntents(contextualQuery, normalizedQuery, language);
                
                // If multiple intents detected, handle them
                if (intents.Count > 1)
                {
                    return await HandleMultipleIntentsAsync(userId, intents, normalizedQuery, language);
                }
                
                // Single intent - use the primary one
                var primaryIntent = intents.FirstOrDefault();
                var queryType = primaryIntent.queryType;
                var confidence = primaryIntent.confidence;
                
                // If confidence is low, try fuzzy matching
                if (confidence < 0.6 && queryType == "unknown")
                {
                    var fuzzyMatch = FuzzyMatchQuery(normalizedQuery, language);
                    if (fuzzyMatch.confidence > 0.4)
                    {
                        queryType = fuzzyMatch.queryType;
                        confidence = fuzzyMatch.confidence;
                    }
                }
                
                // Generate response based on query type
                return queryType switch
                {
                    "total_spending" => await GetTotalSpendingAsync(userId, normalizedQuery, language),
                    "category_spending" => await GetCategorySpendingAsync(userId, normalizedQuery, language),
                    "monthly_spending" => await GetMonthlySpendingAsync(userId, language),
                    "daily_average" => await GetDailyAverageAsync(userId, language),
                    "total_income" => await GetTotalIncomeAsync(userId, language),
                    "income_sources" => await GetIncomeSourcesAsync(userId, language),
                    "current_balance" => await GetCurrentBalanceAsync(userId, language),
                    "savings" => await GetSavingsAsync(userId, language),
                    "compare_months" => await CompareMonthsAsync(userId, language),
                    "compare_partners" => await ComparePartnersAsync(userId, language),
                    "total_loans" => await GetTotalLoansAsync(userId, language),
                    "loan_status" => await GetLoanStatusAsync(userId, language),
                    "next_payment" => await GetNextPaymentAsync(userId, language),
                    "budget_status" => await GetBudgetStatusAsync(userId, language),
                    "budget_categories" => await GetBudgetCategoryAsync(userId, normalizedQuery, language),
                    "spending_insights" => await GetSpendingInsightsAsync(userId, language),
                    "save_money" => await GetSavingSuggestionsAsync(userId, language),
                    "spending_trends" => await GetSpendingTrendsAsync(userId, language),
                    "top_expenses" => await GetTopExpensesAsync(userId, language),
                    "top_categories" => await GetTopCategoriesAsync(userId, language),
                    "savings_goals" => await GetSavingsGoalsAsync(userId, language),
                    "predict_spending" => await PredictSpendingAsync(userId, language),
                    // Powerful What-If Scenarios
                    "loan_payoff_scenario" => await GetLoanPayoffScenarioAsync(userId, normalizedQuery, language),
                    "debt_free_timeline" => await GetDebtFreeTimelineAsync(userId, language),
                    "what_if_reduce_spending" => await GetWhatIfReduceSpendingAsync(userId, normalizedQuery, language),
                    "category_optimization" => await GetCategoryOptimizationAsync(userId, normalizedQuery, language),
                    "financial_milestones" => await GetFinancialMilestonesAsync(userId, language),
                    "wealth_projection" => await GetWealthProjectionAsync(userId, language),
                    // Extended Financial Expertise
                    "tax_planning" => await GetTaxPlanningTipsAsync(userId, language),
                    "financial_health_score" => await GetFinancialHealthScoreAsync(userId, language),
                    "subscription_analysis" => await GetSubscriptionAnalysisAsync(userId, language),
                    "bill_negotiation" => GetBillNegotiationTipsAsync(language),
                    // TODO: Implement these methods when needed
                    // "investment_advice" => GetInvestmentBasicsAsync(),
                    // "seasonal_spending" => await GetSeasonalSpendingAsync(userId),
                    // "financial_ratios" => await GetFinancialRatiosAsync(userId),
                    // "money_tips" => GetMoneyTipsAsync(),
                    "help" => GetHelpResponse(language),
                    _ => GetUnknownResponse(normalizedQuery, history, language)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing chatbot query");
                var errorMessage = language == "el" 
                    ? "Συνέβη ένα σφάλμα κατά την επεξεργασία του αιτήματός σας. Παρακαλώ δοκιμάστε ξανά."
                    : "I encountered an error processing your request. Please try again.";
                return new ChatbotResponse
                {
                    Message = errorMessage,
                    Type = "error"
                };
            }
        }

        /// <summary>
        /// Get suggested questions for user
        /// </summary>
        public async Task<List<string>> GetSuggestedQuestionsAsync(string userId, string language = "en")
        {
            try
            {
                // Get recent transaction data to suggest relevant questions
                var hasTransactions = await HasRecentTransactionsAsync(userId);
                var hasLoans = await HasActiveLoansAsync(userId);
                var hasBudgets = await HasBudgetsAsync(userId);

                var suggestions = language == "el"
                    ? new List<string>
                    {
                        "Πόσο ξόδεψα αυτόν τον μήνα;",
                        "Ποιο είναι το τρέχον υπόλοιπό μου;"
                    }
                    : new List<string>
                    {
                        "How much did I spend this month?",
                        "What's my current balance?"
                    };

                if (hasTransactions)
                {
                    if (language == "el")
                    {
                        suggestions.AddRange(new[]
                        {
                            "Δείξε μου τα κύρια έξοδά μου",
                            "Ποιος είναι ο ημερήσιος μέσος όρος των δαπανών μου;",
                            "Δώσε μου ανάλυση των δαπανών"
                        });
                    }
                    else
                    {
                        suggestions.AddRange(new[]
                        {
                            "Show me my top expenses",
                            "What's my daily average spending?",
                            "Give me spending insights"
                        });
                    }
                }

                if (hasLoans)
                {
                    if (language == "el")
                    {
                        suggestions.Add("Ποια είναι η κατάσταση των δανείων μου;");
                        suggestions.Add("Πότε είναι η επόμενη πληρωμή μου;");
                    }
                    else
                    {
                        suggestions.Add("What's my loan status?");
                        suggestions.Add("When is my next payment?");
                    }
                }

                if (hasBudgets)
                {
                    suggestions.Add(language == "el" 
                        ? "Είμαι εντός προϋπολογισμού;" 
                        : "Am I within budget?");
                }

                if (language == "el")
                {
                    suggestions.AddRange(new[]
                    {
                        "Πώς μπορώ να αποταμιεύσω χρήματα;",
                        "Σύγκρινε τις δαπάνες μου με τον προηγούμενο μήνα",
                        "Τι θα γίνει αν πληρώσω επιπλέον στο δάνειό μου;",
                        "Δείξε μου την προβολή πλούτου μου",
                        "Πότε θα είμαι χρέος-ελεύθερος;",
                        "Ποια είναι τα οικονομικά μου ορόσημα;"
                    });
                }
                else
                {
                    suggestions.AddRange(new[]
                    {
                        "How can I save money?",
                        "Compare my spending with last month",
                        "What if I pay extra on my loan?",
                        "Show my wealth projection",
                        "When will I be debt-free?",
                        "What are my financial milestones?"
                    });
                }

                return suggestions.Take(8).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting suggested questions");
                return language == "el"
                    ? new List<string>
                    {
                        "Πόσο ξόδεψα αυτόν τον μήνα;",
                        "Ποιο είναι το τρέχον υπόλοιπό μου;",
                        "Δείξε μου ανάλυση των δαπανών μου"
                    }
                    : new List<string>
                    {
                        "How much did I spend this month?",
                        "What's my current balance?",
                        "Show me my spending insights"
                    };
            }
        }

        // ============================================
        // ENHANCED PATTERN MATCHING & CONTEXT HANDLING
        // ============================================

        /// <summary>
        /// Enhance query with conversation context for better understanding
        /// </summary>
        private string EnhanceQueryWithContext(string query, List<ChatMessage>? history)
        {
            if (history == null || !history.Any()) return query;

            // Get recent conversation context (last 3 exchanges)
            var recentContext = history
                .OrderByDescending(m => m.Timestamp)
                .Take(6) // Last 3 exchanges (user + bot pairs)
                .OrderBy(m => m.Timestamp)
                .ToList();

            // Extract context keywords from recent messages
            var contextKeywords = new List<string>();
            foreach (var msg in recentContext)
            {
                if (msg.Role == "user")
                {
                    // Extract important words (skip common words)
                    var words = msg.Message.ToLowerInvariant()
                        .Split(new[] { ' ', '.', ',', '!', '?', ':', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Where(w => w.Length > 3 && !IsCommonWord(w))
                        .Take(5);
                    contextKeywords.AddRange(words);
                }
            }

            // If query is short or seems incomplete, enhance with context
            if (query.Split(' ').Length < 4 && contextKeywords.Any())
            {
                var enhancedQuery = query + " " + string.Join(" ", contextKeywords.Take(3));
                _logger.LogDebug("Enhanced query with context: {Original} -> {Enhanced}", query, enhancedQuery);
                return enhancedQuery;
            }

            return query;
        }

        /// <summary>
        /// Check if word is a common stop word
        /// </summary>
        private bool IsCommonWord(string word)
        {
            var commonWords = new HashSet<string> { "the", "this", "that", "what", "how", "when", "where", 
                "which", "who", "why", "can", "could", "would", "should", "will", "with", "from", "about", 
                "have", "has", "had", "are", "was", "were", "been", "being", "did", "does", "do", "get", 
                "got", "give", "gave", "show", "tell", "see", "know", "think", "want", "need", "make", 
                "made", "take", "took", "go", "went", "come", "came", "say", "said", "ask", "asked" };
            return commonWords.Contains(word);
        }

        /// <summary>
        /// Match user query to a pattern type with confidence scoring
        /// </summary>
        private (string queryType, double confidence) MatchQueryPatternWithConfidence(string contextualQuery, string originalQuery, string language = "en")
        {
            var bestMatch = ("unknown", 0.0);
            var matches = new List<(string type, double score)>();
            var patterns = GetQueryPatterns(language);

            foreach (var (type, patternList) in patterns)
            {
                double maxScore = 0.0;
                
                foreach (var pattern in patternList)
                {
                    // Exact regex match gets highest score
                    if (Regex.IsMatch(contextualQuery, pattern, RegexOptions.IgnoreCase))
                    {
                        maxScore = Math.Max(maxScore, 1.0);
                    }
                    // Check if pattern keywords exist in query
                    else
                    {
                        var patternWords = ExtractKeywordsFromPattern(pattern);
                        var queryWords = originalQuery.Split(new[] { ' ', '.', ',', '!', '?', ':', ';' }, 
                            StringSplitOptions.RemoveEmptyEntries).Select(w => w.ToLowerInvariant()).ToList();
                        
                        var matchingWords = patternWords.Count(w => queryWords.Contains(w));
                        if (patternWords.Count > 0)
                        {
                            var wordScore = (double)matchingWords / patternWords.Count;
                            maxScore = Math.Max(maxScore, wordScore * 0.7); // Partial match gets lower score
                        }
                    }
                }

                if (maxScore > 0)
                {
                    matches.Add((type, maxScore));
                    if (maxScore > bestMatch.Item2)
                    {
                        bestMatch = (type, maxScore);
                    }
                }
            }

            // If we have multiple matches with similar scores, prefer more specific ones
            if (matches.Count > 1)
            {
                var topMatches = matches.OrderByDescending(m => m.score).Take(3).ToList();
                if (topMatches[0].score - topMatches[1].score < 0.2 && topMatches[0].score < 0.8)
                {
                    // Ambiguous match - prefer more specific query types
                    var specificTypes = new[] { "category_spending", "budget_categories", "loan_payoff_scenario" };
                    var specificMatch = topMatches.FirstOrDefault(m => specificTypes.Contains(m.type));
                    if (specificMatch.type != null)
                    {
                        bestMatch = (specificMatch.type, specificMatch.score);
                    }
                }
            }

            return bestMatch;
        }

        /// <summary>
        /// Extract keywords from regex pattern for fuzzy matching
        /// </summary>
        private List<string> ExtractKeywordsFromPattern(string pattern)
        {
            // Remove regex syntax and extract meaningful words
            var cleaned = Regex.Replace(pattern, @"[\\\(\)\[\]\{\}\+\*\?\^\$\|\.]", " ");
            var words = cleaned.Split(new[] { ' ', '_' }, StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length > 2 && !IsCommonWord(w))
                .Select(w => w.ToLowerInvariant())
                .Distinct()
                .ToList();
            return words;
        }

        /// <summary>
        /// Fuzzy match query using Levenshtein distance and keyword similarity
        /// </summary>
        private (string queryType, double confidence) FuzzyMatchQuery(string query, string language = "en")
        {
            var queryWords = query.Split(new[] { ' ', '.', ',', '!', '?', ':', ';' }, 
                StringSplitOptions.RemoveEmptyEntries)
                .Select(w => w.ToLowerInvariant())
                .Where(w => !IsCommonWord(w))
                .ToList();

            var bestMatch = ("unknown", 0.0);
            var patterns = GetQueryPatterns(language);

            foreach (var (type, patternList) in patterns)
            {
                foreach (var pattern in patternList)
                {
                    var patternKeywords = ExtractKeywordsFromPattern(pattern);
                    if (!patternKeywords.Any()) continue;

                    // Calculate similarity score
                    var matchingKeywords = patternKeywords.Count(kw => 
                        queryWords.Any(qw => qw.Contains(kw) || kw.Contains(qw) || 
                        LevenshteinDistance(qw, kw) <= 2));

                    if (patternKeywords.Count > 0)
                    {
                        var similarity = (double)matchingKeywords / patternKeywords.Count;
                        if (similarity > bestMatch.Item2)
                        {
                            bestMatch = (type, similarity * 0.6); // Fuzzy matches get lower confidence
                        }
                    }
                }
            }

            return bestMatch;
        }

        /// <summary>
        /// Detect multiple intents in a single query
        /// </summary>
        private List<(string queryType, double confidence)> DetectMultipleIntents(string contextualQuery, string originalQuery, string language = "en")
        {
            var intents = new List<(string queryType, double confidence)>();
            
            // Split query by common separators (language-specific)
            var separators = language == "el" 
                ? new[] { " και ", " επίσης ", " συν ", ", ", " & ", " καθώς και " }
                : new[] { " and ", " also ", " plus ", ", ", " & ", " as well as " };
            var parts = new List<string> { originalQuery };
            
            foreach (var sep in separators)
            {
                var newParts = new List<string>();
                foreach (var part in parts)
                {
                    if (part.Contains(sep, StringComparison.OrdinalIgnoreCase))
                    {
                        var split = part.Split(new[] { sep }, StringSplitOptions.RemoveEmptyEntries);
                        newParts.AddRange(split.Select(p => p.Trim()));
                    }
                    else
                    {
                        newParts.Add(part);
                    }
                }
                parts = newParts;
            }
            
            // If query was split, analyze each part separately
            if (parts.Count > 1)
            {
                foreach (var part in parts)
                {
                    var (type, confidence) = MatchQueryPatternWithConfidence(part, part, language);
                    if (type != "unknown" && confidence > 0.5)
                    {
                        intents.Add((type, confidence));
                    }
                }
            }
            else
            {
                // Single query - check for multiple intents using keyword detection
                var (primaryType, primaryConfidence) = MatchQueryPatternWithConfidence(contextualQuery, originalQuery, language);
                intents.Add((primaryType, primaryConfidence));
                
                // Check for secondary intents (language-specific keywords)
                var secondaryKeywords = language == "el"
                    ? new Dictionary<string, string>
                    {
                        ["σύγκρινε"] = "compare_months",
                        ["τάση"] = "spending_trends",
                        ["πρόβλεψη"] = "predict_spending",
                        ["βελτιστοποίησε"] = "category_optimization",
                        ["αποταμιεύω"] = "save_money",
                        ["ανάλυση"] = "spending_insights"
                    }
                    : new Dictionary<string, string>
                    {
                        ["compare"] = "compare_months",
                        ["trend"] = "spending_trends",
                        ["predict"] = "predict_spending",
                        ["optimize"] = "category_optimization",
                        ["save"] = "save_money",
                        ["insight"] = "spending_insights"
                    };
                
                foreach (var (keyword, intentType) in secondaryKeywords)
                {
                    if (originalQuery.Contains(keyword, StringComparison.OrdinalIgnoreCase) && 
                        primaryType != intentType)
                    {
                        intents.Add((intentType, 0.6)); // Lower confidence for secondary intent
                    }
                }
            }
            
            // Remove duplicates and sort by confidence
            return intents
                .GroupBy(i => i.queryType)
                .Select(g => g.OrderByDescending(i => i.confidence).First())
                .OrderByDescending(i => i.confidence)
                .ToList();
        }

        /// <summary>
        /// Handle queries with multiple intents by combining responses
        /// </summary>
        private async Task<ChatbotResponse> HandleMultipleIntentsAsync(string userId, List<(string queryType, double confidence)> intents, string query, string language = "en")
        {
            var responses = new List<ChatbotResponse>();
            
            // Process each intent (limit to top 2 to avoid overwhelming response)
            foreach (var intent in intents.Take(2))
            {
                try
                {
                    var response = intent.queryType switch
                    {
                        "total_spending" => await GetTotalSpendingAsync(userId, query, language),
                        "category_spending" => await GetCategorySpendingAsync(userId, query, language),
                        "compare_months" => await CompareMonthsAsync(userId, language),
                        "spending_trends" => await GetSpendingTrendsAsync(userId, language),
                        "spending_insights" => await GetSpendingInsightsAsync(userId, language),
                        "top_expenses" => await GetTopExpensesAsync(userId, language),
                        "save_money" => await GetSavingSuggestionsAsync(userId, language),
                        "predict_spending" => await PredictSpendingAsync(userId, language),
                        _ => null
                    };
                    
                    if (response != null)
                    {
                        responses.Add(response);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error processing intent {IntentType}", intent.queryType);
                }
            }
            
            if (!responses.Any())
            {
                return GetUnknownResponse(query, null, language);
            }
            
            // Combine responses
            if (responses.Count == 1)
            {
                return responses[0];
            }
            
            // Combine multiple responses (language-specific)
            var combinedMessage = language == "el"
                ? "Αυτά που βρήκα:\n\n"
                : "Here's what I found:\n\n";
            for (int i = 0; i < responses.Count; i++)
            {
                combinedMessage += $"**{i + 1}.** {responses[i].Message}\n\n";
            }
            
            // Merge quick actions
            var allQuickActions = responses
                .Where(r => r.QuickActions != null)
                .SelectMany(r => r.QuickActions!)
                .Distinct()
                .Take(4)
                .ToList();
            
            var defaultQuickActions = language == "el"
                ? new List<string> { "Δείξε περισσότερες λεπτομέρειες", "Δώσε μου ανάλυση" }
                : new List<string> { "Show more details", "Give me insights" };
            
            return new ChatbotResponse
            {
                Message = combinedMessage.Trim(),
                Type = responses.Any(r => r.Type == "warning") ? "warning" : "insight",
                Data = responses.Select(r => r.Data).ToList(),
                QuickActions = allQuickActions.Any() ? allQuickActions : defaultQuickActions,
                ActionLink = responses.FirstOrDefault(r => !string.IsNullOrEmpty(r.ActionLink))?.ActionLink
            };
        }

        /// <summary>
        /// Calculate Levenshtein distance between two strings
        /// </summary>
        private int LevenshteinDistance(string s, string t)
        {
            if (string.IsNullOrEmpty(s)) return string.IsNullOrEmpty(t) ? 0 : t.Length;
            if (string.IsNullOrEmpty(t)) return s.Length;

            int n = s.Length;
            int m = t.Length;
            int[,] d = new int[n + 1, m + 1];

            for (int i = 0; i <= n; d[i, 0] = i++) { }
            for (int j = 0; j <= m; d[0, j] = j++) { }

            for (int i = 1; i <= n; i++)
            {
                for (int j = 1; j <= m; j++)
                {
                    int cost = (t[j - 1] == s[i - 1]) ? 0 : 1;
                    d[i, j] = Math.Min(
                        Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                        d[i - 1, j - 1] + cost);
                }
            }

            return d[n, m];
        }

        // ============================================
        // RESPONSE GENERATORS
        // ============================================

        /// <summary>
        /// Get total spending for a period with enhanced insights
        /// </summary>
        private async Task<ChatbotResponse> GetTotalSpendingAsync(string userId, string query, string language = "en")
        {
            var period = ExtractTimePeriod(query, language);
            var (start, end) = GetDateRange(period);

            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= start && t.Date <= end)
                .ToListAsync();

            var total = transactions.Sum(t => t.Amount);
            var count = transactions.Count;
            var avgPerTransaction = count > 0 ? total / count : 0;

            // Get previous period for comparison
            var periodDays = (end - start).Days + 1;
            var prevStart = start.AddDays(-periodDays);
            var prevEnd = start.AddDays(-1);
            
            var prevTransactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= prevStart && t.Date <= prevEnd)
                .ToListAsync();
            
            var prevTotal = prevTransactions.Sum(t => t.Amount);
            var change = total - prevTotal;
            var changePercent = prevTotal > 0 ? (change / prevTotal) * 100 : 0;

            // Generate personalized message
            var message = GenerateSpendingMessage(total, count, avgPerTransaction, change, changePercent, period, language);

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε μου έξοδα ανά κατηγορία",
                    "Ποια είναι τα κύρια έξοδά μου;",
                    "Πώς μπορώ να αποταμιεύσω χρήματα;"
                }
                : new List<string>
                {
                    "Show me spending by category",
                    "What are my top expenses?",
                    "How can I save money?"
                };

            return new ChatbotResponse
            {
                Message = message,
                Type = changePercent > 20 ? "warning" : "text",
                Data = new 
                { 
                    total, 
                    count, 
                    avgPerTransaction,
                    period, 
                    startDate = start, 
                    endDate = end,
                    previousTotal = prevTotal,
                    change,
                    changePercent,
                    dailyAverage = periodDays > 0 ? total / periodDays : 0
                },
                QuickActions = quickActions,
                ActionLink = "/expenses"
            };
        }

        /// <summary>
        /// Generate personalized spending message with insights
        /// </summary>
        private string GenerateSpendingMessage(decimal total, int count, decimal avg, decimal change, decimal changePercent, string period, string language = "en")
        {
            var messages = new List<string>();
            
            if (language == "el")
            {
                // Main spending info (Greek)
                if (count == 0)
                {
                    return $"Τελευταία νέα! Δεν έχετε ξοδέψει τίποτα {period}. Συνεχίστε έτσι! 🎉";
                }

                messages.Add($"Έχετε ξοδέψει **${total:N2}** {period} σε {count} συναλλαγή{(count != 1 ? "ές" : "")}.");
                messages.Add($"Αυτό είναι ένας μέσος όρος **${avg:N2}** ανά συναλλαγή.");

                // Comparison insight (Greek)
                if (Math.Abs(changePercent) > 5)
                {
                    if (change > 0)
                    {
                        messages.Add($"\n⚠️ Ξοδεύετε **{Math.Abs(changePercent):F1}%** περισσότερο από την προηγούμενη περίοδο (${Math.Abs(change):N2} αύξηση).");
                    }
                    else
                    {
                        messages.Add($"\n✅ Καλή δουλειά! Ξοδεύετε **{Math.Abs(changePercent):F1}%** λιγότερο από την προηγούμενη περίοδο (${Math.Abs(change):N2} αποταμιεύτηκαν).");
                    }
                }
                else
                {
                    messages.Add($"\n📊 Οι δαπάνες σας είναι συνεπείς με την προηγούμενη περίοδο.");
                }
            }
            else
            {
                // Main spending info (English)
                if (count == 0)
                {
                    return $"Great news! You haven't spent anything {period}. Keep it up! 🎉";
                }

                messages.Add($"You've spent **${total:N2}** {period} across {count} transaction{(count != 1 ? "s" : "")}.");
                messages.Add($"That's an average of **${avg:N2}** per transaction.");

                // Comparison insight (English)
                if (Math.Abs(changePercent) > 5)
                {
                    if (change > 0)
                    {
                        messages.Add($"\n⚠️ You're spending **{Math.Abs(changePercent):F1}%** more than the previous period (${Math.Abs(change):N2} increase).");
                    }
                    else
                    {
                        messages.Add($"\n✅ Great job! You're spending **{Math.Abs(changePercent):F1}%** less than the previous period (${Math.Abs(change):N2} saved).");
                    }
                }
                else
                {
                    messages.Add($"\n📊 Your spending is consistent with the previous period.");
                }
            }

            return string.Join(" ", messages);
        }

        /// <summary>
        /// Get spending by category with enhanced insights
        /// </summary>
        private async Task<ChatbotResponse> GetCategorySpendingAsync(string userId, string query, string language = "en")
        {
            var category = ExtractCategory(query);
            var now = DateTime.UtcNow;
            var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= start)
                .ToListAsync();

            var categoryTransactions = transactions
                .Where(t => t.Category.ToLower().Contains(category.ToLower()))
                .ToList();

            var categoryTotal = categoryTransactions.Sum(t => t.Amount);
            var totalSpending = transactions.Sum(t => t.Amount);
            var percentage = totalSpending > 0 ? (categoryTotal / totalSpending) * 100 : 0;
            var transactionCount = categoryTransactions.Count;
            var avgPerTransaction = transactionCount > 0 ? categoryTotal / transactionCount : 0;

            // Compare with last month
            var lastMonthStart = start.AddMonths(-1);
            var lastMonthEnd = start.AddDays(-1);
            var lastMonthTransactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= lastMonthStart && t.Date <= lastMonthEnd)
                .Where(t => t.Category.ToLower().Contains(category.ToLower()))
                .ToListAsync();

            var lastMonthTotal = lastMonthTransactions.Sum(t => t.Amount);
            var monthlyChange = categoryTotal - lastMonthTotal;
            var monthlyChangePercent = lastMonthTotal > 0 ? (monthlyChange / lastMonthTotal) * 100 : 0;

            // Generate personalized message
            var message = GenerateCategorySpendingMessage(
                category, categoryTotal, percentage, transactionCount, 
                avgPerTransaction, monthlyChange, monthlyChangePercent, language);

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε όλες τις κατηγορίες",
                    "Σύγκρινε με τον προηγούμενο μήνα",
                    "Πώς μπορώ να το μειώσω;"
                }
                : new List<string>
                {
                    "Show all categories",
                    "Compare with last month",
                    "How can I reduce this?"
                };

            return new ChatbotResponse
            {
                Message = message,
                Type = percentage > 40 ? "warning" : "text",
                Data = new { 
                    category, 
                    amount = categoryTotal, 
                    percentage,
                    transactionCount,
                    avgPerTransaction,
                    lastMonthTotal,
                    monthlyChange,
                    monthlyChangePercent
                },
                QuickActions = quickActions
            };
        }

        /// <summary>
        /// Generate personalized category spending message
        /// </summary>
        private string GenerateCategorySpendingMessage(
            string category, decimal total, decimal percentage, int count,
            decimal avg, decimal change, decimal changePercent, string language = "en")
        {
            var messages = new List<string>();

            if (language == "el")
            {
                if (count == 0)
                {
                    return $"Δεν έχετε ξοδέψει τίποτα για {category} αυτόν τον μήνα. 🎯";
                }

                messages.Add($"Έχετε ξοδέψει **${total:N2}** για **{category}** αυτόν τον μήνα ({percentage:F1}% των συνολικών δαπανών).");
                messages.Add($"Αυτό είναι {count} συναλλαγή{(count != 1 ? "ές" : "")} με μέσο όρο **${avg:N2}** η καθεμία.");

                // Add insight based on percentage (Greek)
                if (percentage > 40)
                {
                    messages.Add($"\n⚠️ Αυτή η κατηγορία αντιπροσωπεύει σημαντικό μέρος των δαπανών σας. Σκεφτείτε να εξετάσετε αν αυτό ευθυγραμμίζεται με τις προτεραιότητές σας.");
                }
                else if (percentage > 25)
                {
                    messages.Add($"\n📊 Αυτή είναι μία από τις κύριες κατηγορίες δαπανών σας.");
                }

                // Monthly comparison (Greek)
                if (Math.Abs(changePercent) > 10)
                {
                    if (change > 0)
                    {
                        messages.Add($"\n📈 Αύξηση **{Math.Abs(changePercent):F1}%** από τον προηγούμενο μήνα (${Math.Abs(change):N2} αύξηση).");
                    }
                    else
                    {
                        messages.Add($"\n✅ Μείωση **{Math.Abs(changePercent):F1}%** από τον προηγούμενο μήνα (${Math.Abs(change):N2} αποταμιεύτηκαν)!");
                    }
                }
            }
            else
            {
                if (count == 0)
                {
                    return $"You haven't spent anything on {category} this month. 🎯";
                }

                messages.Add($"You've spent **${total:N2}** on **{category}** this month ({percentage:F1}% of total spending).");
                messages.Add($"That's {count} transaction{(count != 1 ? "s" : "")} with an average of **${avg:N2}** each.");

                // Add insight based on percentage
                if (percentage > 40)
                {
                    messages.Add($"\n⚠️ This category represents a significant portion of your spending. Consider reviewing if this aligns with your priorities.");
                }
                else if (percentage > 25)
                {
                    messages.Add($"\n📊 This is one of your major spending categories.");
                }

                // Monthly comparison
                if (Math.Abs(changePercent) > 10)
                {
                    if (change > 0)
                    {
                        messages.Add($"\n📈 Up **{Math.Abs(changePercent):F1}%** from last month (${Math.Abs(change):N2} increase).");
                    }
                    else
                    {
                        messages.Add($"\n✅ Down **{Math.Abs(changePercent):F1}%** from last month (${Math.Abs(change):N2} saved)!");
                    }
                }
            }

            return string.Join(" ", messages);
        }

        /// <summary>
        /// Get current balance
        /// </summary>
        private async Task<ChatbotResponse> GetCurrentBalanceAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId)
                .Where(t => t.Date >= start)
                .ToListAsync();

            var income = transactions.Where(t => t.Type == "income").Sum(t => t.Amount);
            var expenses = transactions.Where(t => t.Type == "expense").Sum(t => t.Amount);
            var balance = income - expenses;

            var message = language == "el"
                ? (balance >= 0
                    ? $"Το τρέχον υπόλοιπό σας αυτόν τον μήνα είναι ${balance:N2}. Τα πάτε πολύ καλά! 💰"
                    : $"Το τρέχον υπόλοιπό σας αυτόν τον μήνα είναι -${Math.Abs(balance):N2}. Σκεφτείτε να εξετάσετε τα έξοδά σας.")
                : (balance >= 0
                    ? $"Your current balance this month is ${balance:N2}. You're doing great! 💰"
                    : $"Your current balance this month is -${Math.Abs(balance):N2}. Consider reviewing your expenses.");

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε μου πού ξόδεψα",
                    "Πώς μπορώ να αποταμιεύσω χρήματα;",
                    "Σύγκρινε με τον προηγούμενο μήνα"
                }
                : new List<string>
                {
                    "Show me where I spent",
                    "How can I save money?",
                    "Compare with last month"
                };

            return new ChatbotResponse
            {
                Message = message,
                Type = balance >= 0 ? "insight" : "warning",
                Data = new { income, expenses, balance },
                QuickActions = quickActions,
                ActionLink = "/dashboard"
            };
        }

        /// <summary>
        /// Get comprehensive spending insights with actionable recommendations
        /// </summary>
        private async Task<ChatbotResponse> GetSpendingInsightsAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            
            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(
                userId, monthStart, now
            );

            var insights = new List<string>();
            
            if (language == "el")
            {
                insights.Add("📊 **Στιγμιότυπο Οικονομικής Υγείας**\n");

                // Balance status (Greek)
                if (analytics.Balance >= 0)
                {
                    var savingsRate = analytics.TotalIncome > 0 
                        ? (analytics.Balance / analytics.TotalIncome) * 100 
                        : 0;
                    insights.Add($"✅ **Τρέχον Υπόλοιπο:** ${analytics.Balance:N2}");
                    insights.Add($"💰 **Ρυθμός Αποταμίευσης:** {savingsRate:F1}% των εσόδων");
                    
                    if (savingsRate >= 20)
                    {
                        insights.Add("🌟 Εξαιρετικά! Φτάνετε τον στόχο αποταμίευσης 20%!");
                    }
                    else if (savingsRate >= 10)
                    {
                        insights.Add("👍 Καλή αρχή! Προσπαθήστε να αυξήσετε τον ρυθμό αποταμίευσης στο 20%.");
                    }
                    else
                    {
                        insights.Add("💡 Συμβουλή: Στόχος να αποταμιεύετε τουλάχιστον 20% των εσόδων σας.");
                    }
                }
                else
                {
                    insights.Add($"⚠️ **Ελλείμμα Προϋπολογισμού:** ${Math.Abs(analytics.Balance):N2}");
                    insights.Add("⚡ Ξοδεύετε περισσότερα από όσα κερδίζετε. Εξετάστε τα έξοδά σας!");
                }

                // Spending patterns (Greek)
                insights.Add($"\n📈 **Μοτίβα Δαπανών:**");
                insights.Add($"• Συνολικά Έξοδα: ${analytics.TotalExpenses:N2}");
                insights.Add($"• Ημερήσιος Μέσος Όρος: ${analytics.AverageDailySpending:N2}");
                
                if (analytics.AverageDailySpending > 100)
                {
                    var monthlySavings = (analytics.AverageDailySpending - 100) * 30;
                    insights.Add($"💡 Η μείωση των ημερήσιων δαπανών κατά ${(analytics.AverageDailySpending - 100):N2} θα μπορούσε να αποταμιεύσει ${monthlySavings:N2}/μήνα!");
                }

                // Top spending categories (Greek)
                if (analytics.CategoryBreakdown.Any())
                {
                    insights.Add($"\n🎯 **Κύριες Κατηγορίες Δαπανών:**");
                    var topThree = analytics.CategoryBreakdown.Take(3).ToList();
                    for (int i = 0; i < topThree.Count; i++)
                    {
                        var cat = topThree[i];
                        var emoji = GetCategoryEmoji(cat.Category);
                        insights.Add($"{i + 1}. {emoji} **{cat.Category}**: ${cat.Amount:N2} ({cat.Percentage:F1}%)");
                    }

                    // Alert if any category is too high (Greek)
                    var topCategory = topThree.First();
                    if (topCategory.Percentage > 50)
                    {
                        insights.Add($"\n⚠️ Η {topCategory.Category} κυριαρχεί στις δαπάνες σας. Σκεφτείτε να διαφοροποιήσετε!");
                    }
                }

                // Spending velocity (trend) (Greek)
                var daysInMonth = now.Day;
                var projectedMonthEnd = (analytics.TotalExpenses / daysInMonth) * DateTime.DaysInMonth(now.Year, now.Month);
                var monthlyAvg = 2000m; // Could be calculated from historical data
                
                insights.Add($"\n📊 **Τάση Δαπανών:**");
                insights.Add($"• Προβλεπόμενο Τέλος Μήνα: ${projectedMonthEnd:N2}");
                
                if (projectedMonthEnd > monthlyAvg)
                {
                    insights.Add($"⚠️ Είστε σε πορεία να υπερβείτε τις τυπικές μηνιαίες δαπάνες σας κατά ${(projectedMonthEnd - monthlyAvg):N2}");
                }
                else
                {
                    insights.Add($"✅ Είστε σε πορεία για ένα φιλικό προς τον προϋπολογισμό μήνα!");
                }
            }
            else
            {
                insights.Add("📊 **Financial Health Snapshot**\n");

                // Balance status
                if (analytics.Balance >= 0)
                {
                    var savingsRate = analytics.TotalIncome > 0 
                        ? (analytics.Balance / analytics.TotalIncome) * 100 
                        : 0;
                    insights.Add($"✅ **Current Balance:** ${analytics.Balance:N2}");
                    insights.Add($"💰 **Savings Rate:** {savingsRate:F1}% of income");
                    
                    if (savingsRate >= 20)
                    {
                        insights.Add("🌟 Excellent! You're meeting the 20% savings goal!");
                    }
                    else if (savingsRate >= 10)
                    {
                        insights.Add("👍 Good start! Try to increase your savings rate to 20%.");
                    }
                    else
                    {
                        insights.Add("💡 Tip: Aim to save at least 20% of your income.");
                    }
                }
                else
                {
                    insights.Add($"⚠️ **Budget Deficit:** ${Math.Abs(analytics.Balance):N2}");
                    insights.Add("⚡ You're spending more than you're earning. Review your expenses!");
                }

                // Spending patterns
                insights.Add($"\n📈 **Spending Patterns:**");
                insights.Add($"• Total Expenses: ${analytics.TotalExpenses:N2}");
                insights.Add($"• Daily Average: ${analytics.AverageDailySpending:N2}");
                
                if (analytics.AverageDailySpending > 100)
                {
                    var monthlySavings = (analytics.AverageDailySpending - 100) * 30;
                    insights.Add($"💡 Reducing daily spending by ${(analytics.AverageDailySpending - 100):N2} could save ${monthlySavings:N2}/month!");
                }

                // Top spending categories
                if (analytics.CategoryBreakdown.Any())
                {
                    insights.Add($"\n🎯 **Top Spending Categories:**");
                    var topThree = analytics.CategoryBreakdown.Take(3).ToList();
                    for (int i = 0; i < topThree.Count; i++)
                    {
                        var cat = topThree[i];
                        var emoji = GetCategoryEmoji(cat.Category);
                        insights.Add($"{i + 1}. {emoji} **{cat.Category}**: ${cat.Amount:N2} ({cat.Percentage:F1}%)");
                    }

                    // Alert if any category is too high
                    var topCategory = topThree.First();
                    if (topCategory.Percentage > 50)
                    {
                        insights.Add($"\n⚠️ {topCategory.Category} dominates your spending. Consider diversifying!");
                    }
                }

                // Spending velocity (trend)
                var daysInMonth = now.Day;
                var projectedMonthEnd = (analytics.TotalExpenses / daysInMonth) * DateTime.DaysInMonth(now.Year, now.Month);
                var monthlyAvg = 2000m; // Could be calculated from historical data
                
                insights.Add($"\n📊 **Spending Trend:**");
                insights.Add($"• Projected Month-End: ${projectedMonthEnd:N2}");
                
                if (projectedMonthEnd > monthlyAvg)
                {
                    insights.Add($"⚠️ You're on track to exceed your typical monthly spending by ${(projectedMonthEnd - monthlyAvg):N2}");
                }
                else
                {
                    insights.Add($"✅ You're on track for a budget-friendly month!");
                }
            }

            var message = string.Join("\n", insights);
            var quickActions = language == "el"
                ? new List<string>
                {
                    "Πώς μπορώ να αποταμιεύσω χρήματα;",
                    "Δείξε κύρια έξοδα",
                    "Σύγκρινε με τον προηγούμενο μήνα"
                }
                : new List<string>
                {
                    "How can I save money?",
                    "Show top expenses",
                    "Compare with last month"
                };

            return new ChatbotResponse
            {
                Message = message,
                Type = analytics.Balance < 0 ? "warning" : "insight",
                Data = new
                {
                    analytics,
                    projectedMonthEnd = (analytics.TotalExpenses / now.Day) * DateTime.DaysInMonth(now.Year, now.Month),
                    savingsRate = analytics.TotalIncome > 0 ? (analytics.Balance / analytics.TotalIncome) * 100 : 0,
                    daysRemaining = DateTime.DaysInMonth(now.Year, now.Month) - now.Day
                },
                QuickActions = quickActions,
                ActionLink = "/analytics"
            };
        }

        /// <summary>
        /// Get emoji for category
        /// </summary>
        private string GetCategoryEmoji(string category)
        {
            return category.ToLower() switch
            {
                var c when c.Contains("food") || c.Contains("groceries") => "🍔",
                var c when c.Contains("transport") || c.Contains("travel") => "🚗",
                var c when c.Contains("entertainment") || c.Contains("fun") => "🎮",
                var c when c.Contains("bills") || c.Contains("utilities") => "💡",
                var c when c.Contains("shopping") || c.Contains("clothes") => "🛍️",
                var c when c.Contains("health") || c.Contains("medical") => "🏥",
                var c when c.Contains("dining") || c.Contains("restaurant") => "🍽️",
                var c when c.Contains("education") || c.Contains("learning") => "📚",
                var c when c.Contains("home") || c.Contains("rent") => "🏠",
                _ => "💳"
            };
        }

        /// <summary>
        /// Get personalized money-saving suggestions with actionable advice
        /// </summary>
        private async Task<ChatbotResponse> GetSavingSuggestionsAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            
            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(
                userId,
                monthStart.AddMonths(-1),
                now
            );

            var suggestions = new List<string>();
            var potentialSavings = 0m;

            if (language == "el")
            {
                suggestions.Add("💡 **Προσωποποιημένες Συμβουλές Αποταμίευσης**\n");
                suggestions.Add("🎯 **Βασισμένο στα Μοτίβα Δαπανών σας:**\n");
                
                foreach (var category in analytics.CategoryBreakdown.Take(5))
                {
                    if (category.Percentage > 35)
                    {
                        var savings = category.Amount * 0.15m;
                        potentialSavings += savings;
                        var emoji = GetCategoryEmoji(category.Category);
                        suggestions.Add($"{emoji} **{category.Category}** ({category.Percentage:F0}% των δαπανών)");
                        suggestions.Add($"   • Αποταμιεύστε ${savings:N2}/μήνα με 15% μείωση");
                        suggestions.Add(GetCategorySavingTip(category.Category, language));
                        suggestions.Add("");
                    }
                    else if (category.Percentage > 20)
                    {
                        var savings = category.Amount * 0.10m;
                        potentialSavings += savings;
                        var emoji = GetCategoryEmoji(category.Category);
                        suggestions.Add($"{emoji} **{category.Category}**");
                        suggestions.Add($"   • Δυνητική αποταμίευση: ${savings:N2}/μήνα");
                        suggestions.Add(GetCategorySavingTip(category.Category, language));
                        suggestions.Add("");
                    }
                }

                if (analytics.AverageDailySpending > 100)
                {
                    var targetDaily = analytics.AverageDailySpending * 0.85m;
                    var monthlySavings = (analytics.AverageDailySpending - targetDaily) * 30;
                    potentialSavings += monthlySavings;
                    
                    suggestions.Add($"📊 **Πρόκληση Ημερήσιων Δαπανών:**");
                    suggestions.Add($"   • Τρέχον: ${analytics.AverageDailySpending:N2}/ημέρα");
                    suggestions.Add($"   • Στόχος: ${targetDaily:N2}/ημέρα");
                    suggestions.Add($"   • Μηνιαία Αποταμίευση: ${monthlySavings:N2}");
                    suggestions.Add("");
                }

                suggestions.Add("💰 **Γρήγορες Νίκες:**");
                suggestions.Add("✓ Ακύρωση αχρησιμοποίητων συνδρομών");
                suggestions.Add("✓ Ρύθμιση αυτόματης αποταμίευσης (πληρώστε πρώτα τον εαυτό σας!)");
                suggestions.Add("✓ Χρησιμοποιήστε τον κανόνα 24 ωρών για μη απαραίτητες αγορές");
                suggestions.Add("✓ Προετοιμασία γευμάτων τις Κυριακές για μείωση εξόδων εστιατορίου");
                suggestions.Add("✓ Σύγκριση τιμών και χρήση εφαρμογών cashback");
                suggestions.Add("✓ Ρύθμιση ειδοποιήσεων δαπανών για τις κύριες κατηγορίες σας\n");
            }
            else
            {
                suggestions.Add("💡 **Personalized Money-Saving Tips**\n");
                suggestions.Add("🎯 **Based on Your Spending Patterns:**\n");
                
                foreach (var category in analytics.CategoryBreakdown.Take(5))
                {
                    if (category.Percentage > 35)
                    {
                        var savings = category.Amount * 0.15m;
                        potentialSavings += savings;
                        var emoji = GetCategoryEmoji(category.Category);
                        suggestions.Add($"{emoji} **{category.Category}** ({category.Percentage:F0}% of spending)");
                        suggestions.Add($"   • Save ${savings:N2}/month with a 15% reduction");
                        suggestions.Add(GetCategorySavingTip(category.Category, language));
                        suggestions.Add("");
                    }
                    else if (category.Percentage > 20)
                    {
                        var savings = category.Amount * 0.10m;
                        potentialSavings += savings;
                        var emoji = GetCategoryEmoji(category.Category);
                        suggestions.Add($"{emoji} **{category.Category}**");
                        suggestions.Add($"   • Potential savings: ${savings:N2}/month");
                        suggestions.Add(GetCategorySavingTip(category.Category, language));
                        suggestions.Add("");
                    }
                }

                if (analytics.AverageDailySpending > 100)
                {
                    var targetDaily = analytics.AverageDailySpending * 0.85m;
                    var monthlySavings = (analytics.AverageDailySpending - targetDaily) * 30;
                    potentialSavings += monthlySavings;
                    
                    suggestions.Add($"📊 **Daily Spending Challenge:**");
                    suggestions.Add($"   • Current: ${analytics.AverageDailySpending:N2}/day");
                    suggestions.Add($"   • Target: ${targetDaily:N2}/day");
                    suggestions.Add($"   • Monthly Savings: ${monthlySavings:N2}");
                    suggestions.Add("");
                }

                suggestions.Add("💰 **Quick Wins:**");
                suggestions.Add("✓ Cancel unused subscriptions");
                suggestions.Add("✓ Set up automatic savings (pay yourself first!)");
                suggestions.Add("✓ Use the 24-hour rule for non-essential purchases");
                suggestions.Add("✓ Meal prep on Sundays to reduce dining out");
                suggestions.Add("✓ Compare prices and use cashback apps");
                suggestions.Add("✓ Set spending alerts for your main categories\n");
            }

            // 50/30/20 rule analysis
            if (analytics.TotalIncome > 0)
            {
                var needs = analytics.TotalIncome * 0.5m;
                var wants = analytics.TotalIncome * 0.3m;
                var savings = analytics.TotalIncome * 0.2m;
                
                if (language == "el")
                {
                    suggestions.Add("📈 **Κανόνας Προϋπολογισμού 50/30/20:**");
                    suggestions.Add($"   Βάσει εσόδων ${analytics.TotalIncome:N2}:");
                    suggestions.Add($"   • Ανάγκες (50%): ${needs:N2}");
                    suggestions.Add($"   • Επιθυμίες (30%): ${wants:N2}");
                    suggestions.Add($"   • Αποταμιεύσεις (20%): ${savings:N2}");
                    
                    var actualSavings = analytics.Balance;
                    var savingsRate = analytics.TotalIncome > 0 ? (actualSavings / analytics.TotalIncome) * 100 : 0;
                    
                    if (savingsRate < 20)
                    {
                        var gap = savings - actualSavings;
                        suggestions.Add($"\n   ⚡ Αποταμιεύετε {savingsRate:F1}%. Αυξήστε κατά ${gap:N2} για να φτάσετε 20%!");
                        potentialSavings += gap;
                    }
                    else
                    {
                        suggestions.Add($"\n   ✅ Υπερβαίνετε τον στόχο αποταμίευσης 20%! Εξαιρετικά!");
                    }
                }
                else
                {
                    suggestions.Add("📈 **50/30/20 Budget Rule:**");
                    suggestions.Add($"   Based on income of ${analytics.TotalIncome:N2}:");
                    suggestions.Add($"   • Needs (50%): ${needs:N2}");
                    suggestions.Add($"   • Wants (30%): ${wants:N2}");
                    suggestions.Add($"   • Savings (20%): ${savings:N2}");
                    
                    var actualSavings = analytics.Balance;
                    var savingsRate = analytics.TotalIncome > 0 ? (actualSavings / analytics.TotalIncome) * 100 : 0;
                    
                    if (savingsRate < 20)
                    {
                        var gap = savings - actualSavings;
                        suggestions.Add($"\n   ⚡ You're saving {savingsRate:F1}%. Increase by ${gap:N2} to reach 20%!");
                        potentialSavings += gap;
                    }
                    else
                    {
                        suggestions.Add($"\n   ✅ You're exceeding the 20% savings target! Amazing!");
                    }
                }
            }

            // Total potential
            if (potentialSavings > 0)
            {
                if (language == "el")
                {
                    suggestions.Add($"\n🎉 **Συνολική Δυνητική Αποταμίευση:** ${potentialSavings:N2}/μήνα");
                    suggestions.Add($"   Αυτό είναι ${potentialSavings * 12:N2} ετησίως!");
                }
                else
                {
                    suggestions.Add($"\n🎉 **Total Potential Savings:** ${potentialSavings:N2}/month");
                    suggestions.Add($"   That's ${potentialSavings * 12:N2} per year!");
                }
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Ρύθμιση προϋπολογισμού",
                    "Δημιουργία στόχου αποταμίευσης",
                    "Δείξε τα κύρια έξοδά μου"
                }
                : new List<string>
                {
                    "Set up a budget",
                    "Create a savings goal",
                    "Show my top expenses"
                };

            return new ChatbotResponse
            {
                Message = string.Join("\n", suggestions),
                Type = "suggestion",
                Data = new
                {
                    potentialMonthlySavings = potentialSavings,
                    potentialYearlySavings = potentialSavings * 12,
                    categoryBreakdown = analytics.CategoryBreakdown,
                    currentSavingsRate = analytics.TotalIncome > 0 ? (analytics.Balance / analytics.TotalIncome) * 100 : 0
                },
                QuickActions = quickActions,
                ActionLink = "/budgets"
            };
        }

        /// <summary>
        /// Get category-specific saving tips
        /// </summary>
        private string GetCategorySavingTip(string category, string language = "en")
        {
            if (language == "el")
            {
                return category.ToLower() switch
                {
                    var c when c.Contains("food") || c.Contains("groceries") || c.Contains("τροφ") => 
                        "   💡 Συμβουλή: Σχεδιασμός γευμάτων, αγορά χύμα, χρήση καρτών αφοσίωσης",
                    var c when c.Contains("dining") || c.Contains("restaurant") || c.Contains("εστιατόριο") => 
                        "   💡 Συμβουλή: Μαγείρεψτε στο σπίτι 2-3 φορές περισσότερο/εβδομάδα, φτιάξτε μεσημεριανό",
                    var c when c.Contains("transport") || c.Contains("travel") || c.Contains("μεταφορ") => 
                        "   💡 Συμβουλή: Συνεπιβάτης, χρήση δημόσιων μεταφορών, συνδυασμός διαδρομών",
                    var c when c.Contains("entertainment") || c.Contains("fun") || c.Contains("ψυχαγωγ") => 
                        "   💡 Συμβουλή: Βρείτε δωρεάν δραστηριότητες, χρησιμοποιήστε υπηρεσίες streaming με σύνεση",
                    var c when c.Contains("shopping") || c.Contains("clothes") || c.Contains("ψώνια") => 
                        "   💡 Συμβουλή: Περιμένετε 24 ώρες πριν αγοράσετε, αγοράστε σε προσφορές, αγοράστε μεταχειρισμένα",
                    var c when c.Contains("bills") || c.Contains("utilities") || c.Contains("λογαριασμ") => 
                        "   💡 Συμβουλή: Εξετάστε συνδρομές, διαπραγματευτείτε τιμές, εξοικονομήστε ενέργεια",
                    var c when c.Contains("health") || c.Contains("υγεία") => 
                        "   💡 Συμβουλή: Χρησιμοποιήστε γενόσημες μάρκες, προληπτική φροντίδα, συγκρίνετε φαρμακεία",
                    _ => "   💡 Συμβουλή: Παρακολουθήστε έξοδα, ορίστε προϋπολογισμό, βρείτε εναλλακτικές"
                };
            }
            else
            {
                return category.ToLower() switch
                {
                    var c when c.Contains("food") || c.Contains("groceries") => 
                        "   💡 Tip: Meal plan, buy in bulk, use loyalty cards",
                    var c when c.Contains("dining") || c.Contains("restaurant") => 
                        "   💡 Tip: Cook at home 2-3 more times/week, pack lunch",
                    var c when c.Contains("transport") || c.Contains("travel") => 
                        "   💡 Tip: Carpool, use public transport, combine trips",
                    var c when c.Contains("entertainment") || c.Contains("fun") => 
                        "   💡 Tip: Find free activities, use streaming services wisely",
                    var c when c.Contains("shopping") || c.Contains("clothes") => 
                        "   💡 Tip: Wait 24hrs before buying, shop sales, buy secondhand",
                    var c when c.Contains("bills") || c.Contains("utilities") => 
                        "   💡 Tip: Review subscriptions, negotiate rates, save energy",
                    var c when c.Contains("health") => 
                        "   💡 Tip: Use generic brands, preventive care, compare pharmacies",
                    _ => "   💡 Tip: Track expenses, set a budget, find alternatives"
                };
            }
        }

        /// <summary>
        /// Compare current month with last month
        /// </summary>
        private async Task<ChatbotResponse> CompareMonthsAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var thisMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            
            var thisMonth = await _analyticsService.GetFinancialAnalyticsAsync(
                userId,
                thisMonthStart,
                now
            );

            var lastMonthStart = thisMonthStart.AddMonths(-1);
            var lastMonthEnd = thisMonthStart.AddDays(-1);
            
            var lastMonth = await _analyticsService.GetFinancialAnalyticsAsync(
                userId,
                lastMonthStart,
                lastMonthEnd
            );

            var diff = thisMonth.TotalExpenses - lastMonth.TotalExpenses;
            var percentChange = lastMonth.TotalExpenses > 0 
                ? (diff / lastMonth.TotalExpenses) * 100 
                : 0;

            var message = language == "el"
                ? (diff > 0
                    ? $"Ξοδεύετε {percentChange:F1}% περισσότερο αυτόν τον μήνα (${diff:N2} αύξηση). Προηγούμενος μήνας: ${lastMonth.TotalExpenses:N2}, Αυτός ο μήνας: ${thisMonth.TotalExpenses:N2}"
                    : $"Καλή δουλειά! Ξοδεύετε {Math.Abs(percentChange):F1}% λιγότερο αυτόν τον μήνα (${Math.Abs(diff):N2} αποταμιεύτηκαν). Προηγούμενος μήνας: ${lastMonth.TotalExpenses:N2}, Αυτός ο μήνας: ${thisMonth.TotalExpenses:N2}")
                : (diff > 0
                    ? $"You're spending {percentChange:F1}% more this month (${diff:N2} increase). Last month: ${lastMonth.TotalExpenses:N2}, This month: ${thisMonth.TotalExpenses:N2}"
                    : $"Great job! You're spending {Math.Abs(percentChange):F1}% less this month (${Math.Abs(diff):N2} saved). Last month: ${lastMonth.TotalExpenses:N2}, This month: ${thisMonth.TotalExpenses:N2}");

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε τάσεις δαπανών",
                    "Τι άλλαξε περισσότερο;",
                    "Πώς μπορώ να αποταμιεύσω χρήματα;"
                }
                : new List<string>
                {
                    "Show spending trends",
                    "What changed the most?",
                    "How can I save money?"
                };

            return new ChatbotResponse
            {
                Message = message,
                Type = diff > 0 ? "warning" : "insight",
                Data = new { thisMonth = thisMonth.TotalExpenses, lastMonth = lastMonth.TotalExpenses, diff, percentChange },
                QuickActions = quickActions
            };
        }

        /// <summary>
        /// Get top expenses with detailed analysis
        /// </summary>
        private async Task<ChatbotResponse> GetTopExpensesAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var start = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= start)
                .OrderByDescending(t => t.Amount)
                .Take(10)
                .ToListAsync();

            if (!transactions.Any())
            {
                var noExpensesMessage = language == "el"
                    ? "Δεν έχετε καταγράψει κανένα έξοδο αυτόν τον μήνα ακόμα. Ξεκινήστε την καταγραφή για να δείτε αναλύσεις! 📊"
                    : "You don't have any expenses recorded this month yet. Start tracking to see insights! 📊";
                
                var noExpensesQuickActions = language == "el"
                    ? new List<string>
                    {
                        "Πώς να προσθέσω ένα έξοδο;",
                        "Δείξε έξοδα προηγούμενου μήνα",
                        "Ποιο είναι το υπόλοιπό μου;"
                    }
                    : new List<string>
                    {
                        "How to add an expense?",
                        "Show last month expenses",
                        "What's my balance?"
                    };

                return new ChatbotResponse
                {
                    Message = noExpensesMessage,
                    Type = "text",
                    QuickActions = noExpensesQuickActions,
                    ActionLink = "/expenses"
                };
            }

            var totalMonthExpenses = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= start)
                .SumAsync(t => t.Amount);

            var insights = new List<string>();
            
            // Calculate values that are used regardless of language
            var topFiveTotal = transactions.Take(5).Sum(t => t.Amount);
            var topFivePercent = totalMonthExpenses > 0 ? (topFiveTotal / totalMonthExpenses) * 100 : 0;
            var largestExpense = transactions.First();
            var avgTopFive = topFiveTotal / Math.Min(5, transactions.Count);
            
            if (language == "el")
            {
                insights.Add("💸 **Τα Μεγαλύτερα Έξοδά σας Αυτόν τον Μήνα**\n");
                insights.Add($"Τα κορυφαία 5 έξοδα αντιπροσωπεύουν **${topFiveTotal:N2}** ({topFivePercent:F0}% των συνολικών δαπανών)\n");

                for (int i = 0; i < Math.Min(5, transactions.Count); i++)
                {
                    var t = transactions[i];
                    var emoji = GetCategoryEmoji(t.Category);
                    var percent = totalMonthExpenses > 0 ? (t.Amount / totalMonthExpenses) * 100 : 0;
                    
                    insights.Add($"{i + 1}. {emoji} **${t.Amount:N2}** - {t.Description ?? t.Category}");
                    insights.Add($"   {t.Date:MMM dd} • {t.Category} • {percent:F1}% των μηνιαίων δαπανών");
                    
                    if (!string.IsNullOrEmpty(t.PaidBy))
                    {
                        insights.Add($"   Πληρώθηκε από: {t.PaidBy}");
                    }
                    insights.Add("");
                }

                // Analysis (Greek)
                insights.Add("📊 **Γρήγορη Ανάλυση:**");
                insights.Add($"• Μεγαλύτερο μεμονωμένο έξοδο: ${largestExpense.Amount:N2}");
                insights.Add($"• Μέσος όρος των κορυφαίων 5: ${avgTopFive:N2}");
                
                if (topFivePercent > 60)
                {
                    insights.Add($"\n⚠️ Τα κορυφαία 5 έξοδά σας αποτελούν {topFivePercent:F0}% των δαπανών. Αυτές είναι οι βασικές περιοχές στις οποίες πρέπει να εστιάσετε!");
                }
                else if (topFivePercent > 40)
                {
                    insights.Add($"\n📊 Τα κορυφαία 5 έξοδά σας είναι σημαντικά. Εξετάστε αν ευθυγραμμίζονται με τις προτεραιότητές σας.");
                }
            }
            else
            {
                insights.Add("💸 **Your Biggest Expenses This Month**\n");
                insights.Add($"Top 5 expenses represent **${topFiveTotal:N2}** ({topFivePercent:F0}% of total spending)\n");

                for (int i = 0; i < Math.Min(5, transactions.Count); i++)
                {
                    var t = transactions[i];
                    var emoji = GetCategoryEmoji(t.Category);
                    var percent = totalMonthExpenses > 0 ? (t.Amount / totalMonthExpenses) * 100 : 0;
                    
                    insights.Add($"{i + 1}. {emoji} **${t.Amount:N2}** - {t.Description ?? t.Category}");
                    insights.Add($"   {t.Date:MMM dd} • {t.Category} • {percent:F1}% of monthly spending");
                    
                    if (!string.IsNullOrEmpty(t.PaidBy))
                    {
                        insights.Add($"   Paid by: {t.PaidBy}");
                    }
                    insights.Add("");
                }

                // Analysis
                insights.Add("📊 **Quick Analysis:**");
                insights.Add($"• Largest single expense: ${largestExpense.Amount:N2}");
                insights.Add($"• Average of top 5: ${avgTopFive:N2}");
                
                if (topFivePercent > 60)
                {
                    insights.Add($"\n⚠️ Your top 5 expenses make up {topFivePercent:F0}% of spending. These are your key areas to focus on!");
                }
                else if (topFivePercent > 40)
                {
                    insights.Add($"\n📊 Your top 5 expenses are significant. Review if they align with your priorities.");
                }
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε έξοδα ανά κατηγορία",
                    "Πώς μπορώ να μειώσω τα έξοδα;",
                    "Ορισμός ορίων προϋπολογισμού"
                }
                : new List<string>
                {
                    "Show spending by category",
                    "How can I reduce expenses?",
                    "Set budget limits"
                };

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "text",
                Data = new
                {
                    topExpenses = transactions.Take(5),
                    topFiveTotal,
                    topFivePercent,
                    totalMonthExpenses,
                    avgTopFive
                },
                QuickActions = quickActions,
                ActionLink = "/expenses"
            };
        }

        /// <summary>
        /// Get loan status
        /// </summary>
        private async Task<ChatbotResponse> GetLoanStatusAsync(string userId, string language = "en")
        {
            var loans = await _dbContext.Loans
                .Where(l => l.UserId == userId)
                .ToListAsync();

            var activeLoans = loans.Where(l => !l.IsSettled).ToList();
            var totalOwed = activeLoans.Sum(l => l.RemainingAmount);

            if (!activeLoans.Any())
            {
                var noLoansMessage = language == "el"
                    ? "Δεν έχετε ενεργά δάνεια. Καλή δουλειά που παραμένετε χρέος-ελεύθεροι! 🎉"
                    : "You have no active loans. Great job staying debt-free! 🎉";
                
                var noLoansQuickActions = language == "el"
                    ? new List<string>
                    {
                        "Προβολή ιστορικού δανείων",
                        "Προσθήκη νέου δανείου"
                    }
                    : new List<string>
                    {
                        "View loan history",
                        "Add a new loan"
                    };

                return new ChatbotResponse
                {
                    Message = noLoansMessage,
                    Type = "insight",
                    QuickActions = noLoansQuickActions
                };
            }

            var message = language == "el"
                ? $"Έχετε {activeLoans.Count} ενεργό(ά) δάνειο(α) με συνολικό ποσό ${totalOwed:N2} που απομένει."
                : $"You have {activeLoans.Count} active loan(s) with a total of ${totalOwed:N2} remaining.";
            
            var nextPayment = activeLoans
                .Where(l => l.NextPaymentDate.HasValue)
                .OrderBy(l => l.NextPaymentDate)
                .FirstOrDefault();

            if (nextPayment != null)
            {
                if (language == "el")
                {
                    message += $"\n\nΕπόμενη πληρωμή: ${nextPayment.InstallmentAmount ?? nextPayment.RemainingAmount:N2} οφείλεται στις {nextPayment.NextPaymentDate:MMM dd, yyyy}";
                }
                else
                {
                    message += $"\n\nNext payment: ${nextPayment.InstallmentAmount ?? nextPayment.RemainingAmount:N2} due on {nextPayment.NextPaymentDate:MMM dd, yyyy}";
                }
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε πρόγραμμα πληρωμών",
                    "Καταγραφή πληρωμής",
                    "Προβολή λεπτομερειών δανείου"
                }
                : new List<string>
                {
                    "Show payment schedule",
                    "Record a payment",
                    "View loan details"
                };

            return new ChatbotResponse
            {
                Message = message,
                Type = "text",
                Data = new { activeCount = activeLoans.Count, totalOwed, nextPayment },
                QuickActions = quickActions,
                ActionLink = "/loans"
            };
        }

        /// <summary>
        /// Get comprehensive help response with all capabilities
        /// </summary>
        private ChatbotResponse GetHelpResponse(string language = "en")
        {
            if (language == "el")
            {
                return new ChatbotResponse
                {
                    Message = @"Γεια σας! 👋 Είμαι ο AI οικονομικός σας βοηθός. Μπορώ να σας βοηθήσω να κατανοήσετε και να βελτιστοποιήσετε τις οικονομίες σας!

💰 **Έξοδα & Έσοδα**
• ""Πόσο ξόδεψα αυτόν τον μήνα;""
• ""Τι ξόδεψα για τρόφιμα;""
• ""Δείξε μου τα κύρια έξοδά μου""
• ""Ποιο είναι το τρέχον υπόλοιπό μου;""
• ""Ποιος είναι ο ημερήσιος μέσος όρος των δαπανών μου;""

📊 **Αναλύσεις & Στατιστικά**
• ""Δώσε μου ανάλυση των δαπανών""
• ""Πρόβλεψη των δαπανών μου για αυτόν τον μήνα""
• ""Σύγκρινε με τον προηγούμενο μήνα""
• ""Δείξε μου τάσεις δαπανών""
• ""Ποιες είναι οι κύριες κατηγορίες μου;""

🎯 **Προϋπολογισμοί & Στόχοι**
• ""Είμαι εντός προϋπολογισμού;""
• ""Ποια είναι η κατάσταση του προϋπολογισμού μου;""
• ""Πώς είναι οι στόχοι αποταμίευσης μου;""
• ""Δείξε μου την πρόοδο των στόχων""

💑 **Σύγκριση Συνεργατών**
• ""Ποιος ξόδεψε περισσότερο αυτόν τον μήνα;""
• ""Σύγκρινε τις δαπάνες των συνεργατών""
• ""Δείξε κοινά έξοδα""

💳 **Δάνεια & Χρέη**
• ""Ποια είναι η κατάσταση των δανείων μου;""
• ""Πότε είναι η επόμενη πληρωμή μου;""
• ""Σύνοψη συνολικών δανείων""

💡 **Συμβουλές Αποταμίευσης**
• ""Πώς μπορώ να αποταμιεύσω χρήματα;""
• ""Δώσε μου συμβουλές αποταμίευσης""
• ""Πώς να μειώσω τις δαπάνες;""

🚀 **ΙΣΧΥΡΑ ΣΕΝΑΡΙΑ ΤΙ-ΑΝ:**

💰 **Σενάρια Δανείων:**
• ""Αν πληρώσω $100 περισσότερο στο δάνειό μου, πότε θα ξεπληρωθεί;""
• ""Πώς μπορώ να ξεπληρώσω το δάνειό μου γρηγορότερα;""
• ""Πότε θα είμαι χρέος-ελεύθερος;""
• ""Δείξε σενάρια ξεπληρωμής δανείου""

📉 **Μείωση Δαπανών:**
• ""Τι θα γίνει αν μειώσω τις δαπάνες μου κατά 20%;""
• ""Τι θα γίνει αν κόψω τα έξοδα φαγητού;""
• ""Προσομοίωση μείωσης τροφίμων κατά $100""
• ""Βελτιστοποίηση των δαπανών ψυχαγωγίας""

🎯 **Δόμηση Πλούτου:**
• ""Δείξε μου τα οικονομικά μου ορόσημα""
• ""Πότε θα φτάσω $10,000 σε αποταμιεύσεις;""
• ""Πρόβλεψη πλούτου σε 10 χρόνια""
• ""Δείξε μου την προβολή πλούτου""

💪 **Βελτιστοποίηση Κατηγοριών:**
• ""Πώς μπορώ να βελτιστοποιήσω τα τρόφιμά μου;""
• ""Μείωση των εξόδων εστιατορίου""
• ""Χαμηλότερα έξοδα μεταφορικών""

Χρησιμοποιώ φυσική γλώσσα και προηγμένους υπολογισμούς για να σας βοηθήσω να πάρετε έξυπνες οικονομικές αποφάσεις! 🤖✨

**Ο Πλήρης Οικονομικός σας Ειδικός:** Από τις καθημερινές δαπάνες έως τη μακροπρόθεσμη δόμηση πλούτου!",
                    Type = "text",
                    QuickActions = new List<string>
                    {
                        "Βαθμολογία οικονομικής υγείας",
                        "Ανάλυση συνδρομών",
                        "Συμβουλές φορολογικού σχεδιασμού",
                        "Βασικά επενδυτικά"
                    }
                };
            }

            return new ChatbotResponse
            {
                Message = @"Hi! 👋 I'm your AI financial assistant. I can help you understand and optimize your finances!

💰 **Spending & Income**
• ""How much did I spend this month?""
• ""What did I spend on groceries?""
• ""Show my top expenses""
• ""What's my current balance?""
• ""What's my daily average spending?""

📊 **Insights & Analytics**
• ""Give me spending insights""
• ""Predict my spending for this month""
• ""Compare with last month""
• ""Show spending trends""
• ""What are my top categories?""

🎯 **Budgets & Goals**
• ""Am I within budget?""
• ""What's my budget status?""
• ""How are my savings goals?""
• ""Show my goal progress""

💑 **Partner Comparison**
• ""Who spent more this month?""
• ""Compare partner spending""
• ""Show shared expenses""

💳 **Loans & Debt**
• ""What's my loan status?""
• ""When is my next payment?""
• ""Total loans summary""

💡 **Money-Saving Tips**
• ""How can I save money?""
• ""Give me savings tips""
• ""How to reduce spending?""

🚀 **POWERFUL WHAT-IF SCENARIOS:**

💰 **Loan Scenarios:**
• ""If I pay $100 more on my loan, when will it be paid off?""
• ""How can I pay off my loan faster?""
• ""When will I be debt-free?""
• ""Show loan payoff scenarios""

📉 **Spending Reduction:**
• ""What if I reduce my spending by 20%?""
• ""What if I cut my food expenses?""
• ""Simulate reducing groceries by $100""
• ""Optimize my entertainment spending""

🎯 **Wealth Building:**
• ""Show my financial milestones""
• ""When will I reach $10,000 in savings?""
• ""Project my wealth in 10 years""
• ""Show my wealth projection""

💪 **Category Optimization:**
• ""How can I optimize my groceries?""
• ""Reduce my dining out expenses""
• ""Lower my transport costs""

🔍 **Power Questions to Try:**
• ""If I pay $200 extra on my loan, in how many years will it end?""
• ""What if I reduce spending by 15%?""
• ""When will I be debt-free?""
• ""Show wealth projection""
• ""Optimize my food spending""
• ""What are my financial milestones?""

💎 **EXTENDED EXPERTISE AREAS:**

💼 **Tax & Planning:**
• ""Tax planning tips""
• ""What expenses are tax deductible?""
• ""Tax optimization strategies""

📊 **Financial Health:**
• ""What's my financial health score?""
• ""Show my financial ratios""
• ""Rate my finances""

📱 **Subscriptions & Bills:**
• ""Analyze my subscriptions""
• ""How to negotiate bills?""
• ""Recurring expenses audit""

📈 **Investment & Growth:**
• ""Should I start investing?""
• ""Investment basics""
• ""Where should I invest?""

📅 **Patterns & Analysis:**
• ""Show seasonal spending patterns""
• ""Month-by-month comparison""
• ""Spending patterns analysis""

💡 **Money Tips:**
• ""Give me money tips""
• ""Smart money hacks""
• ""Financial wisdom""

I use natural language and advanced calculations to help you make smart financial decisions! 🤖✨

**Your Complete Financial Expert:** From daily spending to long-term wealth building!",
                Type = "text",
                QuickActions = new List<string>
                {
                    "Financial health score",
                    "Subscription analysis",
                    "Tax planning tips",
                    "Investment basics"
                }
            };
        }

        /// <summary>
        /// Get unknown query response
        /// </summary>
        /// <summary>
        /// Get intelligent unknown response with context-aware suggestions
        /// </summary>
        private ChatbotResponse GetUnknownResponse(string? query = null, List<ChatMessage>? history = null, string language = "en")
        {
            var suggestions = language == "el"
                ? new List<string>
                {
                    "Πόσο ξόδεψα αυτόν τον μήνα;",
                    "Ποιο είναι το τρέχον υπόλοιπό μου;",
                    "Δώσε μου ανάλυση των δαπανών"
                }
                : new List<string>
                {
                    "How much did I spend this month?",
                    "What's my current balance?",
                    "Give me spending insights"
                };

            // If we have a query, try to provide more relevant suggestions
            if (!string.IsNullOrWhiteSpace(query))
            {
                var queryLower = query.ToLowerInvariant();
                
                if (language == "el")
                {
                    // Greek keyword detection
                    if (Regex.IsMatch(queryLower, @"\b(ξόδεψα|έξοδα|κόστος|χρήματα|δαπάνες)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "Πόσο ξόδεψα αυτόν τον μήνα;",
                            "Ποια είναι τα κύρια έξοδά μου;",
                            "Δείξε μου έξοδα ανά κατηγορία",
                            "Σύγκρινε με τον προηγούμενο μήνα"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(υπόλοιπο|αποταμίευση|αποταμιεύω|αριστερά|υπόλοιπα)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "Ποιο είναι το τρέχον υπόλοιπό μου;",
                            "Πόσο έχω αποταμιεύσει;",
                            "Δείξε τους στόχους αποταμίευσης μου",
                            "Ποια είναι η καθαρή αξία μου;"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(δάνειο|χρέος|οφείλω|πληρωμή)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "Ποια είναι η κατάσταση των δανείων μου;",
                            "Πότε είναι η επόμενη πληρωμή μου;",
                            "Πότε θα είμαι χρέος-ελεύθερος;",
                            "Δείξε σενάρια ξεπληρωμής δανείου"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(προϋπολογισμός|όριο|πάνω|εντός)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "Είμαι εντός προϋπολογισμού;",
                            "Ποια είναι η κατάσταση του προϋπολογισμού μου;",
                            "Δείξε προϋπολογισμό ανά κατηγορία",
                            "Πώς μπορώ να βελτιστοποιήσω τον προϋπολογισμό μου;"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(έσοδα|κερδίζω|μισθός|αμοιβή)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "Ποια είναι τα συνολικά έσοδά μου;",
                            "Δείξε πηγές εσόδων",
                            "Σύγκρινε έσοδα έναντι εξόδων",
                            "Ποιος είναι ο ρυθμός αποταμίευσης μου;"
                        };
                    }
                }
                else
                {
                    // English keyword detection
                    if (Regex.IsMatch(queryLower, @"\b(spend|spent|expense|cost|money)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "How much did I spend this month?",
                            "What are my top expenses?",
                            "Show me spending by category",
                            "Compare with last month"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(balance|saving|save|left|remaining)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "What's my current balance?",
                            "How much have I saved?",
                            "Show my savings goals",
                            "What's my net worth?"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(loan|debt|owe|payment)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "What's my loan status?",
                            "When is my next payment?",
                            "When will I be debt-free?",
                            "Show loan payoff scenarios"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(budget|limit|over|within)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "Am I within budget?",
                            "What's my budget status?",
                            "Show budget by category",
                            "How can I optimize my budget?"
                        };
                    }
                    else if (Regex.IsMatch(queryLower, @"\b(income|earn|salary|wage)\b"))
                    {
                        suggestions = new List<string>
                        {
                            "What's my total income?",
                            "Show income sources",
                            "Compare income vs expenses",
                            "What's my savings rate?"
                        };
                    }
                }

                // Use conversation history for better context
                if (history != null && history.Any())
                {
                    var lastBotMessage = history.LastOrDefault(m => m.Role == "bot");
                    if (lastBotMessage != null)
                    {
                        if (language == "el")
                        {
                            if (lastBotMessage.Message.Contains("ξόδεψα", StringComparison.OrdinalIgnoreCase) || 
                                lastBotMessage.Message.Contains("έξοδα", StringComparison.OrdinalIgnoreCase))
                            {
                                suggestions.Insert(0, "Δείξε μου έξοδα ανά κατηγορία");
                                suggestions.Insert(1, "Ποια είναι τα κύρια έξοδά μου;");
                            }
                        }
                        else
                        {
                            if (lastBotMessage.Message.Contains("spent", StringComparison.OrdinalIgnoreCase))
                            {
                                suggestions.Insert(0, "Show me spending by category");
                                suggestions.Insert(1, "What are my top expenses?");
                            }
                        }
                    }
                }
            }

            var message = language == "el"
                ? "Δεν είμαι σίγουρος ότι καταλαβαίνω αυτή την ερώτηση. 🤔\n\n"
                : "I'm not sure I understand that question. 🤔\n\n";
            
            message += language == "el"
                ? "Ακολουθούν μερικά πράγματα με τα οποία μπορώ να σας βοηθήσω:\n"
                : "Here are some things I can help you with:\n";
            
            message += $"• {suggestions[0]}\n";
            message += $"• {suggestions[1]}\n";
            message += $"• {suggestions[2]}\n\n";
            
            message += language == "el"
                ? "Ή πληκτρολογήστε **'βοήθεια'** για να δείτε όλες τις δυνατότητές μου!"
                : "Or type **'help'** to see all my capabilities!";

            return new ChatbotResponse
            {
                Message = message,
                Type = "text",
                QuickActions = suggestions.Take(4).ToList()
            };
        }

        // ============================================
        // POWERFUL WHAT-IF SCENARIOS & PROJECTIONS
        // ============================================

        /// <summary>
        /// Calculate loan payoff scenarios with extra payments
        /// </summary>
        private async Task<ChatbotResponse> GetLoanPayoffScenarioAsync(string userId, string query, string language = "en")
        {
            var loans = await _dbContext.Loans
                .Where(l => l.UserId == userId && !l.IsSettled)
                .OrderByDescending(l => l.RemainingAmount)
                .ToListAsync();

            if (!loans.Any())
            {
                return new ChatbotResponse
                {
                    Message = "You don't have any active loans. Great job being debt-free! 🎉\n\nWould you like to explore savings or investment scenarios instead?",
                    Type = "insight",
                    QuickActions = new List<string>
                    {
                        "What if I save more?",
                        "Show wealth projection",
                        "Financial milestones"
                    }
                };
            }

            var insights = new List<string>();
            insights.Add("💰 **Loan Payoff Scenarios**\n");

            // Extract extra payment amount from query if specified
            var extraPaymentMatch = Regex.Match(query, @"(\d+)");
            var baseExtraPayment = extraPaymentMatch.Success ? decimal.Parse(extraPaymentMatch.Groups[1].Value) : 0m;

            decimal totalRemaining = loans.Sum(l => l.RemainingAmount);
            insights.Add($"**Total Outstanding Debt:** ${totalRemaining:N2}\n");

            foreach (var loan in loans.Take(3)) // Top 3 loans
            {
                insights.Add($"📊 **{loan.Description ?? "Loan"}**");
                insights.Add($"   Outstanding: ${loan.RemainingAmount:N2}");

                var monthlyPayment = loan.InstallmentAmount ?? 100m; // Default minimum
                var interestRate = loan.InterestRate ?? 0m;
                var monthlyRate = interestRate / 12 / 100;

                // Calculate different scenarios
                var scenarios = new List<(string name, decimal extraPayment, int months, decimal totalInterest)>();

                // Scenario 1: Current payment
                var currentScenario = CalculateLoanPayoff(loan.RemainingAmount, monthlyPayment, monthlyRate);
                scenarios.Add(("Current Payment", 0m, currentScenario.months, currentScenario.totalInterest));

                // Scenario 2: +$50/month
                var scenario50 = CalculateLoanPayoff(loan.RemainingAmount, monthlyPayment + 50, monthlyRate);
                scenarios.Add(("+$50/month", 50m, scenario50.months, scenario50.totalInterest));

                // Scenario 3: +$100/month
                var scenario100 = CalculateLoanPayoff(loan.RemainingAmount, monthlyPayment + 100, monthlyRate);
                scenarios.Add(("+$100/month", 100m, scenario100.months, scenario100.totalInterest));

                // Scenario 4: +$200/month
                var scenario200 = CalculateLoanPayoff(loan.RemainingAmount, monthlyPayment + 200, monthlyRate);
                scenarios.Add(("+$200/month", 200m, scenario200.months, scenario200.totalInterest));

                // Custom scenario if specified
                if (baseExtraPayment > 0 && baseExtraPayment != 50 && baseExtraPayment != 100 && baseExtraPayment != 200)
                {
                    var customScenario = CalculateLoanPayoff(loan.RemainingAmount, monthlyPayment + baseExtraPayment, monthlyRate);
                    scenarios.Add(($"+${baseExtraPayment}/month", baseExtraPayment, customScenario.months, customScenario.totalInterest));
                }

                insights.Add($"\n   **Payoff Scenarios:**");
                
                foreach (var (name, extra, months, totalInterest) in scenarios)
                {
                    var years = months / 12;
                    var remainingMonths = months % 12;
                    var timeReduction = currentScenario.months - months;
                    var interestSaved = currentScenario.totalInterest - totalInterest;

                    var timeStr = years > 0 
                        ? $"{years} year{(years != 1 ? "s" : "")}" + (remainingMonths > 0 ? $" {remainingMonths} month{(remainingMonths != 1 ? "s" : "")}" : "")
                        : $"{remainingMonths} month{(remainingMonths != 1 ? "s" : "")}";

                    insights.Add($"\n   {(extra == 0 ? "📍" : "🚀")} **{name}** (${monthlyPayment + extra:N2}/month)");
                    insights.Add($"      Time to payoff: {timeStr}");
                    insights.Add($"      Total interest: ${totalInterest:N2}");
                    
                    if (extra > 0)
                    {
                        insights.Add($"      ⏱️ Saves {timeReduction} months");
                        insights.Add($"      💰 Saves ${interestSaved:N2} in interest");
                        
                        var payoffDate = DateTime.UtcNow.AddMonths(months);
                        insights.Add($"      🎯 Debt-free by: {payoffDate:MMMM yyyy}");
                    }
                }
                insights.Add("");
            }

            // Overall recommendation
            insights.Add("💡 **Recommendation:**");
            
            var bestScenario = loans.First();
            var currentMonthlyPayment = bestScenario.InstallmentAmount ?? 100m;
            var recommendedExtra = 100m;
            var recommendedTotal = currentMonthlyPayment + recommendedExtra;

            insights.Add($"If you can afford an extra **${recommendedExtra}/month** on your largest loan:");
            var recommendedCalc = CalculateLoanPayoff(
                bestScenario.RemainingAmount,
                recommendedTotal,
                (bestScenario.InterestRate ?? 0) / 12 / 100
            );
            
            insights.Add($"• You'll be debt-free in **{recommendedCalc.months / 12} years {recommendedCalc.months % 12} months**");
            insights.Add($"• Save **${CalculateLoanPayoff(bestScenario.RemainingAmount, currentMonthlyPayment, (bestScenario.InterestRate ?? 0) / 12 / 100).totalInterest - recommendedCalc.totalInterest:N2}** in interest");
            insights.Add($"\n🎉 Even small extra payments make a BIG difference!");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    loans = loans.Take(3),
                    scenarios = "multiple",
                    totalOutstanding = totalRemaining
                },
                QuickActions = new List<string>
                {
                    "When will I be debt-free?",
                    "What if I reduce spending?",
                    "Show payment schedule"
                },
                ActionLink = "/loans"
            };
        }

        /// <summary>
        /// Calculate loan payoff timeline
        /// </summary>
        private (int months, decimal totalInterest) CalculateLoanPayoff(decimal principal, decimal monthlyPayment, decimal monthlyRate)
        {
            if (monthlyPayment <= 0 || principal <= 0)
                return (0, 0);

            decimal balance = principal;
            decimal totalInterest = 0;
            int months = 0;
            int maxMonths = 600; // 50 years max

            while (balance > 0 && months < maxMonths)
            {
                var interest = balance * monthlyRate;
                totalInterest += interest;
                var principalPayment = Math.Min(monthlyPayment - interest, balance);
                
                if (principalPayment <= 0)
                {
                    // Payment doesn't cover interest - loan will never be paid off
                    return (maxMonths, totalInterest * maxMonths);
                }

                balance -= principalPayment;
                months++;
            }

            return (months, totalInterest);
        }

        /// <summary>
        /// Calculate when user will be debt-free
        /// </summary>
        private async Task<ChatbotResponse> GetDebtFreeTimelineAsync(string userId, string language = "en")
        {
            var loans = await _dbContext.Loans
                .Where(l => l.UserId == userId && !l.IsSettled)
                .OrderBy(l => l.NextPaymentDate)
                .ToListAsync();

            if (!loans.Any())
            {
                var debtFreeMessage = language == "el"
                    ? "🎉 **Είστε ήδη χρέος-ελεύθεροι!** Συγχαρητήρια!\n\nΑυτό είναι ένα σημαντικό οικονομικό ορόσημο. Τώρα μπορείτε να εστιάσετε στη δόμηση πλούτου και στην επίτευξη των οικονομικών σας στόχων! 💰\n\nΣκεφτείτε:\n• Δόμηση ταμείου έκτακτης ανάγκης\n• Επενδύσεις για το μέλλον\n• Ορισμός φιλόδοξων στόχων αποταμίευσης"
                    : "🎉 **You're already debt-free!** Congratulations!\n\nThis is a major financial milestone. Now you can focus on building wealth and achieving your financial goals! 💰\n\nConsider:\n• Building an emergency fund\n• Investing for the future\n• Setting ambitious savings goals";
                
                var debtFreeQuickActions = language == "el"
                    ? new List<string>
                    {
                        "Τι θα γίνει αν αποταμιεύσω περισσότερο;",
                        "Δείξε προβολή πλούτου",
                        "Δημιουργία στόχου αποταμίευσης"
                    }
                    : new List<string>
                    {
                        "What if I save more?",
                        "Show wealth projection",
                        "Create a savings goal"
                    };

                return new ChatbotResponse
                {
                    Message = debtFreeMessage,
                    Type = "insight",
                    QuickActions = debtFreeQuickActions
                };
            }

            var insights = new List<string>();
            var totalDebt = loans.Sum(l => l.RemainingAmount);
            var totalMonthlyPayment = loans.Sum(l => l.InstallmentAmount ?? 0);
            var sortedLoans = loans.OrderByDescending(l => l.InterestRate ?? 0).ToList();

            if (language == "el")
            {
                insights.Add("🎯 **Διαδρομή προς την Ελευθερία από Χρέη**\n");
                insights.Add($"**Τρέχον Χρέος:** ${totalDebt:N2}");
                insights.Add($"**Συνολικές Μηνιαίες Πληρωμές:** ${totalMonthlyPayment:N2}\n");
                insights.Add("📅 **Χρονοδιάγραμμα Ξεπληρωμής (Μέθοδος Χιονοστιβάδας):**\n");
            }
            else
            {
                insights.Add("🎯 **Path to Debt Freedom**\n");
                insights.Add($"**Current Debt:** ${totalDebt:N2}");
                insights.Add($"**Total Monthly Payments:** ${totalMonthlyPayment:N2}\n");
                insights.Add("📅 **Debt Payoff Timeline (Avalanche Method):**\n");
            }

            var currentMonth = 0;
            var totalInterestPaid = 0m;

            foreach (var loan in sortedLoans)
            {
                var monthlyPayment = loan.InstallmentAmount ?? 100m;
                var monthlyRate = (loan.InterestRate ?? 0) / 12 / 100;
                var payoff = CalculateLoanPayoff(loan.RemainingAmount, monthlyPayment, monthlyRate);

                var payoffDate = DateTime.UtcNow.AddMonths(currentMonth + payoff.months);
                
                if (language == "el")
                {
                    insights.Add($"📍 **{loan.Description ?? "Δάνειο"}**");
                    insights.Add($"   Ποσό: ${loan.RemainingAmount:N2}");
                    insights.Add($"   Επιτόκιο: {loan.InterestRate ?? 0:F2}%");
                    insights.Add($"   Ξεπληρωμή: {payoffDate:MMMM yyyy} ({payoff.months} μήνες)");
                    insights.Add($"   Τόκοι: ${payoff.totalInterest:N2}\n");
                }
                else
                {
                    insights.Add($"📍 **{loan.Description ?? "Loan"}**");
                    insights.Add($"   Amount: ${loan.RemainingAmount:N2}");
                    insights.Add($"   Rate: {loan.InterestRate ?? 0:F2}%");
                    insights.Add($"   Payoff: {payoffDate:MMMM yyyy} ({payoff.months} months)");
                    insights.Add($"   Interest: ${payoff.totalInterest:N2}\n");
                }

                currentMonth += payoff.months;
                totalInterestPaid += payoff.totalInterest;
            }

            var debtFreeDate = DateTime.UtcNow.AddMonths(currentMonth);
            
            if (language == "el")
            {
                insights.Add($"🎉 **Ημερομηνία Ελευθερίας από Χρέη:** {debtFreeDate:MMMM dd, yyyy}");
                insights.Add($"   Αυτό είναι **{currentMonth / 12} χρόνια {currentMonth % 12} μήνες** από τώρα!");
                insights.Add($"   Συνολικοί τόκοι: ${totalInterestPaid:N2}\n");
                insights.Add("🚀 **Επιτάχυνε το Χρονοδιάγραμμά σου:**\n");
            }
            else
            {
                insights.Add($"🎉 **Debt-Free Date:** {debtFreeDate:MMMM dd, yyyy}");
                insights.Add($"   That's **{currentMonth / 12} years {currentMonth % 12} months** from now!");
                insights.Add($"   Total interest: ${totalInterestPaid:N2}\n");
                insights.Add("🚀 **Accelerate Your Timeline:**\n");
            }

            var extraPayments = new[] { 50m, 100m, 200m, 500m };
            foreach (var extra in extraPayments)
            {
                var acceleratedMonths = 0;
                var acceleratedInterest = 0m;

                foreach (var loan in sortedLoans)
                {
                    var monthlyPayment = (loan.InstallmentAmount ?? 100m) + extra;
                    var monthlyRate = (loan.InterestRate ?? 0) / 12 / 100;
                    var payoff = CalculateLoanPayoff(loan.RemainingAmount, monthlyPayment, monthlyRate);
                    acceleratedMonths += payoff.months;
                    acceleratedInterest += payoff.totalInterest;
                }

                var timeSaved = currentMonth - acceleratedMonths;
                var interestSaved = totalInterestPaid - acceleratedInterest;
                var newDebtFreeDate = DateTime.UtcNow.AddMonths(acceleratedMonths);

                if (language == "el")
                {
                    insights.Add($"💰 Επιπλέον **${extra}/μήνα**: Χρέος-ελεύθερος μέχρι **{newDebtFreeDate:MMM yyyy}**");
                    insights.Add($"   ⏱️ Εξοικονόμηση {timeSaved} μηνών • 💵 Εξοικονόμηση ${interestSaved:N2} τόκων\n");
                }
                else
                {
                    insights.Add($"💰 Extra **${extra}/month**: Debt-free by **{newDebtFreeDate:MMM yyyy}**");
                    insights.Add($"   ⏱️ Save {timeSaved} months • 💵 Save ${interestSaved:N2} interest\n");
                }
            }

            if (language == "el")
            {
                insights.Add("💡 **Έξυπνες Στρατηγικές Χρέους:**");
                insights.Add("✓ Εστίαση πρώτα στα δάνεια με το υψηλότερο επιτόκιο (Χιονοστιβάδα)");
                insights.Add("✓ Κάντε πληρωμές δύο φορές την εβδομάδα αντί για μηνιαία");
                insights.Add("✓ Εφαρμόστε απροσδόκητα κέρδη (μπόνους, επιστροφές φόρων) στο χρέος");
                insights.Add("✓ Στρογγυλοποίηση πληρωμών στο πλησιέστερο $100");
                insights.Add("✓ Αποφύγετε τη λήψη νέων χρεών");
            }
            else
            {
                insights.Add("💡 **Smart Debt Strategies:**");
                insights.Add("✓ Focus on highest interest rate loans first (Avalanche)");
                insights.Add("✓ Make bi-weekly payments instead of monthly");
                insights.Add("✓ Apply windfalls (bonuses, tax refunds) to debt");
                insights.Add("✓ Round up payments to nearest $100");
                insights.Add("✓ Avoid taking on new debt");
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε σενάρια δανείων",
                    "Τι θα γίνει αν πληρώσω επιπλέον;",
                    "Πώς μπορώ να αποταμιεύσω χρήματα;"
                }
                : new List<string>
                {
                    "Show loan scenarios",
                    "What if I pay extra?",
                    "How can I save money?"
                };

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    totalDebt,
                    debtFreeMonths = currentMonth,
                    debtFreeDate,
                    totalInterestPaid,
                    loans = sortedLoans
                },
                QuickActions = quickActions,
                ActionLink = "/loans"
            };
        }

        /// <summary>
        /// What-if scenario for reducing spending
        /// </summary>
        private async Task<ChatbotResponse> GetWhatIfReduceSpendingAsync(string userId, string query, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Get current spending
            var currentMonthExpenses = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= monthStart)
                .SumAsync(t => t.Amount);

            var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
            var projectedMonthly = (currentMonthExpenses / now.Day) * daysInMonth;

            // Extract reduction amount or percentage from query
            var amountMatch = Regex.Match(query, @"(\d+)");
            var reductionAmount = amountMatch.Success ? decimal.Parse(amountMatch.Groups[1].Value) : 100m;
            
            // Determine if it's a percentage or dollar amount
            var isPercentage = query.Contains("%") || query.Contains("percent");
            var reductionPercent = isPercentage ? reductionAmount : 10m; // Default 10%
            var reductionDollar = isPercentage ? projectedMonthly * (reductionAmount / 100) : reductionAmount;

            var insights = new List<string>();
            insights.Add("🎯 **What-If Spending Reduction Scenario**\n");

            insights.Add($"**Current Projected Monthly Spending:** ${projectedMonthly:N2}\n");

            insights.Add("📊 **Reduction Scenarios:**\n");

            var scenarios = new[] { 5m, 10m, 15m, 20m, 25m };
            foreach (var percent in scenarios)
            {
                var reduction = projectedMonthly * (percent / 100);
                var newMonthly = projectedMonthly - reduction;
                var yearlySavings = reduction * 12;
                
                insights.Add($"💰 **{percent:F0}% Reduction** (${reduction:N2}/month)");
                insights.Add($"   New monthly spending: ${newMonthly:N2}");
                insights.Add($"   Annual savings: **${yearlySavings:N2}**");
                
                // Project wealth accumulation
                var fiveYearSavings = yearlySavings * 5;
                var tenYearSavings = yearlySavings * 10;
                var withInterest = CalculateCompoundInterest(0, reduction, 12, 0.05m, 10); // 5% annual return
                
                insights.Add($"   📈 In 5 years: ${fiveYearSavings:N2}");
                insights.Add($"   🚀 In 10 years: ${withInterest:N2} (with 5% returns)\n");
            }

            // Find savings goals and show impact
            var savingsGoals = await _dbContext.SavingsGoals
                .Where(g => g.UserId == userId && !g.IsAchieved)
                .ToListAsync();

            if (savingsGoals.Any())
            {
                insights.Add("🎯 **Impact on Your Goals:**\n");
                
                var goal = savingsGoals.OrderByDescending(g => g.TargetAmount).First();
                var remaining = goal.TargetAmount - goal.CurrentAmount;
                
                foreach (var percent in new[] { 10m, 20m })
                {
                    var monthlySavings = projectedMonthly * (percent / 100);
                    var monthsToGoal = remaining / monthlySavings;
                    var goalDate = DateTime.UtcNow.AddMonths((int)Math.Ceiling(monthsToGoal));
                    
                    insights.Add($"📍 With {percent:F0}% reduction (${monthlySavings:N2}/month):");
                    insights.Add($"   Reach **{goal.Name}** by **{goalDate:MMMM yyyy}**");
                    insights.Add($"   That's {Math.Ceiling(monthsToGoal)} months!\n");
                }
            }

            insights.Add("💡 **How to Achieve Reductions:**");
            insights.Add("✓ Track every expense for 30 days");
            insights.Add("✓ Identify and eliminate one unnecessary subscription");
            insights.Add("✓ Meal prep and cook at home 3-4 times per week");
            insights.Add("✓ Use the 24-hour rule for non-essential purchases");
            insights.Add("✓ Switch to generic brands where possible");
            insights.Add("✓ Negotiate bills and subscriptions");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    currentMonthly = projectedMonthly,
                    scenarios = scenarios.Select(p => new
                    {
                        reductionPercent = p,
                        monthlySavings = projectedMonthly * (p / 100),
                        yearlySavings = projectedMonthly * (p / 100) * 12
                    })
                },
                QuickActions = new List<string>
                {
                    "Show me my top expenses",
                    "How can I save money?",
                    "Set a budget"
                },
                ActionLink = "/analytics"
            };
        }

        /// <summary>
        /// Calculate compound interest
        /// </summary>
        private decimal CalculateCompoundInterest(decimal principal, decimal monthlyContribution, int contributionsPerYear, decimal annualRate, int years)
        {
            var n = contributionsPerYear;
            var t = years;
            var r = annualRate;
            var pmt = monthlyContribution;
            
            // Future value of series formula
            var fv = principal * (decimal)Math.Pow((double)(1 + r / n), (double)(n * t));
            var fvContributions = pmt * (((decimal)Math.Pow((double)(1 + r / n), (double)(n * t)) - 1) / (r / n));
            
            return fv + fvContributions;
        }

        /// <summary>
        /// Category optimization scenarios
        /// </summary>
        private async Task<ChatbotResponse> GetCategoryOptimizationAsync(string userId, string query, string language = "en")
        {
            var category = ExtractCategory(query);
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= monthStart)
                .Where(t => t.Category.ToLower().Contains(category.ToLower()))
                .ToListAsync();

            if (!transactions.Any())
            {
                return new ChatbotResponse
                {
                    Message = $"You haven't spent anything on {category} this month yet. Great restraint! 💪",
                    Type = "text",
                    QuickActions = new List<string>
                    {
                        "Show all categories",
                        "What if I reduce spending?",
                        "Give me spending insights"
                    }
                };
            }

            var currentSpending = transactions.Sum(t => t.Amount);
            var transactionCount = transactions.Count;
            var avgPerTransaction = currentSpending / transactionCount;

            var insights = new List<string>();
            insights.Add($"🎯 **Optimize {category.ToUpper()} Spending**\n");

            insights.Add($"**Current Status:**");
            insights.Add($"• Monthly spending: ${currentSpending:N2}");
            insights.Add($"• Transactions: {transactionCount}");
            insights.Add($"• Average per transaction: ${avgPerTransaction:N2}\n");

            insights.Add("💰 **Optimization Scenarios:**\n");

            var reductionLevels = new[] { 
                (level: "Conservative", percent: 10m, difficulty: "Easy"),
                (level: "Moderate", percent: 20m, difficulty: "Moderate"),
                (level: "Aggressive", percent: 30m, difficulty: "Challenging"),
                (level: "Extreme", percent: 50m, difficulty: "Difficult")
            };

            foreach (var (level, percent, difficulty) in reductionLevels)
            {
                var reduction = currentSpending * (percent / 100);
                var newSpending = currentSpending - reduction;
                var yearlySavings = reduction * 12;

                insights.Add($"📊 **{level}** ({percent:F0}% reduction) - {difficulty}");
                insights.Add($"   New monthly: ${newSpending:N2} (save ${reduction:N2}/month)");
                insights.Add($"   Annual savings: **${yearlySavings:N2}**");
                insights.Add($"   5-year impact: **${yearlySavings * 5:N2}**\n");
            }

            // Category-specific strategies
            insights.Add($"💡 **Specific Strategies for {category}:**");
            insights.Add(GetDetailedCategoryTips(category));

            // Behavioral insights
            insights.Add($"\n📊 **Your Spending Pattern:**");
            var topTransactions = transactions.OrderByDescending(t => t.Amount).Take(3);
            foreach (var t in topTransactions)
            {
                insights.Add($"• ${t.Amount:N2} - {t.Description ?? category} ({t.Date:MMM dd})");
            }

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    category,
                    currentSpending,
                    transactionCount,
                    scenarios = reductionLevels.Select(r => new
                    {
                        level = r.level,
                        monthlySavings = currentSpending * (r.percent / 100),
                        yearlySavings = currentSpending * (r.percent / 100) * 12
                    })
                },
                QuickActions = new List<string>
                {
                    "Show all categories",
                    "Set a budget",
                    "What if I save more?"
                },
                ActionLink = "/expenses"
            };
        }

        /// <summary>
        /// Get detailed category tips
        /// </summary>
        private string GetDetailedCategoryTips(string category)
        {
            return category.ToLower() switch
            {
                var c when c.Contains("food") || c.Contains("groceries") =>
                    "✓ Create weekly meal plans\n" +
                    "   ✓ Buy store brands for staples\n" +
                    "   ✓ Shop with a list and stick to it\n" +
                    "   ✓ Buy in bulk for non-perishables\n" +
                    "   ✓ Use cashback apps (Ibotta, Fetch)\n" +
                    "   ✓ Shop discount stores (Aldi, Costco)",
                
                var c when c.Contains("dining") || c.Contains("restaurant") =>
                    "✓ Limit dining out to 1-2x per week\n" +
                    "   ✓ Use restaurant gift cards at discount\n" +
                    "   ✓ Take advantage of happy hours\n" +
                    "   ✓ Pack lunch for work\n" +
                    "   ✓ Cook meals at home together\n" +
                    "   ✓ Use dining rewards apps",
                
                var c when c.Contains("transport") || c.Contains("travel") =>
                    "✓ Carpool or use public transit\n" +
                    "   ✓ Combine errands into one trip\n" +
                    "   ✓ Maintain vehicle to improve efficiency\n" +
                    "   ✓ Use gas rewards programs\n" +
                    "   ✓ Consider biking for short trips\n" +
                    "   ✓ Compare gas prices with apps",
                
                var c when c.Contains("entertainment") || c.Contains("fun") =>
                    "✓ Use free community events\n" +
                    "   ✓ Rotate streaming services monthly\n" +
                    "   ✓ Look for happy hours and specials\n" +
                    "   ✓ Use library for books/movies\n" +
                    "   ✓ Host potluck game nights\n" +
                    "   ✓ Explore outdoor activities",
                
                var c when c.Contains("shopping") || c.Contains("clothes") =>
                    "✓ Wait 24 hours before buying\n" +
                    "   ✓ Shop secondhand/thrift stores\n" +
                    "   ✓ Use cashback credit cards\n" +
                    "   ✓ Buy out of season\n" +
                    "   ✓ Unsubscribe from promo emails\n" +
                    "   ✓ Create a want vs need list",
                
                var c when c.Contains("bills") || c.Contains("utilities") =>
                    "✓ Call providers to negotiate rates\n" +
                    "   ✓ Bundle services for discounts\n" +
                    "   ✓ Reduce energy/water usage\n" +
                    "   ✓ Cancel unused subscriptions\n" +
                    "   ✓ Switch to LED bulbs\n" +
                    "   ✓ Use programmable thermostat",
                
                _ =>
                    "✓ Track every expense\n" +
                    "   ✓ Set a monthly budget\n" +
                    "   ✓ Look for cheaper alternatives\n" +
                    "   ✓ Use the 30-day rule for purchases\n" +
                    "   ✓ Ask for discounts\n" +
                    "   ✓ Review expenses monthly"
            };
        }

        /// <summary>
        /// Calculate financial milestones and timelines
        /// </summary>
        private async Task<ChatbotResponse> GetFinancialMilestonesAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Get financial data
            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId, monthStart, now);
            var loans = await _dbContext.Loans.Where(l => l.UserId == userId && !l.IsSettled).ToListAsync();
            var goals = await _dbContext.SavingsGoals.Where(g => g.UserId == userId && !g.IsAchieved).ToListAsync();

            var monthlySavings = analytics.Balance;
            var monthlySavingsRate = analytics.TotalIncome > 0 ? monthlySavings / analytics.TotalIncome : 0;

            var insights = new List<string>();
            insights.Add("🎯 **Your Financial Milestones Timeline**\n");

            // Current status
            insights.Add($"**Current Financial Position:**");
            insights.Add($"• Monthly Savings: ${monthlySavings:N2} ({monthlySavingsRate * 100:F1}%)");
            insights.Add($"• Active Debts: {loans.Count} (${loans.Sum(l => l.RemainingAmount):N2})");
            insights.Add($"• Active Goals: {goals.Count}\n");

            // Define milestone targets
            var milestones = new List<(string name, decimal amount, string category, int priority)>
            {
                ("Emergency Fund (1 month)", analytics.TotalExpenses * 1, "Safety Net", 1),
                ("Emergency Fund (3 months)", analytics.TotalExpenses * 3, "Safety Net", 2),
                ("Emergency Fund (6 months)", analytics.TotalExpenses * 6, "Safety Net", 3),
                ("First $10K Savings", 10000m, "Wealth Building", 4),
                ("First $25K Net Worth", 25000m, "Wealth Building", 5),
                ("First $50K Net Worth", 50000m, "Wealth Building", 6),
                ("First $100K Net Worth", 100000m, "Major Milestone", 7),
            };

            insights.Add("📅 **Milestone Timeline (Based on Current Savings Rate):**\n");

            var cumulativeSavings = 0m;
            var currentMonth = 0;

            foreach (var (name, amount, category, priority) in milestones.Take(5))
            {
                if (monthlySavings <= 0)
                {
                    insights.Add($"⚠️ Unable to project milestones - currently spending more than earning");
                    break;
                }

                var monthsNeeded = (amount - cumulativeSavings) / monthlySavings;
                currentMonth += (int)Math.Ceiling(monthsNeeded);
                var targetDate = DateTime.UtcNow.AddMonths(currentMonth);
                
                cumulativeSavings = amount;

                var years = currentMonth / 12;
                var months = currentMonth % 12;
                var timeStr = years > 0 
                    ? $"{years}y {months}m"
                    : $"{months}m";

                var emoji = category switch
                {
                    "Safety Net" => "🛡️",
                    "Wealth Building" => "💰",
                    "Major Milestone" => "🎉",
                    _ => "🎯"
                };

                insights.Add($"{emoji} **{name}** - ${amount:N0}");
                insights.Add($"   Target: {targetDate:MMMM yyyy} ({timeStr})");
                insights.Add($"   Category: {category}\n");
            }

            // Debt-free milestone
            if (loans.Any())
            {
                var totalMonthlyPayment = loans.Sum(l => l.InstallmentAmount ?? 100m);
                var totalDebt = loans.Sum(l => l.RemainingAmount);
                var estimatedMonths = (int)(totalDebt / totalMonthlyPayment);
                var debtFreeDate = DateTime.UtcNow.AddMonths(estimatedMonths);

                insights.Add($"💳 **Debt-Free Milestone**");
                insights.Add($"   Target: {debtFreeDate:MMMM yyyy}");
                insights.Add($"   After this, +${totalMonthlyPayment:N2}/month for savings!\n");
            }

            // Accelerated timeline
            if (monthlySavings > 0)
            {
                insights.Add("🚀 **Accelerate Your Timeline:**\n");

                var increases = new[] { 100m, 200m, 500m };
                foreach (var increase in increases)
                {
                    var newMonthlySavings = monthlySavings + increase;
                    var firstMilestone = milestones.First();
                    var monthsToFirst = firstMilestone.amount / newMonthlySavings;
                    var newDate = DateTime.UtcNow.AddMonths((int)Math.Ceiling(monthsToFirst));

                    var timeSaved = (firstMilestone.amount / monthlySavings) - monthsToFirst;
                    
                    insights.Add($"💰 Save extra ${increase}/month:");
                    insights.Add($"   Reach first milestone {timeSaved:F0} months earlier ({newDate:MMM yyyy})\n");
                }
            }

            insights.Add("💡 **Tips to Reach Milestones Faster:**");
            insights.Add("✓ Automate savings on payday");
            insights.Add("✓ Apply windfalls (bonuses, tax refunds) to goals");
            insights.Add("✓ Increase savings by 1% each quarter");
            insights.Add("✓ Review and reduce one expense monthly");
            insights.Add("✓ Side hustle or freelance for extra income");
            insights.Add("✓ Invest savings for compound growth");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    monthlySavings,
                    savingsRate = monthlySavingsRate * 100,
                    milestones = milestones.Take(5),
                    currentDebt = loans.Sum(l => l.RemainingAmount)
                },
                QuickActions = new List<string>
                {
                    "Show wealth projection",
                    "What if I save more?",
                    "Create savings goal"
                },
                ActionLink = "/savings-goals"
            };
        }

        /// <summary>
        /// Project long-term wealth accumulation
        /// </summary>
        private async Task<ChatbotResponse> GetWealthProjectionAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Get current financial position
            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId, monthStart, now);
            var goals = await _dbContext.SavingsGoals.Where(g => g.UserId == userId).ToListAsync();
            
            var currentSavings = goals.Sum(g => g.CurrentAmount);
            var monthlySavings = analytics.Balance;
            var annualIncome = analytics.TotalIncome * 12;

            var insights = new List<string>();
            insights.Add("🚀 **Long-Term Wealth Projection**\n");

            insights.Add($"**Starting Position:**");
            insights.Add($"• Current Savings: ${currentSavings:N2}");
            insights.Add($"• Monthly Savings: ${monthlySavings:N2}");
            insights.Add($"• Annual Income: ${annualIncome:N2}\n");

            if (monthlySavings <= 0)
            {
                insights.Add("⚠️ **Note:** Currently spending more than earning.\n");
                insights.Add("To build wealth, you need to:\n");
                insights.Add("1. Create a surplus by reducing expenses");
                insights.Add("2. Increase income through raises or side income");
                insights.Add("3. Start with small savings goals ($25-50/month)\n");
                
                return new ChatbotResponse
                {
                    Message = string.Join("\n", insights),
                    Type = "warning",
                    QuickActions = new List<string>
                    {
                        "How can I reduce spending?",
                        "Show me my expenses",
                        "Give me savings tips"
                    }
                };
            }

            insights.Add("📊 **Wealth Projection Scenarios:**\n");

            // Different investment return scenarios
            var returnRates = new[] 
            {
                (scenario: "Conservative (Savings Account)", rate: 0.02m, risk: "Very Low"),
                (scenario: "Moderate (Bonds/CD)", rate: 0.05m, risk: "Low"),
                (scenario: "Balanced (60/40 Portfolio)", rate: 0.07m, risk: "Medium"),
                (scenario: "Growth (Stock Market Avg)", rate: 0.10m, risk: "Medium-High"),
                (scenario: "Aggressive (Growth Stocks)", rate: 0.12m, risk: "High")
            };

            var timeframes = new[] { 5, 10, 20, 30 };

            foreach (var (scenario, rate, risk) in returnRates)
            {
                insights.Add($"💰 **{scenario}** ({rate * 100:F0}% return, {risk} risk)");

                foreach (var years in timeframes)
                {
                    var futureValue = CalculateCompoundInterest(currentSavings, monthlySavings, 12, rate, years);
                    var totalContributions = currentSavings + (monthlySavings * 12 * years);
                    var investmentGains = futureValue - totalContributions;

                    if (years == 10 || years == 30) // Show detail for key milestones
                    {
                        insights.Add($"   {years} years: **${futureValue:N0}**");
                        insights.Add($"   (Contributed: ${totalContributions:N0}, Gains: ${investmentGains:N0})");
                    }
                }
                insights.Add("");
            }

            // Specific milestone projections
            insights.Add("🎯 **When You'll Reach Key Milestones:**\n");

            var targetAmounts = new[] { 100000m, 250000m, 500000m, 1000000m };
            var defaultRate = 0.07m; // 7% balanced return

            foreach (var target in targetAmounts)
            {
                var years = CalculateYearsToReach(currentSavings, monthlySavings, defaultRate, target);
                if (years > 0 && years < 50)
                {
                    var targetDate = DateTime.UtcNow.AddYears(years);
                    var emoji = target switch
                    {
                        >= 1000000 => "💎",
                        >= 500000 => "🏆",
                        >= 250000 => "🌟",
                        _ => "🎯"
                    };
                    
                    insights.Add($"{emoji} **${target:N0}** by {targetDate.Year} ({years} years)");
                }
            }

            insights.Add("\n💡 **Wealth-Building Strategies:**");
            insights.Add("✓ Start investing early - time is your biggest advantage");
            insights.Add("✓ Maximize employer 401(k) match (free money!)");
            insights.Add("✓ Open Roth IRA for tax-free growth");
            insights.Add("✓ Invest consistently, even small amounts");
            insights.Add("✓ Increase savings rate by 1% annually");
            insights.Add("✓ Reinvest dividends and returns");
            insights.Add("✓ Stay invested through market ups and downs");
            
            insights.Add("\n⚠️ **Important Notes:**");
            insights.Add("• Past returns don't guarantee future results");
            insights.Add("• Higher returns come with higher risk");
            insights.Add("• Diversification is key to managing risk");
            insights.Add("• Consider speaking with a financial advisor");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    currentSavings,
                    monthlySavings,
                    projections = returnRates.Select(r => new
                    {
                        scenario = r.scenario,
                        rate = r.rate,
                        year10 = CalculateCompoundInterest(currentSavings, monthlySavings, 12, r.rate, 10),
                        year20 = CalculateCompoundInterest(currentSavings, monthlySavings, 12, r.rate, 20),
                        year30 = CalculateCompoundInterest(currentSavings, monthlySavings, 12, r.rate, 30)
                    })
                },
                QuickActions = new List<string>
                {
                    "Show financial milestones",
                    "What if I save more?",
                    "How can I increase savings?"
                },
                ActionLink = "/savings-goals"
            };
        }

        /// <summary>
        /// Calculate years to reach target wealth
        /// </summary>
        private int CalculateYearsToReach(decimal principal, decimal monthlyContribution, decimal annualRate, decimal target)
        {
            if (monthlyContribution <= 0 || principal >= target)
                return 0;

            var monthlyRate = annualRate / 12;
            var balance = principal;
            var months = 0;
            var maxMonths = 600; // 50 years max

            while (balance < target && months < maxMonths)
            {
                balance += monthlyContribution;
                balance *= (1 + monthlyRate);
                months++;
            }

            return months / 12;
        }

        // ============================================
        // EXTENDED FINANCIAL EXPERTISE
        // ============================================

        /// <summary>
        /// Tax planning and optimization tips based on spending patterns
        /// </summary>
        private async Task<ChatbotResponse> GetTaxPlanningTipsAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var yearStart = new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc);

            var yearlyTransactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Date >= yearStart)
                .ToListAsync();

            var insights = new List<string>();
            insights.Add("💼 **Tax Planning & Optimization Tips**\n");

            var totalExpenses = yearlyTransactions.Where(t => t.Type == "expense").Sum(t => t.Amount);
            var totalIncome = yearlyTransactions.Where(t => t.Type == "income").Sum(t => t.Amount);

            insights.Add($"**Year-to-Date Summary (Jan-{now:MMM}):**");
            insights.Add($"• Total Income: ${totalIncome:N2}");
            insights.Add($"• Total Expenses: ${totalExpenses:N2}\n");

            // Potentially deductible categories
            var deductibleCategories = new Dictionary<string, string>
            {
                { "health", "Medical & Health Expenses" },
                { "medical", "Medical & Health Expenses" },
                { "home", "Home Office & Mortgage Interest" },
                { "education", "Education & Professional Development" },
                { "charity", "Charitable Donations" },
                { "donation", "Charitable Donations" }
            };

            var potentialDeductions = new Dictionary<string, decimal>();
            foreach (var (keyword, category) in deductibleCategories)
            {
                var amount = yearlyTransactions
                    .Where(t => t.Type == "expense" && t.Category.ToLower().Contains(keyword))
                    .Sum(t => t.Amount);
                
                if (amount > 0)
                {
                    potentialDeductions[category] = amount;
                }
            }

            if (potentialDeductions.Any())
            {
                insights.Add("📋 **Potential Tax Deductions Found:**\n");
                var totalDeductions = 0m;
                foreach (var (category, amount) in potentialDeductions.OrderByDescending(kvp => kvp.Value))
                {
                    insights.Add($"✓ {category}: ${amount:N2}");
                    totalDeductions += amount;
                }
                
                var estimatedTaxSavings = totalDeductions * 0.22m; // Assuming 22% tax bracket
                insights.Add($"\n💰 Total Potential Deductions: **${totalDeductions:N2}**");
                insights.Add($"   Estimated Tax Savings: **${estimatedTaxSavings:N2}** (at 22% bracket)\n");
            }

            insights.Add("💡 **Tax-Smart Strategies:**\n");
            
            insights.Add("**💰 Maximize Deductions:**");
            insights.Add("✓ Keep receipts for medical expenses over 7.5% of income");
            insights.Add("✓ Track home office expenses if self-employed");
            insights.Add("✓ Document charitable donations (cash & items)");
            insights.Add("✓ Save education/professional development receipts");
            insights.Add("✓ Track business mileage and expenses\n");

            insights.Add("**📊 Smart Tax Moves:**");
            insights.Add("✓ Max out retirement contributions (401k, IRA)");
            insights.Add("   → 401k: up to $23,000/year (2024)");
            insights.Add("   → IRA: up to $7,000/year");
            insights.Add("✓ Use HSA for triple tax advantage");
            insights.Add("✓ Harvest tax losses in investment accounts");
            insights.Add("✓ Time large deductible expenses strategically");
            insights.Add("✓ Consider bunching deductions in one year\n");

            insights.Add("**🎓 Tax-Advantaged Accounts:**");
            insights.Add("✓ 529 Plan for education savings");
            insights.Add("✓ FSA for healthcare & dependent care");
            insights.Add("✓ Roth IRA for tax-free retirement");
            insights.Add("✓ HSA for medical expenses (triple tax benefit!)\n");

            insights.Add("**📅 Important Dates:**");
            insights.Add($"• Tax Filing Deadline: April 15, {now.Year + 1}");
            insights.Add($"• Q4 Estimated Tax: January 15, {now.Year + 1}");
            insights.Add($"• IRA Contribution Deadline: April 15, {now.Year + 1}");
            insights.Add($"• Extension Deadline: October 15, {now.Year + 1}\n");

            insights.Add("⚠️ **Remember:**");
            insights.Add("• This is educational information, not tax advice");
            insights.Add("• Consult a CPA or tax professional for your situation");
            insights.Add("• Keep organized records throughout the year");
            insights.Add("• Review tax law changes annually");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    yearlyIncome = totalIncome,
                    yearlyExpenses = totalExpenses,
                    potentialDeductions,
                    estimatedSavings = potentialDeductions.Sum(kvp => kvp.Value) * 0.22m
                },
                QuickActions = new List<string>
                {
                    "Show my health expenses",
                    "Give me spending insights",
                    "How can I save money?"
                }
            };
        }

        /// <summary>
        /// Calculate comprehensive financial health score
        /// </summary>
        private async Task<ChatbotResponse> GetFinancialHealthScoreAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId, monthStart, now);
            var loans = await _dbContext.Loans.Where(l => l.UserId == userId).ToListAsync();
            var goals = await _dbContext.SavingsGoals.Where(g => g.UserId == userId).ToListAsync();
            var budgets = await _dbContext.Budgets.Where(b => b.UserId == userId && b.IsActive).ToListAsync();

            var insights = new List<string>();
            insights.Add("📊 **Your Financial Health Score**\n");

            // Calculate individual scores
            var scores = new Dictionary<string, (int score, string status, string emoji)>();

            // 1. Savings Rate (20 points)
            var savingsRate = analytics.TotalIncome > 0 ? (analytics.Balance / analytics.TotalIncome) : 0;
            var savingsScore = savingsRate >= 0.20m ? 20 :
                              savingsRate >= 0.15m ? 16 :
                              savingsRate >= 0.10m ? 12 :
                              savingsRate >= 0.05m ? 8 : 4;
            scores["Savings Rate"] = (savingsScore, $"{savingsRate * 100:F1}%", "💰");

            // 2. Debt Management (20 points)
            var activeLoans = loans.Where(l => !l.IsSettled).ToList();
            var totalDebt = activeLoans.Sum(l => l.RemainingAmount);
            var debtToIncome = analytics.TotalIncome > 0 ? totalDebt / (analytics.TotalIncome * 12) : 0;
            var debtScore = debtToIncome == 0 ? 20 :
                           debtToIncome < 0.20m ? 16 :
                           debtToIncome < 0.36m ? 12 :
                           debtToIncome < 0.50m ? 8 : 4;
            scores["Debt Management"] = (debtScore, $"{debtToIncome * 100:F0}% debt-to-income", "💳");

            // 3. Budget Adherence (20 points)
            var budgetScore = 10; // Default if no budgets
            if (budgets.Any())
            {
                var overBudget = budgets.Count(b => b.SpentAmount > b.Amount);
                budgetScore = overBudget == 0 ? 20 :
                             overBudget == 1 ? 15 :
                             overBudget == 2 ? 10 : 5;
                scores["Budget Adherence"] = (budgetScore, $"{budgets.Count - overBudget}/{budgets.Count} on track", "🎯");
            }
            else
            {
                scores["Budget Adherence"] = (budgetScore, "No budgets set", "🎯");
            }

            // 4. Emergency Fund (20 points)
            var currentSavings = goals.Sum(g => g.CurrentAmount);
            var monthsOfExpenses = analytics.TotalExpenses > 0 ? currentSavings / analytics.TotalExpenses : 0;
            var emergencyScore = monthsOfExpenses >= 6 ? 20 :
                                monthsOfExpenses >= 3 ? 15 :
                                monthsOfExpenses >= 1 ? 10 :
                                monthsOfExpenses > 0 ? 5 : 0;
            scores["Emergency Fund"] = (emergencyScore, $"{monthsOfExpenses:F1} months", "🛡️");

            // 5. Financial Goals (20 points)
            var goalsScore = goals.Any() ? 10 : 0;
            if (goals.Any())
            {
                var avgProgress = goals.Average(g => g.TargetAmount > 0 ? (g.CurrentAmount / g.TargetAmount) : 0);
                goalsScore += avgProgress >= 0.75m ? 10 :
                             avgProgress >= 0.50m ? 7 :
                             avgProgress >= 0.25m ? 5 : 3;
                scores["Financial Goals"] = (goalsScore, $"{avgProgress * 100:F0}% avg progress", "🎯");
            }
            else
            {
                scores["Financial Goals"] = (goalsScore, "No goals set", "🎯");
            }

            // Calculate total score
            var totalScore = scores.Sum(kvp => kvp.Value.score);
            var grade = totalScore >= 90 ? "A" :
                       totalScore >= 80 ? "B" :
                       totalScore >= 70 ? "C" :
                       totalScore >= 60 ? "D" : "F";

            var gradeEmoji = grade switch
            {
                "A" => "🌟",
                "B" => "✅",
                "C" => "📊",
                "D" => "⚠️",
                _ => "❌"
            };

            insights.Add($"**Overall Score: {totalScore}/100** {gradeEmoji}");
            insights.Add($"**Grade: {grade}**\n");

            insights.Add("📈 **Score Breakdown:**\n");
            foreach (var (category, (score, status, emoji)) in scores.OrderByDescending(kvp => kvp.Value.score))
            {
                var percentage = (score / 20m) * 100;
                var bar = new string('█', score / 2) + new string('░', 10 - (score / 2));
                insights.Add($"{emoji} **{category}**: {score}/20");
                insights.Add($"   {bar} {percentage:F0}%");
                insights.Add($"   Status: {status}\n");
            }

            // Recommendations
            insights.Add("💡 **Recommendations to Improve:**\n");

            var improvements = new List<string>();
            if (savingsScore < 16) improvements.Add("💰 Increase your savings rate to 15-20%");
            if (debtScore < 16) improvements.Add("💳 Work on reducing your debt-to-income ratio below 36%");
            if (budgetScore < 15) improvements.Add("🎯 Create and stick to budgets for major categories");
            if (emergencyScore < 15) improvements.Add("🛡️ Build 3-6 months of expenses in emergency fund");
            if (goalsScore < 15) improvements.Add("🎯 Set clear financial goals and track progress");

            if (!improvements.Any())
            {
                insights.Add("🎉 Excellent! You're doing great across all areas!");
                insights.Add("Consider helping others learn from your financial discipline!");
            }
            else
            {
                foreach (var improvement in improvements.Take(3))
                {
                    insights.Add(improvement);
                }
            }

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = totalScore >= 70 ? "insight" : "warning",
                Data = new
                {
                    totalScore,
                    grade,
                    scores,
                    savingsRate = savingsRate * 100,
                    debtToIncome = debtToIncome * 100,
                    emergencyFundMonths = monthsOfExpenses
                },
                QuickActions = new List<string>
                {
                    "How can I improve?",
                    "Show my budgets",
                    "Set a savings goal"
                },
                ActionLink = "/analytics"
            };
        }

        /// <summary>
        /// Analyze subscriptions and recurring expenses
        /// </summary>
        private async Task<ChatbotResponse> GetSubscriptionAnalysisAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var threeMonthsAgo = now.AddMonths(-3);

            // Find recurring transactions (same amount, regular intervals)
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= threeMonthsAgo)
                .OrderBy(t => t.Description)
                .ToListAsync();

            var insights = new List<string>();
            insights.Add("📱 **Subscription & Recurring Expense Analysis**\n");

            // Find potential subscriptions (similar amounts appearing multiple times)
            var potentialSubscriptions = transactions
                .GroupBy(t => new { 
                    Description = t.Description?.ToLower().Trim() ?? t.Category.ToLower(),
                    Amount = Math.Round(t.Amount, 2)
                })
                .Where(g => g.Count() >= 2) // Appeared at least twice
                .Select(g => new
                {
                    Name = g.Key.Description,
                    Amount = g.Key.Amount,
                    Frequency = g.Count(),
                    Category = g.First().Category,
                    LastDate = g.Max(t => t.Date),
                    TotalSpent = g.Sum(t => t.Amount)
                })
                .OrderByDescending(s => s.TotalSpent)
                .ToList();

            if (!potentialSubscriptions.Any())
            {
                insights.Add("✅ **No recurring subscriptions detected** in the last 3 months.");
                insights.Add("\nThis could mean:");
                insights.Add("• You don't have subscriptions");
                insights.Add("• Subscription names vary (check your statement)");
                insights.Add("• You pay subscriptions annually\n");

                insights.Add("💡 **Common Subscriptions to Review:**");
                insights.Add("• Streaming (Netflix, Hulu, Disney+, Spotify)");
                insights.Add("• Cloud Storage (iCloud, Google Drive, Dropbox)");
                insights.Add("• Fitness (Gym membership, Fitness apps)");
                insights.Add("• Software (Adobe, Microsoft 365, etc.)");
                insights.Add("• News/Magazines");
                insights.Add("• Food Delivery (DoorDash Pass, Uber Eats+)");
            }
            else
            {
                insights.Add($"**Found {potentialSubscriptions.Count} potential subscriptions:**\n");

                var totalMonthly = 0m;
                var totalYearly = 0m;

                foreach (var sub in potentialSubscriptions.Take(15))
                {
                    var monthlyEstimate = sub.Amount;
                    var yearlyEstimate = sub.Amount * 12;
                    
                    totalMonthly += monthlyEstimate;
                    totalYearly += yearlyEstimate;

                    insights.Add($"📍 **{sub.Name}**");
                    insights.Add($"   Amount: ${sub.Amount:N2}");
                    insights.Add($"   Frequency: {sub.Frequency}x in 3 months");
                    insights.Add($"   Last charged: {sub.LastDate:MMM dd}");
                    insights.Add($"   Yearly cost: ~${yearlyEstimate:N2}\n");
                }

                // Get user's total expenses for comparison
                var totalExpenses = await _dbContext.Transactions
                    .Where(t => t.UserId == userId && t.Type == "expense" && t.Date >= threeMonthsAgo)
                    .SumAsync(t => t.Amount);

                insights.Add($"💰 **Total Impact:**");
                insights.Add($"• Estimated Monthly: **${totalMonthly:N2}**");
                insights.Add($"• Estimated Yearly: **${totalYearly:N2}**");
                insights.Add($"• Percentage of spending: {(totalExpenses > 0 ? (totalMonthly / totalExpenses) * 100 : 0):F1}%\n");

                // Savings potential
                insights.Add("💡 **Savings Potential:**\n");
                
                if (totalMonthly > 100)
                {
                    var save25Percent = totalMonthly * 0.25m;
                    var save50Percent = totalMonthly * 0.50m;
                    
                    insights.Add($"**Cancel just 25% of subscriptions:**");
                    insights.Add($"   Save ${save25Percent:N2}/month or ${save25Percent * 12:N2}/year\n");
                    
                    insights.Add($"**Cancel 50% of subscriptions:**");
                    insights.Add($"   Save ${save50Percent:N2}/month or ${save50Percent * 12:N2}/year\n");
                }
            }

            insights.Add("✂️ **Subscription Optimization Tips:**\n");
            insights.Add("**Audit & Cancel:**");
            insights.Add("✓ Review each subscription - still using it?");
            insights.Add("✓ Cancel unused/forgotten subscriptions");
            insights.Add("✓ Use free alternatives when possible");
            insights.Add("✓ Share family plans with trusted people\n");

            insights.Add("**Smart Strategies:**");
            insights.Add("✓ Rotate streaming services monthly");
            insights.Add("✓ Buy annual plans (usually 20% cheaper)");
            insights.Add("✓ Use student/military discounts if eligible");
            insights.Add("✓ Set calendar reminders before renewal");
            insights.Add("✓ Use virtual cards to control recurring charges\n");

            insights.Add("**Money-Saving Swaps:**");
            insights.Add("• Streaming: Rotate instead of keeping all");
            insights.Add("• Music: Free Spotify vs Premium ($10/month saved)");
            insights.Add("• Cloud Storage: Compress files, use free tiers");
            insights.Add("• Gym: Home workouts or outdoor exercise");
            insights.Add("• Software: Use free open-source alternatives");

            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId, now.AddMonths(-1), now);

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = potentialSubscriptions.Any() && potentialSubscriptions.Sum(s => s.Amount) > 200 ? "warning" : "text",
                Data = new
                {
                    subscriptions = potentialSubscriptions,
                    totalMonthly = potentialSubscriptions.Sum(s => s.Amount),
                    totalYearly = potentialSubscriptions.Sum(s => s.Amount * 12),
                    count = potentialSubscriptions.Count
                },
                QuickActions = new List<string>
                {
                    "Show all recurring bills",
                    "How can I save money?",
                    "Show my expenses"
                },
                ActionLink = "/expenses"
            };
        }

        /// <summary>
        /// Bill negotiation strategies
        /// </summary>
        private ChatbotResponse GetBillNegotiationTipsAsync(string language = "en")
        {
            var insights = new List<string>();
            insights.Add("💬 **Bill Negotiation Strategies**\n");

            insights.Add("🎯 **What You Can Negotiate:**");
            insights.Add("✓ Cable/Internet bills");
            insights.Add("✓ Phone plans");
            insights.Add("✓ Insurance (car, home, life)");
            insights.Add("✓ Credit card interest rates");
            insights.Add("✓ Gym memberships");
            insights.Add("✓ Medical bills");
            insights.Add("✓ Subscription services\n");

            insights.Add("📞 **The Negotiation Script:**\n");

            insights.Add("**Step 1: Research**");
            insights.Add("\"I've been a loyal customer for [X years], and I've noticed competitor [Company] offers [service] for $[amount less]. Can you match that?\"\n");

            insights.Add("**Step 2: Be Polite But Firm**");
            insights.Add("\"I really value your service, but this price is above my budget. What options do you have to lower my bill?\"\n");

            insights.Add("**Step 3: Ask for Retention**");
            insights.Add("\"May I speak with your retention or customer loyalty department?\"\n");

            insights.Add("**Step 4: Be Ready to Walk**");
            insights.Add("\"I appreciate your help, but if we can't find a better rate, I'll need to switch to [competitor].\"\n");

            insights.Add("💡 **Pro Tips:**\n");
            insights.Add("**Best Practices:**");
            insights.Add("✓ Call at the end of your contract/billing cycle");
            insights.Add("✓ Have competitor prices ready");
            insights.Add("✓ Ask for supervisor if first rep can't help");
            insights.Add("✓ Be polite - rep is more likely to help");
            insights.Add("✓ Document everything (name, date, promises)");
            insights.Add("✓ Call during slow hours (mid-week mornings)\n");

            insights.Add("**What Works:**");
            insights.Add("✓ Loyalty: \"I've been with you for X years\"");
            insights.Add("✓ Competition: \"Company X offers it for less\"");
            insights.Add("✓ Hardship: \"This is outside my current budget\"");
            insights.Add("✓ Bundle: \"What if I add another service?\"");
            insights.Add("✓ Downgrade: \"What's your most basic plan?\"\n");

            insights.Add("📊 **Expected Savings:**\n");
            insights.Add("• Cable/Internet: $20-50/month (50% success rate)");
            insights.Add("• Phone Plans: $10-30/month (40% success rate)");
            insights.Add("• Insurance: $200-500/year (60% success rate)");
            insights.Add("• Credit Cards: 3-5% APR reduction (50% success)");
            insights.Add("• Gym: $10-20/month (70% success rate)\n");

            insights.Add("🏥 **Medical Bills Special Tips:**");
            insights.Add("✓ Always ask for an itemized bill");
            insights.Add("✓ Look for billing errors (very common!)");
            insights.Add("✓ Ask about financial assistance programs");
            insights.Add("✓ Offer to pay in full for a discount (20-40% off)");
            insights.Add("✓ Negotiate before it goes to collections\n");

            insights.Add("⚠️ **What NOT to Do:**");
            insights.Add("✗ Don't be rude or aggressive");
            insights.Add("✗ Don't accept first offer - always counter");
            insights.Add("✗ Don't lie about competitor prices");
            insights.Add("✗ Don't threaten without being ready to follow through");
            insights.Add("✗ Don't forget to get agreement in writing\n");

            insights.Add("💰 **Potential Annual Savings:**");
            insights.Add("If you successfully negotiate:");
            insights.Add("• Internet: $360/year");
            insights.Add("• Phone: $240/year");
            insights.Add("• Insurance: $400/year");
            insights.Add("• Gym: $180/year");
            insights.Add("**Total: ~$1,180/year!** 🎉");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "suggestion",
                QuickActions = new List<string>
                {
                    "Show my bills",
                    "How can I save money?",
                    "Show subscriptions"
                }
            };
        }

        /// <summary>
        /// Investment basics and recommendations
        /// </summary>
        private ChatbotResponse GetInvestmentBasicsAsync()
        {
            var insights = new List<string>();
            insights.Add("📈 **Investment Basics & Getting Started**\n");

            insights.Add("🎯 **Investment Priority Checklist:**\n");
            insights.Add("Before investing, ensure you have:");
            insights.Add("✅ Emergency fund (3-6 months expenses)");
            insights.Add("✅ High-interest debt paid off (>7% APR)");
            insights.Add("✅ Stable income");
            insights.Add("✅ Basic understanding of investments\n");

            insights.Add("💰 **Where to Start Investing:**\n");

            insights.Add("**1. Employer 401(k) (START HERE!)**");
            insights.Add("   • Contribute at least to get full match (FREE MONEY!)");
            insights.Add("   • Limit: $23,000/year (2024)");
            insights.Add("   • Tax-deferred growth");
            insights.Add("   • Often has company match (50-100% of contribution)\n");

            insights.Add("**2. Roth IRA (Tax-Free Growth)**");
            insights.Add("   • Contribute up to $7,000/year");
            insights.Add("   • Withdrawals in retirement are TAX-FREE");
            insights.Add("   • Income limits apply");
            insights.Add("   • Perfect for young investors\n");

            insights.Add("**3. Taxable Brokerage Account**");
            insights.Add("   • No contribution limits");
            insights.Add("   • More flexibility");
            insights.Add("   • Pay taxes on gains");
            insights.Add("   • Good for goals before retirement\n");

            insights.Add("📊 **Investment Options by Risk:**\n");

            insights.Add("**Low Risk (2-4% return):**");
            insights.Add("• High-Yield Savings Accounts (HYSA)");
            insights.Add("• Certificates of Deposit (CDs)");
            insights.Add("• Treasury Bonds");
            insights.Add("• Money Market Funds\n");

            insights.Add("**Medium Risk (5-8% return):**");
            insights.Add("• Index Funds (S&P 500, Total Market)");
            insights.Add("• Bond Index Funds");
            insights.Add("• Target-Date Funds");
            insights.Add("• Balanced Mutual Funds\n");

            insights.Add("**Higher Risk (8-12%+ potential):**");
            insights.Add("• Individual Stocks");
            insights.Add("• Growth Stocks");
            insights.Add("• Real Estate Investment Trusts (REITs)");
            insights.Add("• Emerging Market Funds\n");

            insights.Add("🎯 **Recommended Portfolio by Age:**\n");

            insights.Add("**20s-30s (Aggressive Growth):**");
            insights.Add("• 90% Stocks (80% US, 10% International)");
            insights.Add("• 10% Bonds");
            insights.Add("• Time to recover from market dips\n");

            insights.Add("**40s-50s (Balanced):**");
            insights.Add("• 70% Stocks");
            insights.Add("• 30% Bonds");
            insights.Add("• Balance growth and stability\n");

            insights.Add("**60s+ (Conservative):**");
            insights.Add("• 40-50% Stocks");
            insights.Add("• 50-60% Bonds");
            insights.Add("• Protect your gains\n");

            insights.Add("💡 **Golden Rules of Investing:**\n");
            insights.Add("1️⃣ **Start Early** - Time is your best friend");
            insights.Add("   $100/month from age 25-65 = $320K (at 8%)");
            insights.Add("   Same from age 35-65 = $150K\n");

            insights.Add("2️⃣ **Diversify** - Don't put all eggs in one basket");
            insights.Add("   Use index funds for instant diversification\n");

            insights.Add("3️⃣ **Low Fees Matter** - Keep expense ratios < 0.20%");
            insights.Add("   1% fee can cost you $100K+ over 30 years!\n");

            insights.Add("4️⃣ **Stay Invested** - Don't panic sell");
            insights.Add("   Market downturns are temporary");
            insights.Add("   Historically markets always recover\n");

            insights.Add("5️⃣ **Automate** - Set it and forget it");
            insights.Add("   Auto-invest every paycheck");
            insights.Add("   Removes emotion from investing\n");

            insights.Add("🏆 **Top Investment Platforms:**\n");
            insights.Add("**For Beginners:**");
            insights.Add("• Vanguard (low fees, great index funds)");
            insights.Add("• Fidelity (no minimums, excellent service)");
            insights.Add("• Charles Schwab (user-friendly, low costs)\n");

            insights.Add("**For Robo-Advisors:**");
            insights.Add("• Wealthfront (automated, tax-loss harvesting)");
            insights.Add("• Betterment (goal-based investing)");
            insights.Add("• M1 Finance (free, customizable)\n");

            insights.Add("📚 **Learn More:**");
            insights.Add("Books:");
            insights.Add("• 'The Simple Path to Wealth' - JL Collins");
            insights.Add("• 'A Random Walk Down Wall Street' - Burton Malkiel");
            insights.Add("• 'The Bogleheads' Guide to Investing'\n");

            insights.Add("⚠️ **Avoid These Mistakes:**");
            insights.Add("✗ Trying to time the market");
            insights.Add("✗ Day trading (95% lose money)");
            insights.Add("✗ Following hot tips");
            insights.Add("✗ Investing money you need soon");
            insights.Add("✗ High-fee funds and advisors");
            insights.Add("✗ Keeping too much in cash");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                QuickActions = new List<string>
                {
                    "Show my wealth projection",
                    "Financial milestones",
                    "How can I save more?"
                }
            };
        }

        /// <summary>
        /// Analyze seasonal spending patterns
        /// </summary>
        private async Task<ChatbotResponse> GetSeasonalSpendingAsync(string userId)
        {
            var now = DateTime.UtcNow;
            var oneYearAgo = now.AddYears(-1);

            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= oneYearAgo)
                .ToListAsync();

            var insights = new List<string>();
            insights.Add("📅 **Seasonal Spending Patterns**\n");

            if (!transactions.Any())
            {
                return new ChatbotResponse
                {
                    Message = "Not enough data to analyze seasonal patterns. Start tracking expenses to see trends! 📊",
                    Type = "text",
                    QuickActions = new List<string>
                    {
                        "Show my expenses",
                        "How to track expenses?",
                        "Give me spending insights"
                    }
                };
            }

            // Group by month
            var monthlySpending = transactions
                .GroupBy(t => new { t.Date.Year, t.Date.Month })
                .Select(g => new
                {
                    Year = g.Key.Year,
                    Month = g.Key.Month,
                    MonthName = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMMM"),
                    Total = g.Sum(t => t.Amount),
                    Count = g.Count(),
                    AvgTransaction = g.Average(t => t.Amount)
                })
                .OrderBy(m => m.Year).ThenBy(m => m.Month)
                .ToList();

            var avgMonthly = monthlySpending.Average(m => m.Total);
            var highestMonth = monthlySpending.OrderByDescending(m => m.Total).First();
            var lowestMonth = monthlySpending.OrderBy(m => m.Total).First();

            insights.Add($"**12-Month Overview:**");
            insights.Add($"• Average Monthly: ${avgMonthly:N2}");
            insights.Add($"• Highest: {highestMonth.MonthName} ${highestMonth.Total:N2}");
            insights.Add($"• Lowest: {lowestMonth.MonthName} ${lowestMonth.Total:N2}\n");

            insights.Add("📊 **Month-by-Month Breakdown:**\n");

            foreach (var month in monthlySpending.TakeLast(12))
            {
                var variance = ((month.Total - avgMonthly) / avgMonthly) * 100;
                var emoji = month.Total > avgMonthly * 1.15m ? "🔴" :
                           month.Total > avgMonthly * 1.05m ? "🟡" :
                           month.Total < avgMonthly * 0.85m ? "🟢" : "⚪";

                insights.Add($"{emoji} **{month.MonthName} {month.Year}**: ${month.Total:N2}");
                if (Math.Abs(variance) > 5)
                {
                    insights.Add($"   {(variance > 0 ? "↑" : "↓")} {Math.Abs(variance):F0}% vs average");
                }
            }

            insights.Add($"\n💡 **Seasonal Insights:**\n");

            // Identify spending peaks
            var highSpendingMonths = monthlySpending
                .Where(m => m.Total > avgMonthly * 1.15m)
                .Select(m => m.MonthName)
                .Distinct()
                .ToList();

            if (highSpendingMonths.Any())
            {
                insights.Add($"**High Spending Months:**");
                foreach (var month in highSpendingMonths)
                {
                    var reason = month switch
                    {
                        "December" => "Holiday shopping, gifts, travel",
                        "November" => "Black Friday, Thanksgiving, holiday prep",
                        "January" => "Holiday bills, New Year resolutions",
                        "July" => "Summer vacation, activities",
                        "August" => "Back-to-school shopping",
                        _ => "Seasonal variation"
                    };
                    insights.Add($"• {month}: Typically due to {reason}");
                }
                insights.Add("");
            }

            insights.Add("📈 **Prepare for Seasonal Spikes:**\n");
            insights.Add("**Q4 (Oct-Dec) - Holiday Season:**");
            insights.Add("✓ Start holiday budget in September");
            insights.Add("✓ Use cashback for purchases");
            insights.Add("✓ Set gift spending limit per person");
            insights.Add("✓ Buy early to avoid last-minute markups\n");

            insights.Add("**Summer (Jun-Aug):**");
            insights.Add("✓ Plan vacation budget in advance");
            insights.Add("✓ Look for travel deals in off-season");
            insights.Add("✓ Pack snacks for activities");
            insights.Add("✓ Consider staycation alternatives\n");

            insights.Add("**Back-to-School (Aug-Sep):**");
            insights.Add("✓ Shop tax-free weekends");
            insights.Add("✓ Buy last year's models");
            insights.Add("✓ Check what can be reused");
            insights.Add("✓ Compare prices across stores");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    monthlySpending,
                    avgMonthly,
                    highestMonth,
                    lowestMonth
                },
                QuickActions = new List<string>
                {
                    "Compare with last month",
                    "Show spending insights",
                    "Set a budget"
                },
                ActionLink = "/analytics"
            };
        }

        /// <summary>
        /// Calculate key financial ratios
        /// </summary>
        private async Task<ChatbotResponse> GetFinancialRatiosAsync(string userId)
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            var analytics = await _analyticsService.GetFinancialAnalyticsAsync(userId, monthStart, now);
            var loans = await _dbContext.Loans.Where(l => l.UserId == userId && !l.IsSettled).ToListAsync();
            var goals = await _dbContext.SavingsGoals.Where(g => g.UserId == userId).ToListAsync();

            var insights = new List<string>();
            insights.Add("📊 **Your Key Financial Ratios**\n");

            // 1. Savings Rate
            var savingsRate = analytics.TotalIncome > 0 ? (analytics.Balance / analytics.TotalIncome) * 100 : 0;
            var savingsStatus = savingsRate >= 20 ? "Excellent ✅" :
                               savingsRate >= 15 ? "Good 👍" :
                               savingsRate >= 10 ? "Fair ⚪" :
                               savingsRate >= 5 ? "Needs Improvement ⚠️" : "Critical 🔴";

            insights.Add($"💰 **Savings Rate**: {savingsRate:F1}%");
            insights.Add($"   Status: {savingsStatus}");
            insights.Add($"   Benchmark: 20% (Excellent), 15% (Good), 10% (Minimum)");
            insights.Add($"   Your Monthly: ${analytics.Balance:N2} / ${analytics.TotalIncome:N2}\n");

            // 2. Debt-to-Income Ratio
            var totalDebt = loans.Sum(l => l.RemainingAmount);
            var monthlyDebtPayment = loans.Sum(l => l.InstallmentAmount ?? 0);
            var debtToIncome = analytics.TotalIncome > 0 ? (monthlyDebtPayment / analytics.TotalIncome) * 100 : 0;
            var dtiStatus = debtToIncome == 0 ? "Debt-Free! 🎉" :
                           debtToIncome < 20 ? "Excellent ✅" :
                           debtToIncome < 36 ? "Good 👍" :
                           debtToIncome < 43 ? "High ⚠️" : "Very High 🔴";

            insights.Add($"💳 **Debt-to-Income Ratio**: {debtToIncome:F1}%");
            insights.Add($"   Status: {dtiStatus}");
            insights.Add($"   Benchmark: <20% (Excellent), <36% (Good), <43% (Max)");
            insights.Add($"   Your Monthly: ${monthlyDebtPayment:N2} / ${analytics.TotalIncome:N2}\n");

            // 3. Housing Ratio (if we can identify it)
            var housingExpenses = analytics.CategoryBreakdown
                .Where(c => c.Category.ToLower().Contains("rent") || 
                           c.Category.ToLower().Contains("mortgage") ||
                           c.Category.ToLower().Contains("home"))
                .Sum(c => c.Amount);

            if (housingExpenses > 0)
            {
                var housingRatio = analytics.TotalIncome > 0 ? (housingExpenses / analytics.TotalIncome) * 100 : 0;
                var housingStatus = housingRatio < 28 ? "Excellent ✅" :
                                   housingRatio < 33 ? "Acceptable 👍" :
                                   housingRatio < 40 ? "High ⚠️" : "Very High 🔴";

                insights.Add($"🏠 **Housing Ratio**: {housingRatio:F1}%");
                insights.Add($"   Status: {housingStatus}");
                insights.Add($"   Benchmark: <28% (Ideal), <33% (Acceptable)");
                insights.Add($"   Your Monthly: ${housingExpenses:N2} / ${analytics.TotalIncome:N2}\n");
            }

            // 4. Emergency Fund Ratio
            var currentSavings = goals.Sum(g => g.CurrentAmount);
            var monthsOfExpenses = analytics.TotalExpenses > 0 ? currentSavings / analytics.TotalExpenses : 0;
            var emergencyStatus = monthsOfExpenses >= 6 ? "Excellent ✅" :
                                 monthsOfExpenses >= 3 ? "Good 👍" :
                                 monthsOfExpenses >= 1 ? "Minimum ⚪" :
                                 monthsOfExpenses > 0 ? "Low ⚠️" : "None 🔴";

            insights.Add($"🛡️ **Emergency Fund Coverage**: {monthsOfExpenses:F1} months");
            insights.Add($"   Status: {emergencyStatus}");
            insights.Add($"   Benchmark: 6 months (Ideal), 3 months (Minimum)");
            insights.Add($"   Your Savings: ${currentSavings:N2}");
            insights.Add($"   Monthly Expenses: ${analytics.TotalExpenses:N2}\n");

            // 5. Expense Ratios by Category
            if (analytics.CategoryBreakdown.Any())
            {
                insights.Add("📈 **Expense Distribution:**\n");
                var topCategories = analytics.CategoryBreakdown.Take(5);
                
                foreach (var cat in topCategories)
                {
                    var emoji = GetCategoryEmoji(cat.Category);
                    var benchmark = GetCategoryBenchmark(cat.Category);
                    var status = cat.Percentage < benchmark * 0.8m ? "✅" :
                                cat.Percentage < benchmark * 1.2m ? "⚪" : "⚠️";

                    insights.Add($"{emoji} **{cat.Category}**: {cat.Percentage:F1}%");
                    insights.Add($"   {status} Benchmark: ~{benchmark}% of income");
                }
                insights.Add("");
            }

            insights.Add("💡 **What These Numbers Mean:**\n");

            var issues = new List<string>();
            var strengths = new List<string>();

            if (savingsRate >= 15) strengths.Add("✅ Strong savings habit");
            else if (savingsRate < 10) issues.Add("⚠️ Increase your savings rate");

            if (debtToIncome == 0) strengths.Add("✅ Debt-free status");
            else if (debtToIncome > 36) issues.Add("⚠️ High debt burden - focus on paydown");

            if (monthsOfExpenses >= 3) strengths.Add("✅ Good emergency fund");
            else issues.Add("⚠️ Build emergency fund to 3-6 months");

            if (strengths.Any())
            {
                insights.Add("**Strengths:**");
                foreach (var strength in strengths)
                {
                    insights.Add(strength);
                }
                insights.Add("");
            }

            if (issues.Any())
            {
                insights.Add("**Areas to Improve:**");
                foreach (var issue in issues.Take(3))
                {
                    insights.Add(issue);
                }
            }
            else
            {
                insights.Add("🎉 Excellent financial health across all key ratios!");
            }

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = issues.Count > 2 ? "warning" : "insight",
                Data = new
                {
                    savingsRate,
                    debtToIncome,
                    emergencyFundMonths = monthsOfExpenses,
                    totalDebt,
                    currentSavings
                },
                QuickActions = new List<string>
                {
                    "Financial health score",
                    "How can I improve?",
                    "Show my budgets"
                },
                ActionLink = "/analytics"
            };
        }

        /// <summary>
        /// Get benchmark percentage for category
        /// </summary>
        private decimal GetCategoryBenchmark(string category)
        {
            return category.ToLower() switch
            {
                var c when c.Contains("food") || c.Contains("groceries") => 15m,
                var c when c.Contains("transport") || c.Contains("car") => 15m,
                var c when c.Contains("home") || c.Contains("rent") || c.Contains("mortgage") => 28m,
                var c when c.Contains("utilities") || c.Contains("bills") => 5m,
                var c when c.Contains("insurance") => 10m,
                var c when c.Contains("entertainment") => 5m,
                var c when c.Contains("dining") || c.Contains("restaurant") => 5m,
                var c when c.Contains("health") || c.Contains("medical") => 5m,
                _ => 10m
            };
        }

        /// <summary>
        /// General money tips and financial wisdom
        /// </summary>
        private ChatbotResponse GetMoneyTipsAsync()
        {
            var insights = new List<string>();
            insights.Add("💎 **Smart Money Tips & Financial Wisdom**\n");

            var tips = new[]
            {
                ("💰 Pay Yourself First", "Set up automatic transfer to savings on payday. Treat savings like a bill you can't skip."),
                ("📱 The 24-Hour Rule", "Wait 24 hours before any non-essential purchase over $50. Most impulse urges fade."),
                ("🍔 The Latte Factor", "Small daily expenses add up! $5/day = $1,825/year. Make coffee at home, save $1,500+."),
                ("💳 Credit Card Strategy", "Pay full balance every month. Use for rewards, but never carry a balance. Interest kills wealth."),
                ("🎯 The 50/30/20 Rule", "50% Needs, 30% Wants, 20% Savings. Simple framework for balanced budgeting."),
                ("📊 Track Everything", "What gets measured gets managed. Track spending for 30 days to find money leaks."),
                ("🏦 Automate Finances", "Automate bills, savings, investments. Remove willpower from the equation."),
                ("💡 Energy Savings", "LED bulbs, programmable thermostat, unplug devices. Save $200-500/year on utilities."),
                ("🛍️ Buy Quality Once", "Cheap boots twice a year vs quality boots once = false economy. Buy quality for things you use daily."),
                ("📚 Invest in Yourself", "Best ROI is education/skills. A $1,000 course that increases income by $10K = 1000% return."),
                ("🎁 Gift Experiences", "Experiences create memories, stuff creates clutter. Give experiences over things."),
                ("🏃 Free Fitness", "Cancel gym, run outside, do bodyweight exercises. Save $500+/year, same results."),
                ("📖 Library is Free", "Books, movies, audiobooks, classes - all free. Cancel subscriptions, use library."),
                ("🍱 Meal Prep Sunday", "Cook once, eat all week. Saves time and $200-300/month vs eating out."),
                ("💸 Negotiate Everything", "Ask for discounts always. Worst case: they say no. Best case: save 10-30%."),
                ("🔄 Round-Up Savings", "Round purchases to nearest dollar, save difference. Painless way to save $500+/year."),
                ("📧 Unsubscribe Marketing", "Marketing emails trigger spending. Unsubscribe from all promotional emails."),
                ("🎯 One Financial Goal", "Focus on ONE goal at a time. Paying off debt OR saving for house. Divided focus fails."),
                ("💰 Found Money Rule", "Windfalls (tax refund, bonus, gift) → 50% fun, 50% goals. Enjoy AND progress."),
                ("🔒 Emergency Fund Priority", "$1,000 first, then 3-6 months expenses. Prevents debt spiral from emergencies.")
            };

            // Randomly select 10 tips
            var selectedTips = tips.OrderBy(x => Guid.NewGuid()).Take(10).ToList();

            foreach (var (title, description) in selectedTips)
            {
                insights.Add($"**{title}**");
                insights.Add($"{description}\n");
            }

            insights.Add("🎓 **Warren Buffett's Wisdom:**");
            insights.Add("• \"Do not save what is left after spending; spend what is left after saving.\"");
            insights.Add("• \"Price is what you pay. Value is what you get.\"");
            insights.Add("• \"The most important investment you can make is in yourself.\"\n");

            insights.Add("💡 **Remember:**");
            insights.Add("Building wealth is 80% behavior, 20% knowledge.");
            insights.Add("It's not about earning more, it's about keeping more.");
            insights.Add("Small consistent actions > big sporadic efforts.");
            insights.Add("Financial freedom = having options.");

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                QuickActions = new List<string>
                {
                    "How can I save money?",
                    "Show spending insights",
                    "Financial health score"
                }
            };
        }

        // ============================================
        // HELPER METHODS
        // ============================================

        /// <summary>
        /// Extract time period from query with enhanced pattern matching
        /// </summary>
        private string ExtractTimePeriod(string query, string language = "en")
        {
            // Check for specific dates first
            var datePattern = @"(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})";
            if (Regex.IsMatch(query, datePattern)) return "specific_date";

            if (language == "el")
            {
                // Greek time periods
                if (Regex.IsMatch(query, @"\b(σήμερα|τώρα|τρέχον)\b", RegexOptions.IgnoreCase)) return "today";
                if (Regex.IsMatch(query, @"\b(χθες|προχθές)\b", RegexOptions.IgnoreCase)) return "yesterday";
                if (Regex.IsMatch(query, @"\b(αυτή.*εβδομάδα|τρέχουσα.*εβδομάδα|εβδομάδα|7.*ημέρες|τελευταία.*εβδομάδα)\b", RegexOptions.IgnoreCase)) return "this week";
                if (Regex.IsMatch(query, @"\b(προηγούμενη.*εβδομάδα|πέρυσι.*εβδομάδα)\b", RegexOptions.IgnoreCase)) return "last week";
                if (Regex.IsMatch(query, @"\b(αυτό.*μήνα|τρέχον.*μήνα|μήνας|30.*ημέρες|τελευταίο.*μήνα)\b", RegexOptions.IgnoreCase)) return "this month";
                if (Regex.IsMatch(query, @"\b(προηγούμενος.*μήνας|πέρυσι.*μήνα)\b", RegexOptions.IgnoreCase)) return "last month";
                if (Regex.IsMatch(query, @"\b(αυτό.*έτος|τρέχον.*έτος|έτος|365.*ημέρες|τελευταίο.*έτος)\b", RegexOptions.IgnoreCase)) return "this year";
                if (Regex.IsMatch(query, @"\b(προηγούμενο.*έτος|πέρυσι.*έτος)\b", RegexOptions.IgnoreCase)) return "last year";
            }
            else
            {
                // English time periods with better matching
                if (Regex.IsMatch(query, @"\b(today|now|current)\b", RegexOptions.IgnoreCase)) return "today";
                if (Regex.IsMatch(query, @"\b(yesterday|last day)\b", RegexOptions.IgnoreCase)) return "yesterday";
                if (Regex.IsMatch(query, @"\b(this week|current week|week|7 days|past week)\b", RegexOptions.IgnoreCase)) return "this week";
                if (Regex.IsMatch(query, @"\b(last week|previous week)\b", RegexOptions.IgnoreCase)) return "last week";
                if (Regex.IsMatch(query, @"\b(this month|current month|month|30 days|past month)\b", RegexOptions.IgnoreCase)) return "this month";
                if (Regex.IsMatch(query, @"\b(last month|previous month)\b", RegexOptions.IgnoreCase)) return "last month";
                if (Regex.IsMatch(query, @"\b(this year|current year|year|365 days|past year)\b", RegexOptions.IgnoreCase)) return "this year";
                if (Regex.IsMatch(query, @"\b(last year|previous year)\b", RegexOptions.IgnoreCase)) return "last year";
            }
            if (Regex.IsMatch(query, @"\b(\d+)\s*(days?|weeks?|months?|years?)\s*(ago|back)\b", RegexOptions.IgnoreCase)) 
            {
                var match = Regex.Match(query, @"(\d+)\s*(days?|weeks?|months?|years?)", RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    var value = int.Parse(match.Groups[1].Value);
                    var unit = match.Groups[2].Value.ToLower();
                    if (unit.StartsWith("day") && value <= 7) return "this week";
                    if (unit.StartsWith("week") && value <= 4) return "this month";
                    if (unit.StartsWith("month") && value <= 12) return "this year";
                }
            }
            
            return "this month"; // Default
        }

        /// <summary>
        /// Get date range based on period with enhanced support
        /// </summary>
        private (DateTime start, DateTime end) GetDateRange(string period)
        {
            var now = DateTime.UtcNow;
            return period switch
            {
                "today" => (now.Date, now),
                "yesterday" => (now.Date.AddDays(-1), now.Date.AddDays(-1).AddHours(23).AddMinutes(59).AddSeconds(59)),
                "this week" => (now.AddDays(-(int)now.DayOfWeek), now),
                "last week" => (now.AddDays(-(int)now.DayOfWeek - 7), now.AddDays(-(int)now.DayOfWeek)),
                "this month" => (new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc), now),
                "last month" => (new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-1), 
                                new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddTicks(-1)),
                "this year" => (new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc), now),
                "last year" => (new DateTime(now.Year - 1, 1, 1, 0, 0, 0, DateTimeKind.Utc), 
                               new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddTicks(-1)),
                _ => (new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc), now)
            };
        }

        /// <summary>
        /// Extract category from query with enhanced matching and aliases
        /// </summary>
        private string ExtractCategory(string query)
        {
            // Category mappings with aliases and variations
            var categoryMap = new Dictionary<string, List<string>>
            {
                ["groceries"] = new() { "grocery", "groceries", "supermarket", "food shopping", "grocery store", "market" },
                ["food"] = new() { "food", "eating", "meals", "restaurant", "restaurants", "dining out", "takeout" },
                ["dining"] = new() { "dining", "dine", "restaurant", "restaurants", "cafe", "café", "bistro", "eatery" },
                ["transport"] = new() { "transport", "transportation", "travel", "commute", "gas", "fuel", "uber", "taxi", "bus", "train", "metro", "subway" },
                ["entertainment"] = new() { "entertainment", "fun", "movies", "cinema", "theater", "theatre", "games", "gaming", "hobby", "hobbies", "leisure" },
                ["bills"] = new() { "bills", "utilities", "electricity", "water", "gas bill", "internet", "phone", "phone bill", "utility", "utilities bill" },
                ["shopping"] = new() { "shopping", "store", "stores", "retail", "purchase", "purchases", "buy", "buying", "mall" },
                ["health"] = new() { "health", "medical", "medicine", "pharmacy", "doctor", "hospital", "clinic", "dental", "healthcare" },
                ["housing"] = new() { "housing", "rent", "mortgage", "home", "apartment", "house", "accommodation", "living" },
                ["education"] = new() { "education", "school", "tuition", "books", "course", "courses", "learning", "study" },
                ["personal"] = new() { "personal", "care", "clothing", "clothes", "apparel", "beauty", "grooming" },
                ["subscription"] = new() { "subscription", "subscriptions", "membership", "memberships", "netflix", "spotify", "streaming" }
            };

            // Try exact matches first
            foreach (var (category, aliases) in categoryMap)
            {
                foreach (var alias in aliases)
                {
                    if (query.Contains(alias, StringComparison.OrdinalIgnoreCase))
                    {
                        return category;
                    }
                }
            }

            // Try fuzzy matching for close matches
            var queryWords = query.Split(new[] { ' ', '.', ',', '!', '?', ':', ';' }, 
                StringSplitOptions.RemoveEmptyEntries)
                .Select(w => w.ToLowerInvariant())
                .ToList();

            foreach (var (category, aliases) in categoryMap)
            {
                foreach (var alias in aliases)
                {
                    foreach (var word in queryWords)
                    {
                        if (word.Length > 3 && (word.Contains(alias) || alias.Contains(word) || 
                            LevenshteinDistance(word, alias) <= 2))
                        {
                            return category;
                        }
                    }
                }
            }

            return "expenses"; // Default fallback
        }

        /// <summary>
        /// Extract amount from query (e.g., "$100", "100 dollars", "50%")
        /// </summary>
        private decimal? ExtractAmount(string query)
        {
            // Match currency amounts: $100, $100.50, 100 dollars, etc.
            var currencyPattern = @"\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|usd)?";
            var match = Regex.Match(query, currencyPattern, RegexOptions.IgnoreCase);
            if (match.Success && decimal.TryParse(match.Groups[1].Value.Replace(",", ""), out var amount))
            {
                return amount;
            }

            // Match percentage: 20%, 15 percent
            var percentPattern = @"(\d+(?:\.\d+)?)\s*%|(\d+(?:\.\d+)?)\s*percent";
            match = Regex.Match(query, percentPattern, RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var percentValue = match.Groups[1].Success ? match.Groups[1].Value : match.Groups[2].Value;
                if (decimal.TryParse(percentValue, out var percent))
                {
                    return percent; // Return as decimal (e.g., 20 for 20%)
                }
            }

            // Match plain numbers that might be amounts
            var numberPattern = @"\b(\d{2,}(?:\.\d{2})?)\b";
            match = Regex.Match(query, numberPattern);
            if (match.Success && decimal.TryParse(match.Groups[1].Value, out var number))
            {
                // Only return if it's a reasonable amount (between 1 and 1,000,000)
                if (number >= 1 && number <= 1000000)
                {
                    return number;
                }
            }

            return null;
        }

        /// <summary>
        /// Check if user has recent transactions
        /// </summary>
        private async Task<bool> HasRecentTransactionsAsync(string userId)
        {
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            return await _dbContext.Transactions
                .AnyAsync(t => t.UserId == userId && t.Date >= thirtyDaysAgo);
        }

        /// <summary>
        /// Check if user has active loans
        /// </summary>
        private async Task<bool> HasActiveLoansAsync(string userId)
        {
            return await _dbContext.Loans
                .AnyAsync(l => l.UserId == userId && !l.IsSettled);
        }

        /// <summary>
        /// Check if user has budgets
        /// </summary>
        private async Task<bool> HasBudgetsAsync(string userId)
        {
            return await _dbContext.Budgets
                .AnyAsync(b => b.UserId == userId && b.IsActive);
        }

        // ============================================
        // PLACEHOLDER METHODS (delegate to other methods)
        // ============================================

        private async Task<ChatbotResponse> GetMonthlySpendingAsync(string userId, string language = "en") => 
            await GetTotalSpendingAsync(userId, language == "el" ? "αυτόν τον μήνα" : "this month", language);
        
        private async Task<ChatbotResponse> GetDailyAverageAsync(string userId, string language = "en")
        {
            var analytics = await _analyticsService.GetDashboardAnalyticsAsync(userId);
            var avgDaily = DateTime.UtcNow.Day > 0 ? analytics.CurrentMonthExpenses / DateTime.UtcNow.Day : 0;
            var message = language == "el"
                ? $"Ο μέσος ημερήσιος όρος των δαπανών σας αυτόν τον μήνα είναι ${avgDaily:N2}"
                : $"Your average daily spending this month is ${avgDaily:N2}";
            return new ChatbotResponse
            {
                Message = message,
                Type = "text",
                Data = new { averageDaily = avgDaily, totalExpenses = analytics.CurrentMonthExpenses, daysElapsed = DateTime.UtcNow.Day }
            };
        }
        
        private async Task<ChatbotResponse> GetTotalIncomeAsync(string userId, string language = "en") => 
            await GetCurrentBalanceAsync(userId, language);
        
        private async Task<ChatbotResponse> GetIncomeSourcesAsync(string userId, string language = "en") => 
            await GetCurrentBalanceAsync(userId, language);
        
        private async Task<ChatbotResponse> GetSavingsAsync(string userId, string language = "en") => 
            await GetCurrentBalanceAsync(userId, language);
        
        /// <summary>
        /// Compare spending between partners with fair analysis
        /// </summary>
        private async Task<ChatbotResponse> ComparePartnersAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Get transactions with PaidBy information
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= monthStart && !string.IsNullOrEmpty(t.PaidBy))
                .ToListAsync();

            if (!transactions.Any())
            {
                var noPartnerMessage = language == "el"
                    ? "Δεν βρήκα κανένα έξοδο με πληροφορίες συνεργάτη. Βεβαιωθείτε ότι ορίζετε το πεδίο 'Πληρώθηκε από' κατά την καταγραφή εξόδων για να παρακολουθείτε τις δαπάνες του συνεργάτη! 💑"
                    : "I couldn't find any expenses with partner information. Make sure to set the 'Paid By' field when recording expenses to track partner spending! 💑";
                
                var noPartnerQuickActions = language == "el"
                    ? new List<string>
                    {
                        "Δείξε τα έξοδά μου",
                        "Πώς να παρακολουθήσω κοινά έξοδα;",
                        "Ποια είναι η συνολική δαπάνη μου;"
                    }
                    : new List<string>
                    {
                        "Show my expenses",
                        "How to track shared expenses?",
                        "What's my total spending?"
                    };

                return new ChatbotResponse
                {
                    Message = noPartnerMessage,
                    Type = "text",
                    QuickActions = noPartnerQuickActions,
                    ActionLink = "/expenses"
                };
            }

            // Group by partner
            var partnerGroups = transactions
                .GroupBy(t => t.PaidBy)
                .Select(g => new
                {
                    Partner = g.Key,
                    TotalSpent = g.Sum(t => t.Amount),
                    TransactionCount = g.Count(),
                    AvgPerTransaction = g.Average(t => t.Amount),
                    Categories = g.GroupBy(t => t.Category)
                        .Select(cg => new { Category = cg.Key, Amount = cg.Sum(t => t.Amount) })
                        .OrderByDescending(c => c.Amount)
                        .Take(3)
                        .ToList()
                })
                .OrderByDescending(p => p.TotalSpent)
                .ToList();

            var insights = new List<string>();
            var totalSpending = partnerGroups.Sum(p => p.TotalSpent);
            
            if (language == "el")
            {
                insights.Add("💑 **Σύγκριση Δαπανών Συνεργατών**\n");
                insights.Add($"**Συνολικές Οικογενειακές Δαπάνες:** ${totalSpending:N2}\n");

                foreach (var partner in partnerGroups)
                {
                    var percentage = totalSpending > 0 ? (partner.TotalSpent / totalSpending) * 100 : 0;
                    
                    insights.Add($"👤 **{partner.Partner}**");
                    insights.Add($"   Σύνολο: ${partner.TotalSpent:N2} ({percentage:F1}%)");
                    insights.Add($"   Συναλλαγές: {partner.TransactionCount}");
                    insights.Add($"   Μέσος όρος: ${partner.AvgPerTransaction:N2} ανά συναλλαγή");

                    if (partner.Categories.Any())
                    {
                        insights.Add($"   Κύριες Κατηγορίες:");
                        foreach (var cat in partner.Categories)
                        {
                            var catEmoji = GetCategoryEmoji(cat.Category);
                            insights.Add($"     {catEmoji} {cat.Category}: ${cat.Amount:N2}");
                        }
                    }
                    insights.Add("");
                }

                insights.Add("📊 **Ανάλυση:**");
                
                if (partnerGroups.Count >= 2)
                {
                    var difference = partnerGroups[0].TotalSpent - partnerGroups[1].TotalSpent;
                    var percentDiff = partnerGroups[1].TotalSpent > 0 
                        ? (difference / partnerGroups[1].TotalSpent) * 100 
                        : 0;

                    if (Math.Abs(percentDiff) < 10)
                    {
                        insights.Add("✅ Οι δαπάνες είναι αρκετά ισορροπημένες μεταξύ των συνεργατών!");
                    }
                    else
                    {
                        insights.Add($"📊 Ο/Η {partnerGroups[0].Partner} ξόδεψε ${difference:N2} περισσότερο ({Math.Abs(percentDiff):F1}% διαφορά)");
                    }

                    var idealSplit = totalSpending / 2;
                    insights.Add($"\n💰 **Αναφορά Διαίρεσης 50/50:**");
                    insights.Add($"   Κάθε ένας/μία θα έπρεπε να ξοδέψει: ${idealSplit:N2}");
                    
                    foreach (var partner in partnerGroups)
                    {
                        var splitDiff = partner.TotalSpent - idealSplit;
                        if (splitDiff > 0)
                        {
                            insights.Add($"   {partner.Partner}: ${splitDiff:N2} πάνω από την ίση διαίρεση");
                        }
                        else
                        {
                            insights.Add($"   {partner.Partner}: ${Math.Abs(splitDiff):N2} κάτω από την ίση διαίρεση");
                        }
                    }
                }

                insights.Add($"\n💡 Θυμηθείτε: Το δίκαιο δεν σημαίνει πάντα ίσο. Σκεφτείτε τους λόγους εσόδων και τις ατομικές ανάγκες!");
            }
            else
            {
                insights.Add("💑 **Partner Spending Comparison**\n");
                insights.Add($"**Total Household Spending:** ${totalSpending:N2}\n");

                foreach (var partner in partnerGroups)
                {
                    var percentage = totalSpending > 0 ? (partner.TotalSpent / totalSpending) * 100 : 0;
                    
                    insights.Add($"👤 **{partner.Partner}**");
                    insights.Add($"   Total: ${partner.TotalSpent:N2} ({percentage:F1}%)");
                    insights.Add($"   Transactions: {partner.TransactionCount}");
                    insights.Add($"   Average: ${partner.AvgPerTransaction:N2} per transaction");

                    if (partner.Categories.Any())
                    {
                        insights.Add($"   Top Categories:");
                        foreach (var cat in partner.Categories)
                        {
                            var catEmoji = GetCategoryEmoji(cat.Category);
                            insights.Add($"     {catEmoji} {cat.Category}: ${cat.Amount:N2}");
                        }
                    }
                    insights.Add("");
                }

                insights.Add("📊 **Analysis:**");
                
                if (partnerGroups.Count >= 2)
                {
                    var difference = partnerGroups[0].TotalSpent - partnerGroups[1].TotalSpent;
                    var percentDiff = partnerGroups[1].TotalSpent > 0 
                        ? (difference / partnerGroups[1].TotalSpent) * 100 
                        : 0;

                    if (Math.Abs(percentDiff) < 10)
                    {
                        insights.Add("✅ Spending is fairly balanced between partners!");
                    }
                    else
                    {
                        insights.Add($"📊 {partnerGroups[0].Partner} spent ${difference:N2} more ({Math.Abs(percentDiff):F1}% difference)");
                    }

                    var idealSplit = totalSpending / 2;
                    insights.Add($"\n💰 **50/50 Split Reference:**");
                    insights.Add($"   Each should spend: ${idealSplit:N2}");
                    
                    foreach (var partner in partnerGroups)
                    {
                        var splitDiff = partner.TotalSpent - idealSplit;
                        if (splitDiff > 0)
                        {
                            insights.Add($"   {partner.Partner}: ${splitDiff:N2} over even split");
                        }
                        else
                        {
                            insights.Add($"   {partner.Partner}: ${Math.Abs(splitDiff):N2} under even split");
                        }
                    }
                }

                insights.Add($"\n💡 Remember: Fair doesn't always mean equal. Consider income ratios and individual needs!");
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε κοινά έξοδα",
                    "Ποια είναι τα κύρια έξοδά μας;",
                    "Ρύθμιση προϋπολογισμού μαζί"
                }
                : new List<string>
                {
                    "Show shared expenses",
                    "What are our top expenses?",
                    "Set up budget together"
                };

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "text",
                Data = new
                {
                    partnerGroups,
                    totalSpending,
                    splitEvenly = totalSpending / Math.Max(partnerGroups.Count, 1)
                },
                QuickActions = quickActions,
                ActionLink = "/expenses"
            };
        }
        
        private async Task<ChatbotResponse> GetTotalLoansAsync(string userId, string language = "en") => 
            await GetLoanStatusAsync(userId, language);
        
        private async Task<ChatbotResponse> GetNextPaymentAsync(string userId, string language = "en") => 
            await GetLoanStatusAsync(userId, language);
        
        /// <summary>
        /// Get budget status with detailed analysis
        /// </summary>
        private async Task<ChatbotResponse> GetBudgetStatusAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

            // Get active budgets
            var budgets = await _dbContext.Budgets
                .Where(b => b.UserId == userId && b.IsActive)
                .ToListAsync();

            if (!budgets.Any())
            {
                var noBudgetMessage = language == "el"
                    ? "Δεν έχετε ορίσει κανέναν προϋπολογισμό ακόμα. Θα θέλατε να δημιουργήσετε έναν; Ο ορισμός προϋπολογισμών σας βοηθά να παραμείνετε εντός στόχου με τους οικονομικούς σας στόχους! 🎯"
                    : "You haven't set up any budgets yet. Would you like to create one? Setting budgets helps you stay on track with your financial goals! 🎯";
                
                var noBudgetQuickActions = language == "el"
                    ? new List<string>
                    {
                        "Πώς να δημιουργήσω προϋπολογισμό;",
                        "Δείξε τις δαπάνες μου ανά κατηγορία",
                        "Δώσε μου ανάλυση δαπανών"
                    }
                    : new List<string>
                    {
                        "How to create a budget?",
                        "Show my spending by category",
                        "Give me spending insights"
                    };

                return new ChatbotResponse
                {
                    Message = noBudgetMessage,
                    Type = "suggestion",
                    QuickActions = noBudgetQuickActions,
                    ActionLink = "/budgets"
                };
            }

            // Calculate spending for each budget category
            var transactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= monthStart)
                .ToListAsync();

            var insights = new List<string>();
            var totalBudget = budgets.Sum(b => b.Amount);
            var totalSpent = budgets.Sum(b => b.SpentAmount);
            var totalRemaining = totalBudget - totalSpent;
            var overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
            var overBudgetCount = 0;
            var atRiskCount = 0;

            if (language == "el")
            {
                insights.Add("💰 **Αναφορά Κατάστασης Προϋπολογισμού**\n");
                insights.Add($"**Συνολική Πρόοδος:** {overallProgress:F1}%");
                insights.Add($"• Συνολικός Προϋπολογισμός: ${totalBudget:N2}");
                insights.Add($"• Συνολικά Ξοδεύτηκαν: ${totalSpent:N2}");
                insights.Add($"• Υπόλοιπο: ${totalRemaining:N2}\n");

                insights.Add("**Ανάλυση Κατηγοριών:**");
                foreach (var budget in budgets.OrderByDescending(b => (b.SpentAmount / b.Amount) * 100))
                {
                    var progress = budget.Amount > 0 ? (budget.SpentAmount / budget.Amount) * 100 : 0;
                    var remaining = budget.Amount - budget.SpentAmount;
                    var emoji = GetBudgetStatusEmoji(progress);

                    insights.Add($"\n{emoji} **{budget.Category}**");
                    insights.Add($"   ${budget.SpentAmount:N2} / ${budget.Amount:N2} ({progress:F0}%)");

                    if (progress > 100)
                    {
                        overBudgetCount++;
                        insights.Add($"   ⚠️ Πάνω από τον προϋπολογισμό κατά ${Math.Abs(remaining):N2}!");
                    }
                    else if (progress > 80)
                    {
                        atRiskCount++;
                        insights.Add($"   ⚡ Πλησιάζει! ${remaining:N2} απομένουν");
                    }
                    else
                    {
                        insights.Add($"   ✅ ${remaining:N2} απομένουν");
                    }
                }

                insights.Add($"\n📊 **Σύνοψη:**");
                if (overBudgetCount > 0)
                {
                    insights.Add($"⚠️ {overBudgetCount} κατηγορία/κατηγορίες πάνω από τον προϋπολογισμό. Ώρα να εξετάσετε τις δαπάνες σας!");
                }
                else if (atRiskCount > 0)
                {
                    insights.Add($"⚡ {atRiskCount} κατηγορία/κατηγορίες πλησιάζουν τα όρια. Προσέξτε τις δαπάνες σας!");
                }
                else
                {
                    insights.Add($"✅ Όλοι οι προϋπολογισμοί είναι υγιείς! Καλή δουλειά στη διαχείριση των οικονομικών σας! 🎉");
                }

                var daysLeft = DateTime.DaysInMonth(now.Year, now.Month) - now.Day;
                if (totalRemaining > 0 && daysLeft > 0)
                {
                    var dailyAllowance = totalRemaining / daysLeft;
                    insights.Add($"💡 Ημερήσια δαπάνη για το υπόλοιπο του μήνα: ${dailyAllowance:N2}");
                }
            }
            else
            {
                insights.Add("💰 **Budget Status Report**\n");
                insights.Add($"**Overall Progress:** {overallProgress:F1}%");
                insights.Add($"• Total Budget: ${totalBudget:N2}");
                insights.Add($"• Total Spent: ${totalSpent:N2}");
                insights.Add($"• Remaining: ${totalRemaining:N2}\n");

                insights.Add("**Category Breakdown:**");
                foreach (var budget in budgets.OrderByDescending(b => (b.SpentAmount / b.Amount) * 100))
                {
                    var progress = budget.Amount > 0 ? (budget.SpentAmount / budget.Amount) * 100 : 0;
                    var remaining = budget.Amount - budget.SpentAmount;
                    var emoji = GetBudgetStatusEmoji(progress);

                    insights.Add($"\n{emoji} **{budget.Category}**");
                    insights.Add($"   ${budget.SpentAmount:N2} / ${budget.Amount:N2} ({progress:F0}%)");

                    if (progress > 100)
                    {
                        overBudgetCount++;
                        insights.Add($"   ⚠️ Over budget by ${Math.Abs(remaining):N2}!");
                    }
                    else if (progress > 80)
                    {
                        atRiskCount++;
                        insights.Add($"   ⚡ Getting close! ${remaining:N2} remaining");
                    }
                    else
                    {
                        insights.Add($"   ✅ ${remaining:N2} left");
                    }
                }

                insights.Add($"\n📊 **Summary:**");
                if (overBudgetCount > 0)
                {
                    insights.Add($"⚠️ {overBudgetCount} category/categories over budget. Time to review your spending!");
                }
                else if (atRiskCount > 0)
                {
                    insights.Add($"⚡ {atRiskCount} category/categories nearing limits. Watch your spending!");
                }
                else
                {
                    insights.Add($"✅ All budgets are healthy! Great job managing your finances! 🎉");
                }

                var daysLeft = DateTime.DaysInMonth(now.Year, now.Month) - now.Day;
                if (totalRemaining > 0 && daysLeft > 0)
                {
                    var dailyAllowance = totalRemaining / daysLeft;
                    insights.Add($"💡 Daily allowance for the rest of the month: ${dailyAllowance:N2}");
                }
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Πώς μπορώ να μειώσω τις δαπάνες;",
                    "Δείξε κύρια έξοδα",
                    "Προσαρμογή προϋπολογισμών μου"
                }
                : new List<string>
                {
                    "How can I reduce spending?",
                    "Show top expenses",
                    "Adjust my budgets"
                };

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = overBudgetCount > 0 ? "warning" : "text",
                Data = new
                {
                    budgets,
                    totalBudget,
                    totalSpent,
                    totalRemaining,
                    overallProgress,
                    overBudgetCount,
                    atRiskCount,
                    daysLeft = DateTime.DaysInMonth(now.Year, now.Month) - now.Day
                },
                QuickActions = quickActions,
                ActionLink = "/budgets"
            };
        }

        /// <summary>
        /// Get budget status emoji based on progress
        /// </summary>
        private string GetBudgetStatusEmoji(decimal progress)
        {
            return progress switch
            {
                > 100 => "🔴",
                > 80 => "🟡",
                > 50 => "🟢",
                _ => "✅"
            };
        }
        
        private Task<ChatbotResponse> GetBudgetCategoryAsync(string userId, string query, string language = "en") => 
            Task.FromResult(GetUnknownResponse(null, null, language));
        
        private async Task<ChatbotResponse> GetSpendingTrendsAsync(string userId, string language = "en") => 
            await GetSpendingInsightsAsync(userId, language);
        
        private async Task<ChatbotResponse> GetTopCategoriesAsync(string userId, string language = "en") => 
            await GetSpendingInsightsAsync(userId, language);
        
        /// <summary>
        /// Get savings goals progress with motivational insights
        /// </summary>
        private async Task<ChatbotResponse> GetSavingsGoalsAsync(string userId, string language = "en")
        {
            var goals = await _dbContext.SavingsGoals
                .Where(g => g.UserId == userId && !g.IsAchieved)
                .OrderBy(g => g.TargetDate)
                .ToListAsync();

            if (!goals.Any())
            {
                var noGoalsMessage = language == "el"
                    ? "Δεν έχετε κανέναν ενεργό στόχο αποταμίευσης. Ο ορισμός στόχων σας βοηθά να παραμείνετε παρακινημένοι και να φτάσετε τα οικονομικά σας όνειρα! 🎯\n\nΘα θέλατε να δημιουργήσετε έναν στόχο αποταμίευσης;"
                    : "You don't have any active savings goals. Setting goals helps you stay motivated and reach your financial dreams! 🎯\n\nWould you like to create a savings goal?";
                
                var noGoalsQuickActions = language == "el"
                    ? new List<string>
                    {
                        "Πώς να ορίσω στόχο αποταμίευσης;",
                        "Ποιο είναι το τρέχον υπόλοιπό μου;",
                        "Δώσε μου συμβουλές αποταμίευσης"
                    }
                    : new List<string>
                    {
                        "How to set a savings goal?",
                        "What's my current balance?",
                        "Give me savings tips"
                    };

                return new ChatbotResponse
                {
                    Message = noGoalsMessage,
                    Type = "suggestion",
                    QuickActions = noGoalsQuickActions,
                    ActionLink = "/savings-goals"
                };
            }

            var insights = new List<string>();
            var totalTarget = goals.Sum(g => g.TargetAmount);
            var totalCurrent = goals.Sum(g => g.CurrentAmount);
            var totalRemaining = totalTarget - totalCurrent;
            var overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

            if (language == "el")
            {
                insights.Add("🎯 **Πρόοδος Στόχων Αποταμίευσης**\n");
                insights.Add($"**Συνολική Πρόοδος:** {overallProgress:F1}%");
                insights.Add($"• Στόχος: ${totalTarget:N2}");
                insights.Add($"• Αποταμιεύτηκαν: ${totalCurrent:N2}");
                insights.Add($"• Απομένουν: ${totalRemaining:N2}\n");
            }
            else
            {
                insights.Add("🎯 **Savings Goals Progress**\n");
                insights.Add($"**Overall Progress:** {overallProgress:F1}%");
                insights.Add($"• Target: ${totalTarget:N2}");
                insights.Add($"• Saved: ${totalCurrent:N2}");
                insights.Add($"• Remaining: ${totalRemaining:N2}\n");
            }

            foreach (var goal in goals)
            {
                var progress = goal.TargetAmount > 0 ? (goal.CurrentAmount / goal.TargetAmount) * 100 : 0;
                var remaining = goal.TargetAmount - goal.CurrentAmount;
                var emoji = GetGoalProgressEmoji(progress);

                insights.Add($"{emoji} **{goal.Name}**");
                insights.Add($"   ${goal.CurrentAmount:N2} / ${goal.TargetAmount:N2} ({progress:F0}%)");

                // Calculate time-based insights
                if (goal.TargetDate.HasValue)
                {
                    var daysLeft = (goal.TargetDate.Value - DateTime.UtcNow).Days;
                    
                    if (daysLeft > 0 && remaining > 0)
                    {
                        var dailySavingsNeeded = remaining / daysLeft;
                        var monthlySavingsNeeded = dailySavingsNeeded * 30;
                        
                        if (language == "el")
                        {
                            insights.Add($"   📅 {daysLeft} ημέρες μέχρι {goal.TargetDate.Value:MMM dd, yyyy}");
                            insights.Add($"   💰 Αποταμιεύστε ${dailySavingsNeeded:N2}/ημέρα ή ${monthlySavingsNeeded:N2}/μήνα για να φτάσετε τον στόχο");

                            // Motivational messages (Greek)
                            if (progress >= 75)
                            {
                                insights.Add($"   🌟 Σχεδόν εκεί! Απομένουν μόνο ${remaining:N2}!");
                            }
                            else if (progress >= 50)
                            {
                                insights.Add($"   👍 Στη μέση! Συνεχίστε έτσι!");
                            }
                            else if (progress >= 25)
                            {
                                insights.Add($"   💪 Καλή αρχή! Μείνετε συνεπείς!");
                            }
                            else if (daysLeft < 30 && progress < 50)
                            {
                                insights.Add($"   ⚡ Ο χρόνος τελειώνει. Σκεφτείτε να αυξήσετε τον ρυθμό αποταμίευσης!");
                            }
                        }
                        else
                        {
                            insights.Add($"   📅 {daysLeft} days until {goal.TargetDate.Value:MMM dd, yyyy}");
                            insights.Add($"   💰 Save ${dailySavingsNeeded:N2}/day or ${monthlySavingsNeeded:N2}/month to reach goal");

                            // Motivational messages
                            if (progress >= 75)
                            {
                                insights.Add($"   🌟 Almost there! Just ${remaining:N2} to go!");
                            }
                            else if (progress >= 50)
                            {
                                insights.Add($"   👍 Halfway there! Keep it up!");
                            }
                            else if (progress >= 25)
                            {
                                insights.Add($"   💪 Good start! Stay consistent!");
                            }
                            else if (daysLeft < 30 && progress < 50)
                            {
                                insights.Add($"   ⚡ Time is running short. Consider increasing your savings rate!");
                            }
                        }
                    }
                    else if (daysLeft <= 0)
                    {
                        if (language == "el")
                        {
                            insights.Add($"   ⏰ Η ημερομηνία στόχου πέρασε. Σκεφτείτε να προσαρμόσετε τον στόχο σας!");
                        }
                        else
                        {
                            insights.Add($"   ⏰ Target date passed. Consider adjusting your goal!");
                        }
                    }
                }

                insights.Add(""); // Empty line between goals
            }

            // Recommendations
            if (language == "el")
            {
                insights.Add("💡 **Συμβουλές για να Φτάσετε τους Στόχους σας:**");
                
                if (overallProgress < 25)
                {
                    insights.Add("• Ρύθμιση αυτόματων μεταφορών στις αποταμιεύσεις σας");
                    insights.Add("• Εξέταση και μείωση περιττών εξόδων");
                    insights.Add("• Σκεφτείτε μια ευκαιρία επιπλέον εισοδήματος");
                }
                else if (overallProgress < 75)
                {
                    insights.Add("• Συνεχίστε την καλή δουλειά!");
                    insights.Add("• Αυξήστε ελαφρώς τις μηνιαίες αποταμιεύσεις");
                    insights.Add("• Παρακολουθήστε την πρόοδό σας");
                }
                else
                {
                    insights.Add("• Σχεδόν εκεί! Συνεχίστε την προσπάθεια!");
                    insights.Add("• Σκεφτείτε να ορίσετε νέους στόχους");
                }
            }
            else
            {
                insights.Add("💡 **Tips to Reach Your Goals:**");
                
                if (overallProgress < 25)
                {
                    insights.Add("• Set up automatic transfers to your savings");
                    insights.Add("• Review and reduce unnecessary expenses");
                    insights.Add("• Consider a side income opportunity");
                }
                else if (overallProgress < 75)
                {
                    insights.Add("• You're making great progress! Stay consistent");
                    insights.Add("• Look for extra savings in your budget");
                    insights.Add("• Celebrate small milestones to stay motivated");
                }
                else
                {
                    insights.Add("• You're so close! Keep pushing!");
                    insights.Add("• Consider preparing for your next goal");
                    insights.Add("• You're crushing it! 🎉");
                }
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Πώς μπορώ να αποταμιεύσω περισσότερο;",
                    "Δείξε τις δαπάνες μου",
                    "Ενημέρωση πρόοδου στόχου"
                }
                : new List<string>
                {
                    "How can I save more?",
                    "Show my spending",
                    "Update goal progress"
                };

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = "insight",
                Data = new
                {
                    goals,
                    totalTarget,
                    totalCurrent,
                    totalRemaining,
                    overallProgress
                },
                QuickActions = quickActions,
                ActionLink = "/savings-goals"
            };
        }

        /// <summary>
        /// Get goal progress emoji
        /// </summary>
        private string GetGoalProgressEmoji(decimal progress)
        {
            return progress switch
            {
                >= 100 => "🎉",
                >= 75 => "🌟",
                >= 50 => "🎯",
                >= 25 => "💪",
                _ => "🎲"
            };
        }
        
        /// <summary>
        /// Predict spending for the rest of the month based on historical patterns
        /// </summary>
        private async Task<ChatbotResponse> PredictSpendingAsync(string userId, string language = "en")
        {
            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var daysElapsed = now.Day;
            var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);
            var daysRemaining = daysInMonth - daysElapsed;

            // Get current month spending
            var currentMonthTransactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= monthStart && t.Date <= now)
                .ToListAsync();

            var currentSpending = currentMonthTransactions.Sum(t => t.Amount);
            var currentDailyAverage = daysElapsed > 0 ? currentSpending / daysElapsed : 0;

            // Get last 3 months for better prediction
            var threeMonthsAgo = monthStart.AddMonths(-3);
            var historicalTransactions = await _dbContext.Transactions
                .Where(t => t.UserId == userId && t.Type == "expense")
                .Where(t => t.Date >= threeMonthsAgo && t.Date < monthStart)
                .ToListAsync();

            // Calculate historical monthly average
            var monthlyGroups = historicalTransactions
                .GroupBy(t => new { t.Date.Year, t.Date.Month })
                .Select(g => g.Sum(t => t.Amount))
                .ToList();

            var historicalMonthlyAvg = monthlyGroups.Any() ? monthlyGroups.Average() : currentSpending;

            // Prediction methods
            var linearProjection = currentDailyAverage * daysInMonth; // Simple linear projection
            var historicalBased = (currentSpending + (historicalMonthlyAvg - currentSpending) * 0.3m); // Weighted with history
            var conservativeEstimate = Math.Max(linearProjection, historicalBased); // Take higher for conservative estimate

            // Category-based predictions
            var categoryPredictions = currentMonthTransactions
                .GroupBy(t => t.Category)
                .Select(g => new
                {
                    Category = g.Key,
                    CurrentSpend = g.Sum(t => t.Amount),
                    ProjectedSpend = (g.Sum(t => t.Amount) / daysElapsed) * daysInMonth,
                    Trend = g.Sum(t => t.Amount) / currentSpending * 100
                })
                .OrderByDescending(c => c.ProjectedSpend)
                .Take(5)
                .ToList();

            var insights = new List<string>();
            
            if (language == "el")
            {
                insights.Add("🔮 **Πρόβλεψη Δαπανών**\n");
                insights.Add($"**Τρέχουσα Κατάσταση (Ημέρα {daysElapsed}/{daysInMonth}):**");
                insights.Add($"• Ξοδεύτηκαν μέχρι στιγμής: ${currentSpending:N2}");
                insights.Add($"• Ημερήσιος μέσος όρος: ${currentDailyAverage:N2}\n");
                insights.Add($"**Προβλέψεις Τέλους Μήνα:**");
                insights.Add($"📊 Γραμμική Πρόβλεψη: **${linearProjection:N2}**");
                insights.Add($"   (Βασισμένη στον τρέχοντα ημερήσιο ρυθμό)");
                insights.Add($"📈 Ιστορικά Προσαρμοσμένη: **${historicalBased:N2}**");
                insights.Add($"   (Σταθμισμένη με τους τελευταίους 3 μήνες)");
                insights.Add($"🎯 Συντηρητική Εκτίμηση: **${conservativeEstimate:N2}**\n");
            }
            else
            {
                insights.Add("🔮 **Spending Forecast**\n");
                insights.Add($"**Current Status (Day {daysElapsed}/{daysInMonth}):**");
                insights.Add($"• Spent so far: ${currentSpending:N2}");
                insights.Add($"• Daily average: ${currentDailyAverage:N2}\n");
                insights.Add($"**Month-End Projections:**");
                insights.Add($"📊 Linear Projection: **${linearProjection:N2}**");
                insights.Add($"   (Based on current daily rate)");
                insights.Add($"📈 Historical Adjusted: **${historicalBased:N2}**");
                insights.Add($"   (Weighted with past 3 months)");
                insights.Add($"🎯 Conservative Estimate: **${conservativeEstimate:N2}**\n");
            }

            // Comparison with historical
            var difference = conservativeEstimate - historicalMonthlyAvg;
            var percentDiff = historicalMonthlyAvg > 0 ? (difference / historicalMonthlyAvg) * 100 : 0;

            if (language == "el")
            {
                if (Math.Abs(percentDiff) > 10)
                {
                    if (difference > 0)
                    {
                        insights.Add($"⚠️ Προβλέπεται να ξοδέψετε **{Math.Abs(percentDiff):F1}%** περισσότερο από τον μέσο όρο 3 μηνών (${Math.Abs(difference):N2})");
                        insights.Add($"💡 Σκεφτείτε να εξετάσετε τα έξοδά σας για να παραμείνετε εντός στόχου!");
                    }
                    else
                    {
                        insights.Add($"✅ Προβλέπεται να ξοδέψετε **{Math.Abs(percentDiff):F1}%** λιγότερο από τον μέσο όρο 3 μηνών (${Math.Abs(difference):N2} αποταμιεύτηκαν!)");
                        insights.Add($"🎉 Καλή δουλειά στη διαχείριση των δαπανών σας!");
                    }
                }
                else
                {
                    insights.Add($"📊 Οι δαπάνες σας είναι συνεπείς με τον ιστορικό μέσο όρο.");
                }

                // Category predictions (Greek)
                if (categoryPredictions.Any())
                {
                    insights.Add($"\n**Κύριες Προβλεπόμενες Κατηγορίες:**");
                    foreach (var cat in categoryPredictions.Take(3))
                    {
                        var emoji = GetCategoryEmoji(cat.Category);
                        insights.Add($"{emoji} {cat.Category}: ${cat.ProjectedSpend:N2} ({cat.Trend:F0}% του συνόλου)");
                    }
                }

                insights.Add($"\n💡 **Συμβουλές:**");
            }
            else
            {
                if (Math.Abs(percentDiff) > 10)
                {
                    if (difference > 0)
                    {
                        insights.Add($"⚠️ Projected to spend **{Math.Abs(percentDiff):F1}%** more than your 3-month average (${Math.Abs(difference):N2})");
                        insights.Add($"💡 Consider reviewing your expenses to stay on track!");
                    }
                    else
                    {
                        insights.Add($"✅ Projected to spend **{Math.Abs(percentDiff):F1}%** less than your 3-month average (${Math.Abs(difference):N2} saved!)");
                        insights.Add($"🎉 Great job managing your spending!");
                    }
                }
                else
                {
                    insights.Add($"📊 Your spending is consistent with your historical average.");
                }

                // Category predictions
                if (categoryPredictions.Any())
                {
                    insights.Add($"\n**Top Projected Categories:**");
                    foreach (var cat in categoryPredictions.Take(3))
                    {
                        var emoji = GetCategoryEmoji(cat.Category);
                        insights.Add($"{emoji} {cat.Category}: ${cat.ProjectedSpend:N2} ({cat.Trend:F0}% of total)");
                    }
                }

                insights.Add($"\n💡 **Recommendations:**");
            }
            if (daysRemaining > 0)
            {
                var suggestedDailyLimit = (historicalMonthlyAvg - currentSpending) / daysRemaining;
                if (suggestedDailyLimit > 0)
                {
                    insights.Add($"• Try to limit spending to ${suggestedDailyLimit:N2}/day for the rest of the month");
                }
                else
                {
                    insights.Add($"• You've already exceeded your typical monthly spending");
                    insights.Add($"• Focus on essential expenses only for the rest of the month");
                }
            }

            var quickActions = language == "el"
                ? new List<string>
                {
                    "Δείξε τους προϋπολογισμούς μου",
                    "Πώς μπορώ να αποταμιεύσω χρήματα;",
                    "Ποια είναι τα κύρια έξοδά μου;"
                }
                : new List<string>
                {
                    "Show me my budgets",
                    "How can I save money?",
                    "What are my top expenses?"
                };

            return new ChatbotResponse
            {
                Message = string.Join("\n", insights),
                Type = percentDiff > 15 ? "warning" : "insight",
                Data = new
                {
                    currentSpending,
                    currentDailyAverage,
                    linearProjection,
                    historicalBased,
                    conservativeEstimate,
                    historicalMonthlyAvg,
                    daysRemaining,
                    categoryPredictions
                },
                QuickActions = quickActions,
                ActionLink = "/analytics"
            };
        }
    }
}


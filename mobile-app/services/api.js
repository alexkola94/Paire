/**
 * API Service - Barrel export from feature-specific services
 * Uses shared/services/apiClient for axios instance
 */

import { setApiSessionExpiredCallback } from '../shared/services/apiClient';

export { setApiSessionExpiredCallback };

// Auth
export { twoFactorService } from '../features/auth/services/twoFactorService';

// Finance
export { transactionService } from '../features/finance/services/transactionService';
export { loanService } from '../features/finance/services/loanService';
export { loanPaymentService } from '../features/finance/services/loanPaymentService';
export { storageService } from '../features/finance/services/storageService';
export { budgetService } from '../features/finance/services/budgetService';
export { savingsGoalService } from '../features/finance/services/savingsGoalService';
export { recurringBillService } from '../features/finance/services/recurringBillService';
export { currencyService } from '../features/finance/services/currencyService';
export { voiceService } from '../features/finance/services/voiceService';

// Banking
export { importService } from '../features/banking/services/importService';
export { openBankingService } from '../features/banking/services/openBankingService';

// Profile
export { profileService } from '../features/profile/services/profileService';

// Partnership
export { partnershipService } from '../features/partnership/services/partnershipService';

// Shopping
export { shoppingListService } from '../features/shopping/services/shoppingListService';

// Analytics
export { analyticsService } from '../features/analytics/services/analyticsService';
export { achievementService } from '../features/analytics/services/achievementService';
export { economicService } from '../features/analytics/services/economicService';
export { financialHealthService } from '../features/analytics/services/financialHealthService';
export { weeklyRecapService } from '../features/analytics/services/weeklyRecapService';
export { yearReviewService } from '../features/analytics/services/yearReviewService';

// Gamification
export { challengeService } from '../features/gamification/services/challengeService';
export { paireHomeService } from '../features/gamification/services/paireHomeService';
export { streakService } from '../features/gamification/services/streakService';

// AI
export { chatbotService } from '../features/ai/services/chatbotService';
export { aiGatewayService } from '../features/ai/services/aiGatewayService';
export { conversationService } from '../features/ai/services/conversationService';

// Notifications
export { reminderService } from '../features/notifications/services/reminderService';

// Travel
export {
  travelService,
  tripCityService,
  savedPlaceService,
  geocodingService,
  travelChatbotService,
  travelAdvisoryService,
  travelNotificationsService,
  discoveryService,
  flightService,
} from '../features/travel/services';

// Admin
export { adminService } from '../features/admin/services/adminService';

// Legal (public stats - no auth)
export { publicStatsService } from '../features/legal/services/publicStatsService';

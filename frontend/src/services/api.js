/**
 * API barrel - re-exports all domain services from feature modules.
 * Domain API calls live in features/{domain}/services/.
 * Base client: shared/services/apiClient.js
 */

export {
  transactionService,
  loanService,
  loanPaymentService,
  budgetService,
  savingsGoalService,
  recurringBillService,
  storageService,
  voiceService,
  currencyService
} from '../features/finance/services'

export { partnershipService } from '../features/partnership/services/partnershipService'
export { shoppingListService } from '../features/shopping/services/shoppingListService'
export { analyticsService } from '../features/analytics/services/analyticsService'
export { achievementService } from '../features/analytics/services/achievementService'
export { financialHealthService } from '../features/analytics/services/financialHealthService'
export { weeklyRecapService } from '../features/analytics/services/weeklyRecapService'
export { yearReviewService } from '../features/analytics/services/yearReviewService'
export { challengeService } from '../features/gamification/services/challengeService'
export { paireHomeService } from '../features/gamification/services/paireHomeService'
export { streakService } from '../features/gamification/services/streakService'
export { chatbotService } from '../features/ai/services/chatbotService'
export { aiGatewayService } from '../features/ai/services/aiGatewayService'
export { conversationService } from '../features/ai/services/conversationService'
export { reminderService } from '../features/notifications/services/reminderService'
export { profileService } from '../features/profile/services/profileService'
export { adminService } from '../features/admin/services/adminService'
export { twoFactorService } from '../features/auth/services/twoFactorService'
export { publicStatsService } from '../features/legal/services/publicStatsService'
export { travelChatbotService } from '../features/travel/services/travelChatbotService'

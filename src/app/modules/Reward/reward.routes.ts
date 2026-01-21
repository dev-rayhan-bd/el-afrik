import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { RewardControllers } from './reward.controller';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════════════

// Get my reward summary
router.get(
  '/my-summary',
  auth(USER_ROLE.user),
  RewardControllers.getMyRewardSummary
);

// Get my point history with filters
// Query params: ?type=earned|used|expired&startDate=2024-01-01&endDate=2024-12-31&page=1&limit=20
router.get(
  '/my-history',
  auth(USER_ROLE.user),
  RewardControllers.getMyPointHistory
);

// Get my detailed reward info
router.get(
  '/my-detailed',
  auth(USER_ROLE.user),
  RewardControllers.getMyDetailedReward
);

// Get available points (for checkout page)
router.get(
  '/my-points',
  auth(USER_ROLE.user),
  RewardControllers.getMyAvailablePoints
);

// ═══════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════

// Get any user's detailed reward
router.get(
  '/admin/user/:userId',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  RewardControllers.getUserReward
);

// Get any user's reward summary
router.get(
  '/admin/user/:userId/summary',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  RewardControllers.getUserRewardSummary
);

// Add bonus points to user
router.post(
  '/admin/add-bonus',
  auth(USER_ROLE.superAdmin),
  RewardControllers.addBonusPoints
);

// Deduct points from user
router.post(
  '/admin/deduct-points',
  auth(USER_ROLE.superAdmin),
  RewardControllers.deductPoints
);

// Process expired points (can be called by cron job)
router.post(
  '/admin/process-expired',
  auth(USER_ROLE.superAdmin),
  RewardControllers.processExpiredPoints
);

export const RewardRoutes = router;
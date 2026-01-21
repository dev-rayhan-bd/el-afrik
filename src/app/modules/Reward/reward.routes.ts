// c:\STA\El-afrik\src\app\modules\Reward\reward.routes.ts

import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { RewardControllers } from './reward.controller';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/my-summary',
  auth(USER_ROLE.user),
  RewardControllers.getMyRewardSummary
);

router.get(
  '/my-history',
  auth(USER_ROLE.user),
  RewardControllers.getMyPointHistory
);

router.get(
  '/my-detailed',
  auth(USER_ROLE.user),
  RewardControllers.getMyDetailedReward
);

router.get(
  '/my-points',
  auth(USER_ROLE.user),
  RewardControllers.getMyAvailablePoints
);

router.post('/claim', auth(USER_ROLE.user), RewardControllers.claimReward);

router.post(
  '/claim-all',
  auth(USER_ROLE.user),
  RewardControllers.claimAllRewards
);

// ═══════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════

router.get(
  '/admin/user/:userId',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  RewardControllers.getUserReward
);

router.get(
  '/admin/user/:userId/summary',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  RewardControllers.getUserRewardSummary
);

router.post(
  '/admin/add-bonus',
  auth(USER_ROLE.superAdmin),
  RewardControllers.addBonusPoints
);

router.post(
  '/admin/deduct-points',
  auth(USER_ROLE.superAdmin),
  RewardControllers.deductPoints
);

router.post(
  '/admin/process-expired',
  auth(USER_ROLE.superAdmin),
  RewardControllers.processExpiredPoints
);

export const RewardRoutes = router;
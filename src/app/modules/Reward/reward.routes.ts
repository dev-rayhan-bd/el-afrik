import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { RewardControllers } from './reward.controller';

const router = Router();

router.get('/my-summary', auth(USER_ROLE.user), RewardControllers.getMyRewardSummary);
router.get('/my-history', auth(USER_ROLE.user), RewardControllers.getMyPointHistory);

export const RewardRoutes = router;
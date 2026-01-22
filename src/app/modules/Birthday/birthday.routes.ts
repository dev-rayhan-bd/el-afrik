import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { BirthdayController } from './birthday.controller';

const router = Router();

router.get('/check', auth(USER_ROLE.user), BirthdayController.checkStatus);
router.post('/activate-claim', auth(USER_ROLE.user), BirthdayController.activateClaim);
router.post('/claim', auth(USER_ROLE.user), BirthdayController.placeClaimOrder);

export const BirthdayRoutes = router;
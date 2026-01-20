import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { SpecialPromoControllers } from './specialpromo.controller';


const router = express.Router();

// Public can view active promos
router.get('/all',  auth(USER_ROLE.user), SpecialPromoControllers.getAllSpecialPromos);

// Only SuperAdmin/Admin can manage promos
router.post(
  '/create',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  SpecialPromoControllers.createSpecialPromo
);

router.delete(
  '/:id',
  auth(USER_ROLE.superAdmin, USER_ROLE.admin),
  SpecialPromoControllers.deleteSpecialPromo
);

export const SpecialPromoRoutes = router;
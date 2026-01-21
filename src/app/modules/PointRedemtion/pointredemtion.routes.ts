// c:\STA\El-afrik\src\app\modules\Orders\pointRedemption.routes.ts

import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { PointRedemptionController } from './pointredemtion.controller';


const router = Router();

router.get(
  '/products',
  auth(USER_ROLE.user),
  PointRedemptionController.getRedeemableProducts
);

router.post(
  '/calculate',
  auth(USER_ROLE.user),
  PointRedemptionController.calculateRedemptionCost
);

router.post(
  '/purchase',
  auth(USER_ROLE.user),
  PointRedemptionController.purchaseWithPoints
);

router.post(
  '/quick-redeem/:productId',
  auth(USER_ROLE.user),
  PointRedemptionController.quickRedeemProduct
);

router.get(
  '/my-orders',
  auth(USER_ROLE.user),
  PointRedemptionController.getMyRedemptionOrders
);

router.get(
  '/order/:orderId',
  auth(USER_ROLE.user),
  PointRedemptionController.getRedemptionOrderById
);

router.patch(
  '/cancel/:orderId',
  auth(USER_ROLE.user),
  PointRedemptionController.cancelRedemptionOrder
);

export const PointRedemptionRoutes = router;
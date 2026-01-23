// modules/order/order.route.ts
import { Router } from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { OrderController } from './orders.controller';




const router = Router();



// ═══════════════════════════════════════════════════════════════════════
// USER ROUTES
// ═══════════════════════════════════════════════════════════════════════

// Create checkout session
router.post(
  '/checkout',
  auth(USER_ROLE.user),

  OrderController.createCheckout
);
// Single product buy now route
router.post(
  '/buy-now',
  auth(USER_ROLE.user),
  OrderController.createSingleProductCheckout
);
// buy now with special promo
router.post(
  '/promo-buy-now',
  auth(USER_ROLE.user),
  OrderController.createPromoCheckout
);
// Get user's orders
router.get('/my-orders', auth(USER_ROLE.user), OrderController.getMyOrders);

// Track order by order number
router.get('/track/:orderNumber', auth(USER_ROLE.user,USER_ROLE.superAdmin), OrderController.trackOrder);

// Cancel order
router.patch(
  '/:id/cancel',
auth(USER_ROLE.user,USER_ROLE.superAdmin),

  OrderController.cancelOrder
);

// Get single order (must be placed after specific routes)
router.get('/:id',auth(USER_ROLE.user,USER_ROLE.superAdmin), OrderController.getOrderById);

// ═══════════════════════════════════════════════════════════════════════
// ADMIN ROUTES
// ═══════════════════════════════════════════════════════════════════════

// Get all orders
router.get('/admin/all', auth(USER_ROLE.superAdmin), OrderController.getAllOrders);

// Get order statistics
router.get('/admin/stats', auth(USER_ROLE.superAdmin), OrderController.getOrderStats);

// Get any order by ID
router.get('/admin/:id', auth(USER_ROLE.superAdmin), OrderController.getOrderByIdAdmin);

// Update order status
router.patch(
  '/admin/:id/status',
 auth(USER_ROLE.superAdmin),

  OrderController.updateOrderStatus
);

export const OrderRoutes = router;
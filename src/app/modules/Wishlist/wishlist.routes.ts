import express from 'express';
import auth from '../../middleware/auth';
import { USER_ROLE } from '../Auth/auth.constant';
import { WishlistControllers } from './wishlist.controller';

const router = express.Router();

router.get(
  '/mine',
  auth(USER_ROLE.user),
  WishlistControllers.getMyWishlist
);

router.post(
  '/add/:productId',
  auth(USER_ROLE.user),
  WishlistControllers.addToWishlist
);

router.delete(
  '/remove/:productId',
  auth(USER_ROLE.user),
  WishlistControllers.removeFromWishlist
);
router.delete(
  '/clear',
  auth(USER_ROLE.user),
  WishlistControllers.removeWishlist
);

export const WishlistRoutes = router;
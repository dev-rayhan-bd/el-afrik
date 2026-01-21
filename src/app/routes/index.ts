import { Router } from 'express';
import { AuthRoutes } from '../modules/Auth/auth.routes';
import { UserRoutes } from '../modules/User/user.routes';
import aboutRouter from '../modules/about/about.route';
import privacyPolicyRouter from '../modules/PrivacyPolicy/privacyPolicy.routes';
import termsRouter from '../modules/Terms/terms.route';
import { FaqRoutes } from '../modules/FAQ/faq.routes';
import { ContactRoutes } from '../modules/ContactUs/contact.route';
import { ProductRoutes } from '../modules/product/product.routes';
import { CategoryRoutes } from '../modules/categories/categories.route';
import { CartRoutes } from '../modules/Cart/cart.routes';
import { OrderRoutes } from '../modules/Orders/orders.routes';
import { WishlistRoutes } from '../modules/Wishlist/wishlist.routes';
import { SpecialPromoRoutes } from '../modules/SpecialPromo/specialpromo.routes';
import { RewardRoutes } from '../modules/Reward/reward.routes';
import { PointRedemptionRoutes } from '../modules/PointRedemtion/pointredemtion.routes';





const router = Router();

const moduleRoutes = [
  {
    path: '/auth',
    route:AuthRoutes
  },
  {
    path: '/user',
    route:UserRoutes
  },
  {
    path: '/about',
    route:aboutRouter
  },
  {
    path: '/privacy',
    route:privacyPolicyRouter
  },
  {
    path: '/terms',
    route:termsRouter
  },
  {
    path: '/faq',
    route:FaqRoutes
  },
  {
    path: '/contact',
    route:ContactRoutes
  },
  {
    path: '/product',
    route:ProductRoutes
  },
  {
    path: '/category',
    route:CategoryRoutes
  },
  {
    path: '/cart',
    route:CartRoutes
  },
  {
    path: '/order',
    route:OrderRoutes
  },
  {
    path: '/wishlist',
    route:WishlistRoutes
  },
  {
    path: '/promos',
    route:SpecialPromoRoutes
  },
  {
    path: '/reward',
    route:RewardRoutes
  },
  {
    path: '/redeem',
    route:PointRedemptionRoutes
  },
 

];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

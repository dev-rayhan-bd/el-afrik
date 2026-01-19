/* eslint-disable @typescript-eslint/no-explicit-any */
import express from "express";

import { cartControllers } from "./cart.controller";
import { USER_ROLE } from "../Auth/auth.constant";
import auth from "../../middleware/auth";

const router = express.Router();

// Route to get all items in the cart
router.get("/all-item", auth(USER_ROLE.user,
  ), cartControllers.getAllItemsFromCart);

// Route to get a single item from the cart
router.get(
  "/single-cart-item/:productId",
  auth(USER_ROLE.user,
  ),cartControllers.getSingleItemFromCart
);

// Route to add an item to the cart
router.post(
  "/add-item",
auth(USER_ROLE.user,
  ),
  cartControllers.addItemToCart
);

// Route to update the quantity of an item in the cart
router.patch(
  "/update-item/:productId",
auth(USER_ROLE.user,
  ),
  cartControllers.updateCartItem
);

// Route to remove an item from the cart
router.delete(
  "/remove-item/:productId",
  auth(USER_ROLE.user,
  ),
  cartControllers.removeItemFromCart
);

// Route to clear the entire cart
router.delete("/clear-cart",auth(USER_ROLE.user,
  ), cartControllers.clearCart);

export const CartRoutes = router;

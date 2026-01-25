// c:\STA\El-afrik\src\app\modules\Orders\orders.services.ts

import httpStatus from "http-status";
import mongoose from "mongoose";
import Stripe from "stripe";
import config from "../../config";
import {
  IOrder,
  IOrderDocument,
  IOrderItem,
  ICreateOrderInput,
  IOrderFilters,
  IPaginationOptions,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PaymentMethod,
  IShippingAddress,
} from "./orders.interface";
import sendEmail from "../../utils/sendEmail";
import { CartModel } from "../Cart/cart.model";
import AppError from "../../errors/AppError";
import { ProductModel } from "../product/product.model";
import { OrderModel } from "./orders.model";
import { UserModel } from "../User/user.model";
import { RewardServices } from "../Reward/reward.services";
import { PointSource } from "../Reward/reward.interface";
import { sendNotification, sendNotificationToAdmins } from "../../utils/sendNotification";
import { SpecialPromoModel } from "../SpecialPromo/specialpromo.model";
import { UberService } from "../Uber/uber.services";

const stripe = new Stripe(config.stripe_secret_key as string);

// ═══════════════════════════════════════════════════════════════════════
// CREATE CHECKOUT SESSION
// ═══════════════════════════════════════════════════════════════════════
const createCheckoutSession = async (input: ICreateOrderInput) => {
  const {
    userId,
    orderType,
    customerEmail,
    shippingAddress,
    pickupTime,
    notes,
     uberQuoteId,
    uberFee 
  } = input;

  const cart = await CartModel.findOne({ user: userId }).populate(
    "items.product",
  );

  if (!cart || cart.items.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Your cart is empty");
  }

  const orderItems: IOrderItem[] = [];
  let subtotal = 0;
  let totalDeliveryFee = 0;
  let totalPoints = 0;
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  for (const cartItem of cart.items) {
    const product = await ProductModel.findById(cartItem.product);

    if (!product) {
      throw new AppError(httpStatus.NOT_FOUND, "Product not found");
    }

    if (product.quantity < cartItem.quantity) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Insufficient stock for ${product.name}. Available: ${product.quantity}`,
      );
    }





    const unitPrice = product.discountedPrice || product.price;
    const itemTotal = parseFloat((unitPrice * cartItem.quantity).toFixed(2));
    const itemPoints = (product.points || 0) * cartItem.quantity;

    orderItems.push({
      product: product._id,
      name: product.name,
      image: product.images?.[0],
      price: unitPrice,
      quantity: cartItem.quantity,
      total: itemTotal,
      points: itemPoints,
    });

    subtotal += itemTotal;
    totalPoints += itemPoints;

    if (orderType === OrderType.DELIVERY) {
      totalDeliveryFee += (product.deliveryFee || 0) * cartItem.quantity;
    }

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: product.name,
        },
        unit_amount: Math.round(unitPrice * 100),
      },
      quantity: cartItem.quantity,
    });
  }

const user = await UserModel.findById(userId);
if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

const fullName = user.fullName || `${user.firstName} ${user.lastName}`;
const contact = user.contact;



  if (orderType === OrderType.DELIVERY && uberFee !== undefined) {
    totalDeliveryFee = uberFee; 
  } else if (orderType === OrderType.DELIVERY) {

    for (const cartItem of cart.items) {
      const product = await ProductModel.findById(cartItem.product);
      if (product) totalDeliveryFee += (product.deliveryFee || 0) * cartItem.quantity;
    }
  }


  const totalAmount = parseFloat((subtotal + totalDeliveryFee).toFixed(2));

  const order = await OrderModel.create({
    user: userId,
    items: orderItems,
    subtotal,
    deliveryFee:uberFee || totalDeliveryFee,
    discount: 0,
    totalAmount,
    totalPoints,
    pointsAdded: false,
    pointsUsed: 0,
    pointsValue: 0,
    orderType,
    orderStatus: OrderStatus.ONGOING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CARD,
    customerEmail,
    customerName:fullName,
    customerPhone:contact,
    shippingAddress:
      orderType === OrderType.DELIVERY ? shippingAddress : undefined,
    pickupTime: orderType === OrderType.PICKUP ? pickupTime : undefined,
    notes,
     uberQuoteId: uberQuoteId, 
    uberFee: uberFee||totalDeliveryFee, 
    statusHistory: [
      {
        status: OrderStatus.ONGOING,
        timestamp: new Date(),
        note: `Order created - ${orderType.toUpperCase()}`,
      },
    ],
  });

  if (orderType === OrderType.DELIVERY && totalDeliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Delivery Fee" },
        unit_amount: Math.round(totalDeliveryFee * 100),
      },
      quantity: 1,
    });
  }

  const baseUrl = (config.frontend_url || "").replace(/\/+$/, "");

  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: customerEmail,
    customer_creation: "always",
    phone_number_collection: { enabled: true },
    metadata: {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: userId,
      orderType,
      totalPoints: totalPoints.toString(),
    },
    client_reference_id: order._id.toString(),
    success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}&order=${order.orderNumber}`,
    cancel_url: `${baseUrl}/order/cancel?order=${order.orderNumber}`,
  };

  if (orderType === OrderType.DELIVERY) {
    sessionConfig.shipping_address_collection = {
      allowed_countries: ["BD", "US"],
    };
  }
 
  sessionConfig.metadata = {
    ...sessionConfig.metadata,
    uberQuoteId: uberQuoteId as string // for Stripe webhook 
  };
  const session = await stripe.checkout.sessions.create(sessionConfig);

  order.stripeSessionId = session.id;
  await order.save();

  return {
    url: session.url,
    sessionId: session.id,
    orderNumber: order.orderNumber,
    orderId: order._id,
    orderType,
    deliveryFee: totalDeliveryFee,
    totalPoints,
  };
};

// ═══════════════════════════════════════════════════════════════════════
// CREATE SINGLE PRODUCT CHECKOUT SESSION (Buy Now)
// ═══════════════════════════════════════════════════════════════════════
const createSingleProductCheckoutSession = async (input: {
  userId: string;
  productId: string;
  quantity: number;
  orderType: OrderType;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: IShippingAddress;
  pickupTime?: string;
  notes?: string;
    uberQuoteId?: string; 
  uberFee?: number; 

}) => {
  const { userId, productId, quantity, orderType, customerEmail, shippingAddress, pickupTime, notes,  uberQuoteId,
    uberFee  } = input;

  const product = await ProductModel.findById(productId);
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found");
  }

  if (product.quantity < quantity) {
    throw new AppError(httpStatus.BAD_REQUEST, `Insufficient stock. Available: ${product.quantity}`);
  }

  const unitPrice = product.discountedPrice || product.price;

const user = await UserModel.findById(userId);
if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

const fullName = user.fullName || `${user.firstName} ${user.lastName}`;

const contact = user.contact;
  const subtotal = parseFloat((unitPrice * quantity).toFixed(2));
  const totalPoints = (product.points || 0) * quantity;
  // const deliveryFee = orderType === OrderType.DELIVERY ? (product.deliveryFee || 0) * quantity : 0;



let deliveryFee = 0;
  if (orderType === OrderType.DELIVERY && uberFee !== undefined) {
    deliveryFee = uberFee;
  } else if (orderType === OrderType.DELIVERY) {
    deliveryFee = (product.deliveryFee || 0) * quantity;
  }



  const totalAmount = parseFloat((subtotal + deliveryFee).toFixed(2));

  const orderItems: IOrderItem[] = [{
    product: product._id,
    name: product.name,
    image: product.images?.[0],
    price: unitPrice,
    quantity,
    total: subtotal,
    points: totalPoints,
  }];

  const order = await OrderModel.create({
    user: userId,
    items: orderItems,
    subtotal,
    deliveryFee:uberFee||deliveryFee,
    totalAmount,
    totalPoints,
    orderType,
    orderStatus: OrderStatus.ONGOING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CARD,
    customerEmail,
    customerName:fullName,
    customerPhone:contact,
    shippingAddress: orderType === OrderType.DELIVERY ? shippingAddress : undefined,
    pickupTime: orderType === OrderType.PICKUP ? pickupTime : undefined,
    notes,
    uberQuoteId: uberQuoteId,
    uberFee: uberFee || deliveryFee,
    statusHistory: [{
      status: OrderStatus.ONGOING,
      timestamp: new Date(),
      note: `Single Product Order created - ${orderType.toUpperCase()}`,
    }],
  });

  const lineItems = [{
    price_data: {
      currency: "usd",
      product_data: { name: product.name },
      unit_amount: Math.round(unitPrice * 100),
    },
    quantity,
  }];

  if (deliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Delivery Fee" },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    });
  }

  const baseUrl = (config.frontend_url || "").replace(/\/+$/, "");
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: customerEmail,
    metadata: {
      orderId: order._id.toString(),
      userId: userId,
    },
    success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}&order=${order.orderNumber}`,
    cancel_url: `${baseUrl}/order/cancel?order=${order.orderNumber}`,
  });

  order.stripeSessionId = session.id;
  await order.save();

  return { url: session.url, orderNumber: order.orderNumber };
};


// ═══════════════════════════════════════════════════════════════════════
// buy now with special promo code
// ═══════════════════════════════════════════════════════════════════════


const createSpecialPromoCheckoutSession = async (input: {
  userId: string;
  specialPromoId: string;
  quantity: number;
  orderType: OrderType;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  shippingAddress?: IShippingAddress;
  pickupTime?: string;
  notes?: string;
   uberQuoteId?: string;
  uberFee?: number;
}) => {
  const { userId, specialPromoId, quantity, orderType, customerEmail, shippingAddress, pickupTime, notes,uberQuoteId, uberFee } = input;

  const promo = await SpecialPromoModel.findById(specialPromoId).populate('product');
  if (!promo) {
    throw new AppError(httpStatus.NOT_FOUND, "Special Promo offer not found!");
  }

  if (new Date(promo.validity) < new Date()) {
    throw new AppError(httpStatus.BAD_REQUEST, "This promo offer has expired!");
  }

  const product = promo.product as any; // IProductDocument
  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product associated with this promo not found!");
  }


  if (product.quantity < quantity) {
    throw new AppError(httpStatus.BAD_REQUEST, `Insufficient stock. Available: ${product.quantity}`);
  }

  let unitPrice = product.discountedPrice || product.price;

  if (promo.discountType === 'percentage') {
    unitPrice = unitPrice - (unitPrice * (promo.discountAmount / 100));
  } else {
    unitPrice = unitPrice - promo.discountAmount;
  }
  
  unitPrice = Math.max(unitPrice, 0);
const user = await UserModel.findById(userId);
if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

const fullName = user.fullName || `${user.firstName} ${user.lastName}`;
const contact = user.contact;

  const subtotal = parseFloat((unitPrice * quantity).toFixed(2));
  const totalPoints = (product.points || 0) * quantity;
  // const deliveryFee = orderType === OrderType.DELIVERY ? (product.deliveryFee || 0) * quantity : 0;


  let deliveryFee = 0;
  if (orderType === OrderType.DELIVERY && uberFee !== undefined) {
    deliveryFee = uberFee;
  } else if (orderType === OrderType.DELIVERY) {
    deliveryFee = (product.deliveryFee || 0) * quantity;
  }


  const totalAmount = parseFloat((subtotal + deliveryFee).toFixed(2));

  const orderItems: IOrderItem[] = [{
    product: product._id,
    name: product.name,
    image: product.images?.[0],
    price: unitPrice,
    quantity,
    total: subtotal,
    points: totalPoints,
  }];

  const order = await OrderModel.create({
    user: userId,
    items: orderItems,
    subtotal,
    deliveryFee:uberFee||deliveryFee,
    totalAmount,
    totalPoints,
    orderType,
    orderStatus: OrderStatus.ONGOING,
    paymentStatus: PaymentStatus.PENDING,
    paymentMethod: PaymentMethod.CARD,
    customerEmail,
    customerName:fullName,
    customerPhone:contact,
    shippingAddress: orderType === OrderType.DELIVERY ? shippingAddress : undefined,
    pickupTime: orderType === OrderType.PICKUP ? pickupTime : undefined,
    notes,
    uberQuoteId: uberQuoteId,
    uberFee: uberFee||deliveryFee,
    statusHistory: [{
      status: OrderStatus.ONGOING,
      timestamp: new Date(),
      note: `Special Promo Order (${promo.specialPromoCode}) - ${orderType.toUpperCase()}`,
    }],
  });

  const lineItems = [{
    price_data: {
      currency: "usd",
      product_data: { 
        name: `${product.name} (Promo: ${promo.specialPromoCode})`,
        description: `Special discount applied via promo code`
      },
      unit_amount: Math.round(unitPrice * 100),
    },
    quantity,
  }];

  if (deliveryFee > 0) {
    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: "Delivery Fee", description: `Special discount applied via promo code` },
        unit_amount: Math.round(deliveryFee * 100),
      },
      quantity: 1,
    });
  }

  const baseUrl = (config.frontend_url || "").replace(/\/+$/, "");
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    mode: "payment",
    customer_email: customerEmail,
    metadata: {
      orderId: order._id.toString(),
      userId: userId,
      promoCode: promo.specialPromoCode
    },
    success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}&order=${order.orderNumber}`,
    cancel_url: `${baseUrl}/order/cancel?order=${order.orderNumber}`,
  });

  order.stripeSessionId = session.id;
  await order.save();

  return { url: session.url, orderNumber: order.orderNumber };
};







// ═══════════════════════════════════════════════════════════════════════
// HANDLE PAYMENT SUCCESS
// ═══════════════════════════════════════════════════════════════════════
const handlePaymentSuccess = async (session: Stripe.Checkout.Session) => {
  const orderId = session.metadata?.orderId || session.client_reference_id;

  if (!orderId) {
    return null;
  }

  const order = await OrderModel.findById(orderId);

  if (!order) {
    return null;
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    return order;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  order.paymentStatus = PaymentStatus.PAID;
  order.stripePaymentIntentId = paymentIntentId;
  order.paidAt = new Date();

  if (session.customer_details) {
    order.customerEmail = session.customer_details.email || order.customerEmail;
    order.customerPhone = session.customer_details.phone || order.customerPhone;
    order.customerName = session.customer_details.name || order.customerName;
  }

  const shippingDetails = (session as any).shipping_details as
    | {
        name?: string;
        address?: {
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          postal_code?: string;
          country?: string;
        };
      }
    | undefined;

  if (shippingDetails?.address && order.orderType === OrderType.DELIVERY) {
    order.shippingAddress = {
      name: shippingDetails.name || undefined,
      line1: shippingDetails.address.line1 || undefined,
      line2: shippingDetails.address.line2 || undefined,
      city: shippingDetails.address.city || undefined,
      state: shippingDetails.address.state || undefined,
      postalCode: shippingDetails.address.postal_code || undefined,
      country: shippingDetails.address.country || undefined,
    };
  }

  order.statusHistory.push({
    status: OrderStatus.ONGOING,
    timestamp: new Date(),
    note: `Payment successful. Intent: ${paymentIntentId}`,
  });

  await order.save();

  await CartModel.findOneAndDelete({ user: order.user });

for (const item of order.items) {

  const product = await ProductModel.findByIdAndUpdate(
    item.product,
    { $inc: { quantity: -item.quantity } },
    { new: true }
  );


  if (product && product.quantity <= 0) {
    await ProductModel.findByIdAndUpdate(item.product, {
      $set: { status: 'out_of_stock', quantity: 0 }
    });
  }
}


  // Uber Rider Dispatch Logic
// Uber Rider Dispatch Logic
if (order.orderType === OrderType.DELIVERY && order.uberQuoteId) {
  try {
    const uberPayload = {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      fullAddress: `${order.shippingAddress?.line1}, ${order.shippingAddress?.city}`, 
      items: order.items
    };
    
    const uberResponse = await UberService.createUberDeliveryOrder(uberPayload, order.uberQuoteId);
    
    if (uberResponse) {
      order.uberDeliveryId = uberResponse.deliveryId;
      order.uberTrackingUrl = uberResponse.tracking_url;
      order.uberStatus = uberResponse.status;
      
      await order.save(); 
    }
  } catch (uberError) {
    console.error("Uber Dispatch Error:", uberError);
  }
}





  if (order.totalPoints > 0 && !order.pointsAdded) {
  try {
    await RewardServices.addPoints({
      userId: order.user.toString(),
      points: order.totalPoints,
      source: PointSource.ORDER,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      validityDays: 365,
      description: `Earned ${order.totalPoints} points from order ${order.orderNumber}`,
    });


    const user = await UserModel.findById(order.user);
    
    if (user) {

      const currentPoints = user.point || 0; 
      
      let newTier = user.loyalityTier || 'Silver';


      if (currentPoints >= 10500) {
        newTier = 'Platinum';
      } else if (currentPoints >= 8500) {
        newTier = 'Gold';
      } else if (currentPoints >= 3000) {
        newTier = 'Silver';
      }


      if (newTier !== user.loyalityTier) {
        await UserModel.findByIdAndUpdate(order.user, {
          loyalityTier: newTier
        });
      }
    }

    
    order.pointsAdded = true;
    await order.save();

  } catch (error) {
    console.error('Points/Tier Update Error:', error);
  }
}

  await sendOrderConfirmationEmail(order);

await sendNotification(
  order.user.toString(),
  'Order Confirmed! 🛍️',
  `Your order ${order.orderNumber} has been placed successfully.`,
  'order'
);

// admin
await sendNotificationToAdmins(
  'New Order Received! 🛒',
  `A new order ${order.orderNumber} has been placed by ${order.customerName}.`,
  'order'
);
  return order;
};

// ═══════════════════════════════════════════════════════════════════════
// HANDLE PAYMENT FAILURE
// ═══════════════════════════════════════════════════════════════════════
const handlePaymentFailure = async (orderId: string) => {
  const order = await OrderModel.findById(orderId);

  if (!order) return null;

  order.paymentStatus = PaymentStatus.FAILED;
  order.orderStatus = OrderStatus.CANCELLED;
  order.cancelledAt = new Date();
  order.statusHistory.push({
    status: OrderStatus.CANCELLED,
    timestamp: new Date(),
    note: "Payment failed or expired",
  });

  await order.save();
  console.log(" Order cancelled due to payment failure:", order.orderNumber);

  return order;
};

// ═══════════════════════════════════════════════════════════════════════
// GET USER'S ORDERS
// ═══════════════════════════════════════════════════════════════════════
const getMyOrders = async (
  userId: string,
  filters: IOrderFilters,
  pagination: IPaginationOptions,
) => {
  const {
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = pagination;

  
  const { orderStatus, orderType, paymentStatus, search } = filters;

  const query: any = { user: userId };


  if (orderStatus) query.orderStatus = orderStatus;
  if (orderType) query.orderType = orderType;
  if (paymentStatus) query.paymentStatus = paymentStatus; 


  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;
  const sortOptions: any = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [orders, total] = await Promise.all([
    OrderModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate("user", "firstName lastName email point image")
      .populate("items.product", "name images points"),
    OrderModel.countDocuments(query),
  ]);

  return {
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════
// GET ORDER BY ID
// ═══════════════════════════════════════════════════════════════════════
const getOrderById = async (orderId: string, userId?: string) => {
  const query: any = { _id: orderId };
  if (userId) query.user = userId;

  const order = await OrderModel.findOne(query)
    .populate("user", "firstName lastName email point image")
    .populate("items.product", "name images points");

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

// ═══════════════════════════════════════════════════════════════════════
// GET ORDER BY ORDER NUMBER
// ═══════════════════════════════════════════════════════════════════════
const getOrderByNumber = async (orderNumber: string, userId?: string) => {
  const query: any = { orderNumber };
  if (userId) query.user = userId;

  const order = await OrderModel.findOne(query)
    .populate("user", "firstName lastName email point image")
    .populate("items.product", "name images points");

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  return order;
};

// ═══════════════════════════════════════════════════════════════════════
// UPDATE ORDER STATUS (Admin)
// ═══════════════════════════════════════════════════════════════════════
const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus,
  note?: string,
) => {
  const order = await OrderModel.findById(orderId);

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.ONGOING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELLED]: [],
  };

  if (!validTransitions[order.orderStatus]?.includes(newStatus)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Cannot change from "${order.orderStatus}" to "${newStatus}"`,
    );
  }

  order.orderStatus = newStatus;
  order.statusHistory.push({
    status: newStatus,
    timestamp: new Date(),
    note: note || getStatusNote(newStatus),
  });

  if (newStatus === OrderStatus.DELIVERED) {
    order.deliveredAt = new Date();
  } else if (newStatus === OrderStatus.CANCELLED) {
    order.cancelledAt = new Date();

for (const item of order.items) {

  const product = await ProductModel.findByIdAndUpdate(
    item.product,
    { $inc: { quantity: item.quantity } },
    { new: true }
  );


  if (product && product.quantity > 0) {
    await ProductModel.findByIdAndUpdate(item.product, {
      $set: { status: 'in_stock' }
    });
  }
}

    if (order.pointsUsed > 0) {
      await RewardServices.refundPoints(
        order.user.toString(),
        order.pointsUsed,
        order._id.toString(),
        order.orderNumber,
      );
    }
  }

  await order.save();
  await sendStatusUpdateEmail(order, newStatus);

  return order;
};

// ═══════════════════════════════════════════════════════════════════════
// CANCEL ORDER (User)
// ═══════════════════════════════════════════════════════════════════════
const cancelOrder = async (
  orderId: string,
  userId: string,
  reason?: string,
) => {
  const order = await OrderModel.findOne({ _id: orderId, user: userId });

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (order.orderStatus !== OrderStatus.ONGOING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only ongoing orders can be cancelled",
    );
  }

  order.orderStatus = OrderStatus.CANCELLED;
  order.cancelledAt = new Date();
  order.statusHistory.push({
    status: OrderStatus.CANCELLED,
    timestamp: new Date(),
    note: reason || "Cancelled by customer",
  });

for (const item of order.items) {
  const product = await ProductModel.findByIdAndUpdate(
    item.product,
    { $inc: { quantity: item.quantity } },
    { new: true }
  );

  if (product && product.quantity > 0) {
    await ProductModel.findByIdAndUpdate(item.product, {
      $set: { status: 'in_stock' }
    });
  }
}

  if (order.pointsUsed > 0) {
    await RewardServices.refundPoints(
      order.user.toString(),
      order.pointsUsed,
      order._id.toString(),
      order.orderNumber,
    );
  }

  await order.save();

  return order;
};

// ═══════════════════════════════════════════════════════════════════════
// GET ALL ORDERS (Admin)
// ═══════════════════════════════════════════════════════════════════════
const getAllOrders = async (
  filters: IOrderFilters,
  pagination: IPaginationOptions,
) => {
  const {
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = pagination;
  const { orderStatus, orderType, paymentStatus, search, startDate, endDate } =
    filters;

  const query: any = {};

  if (orderStatus) query.orderStatus = orderStatus;
  if (orderType) query.orderType = orderType;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (search) {
    query.$or = [
      { orderNumber: { $regex: search, $options: "i" } },
      { customerEmail: { $regex: search, $options: "i" } },
      { customerName: { $regex: search, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const sortOptions: any = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

  const [orders, total, statusCounts, typeCounts] = await Promise.all([
    OrderModel.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate("user", "firstName lastName email image")
      .populate("items.product", "name"),
    OrderModel.countDocuments(query),
    OrderModel.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]),
    OrderModel.aggregate([
      { $group: { _id: "$orderType", count: { $sum: 1 } } },
    ]),
  ]);

  return {
    orders,
    stats: {
      byStatus: {
        ongoing:
          statusCounts.find((s) => s._id === OrderStatus.ONGOING)?.count || 0,
        delivered:
          statusCounts.find((s) => s._id === OrderStatus.DELIVERED)?.count || 0,
        cancelled:
          statusCounts.find((s) => s._id === OrderStatus.CANCELLED)?.count || 0,
      },
      byType: {
        pickup: typeCounts.find((t) => t._id === OrderType.PICKUP)?.count || 0,
        delivery:
          typeCounts.find((t) => t._id === OrderType.DELIVERY)?.count || 0,
        point_redemption:
          typeCounts.find((t) => t._id === OrderType.POINT_REDEMPTION)?.count ||
          0,
      },
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════
// GET ORDER STATS (Admin Dashboard)
// ═══════════════════════════════════════════════════════════════════════
const getOrderStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalOrders,
    todayOrders,
    statusCounts,
    typeCounts,
    revenueStats,
    pointsStats,
  ] = await Promise.all([
    OrderModel.countDocuments(),
    OrderModel.countDocuments({ createdAt: { $gte: today } }),
    OrderModel.aggregate([
      { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
    ]),
    OrderModel.aggregate([
      { $group: { _id: "$orderType", count: { $sum: 1 } } },
    ]),
    OrderModel.aggregate([
      { $match: { paymentStatus: PaymentStatus.PAID } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" },
          totalDeliveryFees: { $sum: "$deliveryFee" },
        },
      },
    ]),
    OrderModel.aggregate([
      { $match: { pointsAdded: true } },
      { $group: { _id: null, totalPointsAwarded: { $sum: "$totalPoints" } } },
    ]),
  ]);

  return {
    totalOrders,
    todayOrders,
    status: {
      ongoing:
        statusCounts.find((s) => s._id === OrderStatus.ONGOING)?.count || 0,
      delivered:
        statusCounts.find((s) => s._id === OrderStatus.DELIVERED)?.count || 0,
      cancelled:
        statusCounts.find((s) => s._id === OrderStatus.CANCELLED)?.count || 0,
    },
    type: {
      pickup: typeCounts.find((t) => t._id === OrderType.PICKUP)?.count || 0,
      delivery:
        typeCounts.find((t) => t._id === OrderType.DELIVERY)?.count || 0,
      point_redemption:
        typeCounts.find((t) => t._id === OrderType.POINT_REDEMPTION)?.count ||
        0,
    },
    revenue: {
      total: revenueStats[0]?.totalRevenue || 0,
      average: revenueStats[0]?.avgOrderValue || 0,
      deliveryFees: revenueStats[0]?.totalDeliveryFees || 0,
    },
    points: {
      totalAwarded: pointsStats[0]?.totalPointsAwarded || 0,
    },
  };
};

// ═══════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════
function getStatusNote(status: OrderStatus): string {
  const notes: Record<OrderStatus, string> = {
    [OrderStatus.ONGOING]: "Order is being processed",
    [OrderStatus.DELIVERED]: "Order delivered successfully",
    [OrderStatus.CANCELLED]: "Order cancelled",
  };
  return notes[status] || "";
}

async function sendOrderConfirmationEmail(order: IOrderDocument) {
  try {
    const itemsList = order.items
      .map(
        (item) =>
          `• ${item.name} x${item.quantity} - $${item.total.toFixed(2)} (${item.points} points)`,
      )
      .join("\n");

    const typeInfo =
      order.orderType === OrderType.PICKUP
        ? `Pickup Time: ${order.pickupTime || "To be confirmed"}`
        : `Delivery Address: ${order.shippingAddress?.line1}, ${order.shippingAddress?.city}`;

    await sendEmail({
      from: config.SMTP_USER as string,
      to: order.customerEmail,
      subject: `Order Confirmed - ${order.orderNumber}`,
      text: `
Thank you for your order!

Order Number: ${order.orderNumber}
Order Type: ${order.orderType.toUpperCase()}
${typeInfo}

Items:
${itemsList}

Subtotal: $${order.subtotal.toFixed(2)}
${order.orderType === OrderType.DELIVERY ? `Delivery Fee: $${order.deliveryFee.toFixed(2)}` : ""}
Total: $${order.totalAmount.toFixed(2)}

🎉 You earned ${order.totalPoints} points from this order!


      `,
    });
  } catch (error) {
    // console.error("Failed to send confirmation email:", error); ja
  }
}

async function sendStatusUpdateEmail(
  order: IOrderDocument,
  status: OrderStatus,
) {
  const messages: Record<OrderStatus, { subject: string; message: string }> = {
    [OrderStatus.ONGOING]: { subject: "", message: "" },
    [OrderStatus.DELIVERED]: {
      subject: `Order Delivered - ${order.orderNumber}`,
      message: `Your order has been delivered. You earned ${order.totalPoints} points! 🎉`,
    },
    [OrderStatus.CANCELLED]: {
      subject: `Order Cancelled - ${order.orderNumber}`,
      message: "Your order has been cancelled.",
    },
  };

  const template = messages[status];
  if (!template?.subject) return;

  try {
    await sendEmail({
      from: config.SMTP_USER as string,
      to: order.customerEmail,
      subject: template.subject,
      html: `
        <h2>${template.message}</h2>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Status:</strong> ${status.toUpperCase()}</p>
      `,
    });
  } catch (error) {
    console.error("Failed to send status email:", error);
  }
}

export const OrderService = {
  createCheckoutSession,
  handlePaymentSuccess,
  handlePaymentFailure,
  getMyOrders,
  getOrderById,
  getOrderByNumber,
  updateOrderStatus,
  cancelOrder,
  getAllOrders,
  getOrderStats,
  createSingleProductCheckoutSession,
  createSpecialPromoCheckoutSession
};

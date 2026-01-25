// modules/order/order.controller.ts
import { Request, Response } from 'express';
import httpStatus from 'http-status';

import sendResponse from '../../utils/sendResponse';
import catchAsync from '../../utils/catchAsync';
import { OrderStatus, OrderType } from './orders.interface';
import { OrderService } from './orders.services';
import AppError from '../../errors/AppError';
import { UberService } from '../Uber/uber.services';
import { OrderModel } from './orders.model';
import { sendNotification } from '../../utils/sendNotification';



const createCheckout = catchAsync(async (req: Request, res: Response) => {
  const userId = req?.user?.userId;
  const { orderType, shippingAddress, pickupTime, notes,   uberQuoteId, 
    uberFee } = req.body;

  if (!userId) {
    return sendResponse(res, {
      statusCode: httpStatus.UNAUTHORIZED,
      success: false,
      message: 'Please login to checkout',
      data: null,
    });
  }

  // Validate order type
  if (!orderType || !Object.values(OrderType).includes(orderType)) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Order type must be "pickup" or "delivery"',
      data: null,
    });
  }

  // Delivery requires shipping address
  if (orderType === OrderType.DELIVERY && !shippingAddress) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Shipping address is required for delivery orders',
      data: null,
    });
  }

  const result = await OrderService.createCheckoutSession({
    userId: userId.toString(),
    orderType,
    customerEmail: req.user?.email,
    customerName: req.user?.firstName + ' ' + req.user?.lastName,
    customerPhone: req.user?.contact,
    shippingAddress,
    pickupTime,
    notes,
    uberQuoteId, 
    uberFee
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session created successfully',
    data: result,
  });
});

const createSingleProductCheckout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { productId, quantity, orderType, shippingAddress, pickupTime, notes,uberQuoteId, 
    uberFee} = req.body;

  if (!productId || !quantity) {
    throw new AppError(httpStatus.BAD_REQUEST, "Product ID and quantity are required");
  }

  const result = await OrderService.createSingleProductCheckoutSession({
    userId: userId.toString(),
    productId,
    quantity: Number(quantity),
    orderType,
    customerEmail: req.user?.email,
    customerName: `${req.user?.firstName} ${req.user?.lastName}`,
    customerPhone: req.user?.contact,
    shippingAddress,
    pickupTime,
    notes,
  uberQuoteId, 
    uberFee
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Checkout session created successfully',
    data: result,
  });
});

const createPromoCheckout = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { specialPromoId, quantity, orderType, shippingAddress, pickupTime, notes,uberQuoteId, 
    uberFee } = req.body;

  if (!specialPromoId) {
    throw new AppError(httpStatus.BAD_REQUEST, "Special Promo ID is required");
  }
  if (!quantity) {
    throw new AppError(httpStatus.BAD_REQUEST, "Quantity is required");
  }

  const result = await OrderService.createSpecialPromoCheckoutSession({
    userId: userId.toString(),
    specialPromoId,
    quantity: Number(quantity),
    orderType,
    customerEmail: req.user?.email,
    customerName: `${req.user?.firstName} ${req.user?.lastName}`,
    customerPhone: req.user?.contact,
    shippingAddress,
    pickupTime,
    notes,
    uberQuoteId, 
    uberFee
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Promo checkout session created successfully',
    data: result,
  });
});

/**
 * Get My Orders
 * GET /orders/my-orders?orderStatus=ongoing&orderType=delivery&page=1&limit=10
 */
const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { orderStatus, orderType, page = 1, limit = 10 } = req.query;

  const result = await OrderService.getMyOrders(
    userId.toString(),
    {
      orderStatus: orderStatus as OrderStatus,
      orderType: orderType as OrderType,
    },
    {
      page: Number(page),
      limit: Number(limit),
    }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Orders retrieved successfully',
    data: result,
  });
});

/**
 * Get Order by ID
 * GET /orders/:id
 */
const getOrderById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const order = await OrderService.getOrderById(id, userId?.toString());

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order retrieved successfully',
    data: order,
  });
});

/**
 * Track Order
 * GET /orders/track/:orderNumber
 */
const trackOrder = catchAsync(async (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const userId = req.user?.userId;

  const order = await OrderService.getOrderByNumber(orderNumber, userId?.toString());

  const tracking = {
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    currentStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    timeline: order.statusHistory,
    items: order.items,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    totalAmount: order.totalAmount,
    pointsEarned: order.totalPoints,
    estimatedTime: order.estimatedTime,
    shippingAddress: order.shippingAddress,
    pickupTime: order.pickupTime,
  };

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order tracking info retrieved',
    data: tracking,
  });
});

/**
 * Cancel Order
 * PATCH /orders/:id/cancel
 */
const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const { reason } = req.body;
  const userId = req.user?.userId;

  const order = await OrderService.cancelOrder(id, userId.toString(), reason);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order cancelled successfully',
    data: order,
  });
});

// ═══════════════════════════════════════════════════════════════════════
// ADMIN CONTROLLERS
// ═══════════════════════════════════════════════════════════════════════

/**
 * Get All Orders (Admin)
 * GET /orders/admin/all
 */
const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const {
    orderStatus,
    orderType,
    paymentStatus,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const result = await OrderService.getAllOrders(
    {
      orderStatus: orderStatus as OrderStatus,
      orderType: orderType as OrderType,
      paymentStatus: paymentStatus as any,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
    },
    {
      page: Number(page),
      limit: Number(limit),
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
    }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Orders retrieved successfully',
    data: result,
  });
});

/**
 * Get Order Stats (Admin)
 * GET /orders/admin/stats
 */
const getOrderStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await OrderService.getOrderStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order statistics retrieved',
    data: stats,
  });
});

/**
 * Update Order Status (Admin)
 * PATCH /orders/admin/:id/status
 */
const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, note } = req.body;

  if (!Object.values(OrderStatus).includes(status)) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: `Invalid status. Use: ${Object.values(OrderStatus).join(', ')}`,
      data: null,
    });
  }

  const order = await OrderService.updateOrderStatus(id, status, note);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Order status updated to "${status}"`,
    data: order,
  });
});

/**
 * Get Any Order by ID (Admin)
 * GET /orders/admin/:id
 */
const getOrderByIdAdmin = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const order = await OrderService.getOrderById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Order retrieved successfully',
    data: order,
  });
});


// ═══════════════════════════════════════════════════════════════════════
// UBER
// ═══════════════════════════════════════════════════════════════════════



// ১. ডেলিভারি ফি জানার জন্য নতুন কন্ট্রোলার
const getDeliveryFee = catchAsync(async (req: Request, res: Response) => {
  const { pickupAddress, dropoffAddress } = req.body; // ফ্রন্টএন্ড থেকে রেস্টুরেন্ট এবং ইউজারের এড্রেস আসবে

  const quote = await UberService.getUberDeliveryQuote(pickupAddress, dropoffAddress);
  
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Delivery fee calculated successfully',
    data: {
      fee: quote.fee, // সার্ভিস থেকে ডলারে কনভার্ট হয়ে আসছে
      quoteId: quote.quoteId,
      estimatedDuration: quote.duration // আনুমানিক সময়
    },
  });
});

// ২. উবার ওয়েবহুক হ্যান্ডেল করার জন্য নতুন কন্ট্রোলার
const handleUberWebhook = catchAsync(async (req: Request, res: Response) => {
  const { delivery_id, status } = req.body; // উবার থেকে আসা ডাটা

  // ডেলিভারি আইডি দিয়ে অর্ডারটি খুঁজুন
  const order = await OrderModel.findOne({ uberDeliveryId: delivery_id });
  if (order) {
    order.uberStatus = status; // উবার থেকে আসা স্ট্যাটাস সেভ করুন
    
    if (status === 'delivered') {
      order.orderStatus = OrderStatus.DELIVERED;
      order.deliveredAt = new Date();
    }
    // অন্য কোনো স্ট্যাটাস যেমন 'picking_up', 'dropping_off' ইত্যাদি
    await order.save();

    await sendNotification(
      order.user.toString(),
      'Delivery Update 🚚',
      `Your Uber delivery status: ${status.replace(/_/g, ' ')}.`,
      'order'
    );
  }
  res.status(200).send('Webhook Received'); // উবারকে 200 OK রেসপন্স পাঠান
});











// ═══════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════
export const OrderController = {
  // User
  createCheckout,
  getMyOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
    createSingleProductCheckout,
  // Admin
  getAllOrders,
  getOrderStats,
  updateOrderStatus,
  getOrderByIdAdmin,
  createPromoCheckout,
  getDeliveryFee,       
  handleUberWebhook 

};
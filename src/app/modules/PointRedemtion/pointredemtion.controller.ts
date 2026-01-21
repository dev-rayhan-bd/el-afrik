// c:\STA\El-afrik\src\app\modules\Orders\pointRedemption.controller.ts

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { PointRedemptionService } from './pointredemtion.services';


const getRedeemableProducts = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;

  const result = await PointRedemptionService.getRedeemableProducts(
    req.query,
    userId
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Redeemable products retrieved successfully',
    data: result,
  });
});

const calculateRedemptionCost = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendResponse(res, {
        statusCode: httpStatus.BAD_REQUEST,
        success: false,
        message: 'Items array is required',
        data: null,
      });
    }

    const result = await PointRedemptionService.calculateRedemptionCost(
      items,
      userId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.canRedeem
        ? 'You have enough points for this redemption'
        : 'Insufficient points for this redemption',
      data: result,
    });
  }
);

const purchaseWithPoints = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { items, deliveryType, shippingAddress, pickupTime, notes } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Items array is required',
      data: null,
    });
  }

  if (!deliveryType || !['pickup', 'delivery'].includes(deliveryType)) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Delivery type must be "pickup" or "delivery"',
      data: null,
    });
  }

  const result = await PointRedemptionService.purchaseWithPoints({
    userId,
    items,
    deliveryType,
    shippingAddress,
    pickupTime,
    notes,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message,
    data: result,
  });
});

const quickRedeemProduct = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { productId } = req.params;
  const { quantity = 1, deliveryType, shippingAddress, pickupTime } = req.body;

  if (!deliveryType || !['pickup', 'delivery'].includes(deliveryType)) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Delivery type must be "pickup" or "delivery"',
      data: null,
    });
  }

  const result = await PointRedemptionService.purchaseWithPoints({
    userId,
    items: [{ productId, quantity: Number(quantity) }],
    deliveryType,
    shippingAddress,
    pickupTime,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: result.message,
    data: result,
  });
});

const getMyRedemptionOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { status, page = 1, limit = 10 } = req.query;

  const result = await PointRedemptionService.getMyRedemptionOrders(
    userId,
    { status: status as string },
    { page: Number(page), limit: Number(limit) }
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Redemption orders retrieved successfully',
    data: result,
  });
});

const getRedemptionOrderById = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const { orderId } = req.params;

    const result = await PointRedemptionService.getRedemptionOrderById(
      orderId,
      userId
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Redemption order retrieved successfully',
      data: result,
    });
  }
);

const cancelRedemptionOrder = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const { orderId } = req.params;
  const { reason } = req.body;

  const result = await PointRedemptionService.cancelRedemptionOrder(
    orderId,
    userId,
    reason
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const PointRedemptionController = {
  getRedeemableProducts,
  calculateRedemptionCost,
  purchaseWithPoints,
  quickRedeemProduct,
  getMyRedemptionOrders,
  getRedemptionOrderById,
  cancelRedemptionOrder,
};
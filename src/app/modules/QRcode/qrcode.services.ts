import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QRCodeModel } from './qrcode.model';
import { RewardServices } from '../Reward/reward.services';
import { PointSource } from '../Reward/reward.interface';
import { sendNotification } from '../../utils/sendNotification';


const createQRCode = async (payload: { title: string; points: number; daysValid: number }) => {
  const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + payload.daysValid);

  const result = await QRCodeModel.create({
    title: payload.title,
    code: `QR-${randomCode}`,
    points: payload.points,
    expiryDate
  });
  return result;
};

const claimQRCodePoints = async (userId: string, code: string) => {
  const qrRecord = await QRCodeModel.findOne({ code });

  if (!qrRecord) {
    throw new AppError(httpStatus.NOT_FOUND, 'Invalid QR Code!');
  }

  if (qrRecord.isUsed) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This QR code has already been used!');
  }

  if (new Date() > qrRecord.expiryDate) {
    throw new AppError(httpStatus.BAD_REQUEST, 'This QR code has expired!');
  }


  await RewardServices.addPoints({
    userId,
    points: qrRecord.points,
    source: PointSource.BONUS,
    description: `Claimed points from QR: ${qrRecord.title}`,
  });


  qrRecord.isUsed = true;
  qrRecord.usedBy = userId as any;
  await qrRecord.save();

  await sendNotification(
    userId,
    'Points Claimed! 🎁',
    `You have successfully earned ${qrRecord.points} points from QR scan.`
  );

  return { pointsEarned: qrRecord.points };
};

const getAllQRCodes = async () => {
  return await QRCodeModel.find().sort({ createdAt: -1 });
};

export const QRCodeServices = { createQRCode, claimQRCodePoints, getAllQRCodes };
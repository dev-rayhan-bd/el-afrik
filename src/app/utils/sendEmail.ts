/* eslint-disable @typescript-eslint/no-explicit-any */
import nodemailer, { SendMailOptions, SentMessageInfo } from 'nodemailer';  
import httpStatus from 'http-status'

import AppError from '../errors/AppError';
import config from '../config';

// Define a type for the mail options
interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
}

// Define the sendMail function
const sendEmail = async ({ from, to, subject, text }: MailOptions): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,     
      },
    });

    const mailOptions: SendMailOptions = {
      from,
      to,
      subject,  
      text,
    };

    // Wait for the sendMail operation to complete
    const info: SentMessageInfo = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return true;
  } catch (error:any) {
    throw new AppError(httpStatus.BAD_REQUEST,('No items in the order.'))
    console.error('Error sending mail: ', error);
    // return false;
  }
};

export default sendEmail;

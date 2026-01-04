import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join((process.cwd(), '.env')) });

export default {
  NODE_ENV: process.env.NODE_ENV,
  port: process.env.PORT,
  database_url: process.env.DATABASE_URL,
  server_url: process.env.SERVER_URL,
  frontend_url: process.env.FRONTEND_URL,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  smtp_from: process.env.SMTP_FROM,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.APP_PASSWARD,
  stripe_secret_key: process.env.STRIPE_SECRET_KEY,
  webhook_secret_key: process.env.WEBHOOK_SECRET_KEY,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY,
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET,
  aws_access_key: process.env.AWS_SECRET_ACCESS_KEY,
  aws_secret_key: process.env.AWS_SECRET_ACCESS_KEY,
  aws_bucket_name: process.env.AWS_BUCKET_NAME,
  aws_region: process.env.AWS_REGION,
};

import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import cookieParser from 'cookie-parser'; 

// import { stripeWebhookHandler } from './app/webhook/webhook.stripe';
import path from 'path';
import router from './app/routes/index';
import globalErrorHandler from './app/middleware/globalErrorHandler';
import notFound from './app/middleware/notFound';
import morgan from 'morgan';

const app: Application = express();
//parsers
app.use(express.json());
app.use(cookieParser());

// stripe webhook
// app.post(
//   '/webhook/stripe',
//   express.raw({ type: 'application/json' }),
//   stripeWebhookHandler, 
// );

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(
  cors({
    origin: [

      'http://10.10.20.13:5000',
      'http://10.10.20.13:3000',
      'http://localhost:5175',
      'http://localhost:5173',
      'http://localhost:5174',
    ],
     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  }),
);
app.use(morgan("dev"))
app.use('/api/v1', router);
app.get('/', (req: Request, res: Response) => {
  res.send('Rot Server is Running...');
});
app.use(globalErrorHandler);
app.use(notFound);
export default app;

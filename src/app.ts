/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import cors from 'cors';
import express, { Application, NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import globalErrorHandler from './app/middlewares/globalErrorHandler';
import routes from './app/routes';
import { Server as SocketIOServer } from 'socket.io';
import cookieParser from 'cookie-parser';
import path from 'path';
const app: Application = express();

// Allowed origins list
const allowedOrigins = [
  "http://localhost:3000",
  "https://crm-datapollex.vercel.app",
  "https://crm-frontend-two-indol.vercel.app",
  "https://crm-frontend-8lvn.onrender.com",
  "https://app.datapollex.com",
  "https://api.datapollex.com",
  "https://www.app.datapollex.com",
  "https://www.api.datapollex.com"
];

// Configure CORS properly by passing a single options object.
// origin can be an array of allowed origins or a function for dynamic checks.
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(cookieParser());

//parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
console.log('Static files served from:', path.join(__dirname, '../uploads'));

app.use('/api/v1', routes);

//Testing
app.get('/', async (req: Request, res: Response, next: NextFunction) => {
  res.json({
    message: 'Congrats! your api are now on live',
  });
});

//global error handler
app.use(globalErrorHandler);

//handle not found
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: 'Not Found',
    errorMessages: [
      {
        path: req.originalUrl,
        message: 'API Not Found',
      },
    ],
  });
  next();
});

export default app;

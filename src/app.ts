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

// Allow all origins
app.use(cors({ origin: '*' }));

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

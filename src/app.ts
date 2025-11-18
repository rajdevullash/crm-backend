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
import fs from 'fs';
const app: Application = express();

// Allowed origins list
const allowedOrigins = [
  "http://localhost:3000",
  "http://192.168.0.103:8081", // Mobile app (Expo) - old IP
  "exp://192.168.0.103:8081", // Expo Go - old IP
  "http://192.168.0.195:8081", // Mobile app (Expo) - new IP
  "exp://192.168.0.195:8081", // Expo Go - new IP
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
// Try multiple locations to handle both source and compiled code
// Priority: Check where files are actually saved first
const possibleUploadPaths = [
  path.join(process.cwd(), 'src/uploads'), // Backend/src/uploads (where files are actually saved - HIGHEST PRIORITY)
  path.join(__dirname, '../../src/uploads'), // Source code location (if __dirname is in app/)
  path.join(__dirname, '../uploads'), // Standard: backend/src/uploads (source) or backend/dist/uploads (compiled)
  path.join(process.cwd(), 'uploads'), // Backend root (fallback)
];

let uploadsPath = possibleUploadPaths[0];
for (const testPath of possibleUploadPaths) {
  if (fs.existsSync(testPath)) {
    uploadsPath = testPath;
    break;
  }
}

app.use('/uploads', express.static(uploadsPath));
console.log('Static files served from:', uploadsPath);
console.log('Available upload paths checked:', possibleUploadPaths);

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
  // Don't return API error for static file requests - let them return 404 naturally
  if (req.originalUrl.startsWith('/uploads/')) {
    return res.status(httpStatus.NOT_FOUND).json({
      success: false,
      message: 'File Not Found',
      errorMessages: [
        {
          path: req.originalUrl,
          message: 'The requested file could not be found',
        },
      ],
    });
  }
  
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

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeDatabase } from './database/connection';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';

// Security headers middleware
function securityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy', [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '));
  
  // HSTS (HTTP Strict Transport Security) - always in production (Render uses HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Content Security Policy - comprehensive and secure
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "style-src 'self' 'unsafe-inline' https:",
    "img-src 'self' data: https: blob: https://encrypted-tbn0.gstatic.com https://*.gstatic.com",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; ');
  
  res.setHeader('Content-Security-Policy', csp);
  
  // Additional security for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Expect-CT', 'max-age=86400, enforce');
  }
  
  next();
}

// Routes
import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurants';
import orderRoutes from './routes/orders';
import deliveryRoutes from './routes/deliveries';
import riderRoutes from './routes/riders';
import trackingRoutes from './routes/tracking';
import webhookRoutes from './routes/webhooks';
import adminRoutes from './routes/admin';
import integrationRoutes from './routes/integrations';
import notificationRoutes from './routes/notifications';

// Socket handlers
import { setupSocketIO } from './socket/socketHandler';

// Delivery polling
import { startDeliveryPolling } from './services/deliveryPoller';

// Task processor for scheduled tasks (DoorDash calls, etc.)
import { startTaskProcessor } from './services/taskProcessor';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3000;

// Trust proxy for production (Render/Heroku)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Middleware
// CORS configuration - allow same origin in production (frontend served from backend)
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // In production, allow same origin (frontend served from backend)
    if (process.env.NODE_ENV === 'production') {
      // Allow requests with no origin (mobile apps, Postman, etc.) or same origin
      if (!origin || origin.includes(process.env.FRONTEND_URL || '')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all in production for now
      }
    } else {
      // Development: allow localhost
      const allowedOrigins = ['http://localhost:3001', 'http://localhost:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3000'];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
};

app.use(cors(corsOptions));

// Security headers
app.use(securityHeaders);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Socket.IO configuration (after CORS setup)
const io = new Server(httpServer, {
  cors: corsOptions,
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Security.txt route
app.get('/.well-known/security.txt', (req, res) => {
  res.type('text/plain');
  res.send(`Contact: mailto:support@tekmax.com
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en
Canonical: https://${req.get('host')}/.well-known/security.txt
`);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/riders', riderRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/notifications', notificationRoutes);

// Serve static files from frontend/public
const frontendPath = path.join(__dirname, '../../frontend/public');
app.use(express.static(frontendPath));

// Serve frontend routes (SPA fallback)
app.get('*', (req, res) => {
  // Don't serve HTML for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  // Serve login.html as default
  res.sendFile(path.join(frontendPath, 'login.html'));
});

// Error handling
app.use(errorHandler);

// Setup Socket.IO
setupSocketIO(io);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ Database connected');
    
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.IO ready for real-time updates`);
      
      // Start delivery polling (every 30 seconds)
      startDeliveryPolling(30);
      console.log(`🔄 Delivery status polling started (every 30 seconds)`);
      
      // Start task processor (processes scheduled tasks like DoorDash calls)
      startTaskProcessor();
      console.log(`⏰ Task processor started (processes scheduled tasks every minute)`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

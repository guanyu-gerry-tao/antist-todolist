const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const aiChatRoutes = require('./routes/aiChat');
const taskGeneratorRoutes = require('./routes/taskGenerator');
const smartChatRoutes = require('./routes/smartChatSimple');
const { rateLimiter, rateLimiterInstance } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting to all routes except health check
app.use('/api', rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'ai-service'
  });
});

// Rate limit management endpoints
app.get('/admin/rate-limit/stats/:ip?', (req, res) => {
  const ip = req.params.ip || rateLimiterInstance.getClientIP(req);
  const stats = rateLimiterInstance.getStats(ip);
  res.json({
    ip,
    stats,
    isWhitelisted: rateLimiterInstance.isWhitelisted(ip)
  });
});

app.post('/admin/rate-limit/reset/:ip', (req, res) => {
  const ip = req.params.ip;
  rateLimiterInstance.resetIP(ip);
  res.json({
    message: `Rate limit reset for IP: ${ip}`,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/chat', aiChatRoutes);
app.use('/api/tasks', taskGeneratorRoutes);
app.use('/api/smart', smartChatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🤖 AI Service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🛡️  Rate limiting enabled: 30 requests per hour per IP`);
  console.log(`🏠 Local IPs have unlimited access`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  rateLimiterInstance.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  rateLimiterInstance.destroy();
  process.exit(0);
});

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');

// load routes
const routes = require('./routes/operations');
const getAll = require('./routes/getAll');
const authRoute = require('./routes/authRoute');
const me = require('./routes/me');
const aiChatRouter = require('./routes/ai-chat');

const app = express();
const PORT = process.env.PORT || 3001;
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('Connected to MongoDB');
}).catch((error) => {
  console.error('Error connecting to MongoDB:', error);
});

// load middlewares
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000', 
      'http://localhost:5173',
      'http://localhost:3001'
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow any localhost during development
    if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow any .vercel.app domain during development/testing
    if (origin.includes('.vercel.app') || origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); // automatically parse JSON request bodies
app.use(cookieParser()); // parse cookies

// use all API routes
app.use('/api/bulk', routes);
app.use('/api/getAll', getAll);
app.use('/api/login', authRoute);
app.use('/api/me', me);
app.use('/api/ai-chat', aiChatRouter);

// start the server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
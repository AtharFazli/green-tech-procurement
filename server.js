require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const appConfig = require('./config/app');
const errorHandler = require('./middleware/errorHandler');

// Run migrations
require('./migrations/001_initial_schema').run();

const server = express();

// Middleware
server.use(cors());
server.use(morgan('dev'));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));
server.use(cookieParser());
server.use(express.static(path.join(__dirname, 'public')));

// View engine
server.set('view engine', 'ejs');
server.set('views', path.join(__dirname, 'views'));

// Make user available to templates (parse JWT from cookie for page routes)
const pageRoutes = ['/', '/login', '/register', '/dashboard', '/dashboard/*', '/rfps*', '/bids*', '/products*', '/vendors*'];
server.use(pageRoutes, (req, res, next) => {
  let user = null;
  try {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, require('./config/auth').secret);
      user = { id: decoded.id, email: decoded.email, role: decoded.role };
    }
  } catch (e) {
    // Invalid token — treat as guest
  }
  req.pageUser = user;
  next();
});

// Page routes
server.get('/', (req, res) => {
  if (req.pageUser) {
    const dashboard = req.pageUser.role === 'vendor' ? '/dashboard/vendor' : '/dashboard/buyer';
    return res.redirect(dashboard);
  }
  res.redirect('/login');
});

server.get('/login', (req, res) => {
  res.render('auth/login', { user: req.pageUser, title: 'Sign In' });
});

server.get('/register', (req, res) => {
  res.render('auth/register', { user: req.pageUser, title: 'Register' });
});

server.get('/dashboard', (req, res) => {
  if (!req.pageUser) return res.redirect('/login');
  const dashboard = req.pageUser.role === 'vendor' ? '/dashboard/vendor' : '/dashboard/buyer';
  res.redirect(dashboard);
});

server.get('/dashboard/buyer', (req, res) => {
  if (!req.pageUser) return res.redirect('/login');
  res.render('dashboard/buyer', { user: req.pageUser, title: 'Buyer Dashboard' });
});

server.get('/dashboard/vendor', (req, res) => {
  if (!req.pageUser) return res.redirect('/login');
  res.render('dashboard/vendor', { user: req.pageUser, title: 'Vendor Dashboard' });
});

// API routes
server.use('/api/v1', require('./routes'));

// Error handler
server.use(errorHandler);

// Start server (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  server.listen(appConfig.port, () => {
    console.log(`GreenTech Procurement Server running on port ${appConfig.port}`);
  });
}

module.exports = server;

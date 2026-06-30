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

const auth = require('./middleware/auth');

// Vendor pages
server.get('/vendors/profile', auth, (req, res) => {
  const VendorModel = require('./models/VendorModel');
  const vendor = VendorModel.findByUserId(req.user.id);
  res.render('vendor/profile', { user: req.user, vendor, page: 'vendor-profile' });
});

server.get('/vendors/catalog', auth, (req, res) => {
  const VendorModel = require('./models/VendorModel');
  const vendor = VendorModel.findByUserId(req.user.id);
  if (!vendor) return res.redirect('/vendors/profile');
  res.render('vendor/catalog', { user: req.user, vendor, page: 'vendor-catalog' });
});

// Product pages
server.get('/products', (req, res) => {
  res.render('product/list', { user: req.pageUser || null, page: 'product-list' });
});

server.get('/products/create', auth, (req, res) => {
  const ProductCategoryModel = require('./models/ProductCategoryModel');
  const categories = ProductCategoryModel.findAll();
  res.render('product/form', { user: req.user, product: null, categories, page: 'product-form' });
});

server.get('/products/:id/edit', auth, (req, res) => {
  // verify ownership if vendor
  res.render('product/form', { user: req.user, product: {}, categories: [], page: 'product-form' });
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

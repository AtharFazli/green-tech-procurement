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

server.get('/dashboard/admin', (req, res) => {
  if (!req.pageUser) return res.redirect('/login');
  if (req.pageUser.role !== 'admin') return res.status(403).send('Forbidden');
  res.render('dashboard/admin', { user: req.pageUser, title: 'Admin Dashboard' });
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

// Helper: render page content then wrap in layout
function renderPage(req, res, view, data, layoutData) {
  res.render(view, data, (err, html) => {
    if (err) return res.status(500).send(err.message);
    res.render('layouts/main', Object.assign({}, data, { body: html }));
  });
}

// RFP pages
server.get('/rfps', (req, res) => {
  const RFPModel = require('./models/RFPModel');
  const { getPagination } = require('./helpers/pagination');
  const { page, limit } = getPagination(req.query);
  let result;
  if (req.pageUser && req.pageUser.role === 'buyer') {
    result = RFPModel.findByBuyer(req.pageUser.id, { page, limit, status: req.query.status });
  } else {
    result = RFPModel.findAllOpen({
      page, limit,
      is_green_rfp: req.query.is_green_rfp !== undefined ? req.query.is_green_rfp === 'true' : undefined,
      search: req.query.search
    });
  }
  renderPage(req, res, 'rfp/list', {
    user: req.pageUser || null, title: 'RFPs', page: 'rfp-list',
    rfps: result.data, pagination: result.pagination,
    search: req.query.search || '', status: req.query.status || '', is_green_rfp: req.query.is_green_rfp || ''
  });
});

server.get('/rfps/create', auth, (req, res) => {
  renderPage(req, res, 'rfp/create', { user: req.user, title: 'Create RFP', page: 'rfp-create' });
});

server.get('/rfps/:id', (req, res) => {
  const RFPModel = require('./models/RFPModel');
  const RFPLineItemModel = require('./models/RFPLineItemModel');
  const BidModel = require('./models/BidModel');
  const rfp = RFPModel.findById(req.params.id);
  if (!rfp) return res.status(404).send('RFP not found');
  const lineItems = RFPLineItemModel.findByRFP(req.params.id);
  let bids = null;
  if (req.pageUser && rfp.buyer_id === req.pageUser.id) {
    bids = BidModel.findByRFP(req.params.id);
  } else if (rfp.status === 'awarded') {
    bids = BidModel.findByRFP(req.params.id);
  }
  renderPage(req, res, 'rfp/detail', {
    user: req.pageUser || null, title: 'RFP Detail', page: 'rfp-detail',
    rfp, lineItems, bids
  });
});

// Bid pages
server.get('/bids', auth, (req, res) => {
  const BidModel = require('./models/BidModel');
  const VendorModel = require('./models/VendorModel');
  const { getPagination } = require('./helpers/pagination');
  const { page, limit } = getPagination(req.query);
  const vendor = VendorModel.findByUserId(req.user.id);
  if (!vendor) return renderPage(req, res, 'bid/list', { user: req.user, title: 'My Bids', page: 'bid-list', bids: [], pagination: null });
  const result = BidModel.findByVendor(vendor.id, { page, limit });
  renderPage(req, res, 'bid/list', { user: req.user, title: 'My Bids', page: 'bid-list', bids: result.data, pagination: result.pagination });
});

server.get('/rfps/:rfpId/bids/create', auth, (req, res) => {
  const RFPModel = require('./models/RFPModel');
  const RFPLineItemModel = require('./models/RFPLineItemModel');
  const rfp = RFPModel.findById(req.params.rfpId);
  if (!rfp) return res.status(404).send('RFP not found');
  const lineItems = RFPLineItemModel.findByRFP(req.params.rfpId);
  renderPage(req, res, 'bid/create', { user: req.user, title: 'Submit Bid', page: 'bid-create', rfp, lineItems });
});

server.get('/bids/:id', auth, (req, res) => {
  const BidModel = require('./models/BidModel');
  const BidLineItemModel = require('./models/BidLineItemModel');
  const bid = BidModel.findById(req.params.id);
  if (!bid) return res.status(404).send('Bid not found');
  const lineItems = BidLineItemModel.findByBid(req.params.id);
  renderPage(req, res, 'bid/detail', { user: req.user, title: 'Bid Detail', page: 'bid-detail', bid, lineItems });
});

// API routes
server.use('/api/v1', require('./routes'));

// POST /logout — clear cookie & redirect
server.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Error handler
server.use(errorHandler);

// Start server (skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  server.listen(appConfig.port, () => {
    console.log(`GreenTech Procurement Server running on port ${appConfig.port}`);
  });
}

module.exports = server;

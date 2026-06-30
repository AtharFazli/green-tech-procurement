# Phase 3 Task Brief: RFP & Bidding System

## Context
Phase 3 builds on Phase 1 (auth) and Phase 2 (vendor/products). Buyers create RFPs with line items, vendors submit bids with pricing per line item, buyers review and award.

**Working directory:** `D:\cacaa\green-tech-procurement`

## Interfaces from previous phases (DO NOT recreate)

- `config/db.js` — synchronous better-sqlite3
- `helpers/uuid.js` — `generateUUID()`
- `helpers/apiResponse.js` — `{ success, created, error, notFound, unauthorized, forbidden, validationError }`
- `helpers/pagination.js` — `{ getPagination, paginatedResponse }`
- `middleware/auth.js` — JWT guard, sets `req.user = { id, email, role }`
- `middleware/roleCheck.js` — `{ allow }`, e.g. `allow('buyer')`
- `middleware/validate.js` — `{ validate }`
- `models/VendorModel` — `findByUserId(userId)`
- `models/ProductModel` — `findById(id)`
- `routes/index.js` — mounts sub-routers under `/api/v1`
- `views/layouts/main.ejs` — shell with nav
- DB tables: `rfps`, `rfp_line_items`, `bids`, `bid_line_items`, `activity_logs` already exist

## What to build

### 1. models/RFPModel.js

CRUD for rfps table. Methods:

```js
const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  create({ buyer_id, title, description, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO rfps (id, buyer_id, title, description, status, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, buyer_id, title, description || null, deadline, budget_min || null, budget_max || null, currency || 'USD', sustainability_requirements || null, is_green_rfp ? 1 : 0, now, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare(`
      SELECT r.*, u.name AS buyer_name, u.email AS buyer_email
      FROM rfps r
      JOIN users u ON r.buyer_id = u.id
      WHERE r.id = ?
    `).get(id);
  },

  findByBuyer(buyerId, { page = 1, limit = 20, status } = {}) {
    const conditions = ['r.buyer_id = ?'];
    const values = [buyerId];
    if (status) { conditions.push('r.status = ?'); values.push(status); }
    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM rfps r WHERE ${where}`).get(...values).count;
    const data = db.prepare(`
      SELECT r.*, u.name AS buyer_name
      FROM rfps r JOIN users u ON r.buyer_id = u.id
      WHERE ${where}
      ORDER BY r.created_at DESC LIMIT ? OFFSET ?
    `).all(...values, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  findAllOpen({ page = 1, limit = 20, is_green_rfp, search } = {}) {
    const conditions = ["r.status = 'open'"];
    const values = [];
    if (is_green_rfp !== undefined) { conditions.push('r.is_green_rfp = ?'); values.push(is_green_rfp ? 1 : 0); }
    if (search) { conditions.push('(r.title LIKE ? OR r.description LIKE ?)'); values.push(`%${search}%`, `%${search}%`); }
    const where = conditions.join(' AND ');
    const offset = (page - 1) * limit;
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM rfps r WHERE ${where}`).get(...values).count;
    const data = db.prepare(`
      SELECT r.*, u.name AS buyer_name,
        (SELECT COUNT(*) FROM bids b WHERE b.rfp_id = r.id) AS bid_count
      FROM rfps r JOIN users u ON r.buyer_id = u.id
      WHERE ${where}
      ORDER BY r.deadline ASC LIMIT ? OFFSET ?
    `).all(...values, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  update(id, fields) {
    const allowed = ['title', 'description', 'status', 'deadline', 'budget_min', 'budget_max', 'currency', 'sustainability_requirements', 'is_green_rfp', 'awarded_bid_id'];
    const updates = []; const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'is_green_rfp') { updates.push(`${key} = ?`); values.push(fields[key] ? 1 : 0); }
        else { updates.push(`${key} = ?`); values.push(fields[key]); }
      }
    }
    if (updates.length === 0) return this.findById(id);
    updates.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id);
    db.prepare(`UPDATE rfps SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }
};
```

### 2. models/RFPLineItemModel.js

```js
const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  bulkCreate(rfpId, items) {
    const stmt = db.prepare(`
      INSERT INTO rfp_line_items (id, rfp_id, product_id, item_name, description, quantity, unit, estimated_price, green_requirement, sort_order, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    const insertMany = db.transaction((items) => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        stmt.run(generateUUID(), rfpId, item.product_id || null, item.item_name, item.description || null, item.quantity, item.unit, item.estimated_price || null, item.green_requirement || null, i + 1, now);
      }
    });
    insertMany(items);
    return this.findByRFP(rfpId);
  },

  findByRFP(rfpId) {
    return db.prepare(`
      SELECT li.*, p.name AS product_name
      FROM rfp_line_items li
      LEFT JOIN products p ON li.product_id = p.id
      WHERE li.rfp_id = ?
      ORDER BY li.sort_order
    `).all(rfpId);
  },

  deleteByRFP(rfpId) {
    db.prepare('DELETE FROM rfp_line_items WHERE rfp_id = ?').run(rfpId);
  }
};
```

### 3. models/BidModel.js

```js
const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  create({ rfp_id, vendor_id, total_amount, currency, delivery_timeline_days, sustainability_notes, carbon_offset_included, notes }) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO bids (id, rfp_id, vendor_id, status, total_amount, currency, delivery_timeline_days, sustainability_notes, carbon_offset_included, notes, submitted_at, updated_at)
      VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, rfp_id, vendor_id, total_amount, currency || 'USD', delivery_timeline_days || null, sustainability_notes || null, carbon_offset_included ? 1 : 0, notes || null, now, now);
    return this.findById(id);
  },

  findById(id) {
    return db.prepare(`
      SELECT b.*, v.company_name AS vendor_name, v.sustainability_score,
        r.title AS rfp_title, r.buyer_id, r.status AS rfp_status
      FROM bids b
      JOIN vendors v ON b.vendor_id = v.id
      JOIN rfps r ON b.rfp_id = r.id
      WHERE b.id = ?
    `).get(id);
  },

  findByRFP(rfpId) {
    return db.prepare(`
      SELECT b.*, v.company_name AS vendor_name, v.sustainability_score,
        (SELECT COUNT(*) FROM bid_line_items bli WHERE bli.bid_id = b.id) AS line_item_count
      FROM bids b
      JOIN vendors v ON b.vendor_id = v.id
      WHERE b.rfp_id = ?
      ORDER BY b.total_amount ASC
    `).all(rfpId);
  },

  findByVendor(vendorId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const total = db.prepare('SELECT COUNT(*) as count FROM bids WHERE vendor_id = ?').get(vendorId).count;
    const data = db.prepare(`
      SELECT b.*, r.title AS rfp_title, r.status AS rfp_status
      FROM bids b JOIN rfps r ON b.rfp_id = r.id
      WHERE b.vendor_id = ?
      ORDER BY b.submitted_at DESC LIMIT ? OFFSET ?
    `).all(vendorId, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  findByBuyer(buyerId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM bids b JOIN rfps r ON b.rfp_id = r.id WHERE r.buyer_id = ?
    `).get(buyerId).count;
    const data = db.prepare(`
      SELECT b.*, v.company_name AS vendor_name, r.title AS rfp_title
      FROM bids b
      JOIN rfps r ON b.rfp_id = r.id
      JOIN vendors v ON b.vendor_id = v.id
      WHERE r.buyer_id = ?
      ORDER BY b.submitted_at DESC LIMIT ? OFFSET ?
    `).all(buyerId, limit, offset);
    return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  update(id, fields) {
    const allowed = ['status', 'total_amount', 'currency', 'delivery_timeline_days', 'sustainability_notes', 'carbon_offset_included', 'notes', 'is_winner'];
    const updates = []; const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        if (key === 'carbon_offset_included' || key === 'is_winner') { updates.push(`${key} = ?`); values.push(fields[key] ? 1 : 0); }
        else { updates.push(`${key} = ?`); values.push(fields[key]); }
      }
    }
    if (updates.length === 0) return this.findById(id);
    updates.push('updated_at = ?'); values.push(new Date().toISOString()); values.push(id);
    db.prepare(`UPDATE bids SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    return this.findById(id);
  }
};
```

### 4. models/BidLineItemModel.js

```js
const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  bulkCreate(bidId, items) {
    const stmt = db.prepare(`
      INSERT INTO bid_line_items (id, bid_id, rfp_line_item_id, unit_price, quantity, total_price, green_score, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run(generateUUID(), bidId, item.rfp_line_item_id, item.unit_price, item.quantity, item.unit_price * item.quantity, item.green_score || null, item.notes || null);
      }
    });
    insertMany(items);
    return this.findByBid(bidId);
  },

  findByBid(bidId) {
    return db.prepare(`
      SELECT bli.*, li.item_name, li.unit AS rfp_unit
      FROM bid_line_items bli
      JOIN rfp_line_items li ON bli.rfp_line_item_id = li.id
      WHERE bli.bid_id = ?
      ORDER BY li.sort_order
    `).all(bidId);
  }
};
```

### 5. models/ActivityLogModel.js

```js
const db = require('../config/db');
const { generateUUID } = require('../helpers/uuid');

module.exports = {
  log(userId, action, entityType, entityId, metadata = {}) {
    const id = generateUUID();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId || null, action, entityType || null, entityId || null, JSON.stringify(metadata), now);
    return id;
  },

  findByEntity(entityType, entityId) {
    return db.prepare(`
      SELECT al.*, u.name AS user_name
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = ? AND al.entity_id = ?
      ORDER BY al.created_at DESC
    `).all(entityType, entityId);
  },

  findRecent(limit = 20) {
    return db.prepare(`
      SELECT al.*, u.name AS user_name, u.email AS user_email
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC LIMIT ?
    `).all(limit);
  }
};
```

### 6. controllers/RFPController.js

Full controller with:
- `listMyRFPs` — GET /api/v1/rfps/me (buyer's own)
- `listOpenRFPs` — GET /api/v1/rfps (public, open only)
- `getRFP` — GET /api/v1/rfps/:id
- `createRFP` — POST /api/v1/rfps (buyer only, with line items)
- `updateRFP` — PUT /api/v1/rfps/:id (buyer only, own RFP)
- `publishRFP` — PATCH /api/v1/rfps/:id/publish (draft→open)
- `cancelRFP` — PATCH /api/v1/rfps/:id/cancel
- `awardRFP` — POST /api/v1/rfps/:id/award (buyer selects winning bid)

Award logic:
1. Verify RFP belongs to buyer
2. Verify RFP status is 'under_review'
3. Verify bid_id belongs to this RFP
4. Update RFP: status='awarded', awarded_bid_id=bid_id
5. Update bid: is_winner=1
6. Update all other bids for this RFP: status='rejected'
7. Log activity

### 7. controllers/BidController.js

Full controller with:
- `submitBid` — POST /api/v1/rfps/:rfpId/bids (vendor only)
  - Validates RFP is 'open'
  - Validates deadline hasn't passed
  - Validates vendor hasn't already bid (check unique constraint)
  - Creates bid + bid line items in transaction
  - Logs activity
- `listMyBids` — GET /api/v1/bids/me (vendor's own bids)
- `listRFPBids` — GET /api/v1/rfps/:rfpId/bids (authenticated, for buyer reviewing)
- `getBid` — GET /api/v1/bids/:id
- `updateBidStatus` — PATCH /api/v1/bids/:id/status (buyer: under_review, accepted, rejected)

### 8. controllers/ActivityLogController.js

Simple read-only:
- `getRecent` — GET /api/v1/activities (authenticated)

### 9. routes/rfpRoutes.js

```js
const router = require('express').Router();
const { body } = require('express-validator');
const RFPController = require('../controllers/RFPController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Buyer's own RFPs
router.get('/me', auth, allow('buyer'), RFPController.listMyRFPs);

// Public — open RFPs
router.get('/', RFPController.listOpenRFPs);
router.get('/:id', RFPController.getRFP);

// Buyer CRUD
router.post('/', auth, allow('buyer'), [
  body('title').trim().isLength({ min: 3 }),
  body('deadline').isISO8601(),
  body('line_items').isArray({ min: 1 }),
  validate
], RFPController.createRFP);

router.put('/:id', auth, allow('buyer'), RFPController.updateRFP);

// Status transitions
router.patch('/:id/publish', auth, allow('buyer'), RFPController.publishRFP);
router.patch('/:id/cancel', auth, allow('buyer'), RFPController.cancelRFP);

// Award
router.post('/:id/award', auth, allow('buyer'), [
  body('bid_id').isString().notEmpty(),
  validate
], RFPController.awardRFP);

module.exports = router;
```

### 10. routes/bidRoutes.js

```js
const router = require('express').Router();
const { body } = require('express-validator');
const BidController = require('../controllers/BidController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Vendor's own bids
router.get('/me', auth, allow('vendor'), BidController.listMyBids);

// Submit bid (nested under RFP)
router.post('/rfps/:rfpId/bids', auth, allow('vendor'), [
  body('total_amount').isFloat({ min: 0.01 }),
  body('line_items').isArray({ min: 1 }),
  validate
], BidController.submitBid);

// View bids for an RFP (buyer reviewing)
router.get('/rfps/:rfpId/bids', auth, BidController.listRFPBids);

// Single bid
router.get('/:id', auth, BidController.getBid);

// Status update (buyer)
router.patch('/:id/status', auth, allow('buyer'), BidController.updateBidStatus);

module.exports = router;
```

Wait — routes for bids need to be mounted differently. The bid routes include `/rfps/:rfpId/bids` which is nested. The standard approach: mount bidRoutes at `/api/v1` level so paths like `/api/v1/bids/me` and `/api/v1/rfps/:rfpId/bids` both work.

Actually cleaner: split them. Keep bid submit under rfpRoutes, and bid management under bidRoutes. Let's simplify:

**routes/rfpRoutes.js** already has bid-related endpoints:
- POST /api/v1/rfps/:rfpId/bids (vendor submit)
- GET /api/v1/rfps/:rfpId/bids (view bids for RFP)
- POST /api/v1/rfps/:id/award

**routes/bidRoutes.js** has:
- GET /api/v1/bids/me (vendor's bids)
- GET /api/v1/bids/:id (single bid)
- PATCH /api/v1/bids/:id/status (buyer updates)

### 11. routes/activityRoutes.js

```js
const router = require('express').Router();
const ActivityLogController = require('../controllers/ActivityLogController');
const auth = require('../middleware/auth');

router.get('/', auth, ActivityLogController.getRecent);

module.exports = router;
```

### 12. Update routes/index.js

Add:
```js
router.use('/rfps', require('./rfpRoutes'));
router.use('/bids', require('./bidRoutes'));
router.use('/activities', require('./activityRoutes'));
```

### 13. Views

**views/rfp/list.ejs** — Browse open RFPs (public) + buyer's own RFPs
- Table: title, buyer, status, deadline, bid count, green badge
- Filters: status, is_green_rfp, search
- Buyer sees their own RFPs with status workflow buttons (publish, cancel, award)
- Vendor sees open RFPs with "Submit Bid" button

**views/rfp/create.ejs** — Create RFP form
- Fields: title, description, deadline (datetime picker), budget_min, budget_max, sustainability_requirements (textarea), is_green_rfp (checkbox)
- Dynamic line items section: add/remove rows with item_name, quantity, unit, estimated_price

**views/rfp/detail.ejs** — RFP detail with line items + bids
- Shows RFP info, deadline countdown, status badge
- Line items table: item_name, description, quantity, unit, estimated_price
- Bids section (if buyer or if RFP is awarded): vendor name, total_amount, status
- Vendor sees "Submit Bid" button if RFP is open

**views/bid/create.ejs** — Submit bid form
- Shows RFP line items (read-only)
- For each line item: input unit_price, notes
- Below: total_amount calculation, delivery_timeline_days, sustainability_notes, carbon_offset_included (checkbox), notes

**views/bid/detail.ejs** — Bid detail
- bid info: vendor, amount, status
- Line items with pricing
- Buyer actions: change status (under_review, accepted, rejected)

**views/bid/list.ejs** — Vendor's bids list
- Table: RFP title, total_amount, status, submitted_at
- Click to view details

### 14. Page routes in server.js

```js
// RFP pages
server.get('/rfps', (req, res) => { res.render('rfp/list', { user: req.user || null }); });
server.get('/rfps/create', auth, (req, res) => { res.render('rfp/create', { user: req.user }); });
server.get('/rfps/:id', (req, res) => { res.render('rfp/detail', { user: req.user || null }); });

// Bid pages
server.get('/bids', auth, (req, res) => { res.render('bid/list', { user: req.user }); });
server.get('/rfps/:rfpId/bids/create', auth, (req, res) => { res.render('bid/create', { user: req.user }); });
server.get('/bids/:id', auth, (req, res) => { res.render('bid/detail', { user: req.user }); });
```

### 15. Tests

**tests/models/RFPModel.test.js:**
- create RFP with all fields
- findById joins buyer name
- findByBuyer returns buyer's RFPs with pagination
- findAllOpen returns only status='open'
- update changes fields

**tests/models/BidModel.test.js:**
- create bid
- findById joins vendor + RFP
- findByRFP returns all bids for an RFP
- findByVendor returns vendor's bids
- findByBuyer returns bids for buyer's RFPs
- update changes status

**tests/controllers/RFPController.test.js:**
- POST /api/v1/rfps (auth buyer) → 201
- POST /api/v1/rfps (auth vendor) → 403
- GET /api/v1/rfps (public) → 200 — only open
- PUT /api/v1/rfps/:id (own buyer) → 200
- PATCH /api/v1/rfps/:id/publish (draft→open) → 200
- POST /api/v1/rfps/:id/award → 200

**tests/controllers/BidController.test.js:**
- POST /api/v1/rfps/:rfpId/bids (auth vendor) → 201
- POST duplicate bid → 422
- POST bid on closed RFP → 400
- GET /api/v1/bids/me (auth vendor) → 200
- PATCH /api/v1/bids/:id/status (buyer) → 200

## IMPORTANT

1. **Unique constraint:** DB has `UNIQUE INDEX idx_bids_rfp_vendor_unique` — one bid per vendor per RFP. Handle duplicate gracefully in BidController (catch and return 422).
2. **Deadline check:** Before inserting bid, verify `rfps.deadline > CURRENT_TIMESTAMP` using `new Date().toISOString()` comparison in JS.
3. **Award workflow:** Uses a transaction (db.transaction) to atomically: update RFP status, set awarded bid, reject other bids.
4. **Line items:** RFP line items are created via transaction (bulkCreate). Bid line items too.
5. **All controllers** wrap logic in try/catch with `next(err)`.
6. **Activity logging:** Call `ActivityLogModel.log(...)` after each significant action (RFP created, published, cancelled, awarded, bid submitted, bid status changed).

## Deliverable
- Full RFP lifecycle (draft → open → under_review → awarded / cancelled)
- Bid submission with line item pricing
- One bid per vendor per RFP enforced
- Award workflow
- Activity logging
- All views for RFP and bid management
- All tests passing (existing 45 + new ~24)

## Report Format
Write to `D:\cacaa\green-tech-procurement\.hermes\phase3-report.md`:
- Status: DONE / DONE_WITH_CONCERNS / BLOCKED
- Commits made
- Test results
- Any concerns

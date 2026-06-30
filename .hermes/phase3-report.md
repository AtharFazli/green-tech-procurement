# Phase 3 Report: RFP & Bidding System

**Status:** DONE

**Commit:** `7b05a8f`

**Test Results:**
- 65 tests passed (45 existing + 20 new)
- 11 suites passed, 0 failures

## What was built

### Models (5 files)
- `models/RFPModel.js` — create, findById (joins buyer), findByBuyer (paginated), findAllOpen (paginated, filterable), update
- `models/RFPLineItemModel.js` — bulkCreate (transactional), findByRFP, deleteByRFP
- `models/BidModel.js` — create, findById (joins vendor+RFP), findByRFP, findByVendor, findByBuyer, update
- `models/BidLineItemModel.js` — bulkCreate (transactional), findByBid
- `models/ActivityLogModel.js` — log, findByEntity, findRecent

### Controllers (3 files)
- `controllers/RFPController.js` — listMyRFPs, listOpenRFPs, getRFP (with line items + bids), createRFP, updateRFP, publishRFP (draft→open), cancelRFP, awardRFP (transactional: award winner + reject others)
- `controllers/BidController.js` — submitBid (validates deadline, uniqueness, RFP status; transactional), listMyBids, listRFPBids, getBid, updateBidStatus (sets RFP to under_review when appropriate)
- `controllers/ActivityLogController.js` — getRecent

### Routes (3 files)
- `routes/rfpRoutes.js` — GET /me, GET /, GET /:id, POST / (validation), PUT /:id, PATCH /:id/publish, PATCH /:id/cancel, POST /:id/award
- `routes/bidRoutes.js` — GET /me, POST /rfps/:rfpId/bids, GET /rfps/:rfpId/bids, GET /:id, PATCH /:id/status
- `routes/activityRoutes.js` — GET /
- `routes/index.js` — added rfpRoutes, bidRoutes, activityRoutes

### Views (6 files)
- `views/rfp/list.ejs` — public RFP browsing + buyer's own RFPs with filters, pagination, action buttons
- `views/rfp/create.ejs` — dynamic line items, AJAX submit
- `views/rfp/detail.ejs` — RFP info, line items, bids, publish/cancel/award buttons
- `views/bid/create.ejs` — pricing per line item, auto-total, AJAX submit
- `views/bid/detail.ejs` — bid info, line items, buyer status actions
- `views/bid/list.ejs` — vendor's submitted bids

### Page routes (server.js)
- `/rfps`, `/rfps/create`, `/rfps/:id`, `/bids`, `/rfps/:rfpId/bids/create`, `/bids/:id`

### Tests (4 files)
- `tests/models/RFPModel.test.js` (5 tests)
- `tests/models/BidModel.test.js` (6 tests)
- `tests/controllers/RFPController.test.js` (5 tests)
- `tests/controllers/BidController.test.js` (4 tests)

## Key features implemented
- Full RFP lifecycle: draft → open → under_review → awarded / cancelled
- Bid submission with line-item pricing, deadline check, uniqueness enforcement
- Award workflow via db.transaction (updates RFP, sets winner, rejects others)
- Activity logging on all key actions
- All controllers use try/catch with next(err)
- UNIQUE constraint on one-bid-per-vendor handled gracefully (422)

## Concerns
- None

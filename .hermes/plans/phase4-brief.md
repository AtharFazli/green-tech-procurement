# Phase 4 Task Brief: Analytics Dashboard

## Context
Phase 4 is the final layer — a rich analytics dashboard with Chart.js visualizations, green procurement metrics, and activity feed. All data tables exist (users, vendors, products, rfps, bids, activity_logs). This phase is read-intensive: aggregate queries, chart data endpoints, and dashboard UI.

**Working directory:** `D:\cacaa\green-tech-procurement`

## Interfaces from previous phases (DO NOT recreate)

- `config/db.js` — synchronous better-sqlite3
- `helpers/uuid.js` — `generateUUID()`
- `helpers/apiResponse.js` — `{ success, created, error, notFound, unauthorized, forbidden, validationError }`
- `helpers/pagination.js` — `{ getPagination, paginatedResponse }`
- `middleware/auth.js` — JWT guard, sets `req.user = { id, email, role }`
- `middleware/roleCheck.js` — `{ allow }`, e.g. `allow('buyer')`
- `models/VendorModel` — `findByUserId(userId)`
- `models/ProductModel` — `findById(id)`
- `models/ActivityLogModel` — `findRecent(limit)`, `log(userId, action, entityType, entityId, metadata)`
- `routes/index.js` — mounts sub-routers under `/api/v1`
- `views/layouts/main.ejs` — shell with nav
- `public/css/app.css` — existing styles
- `public/js/` — directory exists (add Chart.js bundle + dashboard script here)
- `server.js` — entry point, mount page routes

## DB tables available for querying

```
users (id, name, email, role, is_active, created_at)
vendors (id, user_id, company_name, sustainability_score, green_certifications, is_approved, created_at)
products (id, vendor_id, name, price, is_green_certified, carbon_footprint, status, created_at)
rfps (id, buyer_id, title, status, deadline, budget_min, budget_max, is_green_rfp, awarded_bid_id, created_at)
bids (id, rfp_id, vendor_id, total_amount, status, is_winner, sustainability_notes, carbon_offset_included, submitted_at)
activity_logs (id, user_id, action, entity_type, entity_id, metadata, created_at)
```

## What to build

### 1. models/DashboardModel.js

Aggregate query methods — NO direct DB calls in controllers.

```js
const db = require('../config/db');

module.exports = {
  /**
   * High-level procurement stats for buyer dashboard
   */
  getBuyerStats(buyerId) {
    const totalRfps = db.prepare(`
      SELECT COUNT(*) as count FROM rfps WHERE buyer_id = ?
    `).get(buyerId).count;

    const activeRfps = db.prepare(`
      SELECT COUNT(*) as count FROM rfps WHERE buyer_id = ? AND status IN ('open', 'under_review')
    `).get(buyerId).count;

    const completedRfps = db.prepare(`
      SELECT COUNT(*) as count FROM rfps WHERE buyer_id = ? AND status = 'awarded'
    `).get(buyerId).count;

    const totalBids = db.prepare(`
      SELECT COUNT(*) as count FROM bids b
      JOIN rfps r ON b.rfp_id = r.id
      WHERE r.buyer_id = ?
    `).get(buyerId).count;

    const avgBidsPerRfp = db.prepare(`
      SELECT AVG(bid_count) as avg FROM (
        SELECT COUNT(*) as bid_count FROM bids b
        JOIN rfps r ON b.rfp_id = r.id
        WHERE r.buyer_id = ?
        GROUP BY b.rfp_id
      )
    `).get(buyerId).avg || 0;

    const totalSpent = db.prepare(`
      SELECT COALESCE(SUM(b.total_amount), 0) as total FROM bids b
      JOIN rfps r ON b.rfp_id = r.id
      WHERE r.buyer_id = ? AND b.is_winner = 1
    `).get(buyerId).total;

    return {
      totalRfps, activeRfps, completedRfps,
      totalBids, avgBidsPerRfp: Math.round(avgBidsPerRfp * 100) / 100,
      totalSpent
    };
  },

  /**
   * Green procurement stats
   */
  getGreenStats(userId, role) {
    let condition = '';
    const values = [];
    if (role === 'buyer') {
      // Green RFPs created by this buyer
      condition = `WHERE r.buyer_id = ?`;
      values.push(userId);
    } else if (role === 'vendor') {
      // Green products from this vendor
      condition = `WHERE p.vendor_id = (SELECT id FROM vendors WHERE user_id = ?)`;
      values.push(userId);
    }

    if (role === 'buyer') {
      const greenRfps = db.prepare(`
        SELECT COUNT(*) as count FROM rfps r ${condition} AND r.is_green_rfp = 1
      `).get(...values).count;

      const totalRfps = db.prepare(`
        SELECT COUNT(*) as count FROM rfps r ${condition}
      `).get(...values).count;

      const greenAwarded = db.prepare(`
        SELECT COUNT(*) as count FROM rfps r
        JOIN bids b ON r.awarded_bid_id = b.id
        ${condition} AND r.is_green_rfp = 1 AND r.status = 'awarded'
        AND (b.carbon_offset_included = 1 OR b.sustainability_notes IS NOT NULL)
      `).get(...values).count;

      return { greenRfps, totalRfps, greenAwarded };
    }

    if (role === 'vendor') {
      const greenProducts = db.prepare(`
        SELECT COUNT(*) as count FROM products p ${condition} AND p.is_green_certified = 1
      `).get(...values).count;

      const totalProducts = db.prepare(`
        SELECT COUNT(*) as count FROM products p ${condition}
      `).get(...values).count;

      const avgCarbon = db.prepare(`
        SELECT COALESCE(AVG(p.carbon_footprint), 0) as avg FROM products p ${condition}
      `).get(...values).avg;

      return { greenProducts, totalProducts, avgCarbon: Math.round(avgCarbon * 100) / 100 };
    }

    // Admin: platform-wide green stats
    const greenRfps = db.prepare('SELECT COUNT(*) as count FROM rfps WHERE is_green_rfp = 1').get().count;
    const totalRfps = db.prepare('SELECT COUNT(*) as count FROM rfps').get().count;
    const greenProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_green_certified = 1').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const avgSustainabilityScore = db.prepare('SELECT COALESCE(AVG(sustainability_score), 0) as avg FROM vendors').get().avg;

    return {
      greenRfps, totalRfps, greenProducts, totalProducts,
      avgSustainabilityScore: Math.round(avgSustainabilityScore * 100) / 100
    };
  },

  /**
   * RFP status breakdown for chart pie/donut
   */
  getRFPStatusBreakdown(buyerId) {
    return db.prepare(`
      SELECT status, COUNT(*) as count
      FROM rfps WHERE buyer_id = ?
      GROUP BY status
      ORDER BY count DESC
    `).all(buyerId);
  },

  /**
   * Monthly RFP creation trend (last 12 months)
   */
  getRFPTrend(userId, role) {
    let condition = '';
    const values = [];
    if (role === 'buyer') {
      condition = 'WHERE r.buyer_id = ?';
      values.push(userId);
    } else if (role === 'vendor') {
      condition = 'WHERE r.id IN (SELECT DISTINCT rfp_id FROM bids b WHERE b.vendor_id = (SELECT id FROM vendors WHERE user_id = ?))';
      values.push(userId);
    }

    return db.prepare(`
      SELECT strftime('%Y-%m', r.created_at) as month, COUNT(*) as count
      FROM rfps r ${condition}
      WHERE r.created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', r.created_at)
      ORDER BY month ASC
    `).all(...values);
  },

  /**
   * Top vendors by win count and sustainability score
   */
  getTopVendors(limit = 5) {
    return db.prepare(`
      SELECT v.id, v.company_name, v.sustainability_score, v.is_approved,
        COUNT(b.id) as total_bids,
        SUM(CASE WHEN b.is_winner = 1 THEN 1 ELSE 0 END) as wins,
        ROUND(AVG(COALESCE(v.sustainability_score, 0)), 1) as avg_sustainability
      FROM vendors v
      LEFT JOIN bids b ON b.vendor_id = v.id
      GROUP BY v.id
      ORDER BY wins DESC, avg_sustainability DESC
      LIMIT ?
    `).all(limit);
  },

  /**
   * Budget vs actual for buyer's awarded RFPs
   */
  getBudgetComparison(buyerId) {
    return db.prepare(`
      SELECT r.title, r.budget_min, r.budget_max,
        b.total_amount, v.company_name,
        ROUND(((r.budget_max - b.total_amount) / NULLIF(r.budget_max, 0)) * 100, 1) as savings_pct
      FROM rfps r
      JOIN bids b ON r.awarded_bid_id = b.id
      JOIN vendors v ON b.vendor_id = v.id
      WHERE r.buyer_id = ? AND r.status = 'awarded'
      ORDER BY b.total_amount DESC
    `).all(buyerId);
  },

  /**
   * Vendor dashboard stats
   */
  getVendorStats(userId) {
    const vendorId = db.prepare('SELECT id FROM vendors WHERE user_id = ?').get(userId);

    if (!vendorId) return null;

    const totalBids = db.prepare('SELECT COUNT(*) as count FROM bids WHERE vendor_id = ?').get(vendorId.id).count;
    const activeBids = db.prepare("SELECT COUNT(*) as count FROM bids WHERE vendor_id = ? AND status = 'submitted'").get(vendorId.id).count;
    const wins = db.prepare('SELECT COUNT(*) as count FROM bids WHERE vendor_id = ? AND is_winner = 1').get(vendorId.id).count;
    const winRate = totalBids > 0 ? Math.round((wins / totalBids) * 100) : 0;

    const totalRevenue = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total FROM bids WHERE vendor_id = ? AND is_winner = 1
    `).get(vendorId.id).total;

    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE vendor_id = ?').get(vendorId.id).count;
    const greenProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE vendor_id = ? AND is_green_certified = 1').get(vendorId.id).count;

    return { totalBids, activeBids, wins, winRate, totalRevenue, totalProducts, greenProducts };
  },

  /**
   * Platform-wide admin stats
   */
  getAdminStats() {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalVendors = db.prepare('SELECT COUNT(*) as count FROM vendors').get().count;
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    const totalRfps = db.prepare('SELECT COUNT(*) as count FROM rfps').get().count;
    const totalBids = db.prepare('SELECT COUNT(*) as count FROM bids').get().count;
    const awardedValue = db.prepare(`
      SELECT COALESCE(SUM(b.total_amount), 0) as total FROM bids b WHERE b.is_winner = 1
    `).get().total;
    const avgSustainability = db.prepare('SELECT COALESCE(AVG(sustainability_score), 0) as avg FROM vendors').get().avg;

    return {
      totalUsers, totalVendors, totalProducts,
      totalRfps, totalBids,
      awardedValue,
      avgSustainability: Math.round(avgSustainability * 100) / 100
    };
  }
};
```

### 2. controllers/DashboardController.js

```js
const DashboardModel = require('../models/DashboardModel');
const ApiResponse = require('../helpers/apiResponse');
const ActivityLogModel = require('../models/ActivityLogModel');

module.exports = {
  // GET /api/v1/dashboard/stats
  getStats(req, res, next) {
    try {
      const { role, id } = req.user;
      let stats;

      if (role === 'buyer') {
        stats = DashboardModel.getBuyerStats(id);
      } else if (role === 'vendor') {
        stats = DashboardModel.getVendorStats(id);
      } else {
        stats = DashboardModel.getAdminStats();
      }

      res.json(ApiResponse.success({ stats }));
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/green
  getGreenMetrics(req, res, next) {
    try {
      const green = DashboardModel.getGreenStats(req.user.id, req.user.role);
      res.json(ApiResponse.success({ green }));
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/rfp-trend
  getRFPTrend(req, res, next) {
    try {
      const trend = DashboardModel.getRFPTrend(req.user.id, req.user.role);
      res.json(ApiResponse.success({ trend }));
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/rfp-breakdown (buyer only)
  getRFPBreakdown(req, res, next) {
    try {
      const breakdown = DashboardModel.getRFPStatusBreakdown(req.user.id);
      res.json(ApiResponse.success({ breakdown }));
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/budget-comparison (buyer only)
  getBudgetComparison(req, res, next) {
    try {
      const comparison = DashboardModel.getBudgetComparison(req.user.id);
      res.json(ApiResponse.success({ comparison }));
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/top-vendors
  getTopVendors(req, res, next) {
    try {
      const vendors = DashboardModel.getTopVendors(parseInt(req.query.limit) || 5);
      res.json(ApiResponse.success({ vendors }));
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/activity-feed
  getActivityFeed(req, res, next) {
    try {
      const activities = ActivityLogModel.findRecent(parseInt(req.query.limit) || 20);
      res.json(ApiResponse.success({ activities }));
    } catch (err) { next(err); }
  }
};
```

### 3. routes/dashboardRoutes.js

```js
const router = require('express').Router();
const DashboardController = require('../controllers/DashboardController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

// All dashboard endpoints require auth
router.get('/stats', auth, DashboardController.getStats);
router.get('/green', auth, DashboardController.getGreenMetrics);
router.get('/rfp-trend', auth, DashboardController.getRFPTrend);
router.get('/rfp-breakdown', auth, allow('buyer'), DashboardController.getRFPBreakdown);
router.get('/budget-comparison', auth, allow('buyer'), DashboardController.getBudgetComparison);
router.get('/top-vendors', auth, DashboardController.getTopVendors);
router.get('/activity-feed', auth, DashboardController.getActivityFeed);

module.exports = router;
```

### 4. Update routes/index.js

Add:
```js
router.use('/dashboard', require('./dashboardRoutes'));
```

### 5. public/js/chartjs-config.js

Download Chart.js CDN reference or bundle. For this project, use CDN in the EJS layout. Create a helper script:

```js
// public/js/chartjs-config.js
// Shared Chart.js config and color palette for dashboard

const chartColors = {
  green: ['#2ecc71', '#27ae60', '#1abc9c', '#16a085', '#2ecc71'],
  blue: ['#3498db', '#2980b9', '#5dade2', '#2e86c1', '#1f618d'],
  status: {
    draft: '#95a5a6',
    open: '#3498db',
    under_review: '#f39c12',
    awarded: '#2ecc71',
    cancelled: '#e74c3c'
  }
};

function createDonutChart(ctx, labels, data, colors) {
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      cutout: '65%',
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function createBarChart(ctx, labels, datasets) {
  return new Chart(ctx, {
    type: 'bar',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function createLineChart(ctx, labels, datasets) {
  return new Chart(ctx, {
    type: 'line',
    data: { labels: labels, datasets: datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}
```

### 6. public/js/dashboard.js

```js
// public/js/dashboard.js
// Fetches dashboard data and renders charts

class Dashboard {
  constructor() {
    this.init();
  }

  async init() {
    await Promise.all([
      this.loadStats(),
      this.loadGreenMetrics(),
      this.loadRFPTrend(),
      this.loadRFPBreakdown(),
      this.loadBudgetComparison(),
      this.loadTopVendors(),
      this.loadActivityFeed()
    ]);
  }

  async fetchJSON(url) {
    const res = await fetch(url);
    const data = await res.json();
    return data.data || data;
  }

  async loadStats() {
    try {
      const { stats } = await this.fetchJSON('/api/v1/dashboard/stats');
      Object.keys(stats).forEach(key => {
        const el = document.getElementById(`stat-${key}`);
        if (el) {
          const val = typeof stats[key] === 'number' && stats[key] > 999
            ? (stats[key] / 1000).toFixed(1) + 'k'
            : stats[key];
          el.textContent = val;
        }
      });
    } catch (e) { console.error('Stats load error:', e); }
  }

  async loadGreenMetrics() {
    try {
      const { green } = await this.fetchJSON('/api/v1/dashboard/green');
      Object.keys(green).forEach(key => {
        const el = document.getElementById(`green-${key}`);
        if (el) {
          const val = typeof green[key] === 'number'
            ? (key === 'avgCarbon' || key === 'avgSustainabilityScore' ? green[key].toFixed(1) : green[key])
            : green[key];
          el.textContent = val;
        }
      });
    } catch (e) { console.error('Green metrics error:', e); }
  }

  async loadRFPTrend() {
    const canvas = document.getElementById('chart-rfp-trend');
    if (!canvas) return;
    try {
      const { trend } = await this.fetchJSON('/api/v1/dashboard/rfp-trend');
      const labels = trend.map(t => t.month);
      const data = trend.map(t => t.count);
      createLineChart(canvas.getContext('2d'), labels, [{
        label: 'RFPs per Month',
        data: data,
        borderColor: '#2ecc71',
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        fill: true,
        tension: 0.3
      }]);
    } catch (e) { console.error('Trend error:', e); }
  }

  async loadRFPBreakdown() {
    const canvas = document.getElementById('chart-rfp-breakdown');
    if (!canvas) return;
    try {
      const { breakdown } = await this.fetchJSON('/api/v1/dashboard/rfp-breakdown');
      const labels = breakdown.map(b => b.status.charAt(0).toUpperCase() + b.status.slice(1));
      const data = breakdown.map(b => b.count);
      const colors = labels.map(l => chartColors.status[l.toLowerCase()] || '#95a5a6');
      createDonutChart(canvas.getContext('2d'), labels, data, colors);
    } catch (e) { console.error('Breakdown error:', e); }
  }

  async loadBudgetComparison() {
    const canvas = document.getElementById('chart-budget-comparison');
    if (!canvas) return;
    try {
      const { comparison } = await this.fetchJSON('/api/v1/dashboard/budget-comparison');
      if (comparison.length === 0) {
        canvas.parentElement.innerHTML = '<p class="text-muted">No awarded RFPs yet.</p>';
        return;
      }
      const labels = comparison.map(c => c.title.substring(0, 20) + '...');
      const budgetMax = comparison.map(c => c.budget_max);
      const actual = comparison.map(c => c.total_amount);
      createBarChart(canvas.getContext('2d'), labels, [
        { label: 'Budget Max', data: budgetMax, backgroundColor: '#3498db' },
        { label: 'Awarded Amount', data: actual, backgroundColor: '#2ecc71' }
      ]);
    } catch (e) { console.error('Budget error:', e); }
  }

  async loadTopVendors() {
    const tbody = document.querySelector('#top-vendors-table tbody');
    if (!tbody) return;
    try {
      const { vendors } = await this.fetchJSON('/api/v1/dashboard/top-vendors');
      tbody.innerHTML = vendors.map((v, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${v.company_name}</td>
          <td>${v.wins}</td>
          <td>${v.total_bids}</td>
          <td>${v.avg_sustainability || '—'}</td>
          <td><span class="badge ${v.is_approved ? 'bg-success' : 'bg-warning'}">${v.is_approved ? 'Approved' : 'Pending'}</span></td>
        </tr>
      `).join('');
    } catch (e) { console.error('Top vendors error:', e); }
  }

  async loadActivityFeed() {
    const container = document.getElementById('activity-feed');
    if (!container) return;
    try {
      const { activities } = await this.fetchJSON('/api/v1/dashboard/activity-feed');
      container.innerHTML = activities.map(a => `
        <div class="activity-item">
          <div class="activity-icon ${a.action.split('_')[0]}">${this.getActivityIcon(a.action)}</div>
          <div class="activity-content">
            <strong>${a.user_name || 'System'}</strong>
            <span>${this.formatAction(a.action)}</span>
            <small class="text-muted">${a.entity_type ? a.entity_type : ''} ${a.entity_id ? '#' + a.entity_id.substring(0, 8) : ''}</small>
            <div class="activity-time text-muted">${this.timeAgo(a.created_at)}</div>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error('Activity feed error:', e); }
  }

  formatAction(action) {
    const map = {
      'rfp_created': 'created an RFP',
      'rfp_published': 'published an RFP',
      'rfp_cancelled': 'cancelled an RFP',
      'rfp_awarded': 'awarded an RFP',
      'bid_submitted': 'submitted a bid',
      'bid_accepted': 'accepted a bid',
      'bid_rejected': 'rejected a bid',
      'vendor_registered': 'registered as vendor',
      'product_created': 'added a product'
    };
    return map[action] || action.replace(/_/g, ' ');
  }

  getActivityIcon(action) {
    const icons = {
      rfp: '📋', bid: '💰', vendor: '🏢', product: '🔋'
    };
    const prefix = action.split('_')[0];
    return icons[prefix] || '📌';
  }

  timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('[data-dashboard]')) {
    new Dashboard();
  }
});
```

### 7. Update views/layouts/main.ejs

Add Chart.js CDN in `<head>`:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="/js/chartjs-config.js"></script>
```

### 8. views/dashboard/buyer.ejs

Full buyer dashboard layout:

```
┌─────────────────────────────────────────────────────┐
│  🌿 Green Procurement Dashboard                      │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ Total    │ Active   │ Completed│ Total    │ Avg Bids │
│ RFPs     │ RFPs     │ RFPs     │ Bids     │ per RFP  │
│ [stat-   │ [stat-   │ [stat-   │ [stat-   │ [stat-   │
│ totalRfps│ activeRf-│ completed│ totalBids│ avgBidsP-│
│ ]        │ ps]      │ Rfps]    │ ]        │ erRfp]   │
├──────────┴──────────┴──────────┴──────────┴──────────┤
│  🟢 Green Metrics Card                               │
│  Green RFPs: [green-greenRfps] / [green-totalRfps]   │
│  Green Awards: [green-greenAwarded]                  │
│  Total Spent: $[stat-totalSpent]                     │
├──────────────────┬───────────────────────────────────┤
│  📈 RFP Trend     │  🍩 RFP Status Breakdown          │
│  [Line chart]     │  [Donut chart]                    │
│  chart-rfp-trend  │  chart-rfp-breakdown              │
├──────────────────┴───────────────────────────────────┤
│  💰 Budget vs Actual                                  │
│  [Bar chart] — chart-budget-comparison                │
├──────────────────┬───────────────────────────────────┤
│  🏆 Top Vendors   │  📌 Recent Activity                │
│  [Table]          │  [Feed list]                       │
│  top-vendors-table│  activity-feed                     │
└──────────────────┴───────────────────────────────────┘
```

### 9. views/dashboard/vendor.ejs

Vendor dashboard:

```
┌─────────────────────────────────────────────────────┐
│  🌿 My Vendor Dashboard                               │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ Total    │ Active   │ Wins     │ Win Rate │ Total    │
│ Bids     │ Bids     │          │          │ Revenue  │
│ [stat-   │ [stat-   │ [stat-   │ [stat-   │ [stat-   │
│ totalBids│ activeBi-│ wins]    │ winRate  │ totalRev-│
│ ]        │ ds]      │          │ ]        │ enue]    │
├──────────┴──────────┴──────────┴──────────┴──────────┤
│  🟢 Green Products Card                              │
│  Green: [green-greenProducts] / [green-totalProducts]│
│  Avg Carbon: [green-avgCarbon]                       │
├──────────────────┬───────────────────────────────────┤
│  📈 RFP Trend     │  📌 Recent Activity               │
│  [Line chart]     │  [Feed list]                      │
│  chart-rfp-trend  │  activity-feed                    │
├──────────────────┴───────────────────────────────────┤
│  🏆 Top Vendors (Platform)                            │
│  [Table] — top-vendors-table                          │
└─────────────────────────────────────────────────────┘
```

### 10. views/dashboard/admin.ejs

Admin dashboard — platform overview:
```
┌─────────────────────────────────────────────────────┐
│  🌿 Platform Admin Dashboard                          │
├──────────┬──────────┬──────────┬──────────┬──────────┤
│ Users    │ Vendors  │ Products │ RFPs     │ Bids     │
│ [stat-   │ [stat-   │ [stat-   │ [stat-   │ [stat-   │
│ totalUse-│ totalVen-│ totalPro-│ totalRfps│ totalBids│
│ rs]      │ dors]    │ ducts]   │ ]        │ ]        │
├──────────┴──────────┴──────────┴──────────┴──────────┤
│  💰 Total Awarded Value: $[stat-awardedValue]         │
│  🌿 Avg Sustainability Score: [stat-avgSustainability] │
├──────────────────┬───────────────────────────────────┤
│  🟢 Green Stats   │  📈 RFP Trend                    │
│  [Summary cards]  │  [Line chart]                     │
│                   │  chart-rfp-trend                  │
├──────────────────┴───────────────────────────────────┤
│  🏆 Top Vendors                                       │
│  [Table] — top-vendors-table                          │
├───────────────────────────────────────────────────────┤
│  📌 Recent Activity                                    │
│  [Feed list] — activity-feed                          │
└─────────────────────────────────────────────────────┘
```

### 11. public/css/app.css additions

```css
/* Dashboard cards */
.dashboard-stat { background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.dashboard-stat .stat-value { font-size: 2rem; font-weight: 700; color: #2c3e50; }
.dashboard-stat .stat-label { font-size: 0.85rem; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.5px; }
.dashboard-stat .stat-icon { font-size: 1.5rem; }

/* Chart containers */
.chart-container { background: #fff; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); min-height: 250px; }

/* Activity feed */
.activity-item { display: flex; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid #ecf0f1; }
.activity-item:last-child { border-bottom: none; }
.activity-icon { font-size: 1.25rem; width: 2rem; text-align: center; }
.activity-content { flex: 1; }
.activity-content strong { font-weight: 600; }
.activity-time { font-size: 0.8rem; }

/* Green metrics */
.green-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: #e8f8f0; color: #27ae60; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }

/* Responsive grid for stats */
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
.charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
@media (max-width: 768px) { .charts-grid { grid-template-columns: 1fr; } }
```

### 12. Update server.js with page routes

```js
// Dashboard page routes
server.get('/dashboard', auth, (req, res, next) => {
  try {
    const role = req.user.role;
    let template = 'dashboard/buyer';
    if (role === 'vendor') template = 'dashboard/vendor';
    if (role === 'admin') template = 'dashboard/admin';
    res.render(template, { user: req.user });
  } catch (err) { next(err); }
});

// Redirect root to dashboard
server.get('/', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.redirect('/login');
});
```

### 13. Tests

**tests/models/DashboardModel.test.js:**
```js
const DashboardModel = require('../../models/DashboardModel');
const db = require('../../config/db');

// Seed data
beforeAll(() => {
  // Create a buyer user
  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES ('buyer-1', 'Test Buyer', 'buyer@test.com', '$2b$10$xxx', 'buyer')`).run();
  // Create a vendor user  
  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES ('vendor-1', 'Test Vendor', 'vendor@test.com', '$2b$10$xxx', 'vendor')`).run();
  // Create vendor profile
  db.prepare(`INSERT OR IGNORE INTO vendors (id, user_id, company_name, sustainability_score, is_approved) VALUES ('ven-1', 'vendor-1', 'GreenCo', 85, 1)`).run();
  // Create products
  db.prepare(`INSERT OR IGNORE INTO products (id, vendor_id, name, price, is_green_certified, status) VALUES ('prod-1', 'ven-1', 'Solar Panel', 500, 1, 'active')`).run();
  db.prepare(`INSERT OR IGNORE INTO products (id, vendor_id, name, price, is_green_certified, status) VALUES ('prod-2', 'ven-1', 'Battery', 200, 0, 'active')`).run();
  // Create RFPs
  db.prepare(`INSERT OR IGNORE INTO rfps (id, buyer_id, title, status, is_green_rfp) VALUES ('rfp-1', 'buyer-1', 'Solar Panels Needed', 'open', 1)`).run();
  db.prepare(`INSERT OR IGNORE INTO rfps (id, buyer_id, title, status, is_green_rfp) VALUES ('rfp-2', 'buyer-1', 'Office Supplies', 'draft', 0)`).run();
  // Create bids
  db.prepare(`INSERT OR IGNORE INTO bids (id, rfp_id, vendor_id, status, total_amount, is_winner) VALUES ('bid-1', 'rfp-1', 'ven-1', 'submitted', 4800, 0)`).run();
});

describe('DashboardModel', () => {
  test('getBuyerStats returns correct counts', () => {
    const stats = DashboardModel.getBuyerStats('buyer-1');
    expect(stats.totalRfps).toBe(2);
    expect(stats.activeRfps).toBe(1);
  });

  test('getGreenStats for buyer returns green metrics', () => {
    const green = DashboardModel.getGreenStats('buyer-1', 'buyer');
    expect(green.greenRfps).toBe(1);
    expect(green.totalRfps).toBe(2);
  });

  test('getGreenStats for vendor returns product metrics', () => {
    const green = DashboardModel.getGreenStats('vendor-1', 'vendor');
    expect(green.greenProducts).toBe(1);
    expect(green.totalProducts).toBe(2);
  });

  test('getRFPStatusBreakdown returns grouped counts', () => {
    const breakdown = DashboardModel.getRFPStatusBreakdown('buyer-1');
    expect(breakdown.length).toBeGreaterThanOrEqual(2);
    const openItem = breakdown.find(b => b.status === 'open');
    expect(openItem.count).toBe(1);
  });

  test('getTopVendors returns ranked vendors', () => {
    const vendors = DashboardModel.getTopVendors(5);
    expect(vendors.length).toBeGreaterThanOrEqual(1);
    expect(vendors[0].company_name).toBe('GreenCo');
  });

  test('getVendorStats returns vendor metrics', () => {
    const stats = DashboardModel.getVendorStats('vendor-1');
    expect(stats.totalBids).toBe(1);
    expect(stats.totalProducts).toBe(2);
    expect(stats.greenProducts).toBe(1);
  });
});
```

**tests/controllers/DashboardController.test.js:**
```js
const request = require('supertest');
const app = require('../../server');

// get token by registering + logging in
let buyerToken, vendorToken;

beforeAll(async () => {
  // Register buyer
  await request(app).post('/api/v1/auth/register').send({
    name: 'Dashboard Buyer', email: 'dash-buyer@test.com', password: 'Password123!', role: 'buyer'
  });
  const buyerRes = await request(app).post('/api/v1/auth/login').send({
    email: 'dash-buyer@test.com', password: 'Password123!'
  });
  buyerToken = buyerRes.body.data.token;

  await request(app).post('/api/v1/auth/register').send({
    name: 'Dashboard Vendor', email: 'dash-vendor@test.com', password: 'Password123!', role: 'vendor'
  });
  const vendorRes = await request(app).post('/api/v1/auth/login').send({
    email: 'dash-vendor@test.com', password: 'Password123!'
  });
  vendorToken = vendorRes.body.data.token;
});

describe('DashboardController', () => {
  test('GET /api/v1/dashboard/stats returns buyer stats (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.stats).toBeDefined();
  });

  test('GET /api/v1/dashboard/green returns green metrics (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/green')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.green).toBeDefined();
  });

  test('GET /api/v1/dashboard/rfp-trend returns trend (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/rfp-trend')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.trend)).toBe(true);
  });

  test('GET /api/v1/dashboard/rfp-breakdown returns breakdown for buyer (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/rfp-breakdown')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/v1/dashboard/rfp-breakdown returns 403 for vendor', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/rfp-breakdown')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/v1/dashboard/top-vendors returns vendor list (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/top-vendors')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/v1/dashboard/activity-feed returns activities (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/activity-feed')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/v1/dashboard/stats returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats');
    expect(res.statusCode).toBe(401);
  });
});
```

## IMPORTANT

1. **All dashboard API routes** are under `/api/v1/dashboard/*` and require auth
2. **Stats differ by role**: buyer sees procurement stats, vendor sees bid/product stats, admin sees platform totals
3. **Green metrics** similarly role-scoped
4. **RFP breakdown** is buyer-only (403 for vendor)
5. **Chart.js** loaded via CDN in `<head>` of layout — no npm package needed
6. **Dashboard JS** uses `data-dashboard` attribute on container for auto-init
7. **Activities** come from existing activity_logs table (populated by Phase 3 actions)
8. **CSS additions** go in existing `public/css/app.css`
9. **Page routes** render role-specific EJS templates

## Deliverable
- DashboardModel with all aggregate queries
- DashboardController (7 endpoints)
- dashboardRoutes
- 3 EJS views (buyer, vendor, admin) with Chart.js integration
- dashboard.js + chartjs-config.js in public/js/
- CSS additions for dashboard cards, charts grid, activity feed, green badges
- Updated layout with Chart.js CDN
- Updated server.js with page route + root redirect
- All existing tests + new ~17 tests passing

## Report Format
Write to `D:\cacaa\green-tech-procurement\.hermes\phase4-report.md`:
- Status: DONE / DONE_WITH_CONCERNS / BLOCKED
- Commits made
- Test results (total count)
- Any concerns

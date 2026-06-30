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
   * Green procurement stats (role-scoped)
   */
  getGreenStats(userId, role) {
    if (role === 'buyer') {
      const greenRfps = db.prepare(`
        SELECT COUNT(*) as count FROM rfps WHERE buyer_id = ? AND is_green_rfp = 1
      `).get(userId).count;

      const totalRfps = db.prepare(`
        SELECT COUNT(*) as count FROM rfps WHERE buyer_id = ?
      `).get(userId).count;

      const greenAwarded = db.prepare(`
        SELECT COUNT(*) as count FROM rfps r
        JOIN bids b ON r.awarded_bid_id = b.id
        WHERE r.buyer_id = ? AND r.is_green_rfp = 1 AND r.status = 'awarded'
        AND (b.carbon_offset_included = 1 OR b.sustainability_notes IS NOT NULL)
      `).get(userId).count;

      return { greenRfps, totalRfps, greenAwarded };
    }

    if (role === 'vendor') {
      const greenProducts = db.prepare(`
        SELECT COUNT(*) as count FROM products p
        WHERE p.vendor_id = (SELECT id FROM vendors WHERE user_id = ?) AND p.is_green_certified = 1
      `).get(userId).count;

      const totalProducts = db.prepare(`
        SELECT COUNT(*) as count FROM products p
        WHERE p.vendor_id = (SELECT id FROM vendors WHERE user_id = ?)
      `).get(userId).count;

      const avgCarbon = db.prepare(`
        SELECT COALESCE(AVG(p.carbon_footprint_kg), 0) as avg FROM products p
        WHERE p.vendor_id = (SELECT id FROM vendors WHERE user_id = ?)
      `).get(userId).avg;

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
   * RFP status breakdown for chart pie/donut (buyer only)
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
      condition = 'AND r.buyer_id = ?';
      values.push(userId);
    } else if (role === 'vendor') {
      condition = 'AND r.id IN (SELECT DISTINCT rfp_id FROM bids b WHERE b.vendor_id = (SELECT id FROM vendors WHERE user_id = ?))';
      values.push(userId);
    }

    return db.prepare(`
      SELECT strftime('%Y-%m', r.created_at) as month, COUNT(*) as count
      FROM rfps r
      WHERE r.created_at >= date('now', '-12 months') ${condition}
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
   * Budget vs actual for buyer's awarded RFPs (buyer only)
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

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

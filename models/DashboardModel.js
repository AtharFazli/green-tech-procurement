const db = require('../config/db');

module.exports = {
  spendByCategory(buyerId, period) {
    return [];
  },
  rfpSuccessRate(buyerId) {
    return { total: 0, awarded: 0, rate: 0 };
  },
  vendorPerformance(buyerId) {
    return [];
  },
  avgGreenScore(buyerId) {
    return 0;
  },
  bidWinRate(vendorId) {
    return { total: 0, won: 0, rate: 0 };
  }
};

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount || 0);
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function formatGreenScore(score) {
  if (score === null || score === undefined) return 'N/A';
  return `${Number(score).toFixed(1)}/100`;
}

module.exports = { formatCurrency, formatDate, formatGreenScore };

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

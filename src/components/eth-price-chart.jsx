import React from 'react';
import { Chart } from 'chart.js/auto';

const EthPriceChart = () => {
  React.useEffect(() => {
    const ctx = document.getElementById('ethPriceChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"],
        datasets: [{
          label: "ETH Price (USD)",
          data: [2650, 2655, 2660, 2658, 2662, 2665, 2670, 2668, 2665, 2660, 2655, 2650, 2645, 2640, 2635, 2640, 2645, 2650, 2655, 2660, 2665, 2670, 2668, 2665],
          borderColor: "#10B981",
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        scales: {
          y: { beginAtZero: false, title: { display: true, text: "Price (USD)" }, ticks: { color: "#D1D5DB" } },
          x: { title: { display: true, text: "Hour (UTC, Sep 30, 2025)" }, ticks: { color: "#D1D5DB", maxRotation: 45, minRotation: 45 } }
        },
        plugins: { legend: { labels: { color: "#D1D5DB" } }, tooltip: { enabled: true } }
      }
    });
  }, []);

  return <canvas id="ethPriceChart" style={{ maxWidth: '100%', height: 'auto' }} />;
};

export default EthPriceChart;

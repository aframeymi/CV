// Draws the charts on the graph page from the public report totals
function drawStatusChart(countsByStatus) {
  new Chart(document.getElementById('statusChart'), {
    type: 'pie',
    data: {
      labels: countsByStatus.map((entry) => entry.status),
      datasets: [{ data: countsByStatus.map((entry) => entry.count) }],
    },
    options: { responsive: false },
  });
}

function drawNeighborhoodChart(busiestNeighborhoods) {
  new Chart(document.getElementById('neighborhoodChart'), {
    type: 'bar',
    data: {
      labels: busiestNeighborhoods.map((entry) => `${entry.neighborhood} (${entry.city})`),
      datasets: [{ label: 'Reports', data: busiestNeighborhoods.map((entry) => entry.count) }],
    },
    options: { responsive: false },
  });
}

function showLoadError(error) {
  console.error('Could not load chart data:', error);
  const message = document.createElement('p');
  message.textContent = 'Could not load chart data.';
  document.querySelector('.graph-container').append(message);
}

fetch('/api/stats')
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
    return response.json();
  })
  .then((statistics) => {
    drawStatusChart(statistics.countsByStatus);
    drawNeighborhoodChart(statistics.busiestNeighborhoods);
  })
  .catch(showLoadError);

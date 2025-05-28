// Index page JavaScript
Telegram.WebApp.ready();

const btn2 = document.getElementById('pay-button');
const boxElement = document.querySelector('.box');
const checkoutElement = document.getElementById('checkout');
const modalElement = document.getElementById('modal');
const backgroundElement = document.getElementById('background');

let stripe; // Don't initialize yet

btn2.addEventListener('click', async () => {
  // Add loading state to button
  btn2.classList.add('loading');
  
  // Small delay to show the spinner before redirect
  setTimeout(() => {
    window.location.href = 'signup.html';
  }, 300);
});

// Function to initialize charts
function initializeCharts() {
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.error('Chart.js not loaded yet, retrying...');
    setTimeout(initializeCharts, 100);
    return;
  }

  // Sample Cytokine Chart (First 8 markers)
  const cytokineCtx = document.getElementById('sampleCytokineChart');
  if (cytokineCtx) {
    try {
      const cytokineChart = new Chart(cytokineCtx, {
        type: 'bar',
        data: {
          labels: ['IL-1β', 'IL-6', 'IL-8', 'IL-10', 'TNF-α', 'IFN-γ', 'IL-12', 'IL-17'],
          datasets: [
            {
              label: 'Your Values',
              data: [85, 120, 95, 75, 110, 88, 92, 78],
              backgroundColor: [
                'rgba(255, 100, 100, 0.7)', // IL-1β elevated
                'rgba(255, 100, 100, 0.7)', // IL-6 elevated
                'rgba(100, 255, 100, 0.7)', // IL-8 normal
                'rgba(100, 255, 100, 0.7)', // IL-10 normal
                'rgba(255, 100, 100, 0.7)', // TNF-α elevated
                'rgba(100, 255, 100, 0.7)', // IFN-γ normal
                'rgba(100, 255, 100, 0.7)', // IL-12 normal
                'rgba(100, 255, 100, 0.7)'  // IL-17 normal
              ],
              borderColor: [
                'rgba(255, 100, 100, 1)',
                'rgba(255, 100, 100, 1)',
                'rgba(100, 255, 100, 1)',
                'rgba(100, 255, 100, 1)',
                'rgba(255, 100, 100, 1)',
                'rgba(100, 255, 100, 1)',
                'rgba(100, 255, 100, 1)',
                'rgba(100, 255, 100, 1)'
              ],
              borderWidth: 1
            },
            {
              label: 'Healthy Range',
              data: [100, 100, 100, 100, 100, 100, 100, 100],
              type: 'line',
              borderColor: 'rgba(255, 170, 0, 0.8)',
              borderDash: [5, 5],
              borderWidth: 2,
              pointRadius: 0,
              fill: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              max: 150,
              grid: {
                color: 'rgba(255, 140, 0, 0.1)'
              },
              ticks: {
                color: 'rgba(255, 170, 0, 0.7)',
                font: {
                  family: 'Share Tech Mono',
                  size: 10
                }
              }
            },
            y: {
              grid: {
                color: 'rgba(255, 140, 0, 0.1)'
              },
              ticks: {
                color: 'rgba(255, 170, 0, 0.7)',
                font: {
                  family: 'Share Tech Mono',
                  size: 10
                }
              }
            }
          }
        }
      });
      console.log('Cytokine chart initialized successfully');
    } catch (error) {
      console.error('Error initializing cytokine chart:', error);
    }
  } else {
    console.error('sampleCytokineChart canvas element not found');
  }

  // Sample Pattern Chart (Radar)
  const patternCtx = document.getElementById('samplePatternChart');
  if (patternCtx) {
    try {
      const patternChart = new Chart(patternCtx, {
        type: 'radar',
        data: {
          labels: ['Viral', 'Bacterial', 'Allergy', 'Sleep-Deprived', 'Over-Training', 'Autoimmune'],
          datasets: [{
            label: 'Pattern Match %',
            data: [78, 45, 62, 89, 52, 41],
            backgroundColor: 'rgba(255, 140, 0, 0.2)',
            borderColor: '#ff8c00',
            borderWidth: 2,
            pointBackgroundColor: '#ff8c00',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#ff8c00'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            r: {
              beginAtZero: true,
              max: 100,
              ticks: {
                color: 'rgba(255, 170, 0, 0.5)',
                backdropColor: 'transparent',
                font: {
                  family: 'Share Tech Mono',
                  size: 10
                }
              },
              grid: {
                color: 'rgba(255, 140, 0, 0.2)'
              },
              pointLabels: {
                color: '#ffaa00',
                font: {
                  family: 'Rajdhani',
                  size: 11,
                  weight: '600'
                }
              }
            }
          }
        }
      });
      console.log('Pattern chart initialized successfully');
    } catch (error) {
      console.error('Error initializing pattern chart:', error);
    }
  } else {
    console.error('samplePatternChart canvas element not found');
  }
}

// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
  // Add a small delay to ensure all scripts are loaded
  setTimeout(initializeCharts, 100);
}); 
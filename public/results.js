// Results page JavaScript
// Initialize charts when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Ensure content-card starts at the top
    const contentCard = document.querySelector('.content-card');
    if (contentCard) {
        contentCard.scrollTop = 0;
    }
    
    // Inflammation Pattern Radar Chart
    const radarCtx = document.getElementById('inflammationRadar').getContext('2d');
    const radarChart = new Chart(radarCtx, {
        type: 'radar',
        data: {
            labels: ['Viral', 'Bacterial', 'Allergy', 'Metabolic', 'Sleep-Deprived', 'Over-Training', 'Alcoholism', 'Autoimmune'],
            datasets: [{
                label: 'Pattern Match %',
                data: [78, 45, 62, 35, 89, 52, 23, 41],
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
            maintainAspectRatio: true,
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
                            family: 'Share Tech Mono'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 140, 0, 0.2)'
                    },
                    pointLabels: {
                        color: '#ffaa00',
                        font: {
                            family: 'Rajdhani',
                            size: 12,
                            weight: '600'
                        }
                    }
                }
            }
        }
    });

    // Cytokine Results Chart
    const cytokineCtx = document.getElementById('cytokineChart').getContext('2d');
    
    // Sample data for 48 cytokines
    const cytokineNames = [
        'IL-1α', 'IL-1β', 'IL-2', 'IL-3', 'IL-4', 'IL-5', 'IL-6', 'IL-7', 'IL-8', 'IL-9', 'IL-10',
        'IL-12p40', 'IL-12p70', 'IL-13', 'IL-15', 'IL-17A', 'IL-17E', 'IL-17F', 'IL-18', 'IL-21',
        'IL-22', 'IL-23', 'IL-27', 'IL-31', 'IL-33', 'TNF-α', 'TNF-β', 'IFN-α2', 'IFN-β', 'IFN-γ',
        'GM-CSF', 'G-CSF', 'M-CSF', 'MCP-1', 'MCP-3', 'MIP-1α', 'MIP-1β', 'RANTES', 'Eotaxin',
        'IP-10', 'MIG', 'SDF-1α', 'VEGF', 'FGF-2', 'TGF-β1', 'EGF', 'HGF', 'PDGF-BB'
    ];
    
    // Generate sample data (your values vs healthy controls)
    const yourValues = cytokineNames.map(() => Math.random() * 100 + 20);
    const healthyMin = cytokineNames.map(() => 30);
    const healthyMax = cytokineNames.map(() => 80);
    
    const cytokineChart = new Chart(cytokineCtx, {
        type: 'bar',
        data: {
            labels: cytokineNames,
            datasets: [
                {
                    label: 'Your Values',
                    data: yourValues,
                    backgroundColor: yourValues.map((val, idx) => 
                        val > healthyMax[idx] || val < healthyMin[idx] 
                            ? 'rgba(255, 100, 100, 0.7)' 
                            : 'rgba(100, 255, 100, 0.7)'
                    ),
                    borderColor: yourValues.map((val, idx) => 
                        val > healthyMax[idx] || val < healthyMin[idx] 
                            ? 'rgba(255, 100, 100, 1)' 
                            : 'rgba(100, 255, 100, 1)'
                    ),
                    borderWidth: 1
                },
                {
                    label: 'Healthy Range',
                    data: healthyMax,
                    type: 'line',
                    borderColor: 'rgba(255, 170, 0, 0.5)',
                    borderDash: [5, 5],
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: '+1',
                    backgroundColor: 'rgba(255, 170, 0, 0.1)'
                },
                {
                    label: 'Healthy Min',
                    data: healthyMin,
                    type: 'line',
                    borderColor: 'rgba(255, 170, 0, 0.5)',
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
                    labels: {
                        color: '#ffaa00',
                        font: {
                            family: 'Rajdhani',
                            weight: '600'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    borderColor: '#ff8c00',
                    borderWidth: 1,
                    titleFont: {
                        family: 'Orbitron'
                    },
                    bodyFont: {
                        family: 'Share Tech Mono'
                    }
                }
            },
            scales: {
                x: {
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
    
    // Remove the fixed height and let the container be responsive
    document.getElementById('cytokineChart').style.height = '800px';
}); 
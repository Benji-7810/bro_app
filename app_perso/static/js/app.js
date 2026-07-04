// Global variables
let activitiesData = [];
let activityChart = null;
let currentPeriod = 7; // Default period: 7 days

// Initialize app on DOM Load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Set today's date as default in form
    setDefaultDate();

    // Fetch activities from API
    fetchActivities();
});

// Helper: Set default date to today (local time YYYY-MM-DD)
function setDefaultDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('activity-date').value = `${year}-${month}-${day}`;
}

// Fetch activities from backend API
async function fetchActivities() {
    try {
        const response = await fetch('/api/activities');
        if (!response.ok) throw new Error('Erreur de chargement');
        
        activitiesData = await response.json();
        
        // Update Dashboard Elements
        updateDashboard();
        
    } catch (error) {
        console.error('Erreur lors du chargement des activités :', error);
        showToast('Impossible de récupérer l\'historique des séances.', 'error');
    }
}

// Update the entire dashboard UI
function updateDashboard() {
    renderTable(activitiesData);
    calculateKPIs(activitiesData);
    calculateWeeklyGoals(activitiesData);
    renderChart(activitiesData, currentPeriod);
    lucide.createIcons(); // Re-render icons for new dynamic HTML elements
}

// Render the activities table
function renderTable(activities) {
    const tbody = document.getElementById('activities-list');
    const emptyState = document.getElementById('table-empty-state');
    const table = document.getElementById('activities-table');
    
    tbody.innerHTML = '';
    
    if (activities.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }
    
    table.style.display = 'table';
    emptyState.style.display = 'none';
    
    activities.forEach(activity => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', activity.id);
        
        // Date formatting (FR locale)
        const dateObj = new Date(activity.date);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        // Match icon based on activity type
        let iconName = 'activity';
        if (activity.type === 'Sport en chambre') iconName = 'dumbbell';
        else if (activity.type === 'Étirements') iconName = 'stretch-horizontal';
        else if (activity.type === 'Course à pied') iconName = 'footprints';
        
        // Notes check
        const notes = activity.notes ? activity.notes : '<span style="color: var(--text-secondary); font-style: italic;">Aucune note</span>';
        
        tr.innerHTML = `
            <td style="font-weight: 500;">${formattedDate}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i data-lucide="${iconName}" style="width: 16px; height: 16px; color: var(--accent-primary);"></i>
                    <span>${activity.type}</span>
                </div>
            </td>
            <td>${activity.duration} min</td>
            <td>
                <span class="badge intensity-${activity.intensity.toLowerCase()}">
                    ${activity.intensity}
                </span>
            </td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${notes}
            </td>
            <td>
                <button class="btn-delete" onclick="deleteActivity('${activity.id}')" title="Supprimer la séance">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// Calculate Dashboard KPI Cards
function calculateKPIs(activities) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // 1. Active Days (Current Month)
    const activeDaysThisMonth = new Set(
        activities
            .filter(act => {
                const actDate = new Date(act.date);
                return actDate.getMonth() === currentMonth && actDate.getFullYear() === currentYear;
            })
            .map(act => act.date)
    ).size;
    
    document.getElementById('kpi-active-days').textContent = activeDaysThisMonth;
    document.getElementById('kpi-active-days-sub').textContent = `Actif ${activeDaysThisMonth} jour${activeDaysThisMonth > 1 ? 's' : ''} ce mois-ci`;
    
    // 2. Total Time
    const totalTime = activities.reduce((sum, act) => sum + act.duration, 0);
    document.getElementById('kpi-total-time').textContent = `${totalTime} min`;
    const avgSession = activities.length > 0 ? Math.round(totalTime / activities.length) : 0;
    document.getElementById('kpi-total-time-sub').textContent = `Moyenne : ${avgSession} min/séance`;
    
    // 3. Week Sessions (last 7 days inclusive)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const weekSessions = activities.filter(act => {
        const actDate = new Date(act.date);
        return actDate >= sevenDaysAgo;
    }).length;
    
    document.getElementById('kpi-week-sessions').textContent = weekSessions;
    document.getElementById('kpi-week-sessions-sub').textContent = `Objectif : 4 séances (${weekSessions >= 4 ? 'Atteint ! 🎉' : 'En cours'})`;
    
    // 4. Streak Calculation
    const streak = calculateStreak(activities);
    document.getElementById('kpi-streak').textContent = `${streak}j`;
    
    // Manage streak record in localstorage
    let record = localStorage.getItem('streak_record') || 0;
    if (streak > record) {
        record = streak;
        localStorage.setItem('streak_record', record);
    }
    document.getElementById('kpi-streak-sub').textContent = `Record : ${record} jours`;
}

// Calculate the current consecutive days streak
function calculateStreak(activities) {
    if (activities.length === 0) return 0;
    
    // Unique list of sorted active dates (YYYY-MM-DD) descending
    const activeDates = Array.from(new Set(activities.map(act => act.date))).sort((a, b) => new Date(b) - new Date(a));
    
    const todayStr = getLocalDateString(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    
    // If not active today and not active yesterday, streak is broken (0)
    if (!activeDates.includes(todayStr) && !activeDates.includes(yesterdayStr)) {
        return 0;
    }
    
    let streak = 0;
    let checkDate = new Date(activeDates.includes(todayStr) ? todayStr : yesterdayStr);
    
    while (true) {
        const checkStr = getLocalDateString(checkDate);
        if (activeDates.includes(checkStr)) {
            streak++;
            // Move to previous day
            checkDate.setDate(checkDate.getDate() - 1);
        } else {
            break;
        }
    }
    
    return streak;
}

// Helper: Format local date to YYYY-MM-DD
function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Calculate Weekly Goals Progress
function calculateWeeklyGoals(activities) {
    // Current week dates (Monday to Sunday)
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Find last Monday
    const monday = new Date(today);
    const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
    monday.setDate(today.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);
    
    // Filter activities done this week (since Monday)
    const weekActivities = activities.filter(act => {
        const actDate = new Date(act.date);
        return actDate >= monday;
    });
    
    // Goals definition: type -> target sessions
    const goals = {
        'Sport en chambre': { target: 2, barId: 'goal-sport-bar', progressId: 'goal-sport-progress' },
        'Étirements': { target: 3, barId: 'goal-stretch-bar', progressId: 'goal-stretch-progress' },
        'Course à pied': { target: 1, barId: 'goal-run-bar', progressId: 'goal-run-progress' }
    };
    
    // Compute and update each goal
    for (const [type, goal] of Object.entries(goals)) {
        const count = weekActivities.filter(act => act.type === type).length;
        const progressPercent = Math.min((count / goal.target) * 100, 100);
        
        // DOM update
        document.getElementById(goal.progressId).textContent = `${count}/${goal.target} session${goal.target > 1 ? 's' : ''}`;
        document.getElementById(goal.barId).style.width = `${progressPercent}%`;
        
        // Colors adaptation if goal is fully achieved
        const barElement = document.getElementById(goal.barId);
        if (progressPercent === 100) {
            barElement.style.background = 'linear-gradient(90deg, #10b981, #059669)'; // Green gradient
        } else {
            barElement.style.background = 'linear-gradient(90deg, #a38bf5, #7c5dfa)'; // Standard purple
        }
    }
}

// Render activity chart (Chart.js)
function renderChart(activities, days = 7) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    // Generate label dates and empty data object
    const chartLabels = [];
    const chartDataMap = {};
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getLocalDateString(d);
        
        // Formatting Label for user (e.g. "Lun 22" or "22/05")
        const labelFormat = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        chartLabels.push(labelFormat);
        chartDataMap[dateStr] = 0; // Initialize with 0 duration
    }
    
    // Fill active sessions duration
    activities.forEach(act => {
        if (chartDataMap.hasOwnProperty(act.date)) {
            chartDataMap[act.date] += act.duration;
        }
    });
    
    const chartData = Object.keys(chartDataMap).sort().map(key => chartDataMap[key]);
    
    // Create canvas gradient (mockup-style glowing under curve effect)
    let fillGradient = ctx.createLinearGradient(0, 0, 0, 260);
    fillGradient.addColorStop(0, 'rgba(163, 139, 245, 0.35)');
    fillGradient.addColorStop(0.5, 'rgba(163, 139, 245, 0.1)');
    fillGradient.addColorStop(1, 'rgba(163, 139, 245, 0.0)');
    
    // Clear previous chart if exists to avoid memory leak and hover glitch
    if (activityChart) {
        activityChart.destroy();
    }
    
    // Instantiate Chart.js
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Durée (minutes)',
                data: chartData,
                borderColor: '#a38bf5',
                borderWidth: 3,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#a38bf5',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.35, // Smooth spline
                fill: true,
                backgroundColor: fillGradient
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Hide legend to match reference mockup
                },
                tooltip: {
                    backgroundColor: '#18181d',
                    titleColor: '#ffffff',
                    bodyColor: '#a38bf5',
                    borderColor: '#26262f',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} min d'activité`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false // Hide grid vertical lines
                    },
                    ticks: {
                        color: '#9ea3ae',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: '#26262f',
                        drawTicks: false
                    },
                    border: {
                        dash: [5, 5] // Dashed horizontal grid lines like in the mockup
                    },
                    ticks: {
                        color: '#9ea3ae',
                        font: {
                            family: "'Inter', sans-serif",
                            size: 11
                        },
                        stepSize: 15
                    },
                    min: 0
                }
            }
        }
    });
}

// Handle period filter change (7j vs 30j)
function changeChartPeriod(days) {
    currentPeriod = days;
    
    // Toggle active CSS class
    const buttons = document.querySelectorAll('.chart-filter-btn');
    buttons.forEach(btn => {
        if (btn.textContent.includes(days.toString())) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderChart(activitiesData, currentPeriod);
}

// Toggle Add Modal Open
function openAddModal() {
    setDefaultDate();
    document.getElementById('activity-modal').classList.add('active');
}

// Toggle Add Modal Close
function closeAddModal() {
    document.getElementById('activity-modal').classList.remove('active');
    document.getElementById('activity-form').reset();
}

// Save activity via API (POST request)
async function saveActivity(event) {
    event.preventDefault();
    
    const type = document.getElementById('activity-type').value;
    const date = document.getElementById('activity-date').value;
    const duration = document.getElementById('activity-duration').value;
    const intensity = document.getElementById('activity-intensity').value;
    const notes = document.getElementById('activity-notes').value;
    
    const payload = { type, date, duration, intensity, notes };
    
    try {
        const response = await fetch('/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Erreur lors de l\'enregistrement');
        }
        
        closeAddModal();
        fetchActivities(); // Reload dashboard
        showToast('Séance enregistrée avec succès ! 💪', 'success');
        
    } catch (error) {
        console.error('Erreur sauvegarde activité :', error);
        showToast(error.message, 'error');
    }
}

// Delete activity via API (DELETE request)
async function deleteActivity(activityId) {
    if (!confirm('Es-tu sûr de vouloir supprimer cette séance ?')) return;
    
    try {
        const response = await fetch(`/api/activities/${activityId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Erreur lors de la suppression');
        
        fetchActivities(); // Reload dashboard
        showToast('Séance supprimée.', 'success');
        
    } catch (error) {
        console.error('Erreur suppression :', error);
        showToast('Impossible de supprimer la séance.', 'error');
    }
}

// Filter activities client-side with search bar
function filterActivities() {
    const query = document.getElementById('search-input').value.toLowerCase();
    
    if (!query) {
        renderTable(activitiesData);
        lucide.createIcons();
        return;
    }
    
    const filtered = activitiesData.filter(act => {
        const dateObj = new Date(act.date);
        const formattedDate = dateObj.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).toLowerCase();
        
        return act.type.toLowerCase().includes(query) ||
               act.notes.toLowerCase().includes(query) ||
               act.intensity.toLowerCase().includes(query) ||
               formattedDate.includes(query);
    });
    
    renderTable(filtered);
    lucide.createIcons();
}

// Export data to CSV file and trigger download
function exportCSV() {
    if (activitiesData.length === 0) {
        showToast('Aucune donnée à exporter.', 'error');
        return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // UTF-8 BOM
    csvContent += 'Date,Activite,Duree (min),Intensite,Notes\n';
    
    activitiesData.forEach(act => {
        // Sanitize notes for CSV format
        const notesSanitized = act.notes ? act.notes.replace(/"/g, '""') : '';
        csvContent += `"${act.date}","${act.type}",${act.duration},"${act.intensity}","${notesSanitized}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FitTrack_Export_${getLocalDateString(new Date())}.csv`);
    document.body.appendChild(link);
    
    link.click();
    document.body.removeChild(link);
    showToast('Fichier CSV exporté ! 📥', 'success');
}

// Minimal Toast notification utility
function showToast(message, type = 'success') {
    // Create toast element
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '13px';
    toast.style.fontWeight = '600';
    toast.style.color = '#ffffff';
    toast.style.zIndex = '9999';
    toast.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.3)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    
    if (type === 'success') {
        toast.style.backgroundColor = '#10b981'; // Green
    } else {
        toast.style.backgroundColor = '#ef4444'; // Red
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 100);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

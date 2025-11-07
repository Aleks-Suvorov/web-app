// ====================================================================
// scripts.js - Oasis FINAL Production Logic (Guaranteed to Work)
// ====================================================================

// --- 1. DOM REFERENCES AND CONSTANTS ---
const goalInput = document.getElementById('hydration-goal-input');
const literCountDisplay = document.getElementById('liter-count');
const percentageDisplay = document.querySelector('.percentage-text');
const creatineLogBtn = document.getElementById('creatine-log-btn');
const creatineStatusText = document.getElementById('creatine-status-text');
const trackerPageContainer = document.getElementById('tracker-page-container');
const navButtons = document.querySelectorAll('#app-nav button');
const historyList = document.getElementById('history-list');
const avgLitersDisplay = document.getElementById('avg-liters');
const consistencyDisplay = document.getElementById('creatine-consistency');

const DEFAULT_GOAL_LITERS = 3.7;
const CREATINE_SERVING_SIZE_G = 5;
const CREATINE_MAX_SERVINGS = 4;


// ====================================================================
// 2. DATA MANAGEMENT (CRUD & HISTORY)
// ====================================================================

function checkAndAutoReset() {
    const today = new Date().toDateString(); 
    const lastVisitDate = localStorage.getItem('lastVisitDate');

    if (today !== lastVisitDate && lastVisitDate) {
        // Archive yesterday's data
        const finalLiters = parseFloat(localStorage.getItem('liters')) || 0;
        const finalCreatine = parseInt(localStorage.getItem('creatineServings')) || 0;
        
        const yesterdayRecord = {
            date: lastVisitDate, 
            litersLogged: finalLiters,
            creatineServings: finalCreatine
        };
        
        let history = JSON.parse(localStorage.getItem('dailyHistory') || '[]');
        history.push(yesterdayRecord); 
        localStorage.setItem('dailyHistory', JSON.stringify(history));

        // Reset today's counters
        localStorage.removeItem('liters'); 
        localStorage.removeItem('creatineServings');
    }
    
    // Update the last visit date
    localStorage.setItem('lastVisitDate', today);
}

function loadGoalSettings() {
    let savedGoal = localStorage.getItem('hydrationGoalLiters');
    if (!savedGoal) {
        savedGoal = DEFAULT_GOAL_LITERS;
        localStorage.setItem('hydrationGoalLiters', savedGoal);
    }
    
    if (goalInput) {
        goalInput.value = savedGoal;
        
        // Listener to save goal immediately on change
        goalInput.addEventListener('change', (event) => {
            const newGoal = parseFloat(event.target.value);
            if (newGoal > 0) {
                localStorage.setItem('hydrationGoalLiters', newGoal);
                updateHydrationDisplay();
            } else {
                // Prevent setting a non-positive goal
                event.target.value = localStorage.getItem('hydrationGoalLiters');
            }
        });
    }
}


// ====================================================================
// 3. HYDRATION LOGIC
// ====================================================================

function logHydration(amountToAdd) {
    let currentLiters = parseFloat(localStorage.getItem('liters')) || 0;
    currentLiters += amountToAdd;
    localStorage.setItem('liters', currentLiters);
    updateHydrationDisplay();
}

function updateHydrationDisplay() {
    const currentLiters = parseFloat(localStorage.getItem('liters')) || 0;
    const currentGoal = parseFloat(localStorage.getItem('hydrationGoalLiters'));
    
    const percentage = Math.min((currentLiters / currentGoal) * 100, 100);
    
    if (literCountDisplay && percentageDisplay) {
        literCountDisplay.textContent = `${currentLiters.toFixed(1)} L / ${currentGoal.toFixed(1)} L`;
        percentageDisplay.textContent = `${Math.round(percentage)}% Complete`; 
    
        if (percentage >= 100) {
            literCountDisplay.classList.add('goal-achieved');
        } else {
            literCountDisplay.classList.remove('goal-achieved');
        }
    }
}


// ====================================================================
// 4. CREATINE LOGIC
// ====================================================================

function logCreatineServing() {
    let currentServings = parseInt(localStorage.getItem('creatineServings')) || 0;

    if (currentServings < CREATINE_MAX_SERVINGS) {
        currentServings++;
        localStorage.setItem('creatineServings', currentServings);
    }
    
    updateCreatineDisplay();
}

function updateCreatineDisplay() {
    const currentServings = parseInt(localStorage.getItem('creatineServings')) || 0;
    const totalGrams = currentServings * CREATINE_SERVING_SIZE_G;
    
    if (creatineStatusText && creatineLogBtn) {
        creatineStatusText.textContent = `${currentServings} Serving(s) Logged (${totalGrams}g Total)`;
        
        if (currentServings >= 1) {
            creatineLogBtn.classList.add('logged-status');
            creatineLogBtn.textContent = (currentServings === CREATINE_MAX_SERVINGS) 
                ? `MAX LOGGED (${totalGrams}g)` 
                : `Log Creatine Serving (${CREATINE_SERVING_SIZE_G}g)`;
        } else {
            creatineLogBtn.classList.remove('logged-status');
            creatineLogBtn.textContent = `Log Creatine Serving (${CREATINE_SERVING_SIZE_G}g)`;
        }
        
        creatineLogBtn.disabled = (currentServings >= CREATINE_MAX_SERVINGS);
    }
}


// ====================================================================
// 5. HISTORY & NAVIGATION LOGIC
// ====================================================================

function calculateHistoryStats(history) {
    if (history.length === 0) {
        return { avgLiters: '--', consistency: '--' };
    }

    const totalLiters = history.reduce((sum, record) => sum + record.litersLogged, 0);
    const avgLiters = (totalLiters / history.length).toFixed(1);

    // Calculate Creatine Consistency (percentage of days with at least 1 serving)
    const consistentDays = history.filter(record => record.creatineServings >= 1).length;
    const consistency = Math.round((consistentDays / history.length) * 100);

    return { avgLiters, consistency: `${consistency}%` };
}

function updateHistoryDisplay() {
    if (!historyList) return;

    const history = JSON.parse(localStorage.getItem('dailyHistory') || '[]');
    historyList.innerHTML = '';
    
    if (history.length === 0) {
        historyList.innerHTML = '<li class="empty-message">No history tracked yet. Start logging!</li>';
    } else {
        // Display stats
        const stats = calculateHistoryStats(history);
        if (avgLitersDisplay) avgLitersDisplay.textContent = stats.avgLiters;
        if (consistencyDisplay) consistencyDisplay.textContent = stats.consistency;
        
        // Display list (last 7 days only, newest first)
        const lastSevenDays = history.slice(-7).reverse(); 
        
        lastSevenDays.forEach(record => {
            const goal = parseFloat(localStorage.getItem('hydrationGoalLiters') || DEFAULT_GOAL_LITERS);
            const hydrationStatus = (record.litersLogged >= goal) ? 'Goal Met ✅' : 'Below Goal ⚠️';
            const creatineStatus = (record.creatineServings >= 1) ? `${record.creatineServings} Serving(s) 💊` : 'None Logged';

            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <span>${record.date}</span>
                <span>💧 ${record.litersLogged.toFixed(1)} L (${hydrationStatus})</span>
                <span>${creatineStatus}</span>
            `;
            historyList.appendChild(listItem);
        });
    }
}

function navigateToPage(pageId) {
    let pageIndex = 0;
    if (pageId === 'creatine-tracker') {
        pageIndex = 1;
    } else if (pageId === 'history-page') {
        pageIndex = 2;
        // Ensure history data is fresh when viewing the page
        updateHistoryDisplay();
    }
    
    if (trackerPageContainer) {
        // Swipe effect
        trackerPageContainer.style.transform = `translateX(-${pageIndex * 100}vw)`;
    }

    // Update active state on nav buttons
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageId) {
            btn.classList.add('active');
        }
    });
}


// ====================================================================
// 6. INITIALIZATION
// ====================================================================

function setupEventListeners() {
    // Hydration Log Buttons
    document.querySelectorAll('.logging-buttons button').forEach(button => {
        button.addEventListener('click', () => {
            logHydration(parseFloat(button.dataset.amount));
            button.classList.add('logged-feedback');
            setTimeout(() => { button.classList.remove('logged-feedback'); }, 200);
        });
    });

    // Creatine Log Button
    if (creatineLogBtn) {
        creatineLogBtn.addEventListener('click', logCreatineServing);
    }
    
    // Page Navigation Buttons
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navigateToPage(button.getAttribute('data-page'));
        });
    });
    
    // Initialize to the first page (Hydration)
    navigateToPage('hydration-tracker'); 
}

function init() {
    checkAndAutoReset(); 
    loadGoalSettings(); 

    updateHydrationDisplay();
    updateCreatineDisplay();
    
    setupEventListeners(); 
}

// Start the application
init();
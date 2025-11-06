/* scripts.js - robust navigation + logging (cleaned) */
(function () {
    const container = document.getElementById('tracker-page-container');
    const navButtons = Array.from(document.querySelectorAll('#app-nav .nav-btn'));
    const historyList = document.getElementById('history-list');
    const literCountEl = document.getElementById('liter-count');
    const goalInput = document.getElementById('hydration-goal-input');
    const loggingBtns = Array.from(document.querySelectorAll('.logging-buttons button'));
    const creatineBtn = document.getElementById('creatine-log-btn');

    if (!container || navButtons.length === 0) return;

    let currentIndex = 0;
    let totalLiters = 0;
    let goalLiters = parseFloat(goalInput?.value) || 2.0;
    let creatineLogged = false;

    function setTransform(index) {
        // defensive clamp
        index = Math.max(0, Math.min(2, index));
        currentIndex = index;
        container.style.transform = `translateX(-${index * 100}vw)`;
        navButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.index) === index));
    }

    // navigation clicks
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = Number(btn.dataset.index) || 0;
            setTransform(idx);
        });
    });

    // logging water
    loggingBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const add = parseFloat(btn.dataset.add) || 0;
            totalLiters = Math.round((totalLiters + add) * 100) / 100;
            updateDisplay();
            appendHistory(`+${add} L`, new Date());
        });
    });

    // creatine
    if (creatineBtn) {
        creatineBtn.addEventListener('click', () => {
            creatineLogged = !creatineLogged;
            creatineBtn.classList.toggle('logged-status', creatineLogged);
            appendHistory(creatineLogged ? 'Creatine logged' : 'Creatine removed', new Date());
        });
    }

    // update display and goal logic
    function updateDisplay() {
        if (literCountEl) literCountEl.textContent = `${totalLiters.toFixed(2)}L`;
        goalLiters = parseFloat(goalInput?.value) || goalLiters;
        if (totalLiters >= goalLiters && literCountEl) {
            literCountEl.classList.add('goal-achieved');
        } else {
            literCountEl.classList.remove('goal-achieved');
        }
    }

    // history helper (defensive)
    function appendHistory(text, date) {
        if (!historyList) return;
        const li = document.createElement('li');
        const time = date ? new Date(date).toLocaleString() : new Date().toLocaleString();
        li.textContent = `${text} — ${time}`;
        historyList.prepend(li);
        // keep only last 50 entries
        while (historyList.children.length > 50) historyList.removeChild(historyList.lastChild);
    }

    // preserve the correct transform on resize (vw changes)
    function handleResize() {
        setTransform(currentIndex);
    }
    window.addEventListener('resize', handleResize);

    // basic touch swipe handling
    (function addSwipe() {
        let startX = 0, currentX = 0, touching = false;
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            touching = true;
            startX = e.touches[0].clientX;
            container.style.transition = 'none';
        }, {passive: true});

        container.addEventListener('touchmove', (e) => {
            if (!touching) return;
            currentX = e.touches[0].clientX;
            const dx = currentX - startX;
            container.style.transform = `translateX(${ -currentIndex * window.innerWidth + dx }px)`;
        }, {passive: true});

        container.addEventListener('touchend', (e) => {
            if (!touching) return;
            touching = false;
            container.style.transition = '';
            const dx = currentX - startX;
            if (dx < -50 && currentIndex < 2) setTransform(currentIndex + 1);
            else if (dx > 50 && currentIndex > 0) setTransform(currentIndex - 1);
            else setTransform(currentIndex);
            startX = currentX = 0;
        });
    })();

    // initial setup
    setTransform(0);
    updateDisplay();
})();
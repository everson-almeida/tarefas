// Gerenciador de Armazenamento
const Storage = {
    safeParse: (key, defaultValue) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error(`Erro ao ler ${key}:`, e);
            return defaultValue;
        }
    },

    getProgress: () => Storage.safeParse('tasks_progress', {}),
    saveProgress: (progress) => localStorage.setItem('tasks_progress', JSON.stringify(progress)),

    getCurrentUser: () => localStorage.getItem('tasks_current_user'),
    setCurrentUser: (username) => {
        if (username) localStorage.setItem('tasks_current_user', username);
        else localStorage.removeItem('tasks_current_user');
    }
};

// Sistema de Notificações
const Notification = {
    show: (message, type = 'info') => {
        const area = document.getElementById('notification-area');
        if (!area) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = '';
        if (type === 'success') icon = '<span style="color:var(--success)">✓</span>';
        if (type === 'error') icon = '<span style="color:var(--danger)">✕</span>';

        toast.innerHTML = `${icon}<span>${message}</span>`;
        area.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s forwards';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }
};

// Sistema de Modais
const Modal = {
    confirm: (message, title = "Confirmar") => {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-confirm');
            if (!modal) {
                resolve(false);
                return;
            }

            const titleEl = document.getElementById('confirm-title');
            const messageEl = document.getElementById('confirm-message');
            const okBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');

            if (titleEl) titleEl.textContent = title;
            if (messageEl) messageEl.textContent = message;

            const handleOk = () => {
                modal.classList.remove('active');
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.remove('active');
                cleanup();
                resolve(false);
            };

            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
            };

            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            modal.classList.add('active');
        });
    }
};

// Aplicação Principal
const App = {
    currentUser: null,
    currentDateKey: new Date().toISOString().split('T')[0],
    appData: null,

    async init() {
        console.log("Inicializando App...");
        await this.loadAppData();
        this.bindEvents();
        this.checkAuth();
        this.updateDateDisplay();
    },

    async loadAppData() {
        try {
            const response = await fetch('tasks.json');
            this.appData = await response.json();
            console.log("Dados carregados:", this.appData);
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            Notification.show("Erro ao carregar dados do aplicativo.", "error");
        }
    },

    bindEvents() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());
    },

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
    },

    checkAuth() {
        const savedUser = Storage.getCurrentUser();

        if (savedUser && this.appData && this.appData.users) {
            const user = this.appData.users.find(u => u.username === savedUser);
            if (user) {
                this.currentUser = savedUser;
                this.applyTheme(user.theme);
                this.loadDashboard();
                return;
            }
        }

        Storage.setCurrentUser(null);
        this.showScreen('login-screen');
        document.body.className = '';
    },

    applyTheme(theme) {
        if (theme) {
            document.body.className = `theme-${theme}`;
        } else {
            document.body.className = '';
        }
    },

    async handleLogin(e) {
        e.preventDefault();

        const usernameInput = document.getElementById('login-username');
        const passwordInput = document.getElementById('login-password');

        const username = usernameInput.value.trim().toLowerCase();
        const password = passwordInput.value.trim();

        if (!this.appData || !this.appData.users) {
            Notification.show('Erro nos dados do sistema.', 'error');
            return;
        }

        const user = this.appData.users.find(u => u.username === username && u.password === password);

        if (user) {
            this.currentUser = username;
            Storage.setCurrentUser(username);

            this.applyTheme(user.theme);

            usernameInput.value = '';
            passwordInput.value = '';

            this.loadDashboard();
            Notification.show(`Olá, ${username.charAt(0).toUpperCase() + username.slice(1)}! ✨`, 'success');
        } else {
            Notification.show('Ops! Nome ou senha errados.', 'error');
        }
    },

    async handleLogout() {
        const confirmed = await Modal.confirm("Quer mesmo sair?");
        if (confirmed) {
            this.currentUser = null;
            Storage.setCurrentUser(null);
            this.showScreen('login-screen');
            document.body.className = '';
        }
    },

    loadDashboard() {
        const displayUser = document.getElementById('display-username');
        if (displayUser && this.currentUser) {
            displayUser.textContent = this.currentUser.charAt(0).toUpperCase() + this.currentUser.slice(1);
        }

        this.showScreen('dashboard-screen');
        this.renderTasks();
    },

    renderTasks() {
        const taskList = document.getElementById('task-list');
        if (!taskList || !this.appData) return;

        taskList.innerHTML = '';

        const userData = this.appData.users.find(u => u.username === this.currentUser);
        if (!userData || !userData.tasks) return;

        const userTasks = userData.tasks;
        const progress = Storage.getProgress();
        const progressKey = `${this.currentDateKey}_${this.currentUser}`;
        const completedTaskIds = progress[progressKey] || [];

        let completedCount = 0;

        userTasks.forEach(task => {
            const isCompleted = completedTaskIds.includes(task.id);
            if (isCompleted) completedCount++;

            const li = document.createElement('li');
            li.className = `task-item ${isCompleted ? 'completed' : ''}`;
            li.onclick = (e) => this.toggleTask(task.id, e);

            li.innerHTML = `
                <div class="task-checkbox"></div>
                <span class="task-text">${task.title}</span>
            `;
            taskList.appendChild(li);
        });

        // Atualizar barra de progresso
        const total = userTasks.length;
        const percentage = total === 0 ? 0 : (completedCount / total) * 100;

        const progressBar = document.getElementById('daily-progress');
        if (progressBar) progressBar.style.width = `${percentage}%`;

        const completedCountEl = document.getElementById('completed-count');
        if (completedCountEl) completedCountEl.textContent = completedCount;

        const totalCountEl = document.getElementById('total-count');
        if (totalCountEl) totalCountEl.textContent = total;
    },

    toggleTask(taskId, event) {
        const progress = Storage.getProgress();
        const progressKey = `${this.currentDateKey}_${this.currentUser}`;
        let completedIds = progress[progressKey] || [];

        const isCompleting = !completedIds.includes(taskId);

        if (completedIds.includes(taskId)) {
            completedIds = completedIds.filter(id => id !== taskId);
        } else {
            completedIds.push(taskId);
            this.playSuccessSound();
            if (event) {
                this.createConfetti(event.clientX, event.clientY);
            }
        }

        progress[progressKey] = completedIds;
        Storage.saveProgress(progress);
        this.renderTasks();

        // Verificar se completou todas
        if (isCompleting) {
            const userData = this.appData.users.find(u => u.username === this.currentUser);
            if (userData && userData.tasks) {
                const userTasks = userData.tasks;
                const total = userTasks.length;
                const activeCompletedCount = userTasks.filter(task => completedIds.includes(task.id)).length;

                if (activeCompletedCount === total && total > 0) {
                    this.showCelebrationAnimation();
                }
            }
        }
    },

    showCelebrationAnimation() {
        const overlay = document.getElementById('celebration-animation');
        if (overlay) {
            overlay.classList.add('active');
            this.playSuccessSound();
            setTimeout(() => this.playSuccessSound(), 300);
            setTimeout(() => this.playSuccessSound(), 600);

            setTimeout(() => {
                overlay.classList.remove('active');
            }, 2500);
        }
    },

    updateDateDisplay() {
        const dateEl = document.getElementById('current-date');
        if (!dateEl) return;

        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = new Date().toLocaleDateString('pt-BR', options);
        const formatted = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        dateEl.textContent = formatted;
    },

    playSuccessSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const audioContext = new AudioContext();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            console.log("Audio não suportado");
        }
    },

    createConfetti(x, y) {
        const colors = ['#ff69b4', '#ffb6c1', '#00D2D3', '#6C63FF', '#e6e6fa', '#ffd700'];
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');

            particle.style.left = `${x}px`;
            particle.style.top = `${y}px`;
            particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

            const size = Math.random() * 8 + 4;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;

            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 150 + 50;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;

            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);

            document.body.appendChild(particle);

            setTimeout(() => {
                particle.remove();
            }, 800);
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    try {
        App.init();
    } catch (e) {
        console.error("Erro fatal:", e);
        alert("Erro ao iniciar o aplicativo. Verifique o console.");
    }
});

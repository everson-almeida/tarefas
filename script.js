// Gerenciador de Armazenamento com Proteção de Erros
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

    getUsers: () => Storage.safeParse('tasks_users', []),
    saveUsers: (users) => localStorage.setItem('tasks_users', JSON.stringify(users)),

    getTasks: (username) => {
        const allTasks = Storage.safeParse('tasks_data', {});
        return allTasks[username] || [];
    },
    saveTasks: (username, tasks) => {
        const allTasks = Storage.safeParse('tasks_data', {});
        allTasks[username] = tasks;
        localStorage.setItem('tasks_data', JSON.stringify(allTasks));
    },

    getProgress: () => Storage.safeParse('tasks_progress', {}),
    saveProgress: (progress) => localStorage.setItem('tasks_progress', JSON.stringify(progress)),

    getCurrentUser: () => localStorage.getItem('tasks_current_user'),
    setCurrentUser: (username) => {
        if (username) localStorage.setItem('tasks_current_user', username);
        else localStorage.removeItem('tasks_current_user');
    }
};

// Custom Notification System
const Notification = {
    show: (message, type = 'info') => {
        const area = document.getElementById('notification-area');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Ícones baseados no tipo
        let icon = '';
        if (type === 'success') icon = '<span style="color:var(--success)">✓</span>';
        if (type === 'error') icon = '<span style="color:var(--danger)">✕</span>';

        toast.innerHTML = `${icon}<span>${message}</span>`;
        area.appendChild(toast);

        // Remover após 3 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOutToast 0.3s forwards';
            setTimeout(() => {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3000);
    }
};

// Custom Modal System (Mantido apenas para confirmações críticas)
const Modal = {
    confirm: (message, title = "Confirmar") => {
        return new Promise((resolve) => {
            const modal = document.getElementById('custom-confirm');
            document.getElementById('confirm-title').textContent = title;
            document.getElementById('confirm-message').textContent = message;

            const okBtn = document.getElementById('confirm-ok-btn');
            const cancelBtn = document.getElementById('confirm-cancel-btn');

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

// Lógica da Aplicação
const App = {
    currentUser: null,
    currentDateKey: new Date().toISOString().split('T')[0],
    defaultTasks: [],

    async init() {
        console.log("Inicializando App...");
        await this.loadDefaultTasks();
        this.bindEvents();
        this.checkAuth();
        this.updateDateDisplay();
    },

    async loadDefaultTasks() {
        try {
            const response = await fetch('tasks.json');
            const data = await response.json();
            this.defaultTasks = data.defaultTasks || [];
        } catch (error) {
            console.error("Erro ao carregar tarefas padrão:", error);
            this.defaultTasks = ["Tarefa 1", "Tarefa 2"];
        }
    },

    bindEvents() {
        // Navegação Login/Cadastro
        const btnGoRegister = document.getElementById('go-to-register');
        if (btnGoRegister) {
            btnGoRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showScreen('register-screen');
            });
        }

        const btnGoLogin = document.getElementById('go-to-login');
        if (btnGoLogin) {
            btnGoLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showScreen('login-screen');
            });
        }

        // Navegação Dashboard <-> Gerenciamento
        const btnManage = document.getElementById('manage-btn');
        if (btnManage) {
            btnManage.addEventListener('click', () => {
                this.showScreen('manage-tasks-screen');
                this.renderManageList();
            });
        }

        const btnBackDash = document.getElementById('back-to-dash-btn');
        if (btnBackDash) {
            btnBackDash.addEventListener('click', () => {
                this.showScreen('dashboard-screen');
                this.renderTasks();
            });
        }

        // Forms
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.addEventListener('submit', (e) => this.handleRegister(e));

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.handleLogout());

        // Adicionar Tarefa
        const newTaskForm = document.getElementById('new-task-form');
        if (newTaskForm) newTaskForm.addEventListener('submit', (e) => this.handleAddTask(e));
    },

    showScreen(screenId) {
        console.log("Navegando para:", screenId);
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const screen = document.getElementById(screenId);
        if (screen) screen.classList.add('active');
        else console.error("Tela não encontrada:", screenId);
    },

    checkAuth() {
        const savedUser = Storage.getCurrentUser();
        console.log("Usuário salvo:", savedUser);
        if (savedUser) {
            this.currentUser = savedUser;
            this.loadDashboard();
        } else {
            this.showScreen('login-screen');
        }
    },

    async handleRegister(e) {
        e.preventDefault();
        console.log("Tentando registrar...");

        try {
            const usernameInput = document.getElementById('register-username');
            const passwordInput = document.getElementById('register-password');

            if (!usernameInput || !passwordInput) return;

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            if (!username || !password) {
                Notification.show('Preencha todos os campos!', 'error');
                return;
            }

            const users = Storage.getUsers();
            if (users.find(u => u.username === username)) {
                Notification.show('Usuário já existe! Tente outro.', 'error');
                return;
            }

            // Criar usuário
            users.push({ username, password });
            Storage.saveUsers(users);

            // Inicializar tarefas padrão
            const initialTasks = this.defaultTasks.map((title, index) => ({
                id: Date.now() + index,
                title: title
            }));
            Storage.saveTasks(username, initialTasks);

            // Auto login
            this.currentUser = username;
            Storage.setCurrentUser(username);

            // Limpar form
            usernameInput.value = '';
            passwordInput.value = '';

            Notification.show(`Bem-vindo(a), ${username}!`, 'success');
            this.loadDashboard();

        } catch (error) {
            console.error("Erro no registro:", error);
            Notification.show("Erro ao criar conta.", 'error');
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        console.log("Tentando login...");

        try {
            const usernameInput = document.getElementById('login-username');
            const passwordInput = document.getElementById('login-password');

            const username = usernameInput.value.trim();
            const password = passwordInput.value.trim();

            const users = Storage.getUsers();
            const user = users.find(u => u.username === username && u.password === password);

            if (user) {
                this.currentUser = username;
                Storage.setCurrentUser(username);

                usernameInput.value = '';
                passwordInput.value = '';

                this.loadDashboard();
                Notification.show(`Olá de volta, ${username}!`, 'success');
            } else {
                Notification.show('Usuário ou senha incorretos.', 'error');
            }
        } catch (error) {
            console.error("Erro no login:", error);
            Notification.show("Erro ao fazer login.", 'error');
        }
    },

    async handleLogout() {
        const confirmed = await Modal.confirm("Deseja realmente sair?");
        if (confirmed) {
            this.currentUser = null;
            Storage.setCurrentUser(null);
            this.showScreen('login-screen');
        }
    },

    loadDashboard() {
        const displayUser = document.getElementById('display-username');
        if (displayUser) displayUser.textContent = this.currentUser;

        this.showScreen('dashboard-screen');
        this.renderTasks();
    },

    renderTasks() {
        const taskList = document.getElementById('task-list');
        if (!taskList) return;

        taskList.innerHTML = '';

        const userTasks = Storage.getTasks(this.currentUser);
        const progress = Storage.getProgress();
        const progressKey = `${this.currentDateKey}_${this.currentUser}`;
        const completedTaskIds = progress[progressKey] || [];

        let completedCount = 0;

        if (userTasks.length === 0) {
            taskList.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">Nenhuma tarefa cadastrada. Vá em gerenciar para adicionar!</p>';
        }

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

    renderManageList() {
        const list = document.getElementById('manage-task-list');
        if (!list) return;

        list.innerHTML = '';
        const userTasks = Storage.getTasks(this.currentUser);

        userTasks.forEach(task => {
            const li = document.createElement('li');
            li.className = 'manage-task-item';
            li.innerHTML = `
                <span>${task.title}</span>
                <button class="btn-delete" data-id="${task.id}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            // Adicionar evento no botão delete
            const btnDelete = li.querySelector('.btn-delete');
            btnDelete.onclick = (e) => {
                e.stopPropagation();
                App.deleteTask(task.id);
            };

            list.appendChild(li);
        });
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

        // Lógica de Animações
        if (isCompleting) {
            const userTasks = Storage.getTasks(this.currentUser);
            const total = userTasks.length;

            // Conta apenas tarefas que existem na lista atual E estão completas
            const activeCompletedCount = userTasks.filter(task => completedIds.includes(task.id)).length;

            if (activeCompletedCount === total && total > 0) {
                // Todas as tarefas completas!
                this.showCelebrationAnimation();
            }
        }
    },

    showCelebrationAnimation() {
        const overlay = document.getElementById('celebration-animation');
        if (overlay) {
            overlay.classList.add('active');
            // Tocar som mais longo ou repetido
            this.playSuccessSound();
            setTimeout(() => this.playSuccessSound(), 300);
            setTimeout(() => this.playSuccessSound(), 600);

            setTimeout(() => {
                overlay.classList.remove('active');
            }, 2500); // Mostra por 2.5 segundos
        }
    },

    async handleAddTask(e) {
        e.preventDefault();
        const titleInput = document.getElementById('new-task-title');
        const title = titleInput.value.trim();
        if (!title) return;

        const userTasks = Storage.getTasks(this.currentUser);
        userTasks.push({
            id: Date.now(),
            title: title
        });
        Storage.saveTasks(this.currentUser, userTasks);

        titleInput.value = '';
        this.renderManageList();
        Notification.show("Tarefa adicionada!", "success");
    },

    async deleteTask(taskId) {
        const confirmed = await Modal.confirm('Tem certeza que deseja remover esta tarefa?');
        if (!confirmed) return;

        let userTasks = Storage.getTasks(this.currentUser);
        userTasks = userTasks.filter(t => t.id !== taskId);
        Storage.saveTasks(this.currentUser, userTasks);
        this.renderManageList();
        Notification.show("Tarefa removida.", "info");
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
            console.log("Audio não suportado ou erro:", e);
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

// Inicializar com proteção
document.addEventListener('DOMContentLoaded', () => {
    try {
        App.init();
    } catch (e) {
        console.error("Erro fatal:", e);
        alert("Erro ao iniciar o aplicativo. Verifique o console.");
    }
});

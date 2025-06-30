// Função para obter a data no formato YYYY-MM-DD
function getCurrentDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Função para limpar estados de dias anteriores
function cleanupOldStates() {
  const currentDateKey = `tarefasState_${getCurrentDateString()}`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('tarefasState_') && key !== currentDateKey) {
      localStorage.removeItem(key);
    }
  }
}

// Função para salvar o estado das tarefas
function saveTasksState() {
  const dateKey = `tarefasState_${getCurrentDateString()}`;
  const completedItems = document.querySelectorAll('.todo-item.completed');
  const completedIds = Array.from(completedItems).map(item => parseInt(item.dataset.id, 10));
  localStorage.setItem(dateKey, JSON.stringify(completedIds));
}

// Função para verificar se é dia par ou ímpar (baseado no dia do mês)
function isDiaParDoMes() {
  const hoje = new Date();
  return hoje.getDate() % 2 === 0;
}

// Função para obter a data formatada
function getDataFormatada() {
  const hoje = new Date();
  const opcoes = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return hoje.toLocaleDateString('pt-BR', opcoes);
}

// Função para obter o dia da semana atual
function getDiaSemanaAtual() {
  const dias = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const hoje = new Date();
  return dias[hoje.getDay()];
}

// Função para verificar se uma tarefa deve ser exibida para uma pessoa específica
function deveExibirTarefa(tarefa, pessoa) {
  // 1. Filtra por pessoa
  if (tarefa.pessoa !== pessoa) return false;

  // 2. Filtra por paridade
  if (tarefa.paridade === 'par' && !isDiaParDoMes()) return false;
  if (tarefa.paridade === 'impar' && isDiaParDoMes()) return false;

  // 3. Filtra por dias da semana
  const diaAtual = getDiaSemanaAtual();
  if (tarefa.diasSemana && tarefa.diasSemana.length > 0) {
    if (!tarefa.diasSemana.includes(diaAtual)) {
      return false;
    }
  }

  return true;
}

// Função para carregar as tarefas do arquivo JSON
async function carregarTarefas() {
  try {
    const response = await fetch('tarefas.json');
    const data = await response.json();
    let tarefas = data.tarefas || [];

    // Carregar estado salvo
    const dateKey = `tarefasState_${getCurrentDateString()}`;
    const savedState = localStorage.getItem(dateKey);
    const completedIds = savedState ? JSON.parse(savedState) : [];

    // Aplicar estado salvo
    if (completedIds.length > 0) {
      tarefas = tarefas.map(tarefa => {
        if (completedIds.includes(tarefa.id)) {
          return { ...tarefa, completa: true };
        }
        return tarefa;
      });
    }

    return tarefas;
  } catch (error) {
    console.error('Erro ao carregar tarefas:', error);
    return [];
  }
}

// Função para criar um elemento de tarefa
function criarElementoTarefa(tarefa, tipoColuna) {
  const li = document.createElement('li');
  li.className = `todo-item ${tipoColuna}`;
  li.dataset.id = tarefa.id;
  
  if (tarefa.completa) {
    li.classList.add('completed');
  }
  
  li.innerHTML = `
    <span>${tarefa.titulo}</span>
    <input type="checkbox" onclick="toggleComplete(this)" ${tarefa.completa ? 'checked' : ''} />
  `;
  
  return li;
}

// Função para filtrar tarefas por pessoa
function filtrarTarefasPorPessoa(tarefas, pessoa) {
  return tarefas.filter(tarefa => deveExibirTarefa(tarefa, pessoa));
}

// Função para renderizar tarefas de uma coluna específica
function renderizarColuna(tarefas, colunaId, tipoColuna) {
  const coluna = document.getElementById(colunaId);
  
  // Limpar a coluna atual
  coluna.innerHTML = '';
  
  // Filtrar tarefas para esta coluna
  const tarefasFiltradas = filtrarTarefasPorPessoa(tarefas, tipoColuna);
  
  if (tarefasFiltradas.length === 0) {
    coluna.innerHTML = '<li style="text-align: center; color: #666; font-style: italic;">Nenhuma tarefa para hoje!</li>';
    return;
  }
  
  // Adicionar cada tarefa
  tarefasFiltradas.forEach(tarefa => {
    const elemento = criarElementoTarefa(tarefa, tipoColuna);
    coluna.appendChild(elemento);
  });
}

// Função para renderizar todas as colunas
async function renderizarTarefas() {
  const tarefas = await carregarTarefas();
  
  // Renderizar coluna Isabela
  renderizarColuna(tarefas, 'colunaIsabela', 'isabela');
  
  // Renderizar coluna Rafaela
  renderizarColuna(tarefas, 'colunaRafaela', 'rafaela');
  
  // Atualizar título com a data
  atualizarTituloComData();
}

// Função para atualizar o título com a data
function atualizarTituloComData() {
  const titulo = document.querySelector('#mainScreen h1');
  const dataFormatada = getDataFormatada();
  titulo.innerHTML = `Tarefas<br><small>${dataFormatada}</small>`;
}

// Função para mostrar a tela principal
function mostrarTelaPrincipal() {
  const splashScreen = document.getElementById('splashScreen');
  const mainScreen = document.getElementById('mainScreen');
  
  // Fade out da splash screen
  splashScreen.style.animation = 'fadeOut 0.5s ease-out forwards';
  
  setTimeout(() => {
    splashScreen.style.display = 'none';
    mainScreen.style.display = 'block';
    
    // Carregar e renderizar as tarefas
    renderizarTarefas();
  }, 500);
}

// Função para criar efeito de partículas
function criarEfeitoParticulas(elemento) {
  const rect = elemento.getBoundingClientRect();
  const cores = ['#ff69b4', '#ffb6c1', '#ffc0cb', '#ff1493', '#ff69b4', '#e6e6fa', '#9370db', '#8a2be2'];
  
  for (let i = 0; i < 12; i++) {
    const particula = document.createElement('div');
    const x = Math.random() * 200 - 100;
    const y = Math.random() * 200 - 100;
    const duracao = 0.8 + Math.random() * 0.6;
    
    particula.style.position = 'fixed';
    particula.style.left = rect.left + rect.width / 2 + 'px';
    particula.style.top = rect.top + rect.height / 2 + 'px';
    particula.style.width = '6px';
    particula.style.height = '6px';
    particula.style.backgroundColor = cores[Math.floor(Math.random() * cores.length)];
    particula.style.borderRadius = '50%';
    particula.style.pointerEvents = 'none';
    particula.style.zIndex = '1000';
    particula.style.setProperty('--x', x + 'px');
    particula.style.setProperty('--y', y + 'px');
    particula.style.animation = `particula ${duracao}s ease-out forwards`;
    
    document.body.appendChild(particula);
    
    // Remover partícula após animação
    setTimeout(() => {
      if (particula.parentNode) {
        particula.parentNode.removeChild(particula);
      }
    }, duracao * 1000 + 200);
  }
}

// Função para alternar o status de uma tarefa
function toggleComplete(checkbox) {
  const todoItem = checkbox.parentElement;
  const isCompleting = checkbox.checked;
  
  if (isCompleting) {
    // Adicionar classe com animação
    todoItem.classList.add("completed");
    
    // Criar efeito de partículas
    setTimeout(() => {
      criarEfeitoParticulas(todoItem);
    }, 100);
    
    // Adicionar som de sucesso (se disponível)
    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        audio.volume = 0.3;
        audio.play().catch(() => {});
      } catch (e) {}
    }
    
    // Mostrar mensagem de sucesso
    setTimeout(() => {
      mostrarMensagemSucesso(todoItem);
    }, 300);
    
  } else {
    // Remover classe
    todoItem.classList.remove("completed");
  }

  // Salvar o novo estado
  saveTasksState();
}

// Função para mostrar mensagem de sucesso
function mostrarMensagemSucesso(elemento) {
  const mensagem = document.createElement('div');
  mensagem.textContent = 'Parabéns! 🎉';
  mensagem.style.position = 'absolute';
  mensagem.style.top = '-35px';
  mensagem.style.left = '50%';
  mensagem.style.transform = 'translateX(-50%)';
  mensagem.style.backgroundColor = '#4CAF50';
  mensagem.style.color = 'white';
  mensagem.style.padding = '6px 12px';
  mensagem.style.borderRadius = '15px';
  mensagem.style.fontSize = '12px';
  mensagem.style.fontWeight = 'bold';
  mensagem.style.zIndex = '1001';
  mensagem.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
  mensagem.style.animation = 'mensagemSucesso 2s ease-out forwards';
  
  elemento.style.position = 'relative';
  elemento.appendChild(mensagem);
  
  // Remover mensagem após animação
  setTimeout(() => {
    if (mensagem.parentNode) {
      mensagem.parentNode.removeChild(mensagem);
    }
  }, 2000);
}

// Adicionar animação de fade out para a splash screen
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', () => {
  // Limpar estados de dias anteriores
  cleanupOldStates();
  
  // Mostrar splash screen por 3 segundos
  setTimeout(() => {
    mostrarTelaPrincipal();
  }, 3000);
}); 
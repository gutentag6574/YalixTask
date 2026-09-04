const form = document.getElementById('taskForm');
const formTitle = document.getElementById('formTitle');
const createBtn = document.getElementById('createBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const dateInput = document.getElementById('dueDate');
const timeInput = document.getElementById('dueTime');
const prioritySelect = document.getElementById('taskPriority');
const statusSelect = document.getElementById('taskStatus');
const list = document.getElementById('tasks');
const tasksCounter = document.getElementById('tasksCounter');
const tasksLoading = document.getElementById('tasksLoading');
const tasksEmpty = document.getElementById('tasksEmpty');
const tasksError = document.getElementById('tasksError');

const modal = document.getElementById('taskModal');
const modalTitle = document.getElementById('modalTitle');
const modalMeta = document.getElementById('modalMeta');
const modalDescription = document.getElementById('modalDescription');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');
const editTaskBtn = document.getElementById('editTaskBtn');
const closeModalBtns = [document.getElementById('closeModalBtn'), document.getElementById('cancelModalBtn')];

const headerLoginLink = document.getElementById('headerLoginLink');
const logoutBtn = document.getElementById('logoutBtn');

let allTasks = [];
let activeTask = null;
let editingTaskId = null;

// Инициализация состояния авторизации в шапке
function initAuthHeader() {
  const token = sessionStorage.getItem('yalix_token') || localStorage.getItem('yalix_token');
  const isAuth = Boolean(token);
  if (headerLoginLink) headerLoginLink.classList.toggle('hidden', isAuth);
  if (logoutBtn) logoutBtn.classList.toggle('hidden', !isAuth);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('yalix_token');
    sessionStorage.removeItem('yalix_user');
    localStorage.removeItem('yalix_token');
    localStorage.removeItem('yalix_user');
    window.location.href = 'login.html';
  });
}

function resetFormMode() {
  editingTaskId = null;
  formTitle.textContent = 'Создать задачу';
  createBtn.textContent = 'Создать задачу';
  if (cancelEditBtn) cancelEditBtn.classList.add('hidden');
  form.reset();
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  activeTask = null;
  document.body.classList.remove('modal-open');
}

function formatDeadline(isoString) {
  if (!isoString) return 'Без срока';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Без срока';

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function getPriorityBadge(priorityId) {
  switch (Number(priorityId)) {
    case 3:
      return '<span class="task-badge badge-priority-high">Высокий</span>';
    case 2:
      return '<span class="task-badge badge-priority-med">Средний</span>';
    default:
      return '<span class="task-badge badge-priority-low">Обычный</span>';
  }
}

function getStatusBadge(statusId) {
  switch (Number(statusId)) {
    case 3:
      return '<span class="task-badge badge-priority-low">Выполнено</span>';
    case 2:
      return '<span class="task-badge badge-priority-med">В работе</span>';
    default:
      return '<span class="task-badge badge-status">To Do</span>';
  }
}

function renderTaskList() {
  list.innerHTML = '';

  if (tasksCounter) {
    tasksCounter.textContent = `Всего: ${allTasks.length}`;
  }

  if (!allTasks.length) {
    if (tasksEmpty) tasksEmpty.classList.remove('hidden');
    return;
  }

  if (tasksEmpty) tasksEmpty.classList.add('hidden');

  allTasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'task-card';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');

    const formattedDate = formatDeadline(task.deadline);
    const priorityBadge = getPriorityBadge(task.priority_id);
    const statusBadge = getStatusBadge(task.status_id);

    li.innerHTML = `
      <div class="task-card-header">
        <span class="task-card-title">${escapeHtml(task.name || 'Без названия')}</span>
        <div style="display:flex; gap:6px; align-items:center;">
          ${priorityBadge}
          ${statusBadge}
        </div>
      </div>
      <div class="task-card-meta">
        <span>⏰ ${formattedDate}</span>
      </div>
      ${task.description ? `<div class="task-card-desc">${escapeHtml(task.description)}</div>` : ''}
    `;

    li.addEventListener('click', () => openModal(task));
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal(task);
      }
    });

    list.appendChild(li);
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openModal(task) {
  activeTask = task;
  modalTitle.textContent = task.name || 'Без названия';
  
  const formattedDate = formatDeadline(task.deadline);
  modalMeta.innerHTML = `
    <span>Срок: <strong>${formattedDate}</strong></span>
    &nbsp;•&nbsp;
    ${getPriorityBadge(task.priority_id)}
    &nbsp;•&nbsp;
    ${getStatusBadge(task.status_id)}
  `;
  
  modalDescription.textContent = task.description || 'Описание отсутствует.';

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

async function loadTasks() {
  if (tasksLoading) tasksLoading.classList.remove('hidden');
  if (tasksError) tasksError.classList.add('hidden');
  if (tasksEmpty) tasksEmpty.classList.add('hidden');

  try {
    const data = await apiRequest('/tasks', { method: 'GET' });
    const tasks = Array.isArray(data) ? data : (data && Array.isArray(data.tasks) ? data.tasks : []);
    allTasks = tasks;
    renderTaskList();
  } catch (error) {
    console.error('Ошибка загрузки задач:', error);
    if (tasksError) {
      tasksError.textContent = `Не удалось загрузить задачи с сервера. ${error.serverMessage || error.message || ''}`;
      tasksError.classList.remove('hidden');
    }
  } finally {
    if (tasksLoading) tasksLoading.classList.add('hidden');
  }
}

// Отправка формы создания / редактирования
form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const description = descriptionInput.value.trim();
  const dueDate = dateInput.value;
  const dueTime = timeInput.value || '18:00';
  const priorityId = prioritySelect ? parseInt(prioritySelect.value, 10) : 1;
  const statusId = statusSelect ? parseInt(statusSelect.value, 10) : 1;

  if (!title) {
    titleInput.classList.add('error');
    titleInput.focus();
    return;
  }
  titleInput.classList.remove('error');

  // Формируем строгий ISO 8601 (RFC3339) для бэкенда Go
  let deadlineIso;
  if (dueDate) {
    const localDateTime = new Date(`${dueDate}T${dueTime}:00`);
    deadlineIso = !isNaN(localDateTime.getTime()) ? localDateTime.toISOString() : new Date().toISOString();
  } else {
    deadlineIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  }

  const payload = {
    name: title,
    description,
    deadline: deadlineIso,
    created_at: new Date().toISOString(),
    status_id: statusId,
    priority_id: priorityId,
    team_id: null
  };

  createBtn.disabled = true;

  try {
    if (editingTaskId !== null) {
      // Обновление существующей задачи
      await apiRequest(`/tasks?id=${editingTaskId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      alert('Задача успешно обновлена!');
    } else {
      // Создание новой задачи
      await apiRequest('/tasks', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    }

    resetFormMode();
    await loadTasks();
  } catch (error) {
    console.error('Task save error:', error);
    alert(`Ошибка сохранения задачи: ${error.serverMessage || error.message || 'ошибка сервера'}`);
  } finally {
    createBtn.disabled = false;
  }
});

// Кнопка отмены редактирования
if (cancelEditBtn) {
  cancelEditBtn.addEventListener('click', resetFormMode);
}

// Закрытие модального окна
closeModalBtns.forEach((btn) => btn?.addEventListener('click', closeModal));

modal?.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.classList.contains('open')) {
    closeModal();
  }
});

// Кнопка редактирования в модальном окне
editTaskBtn?.addEventListener('click', () => {
  if (!activeTask) return;

  editingTaskId = activeTask.id;
  formTitle.textContent = 'Редактировать задачу';
  createBtn.textContent = 'Сохранить изменения';
  if (cancelEditBtn) cancelEditBtn.classList.remove('hidden');

  titleInput.value = activeTask.name || '';
  descriptionInput.value = activeTask.description || '';

  if (activeTask.deadline) {
    const d = new Date(activeTask.deadline);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateInput.value = `${yyyy}-${mm}-${dd}`;

      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      timeInput.value = `${hh}:${min}`;
    }
  }

  if (prioritySelect && activeTask.priority_id) {
    prioritySelect.value = String(activeTask.priority_id);
  }
  if (statusSelect && activeTask.status_id) {
    statusSelect.value = String(activeTask.status_id);
  }

  closeModal();
  titleInput.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Кнопка удаления в модальном окне
deleteTaskBtn?.addEventListener('click', async () => {
  if (!activeTask || !activeTask.id) return;

  const confirmed = window.confirm(`Удалить задачу "${activeTask.name}"?`);
  if (!confirmed) return;

  try {
    await apiRequest(`/tasks?id=${activeTask.id}`, { method: 'DELETE' });
    closeModal();
    await loadTasks();
  } catch (error) {
    console.error('Task deletion error:', error);
    alert(`Не удалось удалить задачу: ${error.serverMessage || error.message || 'ошибка сервера'}`);
  }
});

// Инициализация при загрузке страницы
initAuthHeader();
loadTasks();

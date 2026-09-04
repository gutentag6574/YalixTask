const monthTabBtn = document.getElementById('monthTabBtn');
const weekTabBtn = document.getElementById('weekTabBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const todayBtn = document.getElementById('todayBtn');
const monthSelect = document.getElementById('monthSelect');
const yearSelect = document.getElementById('yearSelect');
const calendarTitle = document.getElementById('calendarTitle');
const calendarView = document.getElementById('calendarView');
const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');
const eventStartDateInput = document.getElementById('eventStartDate');
const eventEndDateInput = document.getElementById('eventEndDate');
const eventStartTimeInput = document.getElementById('eventStartTime');
const eventTextInput = document.getElementById('eventText');
const eventModalTitle = document.getElementById('eventModalTitle');
const taskList = document.getElementById('taskList');
const closeEventModal = document.getElementById('closeEventModal');
const cancelEventModal = document.getElementById('cancelEventModal');

const today = new Date();
let currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
let viewMode = 'month';
let selectedEventDate = null;
let isLoadingTasks = true;
const eventMap = new Map();

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatMonthTitle(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function formatWeekTitle(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const startLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(start);
  const endLabel = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(end);
  return `${startLabel} – ${endLabel}`;
}

function getStartOfWeek(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function syncMonthSelect() {
  if (!monthSelect || !yearSelect) return;

  monthSelect.value = String(currentDate.getMonth());
  yearSelect.value = String(currentDate.getFullYear());
}

function populateSelectors() {
  if (!monthSelect || !yearSelect) return;

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  monthSelect.innerHTML = monthNames.map((name, index) => `<option value="${index}">${name}</option>`).join('');

  const startYear = 2020;
  const endYear = 2035;
  const years = [];
  for (let year = startYear; year <= endYear; year += 1) {
    years.push(`<option value="${year}">${year}</option>`);
  }
  yearSelect.innerHTML = years.join('');

  syncMonthSelect();
}

function setActiveTab() {
  const monthActive = viewMode === 'month';
  monthTabBtn?.classList.toggle('active', monthActive);
  weekTabBtn?.classList.toggle('active', !monthActive);

  monthTabBtn?.classList.toggle('signup-btn', monthActive);
  monthTabBtn?.classList.toggle('login-btn', !monthActive);
  weekTabBtn?.classList.toggle('signup-btn', !monthActive);
  weekTabBtn?.classList.toggle('login-btn', monthActive);
}

function normalizeTaskList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    return [{ id: Date.now(), title: value, startDate: value, endDate: value, startTime: '09:00' }];
  }
  return [];
}

function normalizeTask(task) {
  const deadline = typeof task.deadline === 'string' ? new Date(task.deadline) : null;
  const validDeadline = deadline && !Number.isNaN(deadline.getTime()) ? deadline : null;
  const deadlineDate = validDeadline ? dateKey(deadline) : '';

  return {
    ...task,
    id: task.id,
    title: task.name || task.title || 'Без названия',
    startDate: deadlineDate,
    endDate: deadlineDate,
    startTime: validDeadline
      ? `${String(validDeadline.getHours()).padStart(2, '0')}:${String(validDeadline.getMinutes()).padStart(2, '0')}`
      : '09:00'
  };
}

async function loadTasks() {
  if (typeof apiRequest !== 'function') {
    isLoadingTasks = false;
    render();
    return;
  }

  try {
    const data = await apiRequest('/tasks', { method: 'GET' });
    const tasks = Array.isArray(data) ? data : (data && Array.isArray(data.tasks) ? data.tasks : []);
    eventMap.clear();
    tasks.map(normalizeTask).forEach((task) => {
      if (!task.startDate) return;
      const existing = eventMap.get(task.startDate) || [];
      existing.push(task);
      eventMap.set(task.startDate, existing);
    });
  } catch (error) {
    console.error('Tasks loading error:', error);
  } finally {
    isLoadingTasks = false;
    render();
  }
}

function getTasksForDate(date) {
  const key = dateKey(date);
  return normalizeTaskList(eventMap.get(key));
}

function sortTasksByTime(tasks) {
  return [...tasks].sort((firstTask, secondTask) => {
    const firstDate = new Date(`${firstTask.startDate || dateKey(selectedEventDate)}T${firstTask.startTime || '00:00'}`);
    const secondDate = new Date(`${secondTask.startDate || dateKey(selectedEventDate)}T${secondTask.startTime || '00:00'}`);
    return firstDate - secondDate;
  });
}

function renderTaskListForSelectedDate() {
  if (!selectedEventDate || !taskList) return;

  const tasks = sortTasksByTime(getTasksForDate(selectedEventDate));
  taskList.innerHTML = '';

  if (isLoadingTasks) {
    const loadingState = document.createElement('div');
    loadingState.className = 'task-list-empty';
    loadingState.textContent = 'Загрузка задач...';
    taskList.appendChild(loadingState);
    return;
  }

  if (!tasks.length) {
    const emptyState = document.createElement('div');
    emptyState.className = 'task-list-empty';
    emptyState.textContent = 'Задач пока нет';
    taskList.appendChild(emptyState);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement('div');
    item.className = 'task-item';

    const info = document.createElement('div');
    info.className = 'task-item-info';

    const title = document.createElement('strong');
    title.textContent = task.title;

    const meta = document.createElement('span');
    meta.textContent = `${task.startDate || dateKey(selectedEventDate)} • ${task.startTime || '09:00'}`;

    info.appendChild(title);
    info.appendChild(meta);

    item.appendChild(info);
    taskList.appendChild(item);
  });
}

async function addEventForDate(date, eventText, startDate, endDate, startTime) {
  const key = dateKey(date);
  const title = eventText && eventText.trim();
  if (!title) return;

  const rawDateStr = `${endDate || startDate || key}T${startTime || '09:00'}:00`;
  const parsedDate = new Date(rawDateStr);
  const deadline = !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();

  const savedTask = await apiRequest('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      name: title,
      created_at: new Date().toISOString(),
      deadline,
      description: '',
      team_id: null,
      status_id: 1,
      priority_id: 1
    })
  });

  const task = normalizeTask(savedTask && savedTask.id ? savedTask : {
    id: Date.now(),
    name: title,
    deadline
  });
  const taskKey = task.startDate || key;
  const tasks = getTasksForDate(new Date(`${taskKey}T00:00:00`));
  tasks.push(task);
  eventMap.set(taskKey, tasks);
  render();
  renderTaskListForSelectedDate();
}

function openEventModal(date) {
  if (!eventModal || !eventStartDateInput || !eventEndDateInput || !eventStartTimeInput || !eventTextInput) return;

  selectedEventDate = date;
  const isoDate = dateKey(date);
  eventStartDateInput.value = isoDate;
  eventEndDateInput.value = isoDate;
  eventStartTimeInput.value = '09:00';
  eventTextInput.value = '';
  if (eventModalTitle) {
    eventModalTitle.textContent = `Задачи на ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)}`;
  }
  renderTaskListForSelectedDate();
  eventModal.classList.remove('hidden');
  eventModal.setAttribute('aria-hidden', 'false');
  eventTextInput.focus();
}

function closeEventModalDialog() {
  if (!eventModal) return;
  eventModal.classList.add('hidden');
  eventModal.setAttribute('aria-hidden', 'true');
  selectedEventDate = null;
  eventForm?.reset();
}

function handleDayClick(date) {
  openEventModal(date);
}

function renderMonthView() {
  if (!calendarView) return;

  calendarView.innerHTML = '';
  calendarView.className = 'calendar-view calendar-month-view';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const totalCells = 42;

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  weekdays.forEach((day) => {
    const header = document.createElement('div');
    header.className = 'calendar-weekday';
    header.textContent = day;
    calendarView.appendChild(header);
  });

  for (let i = 0; i < totalCells; i += 1) {
    const cellDate = new Date(year, month, i - firstWeekday + 1);
    const isCurrentMonth = cellDate.getMonth() === month;
    const isToday = dateKey(cellDate) === dateKey(today);

    const dayCell = document.createElement('button');
    dayCell.type = 'button';
    dayCell.className = 'calendar-day large';

    if (!isCurrentMonth) {
      dayCell.classList.add('muted');
    }
    if (isToday) {
      dayCell.classList.add('today');
    }

    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = String(cellDate.getDate());
    dayCell.appendChild(dayNumber);

    const tasks = getTasksForDate(cellDate);
    if (tasks.length > 0) {
      tasks.slice(0, 2).forEach((task) => {
        const badge = document.createElement('span');
        badge.className = 'day-event';
        badge.textContent = task.startTime ? `${task.startTime} • ${task.title}` : task.title;
        dayCell.appendChild(badge);
      });

      if (tasks.length > 2) {
        const more = document.createElement('span');
        more.className = 'day-more';
        more.textContent = `+${tasks.length - 2}`;
        dayCell.appendChild(more);
      }
    }

    dayCell.addEventListener('click', () => handleDayClick(cellDate));
    calendarView.appendChild(dayCell);
  }
}

function renderWeekView() {
  if (!calendarView) return;

  calendarView.innerHTML = '';
  calendarView.className = 'calendar-view calendar-week-view';

  const startOfWeek = getStartOfWeek(currentDate);

  for (let i = 0; i < 7; i += 1) {
    const cellDate = new Date(startOfWeek);
    cellDate.setDate(startOfWeek.getDate() + i);

    const dayCard = document.createElement('button');
    dayCard.type = 'button';
    dayCard.className = 'calendar-day week-card';

    if (dateKey(cellDate) === dateKey(today)) {
      dayCard.classList.add('today');
    }

    const header = document.createElement('div');
    header.className = 'day-header';

    const dayName = document.createElement('span');
    dayName.className = 'day-name';
    dayName.textContent = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(cellDate);

    const dayNum = document.createElement('span');
    dayNum.className = 'day-number';
    dayNum.textContent = String(cellDate.getDate());

    header.appendChild(dayName);
    header.appendChild(dayNum);
    dayCard.appendChild(header);

    const tasks = getTasksForDate(cellDate);
    if (tasks.length > 0) {
      tasks.slice(0, 2).forEach((task) => {
        const event = document.createElement('span');
        event.className = 'day-event';
        const label = task.startTime ? `${task.startTime} • ${task.title}` : task.title;
        event.textContent = label;
        dayCard.appendChild(event);
      });

      if (tasks.length > 2) {
        const more = document.createElement('span');
        more.className = 'day-more';
        more.textContent = `+${tasks.length - 2}`;
        dayCard.appendChild(more);
      }
    } else {
      const free = document.createElement('span');
      free.className = 'day-empty';
      free.textContent = 'Свободно';
      dayCard.appendChild(free);
    }

    dayCard.addEventListener('click', () => handleDayClick(cellDate));
    calendarView.appendChild(dayCard);
  }
}

function render() {
  syncMonthSelect();

  if (viewMode === 'month') {
    calendarTitle.textContent = formatMonthTitle(currentDate);
    renderMonthView();
  } else {
    calendarTitle.textContent = formatWeekTitle(currentDate);
    renderWeekView();
  }
  setActiveTab();
}

monthTabBtn?.addEventListener('click', () => {
  viewMode = 'month';
  render();
});

weekTabBtn?.addEventListener('click', () => {
  viewMode = 'week';
  render();
});

prevBtn?.addEventListener('click', () => {
  if (viewMode === 'month') {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  } else {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 7);
  }
  render();
});

nextBtn?.addEventListener('click', () => {
  if (viewMode === 'month') {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  } else {
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 7);
  }
  render();
});

monthSelect?.addEventListener('change', (event) => {
  currentDate = new Date(currentDate.getFullYear(), Number(event.target.value), 1);
  render();
});

yearSelect?.addEventListener('change', (event) => {
  currentDate = new Date(Number(event.target.value), currentDate.getMonth(), 1);
  render();
});

todayBtn?.addEventListener('click', () => {
  currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  render();
});

closeEventModal?.addEventListener('click', closeEventModalDialog);
cancelEventModal?.addEventListener('click', closeEventModalDialog);

eventModal?.addEventListener('click', (event) => {
  if (event.target instanceof HTMLElement && event.target.dataset.closeModal === 'true') {
    closeEventModalDialog();
  }
});

eventForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!selectedEventDate) return;

  const trimmedValue = eventTextInput?.value.trim();
  const startDate = eventStartDateInput?.value || dateKey(selectedEventDate);
  const endDate = eventEndDateInput?.value || startDate;
  const startTime = eventStartTimeInput?.value || '09:00';

  if (!trimmedValue) {
    eventTextInput?.focus();
    return;
  }

  if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
    alert('Дата окончания не может быть раньше даты начала.');
    return;
  }

  try {
    await addEventForDate(selectedEventDate, trimmedValue, startDate, endDate, startTime);
    eventForm.reset();
    eventStartDateInput.value = dateKey(selectedEventDate);
    eventEndDateInput.value = dateKey(selectedEventDate);
    eventStartTimeInput.value = '09:00';
    eventTextInput.focus();
  } catch (error) {
    console.error('Task creation error:', error);
    alert(`Не удалось сохранить задачу: ${error.message || 'ошибка сервера'}`);
  }
});

populateSelectors();
render();
loadTasks();

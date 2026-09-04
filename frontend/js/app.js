const profileName = document.getElementById('profileName');
const profileLogin = document.getElementById('profileLogin');
const profileEmail = document.getElementById('profileEmail');
const profileAvatar = document.getElementById('profileAvatar');
const profileRole = document.getElementById('profileRole');
const profileStatus = document.getElementById('profileStatus');
const profileStatusText = document.getElementById('profileStatusText');
const taskCount = document.getElementById('taskCount');
const headerLoginLink = document.getElementById('headerLoginLink');
const logoutBtn = document.getElementById('logoutBtn');

function readStoredUser() {
  const rawUser = sessionStorage.getItem('yalix_user') || localStorage.getItem('yalix_user');
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch (error) {
    console.error('Stored user parsing error:', error);
    return null;
  }
}

const storedToken = sessionStorage.getItem('yalix_token') || localStorage.getItem('yalix_token');
const storedUser = readStoredUser();
if (document.body.dataset.requiresAuth === 'true' && (!storedToken || !storedUser)) {
  window.location.replace('login.html');
}

function getUserName(user) {
  return [user.first_name, user.last_name].filter(Boolean).join(' ')
    || user.name
    || user.login
    || 'Пользователь';
}

function renderProfile(user) {
  const isAuthenticated = Boolean(user);
  const name = isAuthenticated ? getUserName(user) : 'Гость';
  const emailVal = user ? (user.email || user.user_email || '') : '';
  const email = isAuthenticated ? (emailVal || 'Электронная почта не указана') : 'Управляйте задачами и просматривайте рабочую информацию в одном месте.';
  const roleId = user ? (user.role_id ?? user.roleId ?? null) : null;
  const roleNameFallback = roleId === 1 ? 'Администратор' : (roleId === 2 ? 'Пользователь' : 'Пользователь');
  const role = isAuthenticated ? (user.role_name || user.roleName || roleNameFallback) : '—';

  profileName.textContent = name;
  profileLogin.textContent = isAuthenticated ? `@${login}` : login;
  profileEmail.textContent = email;
  profileRole.textContent = role;
  profileStatus.textContent = isAuthenticated ? 'Активен' : 'Гость';
  profileStatusText.textContent = isAuthenticated ? 'Сессия пользователя активна' : 'Авторизуйтесь для работы с аккаунтом';
  profileAvatar.textContent = name.charAt(0).toUpperCase();
  headerLoginLink?.classList.toggle('hidden', isAuthenticated);
  logoutBtn?.classList.toggle('hidden', !isAuthenticated);
}

async function loadTaskCount() {
  if (typeof apiRequest !== 'function') return;

  try {
    const data = await apiRequest('/tasks', { method: 'GET' });
    const tasks = Array.isArray(data) ? data : (data && Array.isArray(data.tasks) ? data.tasks : []);
    taskCount.textContent = String(tasks.length);
  } catch (error) {
    console.error('Task count loading error:', error);
    taskCount.textContent = '—';
  }
}

logoutBtn?.addEventListener('click', () => {
  sessionStorage.removeItem('yalix_token');
  sessionStorage.removeItem('yalix_user');
  localStorage.removeItem('yalix_token');
  localStorage.removeItem('yalix_user');
  if (document.body.dataset.requiresAuth === 'true') {
    window.location.replace('login.html');
    return;
  }
  renderProfile(null);
});

renderProfile(storedUser);
loadTaskCount();

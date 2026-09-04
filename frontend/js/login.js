const form = document.getElementById('loginForm');
const identifier = document.getElementById('loginIdentifier') || document.getElementById('loginEmail');
const pass = document.getElementById('loginPassword');

if (form && identifier && pass) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const loginValue = identifier.value.trim();
    const pw = pass.value;

    if (!loginValue || !pw) {
      alert('Введите логин и пароль.');
      return;
    }

    try {
      const payload = {
        login: loginValue,
        username: loginValue,
        email: loginValue,
        password: pw
      };

      const data = await apiRequest('/login', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const rawUser = data && typeof data === 'object' ? data.user || data.profile || data : null;
      const responseUser = rawUser ? (typeof normalizeUser === 'function' ? normalizeUser(rawUser) : rawUser) : null;
      const responseLogin = responseUser?.name || responseUser?.login || responseUser?.username || loginValue;
      const storage = document.getElementById('rememberMe')?.checked ? localStorage : sessionStorage;
      if (data?.token) {
        localStorage.removeItem('yalix_token');
        sessionStorage.removeItem('yalix_token');
        storage.setItem('yalix_token', data.token);
      }
      if (responseUser) {
        localStorage.removeItem('yalix_user');
        sessionStorage.removeItem('yalix_user');
        storage.setItem('yalix_user', JSON.stringify(responseUser));
      }

      alert(`Вход выполнен успешно для ${responseLogin}`);
      form.reset();
      window.location.href = 'personal-cabinet.html';
    } catch (error) {
      console.error('Login error:', error);
      const message = error?.serverMessage || error?.message || 'неизвестная ошибка';
      alert(`Ошибка входа: ${message}`);
    }
  });
}

export const ROLES = {
  ADMIN: 'admin',
  WORKER: 'worker',
};

const VALID_USERNAMES = new Set(['admin', 'worker']);

export function login(username) {
  const normalized = username.trim().toLowerCase();
  if (!VALID_USERNAMES.has(normalized)) return false;

  localStorage.setItem('authToken', 'loggedin');
  localStorage.setItem('userRole', normalized);
  localStorage.setItem('username', normalized);
  return true;
}

export function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  localStorage.removeItem('username');
}

export function getStoredAuth() {
  if (!localStorage.getItem('authToken')) return null;

  const role = localStorage.getItem('userRole');
  if (role !== ROLES.ADMIN && role !== ROLES.WORKER) return null;

  return {
    username: localStorage.getItem('username') ?? role,
    role,
  };
}

export function isAuthenticated() {
  return getStoredAuth() !== null;
}

export function isAdmin() {
  return getStoredAuth()?.role === ROLES.ADMIN;
}

export function canDelete() {
  return isAdmin();
}

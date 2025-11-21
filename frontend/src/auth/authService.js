export function login(username, password) {
  // Temporary mock login (replace with backend later)
  if (username === "admin" && password === "pass") {
    localStorage.setItem("authToken", "loggedin");
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem("authToken");
}

export function isAuthenticated() {
  return !!localStorage.getItem("authToken");
}

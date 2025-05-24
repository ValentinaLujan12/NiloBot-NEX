const TEMP_CREDENTIALS = {
  username: "admin",
  password: "1234"
};

export const authenticate = (username: string, password: string): boolean => {
  const isAuthenticated = username === TEMP_CREDENTIALS.username && password === TEMP_CREDENTIALS.password;
  if (isAuthenticated) {
    localStorage.setItem("isAuthenticated", "true");
  }
  return isAuthenticated;
};

export const checkAuth = (): boolean => {
  return localStorage.getItem("isAuthenticated") === "true";
};

export const logout = (): void => {
  localStorage.removeItem("isAuthenticated");
};
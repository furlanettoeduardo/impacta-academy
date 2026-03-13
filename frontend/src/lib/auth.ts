export const tokenKey = 'impacta_token';

export const getToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(tokenKey);
};

export const setToken = (token: string) => {
  window.localStorage.setItem(tokenKey, token);
};

export const clearToken = () => {
  window.localStorage.removeItem(tokenKey);
};

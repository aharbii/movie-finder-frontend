interface AppWindow extends Window {
  __env?: { API_URL?: string };
}

export const environment = {
  production: true,
  apiUrl: (window as AppWindow).__env?.API_URL ?? 'http://localhost:8000',
};

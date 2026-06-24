import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { initTheme } from './services/themeService';
import './styles/globals.css';

// 在 React 渲染前应用主题，避免深浅色闪烁
initTheme();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

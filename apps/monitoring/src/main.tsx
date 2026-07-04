import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { I18nProvider } from './i18n/I18nContext';
import './index.css';

const root = document.getElementById('root');

if (!root) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:sans-serif">#root topilmadi</p>';
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </I18nProvider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
}

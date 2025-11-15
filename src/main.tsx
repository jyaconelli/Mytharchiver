import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.tsx';
import './index.css';
// import { ThemeProvider } from './providers/ThemeProvider';

const app = (
  <StrictMode>
    <BrowserRouter>
        <App />
    </BrowserRouter>
  </StrictMode>
);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}

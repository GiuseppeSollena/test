/**
 * main.tsx - Entry point dell'applicazione
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Ottiene l'elemento root
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

// Crea il root React e renderizza l'app
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

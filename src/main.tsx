import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

console.log("App initializing...");

try {
  const container = document.getElementById('root');
  if (!container) throw new Error("Root container not found");
  
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log("App rendered.");
} catch (error) {
  console.error("CRITICAL: App failed to render:", error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding: 20px; color: red;"><h1>Erro de Inicialização</h1><pre>${error instanceof Error ? error.message : String(error)}</pre></div>`;
  }
}

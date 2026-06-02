import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { AuthProvider } from './lib/auth';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import App from './App.jsx';
import './index.css';

// Central Query Client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Bootstrapping function to run MSW in dev mode
async function bootstrapApp() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./api/msw/browser');
    await worker.start({
      onUnhandledRequest: 'bypass', // Avoid flood of console logs for bundle files
    });
  }
}

bootstrapApp().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  );
});

// src/App.tsx
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SSEProvider } from './contexts/SSEContext';
import { AppRoutes } from './routes/AppRoutes';
import { ForcedPasswordChangeModal } from './components/common/ForcedPasswordChangeModal';

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SSEProvider>
          <ForcedPasswordChangeModal />
          <AppRoutes />
        </SSEProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
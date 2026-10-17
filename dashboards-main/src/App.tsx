import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '@/components/Layout/MainLayout';
import { RegistroAlertas } from '@/pages/RegistroAlertas';
import { TablaHoraria } from '@/pages/TablaHoraria';
import { UltimoDato } from '@/pages/UltimoDato';
import { AlertNotifications } from '@/components/AlertNotifications/AlertNotifications';
// DEV ONLY
import { FakeAlertButton } from '@/dev/FakeAlertButton';

const queryClient = new QueryClient();

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <Router basename={import.meta.env.BASE_URL}>
                <Routes>
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<RegistroAlertas />} />
                        <Route
                            path="/tabla-horaria"
                            element={<Navigate to="/tabla-horaria/meteorologicas" replace />}
                        />
                        <Route path="/tabla-horaria/:type" element={<TablaHoraria />} />
                        <Route path="/ultimo-dato" element={<UltimoDato />} />
                    </Route>
                </Routes>
                {/* Notificaciones de alertas nuevas (necesita useNavigate y React Query) */}
                <AlertNotifications />
                {/* DEV ONLY */}
                <FakeAlertButton />
            </Router>
        </QueryClientProvider>
    );
}

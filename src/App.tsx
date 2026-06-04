import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { LinearProvider } from './context/LinearContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { IdeasBoard } from './pages/IdeasBoard';
import { TicketsBoard } from './pages/TicketsBoard';
import { QAPage } from './pages/QAPage';
import { ReleaseLog } from './pages/ReleaseLog';
import { UsersPage } from './pages/UsersPage';
import { RequirementsPage } from './pages/RequirementsPage';
import { BacklogPage } from './pages/BacklogPage';
import { DesignDecisionsPage } from './pages/DesignDecisionsPage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { TeamBoard } from './pages/TeamBoard';
import { BugsPage } from './pages/BugsPage';
import { FeaturesPage } from './pages/FeaturesPage';
import { FeaturesListPage } from './pages/FeaturesListPage';

function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <DataProvider>
                  <LinearProvider>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<TeamBoard />} />
                        <Route path="/features" element={<FeaturesListPage />} />
                        <Route path="/features/board" element={<FeaturesPage />} />
                        <Route path="/ideas" element={<IdeasBoard />} />
                        <Route path="/sprints" element={<BacklogPage />} />
                        <Route path="/tickets" element={<TicketsBoard />} />
                        <Route path="/requirements" element={<RequirementsPage />} />
                        <Route path="/bugs" element={<BugsPage />} />
                        <Route path="/qa" element={<QAPage />} />
                        <Route path="/releases" element={<ReleaseLog />} />
                        <Route path="/users" element={<UsersPage />} />
                        <Route path="/design" element={<DesignDecisionsPage />} />
                        <Route path="/organizations" element={<OrganizationsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </AppLayout>
                  </LinearProvider>
                </DataProvider>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

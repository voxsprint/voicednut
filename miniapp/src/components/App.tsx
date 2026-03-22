import { useLaunchParams, useSignal, miniApp } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

const AdminDashboardPage = lazy(async () => {
  const module = await import('@/pages/AdminDashboard/AdminDashboardPage.tsx');
  return { default: module.AdminDashboardPage };
});

const adminWorkspaceRoutes = [
  '/ops',
  '/sms',
  '/mailer',
  '/provider',
  '/content',
  '/calllog',
  '/callerflags',
  '/scriptsparity',
  '/messaging',
  '/persona',
  '/users',
  '/audit',
  '/settings',
] as const;

export function App() {
  const lp = useLaunchParams();
  const isDark = useSignal(miniApp.isDark);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <Suspense fallback={<div style={{ padding: 16 }}>Loading dashboard...</div>}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<AdminDashboardPage />} />
            {adminWorkspaceRoutes.map((path) => (
              <Route key={`workspace-${path}`} path={path} element={<AdminDashboardPage />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </Suspense>
    </AppRoot>
  );
}

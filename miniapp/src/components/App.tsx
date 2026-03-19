import { useLaunchParams, useSignal, miniApp } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';

import { routes as diagnosticRoutes } from '@/navigation/routes';

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

function normalizeLegacyPath(path: string): string {
  if (path === '/') return '/legacy';
  return `/legacy${path.startsWith('/') ? path : `/${path}`}`;
}

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
            {diagnosticRoutes.map((route) => {
              const RouteComponent = route.Component;
              return (
                <Route
                  key={`legacy${route.path}`}
                  path={normalizeLegacyPath(route.path)}
                  element={<RouteComponent />}
                />
              );
            })}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </Suspense>
    </AppRoot>
  );
}

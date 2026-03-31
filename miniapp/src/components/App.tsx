import { useLaunchParams, useSignal, miniApp } from '@tma.js/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MINIAPP_COMMAND_ROUTE_CONTRACTS } from '@/contracts/miniappParityContracts';
import { DASHBOARD_WORKSPACE_ROUTE_PATHS } from '@/pages/AdminDashboard/dashboardShellConfig';

const AdminDashboardPage = lazy(async () => {
  const module = await import('@/pages/AdminDashboard/AdminDashboardPage.tsx');
  return { default: module.AdminDashboardPage };
});
const CallCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.CallCommandPage };
});
const SmsCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.SmsCommandPage };
});
const StartCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.StartCommandPage };
});
const HelpCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.HelpCommandPage };
});
const EmailCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.EmailCommandPage };
});
const ScriptsCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.ScriptsCommandPage };
});
const MenuCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.MenuCommandPage };
});
const GuideCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.GuideCommandPage };
});
const HealthCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.HealthCommandPage };
});
const StatusCommandPage = lazy(async () => {
  const module = await import('@/pages/CommandPages/CommandPages.tsx');
  return { default: module.StatusCommandPage };
});

const adminWorkspaceRoutes = [...DASHBOARD_WORKSPACE_ROUTE_PATHS];

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
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.START} element={<StartCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.CALL} element={<CallCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.SMS} element={<SmsCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.HELP} element={<HelpCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.EMAIL} element={<EmailCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.SCRIPTS} element={<ScriptsCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.MENU} element={<MenuCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.GUIDE} element={<GuideCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.HEALTH} element={<HealthCommandPage />} />
            <Route path={MINIAPP_COMMAND_ROUTE_CONTRACTS.STATUS} element={<StatusCommandPage />} />
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

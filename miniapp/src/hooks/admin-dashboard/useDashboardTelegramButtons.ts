import { backButton, settingsButton } from '@tma.js/sdk-react';
import { useEffect } from 'react';
import type { NavigateFunction } from 'react-router-dom';

import type { DashboardDialogState } from '@/hooks/admin-dashboard/useDashboardDialog';
import type { DashboardModule } from '@/pages/AdminDashboard/dashboardShellConfig';

type UseDashboardTelegramButtonsOptions = {
  settingsButtonSupported: boolean;
  toggleSettings: (next?: boolean, options?: { fallbackModule?: DashboardModule }) => void;
  dialogState: DashboardDialogState | null;
  dismissDialog: (state: DashboardDialogState | null) => void;
  triggerHaptic: (
    mode: 'selection' | 'impact' | 'success' | 'warning' | 'error',
    impactStyle?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft',
  ) => void;
  settingsOpen: boolean;
  focusedWorkspaceMode: boolean;
  activeModule: DashboardModule;
  selectModule: (moduleId: DashboardModule, options?: { fromKeyboard?: boolean }) => void;
  navigate: NavigateFunction;
};

export function useDashboardTelegramButtons({
  settingsButtonSupported,
  toggleSettings,
  dialogState,
  dismissDialog,
  triggerHaptic,
  settingsOpen,
  focusedWorkspaceMode,
  activeModule,
  selectModule,
  navigate,
}: UseDashboardTelegramButtonsOptions): void {
  useEffect(() => {
    if (!settingsButtonSupported) return undefined;
    settingsButton.mount.ifAvailable();
    settingsButton.show.ifAvailable();
    return () => {
      settingsButton.hide.ifAvailable();
    };
  }, [settingsButtonSupported]);

  useEffect(() => {
    if (!settingsButton.onClick.isAvailable()) {
      return undefined;
    }
    return settingsButton.onClick(() => {
      toggleSettings();
    });
  }, [toggleSettings]);

  useEffect(() => {
    if (
      Boolean(dialogState)
      || settingsOpen
      || focusedWorkspaceMode
      || activeModule !== 'ops'
    ) {
      backButton.show.ifAvailable();
      return;
    }
    backButton.hide.ifAvailable();
  }, [activeModule, dialogState, focusedWorkspaceMode, settingsOpen]);

  useEffect(() => (
    () => {
      backButton.hide.ifAvailable();
    }
  ), []);

  useEffect(() => {
    if (!backButton.onClick.isAvailable()) {
      return undefined;
    }
    return backButton.onClick(() => {
      if (dialogState) {
        dismissDialog(dialogState);
        triggerHaptic('selection');
        return;
      }
      if (settingsOpen) {
        toggleSettings(false);
        return;
      }
      if (focusedWorkspaceMode) {
        triggerHaptic('selection');
        navigate('/');
        return;
      }
      if (activeModule !== 'ops') {
        selectModule('ops', { fromKeyboard: true });
        return;
      }
      if (typeof window !== 'undefined' && window.history.length > 1) {
        triggerHaptic('impact', 'light');
        window.history.back();
      }
    });
  }, [
    activeModule,
    dialogState,
    dismissDialog,
    focusedWorkspaceMode,
    navigate,
    selectModule,
    settingsOpen,
    toggleSettings,
    triggerHaptic,
  ]);
}

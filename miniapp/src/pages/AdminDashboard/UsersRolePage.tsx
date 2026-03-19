import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';

import type { DashboardVm, UserRow } from './types';
import { selectUsersRolePageVm } from './vmSelectors';
import { selectUsersRows, type UserRoleFilter } from './tableSelectors';
import { downloadCsv } from './csvExport';
import { UiBadge, UiButton, UiCard, UiInput, UiSelect, UiStatePanel } from '@/components/ui/AdminPrimitives';

type UsersRolePageProps = {
  visible: boolean;
  vm: DashboardVm;
};

const PAGE_SIZE_OPTIONS = [10, 20, 40, 80] as const;
const USERS_VIEW_PREFS_STORAGE_KEY = 'voxly-miniapp-users-view-prefs';

type UsersViewPrefs = {
  role_filter?: unknown;
  page_size?: unknown;
  reason_template?: unknown;
};

function roleBadgeVariant(role: string): 'success' | 'info' | 'meta' {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'success';
    case 'operator':
      return 'info';
    default:
      return 'meta';
  }
}

function isTypingTarget(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || tagName === 'input' || tagName === 'textarea' || tagName === 'select';
}

export function UsersRolePage({ visible, vm }: UsersRolePageProps) {
  if (!visible) return null;

  const {
    isFeatureEnabled,
    userSearch,
    setUserSearch,
    userSortBy,
    setUserSortBy,
    userSortDir,
    setUserSortDir,
    refreshUsersModule,
    usersPayload,
    usersRows,
    roleReasonTemplates,
    toInt,
    toText,
    formatTime,
    handleApplyUserRole,
  } = selectUsersRolePageVm(vm);
  const advancedTablesEnabled = isFeatureEnabled('advanced_tables', true);
  const usersCsvEnabled = isFeatureEnabled('users_csv_export', advancedTablesEnabled);
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all');
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [reasonTemplate, setReasonTemplate] = useState<string>(roleReasonTemplates[0] || '');
  const [reasonDetail, setReasonDetail] = useState<string>('');
  const userSearchInputRef = useRef<HTMLInputElement | null>(null);
  const refreshUsersButtonRef = useRef<HTMLButtonElement | null>(null);
  const composedReason = [reasonTemplate, reasonDetail.trim()].filter(Boolean).join(' - ');

  const restoreFocus = (target: HTMLElement | null): void => {
    if (!target || typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      if (!target.isConnected) return;
      target.focus({ preventScroll: true });
    });
  };

  const handleUsersRefresh = (target: HTMLElement | null = refreshUsersButtonRef.current): void => {
    void refreshUsersModule().finally(() => {
      restoreFocus(target);
    });
  };

  const focusUserSearchInput = (): void => {
    const target = userSearchInputRef.current;
    if (!target || typeof window === 'undefined') return;
    window.requestAnimationFrame(() => {
      if (!target.isConnected) return;
      target.focus({ preventScroll: true });
      target.select();
    });
  };

  const handleRoleAction = (
    target: HTMLButtonElement | null,
    telegramId: string,
    role: 'admin' | 'operator' | 'viewer',
  ): void => {
    void handleApplyUserRole(telegramId, role, composedReason).finally(() => {
      restoreFocus(target);
    });
  };

  const handleSectionShortcutKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    const key = event.key.toLowerCase();
    const typingTarget = isTypingTarget(event.target);
    if (typingTarget && event.altKey && !event.ctrlKey && !event.metaKey && key === 'r') {
      event.preventDefault();
      event.stopPropagation();
      handleUsersRefresh(event.target instanceof HTMLElement ? event.target : null);
      return;
    }
    if (typingTarget) return;
    if (key !== '/' || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    event.stopPropagation();
    focusUserSearchInput();
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(USERS_VIEW_PREFS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as UsersViewPrefs | null;
      if (!parsed || typeof parsed !== 'object') return;
      const roleFilterValue = typeof parsed.role_filter === 'string'
        ? parsed.role_filter
        : 'all';
      if (roleFilterValue === 'all'
        || roleFilterValue === 'admin'
        || roleFilterValue === 'operator'
        || roleFilterValue === 'viewer') {
        setRoleFilter(roleFilterValue);
      }
      const pageSizeValue = Number(parsed.page_size);
      if (PAGE_SIZE_OPTIONS.includes(pageSizeValue as (typeof PAGE_SIZE_OPTIONS)[number])) {
        setPageSize(pageSizeValue);
      }
      const reasonTemplateValue = typeof parsed.reason_template === 'string'
        ? parsed.reason_template
        : '';
      if (reasonTemplateValue && roleReasonTemplates.includes(reasonTemplateValue)) {
        setReasonTemplate(reasonTemplateValue);
      }
    } catch {
      // Ignore malformed persisted users-view state.
    }
  }, [roleReasonTemplates]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      role_filter: roleFilter,
      page_size: pageSize,
      reason_template: reasonTemplate,
    };
    try {
      window.localStorage.setItem(USERS_VIEW_PREFS_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore local storage failures in constrained clients.
    }
  }, [pageSize, reasonTemplate, roleFilter]);

  const filteredAndSortedUsers = useMemo(() => {
    return selectUsersRows({
      usersRows,
      roleFilter,
      userSearch,
      userSortBy: userSortBy as 'last_activity' | 'total_calls' | 'role',
      userSortDir: userSortDir as 'asc' | 'desc',
      toText,
      toInt,
    });
  }, [roleFilter, toInt, toText, userSearch, userSortBy, userSortDir, usersRows]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / pageSize));
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);
  useEffect(() => {
    setPage(1);
  }, [roleFilter, userSearch, userSortBy, userSortDir, pageSize]);

  const effectivePageSize = advancedTablesEnabled ? pageSize : 80;
  const effectivePage = advancedTablesEnabled ? page : 1;
  const pageStart = (effectivePage - 1) * effectivePageSize;
  const pageUsers = filteredAndSortedUsers.slice(pageStart, pageStart + effectivePageSize);
  const showingStart = filteredAndSortedUsers.length === 0 ? 0 : pageStart + 1;
  const showingEnd = Math.min(filteredAndSortedUsers.length, pageStart + pageUsers.length);
  const exportUsersCsv = (): void => {
    const rows = filteredAndSortedUsers.map((user) => [
      toText(user.telegram_id, ''),
      toText(user.role, 'viewer'),
      toText(user.role_source, 'inferred'),
      String(toInt(user.total_calls)),
      String(toInt(user.failed_calls)),
      formatTime(user.last_activity),
    ]);
    downloadCsv('miniapp-users.csv', [
      'telegram_id',
      'role',
      'role_source',
      'total_calls',
      'failed_calls',
      'last_activity',
    ], rows);
  };

  return (
    <section className="va-grid" onKeyDownCapture={handleSectionShortcutKeyDown}>
      <UiCard>
        <h3>User & Role Admin</h3>
        <div className="va-inline-metrics">
          <UiBadge>Total {toInt(usersPayload.total, usersRows.length)}</UiBadge>
          <UiBadge>Filtered {filteredAndSortedUsers.length}</UiBadge>
          <UiBadge>Showing {showingStart}-{showingEnd}</UiBadge>
        </div>
        <div className="va-filter-grid" role="toolbar" aria-label="User filters and actions">
          <UiInput
            ref={userSearchInputRef}
            placeholder="Search Telegram ID"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleUsersRefresh(event.currentTarget);
                return;
              }
              if (event.key === 'Escape' && userSearch.length > 0) {
                event.preventDefault();
                setUserSearch('');
              }
            }}
          />
          <UiSelect
            value={userSortBy}
            onChange={(event) => setUserSortBy(event.target.value)}
          >
            <option value="last_activity">Last Activity</option>
            <option value="total_calls">Total Calls</option>
            <option value="role">Role</option>
          </UiSelect>
          <UiSelect
            value={userSortDir}
            onChange={(event) => setUserSortDir(event.target.value)}
          >
            <option value="desc">DESC</option>
            <option value="asc">ASC</option>
          </UiSelect>
          <UiButton
            ref={refreshUsersButtonRef}
            variant="secondary"
            aria-keyshortcuts="Alt+R"
            onClick={(event) => {
              handleUsersRefresh(event.currentTarget);
            }}
          >
            Refresh Users
          </UiButton>
        </div>
        {advancedTablesEnabled ? (
          <div className="va-filter-grid">
            <UiSelect
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as UserRoleFilter)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </UiSelect>
            <UiSelect
              value={String(pageSize)}
              onChange={(event) => setPageSize(toInt(event.target.value, 20))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={`users-size-${size}`} value={size}>{size} / page</option>
              ))}
            </UiSelect>
            {usersCsvEnabled ? (
              <UiButton variant="secondary" onClick={exportUsersCsv} disabled={filteredAndSortedUsers.length === 0}>
                Export CSV
              </UiButton>
            ) : null}
          </div>
        ) : null}
        <div className="va-filter-grid">
          <UiSelect
            value={reasonTemplate}
            onChange={(event) => setReasonTemplate(event.target.value)}
          >
            {roleReasonTemplates.map((template) => (
              <option key={`role-reason-${template}`} value={template}>{template}</option>
            ))}
          </UiSelect>
          <UiInput
            placeholder="Reason details (required for audit)"
            value={reasonDetail}
            onChange={(event) => setReasonDetail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && reasonDetail.length > 0) {
                event.preventDefault();
                setReasonDetail('');
              }
            }}
          />
        </div>
        <p className="va-muted">
          Policy: admin elevation requires two-step approval phrase after reason confirmation.
        </p>
        <p className="va-muted">
          Total tracked: <strong>{toInt(usersPayload.total, usersRows.length)}</strong>
          {' '}| Filtered: <strong>{filteredAndSortedUsers.length}</strong>
          {' '}| Showing: <strong>{showingStart}-{showingEnd}</strong>
        </p>
        <ul className="va-list">
          {pageUsers.map((user: UserRow, index: number) => {
            const telegramId = toText(user.telegram_id, '');
            const role = toText(user.role, 'viewer');
            const roleVariant = roleBadgeVariant(role);
            const roleSource = toText(user.role_source, 'inferred');
            return (
              <li key={`user-role-${telegramId || `row-${pageStart + index}`}`} className="va-entity-row va-user-row">
                <div className="va-entity-head">
                  <strong title={telegramId}>{telegramId || 'unknown'}</strong>
                  <UiBadge variant={roleVariant}>{role}</UiBadge>
                </div>
                <div className="va-entity-meta">
                  <span>Source: {roleSource}</span>
                  <span>Calls: {toInt(user.total_calls)}</span>
                  <span>Failed: {toInt(user.failed_calls)}</span>
                  <span>Last: {formatTime(user.last_activity)}</span>
                </div>
                <div className="va-entity-actions">
                  <UiButton
                    variant="secondary"
                    onClick={(event) => {
                      handleRoleAction(event.currentTarget, telegramId, 'admin');
                    }}
                    disabled={!telegramId}
                  >
                    Promote Admin
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    onClick={(event) => {
                      handleRoleAction(event.currentTarget, telegramId, 'operator');
                    }}
                    disabled={!telegramId}
                  >
                    Set Operator
                  </UiButton>
                  <UiButton
                    variant="secondary"
                    onClick={(event) => {
                      handleRoleAction(event.currentTarget, telegramId, 'viewer');
                    }}
                    disabled={!telegramId}
                  >
                    Demote Viewer
                  </UiButton>
                </div>
              </li>
            );
          })}
        </ul>
        {pageUsers.length === 0 ? (
          <UiStatePanel
            compact
            title="No users matched your filters"
            description="Adjust search, role filter, or sort settings to broaden results."
          />
        ) : null}
        {advancedTablesEnabled ? (
          <div className="va-table-pager">
            <UiButton variant="secondary" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
              Previous
            </UiButton>
            <span className="va-muted">Page {page} of {totalPages}</span>
            <UiButton
              variant="secondary"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </UiButton>
          </div>
        ) : null}
      </UiCard>
    </section>
  );
}

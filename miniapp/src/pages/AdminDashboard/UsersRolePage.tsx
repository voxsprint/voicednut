import { useEffect, useMemo, useState } from 'react';

import type { DashboardVm, UserRow } from './types';
import { selectUsersRolePageVm } from './vmSelectors';
import { selectUsersRows, type UserRoleFilter } from './tableSelectors';
import { downloadCsv } from './csvExport';

type UsersRolePageProps = {
  visible: boolean;
  vm: DashboardVm;
};

const PAGE_SIZE_OPTIONS = [10, 20, 40, 80] as const;

function roleBadgeVariant(role: string): 'success' | 'info' | 'neutral' {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'success';
    case 'operator':
      return 'info';
    default:
      return 'neutral';
  }
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
  const composedReason = [reasonTemplate, reasonDetail.trim()].filter(Boolean).join(' - ');

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
    <section className="va-grid">
      <div className="va-card">
        <h3>User & Role Admin</h3>
        <div className="va-filter-grid">
          <input
            className="va-input"
            placeholder="Search Telegram ID"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
          <select
            className="va-input"
            value={userSortBy}
            onChange={(event) => setUserSortBy(event.target.value)}
          >
            <option value="last_activity">Last Activity</option>
            <option value="total_calls">Total Calls</option>
            <option value="role">Role</option>
          </select>
          <select
            className="va-input"
            value={userSortDir}
            onChange={(event) => setUserSortDir(event.target.value)}
          >
            <option value="desc">DESC</option>
            <option value="asc">ASC</option>
          </select>
          <button type="button" onClick={() => { void refreshUsersModule(); }}>
            Refresh Users
          </button>
        </div>
        {advancedTablesEnabled ? (
          <div className="va-filter-grid">
            <select
              className="va-input"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as UserRoleFilter)}
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
            <select
              className="va-input"
              value={String(pageSize)}
              onChange={(event) => setPageSize(toInt(event.target.value, 20))}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={`users-size-${size}`} value={size}>{size} / page</option>
              ))}
            </select>
            {usersCsvEnabled ? (
              <button type="button" onClick={exportUsersCsv} disabled={filteredAndSortedUsers.length === 0}>
                Export CSV
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="va-filter-grid">
          <select
            className="va-input"
            value={reasonTemplate}
            onChange={(event) => setReasonTemplate(event.target.value)}
          >
            {roleReasonTemplates.map((template) => (
              <option key={`role-reason-${template}`} value={template}>{template}</option>
            ))}
          </select>
          <input
            className="va-input"
            placeholder="Reason details (required for audit)"
            value={reasonDetail}
            onChange={(event) => setReasonDetail(event.target.value)}
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
                  <span className={`va-pill va-pill-${roleVariant}`}>{role}</span>
                </div>
                <div className="va-entity-meta">
                  <span>Source: {roleSource}</span>
                  <span>Calls: {toInt(user.total_calls)}</span>
                  <span>Failed: {toInt(user.failed_calls)}</span>
                  <span>Last: {formatTime(user.last_activity)}</span>
                </div>
                <div className="va-entity-actions">
                  <button
                    type="button"
                    onClick={() => { void handleApplyUserRole(telegramId, 'admin', composedReason); }}
                    disabled={!telegramId}
                  >
                    Promote Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleApplyUserRole(telegramId, 'operator', composedReason); }}
                    disabled={!telegramId}
                  >
                    Set Operator
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleApplyUserRole(telegramId, 'viewer', composedReason); }}
                    disabled={!telegramId}
                  >
                    Demote Viewer
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        {pageUsers.length === 0 ? <p className="va-muted">No users matched your filters.</p> : null}
        {advancedTablesEnabled ? (
          <div className="va-table-pager">
            <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1}>
              Previous
            </button>
            <span className="va-muted">Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

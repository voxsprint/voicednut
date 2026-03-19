import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';

import { classNames } from '@/css/classnames';

type UiCardTone = 'default' | 'subcard' | 'fallback' | 'blocked' | 'status' | 'empty';

type UiButtonVariant = 'primary' | 'secondary' | 'chip' | 'plain';

type UiBadgeVariant = 'meta' | 'info' | 'success' | 'error';
type UiStateTone = 'info' | 'success' | 'warning' | 'error';

const CARD_TONE_CLASS: Record<UiCardTone, string> = {
  default: '',
  subcard: 'va-subcard',
  fallback: 'va-module-fallback',
  blocked: 'va-blocked',
  status: 'va-status-card',
  empty: 'va-empty-state',
};

const BUTTON_VARIANT_CLASS: Record<UiButtonVariant, string[]> = {
  primary: ['va-btn', 'va-btn-primary'],
  secondary: ['va-btn', 'va-btn-secondary'],
  chip: ['va-chip'],
  plain: [],
};

const BADGE_VARIANT_CLASS: Record<UiBadgeVariant, string[]> = {
  meta: ['va-meta-chip'],
  info: ['va-pill', 'va-pill-info'],
  success: ['va-pill', 'va-pill-success'],
  error: ['va-pill', 'va-pill-error'],
};

type UiCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: UiCardTone;
};

export function UiCard({
  tone = 'default',
  className,
  children,
  ...rest
}: UiCardProps) {
  return (
    <div className={classNames('va-card', CARD_TONE_CLASS[tone], className)} {...rest}>
      {children}
    </div>
  );
}

type UiButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant;
};

export const UiButton = forwardRef<HTMLButtonElement, UiButtonProps>(function UiButton(
  {
    variant = 'secondary',
    className,
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={classNames(BUTTON_VARIANT_CLASS[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
});

type UiInputProps = InputHTMLAttributes<HTMLInputElement>;

export const UiInput = forwardRef<HTMLInputElement, UiInputProps>(function UiInput(
  {
    className,
    ...rest
  },
  ref,
) {
  return <input ref={ref} className={classNames('va-input', className)} {...rest} />;
});

type UiTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const UiTextarea = forwardRef<HTMLTextAreaElement, UiTextareaProps>(function UiTextarea(
  {
    className,
    ...rest
  },
  ref,
) {
  return (
    <textarea ref={ref} className={classNames('va-input', 'va-textarea', className)} {...rest} />
  );
});

type UiSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const UiSelect = forwardRef<HTMLSelectElement, UiSelectProps>(function UiSelect(
  {
    className,
    children,
    ...rest
  },
  ref,
) {
  return (
    <select ref={ref} className={classNames('va-input', className)} {...rest}>
      {children}
    </select>
  );
});

type UiBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: UiBadgeVariant;
  children: ReactNode;
};

export function UiBadge({
  variant = 'meta',
  className,
  children,
  ...rest
}: UiBadgeProps) {
  return (
    <span className={classNames(BADGE_VARIANT_CLASS[variant], className)} {...rest}>
      {children}
    </span>
  );
}

type UiSkeletonLineProps = HTMLAttributes<HTMLDivElement> & {
  short?: boolean;
};

export function UiSkeletonLine({
  short = false,
  className,
  ...rest
}: UiSkeletonLineProps) {
  return (
    <div
      className={classNames('va-module-skeleton-line', short && 'short', className)}
      {...rest}
    />
  );
}

type UiStatePanelProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  description: ReactNode;
  tone?: UiStateTone;
  compact?: boolean;
  actions?: ReactNode;
};

export function UiStatePanel({
  title,
  description,
  tone = 'info',
  compact = false,
  actions,
  className,
  ...rest
}: UiStatePanelProps) {
  const role = tone === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      className={classNames(
        'va-state-panel',
        `is-${tone}`,
        compact && 'is-compact',
        className,
      )}
      {...rest}
    >
      <strong>{title}</strong>
      <p>{description}</p>
      {actions ? <div className="va-state-panel-actions">{actions}</div> : null}
    </div>
  );
}

/**
 * Input — all form primitives in one file.
 * Every component shares the same visual baseline:
 *   bg-surface border border-border rounded px-3.5 py-2.5 text-sm
 *   focus:border-gold-primary focus:ring-2 focus:ring-gold-primary/15
 *
 * Named exports:
 *   Input        — text / email / password / number
 *   Textarea     — multi-line text
 *   SearchInput  — Input with prepended search icon
 *   Select       — native styled dropdown
 *   Checkbox     — styled checkbox with label
 *   Radio        — styled radio with label
 *   Toggle       — CSS toggle switch
 *   FileDropzone — drag-and-drop file upload zone
 */

import React from 'react';
import { cn } from '@/lib/cn';

/* ─────────────────────────────────────── Shared wrapper ── */

interface FieldWrapperProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

function FieldWrapper({ label, hint, error, required, children, className, id }: FieldWrapperProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-medium uppercase tracking-widest text-text-muted font-sans"
        >
          {label}
          {required && <span className="ml-1 text-conf-critical" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-conf-critical font-sans" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted font-sans">{hint}</p>
      ) : null}
    </div>
  );
}

const inputBase =
  'bg-surface border border-border rounded px-3.5 py-2.5 text-sm font-sans text-text-primary ' +
  'placeholder:text-text-muted w-full ' +
  'transition-colors duration-150 ' +
  'focus:outline-none focus:border-gold-primary focus:ring-2 focus:ring-gold-primary/15 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed ' +
  'read-only:bg-elevated read-only:cursor-default';

const inputError = 'border-conf-critical focus:border-conf-critical focus:ring-conf-critical/15';

/* ─────────────────────────────────────────────── Input ── */

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

/**
 * Input — standard text field.
 *
 * @example
 * <Input label="Document Name" placeholder="Enter name…" />
 * <Input type="password" label="Password" error={errors.password} />
 */
export function Input({
  label,
  hint,
  error,
  leftIcon,
  rightIcon,
  wrapperClassName,
  className,
  id: providedId,
  ...rest
}: InputProps) {
  const id = providedId ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <FieldWrapper label={label} hint={hint} error={error} required={rest.required} id={id} className={wrapperClassName}>
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          id={id}
          className={cn(
            inputBase,
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error && inputError,
            className,
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
            {rightIcon}
          </span>
        )}
      </div>
    </FieldWrapper>
  );
}

/* ─────────────────────────────────────────────── Textarea ── */

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

/**
 * Textarea — multi-line text input.
 *
 * @example
 * <Textarea label="Notes" rows={4} placeholder="Add context…" />
 */
export function Textarea({
  label,
  hint,
  error,
  wrapperClassName,
  className,
  id: providedId,
  ...rest
}: TextareaProps) {
  const id = providedId ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <FieldWrapper label={label} hint={hint} error={error} required={rest.required} id={id} className={wrapperClassName}>
      <textarea
        id={id}
        className={cn(
          inputBase,
          'resize-y min-h-[80px]',
          error && inputError,
          className,
        )}
        aria-invalid={Boolean(error)}
        {...rest}
      />
    </FieldWrapper>
  );
}

/* ─────────────────────────────────────────── SearchInput ── */

interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'type'> {
  onClear?: () => void;
}

/**
 * SearchInput — Input pre-configured with a search icon.
 *
 * @example
 * <SearchInput placeholder="Search documents…" value={q} onChange={e => setQ(e.target.value)} onClear={() => setQ('')} />
 */
export function SearchInput({ onClear, value, className, ...rest }: SearchInputProps) {
  const searchIcon = (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );

  const clearButton = onClear && value ? (
    <button
      type="button"
      aria-label="Clear search"
      onClick={onClear}
      className="text-text-muted hover:text-text-primary transition-colors pointer-events-auto"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  ) : undefined;

  return (
    <Input
      type="search"
      leftIcon={searchIcon}
      rightIcon={clearButton}
      value={value}
      className={className}
      {...rest}
    />
  );
}

/* ──────────────────────────────────────────────── Select ── */

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
  wrapperClassName?: string;
}

/**
 * Select — styled native dropdown.
 *
 * @example
 * <Select
 *   label="Analyzer"
 *   options={[{ value: 'legal', label: 'Legal' }, { value: 'clinical', label: 'Clinical' }]}
 * />
 */
export function Select({
  label,
  hint,
  error,
  options,
  placeholder,
  wrapperClassName,
  className,
  id: providedId,
  ...rest
}: SelectProps) {
  const id = providedId ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <FieldWrapper label={label} hint={hint} error={error} required={rest.required} id={id} className={wrapperClassName}>
      <div className="relative">
        <select
          id={id}
          className={cn(
            inputBase,
            'appearance-none pr-9 cursor-pointer',
            error && inputError,
            className,
          )}
          aria-invalid={Boolean(error)}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Chevron icon */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </FieldWrapper>
  );
}

/* ──────────────────────────────────────────────── Checkbox ── */

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
}

/**
 * Checkbox — styled checkbox with accessible label.
 *
 * @example
 * <Checkbox label="Include metadata" checked={include} onChange={e => setInclude(e.target.checked)} />
 */
export function Checkbox({ label, hint, error, wrapperClassName, className, id: providedId, ...rest }: CheckboxProps) {
  const id = providedId ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      <label htmlFor={id} className="inline-flex items-start gap-2.5 cursor-pointer group">
        <input
          id={id}
          type="checkbox"
          className={cn(
            'mt-0.5 w-4 h-4 rounded-sm border border-border bg-surface shrink-0',
            'checked:bg-gold-primary checked:border-gold-primary',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
            'cursor-pointer',
            error && 'border-conf-critical',
            className,
          )}
          aria-invalid={Boolean(error)}
          {...rest}
        />
        <span className="text-sm font-sans text-text-primary group-hover:text-text-primary transition-colors">
          {label}
        </span>
      </label>
      {error ? (
        <p className="text-xs text-conf-critical font-sans pl-6" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-muted font-sans pl-6">{hint}</p>
      ) : null}
    </div>
  );
}

/* ──────────────────────────────────────────────── Radio ── */

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  hint?: string;
  wrapperClassName?: string;
}

/**
 * Radio — styled radio button with accessible label.
 *
 * @example
 * <Radio name="mode" value="review" label="Code Review" checked={mode === 'review'} onChange={() => setMode('review')} />
 */
export function Radio({ label, hint, wrapperClassName, className, id: providedId, ...rest }: RadioProps) {
  const id = providedId ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)}>
      <label htmlFor={id} className="inline-flex items-center gap-2.5 cursor-pointer group">
        <input
          id={id}
          type="radio"
          className={cn(
            'w-4 h-4 border border-border bg-surface',
            'checked:accent-gold-primary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
            'cursor-pointer transition-colors duration-150',
            className,
          )}
          {...rest}
        />
        <span className="text-sm font-sans text-text-primary group-hover:text-text-primary transition-colors">
          {label}
        </span>
      </label>
      {hint && <p className="text-xs text-text-muted font-sans pl-6">{hint}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────── Toggle ── */

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  hint?: string;
  disabled?: boolean;
  id?: string;
  wrapperClassName?: string;
}

/**
 * Toggle — on/off switch.
 *
 * @example
 * <Toggle label="Enable streaming" checked={stream} onChange={setStream} />
 */
export function Toggle({ checked, onChange, label, hint, disabled, id: providedId, wrapperClassName }: ToggleProps) {
  const id = providedId ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className={cn('flex items-center gap-3', wrapperClassName)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex w-10 h-6 rounded-full border transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-void',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          checked
            ? 'bg-gold-primary border-gold-primary'
            : 'bg-elevated border-border',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm',
            'transition-transform duration-200',
            checked && 'translate-x-4',
          )}
        />
      </button>

      {label && (
        <label
          htmlFor={id}
          className="text-sm font-sans text-text-primary cursor-pointer select-none"
          onClick={() => !disabled && onChange(!checked)}
        >
          {label}
          {hint && <span className="block text-xs text-text-muted mt-0.5">{hint}</span>}
        </label>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────── FileDropzone ── */

interface FileDropzoneProps {
  onFiles: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  isLoading?: boolean;
  isDragActive?: boolean;
  error?: string;
  label?: string;
  hint?: string;
  className?: string;
}

/**
 * FileDropzone — drag-and-drop / click-to-upload zone.
 * This is a stateless presentation component — the parent manages drag state
 * and file handling logic.
 *
 * @example
 * <FileDropzone
 *   onFiles={handleFiles}
 *   accept=".pdf,.docx,.txt"
 *   isDragActive={isDragging}
 *   hint="PDF, DOCX, or TXT — max 50MB"
 * />
 */
export function FileDropzone({
  onFiles,
  accept,
  multiple = false,
  isLoading = false,
  isDragActive = false,
  error,
  label = 'Drop files here or click to upload',
  hint,
  className,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="File upload area"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className={cn(
        'relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10',
        'transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
        isDragActive
          ? 'border-gold-primary bg-gold-primary/5'
          : 'border-border hover:border-border-strong hover:bg-elevated',
        error && 'border-conf-critical bg-conf-critical/5',
        isLoading && 'pointer-events-none opacity-60',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
        tabIndex={-1}
      />

      {/* Upload icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className={cn('transition-colors duration-150', isDragActive ? 'text-gold-primary' : 'text-text-muted')}
      >
        <path d="M16 4L16 22M16 4L10 10M16 4L22 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 26H26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <div className="text-center">
        <p className={cn('text-sm font-sans font-medium', isDragActive ? 'text-gold-primary' : 'text-text-primary')}>
          {isDragActive ? 'Release to upload' : label}
        </p>
        {hint && <p className="text-xs text-text-muted font-sans mt-1">{hint}</p>}
      </div>

      {error && <p className="text-xs text-conf-critical font-sans" role="alert">{error}</p>}
    </div>
  );
}

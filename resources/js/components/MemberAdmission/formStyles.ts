/**
 * Compact, mobile-responsive form styles for Member Admission.
 * Use these for consistent, professional form layout with less vertical space.
 */
export const formStyles = {
  /** Page/section container - less padding on mobile */
  card: 'bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4',
  /** Section wrapper - compact bottom spacing */
  section: 'border-b border-gray-100 pb-4 last:border-0',
  /** Section title - smaller, still clear */
  sectionTitle: 'text-sm font-semibold text-gray-900 mb-3',
  /** Subsection title (e.g. "Present Address") */
  subsectionTitle: 'text-sm font-semibold text-gray-800 mb-2',
  /** Grid for 2 cols on md */
  grid2: 'grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3',
  /** Grid for 3–4 cols on larger screens */
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3',
  /** Label - compact */
  label: 'block text-xs font-medium text-gray-600 mb-0.5',
  labelRequired: 'text-red-500',
  /** Text/select input - compact height */
  input: 'w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
  inputDisabled: 'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70',
  /** Error message */
  error: 'mt-0.5 text-xs text-red-600',
  /** Inline hint */
  hint: 'mt-0.5 text-[11px] text-gray-500',
  /** Checkbox/radio wrapper */
  checkboxLabel: 'flex items-center gap-2 cursor-pointer text-xs text-gray-700',
  /** Button primary */
  btnPrimary: 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700',
  /** Button secondary / danger */
  btnSecondary: 'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md',
  /** Card for repeatable block (e.g. family member) */
  blockCard: 'p-2.5 border border-gray-200 rounded-md bg-gray-50/50',
} as const;

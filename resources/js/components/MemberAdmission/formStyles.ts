/**
 * Compact, mobile-responsive form styles for Member Admission.
 * Modern card design matching Loan Application Approval form styling.
 */
export const formStyles = {
  /** Page/section container */
  card: 'bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4',
  /** Section wrapper */
  section: 'border-b border-gray-100 pb-4 last:border-0',
  /** Section title */
  sectionTitle: 'text-sm md:text-base font-bold text-gray-900 mb-3 flex items-center gap-2',
  /** Subsection title */
  subsectionTitle: 'text-xs md:text-sm font-bold text-gray-800 mb-2 flex items-center gap-1.5',
  /** Grid layout helpers */
  grid2: 'grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4',
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4',
  /** Form Field Label */
  label: 'block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1',
  labelRequired: 'text-red-500 font-bold',
  /** Input controls */
  input: 'w-full px-3 py-2 text-xs md:text-sm border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-75',
  inputDisabled: 'disabled:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70',
  /** Error & Hint messages */
  error: 'mt-1 text-xs font-medium text-red-600 flex items-center gap-1',
  hint: 'mt-1 text-[11px] text-gray-500',
  /** Checkbox & Radio wrapper */
  checkboxLabel: 'flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 select-none',
  /** Action buttons */
  btnPrimary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all',
  btnSecondary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 active:scale-95 transition-all',
  /** Block card for repeatable items */
  blockCard: 'p-3.5 border border-gray-200/90 rounded-2xl bg-gray-50/70 space-y-3',
} as const;


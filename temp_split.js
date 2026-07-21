const fs = require('fs');
const path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApproval.tsx';
const content = fs.readFileSync(path, 'utf8');

const printHelpers = [
  'const DATE_BOX_COUNT',
  'const DateDigitBoxes',
  'const dofaLabel',
  'const noDecimal',
  'const BANGLA_0_TO_99',
  'function numberToWordsBangla',
  'const fromData',
  'const fmtValue',
  'function getFamilyAssetsFromMember'
];

const printFunctions = [
  'function renderPage1',
  'function renderPage2',
  'function renderPage3',
  'function renderPage4',
  'function renderLoanApplicationApprovalPreviewContent'
];

let remainingContent = content;
let extractedContent = import { formatDateBangla } from '@/utils/dateUtils';\n\n;

for (const fn of printHelpers) {
    const regex = new RegExp(^[\\s\\S]*?\\n(?=^[a-z]|\\n), 'gm');
    // We won't try to parse perfectly, just copy and delete using exact lines is safer.
}

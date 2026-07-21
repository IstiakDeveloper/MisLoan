import re

with open('c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApproval.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_block(start_str, end_brace_indent):
    start_idx = -1
    for i, line in enumerate(lines):
        if line.startswith(start_str):
            start_idx = i
            break
    if start_idx == -1: return [], []
    end_idx = start_idx
    for i in range(start_idx, len(lines)):
        if lines[i].startswith(end_brace_indent + '}'):
            end_idx = i
            break
    return lines[start_idx:end_idx+1], list(range(start_idx, end_idx+1))

to_extract = [
    ('const DATE_BOX_COUNT', ''),
    ('const DateDigitBoxes', ''),
    ('const dofaLabel', ''),
    ('const noDecimal', ''),
    ('const BANGLA_0_TO_99', ''),
    ('function numberToWordsBangla', ''),
    ('function renderPage1', ''),
    ('function renderPage2', ''),
    ('function renderPage3', ''),
    ('function renderPage4', ''),
    ('function renderLoanApplicationApprovalPreviewContent', '')
]

extracted_lines = []
extracted_lines.append("import React from 'react';\n")
extracted_lines.append("import { formatDateBangla } from '@/utils/dateUtils';\n\n")

indices_to_delete = set()
for start_str, indent in to_extract:
    block, indices = get_block(start_str, indent)
    extracted_lines.extend(block)
    extracted_lines.append("\n")
    indices_to_delete.update(indices)

# Add export default to the wrapper
for i in range(len(extracted_lines)):
    if extracted_lines[i].startswith('function renderLoanApplicationApprovalPreviewContent'):
        extracted_lines[i] = 'export default ' + extracted_lines[i]

with open('c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx', 'w', encoding='utf-8') as f:
    f.writelines(extracted_lines)

new_main = [line for i, line in enumerate(lines) if i not in indices_to_delete]
with open('c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApproval.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_main)

print('Success')

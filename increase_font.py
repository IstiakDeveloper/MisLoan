import sys
import re

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract renderPage4 block
match = re.search(r'(function renderPage4\(d: any\) \{.*?)(export default function)', content, re.DOTALL)
if not match:
    print("Could not find renderPage4 block")
    sys.exit(1)

page4 = match.group(1)
rest = match.group(2)

# Make font replacements
page4 = page4.replace('print:text-[11px]', 'print:text-[13px]')
page4 = page4.replace('text-[11px]', 'text-[12px]')
page4 = page4.replace('text-[10px]', 'text-[11px]')

new_content = content[:match.start()] + page4 + rest

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Font sizes increased in Page 4!")

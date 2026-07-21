import sys
import re

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

match = re.search(r'(function renderPage4\(d: any\) \{.*?)(export default function)', content, re.DOTALL)
if not match:
    print("Could not find renderPage4 block")
    sys.exit(1)

page4 = match.group(1)
rest = match.group(2)

# Make font replacements
# First, remove print:text-* classes because they make screen preview and print differ
page4 = re.sub(r'\s*print:text-\[\d+px\]', '', page4)

# Replace base text-[12px] with text-[14px]
page4 = page4.replace('text-[12px]', 'text-[14px]')
# Replace text-[11px] (which was the smaller text in tables/signatures) with text-[13px]
page4 = page4.replace('text-[11px]', 'text-[13px]')

new_content = content[:match.start()] + page4 + rest

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Font sizes increased globally for Page 4!")

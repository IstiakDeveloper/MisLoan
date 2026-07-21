import sys
import re

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def decrease_spacing(page_code):
    # Revert margins slightly
    page_code = page_code.replace('mb-6', 'mb-4')
    page_code = page_code.replace('mb-4', 'mb-2')
    page_code = page_code.replace('mb-3', 'mb-1')
    page_code = page_code.replace('mt-6', 'mt-4')
    
    # Revert padding on tables slightly
    page_code = page_code.replace('py-2', 'py-1')
    page_code = page_code.replace('py-1.5', 'py-0.5')
    page_code = re.sub(r'(<t[hd][^>]*?) p-2([^>]*?>)', r'\1 p-1\2', page_code)
    
    # We can keep min-width increased because they usually don't cause vertical overflow, 
    # but let's reduce them slightly just in case it caused line wrapping (horizontal overflow causing vertical)
    page_code = page_code.replace('min-w-[400px]', 'min-w-[300px]')
    page_code = page_code.replace('min-w-[250px]', 'min-w-[150px]')
    
    return page_code

p2_match = re.search(r'(function renderPage2\(.*?\)\s*\{)(.*?)(^\s*\})', content, re.DOTALL | re.MULTILINE)
if p2_match:
    p2_body = decrease_spacing(p2_match.group(2))
    content = content[:p2_match.start(2)] + p2_body + content[p2_match.end(2):]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Spacing decreased for Page 2!")

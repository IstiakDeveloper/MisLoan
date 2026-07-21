import sys
import re

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def increase_spacing(page_code):
    # Increase min-width for input fields
    page_code = page_code.replace('min-w-[60px]', 'min-w-[100px]')
    page_code = page_code.replace('min-w-[80px]', 'min-w-[120px]')
    page_code = page_code.replace('min-w-[100px]', 'min-w-[150px]')
    page_code = page_code.replace('min-w-[150px]', 'min-w-[250px]')
    page_code = page_code.replace('min-w-[200px]', 'min-w-[250px]')
    page_code = page_code.replace('min-w-[300px]', 'min-w-[400px]')
    
    # Increase vertical margin (gaps between sections)
    page_code = page_code.replace('mb-1', 'mb-3')
    page_code = page_code.replace('mb-2', 'mb-4')
    page_code = page_code.replace('mb-4', 'mb-6')
    page_code = page_code.replace('mt-4', 'mt-6')
    page_code = page_code.replace('mt-12', 'mt-16')
    
    # Increase table paddings (py-0.5 -> py-1.5, py-1 -> py-2, p-1 -> p-2)
    # Ensure we don't accidentally replace where p-0 is required for flex parents, 
    # but the inner py-* is safe.
    page_code = page_code.replace('py-0.5', 'py-1.5')
    page_code = page_code.replace('py-1', 'py-2')
    # For <td className="... p-1">, change to p-2
    page_code = re.sub(r'(<t[hd][^>]*?) p-1([^>]*?>)', r'\1 p-2\2', page_code)
    
    return page_code

# Find pages
# Page 2
p2_match = re.search(r'(function renderPage2\(.*?\)\s*\{)(.*?)(^\s*\})', content, re.DOTALL | re.MULTILINE)
if p2_match:
    p2_body = increase_spacing(p2_match.group(2))
    content = content[:p2_match.start(2)] + p2_body + content[p2_match.end(2):]

# Page 3
p3_match = re.search(r'(function renderPage3\(.*?\)\s*\{)(.*?)(^\s*\})', content, re.DOTALL | re.MULTILINE)
if p3_match:
    p3_body = increase_spacing(p3_match.group(2))
    content = content[:p3_match.start(2)] + p3_body + content[p3_match.end(2):]

# Page 4
p4_match = re.search(r'(function renderPage4\(.*?\)\s*\{)(.*?)(^\s*\})', content, re.DOTALL | re.MULTILINE)
if p4_match:
    p4_body = increase_spacing(p4_match.group(2))
    content = content[:p4_match.start(2)] + p4_body + content[p4_match.end(2):]

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Spacing increased for Page 2, 3, and 4!")

import sys
path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace(" style={{ fontSize: '12px' }}", '')
content = content.replace(" style={{ fontSize: '11px' }}", '')
with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')

import sys

path = 'c:/Code/MisLoan/resources/js/pages/Member/LoanApplications/Forms/LoanApplicationApprovalPrint.tsx'

export_code = '''
export default function LoanApplicationApprovalPrint({ formData: d, branch, categoryName: cat }: any) {
    if (!d) return null;
    return (
        <div className="w-[21cm] min-h-[29.7cm] mx-auto bg-white p-8 print:p-0">
            {renderPage1(d, branch, cat)}
            {renderPage2(d, cat)}
            {renderPage3(d)}
            {renderPage4(d)}
        </div>
    );
}
'''

with open(path, 'a', encoding='utf-8') as f:
    f.write('\n' + export_code)

print("Export function appended successfully!")

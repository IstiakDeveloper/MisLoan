import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import MemberAdmissionFormView from '@/components/MemberAdmissionFormView';
import { MemberAdmission } from '@/types/memberAdmission';
import { triggerPrintWithAutoFit } from '@/hooks/useAutoFitPrint';

interface Props {
    admission: MemberAdmission;
    admissions?: MemberAdmission[];
}

export default function AdmissionPrintSingle({ admission, admissions }: Props) {
    const forms = admissions && admissions.length > 0 ? admissions : [admission];

    useEffect(() => {
        const timer = setTimeout(() => {
            triggerPrintWithAutoFit('.member-admission-print');
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title={forms.length > 1 ? `প্রিন্ট - সব জরিপ (${admission.application_no})` : `প্রিন্ট - ${admission.application_no}`}>
                <style>{`
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Noto Sans Bengali', 'Kalpurush', 'Arial', sans-serif;
                        color: #000;
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                        background: #fff;
                    }
                    .print-wrapper {
                        width: 100%;
                        max-width: 210mm;
                        margin: 0 auto;
                        padding: 0;
                    }
                    .cycle-survey-print-break {
                        page-break-before: always;
                        break-before: page;
                    }
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 8mm 10mm;
                        }
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                            background: #fff;
                        }
                        .print-wrapper {
                            box-shadow: none;
                            max-width: 100%;
                            width: 100%;
                        }
                    }
                `}</style>
            </Head>

            <div className="print-wrapper">
                {forms.map((form, index) => (
                    <div
                        key={form.id}
                        className={index > 0 ? 'cycle-survey-print-break' : undefined}
                    >
                        <MemberAdmissionFormView admission={form as any} printMode={true} />
                    </div>
                ))}
            </div>
        </>
    );
}

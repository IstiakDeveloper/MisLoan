import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import MemberAdmissionFormView from '@/components/MemberAdmissionFormView';
import { MemberAdmission } from '@/types/memberAdmission';
import { triggerPrintWithAutoFit } from '@/hooks/useAutoFitPrint';

interface Props {
    admission: MemberAdmission;
}

export default function AdmissionPrintSingle({ admission }: Props) {
    useEffect(() => {
        const timer = setTimeout(() => {
            triggerPrintWithAutoFit('.member-admission-print');
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title={`প্রিন্ট - ${admission.application_no}`}>
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
                <MemberAdmissionFormView admission={admission as any} printMode={true} />
            </div>
        </>
    );
}

import { Head } from '@inertiajs/react';
import { useEffect } from 'react';
import MemberAdmissionFormView from '@/components/MemberAdmissionFormView';
import { MemberAdmission } from '@/types/memberAdmission';

interface Props {
    admission: MemberAdmission;
}

export default function AdmissionPrintSingle({ admission }: Props) {
    useEffect(() => {
        const timer = setTimeout(() => {
            window.print();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Head title={`প্রিন্ট - ${admission.application_no}`}>
                <style>{`
                    @page {
                        size: A4 portrait;
                        margin: 5mm;
                    }
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Noto Sans Bengali', 'Arial', sans-serif;
                        font-size: 12pt;
                        line-height: 1.4;
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
                        body {
                            print-color-adjust: exact;
                            -webkit-print-color-adjust: exact;
                            background: #fff;
                        }
                        .print-wrapper {
                            box-shadow: none;
                        }
                        .form-print-document {
                            max-width: 100%;
                            padding: 5mm !important;
                            font-size: 11pt !important;
                        }
                        .form-print-section {
                            break-inside: avoid;
                            page-break-inside: avoid;
                        }
                        .form-print-page-break-before { page-break-before: always; }
                    }
                `}</style>
            </Head>

            <div className="print-wrapper">
                <MemberAdmissionFormView admission={admission as any} printMode={true} />
            </div>
        </>
    );
}

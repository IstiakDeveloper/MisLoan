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
                        @page {
                            size: A4 portrait;
                            margin: 12mm 6mm 8mm 6mm;
                        }
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
                            padding: 2mm 6mm 6mm 6mm !important;
                            font-size: 11pt !important;
                            line-height: 1.5;
                        }
                        .form-print-document > header.form-print-section {
                            margin-bottom: 3mm !important;
                            padding: 1mm 0 !important;
                        }
                        .form-print-document > header.form-print-section + .form-print-section {
                            margin-bottom: 2mm !important;
                            padding: 1mm 0 !important;
                        }
                        .form-print-section {
                            break-inside: avoid;
                            page-break-inside: avoid;
                            padding-top: 1.5mm !important;
                            padding-bottom: 1.5mm !important;
                        }
                        /* Page break এর পর উপরের গ্যাপ */
                        .form-print-page-break-before {
                            page-break-before: always !important;
                            margin-top: 5mm !important;
                            padding-top: 5mm !important;
                        }
                        /* ২৩ নং ও ডিক্লেয়ারেশনের মাঝে গ্যাপ */
                        .form-print-signature-block {
                            margin-top: 4mm !important;
                            padding-top: 2mm !important;
                        }
                        .form-print-document table th,
                        .form-print-document table td {
                            padding: 0.75mm 1mm !important;
                        }
                        .form-print-document .space-y-2 > * + *,
                        .form-print-document .space-y-3 > * + * {
                            margin-top: 0.5mm;
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

<?php

namespace App\Http\Controllers;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class TemplateGenerator
{
    public static function generateAdmissionTemplate()
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('সদস্য তথ্য');

        // Headers with validation hints
        $headers = [
            'ক্র: নং',
            'শাখার নাম',
            'অফিসারের নাম',
            'কম্পোনেন্টের নাম',
            'সমিতির নাম',
            'সদস্যের নাম*',
            'মোবাইল নং*',
            'বসতবাড়ী',
            'আবাদী',
            'মোট',
            'গরু',
            'ছাগল',
            'হাঁস/মুরগী',
            'স্থাবর ও অস্থাবর সম্পদের মূল্য',
            'উপার্জন কারীর পেষা',
            'পরিবারের মাসিক আয়',
            'জামিনদারের নাম',
            'সদস্যের সাথে জামিনদারের সম্পর্ক',
            'মন্তব্য'
        ];

        $sheet->fromArray($headers, null, 'A1');

        // Style header row - blue background with white text
        $headerStyle = [
            'font' => ['bold' => true, 'size' => 11, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1e40af']  // Blue color
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => '000000'],
                ],
            ],
        ];
        $sheet->getStyle('A1:S1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(40);

        // Set column widths optimized for data entry
        $widths = [
            'A' => 8,     // ক্র: নং
            'B' => 16,    // শাখার নাম
            'C' => 16,    // অফিসারের নাম
            'D' => 16,    // কম্পোনেন্টের নাম
            'E' => 14,    // সমিতির নাম
            'F' => 18,    // সদস্যের নাম
            'G' => 14,    // মোবাইল নং
            'H' => 12,    // বসতবাড়ী
            'I' => 12,    // আবাদী
            'J' => 10,    // মোট
            'K' => 8,     // গরু
            'L' => 8,     // ছাগল
            'M' => 10,    // হাঁস/মুরগী
            'N' => 16,    // স্থাবর ও অস্থাবর সম্পদের মূল্য
            'O' => 14,    // উপার্জন কারীর পেষা
            'P' => 14,    // পরিবারের মাসিক আয়
            'Q' => 16,    // জামিনদারের নাম
            'R' => 18,    // সদস্যের সাথে জামিনদারের সম্পর্ক
            'S' => 14,    // মন্তব্য
        ];

        foreach ($widths as $col => $width) {
            $sheet->getColumnDimension($col)->setWidth($width);
        }

        // Add sample data row 1
        $sampleData1 = [
            1,
            'ঢাকা শাখা',
            'করিম আহমেদ',
            'কমিউনিটি ডেভেলপমেন্ট',
            'আমিনা সমিতি',
            'আব্দুল করিম',
            '01712345678',
            '1.5',      // বসতবাড়ী (decimal)
            '0.75',     // আবাদী (decimal)
            '2.25',     // মোট (decimal)
            '2',        // গরু (integer)
            '5',        // ছাগল (integer)
            '10',       // হাঁস/মুরগী (integer)
            '150000',   // স্থাবর ও অস্থাবর সম্পদের মূল্য
            'ব্যবসা',
            '25000',    // পরিবারের মাসিক আয়
            'আব্দুল রহিম',
            'পিতা',
            'ভালো আছে'
        ];
        $sheet->fromArray($sampleData1, null, 'A2');

        // Add sample data row 2
        $sampleData2 = [
            2,
            'ঢাকা শাখা',
            'করিম আহমেদ',
            'কমিউনিটি ডেভেলপমেন্ট',
            'ফাতিমা সমিতি',
            'ফাতিমা বেগম',
            '01811223344',
            '2.0',      // বসতবাড়ী (decimal)
            '1.0',      // আবাদী (decimal)
            '3.0',      // মোট (decimal)
            '1',        // গরু (integer)
            '8',        // ছাগল (integer)
            '15',       // হাঁস/মুরগী (integer)
            '200000',   // স্থাবর ও অস্থাবর সম্পদের মূল্য
            'শিক্ষক',
            '35000',    // পরিবারের মাসিক আয়
            'মুহাম্মদ হোসেন',
            'পিতা',
            'উন্নত কৃষক'
        ];
        $sheet->fromArray($sampleData2, null, 'A3');

        // Add data validation styles to rows 2-3
        $sampleStyle = [
            'border' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'CCCCCC'],
                ],
            ],
            'alignment' => [
                'vertical' => Alignment::VERTICAL_TOP,
                'wrapText' => true
            ],
        ];
        $sheet->getStyle('A2:S3')->applyFromArray($sampleStyle);
        $sheet->getRowDimension(2)->setRowHeight(25);
        $sheet->getRowDimension(3)->setRowHeight(25);

        // Add empty rows with alternating colors for user input (rows 4-20)
        for ($row = 4; $row <= 20; $row++) {
            $sheet->getRowDimension($row)->setRowHeight(25);

            $bgColor = ($row % 2 === 0) ? 'F8F9FA' : 'FFFFFF';
            $cellStyle = [
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $bgColor]
                ],
                'border' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'E0E0E0'],
                    ],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_TOP,
                    'wrapText' => true
                ],
            ];
            $sheet->getStyle("A{$row}:S{$row}")->applyFromArray($cellStyle);
        }

        // Add instructions sheet
        $instructionsSheet = $spreadsheet->createSheet();
        $instructionsSheet->setTitle('নির্দেশাবলী');

        $instructions = [
            ['পদ্ধতি', 'বিবরণ'],
            ['', ''],
            ['⚠️ গুরুত্বপূর্ণ', '★ চিহ্নিত সকল ফিল্ড অবশ্যই পূরণ করতে হবে (email ছাড়া)'],
            ['', ''],
            ['প্রয়োজনীয় ফিল্ড (*)', 'অবশ্যই খালি রাখবেন না:'],
            ['', '   ★ সদস্যের নাম - বাংলা বা ইংরেজি যেকোনো নাম'],
            ['', '   ★ পিতার নাম - সদস্যের পিতার নাম'],
            ['', '   ★ এনআইডি নম্বর - শুধুমাত্র ইংরেজি সংখ্যা (০-৯ নয়)'],
            ['', '   ★ জন্ম তারিখ - YYYY-MM-DD ফরম্যাট (1985-01-15)'],
            ['', '   ★ লিঙ্গ - male / female / other'],
            ['', '   ★ মোবাইল - ইংরেজি সংখ্যা (01712345678)'],
            ['', '   ★ বর্তমান ঠিকানা - সম্পূর্ণ ঠিকানা লিখুন'],
            ['', '   ★ স্থায়ী ঠিকানা - সম্পূর্ণ ঠিকানা লিখুন'],
            ['', '   ★ পেশা - পেশার নাম লিখুন'],
            ['', '   ★ মাসিক আয় - শুধুমাত্র সংখ্যা (25000)'],
            ['', ''],
            ['ঐচ্ছিক ফিল্ড', 'এই ফিল্ডগুলি না পূরণ করলেও চলবে:'],
            ['', '   • মাতার নাম'],
            ['', '   • স্বামী/স্ত্রীর নাম'],
            ['', '   • ইমেইল - বৈধ ফরম্যাট (name@example.com)'],
            ['', ''],
            ['তারিখ ফরম্যাট', 'YYYY-MM-DD ফরম্যাটে লিখুন (উদাহরণ: 1985-01-15)'],
            ['', 'ভুল: 15-01-1985 বা 01/15/1985 বা 1985/01/15'],
            ['', ''],
            ['মোবাইল নম্বর', 'শুধুমাত্র ইংরেজি সংখ্যা, বাংলা সংখ্যা নয়'],
            ['', 'সঠিক: 01712345678'],
            ['', 'ভুল: ০১৭১২৩৪৫৬৭৮'],
            ['', ''],
            ['স্টেপ ১:', 'এই টেমপ্লেট ডাউনলোড করুন'],
            ['', ''],
            ['স্টেপ ২:', 'সম্পূর্ণ তথ্য পূরণ করে সংরক্ষণ করুন'],
            ['', ''],
            ['স্টেপ ৩:', 'মিসলোন অ্যাপে এই ফাইল আপলোড করুন'],
            ['', ''],
            ['স্টেপ ৪:', 'প্রতিটি সদস্যের এনআইডি কার্ডের সামনে ও পিছনের ছবি আপলোড করুন'],
            ['', ''],
            ['সর্বোচ্চ সদস্য', 'একবারে সর্বোচ্চ ৫০০ সদস্য যোগ করতে পারবেন'],
            ['', ''],
            ['সেম্পল ডেটা', 'সেম্পল ডেটা দুটি সারিতে দেখুন - এটি শুধু উদাহরণ, মুছে ফেলুন'],
        ];

        $instructionsSheet->fromArray($instructions, null, 'A1');
        $instructionsSheet->getColumnDimension('A')->setWidth(18);
        $instructionsSheet->getColumnDimension('B')->setWidth(70);

        // Style instructions
        $titleStyle = [
            'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1e40af']
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ];
        $instructionsSheet->getStyle('A1:B1')->applyFromArray($titleStyle);
        $instructionsSheet->getRowDimension(1)->setRowHeight(25);

        // Highlight important sections
        $importantStyle = [
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'FFF8DC']  // Light yellow
            ],
        ];

        for ($row = 1; $row <= count($instructions); $row++) {
            if (strpos($instructions[$row - 1][0] ?? '', 'স্টেপ') === 0 ||
                strpos($instructions[$row - 1][0] ?? '', 'প্রয়োজনীয়') === 0) {
                $instructionsSheet->getStyle("A{$row}:B{$row}")->applyFromArray($importantStyle);
            }
        }

        return $spreadsheet;
    }
}

<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class FieldOfficerSeeder extends Seeder
{
    private const PASSWORD = '12345678';

    /**
     * PIN (string) → email for field officers who had custom email in previous seeder.
     */
    private const PIN_TO_EMAIL = [
        '866' => 'ns299990@gmail.com',
        '777' => 'shorolhossain88@gmail.com',
        '735' => 'mdashadulis312@gmail.com',
        '782' => 'bmdo60523@gmail.com',
        '495' => 'goshe14@gmail.com',
        '879' => 'jakirkahalue@gmail.com',
        '1010' => 'ishamim319@gmail.com',
        '1018' => 'rimom4701@gmail.com',
        '708' => 'roymanik@gmail.com',
        '556' => 'dhdurjoy88@gmail.com',
        '361' => 'mdaslamali2468@gmail.com',
        '688' => 'ziaulhaque0175180121@gmail.com',
        '540' => 'sozolkumar1991@gmail.com',
        '814' => 'mr4115913@gmail.com',
        '829' => 'ritupornaxy8@gmail.com',
        '1072' => 'mrohmatali739@gmail.com',
        '986' => 'shuvomondol970@gmail.com',
        '619' => 'rakibhasan4629@gmail.com',
        '586' => 'mdmahdihasanh263@gmail.com',
        '704' => 'babyaramst3@gmail.com',
        '994' => 'rahadj50@gmail.com',
        '702' => 'abdurrohomanmousumingo@gmail.com',
        '1032' => 'mostafizurrohoman669@gmail.com',
        '961' => 'imranhosenimran93@gmail.com',
        '985' => 'riponislamripon905@gmail.com',
        '1068' => 'mostakim323332@gmail.com',
        '1060' => 'Shyamoliakter5555@gmail.com',
        '617' => 'malikngn@gmail.com',
    ];

    /**
     * Branch name (from list) → branch code in DB (BranchSeeder).
     */
    private const BRANCH_NAME_TO_CODE = [
        'Atrai (RO)' => '0002',
        'Bhabanipur' => '0004',
        'Khajura' => '0028',
        'Noldanga' => '0031',
        'Somospara' => '0032',
        'Betgari (RO)' => '0013',
        'Bandaikhara' => '0005',
        'Raninagar' => '0003',
        'Fatepur' => '0023',
        'Hatgangopara' => '0025',
        'Adamdighi (RO)' => '0011',
        'Tilokpur' => '0014',
        'Saharpokur' => '0010',
        'Abadpokur' => '0007',
        'Hatkoroi' => '0027',
        'Kahalu' => '0042',
        'Naogaon Sadar (RO)' => '0001',
        'Santahar' => '0015',
        'Shoilgachi' => '0012',
        'Hapania' => '0008',
        'Katkhoir' => '0026',
        'Paharpur (RO)' => '0019',
        'Badalgachi' => '0009',
        'Nazipur' => '0017',
        'Kirtipur' => '0006',
        'Akkelpur' => '0037',
        'Khetlal (RO)' => '0038',
        'Chanpara' => '0039',
        'Kichok' => '0040',
        'Rajabirat' => '0041',
        'Sapahar (RO)' => '0021',
        'Shishahat (ZO)' => '0024',
        'Agradigun' => '0034',
        'Dighirhat' => '0030',
        'Rajbari (RO)' => '0033',
        'Dorgadanga (Tanore )' => '0035',
        'Chawbaria' => '0022',
        'Nachol' => '0036',
        'Mohadebpur (RO)' => '0018',
        'Chatra' => '0020',
        'Cheragpur' => '0016',
        'Sibpur' => '0029',
    ];

    /**
     * Run the database seeds.
     *
     * Creates users for branch field officers based on a hardcoded list.
     * - Username: PIN
     * - Email: previous custom email if any (by PIN), else PIN@misloan.com
     * - Password: 12345678
     * - Role: field_officer
     * Already created (existing PIN/username): skip, no duplicate.
     * Not in DB: seeder run করলে শুধু ওইগুলো create হবে।
     */
    public function run(): void
    {
        $fieldOfficerRole = Role::where('name', Role::FIELD_OFFICER)->first();

        if (! $fieldOfficerRole) {
            $this->command?->warn('Field officer role not found. Run RoleSeeder first.');
            return;
        }

        $branchesWithOfficers = [
            'Atrai (RO)' => [
                ['pin' => 960, 'name' => 'S.M Mahatabur Rahman'],
                ['pin' => 676, 'name' => 'Md. Soroar Jahan'],
                ['pin' => 764, 'name' => 'Md. Bairul Islam'],
                ['pin' => 983, 'name' => 'Md. Fahim Rahman'],
                ['pin' => 1017, 'name' => 'Md. Sonarul Islam'],
                ['pin' => 1047, 'name' => 'Md. Mohidul Haque'],
                ['pin' => 827, 'name' => 'Deloyar Mia'],
            ],
            'Bhabanipur' => [
                ['pin' => 528, 'name' => 'Motaleb  Hosain'],
                ['pin' => 753, 'name' => 'Md. Aasoyad Alahi'],
                ['pin' => 950, 'name' => 'Md. Mostafizur Rahman'],
                ['pin' => 1061, 'name' => 'Rima Khatun'],
                ['pin' => 908, 'name' => 'Md. Batchhu Mondol'],
                ['pin' => 1020, 'name' => 'Md. Mehedi Hasan'],
                ['pin' => 807, 'name' => 'Md. Naeem Uddin'],
            ],
            'Khajura' => [
                ['pin' => 164, 'name' => 'Harun or  Rashid'],
                ['pin' => 657, 'name' => 'Md. Khorshed Alam'],
                ['pin' => 858, 'name' => 'Yousuf Shakil'],
                ['pin' => 1009, 'name' => 'Pritish Chandrra Barman'],
                ['pin' => 1097, 'name' => 'Md. Omar Faruk'],
                ['pin' => 616, 'name' => 'Md. Aminul  Islam'],
            ],
            'Noldanga' => [
                ['pin' => 398, 'name' => 'Nirash Chondro Sarker'],
                ['pin' => 743, 'name' => 'Mst. Kamrun Nahar'],
                ['pin' => 525, 'name' => 'Nayan  Chandra'],
                ['pin' => 1055, 'name' => 'D.M Maruf Hosaain'],
                ['pin' => 643, 'name' => 'Joynul Abedin'],
            ],
            'Somospara' => [
                ['pin' => 984, 'name' => 'Ripon Kumar Pramanik'],
                ['pin' => 847, 'name' => 'Omur Faruk'],
                ['pin' => 1078, 'name' => 'Rafi'],
                ['pin' => 1073, 'name' => 'Md. Nahid Hossen'],
                ['pin' => 1045, 'name' => 'Md. Tawfique Molla'],
            ],
            'Betgari (RO)' => [
                ['pin' => 1011, 'name' => 'Taibur Rahman'],
                ['pin' => 691, 'name' => 'Mst. Sagorika Akter'],
                ['pin' => 1038, 'name' => 'Md. Shakil Ahmmed'],
                ['pin' => 1052, 'name' => 'Nour Mohhamad Joy'],
                ['pin' => 708, 'name' => 'Manik Kumar Sutrodhor'],
                ['pin' => 1101, 'name' => 'Md. Younus Ali'],
            ],
            'Bandaikhara' => [
                ['pin' => 582, 'name' => 'Sujon  Kumar'],
                ['pin' => 441, 'name' => 'Md. Mahmudul Hasan'],
                ['pin' => 754, 'name' => 'Md. Ruhul Amin'],
                ['pin' => 890, 'name' => 'Md. Enayet Hossain Sanju'],
                ['pin' => 795, 'name' => 'Md. Mister Maola'],
                ['pin' => 852, 'name' => 'Muhammad Imran Sharif'],
                ['pin' => 1079, 'name' => 'Partho Das'],
            ],
            'Raninagar' => [
                ['pin' => 735, 'name' => 'Md. Ashadul Islam'],
                ['pin' => 1002, 'name' => 'Md. Shamim Reza'],
                ['pin' => 1003, 'name' => 'Md. Abu Hossain'],
                ['pin' => 782, 'name' => 'Md. Bulbul Hossain'],
                ['pin' => 1042, 'name' => 'Md. Belal Hossen Sardar'],
                ['pin' => 777, 'name' => 'Saral'],
                ['pin' => 1083, 'name' => 'Md. Israfil Alam'],
            ],
            'Fatepur' => [
                ['pin' => 540, 'name' => 'Sojol  Kumer'],
                ['pin' => 829, 'name' => 'Ritu Parna'],
                ['pin' => 1072, 'name' => 'Md. Rahmat Ali'],
                ['pin' => 1098, 'name' => 'Md. Aminul Islam'],
                ['pin' => 814, 'name' => 'Md. Masud Rana'],
            ],
            'Hatgangopara' => [
                ['pin' => 22, 'name' => 'Md. Abu Selim'],
                ['pin' => 502, 'name' => 'Md. Nahid  Parvez'],
                ['pin' => 864, 'name' => 'Gotam Kumar'],
                ['pin' => 822, 'name' => 'Mst. Morgina Khatun'],
            ],
            'Adamdighi (RO)' => [
                ['pin' => 267, 'name' => 'Ranjoy Kumar'],
                ['pin' => 1034, 'name' => 'Forhad Hossain'],
                ['pin' => 1075, 'name' => 'Md. C.M Safaet Hossain Shourove'],
                ['pin' => 1095, 'name' => 'Md. Kamal Hossain'],
                ['pin' => 900, 'name' => 'Juwel Rana'],
            ],
            'Tilokpur' => [
                ['pin' => 180, 'name' => 'Md. Kamal Hossain'],
                ['pin' => 941, 'name' => 'Abdur Rakib'],
                ['pin' => 1059, 'name' => 'Chanchal Kumar Shaha'],
                ['pin' => 880, 'name' => 'Md. Moshiur Rahman'],
            ],
            'Saharpokur' => [
                ['pin' => 879, 'name' => 'Md. Jakir Hossain'],
                ['pin' => 1010, 'name' => 'Shamim Islam'],
                ['pin' => 1018, 'name' => 'Muhibullah'],
                ['pin' => 495, 'name' => 'Chanchal Ghosh'],
            ],
            'Abadpokur' => [
                ['pin' => 17, 'name' => 'Md. Jamil Uddin'],
                ['pin' => 257, 'name' => 'Md. Milon hossain'],
                ['pin' => 613, 'name' => 'Md. Shohel  Mahbub'],
                ['pin' => 600, 'name' => 'Mst. Josna Ara'],
                ['pin' => 841, 'name' => 'Md. Sweet Rana'],
                ['pin' => 798, 'name' => 'Dipu Mohonto'],
            ],
            'Hatkoroi' => [
                ['pin' => 1005, 'name' => 'Nasir Uddin'],
                ['pin' => 843, 'name' => 'Nahid Hasan'],
                ['pin' => 948, 'name' => 'Md. Jahangir Alam'],
                ['pin' => 964, 'name' => 'Md. Limon Mia'],
                ['pin' => 1093, 'name' => 'Mst. Nisfama Khatun'],
                ['pin' => 915, 'name' => 'Md. Ariful Islam'],
            ],
            'Kahalu' => [
                ['pin' => 1099, 'name' => 'Md. Shafiul Bari'],
                ['pin' => 617, 'name' => 'Md. Abdul  Malek'],
            ],
            'Naogaon Sadar (RO)' => [
                ['pin' => 225, 'name' => 'Md. Shakil Hossain'],
                ['pin' => 324, 'name' => 'Md. Rashel Pk'],
                ['pin' => 567, 'name' => 'Md. Abdus Salam'],
                ['pin' => 826, 'name' => 'Md. Chanchal Islam Mandal'],
                ['pin' => 866, 'name' => 'Nahid Hasan'],
                ['pin' => 1030, 'name' => 'Md. Mostafizur Rahman'],
                ['pin' => 999, 'name' => 'Md. Momin Mukter'],
            ],
            'Santahar' => [
                ['pin' => 405, 'name' => 'Amol  Kumar'],
                ['pin' => 663, 'name' => 'Biplop  Chandra'],
                ['pin' => 851, 'name' => 'Md. Rasheduzzaman'],
                ['pin' => 1036, 'name' => 'Md. Zakir Hossain'],
                ['pin' => 865, 'name' => 'Md. Ashikur Rahman'],
            ],
            'Shoilgachi' => [
                ['pin' => 351, 'name' => 'Md. Abdul Aziz'],
                ['pin' => 878, 'name' => 'Utpal Kumar'],
                ['pin' => 722, 'name' => 'Md. Sagor Hossain'],
                ['pin' => 995, 'name' => 'Md. Nazmul Karim'],
            ],
            'Hapania' => [
                ['pin' => 330, 'name' => 'Md. Sadekul Islam'],
                ['pin' => 945, 'name' => 'Milon Babu'],
                ['pin' => 859, 'name' => 'Sahin Ali'],
                ['pin' => 981, 'name' => 'Md. Rezaul Karim'],
                ['pin' => 886, 'name' => 'Md. Imran Ali'],
            ],
            'Katkhoir' => [
                ['pin' => 428, 'name' => 'Md. Abul Hasan'],
                ['pin' => 618, 'name' => 'Md. Rahidul Islam'],
                ['pin' => 668, 'name' => 'Md. Rabiul  Alam'],
                ['pin' => 749, 'name' => 'Md. Jillur Rahman Sardar'],
            ],
            'Paharpur (RO)' => [
                ['pin' => 395, 'name' => 'Abu Jihan'],
                ['pin' => 928, 'name' => 'Shanta Islam'],
                ['pin' => 892, 'name' => 'Md. Sohorab Hossain'],
                ['pin' => 1096, 'name' => 'Md. Mamunur Rashid Mamun'],
                ['pin' => 987, 'name' => 'Md. Yusuf Ali'],
            ],
            'Badalgachi' => [
                ['pin' => 446, 'name' => 'Lata  Rani'],
                ['pin' => 976, 'name' => 'Md. Rimon Hossin'],
                ['pin' => 375, 'name' => 'Md. Ruhul Kuddus'],
                ['pin' => 661, 'name' => 'Polash Kumar Sarker'],
                ['pin' => 849, 'name' => 'Md. Latiful Khabir'],
            ],
            'Nazipur' => [
                ['pin' => 683, 'name' => 'Mst. Queen Akter'],
                ['pin' => 951, 'name' => 'Md. Saroar Hossain'],
                ['pin' => 1064, 'name' => 'Md. Mahbur Rahman'],
                ['pin' => 564, 'name' => 'Md. Shafiqul Islam'],
            ],
            'Kirtipur' => [
                ['pin' => 209, 'name' => 'Mst. Tanzila Khatun'],
                ['pin' => 993, 'name' => 'Md. Sohan Hossain'],
                ['pin' => 1044, 'name' => 'Md. Sumon Rana'],
                ['pin' => 716, 'name' => 'Md. Asadul  Haque'],
            ],
            'Akkelpur' => [
                ['pin' => 972, 'name' => 'Abdul Motin'],
                ['pin' => 1056, 'name' => 'Zakaria Hosen'],
                ['pin' => 898, 'name' => 'Hirok Kumar'],
            ],
            'Khetlal (RO)' => [
                ['pin' => 967, 'name' => 'Md. Liton Miya'],
                ['pin' => 1049, 'name' => 'Md. Rezaul Karim'],
                ['pin' => 1082, 'name' => 'Md. Manik Hossain'],
                ['pin' => 1037, 'name' => 'Md. Jakaria Habib'],
            ],
            'Chanpara' => [
                ['pin' => 303, 'name' => 'Md. Rashed Hossain'],
                ['pin' => 1051, 'name' => 'Md. Shaju Mia'],
                ['pin' => 1084, 'name' => 'Md. Mir Shahid Hossain'],
                ['pin' => 973, 'name' => 'Soumen Kumar Mondal'],
            ],
            'Kichok' => [
                ['pin' => 1068, 'name' => 'Md. Mostakim Hossain'],
                ['pin' => 961, 'name' => 'Md. Imran Hosen'],
                ['pin' => 1060, 'name' => 'Mst. Shyamoli Akter'],
                ['pin' => 985, 'name' => 'Md. Ripon Islam'],
            ],
            'Rajabirat' => [
                ['pin' => 1008, 'name' => 'Md. Uzzal Hossain'],
                ['pin' => 1081, 'name' => 'Rakibul Islam'],
                ['pin' => 954, 'name' => 'Md. Zakaria'],
            ],
            'Sapahar (RO)' => [
                ['pin' => 556, 'name' => 'Md. Dulal  Uddin'],
                ['pin' => 627, 'name' => 'Gawtam Kumar  Mandal'],
                ['pin' => 1006, 'name' => 'Sree Bijay Kumar Barman'],
                ['pin' => 780, 'name' => 'Masud Rana'],
                ['pin' => 688, 'name' => 'Md. Ziaul Haque'],
                ['pin' => 361, 'name' => 'Md. Aslam Ali'],
            ],
            'Shishahat (ZO)' => [
                ['pin' => 718, 'name' => 'Rabbani Sardar'],
                ['pin' => 855, 'name' => 'Ahtashamul Haque'],
                ['pin' => 1050, 'name' => 'Md. Nasim Sardar'],
                ['pin' => 895, 'name' => 'Md. Joybul Hossain'],
                ['pin' => 1070, 'name' => 'Tota Mia'],
                ['pin' => 1094, 'name' => 'Md. Aslam Hossain'],
            ],
            'Agradigun' => [
                ['pin' => 1026, 'name' => 'Mst. Rupali'],
                ['pin' => 702, 'name' => 'Md. Abdur Rahman'],
                ['pin' => 1032, 'name' => 'Md. Mostafizur Rahman'],
                ['pin' => 994, 'name' => 'Md. Jahid Rahad'],
            ],
            'Dighirhat' => [
                ['pin' => 619, 'name' => 'Rakib  Hasan'],
                ['pin' => 704, 'name' => 'Baby Ara'],
                ['pin' => 986, 'name' => 'Md. Shuvo Mondol'],
                ['pin' => 586, 'name' => 'Mahedi Hasan'],
            ],
            'Rajbari (RO)' => [
                ['pin' => 887, 'name' => 'Md. Shakil Hossain'],
                ['pin' => 1022, 'name' => 'Md. Rasel Ali'],
                ['pin' => 1065, 'name' => 'Md. Faruk Hossen'],
                ['pin' => 932, 'name' => 'Md. Asraful Islam'],
            ],
            'Dorgadanga (Tanore )' => [
                ['pin' => 925, 'name' => 'Md. Somrat Hossain'],
                ['pin' => 1069, 'name' => 'Miss. Bipasha Aktar'],
                ['pin' => 1080, 'name' => 'Md. Fazor Ali'],
                ['pin' => 1085, 'name' => 'Md. Tamim Hasan Nahul'],
                ['pin' => 846, 'name' => 'Md. Rajidul Islam'],
            ],
            'Chawbaria' => [
                ['pin' => 102, 'name' => 'Md. A. Kuddus Sardar'],
                ['pin' => 590, 'name' => 'Md. Ranju Ahmed'],
                ['pin' => 894, 'name' => 'Md. Ripon Hosen'],
                ['pin' => 1024, 'name' => 'Mst. Rina Khatun'],
                ['pin' => 1028, 'name' => 'Md. Mostafizur Rahman'],
                ['pin' => 902, 'name' => 'Md. Ali Hashan'],
                ['pin' => 891, 'name' => 'Md. Mizanur Rahman'],
            ],
            'Nachol' => [
                ['pin' => 699, 'name' => 'Mst. Rahima Khatun'],
                ['pin' => 1025, 'name' => 'Tutul Rana'],
                ['pin' => 1071, 'name' => 'Kanok Chandra'],
                ['pin' => 875, 'name' => 'Mst. Rajea Sultana'],
            ],
            'Mohadebpur (RO)' => [
                ['pin' => 669, 'name' => 'Md. Nishat  Hossain'],
                ['pin' => 592, 'name' => 'Md. Asaduzzaman'],
                ['pin' => 1029, 'name' => 'Md. Mostakim'],
                ['pin' => 670, 'name' => 'Md. Rustom Ali'],
            ],
            'Chatra' => [
                ['pin' => 91, 'name' => 'Md. Rezaul Karim'],
                ['pin' => 731, 'name' => 'Md. Asaduzzaman'],
                ['pin' => 1035, 'name' => 'Md. Mahmudul Hasan'],
                ['pin' => 953, 'name' => 'Md. Parvaj Kabir'],
                ['pin' => 943, 'name' => 'Md. Abdul Hai'],
                ['pin' => 839, 'name' => 'Sohel Rana'],
            ],
            'Cheragpur' => [
                ['pin' => 840, 'name' => 'Md. Borhanur Alam'],
                ['pin' => 660, 'name' => 'Md. Abdul  Tuhin'],
                ['pin' => 1015, 'name' => 'Md. Aslam Hossain'],
                ['pin' => 1041, 'name' => 'Md. Kurban Ali'],
                ['pin' => 975, 'name' => 'Md. Abu Sufian Mia'],
            ],
            'Sibpur' => [
                ['pin' => 832, 'name' => 'Md. Samim Hossain'],
                ['pin' => 934, 'name' => 'Md. Nahid Rana'],
                ['pin' => 1001, 'name' => 'Abu Sufiyan'],
                ['pin' => 1076, 'name' => 'Md. Sabbir Hossain'],
                ['pin' => 515, 'name' => 'Sobuj Hosain'],
            ],
        ];

        $created = 0;
        $skipped = 0;

        foreach ($branchesWithOfficers as $branchListName => $officers) {
            $branchCode = self::BRANCH_NAME_TO_CODE[$branchListName] ?? null;

            if (! $branchCode) {
                $this->command?->warn("Branch name '{$branchListName}' not mapped to any code. Skipping.");
                continue;
            }

            $branch = Branch::where('code', $branchCode)->first();

            if (! $branch) {
                $this->command?->warn("Branch not found for code {$branchCode} ({$branchListName}). Skipping its field officers.");
                continue;
            }

            foreach ($officers as $officer) {
                $pin = (string) $officer['pin'];
                $email = self::PIN_TO_EMAIL[$pin] ?? "{$pin}@misloan.com";

                // আগে যাদের create করা আছে (একই PIN/username/email) — skip; শুধু যারা নাই ওদের create করব
                $exists = User::where('username', $pin)
                    ->orWhere('pin', $pin)
                    ->orWhere('email', $email)
                    ->exists();

                if ($exists) {
                    $skipped++;
                    continue;
                }

                User::create([
                    'name' => $officer['name'],
                    'email' => $email,
                    'phone' => null,
                    'username' => $pin,
                    'password' => Hash::make(self::PASSWORD),
                    'role_id' => $fieldOfficerRole->id,
                    'branch_id' => $branch->id,
                    'has_all_access' => false,
                    'is_active' => true,
                    'pin' => $pin,
                    'email_verified_at' => now(),
                ]);

                $created++;
            }
        }

        $this->command?->info("Field officers: {$created} created, {$skipped} skipped.");
    }
}

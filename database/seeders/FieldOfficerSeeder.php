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
     * Run the database seeds.
     *
     * Creates users for branch field officers based on a hardcoded list.
     * - Username: PIN
     * - Email: given email, or PIN@misloan.com if missing
     * - Password: 12345678
     * - Role: field_officer
     */
    public function run(): void
    {
        $fieldOfficerRole = Role::where('name', Role::FIELD_OFFICER)->first();

        if (! $fieldOfficerRole) {
            $this->command?->warn('Field officer role not found. Run RoleSeeder first.');
            return;
        }

        $branches = [
            [
                'branch_code' => '001',
                'branch_name' => 'Naogaon Sodor',
                'field_officers' => [
                    ['name' => 'Nahid Hasan', 'pin' => '0866', 'email' => 'ns299990@gmail.com'],
                    ['name' => 'Rasel', 'pin' => '324', 'email' => null],
                    ['name' => 'Salam', 'pin' => '567', 'email' => null],
                    ['name' => 'Momin', 'pin' => '999', 'email' => null],
                    ['name' => 'Chanchal', 'pin' => '826', 'email' => null],
                    ['name' => 'Mostafiz', 'pin' => '1030', 'email' => null],
                    ['name' => 'Shakil', 'pin' => '225', 'email' => null],
                ],
            ],
            [
                'branch_code' => '003',
                'branch_name' => 'Raninagar',
                'field_officers' => [
                    ['name' => 'Saral', 'pin' => '777', 'email' => 'shorolhossain88@gmail.com'],
                    ['name' => 'Md. Ashadul Islam', 'pin' => '0735', 'email' => 'mdashadulis312@gmail'],
                    ['name' => 'Md Bulbul ', 'pin' => '782', 'email' => 'bmdo60523@gmail.com'],
                ],
            ],
            [
                'branch_code' => '010',
                'branch_name' => 'Saharপুকুর',
                'field_officers' => [
                    ['name' => 'Chanchal Ghosh', 'pin' => '495', 'email' => 'goshe14@gmail.com'],
                    ['name' => 'Md. Jakir Hosen', 'pin' => '879', 'email' => 'jakirkahalue@gmail.com'],
                    ['name' => 'Shamim Islam', 'pin' => '1010', 'email' => 'ishamim319@gmail.com'],
                    ['name' => 'Mohibullah', 'pin' => '1018', 'email' => 'rimom4701@gmail.com'],
                ],
            ],
            [
                'branch_code' => '013',
                'branch_name' => 'Betgari',
                'field_officers' => [
                    ['name' => 'Manik Kumar', 'pin' => '708', 'email' => 'roymanik@gmail.com'],
                    ['name' => 'Manik Kumar', 'pin' => '708', 'email' => 'roymanik984@gmail.com'],
                ],
            ],
            [
                'branch_code' => '021',
                'branch_name' => 'Sapahar',
                'field_officers' => [
                    ['name' => 'Bijay Kumar Barman', 'pin' => '1006', 'email' => 'g'],
                    ['name' => 'Gautam Kumar', 'pin' => '627', 'email' => 'j'],
                    ['name' => 'Md. Masud Rana', 'pin' => '780', 'email' => 'o'],
                    ['name' => 'Md. Dulal Uddin', 'pin' => '00556', 'email' => 'dhdurjoy88@gmail.com'],
                    ['name' => 'Md. Aslam Ali', 'pin' => '00361', 'email' => 'mdaslamali2468@gmail.com'],
                    ['name' => 'Md. Ziaul Haque', 'pin' => '0688', 'email' => 'ziaulhaque0175180121'],
                ],
            ],
            [
                'branch_code' => '023',
                'branch_name' => 'Fatepur',
                'field_officers' => [
                    ['name' => 'Sojol Kumar', 'pin' => '540', 'email' => 'sozolkumar1991@gmail.com'],
                    ['name' => 'Masud Rana', 'pin' => '814', 'email' => 'mr4115913@gmail.com'],
                    ['name' => 'Rituparna', 'pin' => '829', 'email' => 'ritupornaxy8@gmail.com'],
                    ['name' => 'Rohmat Ali', 'pin' => '1072', 'email' => 'mrohmatali739@gmail.com'],
                ],
            ],
            [
                'branch_code' => '030',
                'branch_name' => 'Dighirhat',
                'field_officers' => [
                    ['name' => 'Shuvo Mondol', 'pin' => '986', 'email' => 'shuvomondol970@gmail.com'],
                    ['name' => 'Rakib Hasan', 'pin' => '619', 'email' => 'rakibhasan4629@gmail.com'],
                    ['name' => 'Mehedi Hasan', 'pin' => '586', 'email' => 'mdmahdihasanh263@gmail.com'],
                    ['name' => 'Bebiyara', 'pin' => '704', 'email' => 'babyaramst3@gmail.com'],
                ],
            ],
            [
                'branch_code' => '033',
                'branch_name' => 'Rajbari',
                'field_officers' => [
                    ['name' => 'Md. Shakil Hosen', 'pin' => '887', 'email' => null],
                    ['name' => 'Md. Ashraful Islam', 'pin' => '932', 'email' => null],
                    ['name' => 'Md. Rasel Ali', 'pin' => '1022', 'email' => null],
                    ['name' => 'Md. Faruk Hosen', 'pin' => '1065', 'email' => null],
                ],
            ],
            [
                'branch_code' => '034',
                'branch_name' => 'Agradwigon',
                'field_officers' => [
                    ['name' => 'Jahid Rahad', 'pin' => '994', 'email' => 'rahadj50@gmail.com'],
                    ['name' => 'Abdur Rahman', 'pin' => '702', 'email' => 'abdurrohomanmousumingo@gmail.com'],
                    ['name' => 'Md. Mostafizur Rahman', 'pin' => '1032', 'email' => 'mostafizurrohoman669@gmail.com'],
                    ['name' => 'Mst. Rupali', 'pin' => '1026', 'email' => null],
                ],
            ],
            [
                'branch_code' => '040',
                'branch_name' => 'Kichok',
                'field_officers' => [
                    ['name' => 'Md. Imran Hosen', 'pin' => '0961', 'email' => 'imranhosenimran93@gmail.com'],
                    ['name' => 'Md. Ripon Islam', 'pin' => '0985', 'email' => 'riponislamripon905@gmail.com'],
                    ['name' => 'Md. Mostakim Hosen', 'pin' => '1068', 'email' => 'mostakim323332@gmail.com'],
                    ['name' => 'Mst. Shyamoli Akter', 'pin' => '1060', 'email' => 'Shyamoliakter5555@gmail.com'],
                ],
            ],
            [
                'branch_code' => '042',
                'branch_name' => 'Kahalu',
                'field_officers' => [
                    ['name' => 'Md. Abdul Malek', 'pin' => '617', 'email' => 'malikngn@gmail.com'],
                ],
            ],
        ];

        foreach ($branches as $branchData) {
            // Our list uses 3-digit codes; DB stores 4-digit codes → pad with leading zero.
            $paddedCode = str_pad($branchData['branch_code'], 4, '0', STR_PAD_LEFT);
            $branch = Branch::where('code', $paddedCode)->first();

            if (! $branch) {
                $this->command?->warn("Branch not found for code {$paddedCode} ({$branchData['branch_name']}). Skipping its field officers.");
                continue;
            }

            foreach ($branchData['field_officers'] as $officer) {
                $pin = $officer['pin'];
                $email = $officer['email'] ?: "{$pin}@misloan.com";

                // Avoid creating duplicate users for same PIN
                $exists = User::where('username', $pin)
                    ->orWhere('pin', $pin)
                    ->exists();

                if ($exists) {
                    $this->command?->info("User already exists for PIN {$pin}. Skipping.");
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

                $this->command?->info("Field officer user created: {$officer['name']} ({$pin}) for branch {$branch->code}.");
            }
        }
    }
}


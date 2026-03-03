<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Branch User Seeder: প্রতিটি শাখার জন্য branch code দিয়ে Branch User role এ এক জন ইউজার।
 * Branch Manager পরে আলাদা সিডার বা এডমিন থেকে যোগ করুন।
 *
 * ডাটাবেজে থাকা পুরনো ইউজার আপডেট করতে (আগে Branch Manager ছিল যারা):
 *   php artisan db:seed --class=UserSeeder
 *
 * টিঙ্কার দিয়ে একই কাজ:
 *   php artisan tinker
 *   >>> (new \Database\Seeders\UserSeeder)->run();
 */
class UserSeeder extends Seeder
{
    /**
     * Branch users: প্রতিটি শাখার জন্য Branch User role দিয়ে এক জন ইউজার (branch code দিয়ে).
     * Branch Manager পরে আলাদাভাবে create করা যাবে।
     */
    public function run(): void
    {
        $branchUserRole = Role::where('name', 'branch_user')->first();
        if (!$branchUserRole) {
            $this->command->warn('branch_user role not found. Run RoleSeeder first.');
            return;
        }

        $branches = Branch::orderBy('code')->get();

        foreach ($branches as $branch) {
            $email = $branch->code . '@misloan.com';
            $name = preg_replace('/\s*Branch\s*$/i', '', $branch->name) . ' User';

            User::updateOrCreate(
                ['email' => $email],
                [
                    'name'       => $name,
                    'username'   => $branch->code,
                    'role_id'    => $branchUserRole->id,
                    'branch_id'  => $branch->id,
                    'password'   => Hash::make('12345678'),
                    'is_active'  => true,
                ]
            );
        }

        // Branch code অনুজায়ী অফিসিয়াল ইমেইল আপডেট (Branch + Branch User)
        $emailMap = [
            '0001' => 'naogaon0001@gmail.com',
            '0002' => 'attrai00002@gmail.com',
            '0003' => 'raninagar0003@gmail.com',
            '0004' => 'bhabanipur0004@gmail.com',
            '0005' => 'bandaikhara0005@gmail.com',
            '0006' => 'kirtipur0006@gmail.com',
            '0007' => 'abadpokur007@gmail.com',
            '0008' => 'hapania0008@gmail.com',
            '0009' => 'badalgachi012@gmail.com',
            '0010' => 'saharpokur0010@gmail.com',
            '0011' => 'adamdighi0011@gmail.com',
            '0012' => 'shailgachi0012@gmail.com',
            '0013' => 'betgari0013@gmail.com',
            '0014' => 'tilokpur0014@gmail.com',
            '0015' => 'cheragpur0016@gmail.com',
            '0016' => 'nazipur0017@gmail.com',
            '0017' => 'mohadebpur0018@gmail.com',
            '0018' => 'santaharbranch@gmail.com',
            '0019' => 'paharpur0019@gmail.com',
            '0020' => 'chatra0020@gmail.com',
            '0021' => 'sapahar0021@gmail.com',
            '0022' => 'chawbaria0022@gmail.com',
            '0023' => 'fatepur0023@gmail.com',
            '0024' => 'branchshishahat@gmail.com',
            '0025' => 'hatgangopara0025@gmail.com',
            '0026' => 'katkhoir0026@gmail.com',
            '0027' => 'hatkoroi0027@gmail.com',
            '0028' => 'khajura0028@gmail.com',
            '0029' => 'shibpur0029@gmail.com',
            '0030' => 'dighirhat0030@gmail.com',
            '0031' => 'naldanga0031@gmail.com',
            '0032' => 'somaspara0032@gmail.com',
            '0033' => 'rajbari0033@gmail.com',
            '0034' => 'agradigun0034@gmail.com',
            '0035' => 'durgadanga0035@gmail.com',
            '0036' => 'nachol00036@gmail.com',
            '0037' => 'akkelpur0037@gmail.com',
            '0038' => 'khetlal0038@gmail.com',
            '0039' => 'chanpara039@gmail.com',
            '0040' => 'kichok0040@gmail.com',
            '0041' => 'rajabirat0041@gmail.com',
            '0042' => 'kahaloo0042@gmail.com',
        ];

        foreach ($emailMap as $code => $email) {
            // Branch টেবিল আপডেট
            $branch = Branch::where('code', $code)->first();
            if ($branch) {
                $branch->update(['email' => $email]);
            }

            // Branch User (username = branch code) আপডেট
            User::where('username', $code)->update(['email' => $email]);
        }

        $this->command->info('Branch users seeded: ' . $branches->count() . ' (Branch User role). Branch Manager পরে আলাদা করে যোগ করুন।');
    }
}

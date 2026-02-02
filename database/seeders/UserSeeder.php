<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Branch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get role ID
        $branchManagerRole = Role::where('name', 'branch_manager')->first();

        $users = [
            ['id' => 2, 'name' => 'Atrai Manager', 'email' => '0002@misloan.com', 'username' => '0002', 'role_id' => $branchManagerRole->id],
            ['id' => 3, 'name' => 'Bhabanipur Manager', 'email' => '0004@misloan.com', 'username' => '0004', 'role_id' => $branchManagerRole->id],
            ['id' => 4, 'name' => 'Khajura Manager', 'email' => '0028@misloan.com', 'username' => '0028', 'role_id' => $branchManagerRole->id],
            ['id' => 5, 'name' => 'Naldanga Manager', 'email' => '0031@misloan.com', 'username' => '0031', 'role_id' => $branchManagerRole->id],
            ['id' => 6, 'name' => 'Samaspara Manager', 'email' => '0032@misloan.com', 'username' => '0032', 'role_id' => $branchManagerRole->id],
            ['id' => 7, 'name' => 'Abadpukur Manager', 'email' => '0007@misloan.com', 'username' => '0007', 'role_id' => $branchManagerRole->id],
            ['id' => 8, 'name' => 'Saharpukur Manager', 'email' => '0010@misloan.com', 'username' => '0010', 'role_id' => $branchManagerRole->id],
            ['id' => 9, 'name' => 'Adamdighi Manager', 'email' => '0011@misloan.com', 'username' => '0011', 'role_id' => $branchManagerRole->id],
            ['id' => 10, 'name' => 'Hatkoroi Manager', 'email' => '0027@misloan.com', 'username' => '0027', 'role_id' => $branchManagerRole->id],
            ['id' => 11, 'name' => 'Kahaloo Manager', 'email' => '0042@misloan.com', 'username' => '0042', 'role_id' => $branchManagerRole->id],
            ['id' => 12, 'name' => 'Raninagar Manager', 'email' => '0003@misloan.com', 'username' => '0003', 'role_id' => $branchManagerRole->id],
            ['id' => 13, 'name' => 'Bandaikhara Manager', 'email' => '0005@misloan.com', 'username' => '0005', 'role_id' => $branchManagerRole->id],
            ['id' => 14, 'name' => 'Fatepur Manager', 'email' => '0023@misloan.com', 'username' => '0023', 'role_id' => $branchManagerRole->id],
            ['id' => 15, 'name' => 'Naogaon Sadar Manager', 'email' => '0001@misloan.com', 'username' => '0001', 'role_id' => $branchManagerRole->id],
            ['id' => 16, 'name' => 'Shailgachi Manager', 'email' => '0012@misloan.com', 'username' => '0012', 'role_id' => $branchManagerRole->id],
            ['id' => 17, 'name' => 'Tilakpur Manager', 'email' => '0014@misloan.com', 'username' => '0014', 'role_id' => $branchManagerRole->id],
            ['id' => 18, 'name' => 'Santahar Manager', 'email' => '0015@misloan.com', 'username' => '0015', 'role_id' => $branchManagerRole->id],
            ['id' => 19, 'name' => 'Katkhair Manager', 'email' => '0026@misloan.com', 'username' => '0026', 'role_id' => $branchManagerRole->id],
            ['id' => 20, 'name' => 'Khetlal Manager', 'email' => '0038@misloan.com', 'username' => '0038', 'role_id' => $branchManagerRole->id],
            ['id' => 21, 'name' => 'Chanpara Manager', 'email' => '0039@misloan.com', 'username' => '0039', 'role_id' => $branchManagerRole->id],
            ['id' => 22, 'name' => 'Kichok Manager', 'email' => '0040@misloan.com', 'username' => '0040', 'role_id' => $branchManagerRole->id],
            ['id' => 23, 'name' => 'Rajabirat Manager', 'email' => '0041@misloan.com', 'username' => '0041', 'role_id' => $branchManagerRole->id],
            ['id' => 24, 'name' => 'Kritipur Manager', 'email' => '0006@misloan.com', 'username' => '0006', 'role_id' => $branchManagerRole->id],
            ['id' => 25, 'name' => 'Badalgachi Manager', 'email' => '0009@misloan.com', 'username' => '0009', 'role_id' => $branchManagerRole->id],
            ['id' => 26, 'name' => 'Akkelpur Manager', 'email' => '0037@misloan.com', 'username' => '0037', 'role_id' => $branchManagerRole->id],
            ['id' => 27, 'name' => 'Hapania Manager', 'email' => '0008@misloan.com', 'username' => '0008', 'role_id' => $branchManagerRole->id],
            ['id' => 28, 'name' => 'Charagpur Manager', 'email' => '0016@misloan.com', 'username' => '0016', 'role_id' => $branchManagerRole->id],
            ['id' => 29, 'name' => 'Mohadebpur Manager', 'email' => '0018@misloan.com', 'username' => '0018', 'role_id' => $branchManagerRole->id],
            ['id' => 30, 'name' => 'Chatra Manager', 'email' => '0020@misloan.com', 'username' => '0020', 'role_id' => $branchManagerRole->id],
            ['id' => 31, 'name' => 'Shibpur Manager', 'email' => '0029@misloan.com', 'username' => '0029', 'role_id' => $branchManagerRole->id],
            ['id' => 32, 'name' => 'Sapahar Manager', 'email' => '0021@misloan.com', 'username' => '0021', 'role_id' => $branchManagerRole->id],
            ['id' => 33, 'name' => 'Shishahat Manager', 'email' => '0024@misloan.com', 'username' => '0024', 'role_id' => $branchManagerRole->id],
            ['id' => 34, 'name' => 'Digirhat Manager', 'email' => '0030@misloan.com', 'username' => '0030', 'role_id' => $branchManagerRole->id],
            ['id' => 35, 'name' => 'Agradigun Manager', 'email' => '0034@misloan.com', 'username' => '0034', 'role_id' => $branchManagerRole->id],
            ['id' => 36, 'name' => 'Betgari Manager', 'email' => '0013@misloan.com', 'username' => '0013', 'role_id' => $branchManagerRole->id],
            ['id' => 37, 'name' => 'Nazipur Manager', 'email' => '0017@misloan.com', 'username' => '0017', 'role_id' => $branchManagerRole->id],
            ['id' => 38, 'name' => 'Paharpur Manager', 'email' => '0019@misloan.com', 'username' => '0019', 'role_id' => $branchManagerRole->id],
            ['id' => 39, 'name' => 'Chaubaria Hat Manager', 'email' => '0022@misloan.com', 'username' => '0022', 'role_id' => $branchManagerRole->id],
            ['id' => 40, 'name' => 'Hat Gangopara Manager', 'email' => '0025@misloan.com', 'username' => '0025', 'role_id' => $branchManagerRole->id],
            ['id' => 41, 'name' => 'Rajbari Manager', 'email' => '0033@misloan.com', 'username' => '0033', 'role_id' => $branchManagerRole->id],
            ['id' => 42, 'name' => 'Dorgadanga Manager', 'email' => '0035@misloan.com', 'username' => '0035', 'role_id' => $branchManagerRole->id],
            ['id' => 43, 'name' => 'Nachol Manager', 'email' => '0036@misloan.com', 'username' => '0036', 'role_id' => $branchManagerRole->id],
        ];

        foreach ($users as $user) {
            // Find branch by code (username matches branch code)
            $branch = Branch::where('code', $user['username'])->first();

            User::create([
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'username' => $user['username'],
                'role_id' => $user['role_id'],
                'branch_id' => $branch ? $branch->id : null,
                'password' => Hash::make('password'), // Default password
            ]);
        }
    }
}

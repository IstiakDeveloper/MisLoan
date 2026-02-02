# Member Admission Pages - Completed & Remaining Changes

## ✅ Completed Changes in Create.tsx:

1. **Imported bangladeshAddresses.json** - Dynamic address data available
2. **Added address state variables** - presentDistricts, presentUpazilas, permanentDistricts, permanentUpazilas
3. **Added 4 useEffect hooks** - Auto-update districts and upazilas based on selection
4. **Updated steps array** - Removed Step 6, renumbered all steps, added Bengali labels in parentheses
5. **Steps now 10 instead of 11** - Economic Activities tab removed

## 🔧 Manual Changes Still Needed:

### A. Update ALL Field Labels to Include Bengali

Find and replace all field labels with format: **"English (বাংলা)"**

Common replacements needed:
```tsx
// Step 1
"Branch" → "Branch (শাখা)"
"Samity" → "Samity (সমিতি)"
"Member Category" → "Member Category (সদস্য ক্যাটাগরি)"
"Survey Date" → "Survey Date (জরিপ তারিখ)"
"Admission Date" → "Admission Date (ভর্তি তারিখ)"

// Step 2
"Applicant Name (English)" → "Applicant Name - English (আবেদনকারীর নাম - ইংরেজি)"
"Applicant Name (Bangla)" → "Applicant Name - Bangla (আবেদনকারীর নাম - বাংলা)"
"Father Name (English)" → "Father Name - English (পিতার নাম - ইংরেজি)"
"Father Name (Bangla)" → "Father Name - Bangla (পিতার নাম - বাংলা)"
"Mother Name (English)" → "Mother Name - English (মাতার নাম - ইংরেজি)"
"Mother Name (Bangla)" → "Mother Name - Bangla (মাতার নাম - বাংলা)"
"Spouse Name (English)" → "Spouse Name - English (স্বামী/স্ত্রীর নাম - ইংরেজি)"
"Spouse Name (Bangla)" → "Spouse Name - Bangla (স্বামী/স্ত্রীর নাম - বাংলা)"
"Marital Status" → "Marital Status (বৈবাহিক অবস্থা)"
"Mobile Number" → "Mobile Number (মোবাইল নম্বর)"
"Alternative Mobile" → "Alternative Mobile (বিকল্প মোবাইল)"

// Step 3 - Address fields already have Bengali added in next section

// Step 4
"NID Number" → "NID Number (এনআইডি নম্বর)"
"Smart Card Number" → "Smart Card Number (স্মার্ট কার্ড নম্বর)"
"Birth Certificate Number" → "Birth Certificate Number (জন্ম নিবন্ধন নম্বর)"
"Date of Birth" → "Date of Birth (জন্ম তারিখ)"
"Gender" → "Gender (লিঙ্গ)"
"Family Member Mobile" → "Family Member Mobile (পরিবারের সদস্যের মোবাইল)"

// Step 5
"Guarantor Name" → "Guarantor Name (জামিনদারের নাম)"
"Guarantor Mobile" → "Guarantor Mobile (জামিনদারের মোবাইল)"
"TIN Number" → "TIN Number (টিআইএন নম্বর)"
"Want SMS Service" → "Want SMS Service (এসএমএস সেবা চান)"

// Step 6 (Property)
"Total Asset Value" → "Total Asset Value (মোট সম্পদের মূল্য)"
"House Type" → "House Type (বাড়ির ধরন)"
"Mud House Count" → "Mud House Count (মাটির ঘর সংখ্যা)"
"Tin House Count" → "Tin House Count (টিনের ঘর সংখ্যা)"
"Brick House Count" → "Brick House Count (ইটের ঘর সংখ্যা)"
"Semi Brick House Count" → "Semi Brick House Count (আধা-পাকা ঘর সংখ্যা)"
"Cow/Buffalo Count" → "Cow/Buffalo Count (গরু/মহিষ সংখ্যা)"
"Goat/Sheep Count" → "Goat/Sheep Count (ছাগল/ভেড়া সংখ্যা)"
"Duck/Chicken Count" → "Duck/Chicken Count (হাঁস/মুরগি সংখ্যা)"
"Other Livestock" → "Other Livestock (অন্যান্য গবাদি পশু)"
"Cultivable Land (Acres)" → "Cultivable Land - Acres (আবাদযোগ্য জমি - শতক)"
"Cultivable Land Value" → "Cultivable Land Value (আবাদযোগ্য জমির মূল্য)"
"Non-Cultivable Land (Acres)" → "Non-Cultivable Land - Acres (অনাবাদী জমি - শতক)"
"Non-Cultivable Land Value" → "Non-Cultivable Land Value (অনাবাদী জমির মূল্য)"

// Step 7 (Financial)
"Monthly Income" → "Monthly Income (মাসিক আয়)"
"Monthly Expense" → "Monthly Expense (মাসিক ব্যয়)"
"Monthly Savings" → "Monthly Savings (মাসিক সঞ্চয়)"

// Step 8 (Family Members)
"Member Name" → "Member Name (সদস্যের নাম)"
"Relationship" → "Relationship (সম্পর্ক)"
"Age (Years)" → "Age - Years (বয়স - বছর)"
"Age (Months)" → "Age - Months (বয়স - মাস)"
"Education Level" → "Education Level (শিক্ষাগত যোগ্যতা)"
"Occupation" → "Occupation (পেশা)"
"Monthly Income" → "Monthly Income (মাসিক আয়)"

// Step 9 (Other Assets)
"Asset Description" → "Asset Description (সম্পদের বিবরণ)"
"Quantity/Amount" → "Quantity/Amount (পরিমাণ)"
"Estimated Value" → "Estimated Value (আনুমানিক মূল্য)"

// Step 10 (Additional)
"Interviewer Name" → "Interviewer Name (সাক্ষাৎকারকারীর নাম)"
"Guardian Name" → "Guardian Name (অভিভাবকের নাম)"
"Other Loan Information" → "Other Loan Information (অন্যান্য ঋণের তথ্য)"
"Collector Comment" → "Collector Comment (কালেক্টর মন্তব্য)"
```

### B. Replace Address Text Inputs with Dropdowns in Step 3

Find `{currentStep === 3 &&` section and replace Division, District, Upazila fields:

```tsx
{/* Present Division */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Division (বিভাগ) <span className="text-red-500">*</span>
    </label>
    <select
        value={data.present_division}
        onChange={(e) => setData('present_division', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
        <option value="">Select Division (বিভাগ নির্বাচন করুন)</option>
        {bangladeshData.divisions.map((division) => (
            <option key={division} value={division}>{division}</option>
        ))}
    </select>
    {(errors.present_division || validationErrors.present_division) && (
        <p className="mt-1 text-sm text-red-600">{errors.present_division || validationErrors.present_division}</p>
    )}
</div>

{/* Present District */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        District (জেলা) <span className="text-red-500">*</span>
    </label>
    <select
        value={data.present_district}
        onChange={(e) => setData('present_district', e.target.value)}
        disabled={!data.present_division}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
        <option value="">Select District (জেলা নির্বাচন করুন)</option>
        {presentDistricts.map((district) => (
            <option key={district} value={district}>{district}</option>
        ))}
    </select>
    {(errors.present_district || validationErrors.present_district) && (
        <p className="mt-1 text-sm text-red-600">{errors.present_district || validationErrors.present_district}</p>
    )}
</div>

{/* Present Upazila */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Upazila (উপজেলা) <span className="text-red-500">*</span>
    </label>
    <select
        value={data.present_upazila}
        onChange={(e) => setData('present_upazila', e.target.value)}
        disabled={!data.present_district}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
        <option value="">Select Upazila (উপজেলা নির্বাচন করুন)</option>
        {presentUpazilas.map((upazila) => (
            <option key={upazila} value={upazila}>{upazila}</option>
        ))}
    </select>
    {(errors.present_upazila || validationErrors.present_upazila) && (
        <p className="mt-1 text-sm text-red-600">{errors.present_upazila || validationErrors.present_upazila}</p>
    )}
</div>

{/* Keep Union, Village/Road, Post Code as text inputs */}
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Union (ইউনিয়ন)
    </label>
    <input
        type="text"
        value={data.present_union}
        onChange={(e) => setData('present_union', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
</div>

<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Village/Road (গ্রাম/রাস্তা)
    </label>
    <input
        type="text"
        value={data.present_village_road}
        onChange={(e) => setData('present_village_road', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
</div>

<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Post Code (পোস্ট কোড)
    </label>
    <input
        type="text"
        value={data.present_post_code}
        onChange={(e) => setData('present_post_code', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
</div>
```

Do the same for **Permanent Address** section using `permanentDistricts` and `permanentUpazilas`.

### C. Remove Economic Activities Section (Step 6)

Find section starting with `{currentStep === 6 &&` that contains:
- business_details
- job_details  
- other_income_details

**DELETE the entire `{currentStep === 6 &&` block**

### D. Move to Property Information (Step 6)

Find `{currentStep === 7 &&` (which is now the new Step 6) and ADD at the top, before existing property fields:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Asset Value (মোট সম্পদের মূল্য)
        </label>
        <input
            type="number"
            value={data.total_asset_value}
            onChange={(e) => setData('total_asset_value', Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            House Type (বাড়ির ধরন)
        </label>
        <input
            type="text"
            value={data.house_type}
            onChange={(e) => setData('house_type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
    </div>
</div>
```

### E. Update All Step Numbers

Since we removed Step 6, renumber all subsequent steps:
- Old Step 7 → New Step 6 (Property) - Change `{currentStep === 7 &&` to `{currentStep === 6 &&`
- Old Step 8 → New Step 7 (Financial) - Change `{currentStep === 8 &&` to `{currentStep === 7 &&`
- Old Step 9 → New Step 8 (Family) - Change `{currentStep === 9 &&` to `{currentStep === 8 &&`
- Old Step 10 → New Step 9 (Assets) - Change `{currentStep === 10 &&` to `{currentStep === 9 &&`
- Old Step 11 → New Step 10 (Additional) - Change `{currentStep === 11 &&` to `{currentStep === 10 &&`

### F. Add Economic Fields to Family Members

In Family Members section (new Step 8), find the family member input fields and ADD after "Monthly Income":

```tsx
<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Business Details (ব্যবসা বিবরণ)
    </label>
    <textarea
        value={member.business_details || ''}
        onChange={(e) => updateFamilyMember(index, 'business_details', e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
</div>

<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Job Details (চাকরির বিবরণ)
    </label>
    <textarea
        value={member.job_details || ''}
        onChange={(e) => updateFamilyMember(index, 'job_details', e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
</div>

<div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Other Income Details (অন্যান্য আয়ের বিবরণ)
    </label>
    <textarea
        value={member.other_income_details || ''}
        onChange={(e) => updateFamilyMember(index, 'other_income_details', e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
</div>
```

### G. Update addFamilyMember Function

Find `const addFamilyMember` function and add the new fields:

```tsx
const addFamilyMember = () => {
    setData('family_members', [
        ...data.family_members!,
        {
            member_name: '',
            relation_with_head: '',
            gender: 'male',
            age_years: 0,
            age_months: 0,
            education_level: '',
            occupation: '',
            monthly_income: 0,
            business_details: '',  // ADD
            job_details: '',       // ADD
            other_income_details: '', // ADD
        },
    ]);
};
```

### H. Update Validation

Find `const validateStep` function and remove Step 6 validation (if any existed). The function should skip from Step 5 to Step 6 (new Property).

## 📋 Apply Same Changes to Edit.tsx

All the above changes need to be applied to `Edit.tsx` as well. The structure is identical, so the same find-replace operations will work.

## 🗄️ Update Backend

### Update MemberAdmissionController.php

Remove business_details, job_details, other_income_details from validation in `store()` and `update()` methods.

### Update Database Migration (if needed)

If the database doesn't have columns for family member economic fields, create a migration:

```php
public function up()
{
    Schema::table('member_family_members', function (Blueprint $table) {
        $table->text('business_details')->nullable()->after('monthly_income');
        $table->text('job_details')->nullable()->after('business_details');
        $table->text('other_income_details')->nullable()->after('job_details');
    });
}
```

### Update TypeScript Interface

In `@/types/memberAdmission.ts`, update FamilyMember interface:

```typescript
export interface FamilyMember {
    member_name: string;
    relation_with_head: string;
    gender: string;
    age_years: number;
    age_months: number;
    education_level: string;
    occupation: string;
    monthly_income: number;
    business_details?: string;
    job_details?: string;
    other_income_details?: string;
}
```

Remove from MemberAdmissionFormData:
```typescript
// Remove these:
business_details?: string;
job_details?: string;
other_income_details?: string;

// Keep these:
total_asset_value: number;
house_type: string;
```

## ✨ Summary

The major structural changes have been completed. The remaining work is:
1. Find-replace all field labels to add Bengali
2. Replace address inputs with dropdowns
3. Remove old Step 6 economic section
4. Move 2 fields to Property section
5. Add 3 fields to Family Members section
6. Update step numbers throughout
7. Apply all changes to Edit.tsx
8. Update backend validation and database if needed

These are mostly repetitive text replacements that can be done with careful find-replace operations.

# Member Admission Create/Edit Page Update Guide

## Changes Required

### 1. Bengali Labels in Parentheses
All field labels should follow format: `English Label (বাংলা লেবেল)`

Example changes needed:
```tsx
// Before
<label>Branch</label>

// After  
<label>Branch (শাখা)</label>
```

### 2. Dynamic Address Fields

Already added imports and state. Now add these useEffects after existing useEffects:

```tsx
// Update districts when present division changes
useEffect(() => {
    if (data.present_division) {
        const districts = bangladeshData.districtsByDivision[data.present_division] || [];
        setPresentDistricts(districts);
        if (!districts.includes(data.present_district)) {
            setData('present_district', '');
            setPresentUpazilas([]);
        }
    }
}, [data.present_division]);

// Update upazilas when present district changes
useEffect(() => {
    if (data.present_district) {
        const upazilas = bangladeshData.upazilasByDistrict[data.present_district] || [];
        setPresentUpazilas(upazilas);
        if (!upazilas.includes(data.present_upazila)) {
            setData('present_upazila', '');
        }
    }
}, [data.present_district]);

// Update districts when permanent division changes
useEffect(() => {
    if (data.permanent_division) {
        const districts = bangladeshData.districtsByDivision[data.permanent_division] || [];
        setPermanentDistricts(districts);
        if (!districts.includes(data.permanent_district)) {
            setData('permanent_district', '');
            setPermanentUpazilas([]);
        }
    }
}, [data.permanent_division]);

// Update upazilas when permanent district changes
useEffect(() => {
    if (data.permanent_district) {
        const upazilas = bangladeshData.upazilasByDistrict[data.permanent_district] || [];
        setPermanentUpazilas(upazilas);
        if (!upazilas.includes(data.permanent_upazila)) {
            setData('permanent_upazila', '');
        }
    }
}, [data.permanent_district]);
```

### 3. Address Dropdown Implementation

Replace text inputs with dropdowns in Step 3:

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
        <option value="">Select Division</option>
        {bangladeshData.divisions.map((division) => (
            <option key={division} value={division}>{division}</option>
        ))}
    </select>
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
    >
        <option value="">Select District</option>
        {presentDistricts.map((district) => (
            <option key={district} value={district}>{district}</option>
        ))}
    </select>
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
    >
        <option value="">Select Upazila</option>
        {presentUpazilas.map((upazila) => (
            <option key={upazila} value={upazila}>{upazila}</option>
        ))}
    </select>
</div>
```

### 4. Remove Step 6 (Economic Activities)

Update steps array from:
```tsx
const steps = [
    { id: 1, title: 'Organization & Date' },
    { id: 2, title: 'Personal Information' },
    { id: 3, title: 'Address' },
    { id: 4, title: 'Identity' },
    { id: 5, title: 'Guarantor Information' },
    { id: 6, title: 'Economic Activities' },  // REMOVE THIS
    { id: 7, title: 'Property Information' },
    { id: 8, title: 'Financial Information' },
    { id: 9, title: 'Family Members' },
    { id: 10, title: 'Other Assets' },
    { id: 11, title: 'Additional Information' },
];
```

To:
```tsx
const steps = [
    { id: 1, title: 'Organization & Date (সংস্থা ও তারিখ)' },
    { id: 2, title: 'Personal Information (ব্যক্তিগত তথ্য)' },
    { id: 3, title: 'Address (ঠিকানা)' },
    { id: 4, title: 'Identity (পরিচয়)' },
    { id: 5, title: 'Guarantor Information (জামিনদার তথ্য)' },
    { id: 6, title: 'Property Information (সম্পত্তি তথ্য)' },
    { id: 7, title: 'Financial Information (আর্থিক তথ্য)' },
    { id: 8, title: 'Family Members (পরিবারের সদস্য)' },
    { id: 9, title: 'Other Assets (অন্যান্য সম্পদ)' },
    { id: 10, title: 'Additional Information (অতিরিক্ত তথ্য)' },
];
```

### 5. Move Fields to Property Information

In Step 6 (old Step 7), ADD these fields at the top:
```tsx
{currentStep === 6 && (
    <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Property Information (সম্পত্তি তথ্য)</h3>
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
        
        {/* Rest of property fields... */}
```

### 6. Update Family Member Interface

Add economic fields to FamilyMember type in the types file:
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
    business_details?: string;  // NEW
    job_details?: string;       // NEW
    other_income_details?: string; // NEW
}
```

### 7. Update Validation

Remove Step 6 validation and adjust numbers:
```tsx
const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
        // ... existing validation
    } else if (step === 2) {
        // ... existing validation
    } else if (step === 3) {
        // ... existing validation
    } else if (step === 4) {
        // ... existing validation
    } else if (step === 5) {
        // Guarantor validation (optional)
    }
    // Step 6 removed - no validation needed
    // Steps 7-10 are optional

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
};
```

### 8. Update FormData interface

Remove from MemberAdmissionFormData:
- business_details
- job_details
- other_income_details

Keep:
- total_asset_value
- house_type

## Apply Same Changes to Edit.tsx

All the same changes should be applied to Edit.tsx file.

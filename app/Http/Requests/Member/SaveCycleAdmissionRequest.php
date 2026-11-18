<?php

namespace App\Http\Requests\Member;

use Illuminate\Foundation\Http\FormRequest;

class SaveCycleAdmissionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        foreach (['family_members', 'other_assets'] as $key) {
            if (is_string($this->input($key))) {
                $decoded = json_decode($this->input($key), true);
                $this->merge([$key => $decoded ?? $this->input($key)]);
            }
        }
    }

    public function rules(): array
    {
        $rules = ['revision' => 'required|integer|min:1', 'continue' => 'nullable|boolean'];
        foreach ([
            'applicant_name_en', 'applicant_name_bn', 'father_name_en', 'father_name_bn',
            'mother_name_en', 'mother_name_bn', 'spouse_name_en', 'spouse_name_bn',
            'guarantor_name', 'guardian_name', 'interviewer_name', 'employee_name', 'project_name',
        ] as $field) {
            $rules[$field] = 'nullable|string|max:255';
        }
        foreach ([
            'present_division', 'present_district', 'present_upazila', 'present_union', 'present_village_road',
            'permanent_division', 'permanent_district', 'permanent_upazila', 'permanent_union', 'permanent_village_road',
            'business_details', 'job_details', 'other_income_details', 'other_livestock', 'other_loan_info', 'collector_comment', 'house_type',
        ] as $field) {
            $rules[$field] = 'nullable|string|max:10000';
        }
        foreach (['mobile_number', 'alternative_mobile', 'family_member_mobile', 'guarantor_mobile', 'nid_number', 'smart_card_number', 'tin_number'] as $field) {
            $rules[$field] = 'nullable|string|max:20';
        }
        foreach (['present_post_code', 'permanent_post_code'] as $field) {
            $rules[$field] = 'nullable|string|max:10';
        }
        foreach (['present_division', 'present_district', 'present_upazila', 'present_union', 'present_village_road', 'permanent_division', 'permanent_district', 'permanent_upazila', 'permanent_union', 'permanent_village_road', 'house_type', 'other_livestock'] as $field) {
            $rules[$field] = 'nullable|string|max:255';
        }
        foreach (['survey_date', 'admission_date', 'date_of_birth'] as $field) {
            $rules[$field] = 'nullable|date';
        }
        foreach (['permanent_address_same', 'want_sms_service', 'nid_both_sides'] as $field) {
            $rules[$field] = 'nullable|boolean';
        }
        $rules['birth_certificate_number'] = 'nullable|string|max:30';
        $rules['gender'] = 'nullable|in:male,female,other';
        $rules['marital_status'] = 'nullable|in:single,married,divorced,widowed';
        $rules['member_category_id'] = 'nullable|exists:member_categories,id';
        foreach (['mud_house_count', 'tin_house_count', 'brick_house_count', 'semi_brick_house_count', 'cow_buffalo_count', 'goat_sheep_count', 'duck_chicken_count', 'other_livestock_count'] as $field) {
            $rules[$field] = 'nullable|integer|min:0';
        }
        foreach (['total_asset_value', 'cultivable_land_amount', 'cultivable_land_value', 'non_cultivable_land_amount', 'non_cultivable_land_value', 'monthly_income', 'monthly_expense', 'monthly_savings', 'requested_loan_amount', 'estimated_annual_project_income'] as $field) {
            $rules[$field] = 'nullable|numeric';
        }
        foreach (['customer_photo', 'guardian_photo', 'applicant_signature'] as $field) {
            $rules[$field] = 'nullable|image|mimes:jpeg,png,jpg,webp,gif|max:10240';
            $rules['clear_'.$field] = 'nullable|boolean';
        }
        foreach (['customer_nid_photo', 'customer_nid_back_photo', 'guardian_nid_photo'] as $field) {
            $rules[$field] = 'nullable|file|mimes:jpeg,png,jpg,webp,pdf|max:10240';
            $rules['clear_'.$field] = 'nullable|boolean';
        }
        foreach (['family_members', 'other_assets'] as $field) {
            $rules[$field] = 'sometimes|array|max:100';
        }
        foreach (['member_name', 'relation_with_head', 'education_level', 'occupation', 'business_details', 'job_details', 'other_income_details'] as $field) {
            $rules['family_members.*.'.$field] = 'nullable|string|max:255';
        }
        $rules['family_members.*.gender'] = 'nullable|in:male,female,other';
        $rules['family_members.*.marital_status'] = 'nullable|in:single,married,divorced,widowed';
        $rules['family_members.*.age_years'] = 'nullable|integer|min:0';
        $rules['family_members.*.age_months'] = 'nullable|integer|min:0|max:11';
        $rules['family_members.*.monthly_income'] = 'nullable|numeric';
        $rules['other_assets.*.asset_description'] = 'nullable|string|max:1000';
        $rules['other_assets.*.quantity_amount'] = 'nullable|string|max:255';
        $rules['other_assets.*.estimated_value'] = 'nullable|numeric';

        return $rules;
    }
}

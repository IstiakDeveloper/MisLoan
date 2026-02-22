import { useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Search, User, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SavingsApplicationForm from './Forms/SavingsApplicationForm';

interface Member {
    id: number;
    application_no: string;
    applicant_name_en: string;
    applicant_name_bn: string;
    nid_number: string;
    mobile_number: string;
    father_name_en?: string;
    mother_name_en?: string;
    spouse_name_bn?: string;
    present_village_road?: string;
    present_union?: string;
    present_upazila?: string;
    present_district?: string;
    present_post_code?: string;
    permanent_village_road?: string;
    permanent_union?: string;
    permanent_upazila?: string;
    permanent_district?: string;
    permanent_post_code?: string;
    samity?: {
        id: number;
        samity_name: string;
        samity_name_bn: string;
        samity_code: string;
    };
    status: string;
}

interface Props {
    savingsProduct: any;
    memberAdmission?: Member | null;
    branch: any;
    existingApplication?: any;
}

export default function Create({ savingsProduct, memberAdmission: initialMember, branch, existingApplication }: Props) {
    const [memberSearchQuery, setMemberSearchQuery] = useState('');
    const [memberSearchResults, setMemberSearchResults] = useState<Member[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async () => {
        const q = memberSearchQuery.trim();
        if (q.length < 2) {
            setMemberSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await fetch(`/member/savings-applications/search-members?query=${encodeURIComponent(q)}`);
            if (!response.ok) throw new Error('Search failed');
            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                setMemberSearchResults([]);
                return;
            }
            const data = await response.json();
            setMemberSearchResults(data.members || []);
        } catch {
            setMemberSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleMemberSelect = (member: Member) => {
        if (member.status !== 'approved') {
            alert('Only approved members can be selected.');
            return;
        }
        // Reload page with member_id so backend sends full member + form
        router.visit(`/member/savings-applications/create/${savingsProduct.id}?member_id=${member.id}`);
    };

    useEffect(() => {
        const q = memberSearchQuery.trim();
        if (q.length < 2) {
            setMemberSearchResults([]);
            return;
        }
        const timeoutId = setTimeout(handleSearch, 350);
        return () => clearTimeout(timeoutId);
    }, [memberSearchQuery]);

    // When member is selected (from URL member_id), show form
    if (initialMember) {
        return (
            <SavingsApplicationForm
                memberAdmission={initialMember}
                savingsProduct={savingsProduct}
                branch={branch}
                existingApplication={existingApplication}
            />
        );
    }

    const formatAmount = (n: number) => (n ?? 0).toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const durationLabel = savingsProduct?.duration_months
        ? savingsProduct.duration_months >= 12
            ? `${savingsProduct.duration_months / 12} years`
            : `${savingsProduct.duration_months} months`
        : '—';

    return (
        <AdminLayout>
            <Head title="Savings Application - Select Member" />
            <div className="max-w-3xl mx-auto p-6">
                <div className="mb-6 flex items-center gap-4">
                    <Button variant="outline" onClick={() => router.visit('/member/savings-applications')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Savings Application Form (মেয়াদী সঞ্চয় আবেদনপত্র)</h1>
                        <p className="text-sm text-gray-500">Select member to apply for savings product</p>
                    </div>
                </div>

                {/* Product summary */}
                <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <h2 className="text-sm font-semibold text-slate-700 mb-2">Selected Product (নির্বাচিত পণ্য)</h2>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                        <span className="font-medium text-gray-900">{savingsProduct.product_name}</span>
                        <span className="text-gray-600">{savingsProduct.product_name_bn}</span>
                        <span className="text-gray-500">Code: {savingsProduct.product_code}</span>
                        <span className="text-gray-500">Term: {durationLabel}</span>
                        <span className="text-gray-500">Interest: {savingsProduct.interest_rate ?? 0}%</span>
                        <span className="text-gray-500">Deposit limit: ৳{formatAmount(savingsProduct.min_amount)} – ৳{formatAmount(savingsProduct.max_amount || 0) || '—'}</span>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h2 className="text-base font-semibold text-gray-900 mb-1">Search & Select Member</h2>
                    <p className="text-sm text-gray-500 mb-4">Type name, NID, mobile or member code (minimum 2 characters)</p>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by name, NID, mobile, or application no..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="pl-10"
                            autoComplete="off"
                        />
                    </div>

                    {isSearching && (
                        <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">Searching...</p>
                    )}

                    {memberSearchQuery.trim().length >= 2 && !isSearching && memberSearchResults.length > 0 && (
                        <div className="mt-4 border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
                            {memberSearchResults.map((member) => (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                            <User className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {member.applicant_name_bn || member.applicant_name_en}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {member.application_no} · NID: {member.nid_number} · {member.mobile_number}
                                            </p>
                                            {member.samity && (
                                                <p className="text-xs text-gray-500">Samity: {member.samity.samity_name_bn}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleMemberSelect(member)}
                                        disabled={member.status !== 'approved'}
                                    >
                                        Select
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {memberSearchQuery.trim().length >= 2 && !isSearching && memberSearchResults.length === 0 && (
                        <p className="text-sm text-gray-500 mt-4">No member found. Try a different search.</p>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}

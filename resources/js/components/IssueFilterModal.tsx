import React, { useState } from 'react';
import { X, Search, AlertCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import { formatBranchLabel, sortBranchesByCode } from '@/utils/branchLabel';

interface IssueFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    zones: any[];
    areas: any[];
    branches: any[];
    onSubmit: (data: any) => void;
}

const IssueFilterModal = ({ isOpen, onClose, zones, areas, branches, onSubmit }: IssueFilterModalProps) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedZone, setSelectedZone] = useState('');
    const [selectedArea, setSelectedArea] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [searchMember, setSearchMember] = useState('');
    const [issueDescription, setIssueDescription] = useState('');
    const [applicationType, setApplicationType] = useState('admission');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            date: selectedDate,
            zone: selectedZone,
            area: selectedArea,
            branch: selectedBranch,
            search: searchMember,
            issue: issueDescription,
            type: applicationType,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-900">📋 আবেদন পরীক্ষা করুন</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Application Type */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            আবেদনের ধরন
                        </label>
                        <div className="flex gap-4">
                            {['admission', 'loan'].map((type) => (
                                <label key={type} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="type"
                                        value={type}
                                        checked={applicationType === type}
                                        onChange={(e) => setApplicationType(e.target.value)}
                                        className="w-4 h-4"
                                    />
                                    <span className="text-sm text-gray-700">
                                        {type === 'admission' ? 'সদস্য ভর্তি' : 'ঋণ আবেদন'}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Date Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            📅 তারিখ নির্বাচন করুন
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Zone, Area, Branch */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Zone */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                জোন (ঐচ্ছিক)
                            </label>
                            <select
                                value={selectedZone}
                                onChange={(e) => setSelectedZone(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">সব জোন</option>
                                {zones.map((zone) => (
                                    <option key={zone.id} value={zone.id}>
                                        {zone.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Area */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                এরিয়া (ঐচ্ছিক)
                            </label>
                            <select
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">সব এরিয়া</option>
                                {areas.map((area) => (
                                    <option key={area.id} value={area.id}>
                                        {area.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Branch */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                শাখা (ঐচ্ছিক)
                            </label>
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">সব শাখা</option>
                                {sortBranchesByCode(branches).map((branch) => (
                                    <option key={branch.id} value={branch.id}>
                                        {formatBranchLabel(branch)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Member Search */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            🔍 সদস্য খুঁজুন (নাম/NID/মোবাইল)
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="সদস্যের নাম, NID বা মোবাইল নম্বর লিখুন"
                                value={searchMember}
                                onChange={(e) => setSearchMember(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Problem Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            ⚠️ সমস্যা লিখুন (ঐচ্ছিক)
                        </label>
                        <textarea
                            placeholder="যদি কোনো সমস্যা থাকে তবে এখানে লিখুন। খালি রাখলে auto-approve হবে।"
                            value={issueDescription}
                            onChange={(e) => setIssueDescription(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-semibold">নোট:</p>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                                <li>সমস্যা লিখলে → Processing হবে</li>
                                <li>সমস্যা না লিখলে → Auto-approve হবে</li>
                                <li>Status দিয়ে ট্র্যাক করুন: Pending/Approved</li>
                            </ul>
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-4 justify-end pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                        >
                            বাতিল
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            খুঁজুন এবং লিখুন
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default IssueFilterModal;

import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
import { Plus, Search, MoreVertical, Edit, Trash2, Power, PowerOff } from 'lucide-react';
import ZoneModal from './Components/ZoneModal';
import AreaModal from './Components/AreaModal';
import BranchModal from './Components/BranchModal';

interface Zone {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    areas?: Area[];
}

interface Area {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    zone: Zone;
    branches?: Branch[];
}

interface Branch {
    id: number;
    name: string;
    code: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    manager_name: string | null;
    is_active: boolean;
    area: Area;
}

interface Props {
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

type TabType = 'zones' | 'areas' | 'branches';

export default function Index({ zones, areas, branches }: Props) {
    const [activeTab, setActiveTab] = useState<TabType>('zones');
    const [searchQuery, setSearchQuery] = useState('');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);

    // Modal states
    const [zoneModalOpen, setZoneModalOpen] = useState(false);
    const [areaModalOpen, setAreaModalOpen] = useState(false);
    const [branchModalOpen, setBranchModalOpen] = useState(false);

    const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    const tabs = [
        { id: 'zones' as TabType, label: 'Zones', count: zones.length },
        { id: 'areas' as TabType, label: 'Areas', count: areas.length },
        { id: 'branches' as TabType, label: 'Branches', count: branches.length },
    ];

    const handleAddNew = () => {
        if (activeTab === 'zones') {
            setSelectedZone(null);
            setZoneModalOpen(true);
        } else if (activeTab === 'areas') {
            setSelectedArea(null);
            setAreaModalOpen(true);
        } else if (activeTab === 'branches') {
            setSelectedBranch(null);
            setBranchModalOpen(true);
        }
    };

    const handleEdit = (type: TabType, item: Zone | Area | Branch) => {
        if (type === 'zones') {
            setSelectedZone(item as Zone);
            setZoneModalOpen(true);
        } else if (type === 'areas') {
            setSelectedArea(item as Area);
            setAreaModalOpen(true);
        } else if (type === 'branches') {
            setSelectedBranch(item as Branch);
            setBranchModalOpen(true);
        }
        setOpenDropdown(null);
    };

    const handleDelete = (type: string, id: number, name: string) => {
        if (confirm(`Are you sure you want to delete ${name}?`)) {
            router.delete(`/organizations/${type}/${id}`);
        }
        setOpenDropdown(null);
    };

    const handleToggleStatus = (type: string, id: number) => {
        router.patch(`/organizations/${type}/${id}/toggle-status`);
        setOpenDropdown(null);
    };

    const filteredZones = zones.filter(zone =>
        zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        zone.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredAreas = areas.filter(area =>
        area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        area.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        area.zone.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredBranches = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.area.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <Head title="Organization Management" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Organization Management</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            Manage your zones, areas, and branches
                        </p>
                    </div>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Add New
                    </button>
                </div>

                {/* Tabs & Search */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="border-b border-gray-200">
                        <div className="flex items-center justify-between px-6 py-4">
                            <div className="flex gap-1">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setSearchQuery('');
                                        }}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                                            activeTab === tab.id
                                                ? 'bg-blue-50 text-blue-600'
                                                : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                    >
                                        {tab.label}
                                        <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Zones Table */}
                    {activeTab === 'zones' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Zone Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Areas
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredZones.map((zone) => (
                                        <tr key={zone.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{zone.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600 font-mono">{zone.code}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                                    {zone.description || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        zone.is_active
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {zone.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {zone.areas?.length || 0} areas
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenDropdown(openDropdown === zone.id ? null : zone.id)}
                                                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                    {openDropdown === zone.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button
                                                                onClick={() => handleEdit('zones', zone)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus('zones', zone.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                            >
                                                                {zone.is_active ? (
                                                                    <>
                                                                        <PowerOff className="w-4 h-4" />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Power className="w-4 h-4" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete('zones', zone.id, zone.name)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredZones.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No zones found
                                </div>
                            )}
                        </div>
                    )}

                    {/* Areas Table */}
                    {activeTab === 'areas' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Area Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Zone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Branches
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredAreas.map((area) => (
                                        <tr key={area.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{area.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600 font-mono">{area.code}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-blue-600">{area.zone.name}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-600 max-w-xs truncate">
                                                    {area.description || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        area.is_active
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {area.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {area.branches?.length || 0} branches
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenDropdown(openDropdown === area.id ? null : area.id)}
                                                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                    {openDropdown === area.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button
                                                                onClick={() => handleEdit('areas', area)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus('areas', area.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                            >
                                                                {area.is_active ? (
                                                                    <>
                                                                        <PowerOff className="w-4 h-4" />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Power className="w-4 h-4" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete('areas', area.id, area.name)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredAreas.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No areas found
                                </div>
                            )}
                        </div>
                    )}

                    {/* Branches Table */}
                    {activeTab === 'branches' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Branch Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Area / Zone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Manager
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredBranches.map((branch) => (
                                        <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600 font-mono">{branch.code}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm">
                                                    <div className="text-blue-600">{branch.area.name}</div>
                                                    <div className="text-gray-500 text-xs">{branch.area.zone.name}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">{branch.manager_name || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">
                                                    <div>{branch.phone || '-'}</div>
                                                    <div className="text-xs text-gray-500">{branch.email || '-'}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                        branch.is_active
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                    }`}
                                                >
                                                    {branch.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <div className="relative inline-block">
                                                    <button
                                                        onClick={() => setOpenDropdown(openDropdown === branch.id ? null : branch.id)}
                                                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                                                    >
                                                        <MoreVertical className="w-4 h-4 text-gray-600" />
                                                    </button>
                                                    {openDropdown === branch.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 animate-in fade-in slide-in-from-top-2 duration-200">
                                                            <button
                                                                onClick={() => handleEdit('branches', branch)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleStatus('branches', branch.id)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                                            >
                                                                {branch.is_active ? (
                                                                    <>
                                                                        <PowerOff className="w-4 h-4" />
                                                                        Deactivate
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Power className="w-4 h-4" />
                                                                        Activate
                                                                    </>
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete('branches', branch.id, branch.name)}
                                                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                                Delete
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredBranches.length === 0 && (
                                <div className="text-center py-12 text-gray-500">
                                    No branches found
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ZoneModal
                isOpen={zoneModalOpen}
                onClose={() => setZoneModalOpen(false)}
                zone={selectedZone}
            />

            <AreaModal
                isOpen={areaModalOpen}
                onClose={() => setAreaModalOpen(false)}
                area={selectedArea}
                zones={zones}
            />

            <BranchModal
                isOpen={branchModalOpen}
                onClose={() => setBranchModalOpen(false)}
                branch={selectedBranch}
                zones={zones}
                areas={areas}
            />
        </AdminLayout>
    );
}

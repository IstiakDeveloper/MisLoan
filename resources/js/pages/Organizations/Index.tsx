import {
    ConfigurationCard,
    ConfigurationHeader,
    ConfigurationPage,
    EmptyState,
    LocalPagination,
    SearchField,
    StatusBadge,
} from '@/components/configuration';
import { useCanMutate } from '@/hooks/use-can-mutate';
import AdminLayout from '@/layouts/admin-layout';
import { Head, router } from '@inertiajs/react';
import {
    Building2,
    Edit,
    Plus,
    Printer,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import AreaModal from './Components/AreaModal';
import BranchModal from './Components/BranchModal';
import ZoneModal from './Components/ZoneModal';

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
    hrmSyncEnabled: boolean;
}

type TabType = 'zones' | 'areas' | 'branches';

export default function Index({ zones, areas, branches, hrmSyncEnabled }: Props) {
    const canMutate = useCanMutate();
    const [syncingFromHrm, setSyncingFromHrm] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('zones');
    const [searchQuery, setSearchQuery] = useState('');
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    const handlePageChange = (page: number) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

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
        {
            id: 'branches' as TabType,
            label: 'Branches',
            count: branches.length,
        },
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

    const handleSyncFromHrm = () => {
        if (
            !confirm(
                'HRM থেকে organization structure sync করবেন? Zone, Area (Regional Office) ও Branch HRM code অনুযায়ী update/create হবে।',
            )
        ) {
            return;
        }

        setSyncingFromHrm(true);
        router.post(
            '/organizations/sync-from-hrm',
            {},
            {
                preserveScroll: true,
                onFinish: () => setSyncingFromHrm(false),
            },
        );
    };

    const filteredZones = zones.filter(
        (zone) =>
            zone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            zone.code.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const paginatedZones = filteredZones.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const filteredAreas = areas.filter(
        (area) =>
            area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            area.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            area.zone.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const paginatedAreas = filteredAreas.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const filteredBranches = branches.filter(
        (branch) =>
            branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            branch.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            branch.area.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const paginatedBranches = filteredBranches.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <AdminLayout>
            <Head title="Organization Management" />

            <ConfigurationPage>
                <ConfigurationHeader
                    title="Organization Management"
                    description="Manage the complete operational hierarchy across zones, areas, and branches."
                    icon={Building2}
                    actions={
                        <>
                            <button
                                type="button"
                                onClick={() =>
                                    router.visit(
                                        '/organizations/branches/print',
                                    )
                                }
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 focus:ring-4 focus:ring-white/30 focus:outline-none sm:flex-none"
                            >
                                <Printer className="h-4 w-4" />
                                Print Branch List
                            </button>
                            {canMutate && hrmSyncEnabled && (
                                <button
                                    type="button"
                                    onClick={handleSyncFromHrm}
                                    disabled={syncingFromHrm}
                                    className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 focus:ring-4 focus:ring-white/30 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${syncingFromHrm ? 'animate-spin' : ''}`}
                                    />
                                    {syncingFromHrm
                                        ? 'Syncing...'
                                        : 'Sync from HRM'}
                                </button>
                            )}
                            {canMutate && (
                            <button
                                onClick={handleAddNew}
                                className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50 focus:ring-4 focus:ring-white/30 focus:outline-none sm:flex-none"
                            >
                                <Plus className="h-4 w-4" />
                                Add New
                            </button>
                            )}
                        </>
                    }
                />

                {/* Tabs & Search */}
                <ConfigurationCard>
                    <div className="border-b border-gray-200">
                        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex w-full gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 lg:w-auto">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setSearchQuery('');
                                            setCurrentPage(1);
                                        }}
                                        className={`min-h-10 flex-1 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200 lg:flex-none ${
                                            activeTab === tab.id
                                                ? 'bg-white text-blue-700 shadow-sm'
                                                : 'text-slate-600 hover:bg-white/70'
                                        }`}
                                    >
                                        {tab.label}
                                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <SearchField
                                value={searchQuery}
                                onChange={(value) => {
                                    setSearchQuery(value);
                                    setCurrentPage(1);
                                }}
                                placeholder={`Search ${activeTab}...`}
                                className="lg:w-80"
                            />
                        </div>
                    </div>

                    {/* Zones Table */}
                    {activeTab === 'zones' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Zone Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Areas
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {paginatedZones.map((zone) => (
                                        <tr
                                            key={zone.id}
                                            className="transition-colors hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {zone.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm text-gray-600">
                                                    {zone.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs truncate text-sm text-gray-600">
                                                    {zone.description || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge
                                                    active={zone.is_active}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {zone.areas?.length || 0}{' '}
                                                    areas
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canMutate ? (
                                                    <>
                                                    <button
                                                        onClick={() => handleToggleStatus('zones', zone.id)}
                                                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                                            zone.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={zone.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {zone.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit('zones', zone)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete('zones', zone.id, zone.name)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                    </>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">View only</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredZones.length === 0 && (
                                <EmptyState
                                    icon={Building2}
                                    title="No zones found"
                                    description="Try another search or add a zone."
                                />
                            )}
                        </div>
                    )}

                    {/* Areas Table */}
                    {activeTab === 'areas' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Area Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Zone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Description
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Branches
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {paginatedAreas.map((area) => (
                                        <tr
                                            key={area.id}
                                            className="transition-colors hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {area.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm text-gray-600">
                                                    {area.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-blue-600">
                                                    {area.zone.name}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-xs truncate text-sm text-gray-600">
                                                    {area.description || '-'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge
                                                    active={area.is_active}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {area.branches?.length || 0}{' '}
                                                    branches
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canMutate ? (
                                                    <>
                                                    <button
                                                        onClick={() => handleToggleStatus('areas', area.id)}
                                                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                                            area.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={area.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {area.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit('areas', area)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete('areas', area.id, area.name)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                    </>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">View only</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredAreas.length === 0 && (
                                <EmptyState
                                    icon={Building2}
                                    title="No areas found"
                                    description="Try another search or add an area."
                                />
                            )}
                        </div>
                    )}

                    {/* Branches Table */}
                    {activeTab === 'branches' && (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="border-b border-gray-200 bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Branch Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Code
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Area / Zone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Manager
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Contact
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase">
                                            
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {paginatedBranches.map((branch) => (
                                        <tr
                                            key={branch.id}
                                            className="transition-colors hover:bg-gray-50"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {branch.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm text-gray-600">
                                                    {branch.code}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm">
                                                    <div className="text-blue-600">
                                                        {branch.area.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {branch.area.zone.name}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-600">
                                                    {branch.manager_name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-600">
                                                    <div>
                                                        {branch.phone || '-'}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {branch.email || '-'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge
                                                    active={branch.is_active}
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {canMutate ? (
                                                    <>
                                                    <button
                                                        onClick={() => handleToggleStatus('branches', branch.id)}
                                                        className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                                                            branch.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                                                        }`}
                                                        title={branch.is_active ? "Deactivate" : "Activate"}
                                                    >
                                                        {branch.is_active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit('branches', branch)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-blue-600 transition-colors hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="size-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete('branches', branch.id, branch.name)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-md text-red-600 transition-colors hover:bg-red-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                    </>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">View only</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredBranches.length === 0 && (
                                <EmptyState
                                    icon={Building2}
                                    title="No branches found"
                                    description="Try another search or add a branch."
                                />
                            )}
                        </div>
                    )}

                    <LocalPagination
                        currentPage={currentPage}
                        totalPages={Math.ceil((activeTab === 'zones' ? filteredZones.length : activeTab === 'areas' ? filteredAreas.length : filteredBranches.length) / itemsPerPage)}
                        totalItems={activeTab === 'zones' ? filteredZones.length : activeTab === 'areas' ? filteredAreas.length : filteredBranches.length}
                        perPage={itemsPerPage}
                        itemLabel={activeTab}
                        onPageChange={handlePageChange}
                        onPerPageChange={(size) => {
                            setItemsPerPage(size);
                            setCurrentPage(1);
                        }}
                    />
                </ConfigurationCard>
            </ConfigurationPage>

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

import { FormEvent, useEffect, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { X } from 'lucide-react';

interface Role {
    id: number;
    name: string;
    display_name: string;
}

interface Zone {
    id: number;
    name: string;
    code: string;
}

interface Area {
    id: number;
    name: string;
    code: string;
    zone_id: number;
}

interface Branch {
    id: number;
    name: string;
    code: string;
    area_id: number;
}

interface User {
    id: number;
    name: string;
    username: string;
    email: string;
    phone: string | null;
    role: Role;
    zone: Zone | null;
    area: Area | null;
    branch: Branch | null;
    zones?: Zone[];
    areas?: Area[];
    branches?: Branch[];
    is_active: boolean;
    has_all_access: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    roles: Role[];
    zones: Zone[];
    areas: Area[];
    branches: Branch[];
}

export default function UserModal({ isOpen, onClose, user, roles, zones, areas, branches }: Props) {
    const [selectedZone, setSelectedZone] = useState<string>('');
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [filteredAreas, setFilteredAreas] = useState<Area[]>(areas);
    const [filteredBranches, setFilteredBranches] = useState<Branch[]>(branches);
    const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>([]);
    const [selectedAreaIds, setSelectedAreaIds] = useState<number[]>([]);
    const [selectedBranchIds, setSelectedBranchIds] = useState<number[]>([]);
    const [useCustomSelection, setUseCustomSelection] = useState(false);
    const [branchSearch, setBranchSearch] = useState('');

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: user?.name || '',
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || '',
        password: '',
        password_confirmation: '',
        role_id: user?.role.id.toString() || '',
        zone_id: user?.zone?.id.toString() || '',
        area_id: user?.area?.id.toString() || '',
        branch_id: user?.branch?.id.toString() || '',
        zone_ids: [] as number[],
        area_ids: [] as number[],
        branch_ids: [] as number[],
        is_active: user?.is_active ?? true,
        has_all_access: user?.has_all_access ?? false,
    });

    // Check role type
    const selectedRole = roles.find(r => r.id.toString() === data.role_id);
    const isBranchLevel =
        selectedRole?.name === 'branch_manager' ||
        selectedRole?.name === 'branch_user' ||
        selectedRole?.name === 'field_officer';
    const isZoneManager = selectedRole?.name === 'zone_manager';
    const isAreaManager = selectedRole?.name === 'area_manager';
    const isApproverRole = selectedRole?.name === 'admf' || selectedRole?.name === 'dmf' || selectedRole?.name === 'ed';

    // Filter branches for search
    const filteredSearchBranches = branches.filter(b =>
        b.name.toLowerCase().includes(branchSearch.toLowerCase()) ||
        b.code.toLowerCase().includes(branchSearch.toLowerCase())
    );

    useEffect(() => {
        if (user) {
            setSelectedZone(user.zone?.id.toString() || '');
            setSelectedArea(user.area?.id.toString() || '');

            // Initialize multi-assignments
            const zoneIds = user.zones?.map(z => z.id) || [];
            const areaIds = user.areas?.map(a => a.id) || [];
            const branchIds = user.branches?.map(b => b.id) || [];

            setSelectedZoneIds(zoneIds);
            setSelectedAreaIds(areaIds);
            setSelectedBranchIds(branchIds);

            // Check if user has custom assignments
            setUseCustomSelection(zoneIds.length > 0 || areaIds.length > 0 || branchIds.length > 0);

            setData({
                name: user.name,
                username: user.username,
                email: user.email,
                phone: user.phone || '',
                password: '',
                password_confirmation: '',
                role_id: user.role.id.toString(),
                zone_id: user.zone?.id.toString() || '',
                area_id: user.area?.id.toString() || '',
                branch_id: user.branch?.id.toString() || '',
                zone_ids: zoneIds,
                area_ids: areaIds,
                branch_ids: branchIds,
                is_active: user.is_active,
                has_all_access: user.has_all_access,
            });
        } else {
            setSelectedZone('');
            setSelectedArea('');
            setSelectedZoneIds([]);
            setSelectedAreaIds([]);
            setSelectedBranchIds([]);
            setUseCustomSelection(false);
            setBranchSearch('');
            reset();
        }
    }, [user, isOpen]);

    useEffect(() => {
        if (selectedZone) {
            const filtered = areas.filter((area) => area.zone_id.toString() === selectedZone);
            setFilteredAreas(filtered);

            if (data.area_id && !filtered.find((a) => a.id.toString() === data.area_id)) {
                setData('area_id', '');
                setData('branch_id', '');
            }
        } else {
            setFilteredAreas(areas);
            setData('area_id', '');
            setData('branch_id', '');
        }
    }, [selectedZone, areas]);

    useEffect(() => {
        if (selectedArea) {
            const filtered = branches.filter((branch) => branch.area_id.toString() === selectedArea);
            setFilteredBranches(filtered);

            if (data.branch_id && !filtered.find((b) => b.id.toString() === data.branch_id)) {
                setData('branch_id', '');
            }
        } else {
            setFilteredBranches(branches);
            setData('branch_id', '');
        }
    }, [selectedArea, branches]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (user) {
            put(`/users/${user.id}`, {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        } else {
            post('/users', {
                onSuccess: () => {
                    reset();
                    onClose();
                },
            });
        }
    };

    const handleClose = () => {
        reset();
        setSelectedZone('');
        setSelectedArea('');
        setSelectedZoneIds([]);
        setSelectedAreaIds([]);
        setSelectedBranchIds([]);
        setUseCustomSelection(false);
        setBranchSearch('');
        onClose();
    };

    const handleZoneSelect = (zoneId: string) => {
        setSelectedZone(zoneId);
        setData('zone_id', zoneId);

        if (isZoneManager && zoneId) {
            // Auto-select all areas and branches in this zone
            const zoneAreas = areas.filter(a => a.zone_id.toString() === zoneId);
            const areaIds = zoneAreas.map(a => a.id);
            const zoneBranches = branches.filter(b =>
                zoneAreas.some(a => a.id === b.area_id)
            );
            const branchIds = zoneBranches.map(b => b.id);

            setSelectedAreaIds(areaIds);
            setSelectedBranchIds(branchIds);
            setData('area_ids', areaIds);
            setData('branch_ids', branchIds);
        }
    };

    const handleAreaSelect = (areaId: string) => {
        setSelectedArea(areaId);
        setData('area_id', areaId);

        if (isAreaManager && areaId) {
            // Auto-select all branches in this area
            const areaBranches = branches.filter(b => b.area_id.toString() === areaId);
            const branchIds = areaBranches.map(b => b.id);

            setSelectedBranchIds(branchIds);
            setData('branch_ids', branchIds);
        }
    };

    const handleZoneToggle = (zoneId: number) => {
        const newIds = selectedZoneIds.includes(zoneId)
            ? selectedZoneIds.filter(id => id !== zoneId)
            : [...selectedZoneIds, zoneId];
        setSelectedZoneIds(newIds);
        setData('zone_ids', newIds);
    };

    const handleAreaToggle = (areaId: number) => {
        const newIds = selectedAreaIds.includes(areaId)
            ? selectedAreaIds.filter(id => id !== areaId)
            : [...selectedAreaIds, areaId];
        setSelectedAreaIds(newIds);
        setData('area_ids', newIds);
    };

    const handleBranchToggle = (branchId: number) => {
        const newIds = selectedBranchIds.includes(branchId)
            ? selectedBranchIds.filter(id => id !== branchId)
            : [...selectedBranchIds, branchId];
        setSelectedBranchIds(newIds);
        setData('branch_ids', newIds);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {user ? 'Edit User' : 'Create New User'}
                    </h3>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Personal Information */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Personal Information</h4>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="e.g., John Doe"
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                        Username <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="username"
                                        type="text"
                                        value={data.username}
                                        onChange={(e) => setData('username', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="e.g., johndoe or BR001"
                                        required
                                    />
                                    {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="e.g., john@example.com"
                                        required
                                    />
                                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                                </div>

                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        id="phone"
                                        type="text"
                                        value={data.phone}
                                        onChange={(e) => setData('phone', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="e.g., 01700000000"
                                    />
                                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 mb-1">
                                    Role <span className="text-red-500">*</span>
                                </label>
                                <select
                                    id="role_id"
                                    value={data.role_id}
                                    onChange={(e) => setData('role_id', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                >
                                    <option value="">Select Role</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id.toString()}>
                                            {role.display_name}
                                        </option>
                                    ))}
                                </select>
                                {errors.role_id && <p className="text-red-500 text-sm mt-1">{errors.role_id}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Password Section */}
                    {!user && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Password</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                        Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        required={!user}
                                    />
                                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                                </div>

                                <div>
                                    <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 mb-1">
                                        Confirm Password <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        required={!user}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Organization Assignment */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                            Organization Assignment
                            {isBranchLevel && <span className="ml-2 text-xs font-normal text-blue-600">(Single Branch)</span>}
                            {isZoneManager && <span className="ml-2 text-xs font-normal text-purple-600">(Auto from Zone)</span>}
                            {isAreaManager && <span className="ml-2 text-xs font-normal text-green-600">(Auto from Area)</span>}
                            {isApproverRole && <span className="ml-2 text-xs font-normal text-amber-600">(Team Vittik – assign Zone/Area/Branch so branches can select)</span>}
                        </h4>

                        {isBranchLevel ? (
                            // Branch User/Manager: Searchable single branch select
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="branchSearch" className="block text-sm font-medium text-gray-700 mb-1">
                                        Search & Select Branch <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="branchSearch"
                                        type="text"
                                        value={branchSearch}
                                        onChange={(e) => setBranchSearch(e.target.value)}
                                        placeholder="Search by branch name or code..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                                    {filteredSearchBranches.length > 0 ? (
                                        filteredSearchBranches.map((branch) => {
                                            const branchArea = areas.find(a => a.id === branch.area_id);
                                            const branchZone = zones.find(z => z.id === branchArea?.zone_id);
                                            return (
                                                <label
                                                    key={branch.id}
                                                    className={`flex items-center gap-3 p-3 border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-colors ${
                                                        data.branch_id === branch.id.toString() ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="branch"
                                                        checked={data.branch_id === branch.id.toString()}
                                                        onChange={() => {
                                                            setData('branch_id', branch.id.toString());
                                                            setData('area_id', branch.area_id.toString());
                                                            setData('zone_id', branchArea?.zone_id.toString() || '');
                                                        }}
                                                        className="w-4 h-4 text-blue-600"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-sm text-gray-900">{branch.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {branchArea?.name} • {branchZone?.name} • Code: {branch.code}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })
                                    ) : (
                                        <div className="p-4 text-center text-gray-500 text-sm">
                                            {branchSearch ? 'No branches found' : 'Start typing to search branches'}
                                        </div>
                                    )}
                                </div>
                                {errors.branch_id && <p className="text-red-500 text-sm mt-1">{errors.branch_id}</p>}
                                <p className="text-xs text-gray-500">
                                    Branch-level users are assigned to one branch only.
                                </p>
                            </div>
                        ) : isZoneManager ? (
                            // Zone Manager: Select zone, auto-assign areas & branches
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="zoneManager" className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Zone <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="zoneManager"
                                        value={selectedZone}
                                        onChange={(e) => handleZoneSelect(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="">Select Zone</option>
                                        {zones.map((zone) => (
                                            <option key={zone.id} value={zone.id.toString()}>
                                                {zone.name} ({zone.code})
                                            </option>
                                        ))}
                                    </select>
                                    {errors.zone_id && <p className="text-red-500 text-sm mt-1">{errors.zone_id}</p>}
                                </div>
                                {selectedZone && (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <div className="text-sm font-medium text-purple-900 mb-2">Auto-assigned:</div>
                                        <div className="space-y-1 text-xs text-purple-700">
                                            <div>✓ {selectedAreaIds.length} Areas</div>
                                            <div>✓ {selectedBranchIds.length} Branches</div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500">
                                    Zone Managers automatically get access to all areas and branches within the selected zone.
                                </p>
                            </div>
                        ) : isAreaManager ? (
                            // Area Manager: Select area, auto-assign branches
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="areaManager" className="block text-sm font-medium text-gray-700 mb-1">
                                        Select Area <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        id="areaManager"
                                        value={selectedArea}
                                        onChange={(e) => handleAreaSelect(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    >
                                        <option value="">Select Area</option>
                                        {areas.map((area) => {
                                            const areaZone = zones.find(z => z.id === area.zone_id);
                                            return (
                                                <option key={area.id} value={area.id.toString()}>
                                                    {area.name} ({area.code}) - {areaZone?.name}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {errors.area_id && <p className="text-red-500 text-sm mt-1">{errors.area_id}</p>}
                                </div>
                                {selectedArea && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="text-sm font-medium text-green-900 mb-2">Auto-assigned:</div>
                                        <div className="space-y-1 text-xs text-green-700">
                                            <div>✓ {selectedBranchIds.length} Branches</div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500">
                                    Area Managers automatically get access to all branches within the selected area.
                                </p>
                            </div>
                        ) : (
                            // Other roles (Head Office, ADMF, DMF, ED, etc.): Custom multi-select with checkbox toggle
                            <div className="space-y-3">
                                {isApproverRole && (
                                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                        Assign zones, areas, or branches below. Branch users will only see and select this user for Team Vittik approval when their branch falls within the assigned scope.
                                    </div>
                                )}
                                <label className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={useCustomSelection}
                                        onChange={(e) => {
                                            setUseCustomSelection(e.target.checked);
                                            if (!e.target.checked) {
                                                setSelectedZoneIds([]);
                                                setSelectedAreaIds([]);
                                                setSelectedBranchIds([]);
                                                setData('zone_ids', []);
                                                setData('area_ids', []);
                                                setData('branch_ids', []);
                                            }
                                        }}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                        Enable Custom Selection
                                    </span>
                                    <span className="text-xs text-gray-500">(Select specific zones/areas/branches)</span>
                                </label>

                                {useCustomSelection && (
                                    <div className="space-y-3 pl-6 border-l-2 border-blue-300">
                                        {/* Zones */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Zones {selectedZoneIds.length > 0 && <span className="text-xs text-gray-500">({selectedZoneIds.length})</span>}
                                            </label>
                                            <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto bg-white">
                                                {zones.map((zone) => (
                                                    <label key={zone.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedZoneIds.includes(zone.id)}
                                                            onChange={() => handleZoneToggle(zone.id)}
                                                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">{zone.name}</span>
                                                        <span className="text-xs text-gray-400">({zone.code})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Areas */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Areas {selectedAreaIds.length > 0 && <span className="text-xs text-gray-500">({selectedAreaIds.length})</span>}
                                            </label>
                                            <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto bg-white">
                                                {areas.map((area) => (
                                                    <label key={area.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedAreaIds.includes(area.id)}
                                                            onChange={() => handleAreaToggle(area.id)}
                                                            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">{area.name}</span>
                                                        <span className="text-xs text-gray-400">({area.code})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Branches */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Branches {selectedBranchIds.length > 0 && <span className="text-xs text-gray-500">({selectedBranchIds.length})</span>}
                                            </label>
                                            <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto bg-white">
                                                {branches.map((branch) => (
                                                    <label key={branch.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedBranchIds.includes(branch.id)}
                                                            onChange={() => handleBranchToggle(branch.id)}
                                                            className="w-3.5 h-3.5 text-green-600 border-gray-300 rounded"
                                                        />
                                                        <span className="text-sm text-gray-700">{branch.name}</span>
                                                        <span className="text-xs text-gray-400">({branch.code})</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {!useCustomSelection && (
                                    <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded">
                                        No specific assignment. User will have role-based access only.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Status & Access */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Status & Access</h4>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.is_active}
                                    onChange={(e) => setData('is_active', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Active User</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={data.has_all_access}
                                    onChange={(e) => setData('has_all_access', e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">
                                    Super Admin Access
                                    <span className="ml-1 text-xs text-gray-500">(Full system access)</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Saving...' : user ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

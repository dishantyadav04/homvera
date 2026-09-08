'use client';

import { useState, useEffect } from "react";
import { Project, ManualNearbyLocation } from "@/types/project";
import { City, Locality } from "@/types/location";
import AmenityLibraryManager from "./AmenityLibraryManager";
import NearbyLocationsForm from "./NearbyLocationsForm";
import ImageUpload from "./ImageUpload";
import UnitConfigForm from "./UnitConfigForm";
import AdminMapPreview from "./AdminMapPreview";
import { Save, Plus, X, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { adminFetch } from '@/lib/admin-fetch';
import ProjectFormSectionNav, { type FormSection } from './ProjectFormSectionNav';
import type { Builder } from '@/types/builder';

const FORM_SECTIONS: FormSection[] = [
  { id: 'basic-info', label: 'Basic Info' },
  { id: 'media', label: 'Media' },
  { id: 'unit-layout', label: 'Units & Layout' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'rera', label: 'RERA' },
  { id: 'legal', label: 'Legal' },
  { id: 'pros-cons', label: 'Pros & Cons' },
  { id: 'amenities-nearby', label: 'Amenities & Nearby' },
];

interface ProjectFormProps {
  initialData?: Project;
}

export default function ProjectForm({ initialData }: ProjectFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [builders, setBuilders] = useState<Builder[]>([]);
  const [selectedBuilderId, setSelectedBuilderId] = useState((initialData as unknown as { builder_id?: string })?.builder_id || '');
  const [builderSearch, setBuilderSearch] = useState('');
  const [builderDropdownOpen, setBuilderDropdownOpen] = useState(false);

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formErrors, setFormErrors] = useState<string[]>([]);

  // ── Dynamic cities & localities ──────────────────────────────────────────
  const [cities, setCities] = useState<City[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);
  const [addCityOpen, setAddCityOpen] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [newCityState, setNewCityState] = useState('');
  const [savingCity, setSavingCity] = useState(false);
  const [deletingCityId, setDeletingCityId] = useState<string | null>(null);
  const [addLocalityOpen, setAddLocalityOpen] = useState(false);
  const [newLocalityName, setNewLocalityName] = useState('');
  const [savingLocality, setSavingLocality] = useState(false);
  const [deletingLocalityId, setDeletingLocalityId] = useState<string | null>(null);
  // Track the city id that corresponds to the current project.city string
  const [selectedCityId, setSelectedCityId] = useState<string>('');

  const renderFieldError = (fieldName: string) => {
    if (errors[fieldName]?.length) {
      return (
        <p data-field-error={fieldName} className="text-xs text-red-500 mt-1 font-semibold">
          {errors[fieldName].join(', ')}
        </p>
      );
    }
    return null;
  };

  const filteredBuilders = builders.filter(b =>
    b.name.toLowerCase().includes(builderSearch.toLowerCase())
  );

  const selectedBuilderName = builders.find(b => b.id === selectedBuilderId)?.name || '';

  const [locationSearch, setLocationSearch] = useState(initialData?.location || '');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  // filteredLocalities now uses the dynamic localities list
  const filteredLocalities = locationSearch.length >= 1
    ? localities
        .filter(l => l.name.toLowerCase().includes(locationSearch.toLowerCase()))
        .slice(0, 8)
    : localities.slice(0, 8);

  const [project, setProject] = useState<Partial<Project>>(initialData || {
    name: '',
    slug: '',
    builderName: '',
    location: '',
    city: '',  // will be set dynamically once cities are fetched
    description: '',
    tagline: '',
    images: [],
    pros: [],
    cons: [],
    amenities: [],
    unitConfigs: [],
    lat: 18.5204,
    lng: 73.8567,
    reraId: '',
    reraExpiry: '',
    reraLink: '',
    reraStatus: 'not_registered',
    possessionDate: '',
    reraPossessionDate: '',
    landParcelAcres: undefined,
    totalTowers: undefined,
    floorsPerTower: '',
    isPublished: true,
    litigation: false,
    litigationDetails: '',
    commencementCertificate: false,
    occupancyCertificate: false,
    legalNotes: '',
    brochureUrl: '',
    videos: [],
    paymentPlans: [],
    bankApprovals: [],
    internalAmenities: [],
    externalAmenities: [],
    nearbyLocations: [],
    reraRegistrations: [],
    masterPlanImages: [],
    floorPlanImages: [],
    constructionStatus: 'under_construction',
    constructionPercent: undefined
  });

  const [landParcelInput, setLandParcelInput] = useState<string>(
    initialData?.landParcelAcres != null ? String(initialData.landParcelAcres) : ''
  );
  const [latInput, setLatInput] = useState(project.lat != null ? String(project.lat) : '');
  const [lngInput, setLngInput] = useState(project.lng != null ? String(project.lng) : '');

  useEffect(() => {
    if (initialData?.lat != null) setLatInput(String(initialData.lat));
    if (initialData?.lng != null) setLngInput(String(initialData.lng));
    if (initialData?.landParcelAcres != null) setLandParcelInput(String(initialData.landParcelAcres));
  }, [initialData?.lat, initialData?.lng, initialData?.landParcelAcres]);

  // Fetch builders on mount
  useEffect(() => {
    adminFetch('/api/admin/builders')
      .then(r => r.json())
      .then(d => setBuilders(d.builders || []))
      .catch(console.error);
  }, []);

  // Fetch cities on mount
  useEffect(() => {
    setCitiesLoading(true);
    adminFetch('/api/admin/cities')
      .then(r => r.json())
      .then(d => {
        const fetchedCities: City[] = d.cities || [];
        setCities(fetchedCities);
        // Resolve the city id from the existing project.city string (for edit mode)
        const currentCityName = initialData?.city || '';
        const matched = fetchedCities.find(
          c => c.name.toLowerCase() === currentCityName.toLowerCase()
        );
        if (matched) {
          setSelectedCityId(matched.id);
        } else if (fetchedCities.length > 0 && !currentCityName) {
          // Default to first city for new projects
          setSelectedCityId(fetchedCities[0].id);
          setProject(prev => ({ ...prev, city: fetchedCities[0].name }));
        }
      })
      .catch(console.error)
      .finally(() => setCitiesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch localities whenever selectedCityId changes
  useEffect(() => {
    if (!selectedCityId) {
      setLocalities([]);
      return;
    }
    adminFetch(`/api/admin/localities?city_id=${selectedCityId}`)
      .then(r => r.json())
      .then(d => setLocalities(d.localities || []))
      .catch(console.error);
  }, [selectedCityId]);

  const deleteCity = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This also deletes all of its localities and can't be undone.`)) return;
    setDeletingCityId(id);
    try {
      const res = await adminFetch(`/api/admin/cities?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete city');
      setCities(prev => prev.filter(c => c.id !== id));
      if (selectedCityId === id) {
        setSelectedCityId('');
        setLocalities([]);
        setLocationSearch('');
        setProject(prev => ({ ...prev, city: '', location: '' }));
      }
      toast.success('City deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete city');
    } finally {
      setDeletingCityId(null);
    }
  };

  const addLocality = async () => {
    if (!newLocalityName.trim() || !selectedCityId) return;
    setSavingLocality(true);
    try {
      const res = await adminFetch('/api/admin/localities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city_id: selectedCityId, name: newLocalityName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to add locality');
      const { locality } = await res.json();
      setLocalities(prev => [...prev, locality].sort((a, b) => a.name.localeCompare(b.name)));
      setLocationSearch(locality.name);
      setProject(prev => ({ ...prev, location: locality.name }));
      setNewLocalityName('');
      setAddLocalityOpen(false);
      toast.success('Locality added');
    } catch (e: any) {
      toast.error(e.message || 'Failed to add locality');
    } finally {
      setSavingLocality(false);
    }
  };

  const deleteLocality = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setDeletingLocalityId(id);
    try {
      const res = await adminFetch(`/api/admin/localities?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete locality');
      setLocalities(prev => prev.filter(l => l.id !== id));
      if (project.location === name) {
        setLocationSearch('');
        setProject(prev => ({ ...prev, location: '' }));
      }
      toast.success('Locality deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete locality');
    } finally {
      setDeletingLocalityId(null);
    }
  };

  const [newPro, setNewPro] = useState("");
  const [newCon, setNewCon] = useState("");

  const parseIntInput = (val: string): number | undefined => {
    const n = parseInt(val.replace(/^0+/, ''), 10)
    return isNaN(n) ? undefined : n
  }

  const parseFloatInput = (val: string): number | undefined => {
    const n = parseFloat(val)
    return isNaN(n) ? undefined : n
  }

  const saveProject = async (publish: boolean) => {
    if (publish) {
      setIsLoading(true);
    } else {
      setIsSavingDraft(true);
    }
    setErrors({});
    setFormErrors([]);

    try {
      const body: Record<string, unknown> = {
        ...project,
        builder_id: selectedBuilderId || null,
        builder_name: project.builderName,
        tagline: project.tagline,
        possession_date: project.possessionDate,
        rera_possession_date: project.reraPossessionDate,
        land_parcel_acres: project.landParcelAcres,
        total_towers: project.totalTowers,
        floors_per_tower: project.floorsPerTower,
        construction_status: project.constructionStatus,
        construction_percent: project.constructionPercent ?? 0,
        is_published: publish,
        rera_id: project.reraId,
        rera_expiry: project.reraExpiry,
        rera_link: project.reraLink,
        rera_status: project.reraStatus,
        litigation: project.litigation,
        litigation_details: project.litigationDetails,
        commencement_certificate: project.commencementCertificate,
        occupancy_certificate: project.occupancyCertificate,
        legal_notes: project.legalNotes,
        brochure_url: project.brochureUrl,
        videos: project.videos,
        payment_plans: project.paymentPlans,
        bank_approvals: project.bankApprovals,
        nearby_locations: project.nearbyLocations || [],
        internal_amenities: project.internalAmenities || [],
        external_amenities: project.externalAmenities || [],
        rera_registrations: project.reraRegistrations || [],
        master_plan_images: project.masterPlanImages || [],
        floor_plan_images: project.floorPlanImages || [],
        unitConfigs: (project.unitConfigs || []).map(u => {
          const area = u.area ?? 0;
          const price = u.price ?? 0;
          const pricePerSqft = area > 0 ? Math.round(price / area) : 0;
          return {
            id: u.id,
            type: u.type,
            area: u.area,
            price: u.price,
            price_is_plus: u.priceIsPlus ?? false,
            price_per_sqft: pricePerSqft,
            floor_plan: u.floorPlan?.startsWith('http') ? u.floorPlan : undefined,
            facing: u.facing || [],
            images: u.images || [],
            highlights: u.highlights || [],
            parking: u.parking,
            min_downpayment: u.minDownpayment,
          };
        }),
        builderName: undefined,
        possessionDate: undefined,
        reraPossessionDate: undefined,
        landParcelAcres: undefined,
        totalTowers: undefined,
        floorsPerTower: undefined,
        constructionStatus: undefined,
        constructionPercent: undefined,
        reraId: undefined,
        reraExpiry: undefined,
        reraLink: undefined,
        reraStatus: undefined,
        litigationDetails: undefined,
        commencementCertificate: undefined,
        occupancyCertificate: undefined,
        legalNotes: undefined,
        brochureUrl: undefined,
        paymentPlans: undefined,
        bankApprovals: undefined,
        nearbyLocations: undefined,
        internalAmenities: undefined,
        externalAmenities: undefined,
        reraRegistrations: undefined,
        masterPlanImages: undefined,
        floorPlanImages: undefined,
        isPublished: undefined,
      };

      const response = await adminFetch(initialData ? `/api/admin/projects?id=${initialData.id}` : '/api/admin/projects', {
        method: initialData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (err.fieldErrors) {
          setErrors(err.fieldErrors);
          if (err.fieldErrors.litigation_details && !project.litigation) {
            setProject(prev => ({ ...prev, litigation: true }));
          }
          setTimeout(() => {
            const firstErrorEl = document.querySelector('[data-field-error]');
            if (firstErrorEl) {
              firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
          throw new Error("Fix the highlighted fields below");
        }
        if (err.formErrors) {
          setFormErrors(err.formErrors);
        }
        throw new Error(err.error || "Failed to save project");
      }

      toast.success(
        publish
          ? (initialData ? "Project updated" : "Project published")
          : "Draft saved"
      );
      router.push('/admin/projects');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveProject(true);
  };

  const handleSaveDraft = () => {
    saveProject(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl">
      <ProjectFormSectionNav sections={FORM_SECTIONS} />
      {/* Basic Info */}
      <div id="basic-info" className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)]">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">General Information</h3>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Project Name</label>
            <input
              type="text"
              value={project.name}
              onChange={(e) => setProject({...project, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
              className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.name ? 'border-red-500' : 'border-[var(--border)]'}`}
              placeholder="e.g. Godrej Woodsville"
              required
            />
            {renderFieldError('name')}
            {renderFieldError('slug')}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-[var(--text-primary)]">
              Builder <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={builderDropdownOpen ? builderSearch : selectedBuilderName}
                onChange={e => {
                  setBuilderSearch(e.target.value);
                  setBuilderDropdownOpen(true);
                }}
                onFocus={() => {
                  setBuilderSearch('');
                  setBuilderDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setBuilderDropdownOpen(false), 150)}
                placeholder="Search or select a builder..."
                className={`w-full px-3 py-2.5 bg-[var(--surface-raised)] border rounded-[var(--radius-xs)] text-sm focus:outline-none focus:border-[var(--primary)] pr-8 ${errors.builder_name || errors.builder_id ? 'border-red-500' : 'border-[var(--border)]'}`}
              />
              {renderFieldError('builder_name')}
              {renderFieldError('builder_id')}
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                ▾
              </span>
              {builderDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--border)]
                  rounded-[var(--radius-xs)] shadow-lg max-h-52 overflow-y-auto">
                  <div
                    onMouseDown={() => {
                      setSelectedBuilderId('');
                      setProject(prev => ({ ...prev, builderName: '' }));
                      setBuilderDropdownOpen(false);
                      setBuilderSearch('');
                    }}
                    className="px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-raised)] cursor-pointer"
                  >
                    — Clear selection —
                  </div>
                  {filteredBuilders.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-[var(--text-muted)]">No builders found</div>
                  ) : (
                    filteredBuilders.map(b => (
                      <div
                        key={b.id}
                        onMouseDown={() => {
                          setSelectedBuilderId(b.id);
                          setProject(prev => ({ ...prev, builderName: b.name }));
                          setBuilderDropdownOpen(false);
                          setBuilderSearch('');
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-[var(--surface-raised)] transition-colors ${
                          selectedBuilderId === b.id
                            ? 'font-bold text-[var(--primary)] bg-[var(--surface-raised)]'
                            : 'text-[var(--text-primary)]'
                        }`}
                      >
                        {b.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* City dropdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">City</label>
              <button
                type="button"
                onClick={() => setAddCityOpen(v => !v)}
                className="text-[10px] font-bold text-[var(--primary)] hover:underline"
              >
                {addCityOpen ? 'Close' : 'Manage cities'}
              </button>
            </div>
            <div className="relative">
              {citiesLoading ? (
                <div className="flex items-center gap-2 h-10 px-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-muted)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading cities…
                </div>
              ) : (
                <select
                  value={selectedCityId}
                  onChange={e => {
                    const cityId = e.target.value;
                    if (cityId === '__add_new__') {
                      setAddCityOpen(true);
                      return;
                    }
                    const city = cities.find(c => c.id === cityId);
                    setSelectedCityId(cityId);
                    setProject(prev => ({ ...prev, city: city?.name || '', location: '' }));
                    setLocationSearch('');
                  }}
                  className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm appearance-none ${
                    errors.city ? 'border-red-500' : 'border-[var(--border)]'
                  }`}
                >
                  <option value="">— Select a city —</option>
                  {cities.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
                  ))}
                  {cities.length === 0 && (
                    <option value="" disabled>No cities yet — add one below</option>
                  )}
                  <option value="__add_new__">+ Add a new city…</option>
                </select>
              )}
              {renderFieldError('city')}
              <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▾
              </span>
            </div>

            {addCityOpen && (
              <div className="p-3 border border-dashed border-[var(--border)] rounded-xl space-y-3">
                {cities.length > 0 && (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {cities.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--surface-raised)] text-sm"
                      >
                        <span>{c.name}{c.state ? `, ${c.state}` : ''}</span>
                        <button
                          type="button"
                          onClick={() => deleteCity(c.id, c.name)}
                          disabled={deletingCityId === c.id}
                          title={`Delete ${c.name}`}
                          className="p-1 text-[var(--text-muted)] hover:text-red-500 transition-colors disabled:opacity-40"
                        >
                          {deletingCityId === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Add New City</p>
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[120px] space-y-1">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">City Name *</label>
                    <input
                      type="text"
                      value={newCityName}
                      onChange={e => setNewCityName(e.target.value)}
                      placeholder="e.g. Nagpur"
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <div className="flex-1 min-w-[100px] space-y-1">
                    <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">State</label>
                    <input
                      type="text"
                      value={newCityState}
                      onChange={e => setNewCityState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!newCityName.trim() || savingCity}
                    onClick={async () => {
                      setSavingCity(true);
                      try {
                        const res = await adminFetch('/api/admin/cities', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: newCityName.trim(), state: newCityState.trim() }),
                        });
                        if (!res.ok) throw new Error((await res.json()).error || 'Failed to add city');
                        const { city } = await res.json();
                        setCities(prev => [...prev, city].sort((a, b) => a.name.localeCompare(b.name)));
                        setSelectedCityId(city.id);
                        setProject(prev => ({ ...prev, city: city.name, location: '' }));
                        setNewCityName('');
                        setNewCityState('');
                        toast.success('City added');
                      } catch (e: any) {
                        toast.error(e.message || 'Failed to add city');
                      } finally {
                        setSavingCity(false);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    {savingCity ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Save City
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddCityOpen(false); setNewCityName(''); setNewCityState(''); }}
                    className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Location / locality autocomplete (city-scoped) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Location</label>
              {selectedCityId && (
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setAddLocalityOpen(v => !v)}
                  className="text-[10px] font-bold text-[var(--primary)] hover:underline"
                >
                  {addLocalityOpen ? 'Close' : '+ Add locality'}
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={locationSearch}
                onChange={e => {
                  setLocationSearch(e.target.value);
                  setProject(prev => ({ ...prev, location: e.target.value }));
                  setLocationDropdownOpen(true);
                }}
                onFocus={() => setLocationDropdownOpen(true)}
                onBlur={() => setTimeout(() => setLocationDropdownOpen(false), 150)}
                className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm pr-8 focus:outline-none focus:border-[var(--primary)] ${errors.location ? 'border-red-500' : 'border-[var(--border)]'}`}
                placeholder={selectedCityId ? 'Search area / locality…' : 'Select a city first'}
                disabled={!selectedCityId}
                autoComplete="off"
              />
              {renderFieldError('location')}
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)] text-xs">
                ▾
              </span>
              {locationDropdownOpen && filteredLocalities.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--border)] rounded-[var(--radius-xs)] shadow-lg max-h-52 overflow-y-auto">
                  {filteredLocalities.map(locality => (
                    <div
                      key={locality.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--surface-raised)] transition-colors group ${
                        project.location === locality.name
                          ? 'font-bold text-[var(--primary)] bg-[var(--surface-raised)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                      onMouseDown={() => {
                        setLocationSearch(locality.name);
                        setProject(prev => ({ ...prev, location: locality.name }));
                        setLocationDropdownOpen(false);
                      }}
                    >
                      <span className="flex-1">{locality.name}</span>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); deleteLocality(locality.id, locality.name); }}
                        disabled={deletingLocalityId === locality.id}
                        title={`Delete ${locality.name}`}
                        className="p-1 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all disabled:opacity-40"
                      >
                        {deletingLocalityId === locality.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {addLocalityOpen && selectedCityId && (
              <div className="flex flex-wrap gap-2 items-end p-3 border border-dashed border-[var(--border)] rounded-xl">
                <div className="flex-1 min-w-[160px] space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Locality Name *</label>
                  <input
                    type="text"
                    value={newLocalityName}
                    onChange={e => setNewLocalityName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLocality();
                      }
                    }}
                    placeholder="e.g. Wakad"
                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <button
                  type="button"
                  disabled={!newLocalityName.trim() || savingLocality}
                  onClick={addLocality}
                  className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  {savingLocality ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Save Locality
                </button>
                <button
                  type="button"
                  onClick={() => { setAddLocalityOpen(false); setNewLocalityName(''); }}
                  className="px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Geography</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Latitude</label>
              <input
                type="text"
                inputMode="decimal"
                value={latInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(raw)) {
                    setLatInput(raw);
                    setProject({ ...project, lat: parseFloatInput(raw) ?? 18.5204 });
                  }
                }}
                className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.lat ? 'border-red-500' : 'border-[var(--border)]'}`}
              />
              {renderFieldError('lat')}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Longitude</label>
              <input
                type="text"
                inputMode="decimal"
                value={lngInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (/^-?\d*\.?\d*$/.test(raw)) {
                    setLngInput(raw);
                    setProject({ ...project, lng: parseFloatInput(raw) ?? 73.8567 });
                  }
                }}
                className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.lng ? 'border-red-500' : 'border-[var(--border)]'}`}
              />
              {renderFieldError('lng')}
            </div>
          </div>
          <AdminMapPreview lat={project.lat || 18.5204} lng={project.lng || 73.8567} />
        </div>
      </div>

      {/* Project Specs & Dates */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Project Specs & Dates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Tagline</label>
            <input
              type="text"
              value={project.tagline || ''}
              onChange={(e) => setProject({...project, tagline: e.target.value})}
              className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.tagline ? 'border-red-500' : 'border-[var(--border)]'}`}
              placeholder="e.g. Experience luxury living"
            />
            {renderFieldError('tagline')}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Target Possession</label>
            {/*
              Mobile date input fixes:
              - text-base (16px) prevents iOS Safari auto-zoom (triggered when font-size < 16px)
              - h-11 gives a consistent tap-target height matching neighbouring text inputs
              - appearance-none + min-w-0 prevents WebKit from squeezing the input
              - md:text-sm restores the smaller size on desktop where zoom is not an issue
            */}
            <input
              type="date"
              value={project.possessionDate || ''}
              onChange={(e) => setProject({...project, possessionDate: e.target.value})}
              className={`w-full min-w-0 bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 h-11 text-base md:text-sm appearance-none date-input-mobile ${errors.possession_date ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {renderFieldError('possession_date')}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">RERA Possession Date</label>
            <input
              type="date"
              value={project.reraPossessionDate || ''}
              onChange={(e) => setProject({...project, reraPossessionDate: e.target.value})}
              className={`w-full min-w-0 bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 h-11 text-base md:text-sm appearance-none date-input-mobile ${errors.rera_possession_date ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {renderFieldError('rera_possession_date')}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Land Parcel (acres)</label>
            <input
              type="text"
              inputMode="decimal"
              value={landParcelInput}
              onChange={(e) => {
                const raw = e.target.value;
                if (/^\d*\.?\d*$/.test(raw)) {
                  setLandParcelInput(raw);
                  setProject({ ...project, landParcelAcres: parseFloatInput(raw) });
                }
              }}
              className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.land_parcel_acres ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {renderFieldError('land_parcel_acres')}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Total Towers</label>
            <input
              type="text"
              inputMode="numeric"
              value={project.totalTowers ?? ''}
              onChange={(e) => setProject({...project, totalTowers: parseIntInput(e.target.value)})}
              className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.total_towers ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {renderFieldError('total_towers')}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Floors Per Tower</label>
            <input
              type="text"
              value={project.floorsPerTower || ''}
              onChange={(e) => setProject({...project, floorsPerTower: e.target.value})}
              className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.floors_per_tower ? 'border-red-500' : 'border-[var(--border)]'}`}
              placeholder="e.g. G+33"
            />
            {renderFieldError('floors_per_tower')}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Construction Status</label>
            <select
              value={project.constructionStatus || 'under_construction'}
              onChange={(e) => setProject({ ...project, constructionStatus: e.target.value as any })}
              className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.construction_status ? 'border-red-500' : 'border-[var(--border)]'}`}
            >
              <option value="pre_launch">Pre-Launch</option>
              <option value="new_launch">New Launch</option>
              <option value="under_construction">Under Construction</option>
              <option value="ready_to_move">Ready to Move</option>
            </select>
            {renderFieldError('construction_status')}
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Construction %</label>
            <input
              type="text"
              inputMode="numeric"
              value={project.constructionPercent ?? ''}
              onChange={(e) => setProject({...project, constructionPercent: parseIntInput(e.target.value) ?? 0})}
              className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.construction_percent ? 'border-red-500' : 'border-[var(--border)]'}`}
            />
            {renderFieldError('construction_percent')}
          </div>
        </div>
      </div>

      {/* Images */}
      <div id="media" className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Project Gallery</h3>
        <ImageUpload
          value={project.images}
          onUpload={(url) => setProject({...project, images: [...(project.images || []), url]})}
          onRemove={(url) => setProject({...project, images: project.images?.filter(i => i !== url)})}
          label="Project Gallery"
        />
        {renderFieldError('images')}
      </div>

      {/* Master Plan Images */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
          Master Plan Images
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Upload layout/site plan images. These appear in the Master Plan section.
        </p>
        <ImageUpload
          onUpload={(url) => setProject(prev => ({...prev, masterPlanImages: [...(prev.masterPlanImages || []), url]}))}
          onRemove={(url) => setProject(prev => ({...prev, masterPlanImages: (prev.masterPlanImages || []).filter(i => i !== url)}))}
          value={project.masterPlanImages || []}
          label="Master Plan Image"
        />
        {renderFieldError('master_plan_images')}
      </div>

      {/* Floor Plan Images */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
          Floor Plan Images
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Upload general floor plan images. These appear in the Floor Plans section alongside per-unit plans.
        </p>
        <ImageUpload
          onUpload={(url) => setProject(prev => ({...prev, floorPlanImages: [...(prev.floorPlanImages || []), url]}))}
          onRemove={(url) => setProject(prev => ({...prev, floorPlanImages: (prev.floorPlanImages || []).filter(i => i !== url)}))}
          value={project.floorPlanImages || []}
          label="Floor Plan Image"
        />
        {renderFieldError('floor_plan_images')}
      </div>

      {/* Media & Documents */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Media & Documents</h3>
        <div className="space-y-2">
          <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Brochure URL</label>
          <input
            type="url"
            value={project.brochureUrl || ''}
            onChange={(e) => setProject({...project, brochureUrl: e.target.value})}
            className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.brochure_url ? 'border-red-500' : 'border-[var(--border)]'}`}
            placeholder="https://..."
          />
          {renderFieldError('brochure_url')}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Videos (YouTube)</h4>
            <button
              type="button"
              onClick={() => setProject({
                ...project,
                videos: [...(project.videos || []), { label: '', youtubeUrl: '' }]
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold hover:bg-[var(--primary)]/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Video
            </button>
          </div>
          {(project.videos || []).map((video, idx) => (
            <div key={idx} className="p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--text-muted)] uppercase">Video #{idx + 1}</span>
                <button type="button"
                  onClick={() => setProject({
                    ...project,
                    videos: (project.videos || []).filter((_, i) => i !== idx)
                  })}
                  className="text-[var(--text-muted)] hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Label</label>
                  <input type="text" value={video.label}
                    onChange={e => setProject({
                      ...project,
                      videos: (project.videos || []).map((v, i) => i === idx ? { ...v, label: e.target.value } : v)
                    })}
                    placeholder="e.g. 3.5BHK Sample Flat"
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`videos.${idx}.label`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`videos.${idx}.label`)}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">YouTube URL</label>
                  <input type="url" value={video.youtubeUrl}
                    onChange={e => setProject({
                      ...project,
                      videos: (project.videos || []).map((v, i) => i === idx ? { ...v, youtubeUrl: e.target.value } : v)
                    })}
                    placeholder="https://youtube.com/watch?v=..."
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`videos.${idx}.youtubeUrl`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`videos.${idx}.youtubeUrl`)}
                </div>
              </div>
            </div>
          ))}
          {(project.videos || []).length === 0 && (
            <p className="text-xs text-[var(--text-muted)] italic">No videos added yet.</p>
          )}
        </div>
      </div>

      {/* Inventory */}
      <div id="unit-layout" className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)]">
        <UnitConfigForm
          units={project.unitConfigs || []}
          onChange={(units) => setProject({...project, unitConfigs: units})}
          errors={errors}
        />
        {renderFieldError('unitConfigs')}
      </div>

      {/* Payment Plans & Bank Approvals */}
      <div id="pricing" className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Payment Plans</h3>
            <button
              type="button"
              onClick={() => setProject({
                ...project,
                paymentPlans: [...(project.paymentPlans || []), { name: '', description: '' }]
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold hover:bg-[var(--primary)]/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Plan
            </button>
          </div>
          {(project.paymentPlans || []).map((plan, idx) => (
            <div key={idx} className="p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--text-muted)] uppercase">Plan #{idx + 1}</span>
                <button type="button"
                  onClick={() => setProject({
                    ...project,
                    paymentPlans: (project.paymentPlans || []).filter((_, i) => i !== idx)
                  })}
                  className="text-[var(--text-muted)] hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Plan Name</label>
                  <input type="text" value={plan.name}
                    onChange={e => setProject({
                      ...project,
                      paymentPlans: (project.paymentPlans || []).map((p, i) => i === idx ? { ...p, name: e.target.value } : p)
                    })}
                    placeholder="e.g. CLP, Flexi Plan"
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`payment_plans.${idx}.name`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`payment_plans.${idx}.name`)}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Description</label>
                  <input type="text" value={plan.description}
                    onChange={e => setProject({
                      ...project,
                      paymentPlans: (project.paymentPlans || []).map((p, i) => i === idx ? { ...p, description: e.target.value } : p)
                    })}
                    placeholder="e.g. 10-80-10 plan"
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`payment_plans.${idx}.description`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`payment_plans.${idx}.description`)}
                </div>
              </div>
            </div>
          ))}
          {(project.paymentPlans || []).length === 0 && (
            <p className="text-xs text-[var(--text-muted)] italic">No payment plans added yet.</p>
          )}
        </div>

        <div className="space-y-3 border-t border-[var(--border)] pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Bank Approvals</h3>
            <button
              type="button"
              onClick={() => setProject({
                ...project,
                bankApprovals: [...(project.bankApprovals || []), { bankName: '', logoUrl: '' }]
              })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold hover:bg-[var(--primary)]/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Add Bank
            </button>
          </div>
          {(project.bankApprovals || []).map((bank, idx) => (
            <div key={idx} className="p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--text-muted)] uppercase">Bank #{idx + 1}</span>
                <button type="button"
                  onClick={() => setProject({
                    ...project,
                    bankApprovals: (project.bankApprovals || []).filter((_, i) => i !== idx)
                  })}
                  className="text-[var(--text-muted)] hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Bank Name</label>
                  <input type="text" value={bank.bankName}
                    onChange={e => setProject({
                      ...project,
                      bankApprovals: (project.bankApprovals || []).map((b, i) => i === idx ? { ...b, bankName: e.target.value } : b)
                    })}
                    placeholder="e.g. SBI, HDFC"
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`bank_approvals.${idx}.bankName`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`bank_approvals.${idx}.bankName`)}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Logo URL (optional)</label>
                  <input type="url" value={bank.logoUrl || ''}
                    onChange={e => setProject({
                      ...project,
                      bankApprovals: (project.bankApprovals || []).map((b, i) => i === idx ? { ...b, logoUrl: e.target.value } : b)
                    })}
                    placeholder="https://..."
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`bank_approvals.${idx}.logoUrl`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`bank_approvals.${idx}.logoUrl`)}
                </div>
              </div>
            </div>
          ))}
          {(project.bankApprovals || []).length === 0 && (
            <p className="text-xs text-[var(--text-muted)] italic">No bank approvals added yet.</p>
          )}
        </div>
      </div>

      {/* RERA Status */}
      <div id="rera" className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">RERA Status</h3>
        <div className="max-w-xs">
          <select
            value={project.reraStatus || 'not_registered'}
            onChange={(e) => setProject({ ...project, reraStatus: e.target.value as any })}
            className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm ${errors.rera_status ? 'border-red-500' : 'border-[var(--border)]'}`}
          >
            <option value="registered">✓ Registered</option>
            <option value="expired">⚠ Expired</option>
            <option value="pending">⏳ Pending</option>
            <option value="not_registered">✗ Not Registered</option>
          </select>
          {renderFieldError('rera_status')}
        </div>
      </div>

      {/* RERA Registrations */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
          RERA Registrations
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          Add one or multiple RERA registration numbers. Each gets its own QR code on the property page.
        </p>

        <div className="space-y-3">
          {(project.reraRegistrations || []).map((reg, idx) => (
            <div key={reg.id} className="p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[var(--text-muted)] uppercase">Registration #{idx + 1}</span>
                <button type="button"
                  onClick={() => setProject({
                    ...project,
                    reraRegistrations: (project.reraRegistrations || []).filter(r => r.id !== reg.id)
                  })}
                  className="text-[var(--text-muted)] hover:text-red-500 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">RERA Number *</label>
                  <input type="text" value={reg.reraId}
                    onChange={e => setProject({
                      ...project,
                      reraRegistrations: (project.reraRegistrations || []).map(r =>
                        r.id === reg.id ? { ...r, reraId: e.target.value } : r
                      )
                    })}
                    placeholder="e.g. P52100047931"
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`rera_registrations.${idx}.reraId`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`rera_registrations.${idx}.reraId`)}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">RERA Portal Link</label>
                  <input type="url" value={reg.reraLink || ''}
                    onChange={e => setProject({
                      ...project,
                      reraRegistrations: (project.reraRegistrations || []).map(r =>
                        r.id === reg.id ? { ...r, reraLink: e.target.value } : r
                      )
                    })}
                    placeholder="https://maharera.mahaonline.gov.in/..."
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`rera_registrations.${idx}.reraLink`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`rera_registrations.${idx}.reraLink`)}
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Description (optional)</label>
                  <input type="text" value={reg.description || ''}
                    onChange={e => setProject({
                      ...project,
                      reraRegistrations: (project.reraRegistrations || []).map(r =>
                        r.id === reg.id ? { ...r, description: e.target.value } : r
                      )
                    })}
                    placeholder="e.g. Tower 1–2"
                    className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] ${errors[`rera_registrations.${idx}.description`] ? 'border-red-500' : 'border-[var(--border)]'}`} />
                  {renderFieldError(`rera_registrations.${idx}.description`)}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button"
          onClick={() => setProject({
            ...project,
            reraRegistrations: [
              ...(project.reraRegistrations || []),
              { id: crypto.randomUUID(), reraId: '', reraLink: '', description: '' }
            ]
          })}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-lg text-xs font-bold hover:bg-[var(--primary)]/20 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add RERA Registration
        </button>
      </div>

      {/* Legal & Compliance */}
      <div id="legal" className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Legal & Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.litigation || false}
                onChange={(e) => setProject({...project, litigation: e.target.checked})}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">Litigation</span>
            </label>
            {project.litigation && (
              <div className="space-y-1 pl-7">
                <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Litigation Details</label>
                <textarea
                  value={project.litigationDetails || ''}
                  onChange={(e) => setProject({...project, litigationDetails: e.target.value})}
                  className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm min-h-[80px] ${errors.litigation_details ? 'border-red-500' : 'border-[var(--border)]'}`}
                  placeholder="Describe any ongoing litigation..."
                />
                {renderFieldError('litigation_details')}
              </div>
            )}
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.commencementCertificate || false}
                onChange={(e) => setProject({...project, commencementCertificate: e.target.checked})}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">Commencement Certificate</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={project.occupancyCertificate || false}
                onChange={(e) => setProject({...project, occupancyCertificate: e.target.checked})}
                className="w-4 h-4 rounded border-[var(--border)]"
              />
              <span className="text-sm font-medium text-[var(--text-primary)]">Occupancy Certificate</span>
            </label>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Legal Notes</label>
          <textarea
            value={project.legalNotes || ''}
            onChange={(e) => setProject({...project, legalNotes: e.target.value})}
            className={`w-full bg-[var(--surface-raised)] border rounded-xl px-4 py-2.5 text-sm min-h-[80px] ${errors.legal_notes ? 'border-red-500' : 'border-[var(--border)]'}`}
            placeholder="Any additional legal notes..."
          />
          {renderFieldError('legal_notes')}
        </div>
      </div>

      {/* Pros & Cons */}
      <div id="pros-cons" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--success)] uppercase tracking-widest">Pros</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPro}
              onChange={(e) => setNewPro(e.target.value)}
              className="flex-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs"
              placeholder="Add a pro..."
            />
            <button
              type="button"
              onClick={() => { if(newPro) { setProject({...project, pros: [...(project.pros || []), newPro]}); setNewPro(""); } }}
              className="p-2 bg-[var(--success)]/10 text-[var(--success)] rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {project.pros?.map((pro, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-[var(--surface-raised)] rounded-lg text-xs">
                <span>{pro}</span>
                <button type="button" onClick={() => setProject({...project, pros: project.pros?.filter((_, idx) => idx !== i)})} className="text-[var(--danger)]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {renderFieldError('pros')}
          </div>
        </div>

        <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
          <h3 className="text-sm font-bold text-[var(--danger)] uppercase tracking-widest">Cons</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCon}
              onChange={(e) => setNewCon(e.target.value)}
              className="flex-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs"
              placeholder="Add a con..."
            />
            <button
              type="button"
              onClick={() => { if(newCon) { setProject({...project, cons: [...(project.cons || []), newCon]}); setNewCon(""); } }}
              className="p-2 bg-[var(--danger)]/10 text-[var(--danger)] rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {project.cons?.map((con, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-[var(--surface-raised)] rounded-lg text-xs">
                <span>{con}</span>
                <button type="button" onClick={() => setProject({...project, cons: project.cons?.filter((_, idx) => idx !== i)})} className="text-[var(--danger)]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {renderFieldError('cons')}
          </div>
        </div>
      </div>


      {/* Amenities */}
      <div id="amenities-nearby" className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)] space-y-4">
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">Amenities</h3>
        <AmenityLibraryManager
          selectedInternal={project.internalAmenities || []}
          selectedExternal={project.externalAmenities || []}
          onChangeInternal={(items) => setProject({ ...project, internalAmenities: items })}
          onChangeExternal={(items) => setProject({ ...project, externalAmenities: items })}
        />
      </div>

      {/* Nearby Locations */}
      <div className="bg-[var(--surface)] p-6 rounded-2xl border border-[var(--border)]">
        <NearbyLocationsForm
          value={(project.nearbyLocations as ManualNearbyLocation[]) || []}
          onChange={(locs) => setProject({ ...project, nearbyLocations: locs })}
          errors={errors}
        />
        {renderFieldError('nearby_locations')}
      </div>

      <div className="flex justify-end gap-3 pt-4 pb-20 md:pb-4">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={isLoading || isSavingDraft}
          className="flex items-center gap-2 bg-[var(--surface-raised)] text-[var(--text-primary)] font-bold py-4 px-8 rounded-xl border border-[var(--border)] hover:bg-[var(--surface)] transition-all disabled:opacity-50"
        >
          {isSavingDraft ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Save Draft</span>
        </button>
        <button
          type="submit"
          disabled={isLoading || isSavingDraft}
          className="flex items-center gap-2 bg-[var(--primary)] text-white font-bold py-4 px-12 rounded-xl shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>{initialData ? 'Update Project' : 'Publish Project'}</span>
        </button>
      </div>
    </form>
  );
}

'use client';

import { useState } from "react";
import { Plus, Trash2, Maximize, IndianRupee, ImageIcon, X, Zap, Loader2 } from "lucide-react";
import { UnitConfig } from "@/types/project";
import { toast } from "sonner";
import { adminFetch } from '@/lib/admin-fetch';

interface UnitConfigFormProps {
  units: UnitConfig[];
  onChange: (units: UnitConfig[]) => void;
  errors?: Record<string, string[]>;
}

function formatIndianCurrency(num: number): string {
  return num.toLocaleString('en-IN');
}

export default function UnitConfigForm({ units, onChange, errors }: UnitConfigFormProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [areaInputs, setAreaInputs] = useState<Record<string, string>>({});

  const parseIntInput = (val: string): number | undefined => {
    const n = parseInt(val.replace(/^0+/, ''), 10)
    return isNaN(n) ? undefined : n
  }

  const parseFloatInput = (val: string): number | undefined => {
    const n = parseFloat(val)
    return isNaN(n) ? undefined : n
  }

  const calcPricePerSqft = (price: number, area: number): number => {
    return area > 0 ? Math.round(price / area) : 0;
  }

  const addUnit = () => {
    onChange([...units, {
      id: crypto.randomUUID(),
      type: '2 BHK Apartment',
      area: 1000,
      price: 8500000,
      priceIsPlus: false,
      pricePerSqFt: 8500,
      facing: ['East'],
      highlights: ['Spacious Balcony'],
      minDownpayment: undefined,
    }]);
    toast("New config added", { duration: 2500 });
  };

  const removeUnit = (id: string) => {
    onChange(units.filter(u => u.id !== id));
  };

  const updateUnit = (id: string, updates: Partial<UnitConfig>) => {
    onChange(units.map(u => {
      if (u.id !== id) return u;
      const merged = { ...u, ...updates };
      const newPrice = 'price' in updates ? updates.price : merged.price;
      const newArea = 'area' in updates ? updates.area : merged.area;
      const newPricePerSqft = calcPricePerSqft(newPrice ?? 0, newArea ?? 0);
      return { ...merged, pricePerSqFt: newPricePerSqft };
    }));
  };

  const handleFloorPlanUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadingId(id);

    try {
      const res = await adminFetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      const { url } = await res.json();
      updateUnit(id, { floorPlan: url });
    } catch (err: any) {
      console.error('Floor plan upload failed:', err);
      toast.error(err.message || 'Floor plan upload failed');
    } finally {
      setUploadingId(null);
    }
  };

  const removeFloorPlan = (id: string) => {
    updateUnit(id, { floorPlan: undefined });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-widest">
        Configurations & Pricing
      </h3>

      <div className="space-y-4">
        {units.map((unit, idx) => {
          const pricePerSqft = calcPricePerSqft(unit.price ?? 0, unit.area ?? 0);
          const displayPricePerSqft = `${formatIndianCurrency(pricePerSqft)}${unit.priceIsPlus ? '+' : ''}`;

          const typeError = errors?.[`unitConfigs.${idx}.type`]
          const priceError = errors?.[`unitConfigs.${idx}.price`]
          const areaError = errors?.[`unitConfigs.${idx}.area`]
          const parkingError = errors?.[`unitConfigs.${idx}.parking`]
          const minDownpaymentError = errors?.[`unitConfigs.${idx}.min_downpayment`]
          const floorPlanError = errors?.[`unitConfigs.${idx}.floor_plan`]

          return (
          <div key={unit.id} className="p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-xl space-y-4">

            {/* Config name + delete */}
            <div className="space-y-1">
              <div className="flex justify-between items-start gap-3">
                <input
                  type="text"
                  value={unit.type}
                  onChange={(e) => updateUnit(unit.id, { type: e.target.value })}
                  placeholder="e.g. 2 BHK Premium, 2 BHK Classic"
                  className={`flex-1 bg-[var(--surface)] border rounded-lg px-3 py-1.5 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] ${typeError ? 'border-red-500' : 'border-[var(--border)]'}`}
                />
                <button
                  type="button"
                  onClick={() => removeUnit(unit.id)}
                  className="text-[var(--danger)] p-1 hover:bg-[var(--danger-light)] rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {typeError && <p data-field-error={`unitConfigs.${idx}.type`} className="text-xs text-red-500 font-semibold">{typeError.join(', ')}</p>}
            </div>

            {/* Floor Plan Image Upload */}
            <div className="space-y-2">
              <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold flex items-center gap-1.5">
                <ImageIcon className="w-3 h-3" /> Floor Plan Image
              </label>
              {uploadingId === unit.id ? (
                <div className="w-full h-40 rounded-lg border border-[var(--border)] bg-[var(--surface)] flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : unit.floorPlan ? (
                <div className="relative w-full h-40 rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--surface)]">
                  <img
                    src={unit.floorPlan}
                    alt="Floor plan"
                    className="w-full h-full object-contain p-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeFloorPlan(unit.id)}
                    className="absolute top-2 right-2 w-6 h-6 bg-[var(--danger)] text-white rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-lg cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all">
                  <ImageIcon className="w-8 h-8 text-[var(--text-muted)] mb-2" />
                  <span className="text-xs text-[var(--text-muted)] font-semibold">Upload Floor Plan</span>
                  <span className="text-[10px] text-[var(--text-muted)] mt-0.5">PNG, JPG up to 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFloorPlanUpload(unit.id, e)}
                  />
                </label>
              )}
            </div>

            {/* Pricing & Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              {/* Price field with + toggle */}
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Price (₹)</label>
                <div className={`flex items-center gap-1 bg-[var(--surface)] border rounded-lg overflow-hidden ${priceError ? 'border-red-500' : 'border-[var(--border)]'}`}>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 flex-1">
                    <IndianRupee className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={priceInputs[unit.id] ?? (unit.price ? formatIndianCurrency(unit.price) : '')}
                      onFocus={(e) => {
                        setPriceInputs(prev => ({ ...prev, [unit.id]: String(unit.price ?? '') }));
                      }}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9]/g, '');
                        setPriceInputs(prev => ({ ...prev, [unit.id]: raw }));
                        const num = parseInt(raw, 10);
                        if (!isNaN(num)) {
                          updateUnit(unit.id, { price: num });
                        }
                      }}
                      onBlur={() => {
                        setPriceInputs(prev => {
                          const next = { ...prev };
                          delete next[unit.id];
                          return next;
                        });
                      }}
                      className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
                      placeholder="8500000"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateUnit(unit.id, { priceIsPlus: !unit.priceIsPlus })}
                    className={`px-2 py-1.5 text-xs font-bold border-l border-[var(--border)] transition-colors ${
                      unit.priceIsPlus
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:bg-[var(--primary)]/10'
                    }`}
                    title="Append + to price"
                  >
                    +
                  </button>
                </div>
                {priceError && <p data-field-error={`unitConfigs.${idx}.price`} className="text-xs text-red-500 font-semibold">{priceError.join(', ')}</p>}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Area (sq.ft)</label>
                <div className={`flex items-center gap-2 bg-[var(--surface)] border rounded-lg px-2 py-1.5 ${areaError ? 'border-red-500' : 'border-[var(--border)]'}`}>
                  <Maximize className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={areaInputs[unit.id] ?? (unit.area || unit.area === 0 ? String(unit.area) : '')}
                    onFocus={() => {
                      setAreaInputs(prev => ({ ...prev, [unit.id]: String(unit.area ?? '') }));
                    }}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (/^\d*\.?\d*$/.test(raw)) {
                        setAreaInputs(prev => ({ ...prev, [unit.id]: raw }));
                        updateUnit(unit.id, { area: parseFloatInput(raw) ?? 0 });
                      }
                    }}
                    onBlur={() => {
                      setAreaInputs(prev => {
                        const next = { ...prev };
                        delete next[unit.id];
                        return next;
                      });
                    }}
                    className="w-full bg-transparent border-none text-xs text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                {areaError && <p data-field-error={`unitConfigs.${idx}.area`} className="text-xs text-red-500 font-semibold">{areaError.join(', ')}</p>}
              </div>

              {/* Price / sq.ft — auto-calculated, read-only */}
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Price / sq.ft (₹)</label>
                <div className="flex items-center gap-2 bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg px-2 py-1.5 opacity-80">
                  <IndianRupee className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={displayPricePerSqft}
                    disabled
                    className="w-full bg-transparent border-none text-xs text-[var(--text-muted)] focus:outline-none cursor-default"
                  />
                </div>
              </div>

              {/* Min Downpayment (formerly maintenance_per_month) */}
              <div className="space-y-1">
                <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Min Downpayment (₹)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={unit.minDownpayment ?? ''}
                  onChange={(e) => updateUnit(unit.id, { minDownpayment: parseIntInput(e.target.value) })}
                  className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none ${minDownpaymentError ? 'border-red-500' : 'border-[var(--border)]'}`}
                  placeholder="0"
                />
                {minDownpaymentError && <p data-field-error={`unitConfigs.${idx}.min_downpayment`} className="text-xs text-red-500 font-semibold">{minDownpaymentError.join(', ')}</p>}
              </div>
            </div>

            {/* Parking */}
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--text-muted)] uppercase font-bold">
                Parking Spots
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={unit.parking ?? ''}
                onChange={(e) => updateUnit(unit.id, {
                  parking: parseIntInput(e.target.value)
                })}
                placeholder="0"
                className={`w-full bg-[var(--surface)] border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--primary)] ${parkingError ? 'border-red-500' : 'border-[var(--border)]'}`}
              />
              {parkingError && <p data-field-error={`unitConfigs.${idx}.parking`} className="text-xs text-red-500 font-semibold">{parkingError.join(', ')}</p>}
            </div>

            {/* Floor Plan URL field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Floor Plan Image URL
              </label>
              <input
                type="url"
                value={unit.floorPlan || ''}
                onChange={e => updateUnit(unit.id, { floorPlan: e.target.value })}
                placeholder="https://... (paste image URL or upload via admin)"
                className={`w-full px-3 py-2.5 bg-[var(--surface-raised)] border rounded-[var(--radius-xs)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] ${floorPlanError ? 'border-red-500' : 'border-[var(--border)]'}`}
              />
              {floorPlanError && <p data-field-error={`unitConfigs.${idx}.floor_plan`} className="text-xs text-red-500 font-semibold">{floorPlanError.join(', ')}</p>}
            </div>

            <p className="text-[10px] text-[var(--text-muted)] italic">
              💡 For multiple 2 BHK variants with different areas, add separate configurations (e.g. "2 BHK Classic 950sqft", "2 BHK Premium 1100sqft").
            </p>
          </div>
        )})}

        {units.length === 0 && (
          <div className="text-center py-8 text-[var(--text-muted)] text-sm border-2 border-dashed border-[var(--border)] rounded-xl">
            No configurations yet. Click "Add Configuration" below to get started.
          </div>
        )}
      </div>

      {/* Add Configuration button at bottom */}
      <button
        type="button"
        onClick={addUnit}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[var(--border)] text-[var(--text-muted)] rounded-xl text-sm font-semibold hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all"
      >
        <Plus className="w-4 h-4" /> Add Configuration
      </button>
    </div>
  );
}

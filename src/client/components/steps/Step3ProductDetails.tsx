import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle } from 'lucide-react';
import { useRepairFlow } from '../../context/RepairFlowContext.js';
import {
  BRAND_VALIDATION_RULES,
  validateModelNumber,
  validateSerialNumber
} from '../../utils/brandValidators.js';

const DEVICE_TYPES = [
  { id: 'smartphone', label: 'Smartphone' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'tablet', label: 'Tablet' }
];

const BRANDS_BY_TYPE: Record<string, string[]> = {
  smartphone: ['Apple', 'Samsung', 'Google', 'OnePlus', 'Xiaomi'],
  laptop: ['Apple', 'Dell', 'Lenovo', 'HP', 'Asus'],
  tablet: ['Apple', 'Samsung', 'Lenovo']
};

const FAULTS_BY_CATEGORY: Record<string, Array<{ id: string; label: string; description: string }>> = {
  smartphone: [
    { id: 'screen_crack', label: 'Screen / Display Glass Fracture', description: 'Cracked outer glass, touch dead zones, vertical lines, or black OLED ink bleed.' },
    { id: 'battery_degrade', label: 'Battery Degradation & Rapid Drain', description: 'Significant capacity drop, sudden shutdowns, or swollen chassis enclosure.' },
    { id: 'liquid_damage', label: 'Liquid Contact & Moisture Short', description: 'Device exposed to water, beverages, or steam; intermittent or failure to boot.' },
    { id: 'charging_port', label: 'Charging Port & Cable Connection Fault', description: 'Cable must be angled, slow charging warning, or physical debris lodged in port.' },
    { id: 'camera_fault', label: 'Camera Sensor or Optical Lens Fracture', description: 'Cracked rear camera glass lens, unfocused blurry shots, or OIS camera rattle.' }
  ],
  laptop: [
    { id: 'screen_crack', label: 'Screen Panel / Clamshell Fracture', description: 'Cracked inner matrix, flickering backlight, or broken hinge assembly.' },
    { id: 'battery_degrade', label: 'Battery Health Critical Failure', description: 'System reports service battery recommendation, fails to hold charge off AC adapter.' },
    { id: 'liquid_damage', label: 'Keyboard Liquid Spill & Logic Board Short', description: 'Spill across keyboard deck resulting in sticky keys, fan surge, or power loss.' },
    { id: 'charging_port', label: 'DC Jack / USB-C Thunderbolt Port Wear', description: 'Loose power receptacle, burnt pins, or failure to negotiate high-wattage power.' }
  ],
  tablet: [
    { id: 'screen_crack', label: 'Digitizer & Display Shattered', description: 'Shattered front glass, unresponsive stylus digitizer, or internal ink bleed.' },
    { id: 'battery_degrade', label: 'Battery Health Exhaustion', description: 'Thermal runaway while charging, short runtime, or battery failure.' }
  ]
};

export const Step3ProductDetails: React.FC = () => {
  const { state, updateState, nextStep, prevStep } = useRepairFlow();

  const [deviceType, setDeviceType] = useState<string>(state.deviceType || 'smartphone');
  const [brand, setBrand] = useState<string>(state.brand || 'Apple');
  const [productName, setProductName] = useState<string>(state.productName || 'iPhone 15 Pro');
  const [modelNumber, setModelNumber] = useState<string>(state.modelNumber || 'A3106');
  const [serialNumber, setSerialNumber] = useState<string>(state.serialNumber || 'F2LNQ1P0M9');
  const [faults, setFaults] = useState<string[]>(state.faults.length > 0 ? state.faults : ['screen_crack']);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const brandRule = BRAND_VALIDATION_RULES[brand];
  const availableFaults = FAULTS_BY_CATEGORY[deviceType] || FAULTS_BY_CATEGORY.smartphone;

  const handleDeviceTypeChange = (newType: string) => {
    setDeviceType(newType);
    const brandsForType = BRANDS_BY_TYPE[newType] || ['Apple'];
    if (!brandsForType.includes(brand)) {
      setBrand(brandsForType[0]);
    }
  };

  const handleFaultToggle = (faultId: string) => {
    if (faults.includes(faultId)) {
      if (faults.length === 1) {
        setErrors(prev => ({ ...prev, faults: 'At least one fault must be selected.' }));
        return;
      }
      setFaults(faults.filter(id => id !== faultId));
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.faults;
        return copy;
      });
    } else {
      setFaults([...faults, faultId]);
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.faults;
        return copy;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!productName.trim()) {
      newErrors.productName = 'Product name is required (e.g. iPhone 15 Pro).';
    }

    const modelVal = validateModelNumber(brand, modelNumber);
    if (!modelVal.valid && modelVal.error) {
      newErrors.modelNumber = modelVal.error;
    }

    const serialVal = validateSerialNumber(brand, serialNumber);
    if (!serialVal.valid && serialVal.error) {
      newErrors.serialNumber = serialVal.error;
    }

    if (faults.length === 0) {
      newErrors.faults = 'Please select at least one fault symptom.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    updateState({
      deviceType,
      brand,
      productName: productName.trim(),
      modelNumber: modelNumber.trim(),
      serialNumber: serialNumber.trim(),
      faults
    });

    nextStep();
  };

  return (
    <div className="max-w-3xl mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl sm:text-3xl font-semibold text-ink-primary mb-2">
          Product Specifications & Fault Profile
        </h2>
        <p className="text-sm text-ink-secondary leading-relaxed">
          Specify your exact hardware model and all observed symptoms. You may select multiple faults to receive a combined bench diagnostic quote.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card: Device Category & Brand */}
        <div className="bg-base-surface border border-base-border rounded-card p-6 shadow-card space-y-5">
          <div>
            <label className="block text-xs font-semibold text-ink-primary uppercase tracking-wider mb-2">
              Device Category
            </label>
            <div className="grid grid-cols-3 gap-3">
              {DEVICE_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleDeviceTypeChange(type.id)}
                  className={`py-3 px-4 rounded-control text-xs font-medium border text-center transition-colors ${
                    deviceType === type.id
                      ? 'border-accent bg-accent text-accent-text font-semibold'
                      : 'border-base-border bg-base-muted/40 text-ink-secondary hover:border-accent/40 hover:text-ink-primary'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="brand-select" className="block text-xs font-medium text-ink-primary mb-1">
                Manufacturer / Brand
              </label>
              <select
                id="brand-select"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full px-3 py-2.5 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary focus:border-accent focus:bg-base-surface transition-colors"
              >
                {(BRANDS_BY_TYPE[deviceType] || ['Apple']).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-name" className="block text-xs font-medium text-ink-primary mb-1">
                Marketing Model Name
              </label>
              <input
                id="product-name"
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. iPhone 15 Pro, Galaxy S23"
                className="w-full px-3.5 py-2.5 bg-base-muted/40 border border-base-border rounded-control text-sm text-ink-primary focus:border-accent focus:bg-base-surface transition-colors"
              />
              {errors.productName && (
                <p className="text-xs text-red-600 mt-1">{errors.productName}</p>
              )}
            </div>
          </div>

          {/* Model and Serial with Brand Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-base-border">
            <div>
              <label htmlFor="model-number" className="block text-xs font-medium text-ink-primary mb-1">
                Hardware Model Number
              </label>
              <input
                id="model-number"
                type="text"
                required
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder={brandRule?.modelPlaceholder || 'e.g. Model Number'}
                className={`w-full px-3.5 py-2.5 bg-base-muted/40 border rounded-control text-sm text-ink-primary focus:border-accent focus:bg-base-surface transition-colors ${
                  errors.modelNumber ? 'border-red-400' : 'border-base-border'
                }`}
              />
              {brandRule?.modelHint && (
                <p className="text-[11px] text-ink-muted mt-1 leading-normal">
                  {brandRule.modelHint}
                </p>
              )}
              {errors.modelNumber && (
                <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{errors.modelNumber}</span>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="serial-number" className="block text-xs font-medium text-ink-primary mb-1">
                Serial Number or IMEI
              </label>
              <input
                id="serial-number"
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder={brandRule?.serialPlaceholder || 'e.g. Serial Number'}
                className={`w-full px-3.5 py-2.5 bg-base-muted/40 border rounded-control text-sm text-ink-primary focus:border-accent focus:bg-base-surface transition-colors ${
                  errors.serialNumber ? 'border-red-400' : 'border-base-border'
                }`}
              />
              {brandRule?.serialHint && (
                <p className="text-[11px] text-ink-muted mt-1 leading-normal">
                  {brandRule.serialHint}
                </p>
              )}
              {errors.serialNumber && (
                <p className="text-xs text-red-600 mt-1 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{errors.serialNumber}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Card: Multi-Fault Selector */}
        <div className="bg-base-surface border border-base-border rounded-card p-6 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-heading text-base font-semibold text-ink-primary">
                Select Observed Symptoms & Faults
              </h3>
              <p className="text-xs text-ink-secondary">
                Select all conditions that apply. You may pick more than one fault.
              </p>
            </div>
            <span className="text-xs text-ink-muted px-2.5 py-1 bg-base-muted rounded-control border border-base-border">
              {faults.length} selected
            </span>
          </div>

          {errors.faults && (
            <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errors.faults}</span>
            </p>
          )}

          <div className="space-y-2.5">
            {availableFaults.map(fault => {
              const isChecked = faults.includes(fault.id);
              return (
                <label
                  key={fault.id}
                  className={`flex items-start gap-3 p-3.5 rounded-control border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-accent bg-accent-subtle/50 text-ink-primary'
                      : 'border-base-border bg-base-surface hover:bg-base-muted/30 text-ink-primary'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleFaultToggle(fault.id)}
                    className="mt-1 h-4 w-4 rounded border-base-border text-accent focus:ring-accent"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-semibold text-ink-primary block mb-0.5">
                      {fault.label}
                    </span>
                    <span className="text-xs text-ink-secondary leading-relaxed block">
                      {fault.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-base-border">
          <button
            type="button"
            onClick={prevStep}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink-primary bg-base-muted rounded-control border border-base-border transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Photo</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-medium bg-accent text-accent-text hover:bg-accent-hover rounded-control transition-colors"
          >
            <span>Proceed to Budget & Area</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

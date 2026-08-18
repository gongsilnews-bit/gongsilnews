
import React from 'react';
import type { DesignInputs } from '../types';
import { EXTERIOR_MATERIALS, WINDOW_OPTIONS, COLOR_OPTIONS, FACADE_OPTIONS, SIGNAGE_OPTIONS, LANDSCAPING_OPTIONS, LIGHTING_OPTIONS } from '../constants';
import { BuildingIcon, PaletteIcon, WindowIcon, LightbulbIcon, SparklesIcon, SignIcon, AspectRatioIcon, CopyIcon, LeafIcon } from './icons';

interface DesignFormProps {
  designInputs: DesignInputs;
  setDesignInputs: React.Dispatch<React.SetStateAction<DesignInputs>>;
}

const DesignForm: React.FC<DesignFormProps> = ({ designInputs, setDesignInputs }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDesignInputs(prev => ({ ...prev, [name]: name === 'versions' ? parseInt(value) : value }));
  };

  const handleMaterialChange = (materialId: string) => {
    setDesignInputs(prev => {
      const newMaterials = prev.materials.includes(materialId)
        ? prev.materials.filter(m => m !== materialId)
        : [...prev.materials, materialId];
      return { ...prev, materials: newMaterials };
    });
  };

  const handleCheckboxChange = (
    fieldName: 'windows' | 'colors' | 'facade' | 'signage' | 'landscaping' | 'lighting',
    value: string
  ) => {
    setDesignInputs(prev => {
      const currentValues = prev[fieldName];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [fieldName]: newValues };
    });
  };

  const FormRow: React.FC<{ label: string; name: string; icon: React.ReactNode; children: React.ReactNode }> = ({ label, icon, children }) => (
    <div>
      <label className="flex items-center text-md font-semibold text-gray-200 mb-2">
        {icon}
        <span className="ml-2">{label}</span>
      </label>
      {children}
    </div>
  );

  const CheckboxGroup: React.FC<{
    options: { id: string; name: string }[];
    selected: string[];
    onChange: (value: string) => void;
  }> = ({ options, selected, onChange }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {options.map(option => (
        <label key={option.id} className={`flex items-center p-2 border rounded-md cursor-pointer transition-all ${selected.includes(option.name) ? 'bg-[#f4a71b]/20 border-[#f4a71b]' : 'border-gray-600'}`}>
          <input
            type="checkbox"
            checked={selected.includes(option.name)}
            onChange={() => onChange(option.name)}
            className="h-4 w-4 text-[#f4a71b] bg-gray-700 border-gray-500 rounded focus:ring-[#f4a71b]"
          />
          <span className="ml-2 text-sm text-gray-300">{option.name}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-6">
      <h2 className="text-xl font-semibold text-gray-100">2. 설계 조건 입력</h2>
      
      <FormRow label="주요 외장재" name="materials" icon={<BuildingIcon className="w-5 h-5 text-gray-400" />}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EXTERIOR_MATERIALS.map(material => (
            <label key={material.id} className={`flex items-center p-2 border rounded-md cursor-pointer transition-all ${designInputs.materials.includes(material.id) ? 'bg-[#f4a71b]/20 border-[#f4a71b]' : 'border-gray-600'}`}>
              <input
                type="checkbox"
                checked={designInputs.materials.includes(material.id)}
                onChange={() => handleMaterialChange(material.id)}
                className="h-4 w-4 text-[#f4a71b] bg-gray-700 border-gray-500 rounded focus:ring-[#f4a71b]"
              />
              <span className="ml-2 text-sm text-gray-300">{material.name}</span>
            </label>
          ))}
        </div>
      </FormRow>

      <FormRow label="창호" name="windows" icon={<WindowIcon className="w-5 h-5 text-gray-400" />}>
        <CheckboxGroup options={WINDOW_OPTIONS} selected={designInputs.windows} onChange={(value) => handleCheckboxChange('windows', value)} />
      </FormRow>
      
      <FormRow label="색상" name="colors" icon={<PaletteIcon className="w-5 h-5 text-gray-400" />}>
        <CheckboxGroup options={COLOR_OPTIONS} selected={designInputs.colors} onChange={(value) => handleCheckboxChange('colors', value)} />
      </FormRow>
      
      <FormRow label="파사드 구성" name="facade" icon={<SparklesIcon className="w-5 h-5 text-gray-400" />}>
        <CheckboxGroup options={FACADE_OPTIONS} selected={designInputs.facade} onChange={(value) => handleCheckboxChange('facade', value)} />
      </FormRow>

      <FormRow label="간판/사인" name="signage" icon={<SignIcon className="w-5 h-5 text-gray-400" />}>
          <CheckboxGroup options={SIGNAGE_OPTIONS} selected={designInputs.signage} onChange={(value) => handleCheckboxChange('signage', value)} />
      </FormRow>

      <FormRow label="조경" name="landscaping" icon={<LeafIcon className="w-5 h-5 text-gray-400" />}>
          <CheckboxGroup options={LANDSCAPING_OPTIONS} selected={designInputs.landscaping} onChange={(value) => handleCheckboxChange('landscaping', value)} />
      </FormRow>
      
      <FormRow label="조명" name="lighting" icon={<LightbulbIcon className="w-5 h-5 text-gray-400" />}>
          <CheckboxGroup options={LIGHTING_OPTIONS} selected={designInputs.lighting} onChange={(value) => handleCheckboxChange('lighting', value)} />
      </FormRow>

      <h2 className="text-xl font-semibold text-gray-100 pt-2">3. 생성 옵션</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormRow label="버전 수" name="versions" icon={<CopyIcon className="w-5 h-5 text-gray-400" />}>
            <select name="versions" value={designInputs.versions} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-[#f4a71b] focus:border-[#f4a71b] text-sm text-gray-200">
                <option value={1}>1개</option>
                <option value={2}>2개</option>
                <option value={3}>3개</option>
                <option value={4}>4개</option>
                <option value={5}>5개</option>
            </select>
        </FormRow>
        <FormRow label="이미지 비율" name="aspectRatio" icon={<AspectRatioIcon className="w-5 h-5 text-gray-400" />}>
            <select name="aspectRatio" value={designInputs.aspectRatio} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-[#f4a71b] focus:border-[#f4a71b] text-sm text-gray-200">
                <option value="1:1">1:1 (정방형)</option>
                <option value="4:3">4:3 (표준)</option>
                <option value="3:2">3:2 (사진)</option>
                <option value="16:9">16:9 (와이드)</option>
            </select>
        </FormRow>
      </div>

    </div>
  );
};

export default DesignForm;

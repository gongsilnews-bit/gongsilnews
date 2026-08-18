
import React from 'react';
import type { DesignInputs } from '../types';
import { ROOM_OPTIONS, INTERIOR_STYLES, CEILING_STYLES, FLOOR_MATERIALS, WALL_MATERIALS, LIGHTING_MOODS, FURNITURE_TONES } from '../constants';
import { BuildingIcon, PaletteIcon, LightbulbIcon, SparklesIcon, AspectRatioIcon, CopyIcon, SofaIcon, PaintRollerIcon, CeilingIcon } from './icons';

interface DesignFormProps {
  designInputs: DesignInputs;
  setDesignInputs: React.Dispatch<React.SetStateAction<DesignInputs>>;
}

const DesignForm: React.FC<DesignFormProps> = ({ designInputs, setDesignInputs }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setDesignInputs(prev => ({ ...prev, [name]: name === 'versions' ? parseInt(value) : value }));
  };

  const handleCheckboxChange = (
    fieldName: 'style' | 'ceiling' | 'floor' | 'wall' | 'lighting' | 'furniture',
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
    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
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
      <h2 className="text-xl font-semibold text-gray-100">2. 인테리어 조건 입력</h2>
      
      <FormRow label="공간 유형" name="roomType" icon={<BuildingIcon className="w-5 h-5 text-gray-400" />}>
          <select name="roomType" value={designInputs.roomType} onChange={handleInputChange} className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-[#f4a71b] focus:border-[#f4a71b] text-sm text-gray-200">
              <option value="" disabled>공간을 선택해주세요</option>
              {ROOM_OPTIONS.map(room => (
                  <option key={room.id} value={room.name}>{room.name}</option>
              ))}
          </select>
      </FormRow>

      <FormRow label="인테리어 스타일" name="style" icon={<SparklesIcon className="w-5 h-5 text-gray-400" />}>
        <CheckboxGroup options={INTERIOR_STYLES} selected={designInputs.style} onChange={(value) => handleCheckboxChange('style', value)} />
      </FormRow>
      
      <FormRow label="천장 스타일" name="ceiling" icon={<CeilingIcon className="w-5 h-5 text-gray-400" />}>
        <CheckboxGroup options={CEILING_STYLES} selected={designInputs.ceiling} onChange={(value) => handleCheckboxChange('ceiling', value)} />
      </FormRow>

      <FormRow label="바닥재" name="floor" icon={<PaletteIcon className="w-5 h-5 text-gray-400" />}>
        <CheckboxGroup options={FLOOR_MATERIALS} selected={designInputs.floor} onChange={(value) => handleCheckboxChange('floor', value)} />
      </FormRow>
      
      <FormRow label="벽면 마감" name="wall" icon={<PaintRollerIcon className="w-5 h-5 text-gray-400" />}>
        <CheckboxGroup options={WALL_MATERIALS} selected={designInputs.wall} onChange={(value) => handleCheckboxChange('wall', value)} />
      </FormRow>

      <FormRow label="가구 톤/소재" name="furniture" icon={<SofaIcon className="w-5 h-5 text-gray-400" />}>
          <CheckboxGroup options={FURNITURE_TONES} selected={designInputs.furniture} onChange={(value) => handleCheckboxChange('furniture', value)} />
      </FormRow>

      <FormRow label="조명 분위기" name="lighting" icon={<LightbulbIcon className="w-5 h-5 text-gray-400" />}>
          <CheckboxGroup options={LIGHTING_MOODS} selected={designInputs.lighting} onChange={(value) => handleCheckboxChange('lighting', value)} />
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
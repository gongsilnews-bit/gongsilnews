
import React from 'react';
import type { ImageFile } from '../types';
import { UploadCloudIcon, XIcon } from './icons';

interface ImageUploaderProps {
  imageFiles: ImageFile[];
  setImageFiles: React.Dispatch<React.SetStateAction<ImageFile[]>>;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const ImageUploader: React.FC<ImageUploaderProps> = ({ imageFiles, setImageFiles }) => {

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newFiles: ImageFile[] = [];
      for (const file of Array.from(files).slice(0, 3 - imageFiles.length)) {
        // FIX: Add type assertion to treat items from FileList as File objects to resolve type inference issues.
        const currentFile = file as File;
        if (currentFile.type.startsWith('image/')) {
          const base64 = await fileToBase64(currentFile);
          newFiles.push({ name: currentFile.name, type: currentFile.type, base64 });
        }
      }
      if (newFiles.length > 0) {
        setImageFiles(prev => [...prev, ...newFiles].slice(0, 3));
      }
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-semibold mb-4 text-gray-100">1. 실내 사진 업로드 (1~3장)</h2>
      <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center">
        <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-500" />
        <p className="mt-2 text-sm text-gray-400">
          거실, 침실 등 인테리어할 공간 사진을 올려주세요.
        </p>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={imageFiles.length >= 3}
        />
        <label
          htmlFor="file-upload"
          className={`mt-4 inline-block px-4 py-2 text-sm font-medium text-white rounded-md cursor-pointer transition-colors ${
            imageFiles.length >= 3 
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-[#f4a71b] hover:bg-[#d9900d]'
          }`}
        >
          파일 선택
        </label>
        <p className="text-xs text-gray-500 mt-1">최대 3장까지 업로드 가능합니다.</p>
      </div>
      
      {imageFiles.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4">
          {imageFiles.map((file, index) => (
            <div key={index} className="relative group">
              <img
                src={`data:${file.type};base64,${file.base64}`}
                alt={file.name}
                className="w-full h-32 object-cover rounded-md"
              />
              <button
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;

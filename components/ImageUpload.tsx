
import React, { useState, useEffect } from 'react';

interface ImageUploadProps {
  label: string;
  file?: File;
  caption?: string;
  onFileChange: (file: File | undefined) => void;
  onCaptionChange?: (caption: string) => void;
  id: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ 
  label, 
  file, 
  caption, 
  onFileChange, 
  onCaptionChange, 
  id,
  className 
}) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileChange(e.target.files[0]);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <div className={`relative border-2 border-dashed rounded-lg transition-colors overflow-hidden ${preview ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}`}>
        
        {!preview ? (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <svg className="w-8 h-8 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-slate-500">Click to upload</p>
            <input 
              type="file" 
              id={id}
              accept="image/*"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="relative w-full aspect-[4/3] bg-slate-200 group">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <label htmlFor={id} className="cursor-pointer bg-white text-slate-900 px-3 py-1 rounded text-xs font-medium hover:bg-slate-100">
                Change
                <input 
                  type="file" 
                  id={id}
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <button 
                onClick={() => onFileChange(undefined)}
                className="bg-red-500 text-white px-3 py-1 rounded text-xs font-medium hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
      {onCaptionChange && (
        <input
          type="text"
          value={caption || ''}
          onChange={(e) => onCaptionChange(e.target.value)}
          placeholder="Enter caption..."
          className="text-sm border border-slate-300 rounded px-2 py-1 w-full focus:ring-1 focus:ring-blue-500 outline-none"
        />
      )}
    </div>
  );
};

export default ImageUpload;

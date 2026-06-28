import { useState, useRef } from 'react';
import { ImagePlus, Edit2, X } from 'lucide-react';

interface ImageUploadZoneProps {
  preview: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  label?: string;
}

export function ImageUploadZone({
  preview,
  onFileChange,
  onClear,
  label = 'اسحب الصورة هنا أو اضغط للاختيار',
}: ImageUploadZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
      onFileChange(fakeEvent);
    }
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer ${
        preview ? 'border-admin-accent/30 bg-white' : 'border-admin-border bg-admin-bg-base hover:bg-admin-bg-subtle hover:border-admin-accent/50'
      } ${isDragging ? 'border-admin-accent bg-admin-accent-light' : ''}`}
      onClick={() => !preview && fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
      {preview ? (
        <div className="relative group p-1.5">
          <img src={preview} alt="Preview" className="aspect-square w-full max-w-[180px] mx-auto object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/35 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="p-2 bg-red-500/30 rounded-lg text-white hover:bg-red-500/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-white border border-admin-border flex items-center justify-center mb-3 shadow-admin-card">
            <ImagePlus className="w-5 h-5 text-admin-accent" />
          </div>
          <p className="text-xs text-admin-text-primary font-bold">{label}</p>
          <p className="text-[10px] text-admin-text-muted mt-1">PNG, JPG حتى 5MB</p>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Sliders, X, ZoomOut, ZoomIn } from 'lucide-react';

interface ImageCropperModalProps {
  src: string;
  file: File;
  onConfirm: (croppedFile: File) => void;
  onCancel: () => void;
}

export function ImageCropperModal({
  src,
  file,
  onConfirm,
  onCancel,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Pan limit constraints
  const limitPan = (x: number, y: number, currentZoom: number) => {
    if (!dimensions.width || !dimensions.height) return { x, y };
    const W_crop = 288;
    const wScaled = dimensions.width * currentZoom;
    const hScaled = dimensions.height * currentZoom;

    const maxX = Math.max(0, (wScaled - W_crop) / 2);
    const minX = -maxX;
    const maxY = Math.max(0, (hScaled - W_crop) / 2);
    const minY = -maxY;

    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  };

  // Adjust pan when zoom or dimensions change to keep image inside crop window
  useEffect(() => {
    setPan((prev) => limitPan(prev.x, prev.y, zoom));
  }, [zoom, dimensions]);

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPan(limitPan(newX, newY, zoom));
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch pan handlers (mobile/tablet support)
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    if (e.touches && e.touches[0]) {
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    if (e.touches && e.touches[0]) {
      const newX = e.touches[0].clientX - dragStart.x;
      const newY = e.touches[0].clientY - dragStart.y;
      setPan(limitPan(newX, newY, zoom));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const W_crop = 288;
    // Calculate fit scale so the image covers the crop window
    const fitScale = Math.max(W_crop / img.naturalWidth, W_crop / img.naturalHeight);
    setDimensions({
      width: img.naturalWidth * fitScale,
      height: img.naturalHeight * fitScale,
    });
  };

  const handleSave = () => {
    if (!imageRef.current || !dimensions.width || !dimensions.height) return;
    setIsProcessing(true);
    const img = imageRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    const W_crop = 288;
    const W_out = 800;
    const canvasScale = W_out / W_crop;

    const wScaled = dimensions.width * zoom;
    const hScaled = dimensions.height * zoom;

    const left = (W_crop - wScaled) / 2 + pan.x;
    const top = (W_crop - hScaled) / 2 + pan.y;

    const dx = left * canvasScale;
    const dy = top * canvasScale;
    const dw = wScaled * canvasScale;
    const dh = hScaled * canvasScale;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W_out, W_out);
    ctx.drawImage(img, dx, dy, dw, dh);

    canvas.toBlob((blob) => {
      setIsProcessing(false);
      if (blob) {
        // Output file as compressed jpeg
        const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';
        const croppedFile = new File([blob], cleanName, { type: 'image/jpeg' });
        onConfirm(croppedFile);
      }
    }, 'image/jpeg', 0.85); // Compress to 85% JPEG
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white border border-admin-border rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-5 text-right"
        dir="rtl"
      >
        <div className="w-full flex justify-between items-center pb-3 border-b border-admin-border">
          <h3 className="font-extrabold text-admin-text-primary text-sm flex items-center gap-2">
            <Sliders className="w-4 h-4 text-admin-accent" />
            <span>قص وتعديل الصورة (1:1)</span>
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-lg text-admin-text-muted hover:text-admin-text-primary hover:bg-admin-bg-base transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropping viewport */}
        <div className="relative w-72 h-72 overflow-hidden rounded-xl border border-admin-border bg-stone-100 flex items-center justify-center cursor-move select-none shadow-inner">
          <img
            ref={imageRef}
            src={src}
            alt="To Crop"
            onLoad={handleImageLoad}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              width: dimensions.width ? `${dimensions.width}px` : 'auto',
              height: dimensions.height ? `${dimensions.height}px` : 'auto',
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center',
              maxWidth: 'none',
              maxHeight: 'none',
            }}
            draggable={false}
          />
          {/* Overlay grid / frame */}
          <div className="absolute inset-0 pointer-events-none border-2 border-admin-accent rounded-xl shadow-[0_0_0_999px_rgba(255,255,255,0.4)]" />
        </div>

        <p className="text-[10px] text-admin-text-muted text-center leading-relaxed">
          اسحب الصورة لضبط الزاوية، واستخدم شريط التكبير بالأسفل للتحجيم.
        </p>

        {/* Zoom controls */}
        <div className="w-full flex items-center gap-3 px-2">
          <ZoomOut className="w-4 h-4 text-admin-text-muted flex-shrink-0" />
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-admin-accent bg-admin-bg-base rounded-lg appearance-none h-1.5 cursor-pointer"
          />
          <ZoomIn className="w-4 h-4 text-admin-text-muted flex-shrink-0" />
        </div>

        {/* Action buttons */}
        <div className="w-full flex gap-3 pt-3 border-t border-admin-border">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-lg border border-admin-border text-admin-text-secondary font-bold text-xs hover:bg-admin-bg-base transition-colors"
          >
            إلغاء
          </button>
          <motion.button
            type="button"
            disabled={isProcessing}
            onClick={handleSave}
            whileTap={{ scale: 0.97 }}
            className="flex-1 py-3 px-4 rounded-lg bg-admin-accent text-white font-bold text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2 shadow-sm"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>قص وحفظ الصورة</span>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

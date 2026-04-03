'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface FilterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

function FilterSlider({ label, value, min, max, onChange, disabled }: FilterSliderProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}: {value}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full accent-blue-600 cursor-pointer disabled:opacity-50"
      />
    </div>
  );
}

export default function Home() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    grayscale: 0,
    sepia: 0,
    brightness: 100,
    contrast: 100,
    blur: 0,
    hueRotate: 0,
    saturate: 100,
  });
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOriginalFile(file);
    setImage(URL.createObjectURL(file));
    setFilters({
      grayscale: 0,
      sepia: 0,
      brightness: 100,
      contrast: 100,
      blur: 0,
      hueRotate: 0,
      saturate: 100,
    });
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setProcessError(null);
  }, []);

  const processImageWithAPI = useCallback(async () => {
    if (!originalFile) return;

    setIsProcessing(true);
    setProcessError(null);

    try {
      const formData = new FormData();
      formData.append('image', originalFile);
      formData.append('filters', JSON.stringify(filters));
      formData.append('rotation', rotation.toString());
      formData.append('flipHorizontal', flipHorizontal.toString());
      formData.append('flipVertical', flipVertical.toString());

      const response = await fetch('http://0.0.0.0:8000/process-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      setImage(imageUrl);
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, [originalFile, filters, rotation, flipHorizontal, flipVertical]);

  useEffect(() => {
    if (!originalFile) return;

    const timeoutId = setTimeout(async () => {
      setIsProcessing(true);
      setProcessError(null);

      try {
        const formData = new FormData();
        formData.append('image', originalFile);
        formData.append('filters', JSON.stringify(filters));
        formData.append('rotation', rotation.toString());
        formData.append('flipHorizontal', flipHorizontal.toString());
        formData.append('flipVertical', flipVertical.toString());

        console.log('Sending to API:', {
          filters,
          rotation,
          flipHorizontal,
          flipVertical,
        });

        const response = await fetch('http://0.0.0.0:8000/process-image', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        setImage(imageUrl);
      } catch (err) {
        setProcessError(err instanceof Error ? err.message : 'Failed to process image');
      } finally {
        setIsProcessing(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [originalFile, filters, rotation, flipHorizontal, flipVertical]);

  const handleDownload = useCallback(() => {
    if (!image) return;
    const link = document.createElement('a');
    link.download = 'edited-image.png';
    link.href = image;
    link.click();
  }, [image]);

  const resetFilters = useCallback(() => {
    setFilters({
      grayscale: 0,
      sepia: 0,
      brightness: 100,
      contrast: 100,
      blur: 0,
      hueRotate: 0,
      saturate: 100,
    });
    setRotation(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    if (originalFile) {
      setImage(URL.createObjectURL(originalFile));
    }
  }, [originalFile]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Image Manipulation (Server-Side)</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {!image ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl h-96 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-600 font-medium">Click to upload an image</p>
                <p className="text-sm text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-4 relative">
                {isProcessing && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-xl">
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </div>
                  </div>
                )}
                <img
                  src={image}
                  alt="Processed"
                  className="w-full h-auto max-h-[600px] object-contain rounded-lg"
                />
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>

              <FilterSlider
                label="Grayscale"
                value={filters.grayscale}
                min={0}
                max={100}
                disabled={!originalFile || isProcessing}
                onChange={(val) => setFilters((f) => ({ ...f, grayscale: val }))}
              />
              <FilterSlider
                label="Sepia"
                value={filters.sepia}
                min={0}
                max={100}
                disabled={!originalFile || isProcessing}
                onChange={(val) => setFilters((f) => ({ ...f, sepia: val }))}
              />
              <FilterSlider
                label="Brightness"
                value={filters.brightness}
                min={0}
                max={200}
                disabled={!originalFile || isProcessing}
                onChange={(val) => setFilters((f) => ({ ...f, brightness: val }))}
              />
              <FilterSlider
                label="Contrast"
                value={filters.contrast}
                min={0}
                max={200}
                disabled={!originalFile || isProcessing}
                onChange={(val) => setFilters((f) => ({ ...f, contrast: val }))}
              />
              <FilterSlider
                label="Blur"
                value={filters.blur}
                min={0}
                max={20}
                disabled={!originalFile || isProcessing}
                onChange={(val) => setFilters((f) => ({ ...f, blur: val }))}
              />
              <FilterSlider
                label="Hue Rotate"
                value={filters.hueRotate}
                min={0}
                max={360}
                disabled={!originalFile || isProcessing}
                onChange={(val) => setFilters((f) => ({ ...f, hueRotate: val }))}
              />
              <FilterSlider
                label="Saturate"
                value={filters.saturate}
                min={0}
                max={200}
                disabled={!originalFile || isProcessing}
                onChange={(val) => setFilters((f) => ({ ...f, saturate: val }))}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Transform</h2>

              <div className="flex gap-2">
                <button
                  onClick={() => setRotation((r) => r - 90)}
                  disabled={!originalFile || isProcessing}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  Rotate -90°
                </button>
                <button
                  onClick={() => setRotation((r) => r + 90)}
                  disabled={!originalFile || isProcessing}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  Rotate +90°
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setFlipHorizontal((h) => !h)}
                  disabled={!originalFile || isProcessing}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${flipHorizontal
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                >
                  Flip Horizontal
                </button>
                <button
                  onClick={() => setFlipVertical((v) => !v)}
                  disabled={!originalFile || isProcessing}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${flipVertical
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                >
                  Flip Vertical
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  {image ? 'Change Image' : 'Upload Image'}
                </button>
                <button
                  onClick={resetFilters}
                  disabled={!originalFile || isProcessing}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  Reset
                </button>
              </div>

              {processError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {processError}
                </div>
              )}

              <button
                onClick={handleDownload}
                disabled={!image}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                Download Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

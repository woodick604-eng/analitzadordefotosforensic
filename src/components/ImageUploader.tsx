
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { DocumentScannerIcon } from './icons/DocumentScannerIcon';
import { TrashIcon } from './icons/TrashIcon';
import PhotoEditor from './PhotoEditor';

/* Added missing props for valuation and file updates to match App.tsx usage */
interface ImageUploaderProps {
  files: File[];
  valuation: string;
  onFilesSelect: (files: File[]) => void;
  onValuationChange: (val: string) => void;
  onAnalyze: () => void;
  onUpdateFile: (index: number, newFile: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  files, valuation, onFilesSelect, onValuationChange, onAnalyze, onUpdateFile 
}) => {
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const newUrls = files.map(file => URL.createObjectURL(file));
    setPreviews(newUrls);
    return () => newUrls.forEach(url => URL.revokeObjectURL(url));
  }, [files]);

  const handleFileChange = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles) {
      onFilesSelect([...files, ...Array.from(selectedFiles)]);
    }
  }, [files, onFilesSelect]);

  const removeImage = (index: number) => {
    onFilesSelect(files.filter((_, i) => i !== index));
  };

  /* Fixed handleSaveEdition to convert dataUrl to File and call onUpdateFile */
  const handleSaveEdition = async (dataUrl: string) => {
    if (editingIndex !== null) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const newFile = new File([blob], files[editingIndex].name, { type: "image/jpeg" });
        onUpdateFile(editingIndex, newFile);
        setEditingIndex(null);
      } catch (e) {
        console.error("Error al desar l'edició:", e);
      }
    }
  };

  const hasFiles = files.length > 0;

  return (
    <div className="w-full space-y-8 max-w-5xl mx-auto">
      {/* VALUATION INPUT */}
      <div className="bg-base-200 border border-base-300 p-8 rounded-3xl shadow-xl">
        <h3 className="text-xl font-bold text-content-100 uppercase tracking-tight mb-4">Valoració del Cas (Incloure NAT)</h3>
        <textarea
          value={valuation}
          onChange={(e) => onValuationChange(e.target.value)}
          placeholder="Escriu la hipòtesi del cas. Recorda incloure el número d'atestat (Ex: NAT-2024-5085)..."
          className="w-full min-h-[120px] bg-base-100 border border-base-300 rounded-xl p-6 text-content-100 focus:border-brand-primary outline-none transition-all font-serif resize-y text-lg"
        />
      </div>

      <div className="bg-base-200 border border-base-300 p-8 rounded-3xl shadow-xl">
        <div 
          onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { 
            e.preventDefault(); 
            setIsDraggingOver(false); 
            if (e.dataTransfer.files.length > 0) handleFileChange(e.dataTransfer.files); 
          }}
          className={`min-h-[220px] border-2 ${isDraggingOver ? 'border-brand-primary bg-brand-primary/5' : 'border-dashed border-base-300'} rounded-3xl p-6 transition-all duration-300 flex items-center justify-center`}
        >
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
          
          {!hasFiles ? (
            <div className="flex flex-col items-center justify-center py-10 cursor-pointer group w-full" onClick={() => fileInputRef.current?.click()}>
              <UploadIcon className="h-10 w-10 text-content-200 group-hover:text-brand-primary mb-4" />
              <p className="text-xl font-black text-content-100 uppercase tracking-tight">Incorpora les Fotografies</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 w-full">
              {files.map((file, index) => (
                <div key={index} className="relative aspect-square group">
                  <img src={previews[index]} className="w-full h-full object-cover rounded-lg border border-base-300" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-lg flex flex-col items-center justify-center gap-2 p-2">
                    <button onClick={() => setEditingIndex(index)} className="w-full py-1 bg-brand-primary text-white rounded text-[10px] font-bold">EDITAR</button>
                    <button onClick={() => removeImage(index)} className="w-full py-1 bg-red-600 text-white rounded text-[10px] font-bold">ELIMINAR</button>
                  </div>
                </div>
              ))}
              <button onClick={() => fileInputRef.current?.click()} className="aspect-square border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center hover:border-brand-primary transition-all">
                <UploadIcon className="h-6 w-6 text-content-200" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <button
            onClick={onAnalyze}
            disabled={!hasFiles || !valuation.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-bold py-4 px-10 rounded-full shadow-lg hover:scale-105 disabled:opacity-30 transition-all uppercase"
          >
            <DocumentScannerIcon className="w-6 h-6" />
            <span>Generar Atestat Policial</span>
          </button>
        </div>
      </div>

      {editingIndex !== null && <PhotoEditor imageUrl={previews[editingIndex]} onSave={handleSaveEdition} onCancel={() => setEditingIndex(null)} />}
    </div>
  );
};

export default ImageUploader;

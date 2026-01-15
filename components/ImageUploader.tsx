
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { UploadIcon } from './icons/UploadIcon';
import { DocumentScannerIcon } from './icons/DocumentScannerIcon';
import { TrashIcon } from './icons/TrashIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ExportResolution, ManagedFile } from '../types';

interface ImageUploaderProps {
  managedFiles: ManagedFile[];
  valuation: string;
  nat: string;
  resolution: ExportResolution;
  onFilesSelect: (files: File[]) => void;
  onUpdateManagedFiles: (files: ManagedFile[]) => void;
  onRemoveFile: (id: string) => void;
  onValuationChange: (val: string) => void;
  onNatChange: (val: string) => void;
  onResolutionChange: (res: ExportResolution) => void;
  onAnalyze: () => void;
  onUpdateFileContent: (index: number, newFile: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  managedFiles, valuation, nat, resolution, onFilesSelect, onUpdateManagedFiles, onRemoveFile, onValuationChange, onNatChange, onResolutionChange, onAnalyze, onUpdateFileContent 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const natInputRef = useRef<HTMLInputElement>(null);
  
  const currentYear = new Date().getFullYear().toString().slice(-2);
  const natSuffix = `/${currentYear} ART MN`;

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleFileChange = useCallback((selectedFiles: FileList | null) => {
    if (selectedFiles) {
      onFilesSelect(Array.from(selectedFiles));
    }
  }, [onFilesSelect]);

  const handleNatFocus = () => {
    if (natInputRef.current) {
      natInputRef.current.setSelectionRange(0, 0);
    }
  };

  const hasFiles = managedFiles.length > 0;

  return (
    <div className="w-full space-y-10 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* SECCIÓ CONFIGURACIÓ INICIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-base-200 border border-base-300 p-8 rounded-[2.5rem] shadow-2xl transition-all hover:border-brand-primary/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-brand-primary/20 p-3 rounded-2xl">
              <SparklesIcon className="w-6 h-6 text-brand-primary" />
            </div>
            <h3 className="text-sm font-black text-content-100 uppercase tracking-widest">Atestat Policial (NAT)</h3>
          </div>
          <div className="relative group">
            <input
              ref={natInputRef}
              type="text"
              value={nat}
              onChange={(e) => onNatChange(e.target.value)}
              onFocus={handleNatFocus}
              placeholder="Ex: 5085"
              className="w-full bg-base-100 border border-base-300 rounded-2xl py-6 px-7 text-2xl font-black text-content-100 focus:border-brand-primary outline-none transition-all pr-[160px] shadow-inner"
              autoFocus
            />
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-content-200 opacity-40 text-xl font-black pointer-events-none group-focus-within:opacity-100 transition-opacity">
              {natSuffix}
            </div>
          </div>
        </div>

        <div className="bg-base-200 border border-base-300 p-8 rounded-[2.5rem] shadow-2xl transition-all hover:border-brand-primary/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-brand-secondary/20 p-3 rounded-2xl">
              <PhotoIcon className="w-6 h-6 text-brand-secondary" />
            </div>
            <h3 className="text-sm font-black text-content-100 uppercase tracking-widest">Resolució d'Exportació</h3>
          </div>
          <div className="flex bg-base-100 p-1.5 rounded-2xl border border-base-300">
            {(['HD', 'HD_PLUS', 'FULL_HD'] as ExportResolution[]).map((res) => (
              <button
                key={res}
                onClick={() => onResolutionChange(res)}
                className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  resolution === res 
                    ? 'bg-brand-primary text-white shadow-lg' 
                    : 'text-content-200 hover:bg-base-300/30'
                }`}
              >
                {res.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-base-200 border border-base-300 p-8 rounded-[2.5rem] shadow-2xl transition-all hover:border-brand-primary/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-brand-primary/20 p-3 rounded-2xl">
            <DocumentScannerIcon className="w-6 h-6 text-brand-primary" />
          </div>
          <h3 className="text-sm font-black text-content-100 uppercase tracking-widest">Descripció de la Dinàmica Policial</h3>
        </div>
        <textarea
          value={valuation}
          onChange={(e) => onValuationChange(e.target.value)}
          placeholder="Redacta els fets de l'accident per donar context a l'anàlisi forense..."
          className="w-full min-h-[160px] bg-base-100 border border-base-300 rounded-[2rem] p-8 text-content-100 focus:border-brand-primary outline-none transition-all font-arial text-lg leading-relaxed shadow-inner"
        />
      </div>

      <div className="bg-base-200 border border-base-300 p-10 rounded-[3rem] shadow-2xl">
        <div 
          onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
          onDragLeave={() => setIsDraggingOver(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setIsDraggingOver(false); if (e.dataTransfer.files.length > 0) handleFileChange(e.dataTransfer.files); }}
          className={`min-h-[300px] border-2 ${isDraggingOver ? 'border-brand-primary bg-brand-primary/5' : 'border-dashed border-base-300'} rounded-[2.5rem] p-10 transition-all flex items-center justify-center bg-base-100/30 shadow-inner group`}
        >
          <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png" className="hidden" onChange={(e) => handleFileChange(e.target.files)} />
          
          {!hasFiles ? (
            <div className="flex flex-col items-center justify-center py-16 cursor-pointer w-full" onClick={() => fileInputRef.current?.click()}>
              <UploadIcon className="h-14 w-14 text-content-200 group-hover:text-brand-primary mb-6 transition-transform group-hover:scale-110" />
              <p className="text-2xl font-black text-content-100 uppercase tracking-tight">Selecciona les fotografies de l'accident</p>
              <p className="text-xs text-content-200 mt-3 opacity-40 uppercase tracking-widest font-bold">Arrossega o clica per buscar fitxers</p>
            </div>
          ) : (
            <Reorder.Group 
              values={managedFiles} 
              onReorder={onUpdateManagedFiles}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 w-full"
            >
              <AnimatePresence initial={false}>
                {managedFiles.map((mf, index) => (
                  <Reorder.Item 
                    key={mf.id} 
                    value={mf}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileDrag={{ 
                      scale: 1.15, 
                      zIndex: 50, 
                      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                      cursor: "grabbing"
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="relative aspect-square cursor-grab"
                  >
                    <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-base-300 hover:border-brand-primary transition-colors bg-black shadow-lg pointer-events-none">
                      <img src={mf.preview} className="w-full h-full object-cover" alt={`Evidència ${index + 1}`} />
                      <div className="absolute top-2 left-2 bg-brand-primary text-white text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-lg shadow-lg z-10">
                        {index + 1}
                      </div>
                    </div>
                    {/* Botó eliminar separat per no interferir amb el drag */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onRemoveFile(mf.id); }}
                      className="absolute top-2 right-2 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-lg transition-opacity shadow-md z-20"
                    >
                      <TrashIcon className="w-3 h-3" />
                    </button>
                  </Reorder.Item>
                ))}
              </AnimatePresence>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className="aspect-square border-2 border-dashed border-base-300 rounded-2xl flex flex-col items-center justify-center hover:border-brand-primary hover:bg-brand-primary/5 transition-all opacity-40 hover:opacity-100"
              >
                <UploadIcon className="h-8 w-8 text-content-200" />
                <span className="text-[9px] font-black uppercase mt-2">Afegir</span>
              </button>
            </Reorder.Group>
          )}
        </div>

        <div className="mt-14 flex justify-center">
          <button
            onClick={onAnalyze}
            disabled={!hasFiles || !valuation.trim() || !nat.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-brand-primary to-brand-secondary text-white font-black py-7 px-20 rounded-full shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-30 transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-5"
          >
            <DocumentScannerIcon className="w-9 h-9" />
            <span className="text-xl">PROCESSAR EVIDÈNCIES</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;

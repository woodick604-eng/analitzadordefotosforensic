
import React, { useState, useEffect, useMemo } from 'react';
import { AnalysisResultData, PhotoAnalysis, ExportResolution } from '../types';
import ImageModal from './ImageModal';
import CopyButton from './CopyButton';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import PhotoEditor from './PhotoEditor';
import { MapPinIcon } from './icons/MapPinIcon';
import { MODELS } from '../services/geminiService';
import { SparklesIcon } from './icons/SparklesIcon';

interface AnalysisScreenProps {
  progress?: number;
  result: AnalysisResultData;
  onReset: () => void;
  isAnalyzing: boolean;
  onUpdatePhoto: (index: number, updatedPhoto: PhotoAnalysis) => void;
  onReAnalyzePhoto?: (index: number) => void;
}

const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ result, onReset, progress = 0, isAnalyzing, onUpdatePhoto, onReAnalyzePhoto }) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedSummaries, setSelectedSummaries] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openDescriptions, setOpenDescriptions] = useState<Record<number, boolean>>({});
  const [isSummariesOpen, setIsSummariesOpen] = useState(false);

  const gpsData = useMemo(() => {
    const points = result.photoAnalyses.filter(p => p.gps).map(p => p.gps!);
    return points.length > 0 ? { points } : null;
  }, [result.photoAnalyses]);

  const cleanNat = (nat: string) => nat.replace(/^NAT[-:\s]*/i, '');

  useEffect(() => {
    setSelectedSummaries(prev => {
      const current = [...prev];
      result.photoAnalyses.forEach((p, i) => {
        if (p.status === 'completed' && current[i] === undefined) {
          current[i] = p.recommendedSummaryIndex; 
        }
      });
      return current;
    });
  }, [result.photoAnalyses]);

  const handleSelectSummary = (photoIndex: number, summaryIndex: number) => {
    const newSelected = [...selectedSummaries];
    newSelected[photoIndex] = summaryIndex;
    setSelectedSummaries(newSelected);
  };

  const resizeImage = (url: string, resolution: ExportResolution): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        const maxDim = resolution === 'HD' ? 1280 : resolution === 'HD_PLUS' ? 1600 : 1920;
        
        if (width > maxDim) {
          const ratio = maxDim / width;
          width = maxDim;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92);
      };
    });
  };

  const downloadZip = async () => {
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      const folderName = `${cleanNat(result.natNumber)}`.replace(/[^a-z0-9]/gi, '_');
      const rootFolder = zip.folder(folderName);
      
      for (let i = 0; i < result.photoAnalyses.length; i++) {
        const photo = result.photoAnalyses[i];
        if (photo.status !== 'completed') continue;
        
        const blob = await resizeImage(photo.url, result.resolution);
        
        const numPrefix = (i + 1).toString().padStart(2, '0');
        const summary = photo.summaries[selectedSummaries[i]] || "EVIDENCIA";
        const sanitized = summary.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').toUpperCase().substring(0, 50);
        rootFolder?.file(`${numPrefix}_${sanitized}.jpg`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}_FOTOS_${result.resolution}.zip`;
      link.click();
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const generatePDF = async () => {
    setIsProcessing(true);
    const doc = new jsPDF();
    const currentNum = cleanNat(result.natNumber);
    doc.setFontSize(18); doc.setFont("helvetica", "bold");
    doc.text(`ATESTAT POLICIAL: ${currentNum}`, 105, 20, { align: 'center' });
    
    let y = 35;
    doc.setFontSize(14); doc.text("SÍNTESIS TRIADES", 20, y);
    y += 10; doc.setFontSize(10); doc.setFont("helvetica", "normal");
    result.photoAnalyses.forEach((p, i) => {
      if (p.status !== 'completed') return;
      doc.text(`${(i + 1).toString().padStart(2, '0')}. ${p.summaries[selectedSummaries[i]]}`, 20, y);
      y += 8;
    });

    if (result.expertConclusion) {
      doc.addPage(); y = 25; doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text("VALORACIÓ PERICIAL", 20, y);
      y += 15; doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      const splitConc = doc.splitTextToSize(result.expertConclusion, 170);
      splitConc.forEach((line: string) => { doc.text(line, 20, y); y += 6; });
    }

    doc.save(`${currentNum}_INFORME.pdf`);
    setIsProcessing(false);
  };

  const allCompleted = result.photoAnalyses.every(p => p.status === 'completed');

  return (
    <div className="space-y-12 pb-[350px] w-full max-w-[1600px] mx-auto relative px-4">
      <div className="flex flex-col md:flex-row justify-between items-center bg-base-200/50 p-10 rounded-[3rem] border border-base-300 shadow-2xl gap-6">
        <div className="flex flex-col">
          <p className="text-[10px] text-brand-primary font-black uppercase tracking-[0.5em] mb-2">Unitat d'Investigació d'Atestats Policials</p>
          <h2 className="text-3xl font-black text-content-100 uppercase tracking-tighter">{cleanNat(result.natNumber)}</h2>
        </div>
        <div className="flex items-center gap-5">
          {isAnalyzing && (
            <div className="px-6 py-3 bg-brand-primary/10 border border-brand-primary/30 rounded-full flex items-center gap-3 shadow-inner">
              <div className="w-2.5 h-2.5 bg-brand-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.8)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Processant... {Math.round(progress)}%</span>
            </div>
          )}
          <button onClick={onReset} className="px-10 py-4 bg-base-300 text-content-200 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-secondary hover:text-white transition-all shadow-xl">Nou Atestat</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {result.photoAnalyses.map((photo, index) => (
          <div key={index} className="bg-base-200 rounded-[3.5rem] border border-base-300 overflow-hidden shadow-2xl flex flex-col relative group transition-all hover:border-brand-primary/20">
            <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
              <img 
                src={photo.url} 
                className={`w-full h-full object-contain transition-all duration-1000 ${photo.status === 'completed' ? 'opacity-100 scale-100 cursor-pointer' : 'opacity-40 blur-sm scale-110'}`} 
                onClick={() => photo.status === 'completed' && setEditingIndex(index)} 
              />
              {photo.isKeyEvidence && (
                <div className="absolute top-8 right-8 bg-yellow-500 text-black text-[10px] font-black px-5 py-2.5 rounded-xl shadow-lg z-20 animate-bounce">
                  EVIDÈNCIA CLAU
                </div>
              )}
              <div className="absolute top-8 left-8 bg-black/80 text-white text-[14px] font-black px-5 py-2.5 rounded-xl border border-white/10 z-20 shadow-lg">
                E-{(index + 1).toString().padStart(2, '0')}
              </div>
              {photo.status === 'analyzing' && (
                <div className="absolute inset-0 flex items-center justify-center bg-brand-primary/10 backdrop-blur-[2px] z-10">
                  <div className="w-14 h-14 border-[5px] border-brand-primary border-t-transparent animate-spin rounded-full shadow-[0_0_30px_rgba(79,70,229,0.5)]" />
                </div>
              )}
            </div>
            
            <div className="p-10 flex flex-col flex-grow">
              {photo.status === 'completed' ? (
                <div className="animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-black text-content-100 uppercase tracking-tight leading-tight">{photo.title}</h2>
                    <div className="flex items-center gap-2">
                      {onReAnalyzePhoto && (
                        <button 
                          onClick={() => onReAnalyzePhoto(index)}
                          className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary hover:text-white transition-all"
                          title="Re-avaluació exhaustiva"
                        >
                          <SparklesIcon className="w-5 h-5" />
                        </button>
                      )}
                      <CopyButton textToCopy={photo.title} />
                    </div>
                  </div>

                  <div className="mb-8 border border-base-300 rounded-[2.5rem] overflow-hidden bg-base-100/20 shadow-inner">
                    <button onClick={() => setOpenDescriptions(p => ({...p, [index]: !p[index]}))} className="w-full p-6 flex items-center justify-between hover:bg-base-300/20 transition-all text-left">
                      <span className="text-[11px] font-black text-brand-primary uppercase tracking-widest">Veure Descripció Tècnica Detallada</span>
                      <svg className={`w-6 h-6 transition-transform duration-500 ${openDescriptions[index] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    {openDescriptions[index] && (
                      <div className="p-8 border-t border-base-300">
                        <p className="description-text text-[19px] italic text-content-200 leading-relaxed font-arial">{photo.description}</p>
                        <div className="flex justify-between items-center mt-5">
                           <button 
                            onClick={() => onReAnalyzePhoto?.(index)}
                            className="text-[10px] font-black text-brand-primary uppercase tracking-widest flex items-center gap-2 hover:underline"
                          >
                            <SparklesIcon className="w-3 h-3" /> Re-avaluació exhaustiva
                          </button>
                          <CopyButton textToCopy={photo.description} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3.5">
                    {photo.summaries.map((s, si) => (
                      <div key={si} onClick={() => handleSelectSummary(index, si)} className={`p-6 rounded-2xl border-2 text-[14px] font-bold cursor-pointer transition-all ${selectedSummaries[index] === si ? 'bg-brand-primary border-brand-primary text-white shadow-xl scale-[1.02]' : 'bg-base-100 border-base-300 text-content-200 opacity-40 hover:opacity-100 hover:border-brand-primary/30'}`}>
                        <div className="flex justify-between items-center">
                          <span>{s}</span>
                          {si === photo.recommendedSummaryIndex && <span className="text-[8px] bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest ml-2">Recomanat</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-8 py-4">
                  <div className="h-10 bg-base-300/50 rounded-2xl w-3/4 animate-pulse" />
                  <div className="h-32 bg-base-300/30 rounded-[2rem] w-full animate-pulse shadow-inner" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {result.expertConclusion && (
        <div className="bg-brand-primary/10 border-l-[12px] border-brand-primary p-12 rounded-r-[4rem] shadow-2xl relative animate-in fade-in slide-in-from-bottom-8 duration-1000">
           <div className="flex items-center gap-4 mb-6">
              <h3 className="text-2xl font-black text-content-100 uppercase tracking-tighter">Valoració Pericial del Policia Instructor</h3>
              <div className="bg-brand-primary text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Narrativa Forense</div>
           </div>
           <p className="text-xl italic text-content-100 leading-relaxed font-arial opacity-90 whitespace-pre-wrap">{result.expertConclusion}</p>
           <div className="flex justify-end mt-6">
              <CopyButton textToCopy={result.expertConclusion} />
           </div>
        </div>
      )}

      {/* TAULER DE RESUMS AMB CÒPIA INDIVIDUAL A CADA COSTAT */}
      <div className="bg-base-200 border border-base-300 rounded-[3rem] overflow-hidden shadow-2xl">
        <button onClick={() => setIsSummariesOpen(!isSummariesOpen)} className="w-full p-10 flex items-center justify-between hover:bg-base-300/30 transition-all">
          <div className="flex items-center gap-5">
            <div className="bg-brand-primary/20 p-3 rounded-2xl border border-brand-primary/30">
              <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
            </div>
            <span className="text-xl font-black text-content-100 uppercase tracking-tight">Còpia Ràpida de Síntesis Triades</span>
          </div>
          <svg className={`w-8 h-8 transition-transform duration-500 ${isSummariesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
        </button>
        {isSummariesOpen && (
          <div className="p-12 border-t border-base-300 bg-black/20 animate-in slide-in-from-top-4 duration-500 space-y-12">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-brand-primary/20 pb-4 mb-6">
                    <CopyButton textToCopy={result.photoAnalyses.filter(p => p.status === 'completed').map((p, i) => `FOTO ${(i + 1).toString().padStart(2, '0')}: ${p.summaries[selectedSummaries[i]]}`).join('\n')} />
                    <p className="text-[10px] font-black uppercase text-brand-primary tracking-[0.3em] text-right">Camps d'Atestat Policial</p>
                  </div>
                  {result.photoAnalyses.map((p, i) => p.status === 'completed' && (
                    <div key={i} className="flex items-center justify-between gap-4 p-4 bg-base-100 rounded-2xl border border-white/5 group/row">
                      <CopyButton textToCopy={`FOTO ${(i + 1).toString().padStart(2, '0')}: ${p.summaries[selectedSummaries[i]]}`} />
                      <span className="text-sm font-arial text-content-100 opacity-80 leading-tight text-right flex-grow">
                        <span className="text-brand-primary font-black mr-2">FOTO {(i + 1).toString().padStart(2, '0')}:</span>
                        {p.summaries[selectedSummaries[i]]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-brand-secondary/20 pb-4 mb-6">
                    <p className="text-[10px] font-black uppercase text-brand-secondary tracking-[0.3em]">Diligències d'Inspecció</p>
                    <CopyButton textToCopy={result.photoAnalyses.filter(p => p.status === 'completed').map((p, i) => `[E-${(i + 1).toString().padStart(2, '0')}] ${p.summaries[selectedSummaries[i]]?.toUpperCase()}`).join('\n')} />
                  </div>
                  {result.photoAnalyses.map((p, i) => p.status === 'completed' && (
                    <div key={i} className="flex items-center justify-between gap-4 p-4 bg-base-100 rounded-2xl border border-white/5 group/row">
                      <span className="text-sm font-arial text-content-100 opacity-80 leading-tight">
                        <span className="text-brand-secondary font-black mr-2">[E-{(i + 1).toString().padStart(2, '0')}]</span>
                        {p.summaries[selectedSummaries[i]]?.toUpperCase()}
                      </span>
                      <CopyButton textToCopy={`[E-${(i + 1).toString().padStart(2, '0')}] ${p.summaries[selectedSummaries[i]]?.toUpperCase()}`} />
                    </div>
                  ))}
                </div>
             </div>
          </div>
        )}
      </div>

      <div className="mt-12 pt-12 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {gpsData && (
            <div className="bg-red-600/10 p-10 rounded-[3.5rem] border border-red-600/20 flex flex-col gap-6 shadow-2xl">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-red-600/20 rounded-3xl"><MapPinIcon className="w-8 h-8 text-red-500" /></div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-black text-red-500 uppercase tracking-widest mb-1">Ubicació Escenari</span>
                  <span className="text-2xl font-mono text-content-100 tracking-tighter">{gpsData.points[0].lat.toFixed(6)}, {gpsData.points[0].lng.toFixed(6)}</span>
                </div>
              </div>
              <button onClick={() => window.open(`https://www.google.com/maps?q=${gpsData.points[0].lat},${gpsData.points[0].lng}`)} className="bg-red-600 text-white py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl">Google Maps</button>
            </div>
          )}
          
          <div className="bg-base-200 p-10 rounded-[3.5rem] border border-base-300 flex flex-col justify-between shadow-2xl">
              <div className="flex flex-col mb-8">
                  <span className="text-[11px] font-black text-brand-primary uppercase tracking-widest mb-2">Cost Processament Tècnic</span>
                  <span className="text-4xl font-black text-content-100">{result.totalUsage?.cost.toFixed(5) || '0.00000'} <span className="text-lg opacity-40">EUR</span></span>
              </div>
              <p className="text-[14px] font-mono text-brand-primary opacity-60">Motor: {MODELS.ANALYSIS}</p>
          </div>

          <div className="bg-base-200 p-10 rounded-[3.5rem] border border-base-300 flex flex-col gap-5 shadow-2xl">
              <button onClick={downloadZip} disabled={!allCompleted || isProcessing} className="w-full bg-brand-primary text-white py-6 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50">Exportar ZIP Atestat</button>
              <button onClick={generatePDF} disabled={!allCompleted || isProcessing} className="w-full bg-white/5 text-content-200 py-6 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/10 transition-all shadow-xl disabled:opacity-50">Informe PDF Oficial</button>
          </div>
      </div>

      {editingIndex !== null && <PhotoEditor imageUrl={result.photoAnalyses[editingIndex].url} onSave={(url) => { const updated = { ...result.photoAnalyses[editingIndex], url }; onUpdatePhoto(editingIndex, updated); setEditingIndex(null); }} onCancel={() => setEditingIndex(null)} />}
      {selectedImageUrl && <ImageModal imageUrl={selectedImageUrl} onClose={() => setSelectedImageUrl(null)} />}
    </div>
  );
};

export default AnalysisScreen;

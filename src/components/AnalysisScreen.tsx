
import React, { useState, useEffect } from 'react';
/* Updated imports and interface to handle detailed PhotoAnalysis and progress */
import { AnalysisResultData, PhotoAnalysis } from '../types';
import ImageModal from './ImageModal';
import CopyButton from './CopyButton';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import PhotoEditor from './PhotoEditor';

interface AnalysisScreenProps {
  progress?: number;
  result: AnalysisResultData;
  onReset: () => void;
  isAnalyzing: boolean;
  onUpdatePhoto: (index: number, updatedPhoto: PhotoAnalysis) => void;
}

/* Updated AnalysisScreen to include usage metrics, full summaries list with selection, and export functions */
const AnalysisScreen: React.FC<AnalysisScreenProps> = ({ result, onReset, progress = 0, isAnalyzing, onUpdatePhoto }) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedSummaries, setSelectedSummaries] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  const handleSaveEdition = (newUrl: string) => {
    if (editingIndex !== null) {
      const updated = { ...result.photoAnalyses[editingIndex], url: newUrl };
      onUpdatePhoto(editingIndex, updated);
      setEditingIndex(null);
    }
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
        const response = await fetch(photo.url);
        const blob = await response.blob();
        const numPrefix = (i + 1).toString().padStart(2, '0');
        const summary = photo.summaries[selectedSummaries[i]] || "EVIDENCIA";
        const sanitized = summary.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').toUpperCase().substring(0, 50);
        rootFolder?.file(`${numPrefix}_${sanitized}.jpg`, blob);
      }
      const content = await zip.generateAsync({ type: "blob" });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = `${folderName}_ATESTAT_FOTOS.zip`;
      link.click();
    } catch (error) { console.error(error); } finally { setIsProcessing(false); }
  };

  const generateFullPDF = async () => {
    setIsProcessing(true);
    const doc = new jsPDF();
    const currentNum = cleanNat(result.natNumber);
    doc.setFontSize(18);
    doc.text(`ATESTAT FORENSE - ${currentNum}`, 105, 20, { align: 'center' });
    let y = 35;
    result.photoAnalyses.forEach((p, i) => {
      if (p.status !== 'completed') return;
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`${(i + 1).toString().padStart(2, '0')} - ${p.title}`, 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const splitDesc = doc.splitTextToSize(p.description, 170);
      doc.text(splitDesc, 20, y);
      y += (splitDesc.length * 5) + 6;
      doc.setFont("helvetica", "bold");
      doc.text(`SÍNTESI: ${p.summaries[selectedSummaries[i]]}`, 20, y);
      y += 15;
    });
    doc.save(`${currentNum}_INFORME_POLICIAL.pdf`);
    setIsProcessing(false);
  };

  const allCompleted = result.photoAnalyses.every(p => p.status === 'completed');

  return (
    <div className="space-y-8 pb-20">
      {/* COST AND TOKENS PANEL */}
      <div className="bg-base-200 p-6 rounded-2xl border border-base-300 flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-[10px] font-black uppercase text-content-200 opacity-60">Cost Total Processament</p>
          <p className="text-2xl font-black text-content-100">{result.totalUsage?.cost.toFixed(5)} EUR</p>
        </div>
        <div className="flex gap-8">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-content-200 opacity-60">Tokens</p>
            <p className="text-xl font-bold text-brand-primary">{result.totalUsage?.totalTokens.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <button onClick={downloadZip} disabled={!allCompleted || isProcessing} className="bg-brand-primary text-white px-6 py-2 rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-30">ZIP FOTOS</button>
            <button onClick={generateFullPDF} disabled={!allCompleted || isProcessing} className="bg-brand-secondary text-white px-6 py-2 rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-30 ml-2">PDF INFORME</button>
          </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="w-full bg-base-300 h-4 rounded-full overflow-hidden">
          <div className="bg-brand-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="flex justify-between items-center bg-base-200 p-8 rounded-3xl border border-base-300">
        <h2 className="text-4xl font-black text-content-100 uppercase tracking-tighter">{cleanNat(result.natNumber)}</h2>
        <button onClick={onReset} className="px-8 py-3 bg-base-300 text-content-200 rounded-full text-xs font-black uppercase hover:bg-brand-secondary hover:text-white transition-all">Nou Atestat</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {result.photoAnalyses.map((photo, index) => (
          <div key={index} className="bg-base-200 rounded-3xl border border-base-300 overflow-hidden shadow-xl flex flex-col">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              <img src={photo.url} className={`w-full h-full object-cover ${photo.status === 'completed' ? 'cursor-pointer' : 'opacity-30'}`} onClick={() => photo.status === 'completed' && setEditingIndex(index)} />
              {photo.isKeyEvidence && <div className="absolute top-4 right-4 bg-yellow-500 text-black text-[10px] font-bold px-3 py-1 rounded-full">EVIDÈNCIA CLAU</div>}
              <div className="absolute top-4 left-4 bg-black/80 text-white text-xs font-bold px-3 py-1 rounded-lg">{(index + 1).toString().padStart(2, '0')}</div>
              {photo.status === 'analyzing' && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent animate-spin rounded-full" /></div>}
            </div>
            
            <div className="p-8 flex flex-col flex-grow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-content-100 uppercase">{photo.title}</h3>
                <CopyButton textToCopy={photo.title} />
              </div>

              <div className="mb-6">
                <p className="text-sm italic text-content-200 line-clamp-4">{photo.description}</p>
                <div className="flex justify-end mt-2"><CopyButton textToCopy={photo.description} /></div>
              </div>

              <div className="space-y-2">
                {photo.summaries.map((s, si) => (
                  <div key={si} onClick={() => handleSelectSummary(index, si)} className={`p-3 rounded-xl border text-xs font-bold cursor-pointer transition-all ${selectedSummaries[index] === si ? 'bg-brand-primary border-brand-primary text-white' : 'bg-base-100 border-base-300 text-content-200 opacity-60'}`}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingIndex !== null && <PhotoEditor imageUrl={result.photoAnalyses[editingIndex].url} onSave={handleSaveEdition} onCancel={() => setEditingIndex(null)} />}
      {selectedImageUrl && <ImageModal imageUrl={selectedImageUrl} onClose={() => setSelectedImageUrl(null)} />}
    </div>
  );
};

export default AnalysisScreen;

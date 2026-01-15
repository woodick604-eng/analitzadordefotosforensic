
import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from './utils/fileUtils';
import { analyzeImage, generateExpertConclusion } from './services/geminiService';
import { getExifMetadata } from './services/exifService';
import { AnalysisResultData, PhotoAnalysis, ExportResolution, ManagedFile } from './types';

import ImageUploader from './components/ImageUploader';
import AnalysisScreen from './components/AnalysisScreen';
import Header from './components/Header';
import ErrorDisplay from './components/ErrorDisplay';

const App: React.FC = () => {
  const [managedFiles, setManagedFiles] = useState<ManagedFile[]>([]);
  const [valuation, setValuation] = useState('');
  const [nat, setNat] = useState(''); 
  const [resolution, setResolution] = useState<ExportResolution>('HD_PLUS');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentYear = new Date().getFullYear().toString().slice(-2);
  const fullNatSuffix = `/${currentYear} ART MN`;

  const handleFilesSelect = (newFiles: File[]) => {
    const processed = newFiles.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      preview: URL.createObjectURL(file)
    }));
    setManagedFiles(prev => [...prev, ...processed]);
  };

  const handleUpdateManagedFiles = (updated: ManagedFile[]) => {
    setManagedFiles(updated);
  };

  const handleRemoveFile = (id: string) => {
    setManagedFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      const removed = prev.find(f => f.id === id);
      if (removed) URL.revokeObjectURL(removed.preview);
      return filtered;
    });
  };

  const handleUpdateFileContent = (index: number, newFile: File) => {
    setManagedFiles(prev => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next[index] = {
        ...next[index],
        file: newFile,
        preview: URL.createObjectURL(newFile)
      };
      return next;
    });
  };

  const handleAnalyze = useCallback(async () => {
    if (managedFiles.length === 0 || !valuation.trim()) {
      setError("Si us plau, puja fotos i redacta la valoració del cas.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const fullNat = nat.trim() ? `${nat.trim()}${fullNatSuffix}` : "SENSE_NUMERO";
    const enrichedValuation = `NAT: ${fullNat}\n\n${valuation}`;

    const initialAnalyses: PhotoAnalysis[] = managedFiles.map(mf => ({
      fileName: mf.file.name,
      url: mf.preview,
      title: 'Pendent...',
      description: 'Preparant anàlisi...',
      summaries: [],
      recommendedSummaryIndex: 0,
      category: 'Pendent',
      status: 'pending'
    }));

    setAnalysisResult({ 
      natNumber: fullNat, 
      valuation: enrichedValuation, 
      resolution,
      photoAnalyses: initialAnalyses 
    });
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    let totalUsage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, cost: 0 };
    const finalAnalyses: PhotoAnalysis[] = [];

    for (let i = 0; i < managedFiles.length; i++) {
      const mf = managedFiles[i];
      let success = false;

      setAnalysisResult(prev => {
        if (!prev) return prev;
        const newAnalyses = [...prev.photoAnalyses];
        newAnalyses[i].status = 'analyzing';
        return { ...prev, photoAnalyses: newAnalyses };
      });

      while (!success) {
        try {
          const base64Image = await fileToBase64(mf.file);
          const metadata = await getExifMetadata(mf.file).catch(() => ({ dateTime: null, gps: null }));
          const analysis = await analyzeImage(ai, base64Image, enrichedValuation);
          
          totalUsage.promptTokens += analysis.usage.promptTokens;
          totalUsage.candidatesTokens += analysis.usage.candidatesTokens;
          totalUsage.totalTokens += analysis.usage.totalTokens;
          totalUsage.cost += analysis.usage.cost;

          const updatedPhoto: PhotoAnalysis = {
            ...initialAnalyses[i],
            title: analysis.title,
            description: analysis.description,
            summaries: analysis.summaries,
            recommendedSummaryIndex: analysis.recommendedIndex,
            category: analysis.category,
            isKeyEvidence: analysis.isKeyEvidence,
            dateTime: metadata.dateTime,
            gps: metadata.gps,
            status: 'completed',
            usage: analysis.usage
          };
          
          finalAnalyses[i] = updatedPhoto;

          setAnalysisResult(prev => {
            if (!prev) return prev;
            const newAnalyses = [...prev.photoAnalyses];
            newAnalyses[i] = updatedPhoto;
            return { 
              ...prev, 
              photoAnalyses: newAnalyses,
              totalUsage: { ...totalUsage }
            };
          });
          success = true;
        } catch (err) {
          console.warn(`Fallada a la foto ${i+1}. Reintentant...`, err);
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      setProgress(((i + 1) / managedFiles.length) * 100);
    }

    try {
      const expertConclusion = await generateExpertConclusion(ai, enrichedValuation, finalAnalyses);
      setAnalysisResult(prev => prev ? { ...prev, expertConclusion } : null);
    } catch (e) {
      console.error("Error conclusió pericial:", e);
    }

    setIsLoading(false);
  }, [managedFiles, valuation, nat, resolution, fullNatSuffix]);

  const handleReAnalyzePhoto = async (index: number) => {
    if (!analysisResult) return;
    
    const mf = managedFiles[index];
    if (!mf) return;

    setAnalysisResult(prev => {
      if (!prev) return prev;
      const newAnalyses = [...prev.photoAnalyses];
      newAnalyses[index] = { ...newAnalyses[index], status: 'analyzing' };
      return { ...prev, photoAnalyses: newAnalyses };
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const base64Image = await fileToBase64(mf.file);
      const metadata = await getExifMetadata(mf.file).catch(() => ({ dateTime: null, gps: null }));
      const analysis = await analyzeImage(ai, base64Image, analysisResult.valuation, true);
      
      const updatedPhoto: PhotoAnalysis = {
        ...analysisResult.photoAnalyses[index],
        title: analysis.title,
        description: analysis.description,
        summaries: analysis.summaries,
        recommendedSummaryIndex: analysis.recommendedIndex,
        category: analysis.category,
        isKeyEvidence: analysis.isKeyEvidence,
        dateTime: metadata.dateTime,
        gps: metadata.gps,
        status: 'completed',
        usage: analysis.usage
      };

      setAnalysisResult(prev => {
        if (!prev) return prev;
        const newAnalyses = [...prev.photoAnalyses];
        newAnalyses[index] = updatedPhoto;
        
        // Actualitzem cost total
        const newTotalUsage = { ...prev.totalUsage! };
        newTotalUsage.promptTokens += analysis.usage.promptTokens;
        newTotalUsage.candidatesTokens += analysis.usage.candidatesTokens;
        newTotalUsage.totalTokens += analysis.usage.totalTokens;
        newTotalUsage.cost += analysis.usage.cost;

        return { ...prev, photoAnalyses: newAnalyses, totalUsage: newTotalUsage };
      });
    } catch (err) {
      console.error("Error en re-anàlisi:", err);
      setAnalysisResult(prev => {
        if (!prev) return prev;
        const newAnalyses = [...prev.photoAnalyses];
        newAnalyses[index] = { ...newAnalyses[index], status: 'completed' };
        return { ...prev, photoAnalyses: newAnalyses };
      });
    }
  };

  const handleUpdatePhoto = (index: number, updatedPhoto: PhotoAnalysis) => {
    setAnalysisResult(prev => {
      if (!prev) return prev;
      const newAnalyses = [...prev.photoAnalyses];
      newAnalyses[index] = updatedPhoto;
      return { ...prev, photoAnalyses: newAnalyses };
    });
  };

  const handleReset = () => {
    managedFiles.forEach(mf => URL.revokeObjectURL(mf.preview));
    setManagedFiles([]);
    setValuation('');
    setNat('');
    setAnalysisResult(null);
    setIsLoading(false);
    setProgress(0);
  };

  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center p-4 sm:p-6 lg:p-10 pb-20">
      <div className="w-full max-w-[1600px] mx-auto">
        <Header />
        <main className="mt-12">
          {error && <ErrorDisplay message={error} />}
          {analysisResult ? (
            <AnalysisScreen 
              result={analysisResult} 
              onReset={handleReset} 
              progress={progress} 
              isAnalyzing={isLoading}
              onUpdatePhoto={handleUpdatePhoto}
              onReAnalyzePhoto={handleReAnalyzePhoto}
            />
          ) : (
            <ImageUploader 
              managedFiles={managedFiles} 
              valuation={valuation}
              nat={nat}
              resolution={resolution}
              onFilesSelect={handleFilesSelect} 
              onUpdateManagedFiles={handleUpdateManagedFiles}
              onRemoveFile={handleRemoveFile}
              onValuationChange={setValuation}
              onNatChange={setNat}
              onResolutionChange={setResolution}
              onAnalyze={handleAnalyze} 
              onUpdateFileContent={handleUpdateFileContent}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

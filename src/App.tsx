
import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { fileToBase64 } from './utils/fileUtils';
import { analyzeImage } from './services/geminiService';
/* Added missing import for getExifMetadata */
import { getExifMetadata } from './services/exifService';
import { AnalysisResultData, PhotoAnalysis } from './types';

import ImageUploader from './components/ImageUploader';
import AnalysisScreen from './components/AnalysisScreen';
import Header from './components/Header';
import ErrorDisplay from './components/ErrorDisplay';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [valuation, setValuation] = useState('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const extractNatNumber = (text: string): string => {
    const regex = /(?:NAT|N\.A\.T\.?)\s*[:.-]?\s*([A-Z0-9\-\/]+)/i;
    const match = text.match(regex);
    return match ? match[1].trim().toUpperCase() : "SENSE_NUMERO";
  };

  const handleUpdateFile = (index: number, newFile: File) => {
    const newFiles = [...files];
    newFiles[index] = newFile;
    setFiles(newFiles);
  };

  /* Fixed handleAnalyze to include EXIF metadata extraction and handle the updated analyzeImage response and usage tokens */
  const handleAnalyze = useCallback(async () => {
    if (files.length === 0 || !valuation.trim()) {
      setError("Si us plau, puja fotos i redacta la valoració (incloent el número NAT).");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setProgress(0);

    const detectedNat = extractNatNumber(valuation);

    const initialAnalyses: PhotoAnalysis[] = files.map(f => ({
      fileName: f.name,
      url: URL.createObjectURL(f),
      title: 'Analitzant...',
      description: 'Iniciant anàlisi factual...',
      summaries: [],
      recommendedSummaryIndex: 0,
      category: 'Pendent',
      status: 'pending'
    }));

    setAnalysisResult({ natNumber: detectedNat, valuation, photoAnalyses: initialAnalyses });
    /* Initialized GoogleGenAI with apiKey property as required */
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    let totalUsage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0, cost: 0 };

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let success = false;

      setAnalysisResult(prev => {
        if (!prev) return prev;
        const newAnalyses = [...prev.photoAnalyses];
        newAnalyses[i].status = 'analyzing';
        return { ...prev, photoAnalyses: newAnalyses };
      });

      while (!success) {
        try {
          const base64Image = await fileToBase64(file);
          /* Added EXIF metadata extraction */
          const metadata = await getExifMetadata(file).catch(() => ({ dateTime: null, gps: null }));
          const analysis = await analyzeImage(ai, base64Image, valuation);
          
          totalUsage.promptTokens += analysis.usage.promptTokens;
          totalUsage.candidatesTokens += analysis.usage.candidatesTokens;
          totalUsage.totalTokens += analysis.usage.totalTokens;
          totalUsage.cost += analysis.usage.cost;

          setAnalysisResult(prev => {
            if (!prev) return prev;
            const newAnalyses = [...prev.photoAnalyses];
            newAnalyses[i] = {
              ...newAnalyses[i],
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
      setProgress(((i + 1) / files.length) * 100);
    }
    setIsLoading(false);
  }, [files, valuation]);

  const handleUpdatePhoto = (index: number, updatedPhoto: PhotoAnalysis) => {
    setAnalysisResult(prev => {
      if (!prev) return prev;
      const newAnalyses = [...prev.photoAnalyses];
      newAnalyses[index] = updatedPhoto;
      return { ...prev, photoAnalyses: newAnalyses };
    });
  };

  const handleReset = () => {
    if (analysisResult) {
      analysisResult.photoAnalyses.forEach(p => URL.revokeObjectURL(p.url));
    }
    setFiles([]);
    setValuation('');
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
            />
          ) : (
            <ImageUploader 
              files={files} 
              valuation={valuation}
              onFilesSelect={setFiles} 
              onValuationChange={setValuation}
              onAnalyze={handleAnalyze} 
              onUpdateFile={handleUpdateFile}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

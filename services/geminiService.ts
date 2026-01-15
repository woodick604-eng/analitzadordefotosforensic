
import { GoogleGenAI, Type } from '@google/genai';

const INPUT_COST_PER_TOKEN = 0.075 / 1000000;
const OUTPUT_COST_PER_TOKEN = 0.30 / 1000000;

export const MODELS = {
  ANALYSIS: 'gemini-3-flash-preview',
  CONCLUSION: 'gemini-3-flash-preview'
};

const cleanJsonResponse = (text: string): string => {
  if (!text) return '{}';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  cleaned = cleaned.replace(/^```\n?/, '').replace(/\n?```$/, '');
  
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

export const analyzeImage = async (
  ai: GoogleGenAI, 
  base64Image: string, 
  caseValuation: string,
  exhaustive: boolean = false
): Promise<{ 
  title: string; 
  description: string; 
  summaries: string[]; 
  recommendedIndex: number; 
  category: string;
  isKeyEvidence: boolean;
  usage: { promptTokens: number; candidatesTokens: number; totalTokens: number; cost: number; }
}> => {
  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64Image,
    },
  };
  
  const textPart = {
    text: `Ets un Policia Instructor SENIOR de la Unitat d'Atestats. Analitza l'evidència segons el context: ${caseValuation}. 

    ${exhaustive ? "MODE EXHAUSTIU ACTIVAT: Proporciona un nivell de detall forense extrem. Analitza transferències d'energia, deformacions estructurals mínimes i restes a la calçada amb precisió microscòpica." : ""}

    CRITERI D'EVIDÈNCIA CLAU (SELECTIVITAT EXTREMA):
    - "evidenciaClau" només serà TRUE si la imatge mostra: punt d'impacte, restes crítiques a la via o posició final determinant.

    PROHIBICIÓ LINGÜÍSTICA ABSOLUTA (SANCIONABLE):
    - PROHIBIT usar: "conductor", "passatger", "dreta", "esquerra", "dret", "esquerre".
    - ÚS OBLIGATORI de referències neutres: "Costat del cavallet" (en motos), "Costat oposat al cavallet", "Banda de la vorera", "Banda de la calçada", "Part frontal", "Part posterior", "Eix davanter", "Eix posterior", "Bloc motor", "Zona de càrrega".

    TERMINOLOGIA TÈCNICA POLICIAL:
    - PROHIBICIÓ TOTAL: "en repòs" per a vehicles. Utilitza "posició final" o "immobilitzat".

    Respon ÚNICAMENT en JSON valid:
    {
      "titol": "Vehicle + Angle (ex: Citroen C3 - Frontal)",
      "descripcio": "Relat factual policial exhaustiu",
      "resums": ["S1", "S2", "S3", "S4", "S5", "S6"],
      "recomanatIndex": 0-5,
      "categoria": "Evidència Policial",
      "evidenciaClau": true/false
    }`
  };

  const response = await ai.models.generateContent({
    model: MODELS.ANALYSIS,
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titol: { type: Type.STRING },
          descripcio: { type: Type.STRING },
          resums: { type: Type.ARRAY, items: { type: Type.STRING } },
          recomanatIndex: { type: Type.INTEGER },
          categoria: { type: Type.STRING },
          evidenciaClau: { type: Type.BOOLEAN }
        },
        required: ['titol', 'descripcio', 'resums', 'recomanatIndex', 'evidenciaClau']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("EMPTY_API_RESPONSE");
  
  try {
    const result = JSON.parse(cleanJsonResponse(text));
    const usageMetadata = (response as any).usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
    const cost = (usageMetadata.promptTokenCount * INPUT_COST_PER_TOKEN) + (usageMetadata.candidatesTokenCount * OUTPUT_COST_PER_TOKEN);
    
    return {
      title: result.titol || "Evidència",
      description: result.descripcio || "Sense descripció.",
      summaries: result.resums || ["Sense síntesi."],
      recommendedIndex: result.recomanatIndex ?? 0, 
      category: result.categoria || "Evidència Policial",
      isKeyEvidence: !!result.evidenciaClau,
      usage: { 
        promptTokens: usageMetadata.promptTokenCount, 
        candidatesTokens: usageMetadata.candidatesTokenCount, 
        totalTokens: usageMetadata.totalTokenCount, 
        cost 
      }
    };
  } catch (parseError) {
    throw parseError;
  }
};

export const generateExpertConclusion = async (ai: GoogleGenAI, valuation: string, analyses: any[]): Promise<string> => {
  const context = analyses.map((a, i) => `Evidència ${i+1}: ${a.description}`).join('\n\n');
  const prompt = `Ets un Policia Instructor SENIOR expert en Atestats. Redacta la VALORACIÓ PERICIAL COMPLETA per al Jutjat.
  NARRATIVA INICIAL: ${valuation}
  EVIDÈNCIES: ${context}
  - No usis "en repòs" per vehicles.
  - PROHIBICIÓ TOTAL: "conductor", "passatger", "dreta", "esquerra".
  - Estil formal i factual.`;

  const response = await ai.models.generateContent({
    model: MODELS.CONCLUSION,
    contents: prompt
  });

  return (response.text || "").replace(/\*\*/g, '').replace(/#/g, '').trim();
};

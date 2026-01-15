
import { GoogleGenAI, Type } from '@google/genai';

const INPUT_COST_PER_TOKEN = 0.075 / 1000000;
const OUTPUT_COST_PER_TOKEN = 0.30 / 1000000;

/* Updated analyzeImage to use gemini-3-flash-preview and handle 3 parameters and detailed JSON response */
export const analyzeImage = async (
  ai: GoogleGenAI, 
  base64Image: string, 
  caseValuation: string
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
    text: `Ets un Investigador Forense de Trànsit d'elit. Prova pericial per a judici.
    
    Valoració del cas: ${caseValuation}

    PROHIBICIÓ LINGÜÍSTICA ABSOLUTA:
    - Tens PROHIBIT fer servir les paraules: "dret", "dreta", "esquerra", "esquerre".
    - No les usis mai. En lloc d'això, utilitza estrictament: "Banda del conductor", "Banda del passatger", "Costat del cavallet", "Costat oposat al cavallet", "Part frontal", "Part posterior", "Eix davanter", "Eix darrere".

    PROTOCOLO DE DESCRIPCIÓ EXTREMA:
    - Si l'evidència és clau per al cas ("evidenciaClau": true), la 'descripcio' HA DE SER MOLT EXTENSA I DETALLADA, explicant la mecànica de l'impacte i les transferències d'energia visibles. No escatimis en paraules tècniques (excepte les prohibides).
    
    REGLA DE SÍNTESI:
    - Les 6 SÍNTESIS han de tenir un MÀXIM de 65 CARÀCTERS.

    SELECCIÓ EXPERTA:
    - Analitza les teves 6 síntesis i tria l'índex (0-5) de la que consideris TÈCNICAMENT SUPERIOR per esclarir el cas policialment per sobre de les altres.

    JSON SCHEMA:
    {
      "titol": "Angle + Vehicle",
      "descripcio": "Relat factual forense exhaustiu (SENSE DRETA/ESQUERRA)",
      "resums": ["S1", "S2", "S3", "S4", "S5", "S6"],
      "recomanatIndex": 0-5,
      "categoria": "Evidència",
      "evidenciaClau": true/false
    }`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titol: { type: Type.STRING },
          descripcio: { type: Type.STRING },
          resums: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Exactly 6 summaries of max 65 chars"
          },
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
  const result = JSON.parse(text);

  const usageMetadata = (response as any).usageMetadata || { promptTokenCount: 0, candidatesTokenCount: 0, totalTokenCount: 0 };
  const cost = (usageMetadata.promptTokenCount * INPUT_COST_PER_TOKEN) + (usageMetadata.candidatesTokenCount * OUTPUT_COST_PER_TOKEN);
  
  return {
    title: result.titol,
    description: result.descripcio,
    summaries: result.resums,
    recommendedIndex: result.recomanatIndex, 
    category: result.categoria || "Evidència",
    isKeyEvidence: result.evidenciaClau,
    usage: { 
      promptTokens: usageMetadata.promptTokenCount, 
      candidatesTokens: usageMetadata.candidatesTokenCount, 
      totalTokens: usageMetadata.totalTokenCount, 
      cost 
    }
  };
};

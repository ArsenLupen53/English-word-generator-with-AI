
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordEntry, VocabularyRequest, ExampleSentence } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const WORD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    phonetic: { type: Type.STRING },
    partOfSpeech: { type: Type.STRING },
    definition: { type: Type.STRING },
    definitionTurkish: { type: Type.STRING },
    cefrLevel: { type: Type.STRING, description: "A1, A2, A2+, B1, B1+, B2, C1, or C2" },
    examples: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          english: { type: Type.STRING },
          turkish: { type: Type.STRING }
        },
        required: ["english", "turkish"]
      }
    }
  },
  required: ["word", "phonetic", "partOfSpeech", "definition", "definitionTurkish", "examples", "cefrLevel"]
};

const getLevelDescription = (level: string) => {
  if (level === 'A1' || level === 'A2' || level === 'A2+') return "essential everyday and foundational";
  if (level === 'B1' || level === 'B1+') return "practical and commonly used intermediate";
  if (level === 'B2') return "sophisticated and versatile upper-intermediate";
  if (level === 'C1') return "advanced, academic, and professional";
  if (level === 'C2') return "highly nuanced, literary, and near-native proficiency";
  return "various proficiency level";
};

export const fetchAdvancedVocabulary = async (request: VocabularyRequest, excludeWords: string[] = []): Promise<WordEntry[]> => {
  const levelPrompt = request.level === 'Mixed' ? 'A1 to C2' : request.level;
  const desc = getLevelDescription(request.level);
  const randomSalt = Math.random().toString(36).substring(7);
  const excludeStr = excludeWords.length > 0 ? `CRITICAL: Do NOT use any of these words: ${excludeWords.join(', ')}.` : '';

  const prompt = `Generate exactly ${request.count} unique ${desc} English vocabulary words strictly at ${levelPrompt} level. 
  
  CRITICAL INSTRUCTIONS:
  1. The selection must be COMPLETELY RANDOM from the appropriate lexicon for the level. 
  2. ${excludeStr}
  3. Ensure this set is unique (Salt: ${randomSalt}).
  
  Format the output as a JSON array of word objects.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: WORD_SCHEMA
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as WordEntry[];
  } catch (error) {
    console.error("Error fetching vocabulary:", error);
    throw new Error("Kelime listesi oluşturulurken bir hata oluştu.");
  }
};

export const fetchSingleRandomWord = async (level: string, excludeWords: string[] = []): Promise<WordEntry> => {
  const levelPrompt = level === 'Mixed' ? 'A1 to C2' : level;
  const desc = getLevelDescription(level);
  const randomSalt = Math.random().toString(36).substring(7);
  const excludeStr = excludeWords.length > 0 ? `CRITICAL: Do NOT include any of these words: ${excludeWords.join(', ')}.` : '';

  const prompt = `Generate exactly ONE unique and ${desc} English vocabulary word strictly at ${levelPrompt} level. 
  ${excludeStr}
  Focus on context-appropriate vocabulary. (Salt: ${randomSalt}).
  
  Format the output as a single JSON word object.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 1.0,
        responseMimeType: "application/json",
        responseSchema: WORD_SCHEMA
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as WordEntry;
  } catch (error) {
    console.error("Error fetching single word:", error);
    throw new Error("Kelime yenilenirken bir hata oluştu.");
  }
};

export const fetchWordAudio = async (word: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Pronounce the word clearly: ${word}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("No audio data received");
    return base64Audio;
  } catch (error) {
    console.error("Error fetching audio:", error);
    throw new Error("Ses üretilirken bir hata oluştu.");
  }
};

export const fetchExtraExample = async (word: string, currentExamples: string[]): Promise<ExampleSentence> => {
  const prompt = `Generate one additional level-appropriate example sentence for the word "${word}".
  
  Avoid these existing examples: ${currentExamples.join(' | ')}.
  Provide the English sentence and its Turkish translation.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            english: { type: Type.STRING },
            turkish: { type: Type.STRING }
          },
          required: ["english", "turkish"]
        }
      }
    });

    const jsonStr = response.text.trim();
    return JSON.parse(jsonStr) as ExampleSentence;
  } catch (error) {
    console.error("Error fetching extra example:", error);
    throw new Error("Yeni örnek oluşturulurken bir hata oluştu.");
  }
};

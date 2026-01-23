
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordEntry, VocabularyRequest } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const WORD_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING },
    phonetic: { type: Type.STRING },
    partOfSpeech: { type: Type.STRING },
    definition: { type: Type.STRING },
    definitionTurkish: { type: Type.STRING },
    cefrLevel: { type: Type.STRING, description: "B2 or C1" },
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

export const fetchAdvancedVocabulary = async (request: VocabularyRequest): Promise<WordEntry[]> => {
  const levelPrompt = request.level === 'Mixed' ? 'B2 or C1' : request.level;
  const randomSalt = Math.random().toString(36).substring(7);

  const prompt = `Generate exactly ${request.count} unique, challenging, and sophisticated English vocabulary words at ${levelPrompt} level. 
  
  CRITICAL INSTRUCTIONS:
  1. The selection must be COMPLETELY RANDOM from the entire B2/C1 lexicon. 
  2. Avoid basic words; focus on nuanced academic, literary, or professional terms.
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

export const fetchSingleRandomWord = async (level: 'B2' | 'C1' | 'Mixed', excludeWords: string[] = []): Promise<WordEntry> => {
  const levelPrompt = level === 'Mixed' ? 'B2 or C1' : level;
  const randomSalt = Math.random().toString(36).substring(7);

  const prompt = `Generate exactly ONE unique and challenging English vocabulary word at ${levelPrompt} level. 
  IMPORTANT: Do NOT include any of these words: ${excludeWords.join(', ')}.
  Focus on academic or sophisticated professional vocabulary. (Salt: ${randomSalt}).
  
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

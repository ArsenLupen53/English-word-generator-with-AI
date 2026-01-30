
export interface ExampleSentence {
  english: string;
  turkish: string;
}

export type CEFRLevel = 'A1' | 'A2' | 'A2+' | 'B1' | 'B1+' | 'B2' | 'C1' | 'C2';

export interface WordEntry {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  definitionTurkish: string;
  examples: ExampleSentence[];
  cefrLevel: CEFRLevel;
}

export interface VocabularyRequest {
  count: number;
  level: CEFRLevel | 'Mixed';
}

export interface GeneratedStory {
  english: string;
  turkish: string;
}

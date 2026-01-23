
export interface ExampleSentence {
  english: string;
  turkish: string;
}

export interface WordEntry {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  definitionTurkish: string;
  examples: ExampleSentence[];
  cefrLevel: 'B2' | 'C1';
}

export interface VocabularyRequest {
  count: number;
  level: 'B2' | 'C1' | 'Mixed';
}

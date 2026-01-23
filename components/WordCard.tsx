
import React, { useState } from 'react';
import { WordEntry, ExampleSentence } from '../types';
import { fetchWordAudio, fetchExtraExample } from '../services/geminiService';

interface WordCardProps {
  entry: WordEntry;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

// Audio decoding utilities
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const WordCard: React.FC<WordCardProps> = ({ entry, onRefresh, isRefreshing }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [extraExamples, setExtraExamples] = useState<ExampleSentence[]>([]);
  const [isLoadingExample, setIsLoadingExample] = useState(false);

  const handlePlayAudio = async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const base64Audio = await fetchWordAudio(entry.word);
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const decodedBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(decodedBytes, audioCtx, 24000, 1);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => setIsPlaying(false);
      source.start();
    } catch (error) {
      console.error("Audio playback failed:", error);
      setIsPlaying(false);
    }
  };

  const handleAddExample = async () => {
    if (isLoadingExample) return;
    setIsLoadingExample(true);
    try {
      const existingText = [...entry.examples, ...extraExamples].map(ex => ex.english);
      const newEx = await fetchExtraExample(entry.word, existingText);
      setExtraExamples(prev => [...prev, newEx]);
    } catch (error) {
      console.error("Adding example failed:", error);
    } finally {
      setIsLoadingExample(false);
    }
  };

  const allExamples = [...entry.examples, ...extraExamples];

  return (
    <div className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 mb-6 group relative ${isRefreshing ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      {isRefreshing && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 z-10 backdrop-blur-[1px]">
          <i className="fas fa-circle-notch animate-spin text-indigo-600 text-3xl"></i>
        </div>
      )}
      
      <div className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-serif font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {entry.word}
              </h2>
              <button 
                onClick={handlePlayAudio}
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${isPlaying ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                title="Telaffuzu Dinle"
                disabled={isPlaying}
              >
                <i className={`fas ${isPlaying ? 'fa-volume-up animate-pulse' : 'fa-volume-high'}`}></i>
              </button>
              <span className="text-sm font-medium px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">
                {entry.cefrLevel}
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-400 italic text-sm">
              <span>{entry.phonetic}</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span className="capitalize">{entry.partOfSpeech}</span>
            </div>
          </div>
          
          {onRefresh && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              title="Bu kelimeyi değiştir"
              className="p-2.5 rounded-full bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-100 hover:border-indigo-100"
            >
              <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
            </button>
          )}
        </div>

        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed mb-2 font-medium text-lg">
            {entry.definition}
          </p>
          <p className="text-gray-500 text-sm italic">
            {entry.definitionTurkish}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <span className="w-4 h-[1px] bg-indigo-200"></span>
            Examples
          </h3>
          <div className="space-y-4">
            {allExamples.map((ex, idx) => (
              <div key={idx} className="bg-slate-50/80 p-4 rounded-xl border-l-4 border-indigo-200 hover:border-indigo-400 transition-colors animate-in fade-in slide-in-from-left-2 duration-300">
                <p className="text-slate-800 font-medium mb-1">“{ex.english}”</p>
                <p className="text-slate-500 text-sm">“{ex.turkish}”</p>
              </div>
            ))}
          </div>
          
          <div className="flex justify-center pt-2">
            <button
              onClick={handleAddExample}
              disabled={isLoadingExample}
              className="group flex items-center gap-2 text-indigo-500 hover:text-indigo-700 font-semibold text-sm transition-all bg-indigo-50/50 hover:bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100"
            >
              {isLoadingExample ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : (
                <i className="fas fa-plus group-hover:rotate-90 transition-transform"></i>
              )}
              {isLoadingExample ? 'Örnek Hazırlanıyor...' : 'Daha Fazla Örnek'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

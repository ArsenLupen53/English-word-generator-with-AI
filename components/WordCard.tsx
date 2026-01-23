
import React from 'react';
import { WordEntry } from '../types';

interface WordCardProps {
  entry: WordEntry;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const WordCard: React.FC<WordCardProps> = ({ entry, onRefresh, isRefreshing }) => {
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
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-serif font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                {entry.word}
              </h2>
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
          {entry.examples.map((ex, idx) => (
            <div key={idx} className="bg-slate-50/80 p-4 rounded-xl border-l-4 border-indigo-200 hover:border-indigo-400 transition-colors">
              <p className="text-slate-800 font-medium mb-1">“{ex.english}”</p>
              <p className="text-slate-500 text-sm">“{ex.turkish}”</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { fetchAdvancedVocabulary, fetchSingleRandomWord } from './services/geminiService';
import { WordEntry, VocabularyRequest } from './types';
import { WordCard } from './components/WordCard';
import { APP_TITLE, APP_SUBTITLE, DEFAULT_WORD_COUNT, MAX_WORD_COUNT, LEVELS } from './constants';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshingIndices, setRefreshingIndices] = useState<Set<number>>(new Set());
  const [words, setWords] = useState<WordEntry[]>([]);
  const [seenWords, setSeenWords] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | ''>(DEFAULT_WORD_COUNT);
  const [level, setLevel] = useState<VocabularyRequest['level']>('Mixed');
  const [lastRequest, setLastRequest] = useState<{ count: number; level: string } | null>(null);

  // Helper to add words to memory
  const addToSeen = (newWords: string[]) => {
    setSeenWords(prev => {
      const next = new Set(prev);
      newWords.forEach(w => next.add(w.toLowerCase().trim()));
      return next;
    });
  };

  const handleGenerate = async () => {
    const finalCount = count === '' || count <= 0 ? 1 : count;
    setLoading(true);
    setError(null);
    setWords([]); 
    
    try {
      // Pass all seen words to exclude them
      const result = await fetchAdvancedVocabulary({ count: finalCount, level }, Array.from(seenWords));
      setWords(result);
      addToSeen(result.map(w => w.word));
      setLastRequest({ count: finalCount, level });
      window.scrollTo({ top: 200, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSingleWord = async (index: number) => {
    if (refreshingIndices.has(index)) return;
    
    setRefreshingIndices(prev => new Set(prev).add(index));
    setError(null);

    try {
      // Exclude everything seen in this session + currently displayed words
      const exclude = Array.from(new Set([
        ...Array.from(seenWords),
        ...words.map(w => w.word.toLowerCase().trim())
      ]));
      
      const newWord = await fetchSingleRandomWord(level, exclude);
      
      setWords(prev => {
        const next = [...prev];
        next[index] = newWord;
        return next;
      });
      addToSeen([newWord.word]);
    } catch (err: any) {
      setError(err.message || "Kelime güncellenemedi.");
    } finally {
      setRefreshingIndices(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }
  };

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      setCount('');
    } else {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) {
        setCount(Math.min(MAX_WORD_COUNT, parsed));
      }
    }
  };

  const getLevelLabel = (id: string) => LEVELS.find(l => l.id === id)?.label || id;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
      <header className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
          {APP_TITLE}
        </h1>
        <p className="text-lg text-slate-600 font-light max-w-xl mx-auto">
          {APP_SUBTITLE} — Kelime dağarcığınızı A1'den C2'ye dilediğiniz seviyede rastgele kelimelerle geliştirin.
        </p>
      </header>

      <section className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 md:p-8 mb-10 border border-white/50 ring-1 ring-slate-200/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Kelime Sayısı</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={MAX_WORD_COUNT}
                value={count}
                onChange={handleCountChange}
                placeholder="1"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 font-semibold text-lg"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <i className="fas fa-list-ol"></i>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Zorluk Seviyesi</label>
            <div className="relative">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as VocabularyRequest['level'])}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900 font-semibold text-lg appearance-none cursor-pointer"
              >
                {LEVELS.map(l => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <i className="fas fa-chevron-down"></i>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || count === ''}
            className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg active:transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group h-[60px]`}
          >
            {loading ? (
              <>
                <i className="fas fa-circle-notch animate-spin"></i>
                Hazırlanıyor...
              </>
            ) : (
              <>
                <i className="fas fa-sync-alt group-hover:rotate-180 transition-transform duration-500"></i>
                Kelimeleri Getir
              </>
            )}
          </button>
        </div>
        
        {seenWords.size > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            <span>Oturum Belleği Aktif</span>
            <span>{seenWords.size} Kelime Görüldü</span>
          </div>
        )}
      </section>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl mb-8 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
          <i className="fas fa-exclamation-circle text-red-500 text-xl"></i>
          <p className="text-red-700 font-medium">{error}</p>
        </div>
      )}

      {lastRequest && !loading && (
        <div className="flex items-center gap-2 mb-6 px-2 animate-in fade-in slide-in-from-left-4 duration-500">
          <span className="text-slate-500 text-sm font-medium">Şu an gösterilen:</span>
          <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
            {lastRequest.count} Kelime
          </span>
          <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
            {getLevelLabel(lastRequest.level)}
          </span>
        </div>
      )}

      <main className="space-y-8 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
             <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
             <p className="animate-pulse font-medium">Gemini AI geniş kelime haznesini tarıyor...</p>
          </div>
        ) : words.length > 0 ? (
          words.map((word, index) => (
            <div key={`${word.word}-${index}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${index * 50}ms` }}>
              <WordCard 
                entry={word} 
                onRefresh={() => handleRefreshSingleWord(index)}
                isRefreshing={refreshingIndices.has(index)}
              />
            </div>
          ))
        ) : !error && (
          <div className="text-center py-20 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-300">
            <div className="text-slate-400 mb-4">
              <i className="fas fa-random text-6xl opacity-20"></i>
            </div>
            <p className="text-slate-500 font-medium italic">Her tıklamada tamamen yeni ve seviyeye uygun kelimeler üretilir.</p>
            <p className="text-slate-400 text-sm mt-2">Kartlardaki yenileme butonuna basarak tekil kelimeleri de değiştirebilirsiniz.</p>
          </div>
        )}
      </main>

      <footer className="mt-20 pt-10 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">
          Powered by Gemini AI & bull; {new Date().getFullYear()} LinguistPro
        </p>
      </footer>
    </div>
  );
};

export default App;

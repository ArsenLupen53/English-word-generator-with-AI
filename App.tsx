
import React, { useState, useEffect } from 'react';
import { fetchAdvancedVocabulary, fetchSingleRandomWord, generateStoryWithWords } from './services/geminiService';
import { WordEntry, VocabularyRequest, GeneratedStory } from './types';
import { WordCard } from './components/WordCard';
import { APP_TITLE, APP_SUBTITLE, DEFAULT_WORD_COUNT, MAX_WORD_COUNT, LEVELS } from './constants';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshingIndices, setRefreshingIndices] = useState<Set<number>>(new Set());
  const [words, setWords] = useState<WordEntry[]>([]);
  const [seenWords, setSeenWords] = useState<Set<string>>(new Set());
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState<number | ''>(DEFAULT_WORD_COUNT);
  const [level, setLevel] = useState<VocabularyRequest['level']>('Mixed');
  const [lastRequest, setLastRequest] = useState<{ count: number; level: string } | null>(null);

  // Story generation state - Changed to an array for multiple stories
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [stories, setStories] = useState<GeneratedStory[]>([]);

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
    setSelectedWords(new Set());
    setStories([]);
    
    try {
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

    const oldWord = words[index].word;

    try {
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
      
      // Clear from selected if the word was replaced
      setSelectedWords(prev => {
        const next = new Set(prev);
        next.delete(oldWord);
        return next;
      });
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

  const toggleSelectWord = (word: string, isSelected: boolean) => {
    setSelectedWords(prev => {
      const next = new Set(prev);
      if (isSelected) next.add(word);
      else next.delete(word);
      return next;
    });
  };

  // mode: 'init' = fresh start, 'replace' = regenerate last, 'append' = add new
  const handleGenerateStory = async (mode: 'init' | 'replace' | 'append' = 'init') => {
    if (selectedWords.size === 0) return;
    setIsGeneratingStory(true);
    setError(null);
    try {
      const result = await generateStoryWithWords(Array.from(selectedWords), level);
      
      setStories(prev => {
        if (mode === 'init') return [result];
        if (mode === 'replace') {
          const next = [...prev];
          next[next.length - 1] = result;
          return next;
        }
        return [...prev, result];
      });

      if (mode === 'init') {
        setTimeout(() => {
          document.getElementById('story-container')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || "Metin oluşturulurken bir hata oluştu.");
    } finally {
      setIsGeneratingStory(false);
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

  const renderMarkdown = (text: string) => {
    return text.split('**').map((part, i) => 
      i % 2 === 1 ? <strong key={i} className="text-indigo-600 font-bold">{part}</strong> : part
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-20 pb-40">
      <header className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-serif font-bold text-slate-900 mb-4 tracking-tight">
          {APP_TITLE}
        </h1>
        <p className="text-lg text-slate-600 font-light max-w-xl mx-auto">
          {APP_SUBTITLE} — Kelime dağarcığınızı seviyenize uygun rastgele kelimeler ve akıllı metinlerle geliştirin.
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
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-amber-700 text-xs flex items-center gap-3 mb-4">
              <i className="fas fa-info-circle"></i>
              <span>Kelimeleri seçerek aşağıdan toplu bir metin oluşturabilirsiniz.</span>
            </div>
            {words.map((word, index) => (
              <div key={`${word.word}-${index}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${index * 50}ms` }}>
                <WordCard 
                  entry={word} 
                  onRefresh={() => handleRefreshSingleWord(index)}
                  isRefreshing={refreshingIndices.has(index)}
                  isSelected={selectedWords.has(word.word)}
                  onSelect={(sel) => toggleSelectWord(word.word, sel)}
                />
              </div>
            ))}
          </div>
        ) : !error && (
          <div className="text-center py-20 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-300">
            <div className="text-slate-400 mb-4">
              <i className="fas fa-random text-6xl opacity-20"></i>
            </div>
            <p className="text-slate-500 font-medium italic">Her tıklamada tamamen yeni ve seviyeye uygun kelimeler üretilir.</p>
            <p className="text-slate-400 text-sm mt-2">Kartlardaki yenileme butonuna basarak tekil kelimeleri de değiştirebilirsiniz.</p>
          </div>
        )}

        {/* Story Section */}
        {stories.length > 0 && (
          <div id="story-container" className="mt-12 space-y-6">
            <div className="flex items-center justify-between px-4">
               <h3 className="text-2xl font-serif font-bold text-slate-800">Bağlamsal Kullanımlar</h3>
               <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">
                 {stories.length} Versiyon
               </span>
            </div>
            
            <div className="space-y-6">
              {stories.map((story, sIdx) => (
                <div 
                  key={sIdx} 
                  className="bg-indigo-900 text-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden group/story"
                >
                  <div className="flex items-center justify-between gap-3 mb-6 border-b border-indigo-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-200 border border-indigo-600">
                        {sIdx + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-serif font-bold">Örnek Kullanım</h3>
                        <p className="text-indigo-400 text-[10px] font-bold uppercase tracking-widest">Yapay Zeka Tarafından Üretildi</p>
                      </div>
                    </div>
                    
                    {sIdx === stories.length - 1 && (
                      <button 
                        onClick={() => handleGenerateStory('replace')}
                        disabled={isGeneratingStory}
                        className="flex items-center gap-2 bg-indigo-800/50 hover:bg-indigo-700 text-indigo-100 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-indigo-700/50 active:scale-95 disabled:opacity-50"
                        title="Bu Metni Beğenmediniz mi? Yeniden Üretin"
                      >
                        {isGeneratingStory ? (
                          <i className="fas fa-circle-notch animate-spin"></i>
                        ) : (
                          <i className="fas fa-rotate-right"></i>
                        )}
                        {isGeneratingStory ? 'Yenileniyor...' : 'Yeniden Üret'}
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-8 relative">
                    {isGeneratingStory && sIdx === stories.length - 1 && (
                      <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                         <div className="flex flex-col items-center gap-2">
                           <i className="fas fa-wand-magic-sparkles animate-pulse text-indigo-400 text-2xl"></i>
                           <span className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Yeni Metin Yazılıyor...</span>
                         </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xl leading-relaxed font-light italic">
                        {renderMarkdown(story.english)}
                      </p>
                    </div>
                    <div className="bg-indigo-800/50 p-6 rounded-2xl border border-indigo-700/50">
                      <p className="text-indigo-200 leading-relaxed italic">
                        {story.turkish}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={() => handleGenerateStory('append')}
                disabled={isGeneratingStory}
                className="flex items-center gap-3 bg-white hover:bg-slate-50 text-indigo-600 px-8 py-4 rounded-2xl font-bold shadow-lg border border-indigo-100 transition-all active:scale-95 disabled:opacity-50"
              >
                {isGeneratingStory ? (
                  <i className="fas fa-circle-notch animate-spin"></i>
                ) : (
                  <i className="fas fa-plus-circle"></i>
                )}
                {isGeneratingStory ? 'Yeni Metin Hazırlanıyor...' : 'Yeni Metin Ekle'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Selection Bar */}
      {selectedWords.size > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50 animate-in slide-in-from-bottom-10 duration-500">
          <div className="bg-white/80 backdrop-blur-xl border border-indigo-100 shadow-2xl rounded-2xl p-4 flex items-center justify-between ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-indigo-200 shadow-lg">
                {selectedWords.size}
              </div>
              <div>
                <p className="text-slate-900 font-bold text-sm">Kelime Seçildi</p>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-tight">Kullanım Metni Hazırlanabilir</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedWords(new Set())}
                className="px-4 py-2 text-slate-400 hover:text-slate-600 text-xs font-bold transition-colors"
              >
                Seçimi Temizle
              </button>
              <button 
                onClick={() => handleGenerateStory('init')}
                disabled={isGeneratingStory}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                {isGeneratingStory ? (
                  <i className="fas fa-circle-notch animate-spin"></i>
                ) : (
                  <i className="fas fa-wand-magic-sparkles"></i>
                )}
                {isGeneratingStory ? 'Hazırlanıyor...' : 'Metin Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-20 pt-10 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-sm">
          Powered by Gemini AI &bull; {new Date().getFullYear()} LinguistPro
        </p>
      </footer>
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { AudioUploader } from './components/AudioUploader';
import { TranscriptList } from './components/TranscriptList';
import { Summary } from './components/Summary';
import { Waveform } from './components/Waveform';
import { transcribeAudio, TranscriptionResult } from './lib/gemini';
import { 
  Mic, 
  Settings2, 
  History, 
  Search, 
  Plus, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Cpu,
  Activity,
  Loader2,
  Files,
  Scissors,
  Minimize2,
  ScanText,
  Image as ImageIcon,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// New Tool Components
import { PdfMerge } from './components/tools/PdfMerge';
import { PdfSplit } from './components/tools/PdfSplit';
import { PdfCompress } from './components/tools/PdfCompress';
import { OcrTool } from './components/tools/OcrTool';
import { ImgToPdf } from './components/tools/ImgToPdf';
import { DocConvert } from './components/tools/DocConvert';

type Tab = 'clovanote' | 'pdf-merge' | 'pdf-split' | 'pdf-compress' | 'ocr' | 'img-to-pdf' | 'doc-convert';

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>('clovanote');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [showChunkingInfo, setShowChunkingInfo] = useState(false);
  const [compressOption, setCompressOption] = useState(false);

  const handleFileSelect = async (file: File, compress: boolean) => {
    setAudioFile(file);
    setCompressOption(compress);
    setAudioUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
    setIsProcessing(true);
    setProgress(0);

    if (file.size > 100 * 1024 * 1024 && !compress) {
      setError('100MB 이상의 파일은 압축 옵션을 선택해야 합니다.');
      setIsProcessing(false);
      return;
    }

    try {
      let base64Data = '';
      let mimeType = file.type;

      if (compress) {
        setProgress(5); // Initial progress for compression
        const formData = new FormData();
        formData.append('file', file); // Changed from 'audio' to 'file' to match server.ts
        
        const compressRes = await fetch('/api/audio/compress', {
          method: 'POST',
          body: formData,
        });
        
        if (!compressRes.ok) throw new Error('오디오 압축에 실패했습니다.');
        
        const blob = await compressRes.blob();
        mimeType = 'audio/mp4'; // server.ts returns mp4
        
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
        setProgress(20); // Compression done
      } else {
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(file);
        });
      }

      const transcriptionResult = await transcribeAudio(
        base64Data, 
        mimeType, 
        (p) => setProgress(Math.min(95, compress ? 20 + (p * 0.75) : p))
      );
      
      setResult(transcriptionResult);
      setProgress(100);
    } catch (err: any) {
      setError(err.message || '변환 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setAudioFile(null);
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'clovanote':
        return (
          <AnimatePresence mode="wait">
            {!audioFile ? (
              <motion.div
                key="uploader"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-12"
              >
                <div className="text-center space-y-4">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">대화의 가치를 기록으로.</h2>
                  <p className="text-slate-500 text-lg max-w-xl mx-auto">
                    회의, 강의, 인터뷰 등 모든 대화를 Gemini AI가 정확하게 기록하고 요약합니다.
                  </p>
                </div>

                <AudioUploader 
                  onFileSelect={handleFileSelect} 
                  isProcessing={isProcessing} 
                  progress={progress}
                  error={error}
                />

                {/* Secret Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                  <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                      <Cpu size={20} />
                    </div>
                    <h3 className="font-bold text-sm">병렬 처리 기술</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">대용량 파일을 청크 단위로 쪼개어 여러 서버에서 동시에 처리하여 속도를 극대화합니다.</p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                      <Activity size={20} />
                    </div>
                    <h3 className="font-bold text-sm">VAD 무음 감지</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">무음 구간을 지능적으로 식별하여 처리 효율을 높이고 정확한 문맥 파악을 돕습니다.</p>
                  </div>
                  <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                      <ShieldCheck size={20} />
                    </div>
                    <h3 className="font-bold text-sm">보안 및 개인정보</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">모든 데이터는 암호화되어 처리되며, 사용자의 허가 없이 학습에 활용되지 않습니다.</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Back Button */}
                <button 
                  onClick={reset}
                  className="text-sm font-semibold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2"
                >
                  <Plus className="rotate-45" size={16} />
                  <span>새로운 기록 시작하기</span>
                </button>

                {/* Audio Info & Waveform */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">{audioFile.name}</h2>
                    <span className="text-xs font-mono text-slate-400">{(audioFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                  {audioUrl && <Waveform url={audioUrl} />}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600">
                    <AlertCircle size={20} />
                    <div className="flex-1">
                      <p className="text-sm font-bold">오류가 발생했습니다</p>
                      <p className="text-xs">{error}</p>
                    </div>
                    <button 
                      onClick={() => handleFileSelect(audioFile!, compressOption)}
                      className="px-3 py-1 bg-white border border-red-200 rounded-lg text-xs font-bold hover:bg-red-50 transition-all"
                    >
                      재시도
                    </button>
                  </div>
                )}

                {/* Processing Info Overlay */}
                {isProcessing && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-500 shadow-sm">
                      <Loader2 className="animate-spin" size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Gemini AI 분석 중</span>
                        <span className="text-xs font-mono text-emerald-600">{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Results Grid */}
                {result && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                      <TranscriptList segments={result.segments} />
                    </div>
                    <div className="lg:sticky lg:top-24">
                      <Summary summary={result.summary} keywords={result.keywords} />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        );
      case 'pdf-merge': return <PdfMerge />;
      case 'pdf-split': return <PdfSplit />;
      case 'pdf-compress': return <PdfCompress />;
      case 'ocr': return <OcrTool />;
      case 'img-to-pdf': return <ImgToPdf />;
      case 'doc-convert': return <DocConvert />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-emerald-100">
      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-16 md:w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8 z-50">
        <div 
          onClick={() => setCurrentTab('clovanote')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${currentTab === 'clovanote' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
        >
          <Mic size={20} />
        </div>
        
        <nav className="flex flex-col gap-6 text-slate-400">
          <button onClick={() => setCurrentTab('pdf-merge')} className={`p-2 rounded-lg transition-all ${currentTab === 'pdf-merge' ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-slate-50 hover:text-emerald-500'}`} title="PDF 병합"><Files size={20} /></button>
          <button onClick={() => setCurrentTab('pdf-split')} className={`p-2 rounded-lg transition-all ${currentTab === 'pdf-split' ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-slate-50 hover:text-emerald-500'}`} title="PDF 분할"><Scissors size={20} /></button>
          <button onClick={() => setCurrentTab('pdf-compress')} className={`p-2 rounded-lg transition-all ${currentTab === 'pdf-compress' ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-slate-50 hover:text-emerald-500'}`} title="PDF 압축"><Minimize2 size={20} /></button>
          <button onClick={() => setCurrentTab('ocr')} className={`p-2 rounded-lg transition-all ${currentTab === 'ocr' ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-slate-50 hover:text-emerald-500'}`} title="OCR 텍스트 추출"><ScanText size={20} /></button>
          <button onClick={() => setCurrentTab('img-to-pdf')} className={`p-2 rounded-lg transition-all ${currentTab === 'img-to-pdf' ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-slate-50 hover:text-emerald-500'}`} title="이미지 PDF 변환"><ImageIcon size={20} /></button>
          <button onClick={() => setCurrentTab('doc-convert')} className={`p-2 rounded-lg transition-all ${currentTab === 'doc-convert' ? 'bg-emerald-50 text-emerald-500' : 'hover:bg-slate-50 hover:text-emerald-500'}`} title="문서 변환"><FileText size={20} /></button>
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button className="p-2 hover:bg-slate-50 hover:text-emerald-500 rounded-lg transition-all text-slate-400"><History size={20} /></button>
          <button className="p-2 hover:bg-slate-50 hover:text-emerald-500 rounded-lg transition-all text-slate-400"><Settings2 size={20} /></button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-16 md:pl-20 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between z-40">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">ClovaNote AI</h1>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-100">Pro</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowChunkingInfo(!showChunkingInfo)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <Zap size={14} />
              <span>처리 기술 원리</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300" />
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-8 py-12">
          {renderContent()}
        </div>
      </main>

      {/* Processing Logic Info Modal */}
      <AnimatePresence>
        {showChunkingInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
            onClick={() => setShowChunkingInfo(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white max-w-lg w-full rounded-3xl p-8 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-emerald-600">
                <Zap size={24} />
                <h2 className="text-xl font-bold">ClovaNote AI 처리 원리</h2>
              </div>
              
              <div className="space-y-6">
                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">01</span>
                    오디오 청킹 (Chunking)
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    대용량 오디오 파일을 일정한 시간 단위(예: 10분)로 쪼개어 처리합니다. 이는 단일 프로세서의 부하를 줄이고 처리 속도를 비약적으로 향상시킵니다.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">02</span>
                    병렬 처리 (Parallel Processing)
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    쪼개진 청크들을 여러 개의 AI 인스턴스에서 동시에 분석합니다. 1시간 분량의 녹음도 10분 분량을 처리하는 시간 내에 완료할 수 있는 비결입니다.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-[10px]">03</span>
                    VAD (Voice Activity Detection)
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    음성이 없는 무음 구간을 식별하여 제거하거나, 문장이 끝나는 지점을 파악하여 청킹의 기준점으로 삼아 전사의 정확도를 높입니다.
                  </p>
                </section>
              </div>

              <button 
                onClick={() => setShowChunkingInfo(false)}
                className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
              >
                확인했습니다
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

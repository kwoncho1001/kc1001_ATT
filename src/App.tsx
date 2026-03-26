/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Upload, 
  FileAudio, 
  Loader2, 
  CheckCircle2, 
  Copy, 
  RefreshCw,
  Mic,
  Beaker,
  Atom,
  Dna,
  FileText,
  Plus,
  Trash2,
  Download,
  ArrowUp,
  ArrowDown,
  Files,
  Globe,
  Briefcase,
  GraduationCap,
  Stethoscope,
  MessageSquare,
  TrendingUp,
  Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type Tab = 'audio' | 'pdf';

const FIELDS = [
  { id: 'science', name: '과학/기술', icon: Beaker, desc: '전문 과학 용어 정밀 분석' },
  { id: 'business', name: '비즈니스/경영', icon: Briefcase, desc: '회의 및 경영 비즈니스 용어' },
  { id: 'economy', name: '경제/금융', icon: TrendingUp, desc: '경제 지표, 금융 및 화폐 용어' },
  { id: 'politics', name: '정치/외교', icon: Landmark, desc: '정치 이슈 및 외교 담론' },
  { id: 'trade', name: '무역/통상', icon: Globe, desc: '국제 무역 및 통상 관련' },
  { id: 'education', name: '교육/학술', icon: GraduationCap, desc: '강의 및 학술 발표' },
  { id: 'medical', name: '의료/보건', icon: Stethoscope, desc: '의학 용어 및 진료' },
  { id: 'general', name: '일반', icon: MessageSquare, desc: '일상 대화 및 일반 녹음' },
];

const LANGUAGES = [
  { id: 'ko', name: '한국어', flag: '🇰🇷' },
  { id: 'en', name: 'English', flag: '🇺🇸' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('audio');
  
  // Audio State
  const [file, setFile] = useState<File | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedField, setSelectedField] = useState('science');
  const [targetLanguage, setTargetLanguage] = useState('ko');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF State
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Audio Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'audio/x-m4a' || selectedFile.name.endsWith('.m4a')) {
        setFile(selectedFile);
        setAudioError(null);
        setTranscription('');
      } else {
        setAudioError('m4a 형식의 파일만 지원합니다.');
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const transcribeAudio = async () => {
    if (!file) return;
    setIsTranscribing(true);
    setAudioError(null);

    const fieldInfo = FIELDS.find(f => f.id === selectedField);
    const langInfo = LANGUAGES.find(l => l.id === targetLanguage);

    try {
      const base64Data = await fileToBase64(file);
      const model = "gemini-3-flash-preview";
      const response = await genAI.models.generateContent({
        model: model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: "audio/m4a", data: base64Data } },
              { 
                text: `이 오디오 파일의 내용을 ${langInfo?.name}로 정확하게 받아쓰기(transcribe) 해주세요. 
                특히 ${fieldInfo?.name} 분야의 용어와 개념에 주의하여 정확하게 텍스트로 변환해주세요. 
                화자가 여러 명이라면 구분하여 작성해주고, 가독성 있게 문단을 나누어주세요.` 
              }
            ]
          }
        ],
        config: {
          systemInstruction: `당신은 전문 ${fieldInfo?.name} 분야의 속기사입니다. 제공된 오디오에서 해당 분야의 전문 용어를 정확하게 파악하고 ${langInfo?.name}로 완벽하게 전사합니다.`
        }
      });
      const text = response.text;
      if (text) setTranscription(text);
      else throw new Error('텍스트를 추출하지 못했습니다.');
    } catch (err: any) {
      console.error('Transcription error:', err);
      setAudioError('변환 중 오류가 발생했습니다: ' + (err.message || '알 수 없는 오류'));
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadTxt = () => {
    if (!transcription) return;
    const blob = new Blob([transcription], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file ? `${file.name.replace(/\.[^/.]+$/, "")}_transcription.txt` : 'transcription.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetAudio = () => {
    setFile(null);
    setTranscription('');
    setAudioError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // PDF Handlers
  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    const validPdfs = selectedFiles.filter(f => f.type === 'application/pdf');
    if (validPdfs.length !== selectedFiles.length) {
      setPdfError('PDF 파일만 선택 가능합니다.');
    } else {
      setPdfError(null);
    }
    setPdfFiles(prev => [...prev, ...validPdfs]);
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const removePdf = (index: number) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const movePdf = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...pdfFiles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFiles.length) {
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      setPdfFiles(newFiles);
    }
  };

  const mergePdfs = async () => {
    if (pdfFiles.length < 2) {
      setPdfError('최소 2개 이상의 PDF 파일이 필요합니다.');
      return;
    }
    setIsMerging(true);
    setPdfError(null);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const file of pdfFiles) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'merged_document.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF Merge error:', err);
      setPdfError('PDF 합치기 중 오류가 발생했습니다.');
    } finally {
      setIsMerging(false);
    }
  };

  const resetPdf = () => {
    setPdfFiles([]);
    setPdfError(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#1a1a1a] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="max-w-4xl mx-auto pt-12 px-6 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-emerald-500 rounded-lg text-white">
            <Files size={24} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Audio Transcriber & Document Tools</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-gray-200/50 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'audio' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mic size={16} />
            오디오 전사
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'pdf' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={16} />
            PDF 합치기
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'audio' ? (
            <motion.div
              key="audio"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 gap-8"
            >
              {/* Audio Transcriber UI */}
              <section className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
                {/* Options Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">주요 분야 선택</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FIELDS.map((field) => (
                        <button
                          key={field.id}
                          onClick={() => setSelectedField(field.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedField === field.id 
                              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                              : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                          }`}
                        >
                          <field.icon size={18} className={selectedField === field.id ? 'text-emerald-600' : 'text-gray-400'} />
                          <p className={`text-xs font-semibold mt-2 ${selectedField === field.id ? 'text-emerald-700' : 'text-gray-600'}`}>{field.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">결과 언어 선택</label>
                    <div className="flex gap-2">
                      {LANGUAGES.map((lang) => (
                        <button
                          key={lang.id}
                          onClick={() => setTargetLanguage(lang.id)}
                          className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                            targetLanguage === lang.id 
                              ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                              : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                          }`}
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className={`text-xs font-semibold ${targetLanguage === lang.id ? 'text-emerald-700' : 'text-gray-600'}`}>{lang.name}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-3 italic">* 선택한 언어로 텍스트가 생성됩니다.</p>
                  </div>
                </div>

                <div 
                  className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    file ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !isTranscribing && fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".m4a"
                    className="hidden"
                  />
                  {file ? (
                    <div className="text-center">
                      <FileAudio className="mx-auto text-emerald-500 mb-4" size={48} />
                      <p className="font-medium mb-1">{file.name}</p>
                      <p className="text-xs text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto text-gray-300 mb-4" size={48} />
                      <p className="font-medium mb-1">m4a 파일을 드래그하거나 클릭하여 업로드하세요</p>
                      <p className="text-xs text-gray-400">과학 강연, 실험 녹음 등</p>
                    </div>
                  )}
                </div>
                {audioError && <p className="text-red-500 text-sm mt-4 text-center">{audioError}</p>}
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={transcribeAudio}
                    disabled={!file || isTranscribing}
                    className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      !file || isTranscribing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                    }`}
                  >
                    {isTranscribing ? <><Loader2 className="animate-spin" size={20} />텍스트 추출 중...</> : <><RefreshCw size={20} />텍스트로 변환하기</>}
                  </button>
                  {file && !isTranscribing && (
                    <button onClick={resetAudio} className="px-6 py-4 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">초기화</button>
                  )}
                </div>
              </section>

              {/* Result Section */}
              <AnimatePresence>
                {(transcription || isTranscribing) && (
                  <motion.section 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden"
                  >
                    <div className="px-8 py-6 border-bottom border-black/5 flex items-center justify-between bg-gray-50/50">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" size={20} />
                        <h2 className="font-semibold">변환 결과</h2>
                      </div>
                      {transcription && (
                        <div className="flex items-center gap-4">
                          <button onClick={downloadTxt} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                            <Download size={16} />
                            .txt 다운로드
                          </button>
                          <button onClick={copyToClipboard} className="flex items-center gap-2 text-sm text-gray-500 hover:text-emerald-600 transition-colors">
                            {copySuccess ? <><CheckCircle2 size={16} />복사됨</> : <><Copy size={16} />복사하기</>}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="p-8 min-h-[300px] relative">
                      {isTranscribing && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                          <div className="flex gap-2 mb-4">
                            {[0, 0.2, 0.4].map(delay => (
                              <motion.div key={delay} animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay }} className="w-3 h-3 bg-emerald-500 rounded-full" />
                            ))}
                          </div>
                          <p className="text-gray-500 text-sm font-medium">AI가 오디오를 분석하여 텍스트를 생성하고 있습니다...</p>
                        </div>
                      )}
                      <div className="prose prose-emerald max-w-none">
                        {transcription ? <div className="whitespace-pre-wrap leading-relaxed text-gray-700">{transcription}</div> : (
                          <div className="flex flex-col items-center justify-center text-gray-300 py-12">
                            <Mic size={48} className="mb-4 opacity-20" />
                            <p>변환된 텍스트가 여기에 표시됩니다.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              key="pdf"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 gap-8"
            >
              {/* PDF Merger UI */}
              <section className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
                <div 
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center hover:border-emerald-300 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => !isMerging && pdfInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={pdfInputRef}
                    onChange={handlePdfChange}
                    accept=".pdf"
                    multiple
                    className="hidden"
                  />
                  <Plus className="text-gray-300 mb-4" size={48} />
                  <p className="font-medium mb-1">PDF 파일들을 추가하세요</p>
                  <p className="text-xs text-gray-400">여러 파일을 한 번에 선택할 수 있습니다</p>
                </div>

                {pdfError && <p className="text-red-500 text-sm mt-4 text-center">{pdfError}</p>}

                {pdfFiles.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">파일 목록 ({pdfFiles.length})</h3>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md font-medium border border-emerald-100">
                        예상 병합 용량: {(pdfFiles.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="space-y-2">
                      {pdfFiles.map((f, i) => (
                        <motion.div 
                          layout
                          key={`${f.name}-${i}`}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-black/5"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="text-emerald-500 shrink-0" size={20} />
                            <span className="text-sm font-medium truncate">{f.name}</span>
                            <span className="text-xs text-gray-400 shrink-0">{(f.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => movePdf(i, 'up')} disabled={i === 0} className="p-1.5 text-gray-400 hover:text-emerald-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                            <button onClick={() => movePdf(i, 'down')} disabled={i === pdfFiles.length - 1} className="p-1.5 text-gray-400 hover:text-emerald-600 disabled:opacity-30"><ArrowDown size={16} /></button>
                            <button onClick={() => removePdf(i)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={mergePdfs}
                    disabled={pdfFiles.length < 2 || isMerging}
                    className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      pdfFiles.length < 2 || isMerging ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                    }`}
                  >
                    {isMerging ? <><Loader2 className="animate-spin" size={20} />합치는 중...</> : <><Download size={20} />PDF 합치기 및 다운로드</>}
                  </button>
                  {pdfFiles.length > 0 && !isMerging && (
                    <button onClick={resetPdf} className="px-6 py-4 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">초기화</button>
                  )}
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-4xl mx-auto px-6 py-12 text-center text-gray-400 text-xs">
        <p>© 2026 Audio Transcriber & Document Tools. Powered by Google Gemini & pdf-lib.</p>
      </footer>
    </div>
  );
}

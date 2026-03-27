/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
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
  Landmark,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PDFDocument } from 'pdf-lib';

type Tab = 'audio' | 'compress' | 'pdf';

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
  const [files, setFiles] = useState<File[]>([]);
  const [transcription, setTranscription] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [selectedField, setSelectedField] = useState('science');
  const [targetLanguage, setTargetLanguage] = useState('ko');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compression State
  const [isCompressing, setIsCompressing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState<number>(-1);

  // PDF State
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isDraggingPdf, setIsDraggingPdf] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Compress Tab State
  const [compressFiles, setCompressFiles] = useState<File[]>([]);
  const [compressedResults, setCompressedResults] = useState<{original: File, compressed: File}[]>([]);
  const [isCompressingTab, setIsCompressingTab] = useState(false);
  const [compressProcessingIndex, setCompressProcessingIndex] = useState<number>(-1);
  const [compressError, setCompressError] = useState<string | null>(null);
  const [isDraggingCompress, setIsDraggingCompress] = useState(false);
  const compressInputRef = useRef<HTMLInputElement>(null);

  const processCompressFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i));
    if (validFiles.length > 0) {
      setCompressFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleCompressFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processCompressFiles(Array.from(e.target.files || []));
    if (compressInputRef.current) compressInputRef.current.value = '';
  };

  const handleCompressDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingCompress(false);
    if (isCompressingTab) return;
    processCompressFiles(Array.from(e.dataTransfer.files));
  };

  const removeCompressFile = (index: number) => {
    setCompressFiles(prev => prev.filter((_, i) => i !== index));
    setCompressedResults(prev => prev.filter((_, i) => i !== index));
  };

  const startCompressionOnly = async () => {
    if (compressFiles.length === 0) return;
    setIsCompressingTab(true);
    setCompressedResults([]);
    setCompressError(null);

    for (let i = 0; i < compressFiles.length; i++) {
      setCompressProcessingIndex(i);
      const currentFile = compressFiles[i];
      try {
        const compressed = await compressAudio(currentFile);
        setCompressedResults(prev => [...prev, { original: currentFile, compressed }]);
      } catch (err) {
        console.error(`Compression error for ${currentFile.name}:`, err);
        setCompressError(prev => (prev ? prev + '\n' : '') + `${currentFile.name} 압축 중 오류가 발생했습니다.`);
      }
    }
    setCompressProcessingIndex(-1);
    setIsCompressingTab(false);
  };

  const downloadCompressedFile = (file: File) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetCompress = () => {
    setCompressFiles([]);
    setCompressedResults([]);
    setCompressProcessingIndex(-1);
    setCompressError(null);
  };

  // Audio Handlers
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);

  const processAudioFiles = (selectedFiles: File[]) => {
    const validFiles = selectedFiles.filter(f => f.type.startsWith('audio/') || f.name.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i));
    if (validFiles.length > 0) {
      setFiles(prev => [...prev, ...validFiles]);
      setAudioError(null);
    } else if (selectedFiles.length > 0) {
      setAudioError('오디오 파일만 지원합니다.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processAudioFiles(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAudioDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingAudio(false);
    if (isTranscribing) return;
    processAudioFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const compressAudio = async (inputFile: File): Promise<File> => {
    setIsCompressing(true);
    try {
      const formData = new FormData();
      formData.append('audio', inputFile);

      const response = await fetch('/api/compress', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorMessage = '오디오 압축 중 오류가 발생했습니다.';
        if (contentType && contentType.includes("application/json")) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (e) {}
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const newFile = new File([blob], inputFile.name.replace(/\.[^/.]+$/, "") + '_compressed.mp3', { type: 'audio/mpeg' });
      
      return newFile;
    } catch (error: any) {
      console.error('Compression error:', error);
      throw new Error(error.message || '오디오 압축 중 오류가 발생했습니다.');
    } finally {
      setIsCompressing(false);
    }
  };

  const transcribeAudio = async () => {
    if (files.length === 0) return;
    setIsTranscribing(true);
    setAudioError(null);
    setTranscription('');

    const fieldInfo = FIELDS.find(f => f.id === selectedField);
    const langInfo = LANGUAGES.find(l => l.id === targetLanguage);

    let fullTranscription = '';
    
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

    for (let i = 0; i < files.length; i++) {
      setProcessingIndex(i);
      setJobStatus('오디오 압축 중...');
      const currentFile = files[i];
      
      try {
        const formData = new FormData();
        formData.append('audio', currentFile);
        formData.append('field', fieldInfo?.name || '일반');
        formData.append('language', langInfo?.name || '한국어');
        formData.append('apiKey', apiKey);

        const startRes = await fetch('/api/transcribe/start', {
          method: 'POST',
          body: formData,
        });

        if (!startRes.ok) {
          throw new Error('변환 작업 시작에 실패했습니다.');
        }

        const { jobId } = await startRes.json();

        let isCompleted = false;
        while (!isCompleted) {
          await new Promise(r => setTimeout(r, 3000));
          const statusRes = await fetch(`/api/transcribe/status/${jobId}`);
          
          if (!statusRes.ok) {
            throw new Error('상태 확인에 실패했습니다.');
          }
          
          const job = await statusRes.json();

          if (job.status === 'compressing') setJobStatus('오디오 압축 중...');
          else if (job.status === 'uploading') setJobStatus('AI 서버로 업로드 중...');
          else if (job.status === 'processing') setJobStatus('AI 서버에서 파일 처리 중...');
          else if (job.status === 'transcribing') setJobStatus('텍스트 추출 중...');

          if (job.status === 'failed') {
            throw new Error(job.error || '변환 중 오류 발생');
          } else if (job.status === 'completed') {
            const text = job.transcription;
            if (text) {
              const fileResult = `--- ${currentFile.name} ---\n${text}\n\n`;
              fullTranscription += fileResult;
              setTranscription(fullTranscription);
              downloadTxt(text, currentFile.name);
            }
            isCompleted = true;
          }
        }
      } catch (err: any) {
        console.error(`Transcription error for ${currentFile.name}:`, err);
        setAudioError(prev => (prev ? prev + '\n' : '') + `${currentFile.name} 변환 중 오류: ${err.message || '알 수 없는 오류'}`);
      }
    }

    setProcessingIndex(-1);
    setJobStatus('');
    setIsTranscribing(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadTxt = (textToDownload?: string | React.MouseEvent, originalFilename?: string) => {
    const content = typeof textToDownload === 'string' ? textToDownload : transcription;
    if (!content) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalFilename ? `${originalFilename.replace(/\.[^/.]+$/, "")}_transcription.txt` : 'all_transcriptions.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetAudio = () => {
    setFiles([]);
    setTranscription('');
    setAudioError(null);
    setProcessingIndex(-1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // PDF Handlers
  const processPdfFiles = (selectedFiles: File[]) => {
    const validPdfs = selectedFiles.filter(f => f.type === 'application/pdf');
    if (validPdfs.length !== selectedFiles.length) {
      setPdfError('PDF 파일만 선택 가능합니다.');
    } else {
      setPdfError(null);
    }
    setPdfFiles(prev => [...prev, ...validPdfs]);
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processPdfFiles(Array.from(e.target.files || []));
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const handlePdfDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPdf(false);
    if (isMerging) return;
    processPdfFiles(Array.from(e.dataTransfer.files));
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
            onClick={() => setActiveTab('compress')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'compress' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings size={16} />
            오디오 압축
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
                    isDraggingAudio ? 'border-emerald-500 bg-emerald-50' : files.length > 0 ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !isTranscribing && fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingAudio(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingAudio(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingAudio(false); }}
                  onDrop={handleAudioDrop}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="audio/*"
                    multiple
                    className="hidden"
                  />
                  <div className="text-center pointer-events-none">
                    <Upload className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="font-medium mb-1">오디오 파일을 드래그하거나 클릭하여 업로드하세요</p>
                    <p className="text-xs text-gray-400">여러 파일을 한 번에 선택할 수 있습니다 (자동으로 순차 변환 및 다운로드)</p>
                  </div>
                </div>

                {files.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">업로드된 파일 ({files.length})</h3>
                    </div>
                    <div className="space-y-2">
                      {files.map((f, i) => (
                        <motion.div 
                          layout
                          key={`${f.name}-${i}`}
                          className={`flex items-center justify-between p-4 rounded-xl border ${
                            processingIndex === i 
                              ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500' 
                              : 'bg-gray-50 border-black/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            {processingIndex === i ? (
                              <Loader2 className="text-emerald-500 shrink-0 animate-spin" size={20} />
                            ) : (
                              <FileAudio className="text-emerald-500 shrink-0" size={20} />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-medium truncate">{f.name}</span>
                              {processingIndex === i && (
                                <span className="text-xs text-emerald-600">서버에서 처리 중... (압축 및 AI 전사)</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 shrink-0">{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeFile(i); }} 
                              disabled={isTranscribing}
                              className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-30"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {audioError && <p className="text-red-500 text-sm mt-4 text-center">{audioError}</p>}
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={transcribeAudio}
                    disabled={files.length === 0 || isTranscribing}
                    className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      files.length === 0 || isTranscribing ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                    }`}
                  >
                    {isTranscribing ? <><Loader2 className="animate-spin" size={20} />텍스트 추출 중...</> : <><RefreshCw size={20} />텍스트로 변환하기</>}
                  </button>
                  {files.length > 0 && !isTranscribing && (
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
          ) : activeTab === 'compress' ? (
            <motion.div
              key="compress"
              initial={{ opacity: 0, x: activeTab === 'audio' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === 'audio' ? -20 : 20 }}
              className="grid grid-cols-1 gap-8"
            >
              <section className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
                <div 
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    isDraggingCompress ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !isCompressingTab && compressInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingCompress(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingCompress(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingCompress(false); }}
                  onDrop={handleCompressDrop}
                >
                  <input 
                    type="file" 
                    ref={compressInputRef}
                    onChange={handleCompressFileChange}
                    accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
                    multiple
                    className="hidden"
                  />
                  <div className="text-center pointer-events-none">
                    <FileAudio className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="font-medium mb-1">압축할 오디오 파일 추가</p>
                    <p className="text-xs text-gray-400">여러 파일을 한 번에 선택할 수 있습니다</p>
                  </div>
                </div>

                {compressError && <p className="text-red-500 text-sm mt-4 text-center whitespace-pre-wrap">{compressError}</p>}

                {compressFiles.length > 0 && (
                  <div className="mt-8 space-y-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">파일 목록 ({compressFiles.length})</h3>
                    <div className="space-y-2">
                      {compressFiles.map((f, i) => {
                        const isCurrentlyProcessing = compressProcessingIndex === i;
                        const isCompleted = compressedResults.some(r => r.original === f);
                        const result = compressedResults.find(r => r.original === f);
                        
                        return (
                          <motion.div 
                            layout
                            key={`${f.name}-${i}`}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-black/5"
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              {isCurrentlyProcessing ? (
                                <Loader2 className="text-emerald-500 animate-spin shrink-0" size={20} />
                              ) : isCompleted ? (
                                <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                              ) : (
                                <FileAudio className="text-gray-400 shrink-0" size={20} />
                              )}
                              <span className="text-sm font-medium truncate">{f.name}</span>
                              <span className="text-xs text-gray-400 shrink-0">{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {isCurrentlyProcessing && (
                                <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                                  서버에서 압축 중...
                                </span>
                              )}
                              {isCompleted && result && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">
                                    {(result.compressed.size / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                  <button 
                                    onClick={() => downloadCompressedFile(result.compressed)}
                                    className="p-1.5 text-gray-400 hover:text-emerald-600"
                                    title="다운로드"
                                  >
                                    <Download size={16} />
                                  </button>
                                </div>
                              )}
                              {!isCurrentlyProcessing && !isCompleted && (
                                <button onClick={() => removeCompressFile(i)} className="p-1.5 text-gray-400 hover:text-red-500">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-8 flex gap-3">
                  <button
                    onClick={startCompressionOnly}
                    disabled={compressFiles.length === 0 || isCompressingTab}
                    className={`flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      compressFiles.length === 0 || isCompressingTab ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-200'
                    }`}
                  >
                    {isCompressingTab ? <><Loader2 className="animate-spin" size={20} />압축 진행 중...</> : <><Settings size={20} />오디오 압축 시작</>}
                  </button>
                  {compressFiles.length > 0 && !isCompressingTab && (
                    <button onClick={resetCompress} className="px-6 py-4 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">초기화</button>
                  )}
                </div>
              </section>
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
                  className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                    isDraggingPdf ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                  }`}
                  onClick={() => !isMerging && pdfInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingPdf(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingPdf(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingPdf(false); }}
                  onDrop={handlePdfDrop}
                >
                  <input 
                    type="file" 
                    ref={pdfInputRef}
                    onChange={handlePdfChange}
                    accept=".pdf"
                    multiple
                    className="hidden"
                  />
                  <div className="text-center pointer-events-none">
                    <Plus className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="font-medium mb-1">PDF 파일들을 추가하세요</p>
                    <p className="text-xs text-gray-400">여러 파일을 한 번에 선택할 수 있습니다</p>
                  </div>
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

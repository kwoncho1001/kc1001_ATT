import React, { useState, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileUp, FileSearch, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const OcrTool: React.FC = () => {
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const handleOcr = async () => {
    if (!ocrFile) return;
    setIsProcessing(true);
    setError(null);
    setOcrResult('');

    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
        });
        reader.readAsDataURL(ocrFile);
        const base64Data = await base64Promise;

        const result = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: ocrFile.type,
                    data: base64Data,
                  },
                },
                {
                  text: "이 이미지 또는 PDF 파일에서 모든 텍스트를 추출해줘. 표가 있다면 표 형식으로, 텍스트는 가독성 좋게 정리해서 보여줘. 한국어와 영어가 섞여 있다면 둘 다 정확하게 추출해줘.",
                },
              ],
            },
          ],
        });

        setOcrResult(result.text || '추출된 텍스트가 없습니다.');
        setIsProcessing(false);
        return; // Success, exit the loop
      } catch (err: any) {
        const isAbortError = err?.message?.includes('signal is aborted') || err?.message?.includes('aborted');
        
        if (isAbortError && attempt < maxRetries) {
          console.warn(`OCR attempt ${attempt + 1} failed with abort error, retrying...`, err);
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        console.error('OCR error:', err);
        if (isAbortError) {
          setError("네트워크 연결이 불안정하여 요청이 중단되었습니다. 잠시 후 다시 시도해주세요.");
        } else {
          setError(err.message || 'OCR 처리 중 오류가 발생했습니다.');
        }
        setIsProcessing(false);
        break; // Non-retryable error or max retries reached
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(ocrResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">텍스트 추출 (OCR)</h2>
        <p className="text-slate-500">이미지나 PDF 문서에서 텍스트를 정확하게 추출합니다.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {!ocrFile ? (
          <div 
            onClick={() => ocrInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
          >
            <input 
              type="file" 
              ref={ocrInputRef} 
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && (f.type.startsWith('image/') || f.type === 'application/pdf')) {
                  setOcrFile(f);
                  setError(null);
                } else if (f) {
                  setError('이미지 또는 PDF 파일만 선택 가능합니다.');
                }
              }} 
              accept="image/*,application/pdf" 
              className="hidden" 
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                <FileUp size={24} />
              </div>
              <div className="text-sm font-medium text-slate-600">파일을 선택하세요. (이미지, PDF)</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <FileSearch size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{ocrFile.name}</div>
                  <div className="text-xs text-slate-400">{(ocrFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              </div>
              <button 
                onClick={() => { setOcrFile(null); setOcrResult(''); }}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                파일 변경
              </button>
            </div>

            <button
              onClick={handleOcr}
              disabled={isProcessing}
              className={`
                w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                ${!isProcessing 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
              `}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <FileSearch size={20} />}
              <span>{isProcessing ? '텍스트 추출 중...' : '텍스트 추출하기'}</span>
            </button>

            {ocrResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">추출 결과</span>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? '복사됨' : '복사하기'}</span>
                  </button>
                </div>
                <div className="p-6 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto font-mono">
                  {ocrResult}
                </div>
              </motion.div>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
};

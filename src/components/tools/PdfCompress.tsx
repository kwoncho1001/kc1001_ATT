import React, { useState, useRef } from 'react';
import { FileUp, Minimize2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PdfCompress: React.FC = () => {
  const [compressFile, setCompressFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState<'extreme' | 'recommended' | 'less'>('recommended');
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const compressInputRef = useRef<HTMLInputElement>(null);

  const handleCompressPdf = async () => {
    if (!compressFile) return;
    setIsCompressing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', compressFile);

      const response = await fetch('/api/pdf/compress', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = '압축 중 오류가 발생했습니다.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          if (response.status === 413) {
            errorMessage = '파일 크기가 너무 큽니다. (최대 100MB)';
          } else {
            errorMessage = `서버 오류 (${response.status}): ${response.statusText || '알 수 없는 오류'}`;
          }
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compressed_${compressFile.name}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('압축이 완료되었습니다. (서버 측 최적화가 적용되었습니다)');
    } catch (err: any) {
      console.error('PDF Compress error:', err);
      setError(err.message || 'PDF 압축 중 오류가 발생했습니다.');
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">PDF 압축</h2>
        <p className="text-slate-500">파일 크기를 줄여서 공유와 보관을 용이하게 합니다.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {!compressFile ? (
          <div 
            onClick={() => compressInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
          >
            <input 
              type="file" 
              ref={compressInputRef} 
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && f.type === 'application/pdf') {
                  setCompressFile(f);
                  setError(null);
                } else if (f) {
                  setError('PDF 파일만 선택 가능합니다.');
                }
              }} 
              accept="application/pdf" 
              className="hidden" 
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                <FileUp size={24} />
              </div>
              <div className="text-sm font-medium text-slate-600">압축할 PDF 파일을 선택하세요.</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Minimize2 size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{compressFile.name}</div>
                  <div className="text-xs text-slate-400">{(compressFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              </div>
              <button 
                onClick={() => setCompressFile(null)}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                파일 변경
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(['extreme', 'recommended', 'less'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setCompressionLevel(level)}
                  className={`
                    p-4 rounded-xl border-2 text-center transition-all
                    ${compressionLevel === level 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'}
                  `}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-1">{level}</div>
                  <div className="text-[10px] opacity-70">
                    {level === 'extreme' ? '최대 압축' : level === 'recommended' ? '권장 설정' : '최소 압축'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleCompressPdf}
          disabled={!compressFile || isCompressing}
          className={`
            w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
            ${compressFile && !isCompressing 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
          `}
        >
          {isCompressing ? <Loader2 className="animate-spin" size={20} /> : <Minimize2 size={20} />}
          <span>{isCompressing ? '압축 중...' : 'PDF 압축하기'}</span>
        </button>
      </div>
    </div>
  );
};

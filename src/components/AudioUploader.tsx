import React, { useRef, useState } from 'react';
import { Upload, FileAudio, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface AudioUploaderProps {
  onFileSelect: (file: File, compress: boolean) => void;
  isProcessing: boolean;
  progress: number;
  error: string | null;
}

export const AudioUploader: React.FC<AudioUploaderProps> = ({ 
  onFileSelect, 
  isProcessing, 
  progress,
  error 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [shouldCompress, setShouldCompress] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file, shouldCompress);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file, shouldCompress);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all
          ${isDragging ? 'border-emerald-500 bg-emerald-50/50' : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50'}
          ${isProcessing ? 'pointer-events-none opacity-70' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          <div className={`
            w-16 h-16 rounded-full flex items-center justify-center transition-colors
            ${isProcessing ? 'bg-emerald-100 text-emerald-600 animate-pulse' : 'bg-gray-100 text-gray-400'}
          `}>
            {isProcessing ? <Loader2 className="animate-spin" size={32} /> : <FileAudio size={32} />}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isProcessing ? '오디오 분석 중...' : '오디오 파일 업로드'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isProcessing ? 'Gemini AI가 대화 내용을 텍스트로 변환하고 있습니다.' : 'MP3, WAV, M4A 파일을 드래그하거나 클릭하여 선택하세요.'}
            </p>
          </div>

          {isProcessing && (
            <div className="w-full max-w-xs mt-4">
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2 font-mono">{progress}% 완료</p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer group">
          <div 
            onClick={() => setShouldCompress(!shouldCompress)}
            className={`
              w-5 h-5 rounded border flex items-center justify-center transition-all
              ${shouldCompress ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white group-hover:border-emerald-400'}
            `}
          >
            {shouldCompress && <CheckCircle2 size={14} />}
          </div>
          <span className="text-sm font-medium text-slate-600">업로드 전 오디오 압축 (권장)</span>
        </label>
        
        <div className="group relative">
          <AlertCircle size={14} className="text-slate-300 cursor-help" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-800 text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50">
            오디오 비트레이트를 64kbps 모노로 변환하여 용량을 줄입니다. 대용량 파일의 처리 속도가 비약적으로 향상됩니다.
          </div>
        </div>
      </div>
    </div>
  );
};

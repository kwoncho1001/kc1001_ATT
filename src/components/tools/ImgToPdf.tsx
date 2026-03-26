import React, { useState, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { FileUp, FileImage, Trash2, ArrowUp, ArrowDown, Loader2, AlertCircle, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ImgToPdf: React.FC = () => {
  const [imgFiles, setImgFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    const validImgs = selectedFiles.filter(f => f.type.startsWith('image/'));
    if (validImgs.length !== selectedFiles.length) {
      setError('이미지 파일만 선택 가능합니다.');
    } else {
      setError(null);
    }
    setImgFiles(prev => [...prev, ...validImgs]);
    if (imgInputRef.current) imgInputRef.current.value = '';
  };

  const removeImg = (index: number) => {
    setImgFiles(prev => prev.filter((_, i) => i !== index));
  };

  const moveImg = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...imgFiles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newFiles.length) {
      [newFiles[index], newFiles[targetIndex]] = [newFiles[targetIndex], newFiles[index]];
      setImgFiles(newFiles);
    }
  };

  const handleImgToPdf = async () => {
    if (imgFiles.length === 0) return;
    setIsConverting(true);
    setError(null);

    try {
      const doc = new jsPDF();
      for (let i = 0; i < imgFiles.length; i++) {
        const file = imgFiles[i];
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        if (i > 0) doc.addPage();
        
        const imgType = file.type.split('/')[1].toUpperCase();
        // Simple sizing, could be improved
        doc.addImage(base64, imgType, 10, 10, 190, 277);
      }
      doc.save('images_to_pdf.pdf');
    } catch (err) {
      console.error('Image to PDF error:', err);
      setError('PDF 변환 중 오류가 발생했습니다.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">이미지 PDF 변환</h2>
        <p className="text-slate-500">여러 장의 이미지를 하나의 PDF 문서로 만듭니다.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div 
          onClick={() => imgInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
        >
          <input 
            type="file" 
            ref={imgInputRef} 
            onChange={handleImgChange} 
            multiple 
            accept="image/*" 
            className="hidden" 
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
              <FileImage size={24} />
            </div>
            <div className="text-sm font-medium text-slate-600">이미지 파일들을 선택하거나 드래그하세요.</div>
          </div>
        </div>

        {imgFiles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">선택된 이미지 ({imgFiles.length})</span>
              <button 
                onClick={() => setImgFiles([])}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                전체 삭제
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {imgFiles.map((file, index) => (
                <div key={index} className="p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-slate-400 w-4">{index + 1}</div>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => moveImg(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button onClick={() => moveImg(index, 'down')} disabled={index === imgFiles.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={16} /></button>
                    <button onClick={() => removeImg(index)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
                  </div>
                </div>
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
          onClick={handleImgToPdf}
          disabled={imgFiles.length === 0 || isConverting}
          className={`
            w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
            ${imgFiles.length > 0 && !isConverting 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
          `}
        >
          {isConverting ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
          <span>{isConverting ? '변환 중...' : 'PDF로 변환하기'}</span>
        </button>
      </div>
    </div>
  );
};

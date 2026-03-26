import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUp, Trash2, ArrowUp, ArrowDown, Layers, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PdfMerge: React.FC = () => {
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []) as File[];
    const validPdfs = selectedFiles.filter(f => f.type === 'application/pdf');
    if (validPdfs.length !== selectedFiles.length) {
      setError('PDF 파일만 선택 가능합니다.');
    } else {
      setError(null);
    }
    setPdfFiles(prev => [...prev, ...validPdfs]);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      setError('최소 2개 이상의 PDF 파일이 필요합니다.');
      return;
    }
    setIsMerging(true);
    setError(null);
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
      setError('PDF 합치기 중 오류가 발생했습니다.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">PDF 합치기</h2>
        <p className="text-slate-500">여러 개의 PDF 파일을 하나의 파일로 결합합니다.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handlePdfChange} 
            multiple 
            accept="application/pdf" 
            className="hidden" 
          />
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
              <FileUp size={24} />
            </div>
            <div className="text-sm font-medium text-slate-600">PDF 파일들을 선택하거나 드래그하세요.</div>
          </div>
        </div>

        {pdfFiles.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">선택된 파일 ({pdfFiles.length})</span>
              <button 
                onClick={() => setPdfFiles([])}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                전체 삭제
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {pdfFiles.map((file, index) => (
                <div key={index} className="p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="text-xs font-bold text-slate-400 w-4">{index + 1}</div>
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{file.name}</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => movePdf(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button onClick={() => movePdf(index, 'down')} disabled={index === pdfFiles.length - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ArrowDown size={16} /></button>
                    <button onClick={() => removePdf(index)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
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
          onClick={mergePdfs}
          disabled={pdfFiles.length < 2 || isMerging}
          className={`
            w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
            ${pdfFiles.length >= 2 && !isMerging 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
          `}
        >
          {isMerging ? <Loader2 className="animate-spin" size={20} /> : <Layers size={20} />}
          <span>{isMerging ? '결합 중...' : 'PDF 합치기'}</span>
        </button>
      </div>
    </div>
  );
};

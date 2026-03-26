import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { FileUp, Scissors, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PdfSplit: React.FC = () => {
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitRanges, setSplitRanges] = useState<{ from: string | number, to: string | number }[]>([{ from: 1, to: 1 }]);
  const [isSplitting, setIsSplitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const splitInputRef = useRef<HTMLInputElement>(null);

  const handleSplitFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setSplitFile(selectedFile);
      setError(null);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        const pages = pdfDoc.getPageCount();
        setTotalPages(pages);
        setSplitRanges([{ from: 1, to: pages }]);
      } catch (err) {
        setError('PDF 정보를 읽는 중 오류가 발생했습니다.');
      }
    } else if (selectedFile) {
      setError('PDF 파일만 선택 가능합니다.');
    }
  };

  const addSplitRange = () => {
    const lastRange = splitRanges[splitRanges.length - 1];
    const nextFrom = (Number(lastRange.to) || 0) + 1;
    if (nextFrom > totalPages) {
      setSplitRanges([...splitRanges, { from: totalPages, to: totalPages }]);
    } else {
      setSplitRanges([...splitRanges, { from: nextFrom, to: totalPages }]);
    }
  };

  const removeSplitRange = (index: number) => {
    setSplitRanges(prev => prev.filter((_, i) => i !== index));
  };

  const updateRange = (index: number, field: 'from' | 'to', value: string) => {
    const newRanges = [...splitRanges];
    newRanges[index] = { ...newRanges[index], [field]: value };
    setSplitRanges(newRanges);
  };

  const handleSplitPdf = async () => {
    if (!splitFile) return;
    setIsSplitting(true);
    setError(null);

    try {
      const arrayBuffer = await splitFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const totalPagesCount = pdfDoc.getPageCount();

      const newPdf = await PDFDocument.create();
      for (const range of splitRanges) {
        const fromVal = Number(range.from);
        const toVal = Number(range.to);
        
        if (isNaN(fromVal) || isNaN(toVal)) continue;

        const start = Math.max(1, Math.min(fromVal, totalPagesCount));
        const end = Math.max(start, Math.min(toVal, totalPagesCount));
        const pageIndices = Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i);
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach(page => newPdf.addPage(page));
      }
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'split_result.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('PDF Split error:', err);
      setError('PDF 분리 중 오류가 발생했습니다.');
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">PDF 분리</h2>
        <p className="text-slate-500">원하는 페이지 범위를 선택하여 새로운 PDF를 만듭니다.</p>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {!splitFile ? (
          <div 
            onClick={() => splitInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
          >
            <input 
              type="file" 
              ref={splitInputRef} 
              onChange={handleSplitFileChange} 
              accept="application/pdf" 
              className="hidden" 
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                <FileUp size={24} />
              </div>
              <div className="text-sm font-medium text-slate-600">분리할 PDF 파일을 선택하세요.</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Scissors size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{splitFile.name}</div>
                  <div className="text-xs text-slate-400">총 {totalPages} 페이지</div>
                </div>
              </div>
              <button 
                onClick={() => setSplitFile(null)}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                파일 변경
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">페이지 범위 설정</div>
              {splitRanges.map((range, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">From</span>
                      <input 
                        type="number" 
                        value={range.from} 
                        onChange={(e) => updateRange(index, 'from', e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">To</span>
                      <input 
                        type="number" 
                        value={range.to} 
                        onChange={(e) => updateRange(index, 'to', e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  {splitRanges.length > 1 && (
                    <button onClick={() => removeSplitRange(index)} className="p-2 text-red-400 hover:text-red-600"><Trash2 size={20} /></button>
                  )}
                </div>
              ))}
              <button 
                onClick={addSplitRange}
                className="w-full py-3 border-2 border-dashed border-slate-100 rounded-xl text-xs font-bold text-slate-400 hover:border-emerald-200 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                <span>범위 추가</span>
              </button>
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
          onClick={handleSplitPdf}
          disabled={!splitFile || isSplitting}
          className={`
            w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
            ${splitFile && !isSplitting 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
          `}
        >
          {isSplitting ? <Loader2 className="animate-spin" size={20} /> : <Scissors size={20} />}
          <span>{isSplitting ? '분리 중...' : 'PDF 분리하기'}</span>
        </button>
      </div>
    </div>
  );
};

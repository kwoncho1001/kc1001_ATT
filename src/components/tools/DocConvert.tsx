import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { FileUp, FileText, Loader2, AlertCircle, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DocConvert: React.FC = () => {
  const [convertFile, setConvertFile] = useState<File | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [convertedHtml, setConvertedHtml] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const convertInputRef = useRef<HTMLInputElement>(null);

  const parseHwpx = async (file: File): Promise<string> => {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const sectionFile = contents.file('Contents/section0.xml');
    if (!sectionFile) throw new Error('HWPX 파일 구조가 올바르지 않습니다.');
    const xmlText = await sectionFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    let html = '';
    const body = xmlDoc.getElementsByTagName('hp:body')[0];
    if (!body) return '<p>내용을 추출할 수 없습니다.</p>';
    const processNode = (node: Node): string => {
      let result = '';
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName;
        if (tagName === 'hp:p') {
          const tNodes = el.getElementsByTagName('hp:t');
          let pText = '';
          for (let i = 0; i < tNodes.length; i++) pText += tNodes[i].textContent || '';
          if (pText.trim()) result += `<p style="margin-bottom: 1em; line-height: 1.6;">${pText}</p>`;
          else result += '<br/>';
        } else if (tagName === 'hp:tbl') {
          result += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 1em; border: 1px solid #ddd;">';
          const rows = el.getElementsByTagName('hp:tr');
          for (let i = 0; i < rows.length; i++) {
            result += '<tr>';
            const cells = rows[i].getElementsByTagName('hp:tc');
            for (let j = 0; j < cells.length; j++) {
              result += '<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top;">';
              const cellParagraphs = cells[j].getElementsByTagName('hp:p');
              for (let k = 0; k < cellParagraphs.length; k++) result += processNode(cellParagraphs[k]);
              result += '</td>';
            }
            result += '</tr>';
          }
          result += '</table>';
        }
      }
      return result;
    };
    const section = body.getElementsByTagName('hp:section')[0];
    if (section) for (let i = 0; i < section.childNodes.length; i++) html += processNode(section.childNodes[i]);
    return html || '<p>내용을 추출할 수 없습니다.</p>';
  };

  const convertToHtml = async () => {
    if (!convertFile) return;
    setIsConverting(true);
    setError(null);
    setConvertedHtml('');

    try {
      const ext = convertFile.name.split('.').pop()?.toLowerCase();
      let html = '';
      if (ext === 'docx') {
        const arrayBuffer = await convertFile.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        html = result.value;
      } else if (ext === 'hwpx') {
        html = await parseHwpx(convertFile);
      } else if (ext === 'hwp') {
        throw new Error('HWP(Binary)는 현재 HWPX로 변환 후 업로드해주시기 바랍니다.');
      }
      setConvertedHtml(html);
    } catch (err: any) {
      console.error('Conversion error:', err);
      setError(err.message || '문서 변환 중 오류가 발생했습니다.');
    } finally {
      setIsConverting(false);
    }
  };

  const copyToClipboard = () => {
    const text = new DOMParser().parseFromString(convertedHtml, 'text/html').body.innerText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">문서 변환 (HWPX/DOCX)</h2>
        <p className="text-slate-500">한글(HWPX)이나 Word(DOCX) 문서를 웹에서 볼 수 있게 변환합니다.</p>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {!convertFile ? (
          <div 
            onClick={() => convertInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/30 transition-all"
          >
            <input 
              type="file" 
              ref={convertInputRef} 
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const ext = f.name.split('.').pop()?.toLowerCase();
                  if (['hwp', 'hwpx', 'docx'].includes(ext || '')) {
                    setConvertFile(f);
                    setError(null);
                  } else {
                    setError('지원되지 않는 파일 형식입니다. (.hwp, .hwpx, .docx 지원)');
                  }
                }
              }} 
              accept=".hwp,.hwpx,.docx" 
              className="hidden" 
            />
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
                <FileUp size={24} />
              </div>
              <div className="text-sm font-medium text-slate-600">문서 파일을 선택하세요. (.hwpx, .docx)</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{convertFile.name}</div>
                  <div className="text-xs text-slate-400">{(convertFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                </div>
              </div>
              <button 
                onClick={() => { setConvertFile(null); setConvertedHtml(''); }}
                className="text-xs text-red-500 font-bold hover:underline"
              >
                파일 변경
              </button>
            </div>

            <button
              onClick={convertToHtml}
              disabled={isConverting}
              className={`
                w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                ${!isConverting 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-600' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
              `}
            >
              {isConverting ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
              <span>{isConverting ? '변환 중...' : '문서 변환하기'}</span>
            </button>

            {convertedHtml && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">변환 결과 (HTML)</span>
                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? '텍스트 복사' : '텍스트 복사'}</span>
                  </button>
                </div>
                <div 
                  className="p-8 text-sm text-slate-700 leading-relaxed max-h-[600px] overflow-y-auto prose prose-slate max-w-none"
                  dangerouslySetInnerHTML={{ __html: convertedHtml }}
                />
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

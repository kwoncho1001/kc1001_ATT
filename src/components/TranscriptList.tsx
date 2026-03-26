import React, { useState } from 'react';
import { TranscriptSegment } from '../lib/gemini';
import { User, Clock, MessageSquare, Copy, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface TranscriptListProps {
  segments: TranscriptSegment[];
}

export const TranscriptList: React.FC<TranscriptListProps> = ({ segments }) => {
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    const text = segments.map(s => `[${s.timestamp}] ${s.speaker}: ${s.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-400">
          <MessageSquare size={18} />
          <h2 className="text-sm font-semibold uppercase tracking-wider">전체 대화 내용</h2>
        </div>
        
        {segments.length > 0 && (
          <button 
            onClick={copyAll}
            className="flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span>{copied ? '복사됨' : '전체 복사'}</span>
          </button>
        )}
      </div>

      {segments.length === 0 ? (
        <div className="text-center py-12 text-gray-400 italic">
          변환된 대화 내용이 없습니다. 오디오 파일을 업로드해주세요.
        </div>
      ) : (
        <div className="space-y-4">
          {segments.map((segment, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group flex gap-4 p-4 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <User size={20} />
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-bold text-sm text-gray-900">{segment.speaker}</span>
                  <div className="flex items-center gap-1 text-xs text-gray-400 font-mono">
                    <Clock size={12} />
                    <span>{segment.timestamp}</span>
                  </div>
                </div>
                <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                  {segment.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

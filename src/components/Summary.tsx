import React from 'react';
import { Tag, FileText, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface SummaryProps {
  summary: string;
  keywords: string[];
}

export const Summary: React.FC<SummaryProps> = ({ summary, keywords }) => {
  if (!summary && keywords.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center gap-2 text-emerald-600">
        <Sparkles size={20} />
        <h2 className="text-sm font-bold uppercase tracking-wider">AI 요약 및 키워드</h2>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 mt-1">
            <FileText size={18} className="text-gray-400" />
          </div>
          <p className="text-gray-700 leading-relaxed text-sm md:text-base">
            {summary}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
          <div className="flex items-center gap-2 text-gray-400 mr-2">
            <Tag size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">키워드</span>
          </div>
          {keywords.map((keyword, index) => (
            <motion.span
              key={index}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100"
            >
              #{keyword}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
};

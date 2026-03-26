import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface TranscriptSegment {
  speaker: string;
  timestamp: string;
  text: string;
}

export interface TranscriptionResult {
  segments: TranscriptSegment[];
  summary: string;
  keywords: string[];
}

export const transcribeAudio = async (
  base64Data: string,
  mimeType: string,
  onProgress?: (progress: number) => void
): Promise<TranscriptionResult> => {
  const model = "gemini-2.5-flash-native-audio-preview-12-2025";
  
  // Simulation of chunking progress
  onProgress?.(10);
  
  const prompt = `
    이 오디오 파일을 분석하여 다음 형식의 JSON으로 응답해주세요:
    {
      "segments": [
        { "speaker": "화자 1", "timestamp": "00:00", "text": "..." },
        ...
      ],
      "summary": "전체 내용 요약 (3-4문장)",
      "keywords": ["핵심키워드1", "핵심키워드2", ...]
    }
    
    분석 가이드라인:
    1. 화자 분리(Diarization): 목소리 톤과 억양을 구분하여 '화자 1', '화자 2' 등으로 명확히 구분해주세요.
    2. 타임스탬프: 각 화자가 말을 시작하는 시점을 [분:초] 형식으로 정확하게 기록해주세요.
    3. 텍스트 전사: 구어체 특징(추임새 등)은 가독성을 위해 적절히 정제하되, 핵심 내용은 빠짐없이 기록해주세요.
    4. 전문 용어: 대화 문맥을 파악하여 전문 용어나 고유 명사를 정확하게 표기해주세요.
    5. 응답 형식: 오직 JSON 데이터만 반환해주세요. (Markdown 코드 블록 없이)
  `;

  const maxRetries = 4;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      if (attempt === 0) onProgress?.(30);
      else onProgress?.(Math.min(85, 30 + (attempt * 12)));

      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType, data: base64Data } },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      onProgress?.(90);
      const result = JSON.parse(response.text || '{}');
      onProgress?.(100);
      
      return {
        segments: result.segments || [],
        summary: result.summary || '',
        keywords: result.keywords || []
      };
    } catch (error: any) {
      const isAbortError = error?.message?.includes('signal is aborted') || error?.message?.includes('aborted');
      
      if (isAbortError && attempt < maxRetries) {
        console.warn(`Transcription attempt ${attempt + 1} failed with abort error, retrying...`, error);
        attempt++;
        await new Promise(resolve => setTimeout(resolve, 3000 * attempt)); // Increased delay
        continue;
      }

      console.error("Transcription error:", error);
      if (isAbortError) {
        throw new Error("네트워크 연결이 불안정하여 요청이 중단되었습니다. 잠시 후 다시 시도해주세요.");
      }
      throw error;
    }
  }
  throw new Error("요청 처리에 실패했습니다.");
};

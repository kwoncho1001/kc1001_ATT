import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface WaveformProps {
  url: string;
  onReady?: () => void;
}

export const Waveform: React.FC<WaveformProps> = ({ url, onReady }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#d1d5db',
      progressColor: '#10b981',
      cursorColor: '#10b981',
      barWidth: 2,
      barGap: 3,
      height: 80,
      normalize: true,
    });

    wavesurfer.current.load(url);

    wavesurfer.current.on('ready', () => {
      setDuration(wavesurfer.current?.getDuration() || 0);
      onReady?.();
    });

    wavesurfer.current.on('audioprocess', () => {
      setCurrentTime(wavesurfer.current?.getCurrentTime() || 0);
    });

    wavesurfer.current.on('play', () => setIsPlaying(true));
    wavesurfer.current.on('pause', () => setIsPlaying(false));

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [url]);

  const togglePlay = () => {
    wavesurfer.current?.playPause();
  };

  const toggleMute = () => {
    wavesurfer.current?.setMuted(!isMuted);
    setIsMuted(!isMuted);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
      <div ref={containerRef} className="mb-4" />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
          </button>
          
          <div className="text-sm font-mono text-gray-500">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>

        <button
          onClick={toggleMute}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>
    </div>
  );
};

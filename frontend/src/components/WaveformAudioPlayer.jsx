import React, { useEffect, useMemo, useRef, useState } from 'react';

const BAR_COUNT = 120;

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function WaveformAudioPlayer({ src, height = 72, autoPlayOnSrcChange = false }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const audioCtxRef = useRef(null);
  const pendingAutoPlayRef = useRef(false);
  const blobUrlRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveform, setWaveform] = useState([]);
  const [localSrc, setLocalSrc] = useState('');

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.max(0, Math.min(1, currentTime / duration));
  }, [currentTime, duration]);

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, width, height);

    const bars = waveform.length ? waveform : new Array(BAR_COUNT).fill(0.08);
    const barWidth = width / bars.length;
    const playedWidth = width * progress;

    // Draw full waveform in muted color first.
    for (let i = 0; i < bars.length; i += 1) {
      const amp = Math.max(0.04, bars[i]);
      const x = i * barWidth + barWidth * 0.15;
      const w = Math.max(1, barWidth * 0.7);
      const h = amp * (height - 10);
      const y = (height - h) / 2;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.fillRect(x, y, w, h);
    }

    // Overlay the "played" section in white for smooth left-to-right fill.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, playedWidth, height);
    ctx.clip();
    ctx.shadowColor = 'rgba(255,255,255,0.35)';
    ctx.shadowBlur = 6;
    for (let i = 0; i < bars.length; i += 1) {
      const amp = Math.max(0.04, bars[i]);
      const x = i * barWidth + barWidth * 0.15;
      const w = Math.max(1, barWidth * 0.7);
      const h = amp * (height - 10);
      const y = (height - h) / 2;
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();

    // Subtle current-position marker.
    const playheadX = Math.max(0, Math.min(width, playedWidth));
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  };

  const stopRaf = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
  };

  const tick = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime || 0);
    drawWaveform();
    if (!audio.paused && !audio.ended) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  const startRaf = () => {
    stopRaf();
    rafRef.current = requestAnimationFrame(tick);
  };

  const playFromStart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    setIsPlaying(true);
    startRaf();
  };

  const pauseAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
    stopRaf();
  };

  const handleWaveformClick = (event) => {
    const canvas = canvasRef.current;
    const audio = audioRef.current;
    if (!canvas || !audio || !duration) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
    drawWaveform();
  };

  useEffect(() => {
    drawWaveform();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waveform, progress, height]);

  useEffect(() => {
    setWaveform([]);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setLocalSrc('');
    stopRaf();
    pendingAutoPlayRef.current = Boolean(autoPlayOnSrcChange);

    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (!src) return undefined;

    let cancelled = false;
    const loadAudio = async () => {
      try {
        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        if (cancelled) return;

        const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
        const objectUrl = URL.createObjectURL(blob);
        blobUrlRef.current = objectUrl;
        setLocalSrc(objectUrl);

        const AudioContextCls = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCls) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextCls();
        }
        const decoded = await audioCtxRef.current.decodeAudioData(arrayBuffer.slice(0));
        if (cancelled) return;
        const channel = decoded.getChannelData(0);
        const blockSize = Math.floor(channel.length / BAR_COUNT) || 1;
        const bars = new Array(BAR_COUNT).fill(0).map((_, i) => {
          const start = i * blockSize;
          const end = Math.min(channel.length, start + blockSize);
          let sum = 0;
          for (let j = start; j < end; j += 1) {
            sum += Math.abs(channel[j]);
          }
          return (sum / Math.max(1, end - start)) * 1.6;
        });
        setWaveform(bars);
      } catch (_err) {
        // Keep fallback placeholder waveform if decode fails.
      }
    };

    loadAudio();
    return () => {
      cancelled = true;
    };
  }, [src]);

  useEffect(() => () => {
    stopRaf();
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  if (!src) {
    return (
      <div style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
        No audio
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px', background: 'var(--secondary-bg)' }}>
      <audio
        ref={audioRef}
        src={localSrc}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          if (pendingAutoPlayRef.current) {
            pendingAutoPlayRef.current = false;
            playFromStart();
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          startRaf();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopRaf();
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          stopRaf();
          drawWaveform();
        }}
        style={{ display: 'none' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <button className="btn btn-primary" type="button" onClick={playFromStart}>
          {isPlaying ? 'Replay' : 'Play'}
        </button>
        <div className="text-secondary" style={{ fontSize: '12px', marginLeft: 'auto' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onClick={handleWaveformClick}
        style={{ width: '100%', height: `${height}px`, borderRadius: '6px', cursor: 'pointer', display: 'block' }}
      />
    </div>
  );
}

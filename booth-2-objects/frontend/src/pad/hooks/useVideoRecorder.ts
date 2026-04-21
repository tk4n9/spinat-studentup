import { useState, useRef, useCallback } from 'react';
import fixWebmDuration from 'fix-webm-duration';
import type { Format } from '../../types';

// Android Chrome / desktop support webm natively; iOS Safari only produces MP4.
// Order matters: isTypeSupported() is probed top-to-bottom, first match wins.
const MIME_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a.40.2',
];

function getSupportedMime(): string {
  return MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? 'video/webm';
}

export function useVideoRecorder() {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const initCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      });
      setPreviewStream(stream);
      setError(null);
    } catch {
      setError('카메라 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.');
    }
  }, []);

  const startRecording = useCallback(async (format: Format) => {
    if (!previewStream) return;

    // Mic stream — Samsung Galaxy Tab fix: disable noise processing
    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { noiseSuppression: false, echoCancellation: false, autoGainControl: false },
      });
    } catch {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    let recordingStream: MediaStream;

    if (format.music_file) {
      // ── Web Audio: mix mic + background music ───────────────────
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();

      // Mic → mix
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(dest);

      // Background music → mix + speakers
      const audioEl = new Audio(`/music/${format.music_file}`);
      audioEl.crossOrigin = 'anonymous';
      audioEl.currentTime = format.music_start_offset ?? 0;
      audioElRef.current = audioEl;
      const bgSource = audioCtx.createMediaElementSource(audioEl);
      bgSource.connect(dest);
      bgSource.connect(audioCtx.destination); // also play through speakers
      await audioEl.play();

      recordingStream = new MediaStream([
        ...previewStream.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ]);
    } else {
      // ── No music: camera video + mic audio ──────────────────────
      recordingStream = new MediaStream([
        ...previewStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);
    }

    const mimeType = getSupportedMime();
    chunksRef.current = [];

    const recorder = new MediaRecorder(recordingStream, {
      mimeType,
      videoBitsPerSecond: 800_000,
      audioBitsPerSecond: 128_000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      const duration = Date.now() - startTimeRef.current;
      const rawBlob = new Blob(chunksRef.current, { type: mimeType });
      // MP4 already stores duration in moov atom; fix-webm-duration corrupts it.
      const finalBlob = mimeType.startsWith('video/webm')
        ? await fixWebmDuration(rawBlob, duration)
        : rawBlob;
      setRecordedBlob(finalBlob);
      setRecordedMimeType(mimeType);
      setIsRecording(false);

      // Stop mic tracks
      micStream.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close();
      audioCtxRef.current = null;
    };

    startTimeRef.current = Date.now();
    recorder.start(100); // chunk every 100ms
    recorderRef.current = recorder;
    setIsRecording(true);
  }, [previewStream]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    audioElRef.current?.pause();
    audioElRef.current = null;
  }, []);

  const cleanup = useCallback(() => {
    previewStream?.getTracks().forEach((t) => t.stop());
    setPreviewStream(null);
    setRecordedBlob(null);
    setRecordedMimeType(null);
    setIsRecording(false);
  }, [previewStream]);

  return { previewStream, recordedBlob, recordedMimeType, isRecording, error, initCamera, startRecording, stopRecording, cleanup };
}

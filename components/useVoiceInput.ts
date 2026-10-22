"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live voice-to-text for an answer box.
 *
 * "live": the browser's own speech recognition (Chrome/Edge) — words appear as you speak.
 * "phrases": fallback when that service is missing or blocked (Brave, Firefox, Safari).
 * The mic audio is cut at natural pauses and each phrase is sent to Groq Whisper,
 * so text shows up about a second after every pause.
 */
export type VoiceMode = "live" | "phrases";

const MAX_SESSION_SECONDS = 300;

// Phrase cutting, in ms.
const TICK_MS = 100;
const MIN_PHRASE_MS = 2500; // keeps request rate under Groq's per-minute limit
const MAX_PHRASE_MS = 15000;
const PAUSE_MS = 700;
const MIN_VOICED_MS = 300; // less than this is noise, not speech

// Whisper's usual output for near-silence.
const HALLUCINATIONS = new Set(["you", "thank you.", "thank you", "thanks for watching!", "bye.", "."]);

// Browser recognition errors that mean "this browser can't do live" -> use phrases.
const FALLBACK_ERRORS = new Set(["network", "service-not-allowed", "language-not-supported"]);

const RECORDING_TYPES = [
  { mime: "audio/webm;codecs=opus", ext: "webm" },
  { mime: "audio/webm", ext: "webm" },
  { mime: "audio/mp4", ext: "mp4" },
  { mime: "audio/ogg;codecs=opus", ext: "ogg" },
];

// Minimal Web Speech typings; lib.dom doesn't ship SpeechRecognition.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function canRecord(): boolean {
  return typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

export function micErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Microphone access is blocked. Allow it in your browser's site settings, or type instead.";
  }
  if (name === "NotFoundError") {
    return "No microphone found. Plug one in or check your system sound settings, or type instead.";
  }
  if (name === "NotReadableError") {
    return "Your microphone is busy in another app. Close it there and try again.";
  }
  return "Could not start the microphone. Try again, or type your answer.";
}

type Segment = {
  recorder: MediaRecorder;
  chunks: Blob[];
  startedAt: number;
  lastVoiceAt: number;
  voicedMs: number;
};

export function useVoiceInput({
  onTranscript,
  onError,
}: {
  /** Full text heard in this session so far (final + in-progress). */
  onTranscript: (text: string) => void;
  onError: (message: string) => void;
}) {
  // null until mounted, so server and client render the same markup.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<VoiceMode | null>(null);
  const [pending, setPending] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Latest callbacks, so long-lived audio handlers never call stale ones.
  const callbacks = useRef({ onTranscript, onError });
  callbacks.current = { onTranscript, onError };

  const activeRef = useRef(false);
  const liveFailedRef = useRef(false); // once live fails, stay on phrases for this page
  const recognitionRef = useRef<Recognition | null>(null);
  const liveFinalRef = useRef("");
  const phrasesRef = useRef(new Map<number, string>());
  const seqRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const segmentRef = useRef<Segment | null>(null);
  const pollRef = useRef<number | null>(null);
  const clockRef = useRef<number | null>(null);
  const sessionRef = useRef(0); // bumps on every start/discard so late replies are ignored

  useEffect(() => {
    setSupported(Boolean(recognitionCtor()) || canRecord());
    return () => teardown();
  }, []);

  function emit(interim = "") {
    const phrases = [...phrasesRef.current.entries()].sort((a, b) => a[0] - b[0]).map(([, t]) => t);
    const text = [liveFinalRef.current, ...phrases, interim].map((t) => t.trim()).filter(Boolean).join(" ");
    callbacks.current.onTranscript(text);
  }

  function start() {
    if (activeRef.current) return;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel(); // don't transcribe the interviewer
    sessionRef.current += 1;
    liveFinalRef.current = "";
    phrasesRef.current = new Map();
    activeRef.current = true;
    setActive(true);
    setSeconds(0);

    let elapsed = 0;
    clockRef.current = window.setInterval(() => {
      elapsed += 1;
      setSeconds(elapsed);
      if (elapsed >= MAX_SESSION_SECONDS) stop();
    }, 1000);

    if (!liveFailedRef.current && recognitionCtor()) startLive();
    else void startPhrases();
  }

  function startLive() {
    const Ctor = recognitionCtor();
    if (!Ctor) return void startPhrases();
    setMode("live");

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    let fallBack = false;

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) liveFinalRef.current += ` ${result[0].transcript.trim()}`;
        else interim += result[0].transcript;
      }
      emit(interim);
    };
    recognition.onerror = (event) => {
      if (FALLBACK_ERRORS.has(event.error)) {
        liveFailedRef.current = true;
        fallBack = true;
      } else if (event.error === "not-allowed") {
        callbacks.current.onError(micErrorMessage(new DOMException("", "NotAllowedError")));
        stop();
      } else if (event.error === "audio-capture") {
        callbacks.current.onError(micErrorMessage(new DOMException("", "NotFoundError")));
        stop();
      }
      // "no-speech" and "aborted" are normal.
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (!activeRef.current) return;
      if (fallBack) return void startPhrases();
      // Chrome ends after a long silence; keep listening until the user presses Stop.
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        stop();
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      liveFailedRef.current = true;
      void startPhrases();
    }
  }

  async function startPhrases() {
    setMode("phrases");
    if (!canRecord()) {
      callbacks.current.onError("This browser can't record audio — type your answer instead.");
      return stop();
    }
    const session = sessionRef.current;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      callbacks.current.onError(micErrorMessage(error));
      return stop();
    }
    if (!activeRef.current || session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    streamRef.current = stream;

    // Volume meter for finding pauses.
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let noiseFloor = 0.01;

    segmentRef.current = newSegment(stream);

    pollRef.current = window.setInterval(() => {
      const segment = segmentRef.current;
      if (!segment) return;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const s of samples) sum += s * s;
      const rms = Math.sqrt(sum / samples.length);
      const voiced = rms > Math.max(0.015, noiseFloor * 3);
      if (!voiced) noiseFloor = noiseFloor * 0.95 + rms * 0.05;

      const now = performance.now();
      if (voiced) {
        segment.voicedMs += TICK_MS;
        segment.lastVoiceAt = now;
      }
      const length = now - segment.startedAt;
      const paused = segment.voicedMs >= MIN_VOICED_MS && now - segment.lastVoiceAt > PAUSE_MS;
      if ((paused && length > MIN_PHRASE_MS) || length > MAX_PHRASE_MS) {
        segmentRef.current = newSegment(stream);
        finishSegment(segment, session);
      }
    }, TICK_MS);
  }

  function newSegment(stream: MediaStream): Segment {
    const type = RECORDING_TYPES.find((t) => MediaRecorder.isTypeSupported(t.mime));
    const recorder = new MediaRecorder(stream, type ? { mimeType: type.mime } : undefined);
    const segment: Segment = { recorder, chunks: [], startedAt: performance.now(), lastVoiceAt: 0, voicedMs: 0 };
    recorder.ondataavailable = (event) => {
      if (event.data.size) segment.chunks.push(event.data);
    };
    recorder.start();
    return segment;
  }

  // Stops a phrase recorder; sends it for transcription if it had speech in it.
  function finishSegment(segment: Segment, session: number, onDone?: () => void) {
    segment.recorder.onstop = () => {
      onDone?.();
      if (segment.voicedMs < MIN_VOICED_MS || session !== sessionRef.current) return;
      const mime = segment.recorder.mimeType || "audio/webm";
      const ext = RECORDING_TYPES.find((t) => mime.startsWith(t.mime.split(";")[0]))?.ext ?? "webm";
      void transcribePhrase(new Blob(segment.chunks, { type: mime }), ext, segment.voicedMs, session);
    };
    if (segment.recorder.state !== "inactive") segment.recorder.stop();
    else segment.recorder.onstop?.(new Event("stop"));
  }

  async function transcribePhrase(blob: Blob, ext: string, voicedMs: number, session: number) {
    const seq = seqRef.current++;
    setPending((n) => n + 1);
    try {
      const form = new FormData();
      form.append("audio", blob, `phrase.${ext}`);
      const response = await fetch("/api/interview/transcribe", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as { text?: string; error?: string };
      if (session !== sessionRef.current) return;
      if (!response.ok) {
        callbacks.current.onError(data.error ?? "Part of your answer couldn't be transcribed. Keep going, or type it.");
        return;
      }
      const text = data.text?.trim() ?? "";
      if (!text || (voicedMs < 1000 && HALLUCINATIONS.has(text.toLowerCase()))) return;
      phrasesRef.current.set(seq, text);
      emit();
    } catch {
      if (session === sessionRef.current) {
        callbacks.current.onError("Could not reach the server. Check your connection and try again.");
      }
    } finally {
      setPending((n) => Math.max(0, n - 1));
    }
  }

  /** Stop listening; phrases already captured still finish transcribing. */
  function stop() {
    activeRef.current = false;
    setActive(false);
    if (clockRef.current) window.clearInterval(clockRef.current);
    clockRef.current = null;

    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    recognition?.stop();

    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = null;
    const segment = segmentRef.current;
    segmentRef.current = null;
    const releaseMic = () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      void audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    };
    if (segment) finishSegment(segment, sessionRef.current, releaseMic);
    else releaseMic();
  }

  /** Stop and throw away anything not yet transcribed (e.g. the answer was sent). */
  function discard() {
    sessionRef.current += 1;
    stop();
    setPending(0);
  }

  function teardown() {
    sessionRef.current += 1;
    activeRef.current = false;
    if (clockRef.current) window.clearInterval(clockRef.current);
    if (pollRef.current) window.clearInterval(pollRef.current);
    recognitionRef.current?.abort();
    const segment = segmentRef.current;
    if (segment) {
      segment.recorder.onstop = null;
      if (segment.recorder.state !== "inactive") segment.recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    void audioCtxRef.current?.close().catch(() => {});
  }

  return { supported, active, mode, pending, seconds, maxSeconds: MAX_SESSION_SECONDS, start, stop, discard };
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  answerInterviewAction,
  finishInterviewAction,
} from "@/app/dashboard/interview/actions";
import { LoadingOverlay } from "@/components/LoadingScreen";
import { MAX_ANSWER_CHARS, type TurnKind } from "@/lib/mock-interview";

export type ChatMessage = {
  role: "interviewer" | "candidate";
  content: string;
  kind?: TurnKind;
};

// Minimal Web Speech API typings; lib.dom doesn't ship SpeechRecognition.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const READ_ALOUD_KEY = "mock-interview:read-aloud";

export default function MockInterview({
  interviewId,
  role,
  questionCount,
  initialMessages,
}: {
  interviewId: string;
  role: string;
  questionCount: number;
  initialMessages: ChatMessage[];
}) {
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  // null until mounted, so server and client render the same markup.
  const [micSupported, setMicSupported] = useState<boolean | null>(null);
  const [ttsSupported, setTtsSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [readAloud, setReadAloud] = useState(false);

  const readAloudRef = useRef(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoFinishStarted = useRef(false);

  const last = messages[messages.length - 1];
  const done = last?.role === "interviewer" && last.kind === "closing";
  const answered = messages.filter((m) => m.role === "candidate").length;
  const asked = messages.filter((m) => m.role === "interviewer" && m.kind === "question").length;
  const busy = sending || finishing;

  useEffect(() => {
    setMicSupported(recognitionCtor() !== null);
    setTtsSupported("speechSynthesis" in window);
    try {
      const stored = window.localStorage.getItem(READ_ALOUD_KEY) === "1";
      readAloudRef.current = stored;
      setReadAloud(stored);
    } catch {
      // Storage blocked (private mode); default off.
    }
    return () => {
      recognitionRef.current?.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // Skip the first render so the page doesn't jump on load.
  const seenCount = useRef(initialMessages.length);
  useEffect(() => {
    if (messages.length === seenCount.current && !sending) return;
    seenCount.current = messages.length;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  // An interview that reached its closing line but was never scored.
  useEffect(() => {
    if (done && !autoFinishStarted.current) {
      autoFinishStarted.current = true;
      void finish();
    }
    // finish() only reads stable values; running it once is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function speak(text: string) {
    if (!readAloudRef.current || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  }

  function toggleReadAloud() {
    const next = !readAloud;
    readAloudRef.current = next;
    setReadAloud(next);
    try {
      window.localStorage.setItem(READ_ALOUD_KEY, next ? "1" : "0");
    } catch {
      // Preference just won't persist.
    }
    if (!next) window.speechSynthesis?.cancel();
    else if (last?.role === "interviewer") speak(last.content);
  }

  function stopListening() {
    recognitionRef.current?.stop();
  }

  function toggleListening() {
    if (listening) {
      stopListening();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;

    // Otherwise the mic transcribes the interviewer's voice.
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    const recognition = new Ctor();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    const base = answer.trim() ? `${answer.trim()} ` : "";
    let finalText = "";

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += `${result[0].transcript.trim()} `;
        else interim += result[0].transcript;
      }
      setAnswer((base + finalText + interim).slice(0, MAX_ANSWER_CHARS));
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setError("Microphone access is blocked. Allow it in your browser's site settings, or type instead.");
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError("Voice input stopped unexpectedly. Try again, or type your answer.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
      setAnswer((current) => current.trim());
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
      setError(null);
    } catch {
      setError("Could not start the microphone. Try again, or type your answer.");
    }
  }

  async function send() {
    const content = answer.trim();
    if (!content || busy || done) return;
    if (content.length > MAX_ANSWER_CHARS) {
      setError("That answer is too long — tighten it up, as you would in a real interview.");
      return;
    }

    stopListening();
    setError(null);
    setSending(true);
    setAnswer("");
    setMessages((current) => [...current, { role: "candidate", content }]);

    const rollback = (message: string) => {
      setMessages((current) => current.slice(0, -1));
      setAnswer(content);
      setError(message);
    };

    try {
      const result = await answerInterviewAction(interviewId, content);
      if (!result.ok) {
        rollback(result.error);
        return;
      }
      setMessages((current) => [
        ...current,
        { role: "interviewer", content: result.message.content, kind: result.message.kind },
      ]);
      setAnnouncement(`Interviewer: ${result.message.content}`);
      speak(result.message.content);
    } catch {
      rollback("Could not reach the server. Check your connection and send again.");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function finish() {
    stopListening();
    setError(null);
    setFinishing(true);
    try {
      const result = await finishInterviewAction(interviewId);
      if (!result.ok) {
        setError(result.error);
        setFinishing(false);
        return;
      }
      // The page re-renders as the scorecard; this component unmounts.
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      setFinishing(false);
    }
  }

  function endEarly() {
    if (!answered) {
      setError("Answer at least one question first — there is nothing to score yet.");
      return;
    }
    if (
      !done &&
      answered < questionCount &&
      !window.confirm(
        `You have answered ${answered} of ${questionCount} questions. End now and get scored on those?`
      )
    ) {
      return;
    }
    void finish();
  }

  return (
    <div className="flex flex-col gap-6">
      {finishing && (
        <LoadingOverlay
          heading="Scoring your interview"
          message="Going through every answer. This takes up to a minute — keep this tab open."
          icon="grading"
          status="Scoring"
          steps={[
            { label: "Collecting your answers", state: "done" },
            { label: "Writing the scorecard", state: "active" },
          ]}
          meta={[]}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/30 pb-4">
        <div className="min-w-0">
          <p className="text-label-caps text-primary uppercase">
            {done
              ? "Interview finished"
              : `Question ${Math.max(1, Math.min(asked, questionCount))} of ${questionCount}`}
          </p>
          <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface break-words">
            {role}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {ttsSupported && (
            <button
              type="button"
              aria-pressed={readAloud}
              onClick={toggleReadAloud}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-body-sm transition-colors ${
                readAloud
                  ? "border-primary text-primary bg-primary/5"
                  : "border-outline-variant/60 text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span aria-hidden className="material-symbols-outlined text-[18px]">
                {readAloud ? "volume_up" : "volume_off"}
              </span>
              Read questions aloud
            </button>
          )}
          <button
            type="button"
            onClick={endEarly}
            disabled={busy}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant/60 text-body-sm text-on-surface-variant hover:text-on-surface hover:border-primary/60 disabled:opacity-40 transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">
              stop_circle
            </span>
            End interview &amp; get scorecard
          </button>
        </div>
      </div>

      <ol className="flex flex-col gap-4" aria-label="Interview transcript">
        {messages.map((message, index) => (
          <li
            key={index}
            className={`flex ${message.role === "candidate" ? "justify-end" : "justify-start"}`}
          >
            <Bubble message={message} />
          </li>
        ))}
        {sending && (
          <li className="flex justify-start">
            <div className="rounded-xl rounded-tl-sm border border-outline-variant/40 bg-surface-container-low px-4 py-3 flex items-center gap-2 text-body-sm text-on-surface-variant">
              <span aria-hidden className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse [animation-delay:300ms]" />
              </span>
              Interviewer is thinking…
            </div>
          </li>
        )}
      </ol>
      <div ref={endRef} />

      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {done ? (
        !finishing && (
          <div className="flex flex-col gap-3 rounded-xl border border-outline-variant/60 p-4">
            <p className="text-body-sm text-on-surface-variant">
              The interview is over. Your scorecard is ready to be written.
            </p>
            <button
              type="button"
              onClick={() => void finish()}
              className="self-start px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed transition-colors"
            >
              Get my scorecard
            </button>
          </div>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <label htmlFor="interview-answer" className="text-body-md font-bold text-on-surface">
            Your answer
          </label>
          <textarea
            id="interview-answer"
            ref={textareaRef}
            value={answer}
            rows={5}
            maxLength={MAX_ANSWER_CHARS}
            disabled={busy}
            aria-describedby="interview-answer-hint"
            placeholder={listening ? "Listening… speak your answer." : "Answer as you would out loud."}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                void send();
              }
            }}
            className="w-full bg-surface-container-lowest border border-outline-variant/60 focus:border-primary focus:outline-none rounded-xl p-4 text-body-md text-on-surface placeholder:text-on-surface-variant/40 resize-y transition-colors disabled:opacity-60"
          />
          <p id="interview-answer-hint" className="text-body-sm text-on-surface-variant/60">
            {micSupported === false
              ? "Voice input isn't supported in this browser — try Chrome or Edge, or type your answer. "
              : ""}
            Ctrl+Enter (⌘+Enter on Mac) to send.
          </p>

          {error && (
            <p role="alert" className="text-body-sm text-error">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between gap-3">
            {micSupported !== false ? (
              <button
                type="button"
                onClick={toggleListening}
                disabled={busy || micSupported === null}
                aria-pressed={listening}
                aria-label={listening ? "Stop voice input" : "Answer out loud"}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-body-sm transition-colors disabled:opacity-40 ${
                  listening
                    ? "border-error text-error bg-error/10"
                    : "border-outline-variant/60 text-on-surface-variant hover:text-on-surface hover:border-primary/60"
                }`}
              >
                <span
                  aria-hidden
                  className={`material-symbols-outlined text-[20px] ${listening ? "animate-pulse" : ""}`}
                >
                  {listening ? "stop" : "mic"}
                </span>
                <span>{listening ? "Stop" : "Speak"}</span>
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !answer.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-on-primary font-semibold text-body-md hover:bg-primary-fixed disabled:opacity-60 transition-colors"
            >
              {sending ? "Sending…" : "Send"}
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                send
              </span>
            </button>
          </div>
        </div>
      )}

      {done && error && (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const interviewer = message.role === "interviewer";
  return (
    <div
      className={`max-w-[85%] md:max-w-[75%] rounded-xl px-4 py-3 flex flex-col gap-1 ${
        interviewer
          ? "rounded-tl-sm border border-outline-variant/40 bg-surface-container-low text-on-surface"
          : "rounded-tr-sm bg-primary/10 border border-primary/30 text-on-surface"
      }`}
    >
      <span
        className={`text-label-caps uppercase ${interviewer ? "text-primary" : "text-on-surface-variant"}`}
      >
        {interviewer ? (message.kind === "follow_up" ? "Interviewer · follow-up" : "Interviewer") : "You"}
      </span>
      <p className="text-body-md whitespace-pre-wrap break-words">{message.content}</p>
    </div>
  );
}

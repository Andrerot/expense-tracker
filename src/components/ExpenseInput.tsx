"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { ExpenseSource } from "@/types/expense";

type ExpenseInputProps = {
  isSubmitting: boolean;
  onSubmit: (rawInput: string, source: ExpenseSource) => Promise<void>;
};

type VoiceStatus = "idle" | "listening" | "transcribed" | "saving" | "unsupported" | "error";

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function ExpenseInput({ isSubmitting, onSubmit }: ExpenseInputProps) {
  const [rawInput, setRawInput] = useState("");
  const [inputSource, setInputSource] = useState<ExpenseSource>("text");
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceMessage, setVoiceMessage] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isSubmittingRef = useRef(isSubmitting);
  const onSubmitRef = useRef(onSubmit);
  const voiceSubmitInFlightRef = useRef(false);
  const isListening = voiceStatus === "listening";
  const isVoiceSaving = voiceStatus === "saving";
  const isVoiceSupported = voiceStatus !== "unsupported";
  const isBusy = isSubmitting || isVoiceSaving;

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  useEffect(() => {
    onSubmitRef.current = onSubmit;
  }, [onSubmit]);

  useEffect(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;

    if (!Recognition) {
      setVoiceStatus("unsupported");
      setVoiceMessage("Voce non supportata da questo browser");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "it-IT";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setVoiceStatus("listening");
      setVoiceMessage("Sto ascoltando...");
    };

    recognition.onend = () => {
      setVoiceStatus((current) => (current === "listening" ? "idle" : current));
    };

    recognition.onerror = (event) => {
      setVoiceStatus("error");
      setVoiceMessage(getVoiceErrorMessage(event.error));
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let hasFinalResult = false;

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
        hasFinalResult = hasFinalResult || event.results[index].isFinal;
      }

      const cleanedTranscript = transcript.trim();

      if (cleanedTranscript) {
        setRawInput(cleanedTranscript);
        setInputSource("voice");
        setVoiceMessage(hasFinalResult ? "Salvataggio vocale..." : "Sto trascrivendo...");
        setVoiceStatus(hasFinalResult ? "saving" : "listening");

        if (hasFinalResult) {
          void submitVoiceTranscript(cleanedTranscript);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = rawInput.trim();

    if (!value) {
      return;
    }

    await submitExpense(value, inputSource);
  }

  async function submitExpense(value: string, source: ExpenseSource) {
    await onSubmit(value, source);
    setRawInput("");
    setInputSource("text");
    setVoiceStatus(isVoiceSupported ? "idle" : "unsupported");
    setVoiceMessage(isVoiceSupported ? "" : voiceMessage);
  }

  async function submitVoiceTranscript(value: string) {
    if (voiceSubmitInFlightRef.current || isSubmittingRef.current) {
      return;
    }

    voiceSubmitInFlightRef.current = true;

    try {
      await onSubmitRef.current(value, "voice");
      setRawInput("");
      setInputSource("text");
      setVoiceStatus("idle");
      setVoiceMessage("");
    } finally {
      voiceSubmitInFlightRef.current = false;
    }
  }

  function handleTextChange(value: string) {
    setRawInput(value);
    setInputSource("text");

    if (voiceStatus === "transcribed" || voiceStatus === "error") {
      setVoiceStatus("idle");
      setVoiceMessage("");
    }
  }

  function handleVoiceButton() {
    const recognition = recognitionRef.current;

    if (!recognition || isBusy) {
      return;
    }

    if (isListening) {
      recognition.stop();
      setVoiceStatus("transcribed");
      setVoiceMessage(rawInput.trim() ? "Trascrizione pronta" : "");
      return;
    }

    try {
      setVoiceMessage("");
      recognition.start();
    } catch {
      setVoiceStatus("error");
      setVoiceMessage("Microfono non avviato. Riprova tra poco");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="expense-input" className="block text-sm font-black uppercase tracking-[0.14em] text-slate-600">
          Nuova spesa
        </label>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-800">
          EUR
        </span>
      </div>
      <textarea
        id="expense-input"
        value={rawInput}
        onChange={(event) => handleTextChange(event.target.value)}
        rows={4}
        placeholder="12,50 pranzo al bar"
        className="min-h-32 w-full resize-none rounded-2xl border border-white/70 bg-white/90 px-4 py-4 text-lg leading-7 text-slate-950 shadow-[0_18px_50px_rgba(15,23,42,0.10)] outline-none ring-1 ring-slate-900/5 transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
      />
      <div className="grid grid-cols-[1fr_56px] gap-3">
        <button
          type="submit"
          disabled={isBusy || rawInput.trim().length === 0}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 text-base font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.22)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
        >
          <span className="grid size-6 place-items-center rounded-full bg-cyan-300 text-sm font-black text-slate-950">
            +
          </span>
          {isBusy ? "Salvataggio..." : "Aggiungi spesa"}
        </button>
        <button
          type="button"
          onClick={handleVoiceButton}
          disabled={!isVoiceSupported || isBusy}
          aria-label={isListening ? "Ferma input vocale" : "Avvia input vocale"}
          title={isVoiceSupported ? "Input vocale" : "Voce non supportata da questo browser"}
          className={`grid h-14 place-items-center rounded-2xl border shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed ${
            isListening
              ? "border-rose-200 bg-rose-600 text-white shadow-[0_14px_30px_rgba(225,29,72,0.22)]"
              : "border-cyan-200 bg-white/80 text-cyan-900"
          } ${!isVoiceSupported ? "border-slate-200 bg-white/60 text-slate-400" : ""}`}
        >
          <span className="relative block h-6 w-4 rounded-full border-2 border-current">
            <span className="absolute left-1/2 top-full h-2 w-0.5 -translate-x-1/2 bg-current" />
            {isListening ? (
              <span className="absolute -inset-2 rounded-full border border-current opacity-50" />
            ) : null}
          </span>
        </button>
      </div>
      {voiceMessage ? (
        <p
          role="status"
          className={`rounded-2xl px-3 py-2 text-xs font-bold ${
            voiceStatus === "error" || voiceStatus === "unsupported"
              ? "bg-amber-50 text-amber-900"
              : voiceStatus === "saving"
                ? "bg-emerald-50 text-emerald-900"
              : "bg-cyan-50 text-cyan-900"
          }`}
        >
          {voiceMessage}
        </p>
      ) : null}
    </form>
  );
}

function getVoiceErrorMessage(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed") {
    return "Permesso microfono non concesso";
  }

  if (error === "no-speech") {
    return "Non ho sentito nulla. Riprova";
  }

  if (error === "audio-capture") {
    return "Microfono non disponibile";
  }

  return "Input vocale non riuscito";
}

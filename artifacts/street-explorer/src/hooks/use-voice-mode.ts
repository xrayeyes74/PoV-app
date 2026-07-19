import { useState, useRef, useCallback, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Lazy import dei plugin nativi solo su Android
let TextToSpeech: any = null;
let SpeechRecognition: any = null;

if (Capacitor.isNativePlatform()) {
  import("@capacitor-community/text-to-speech").then((m) => {
    TextToSpeech = m.TextToSpeech;
  });
  import("@capacitor-community/speech-recognition").then((m) => {
    SpeechRecognition = m.SpeechRecognition;
  });
}

export type VoiceCommand =
  | { type: "search"; query: string }
  | { type: "analyze" }
  | { type: "show_poi" }
  | { type: "hide_poi" }
  | { type: "my_location" }
  | { type: "language"; lang: string }
  | { type: "unknown"; transcript: string };

function parseCommand(transcript: string): VoiceCommand {
  const t = transcript.toLowerCase().trim();

  const searchPatterns = [
    /^(?:vai a|portami a|cerca|naviga verso|go to|take me to|search for|navigate to|aller à|llevar a|الذهاب إلى|前往)\s+(.+)$/i,
  ];
  for (const pattern of searchPatterns) {
    const match = t.match(pattern);
    if (match) return { type: "search", query: match[1] };
  }

  if (/\b(analizza|analyze|analyser|analizar|تحليل|分析)\b/.test(t))
    return { type: "analyze" };

  if (/\b(mostra poi|show poi|afficher poi|mostrar poi|إظهار|显示)\b/.test(t))
    return { type: "show_poi" };
  if (/\b(nascondi poi|hide poi|masquer poi|ocultar poi|إخفاء|隐藏)\b/.test(t))
    return { type: "hide_poi" };

  if (/\b(posizione|my location|ma position|mi ubicación|موقعي|我的位置)\b/.test(t))
    return { type: "my_location" };

  const langMap: Record<string, string> = {
    italiano: "it", italian: "it",
    inglese: "en", english: "en",
    francese: "fr", french: "fr", français: "fr",
    spagnolo: "es", spanish: "es", español: "es",
    arabo: "ar", arabic: "ar",
    cinese: "zh", chinese: "zh",
  };
  for (const [word, code] of Object.entries(langMap)) {
    if (t.includes(word)) return { type: "language", lang: code };
  }

  return { type: "unknown", transcript };
}

export function useVoiceMode() {
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const isSpeakingRef = useRef(false);
  const isSpeaking = isSpeakingRef.current;
  const recognitionRef = useRef<any>(null);
  const onCommandRef = useRef<((cmd: VoiceCommand) => void) | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const isSupported = isNative || (
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  );

  const speak = useCallback(async (text: string, lang = "it-IT") => {
    isSpeakingRef.current = true;
    try {
      if (isNative && TextToSpeech) {
        await TextToSpeech.speak({
          text,
          lang,
          rate: 1.0,
          pitch: 1.0,
          volume: 1.0,
          category: "ambient",
        });
      } else {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onend = () => { isSpeakingRef.current = false; };
        window.speechSynthesis.speak(utterance);
        return;
      }
    } catch (e) {
      console.warn("TTS error:", e);
    }
    isSpeakingRef.current = false;
  }, [isNative]);

  const startListening = useCallback(async (currentLang = "it-IT") => {
    if (isNative && SpeechRecognition) {
      try {
        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== "granted") return;

        setIsListening(true);
        await SpeechRecognition.start({
          language: currentLang,
          maxResults: 1,
          prompt: "Parla...",
          partialResults: false,
          popup: false,
        });

        SpeechRecognition.addListener("partialResults", (data: any) => {
          const transcript = data.matches?.[0] ?? "";
          if (transcript) {
            setLastTranscript(transcript);
            setIsListening(false);
            const command = parseCommand(transcript);
            onCommandRef.current?.(command);
            SpeechRecognition.stop();
          }
        });
      } catch (e) {
        console.warn("STT error:", e);
        setIsListening(false);
      }
    } else {
      // Web Speech API fallback
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) return;
      const recognition = new SR();
      recognition.lang = currentLang;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
recognition.onend = () => {
        console.log("Speech recognition ended");
        setIsListening(false);
      };
      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsListening(true);
      };
recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error, event.message);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLastTranscript(transcript);
        const command = parseCommand(transcript);
        onCommandRef.current?.(command);
      };
      recognitionRef.current = recognition;
      recognition.start();
    }
  }, [isNative]);

recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log("Transcript:", transcript);
        setLastTranscript(transcript);
        const command = parseCommand(transcript);
        console.log("Command:", command);
        onCommandRef.current?.(command);
      };

  const stopListening = useCallback(async () => {
    if (isNative && SpeechRecognition) {
      try { await SpeechRecognition.stop(); } catch {}
    } else {
      recognitionRef.current?.stop();
    }
    setIsListening(false);
  }, [isNative]);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode((v) => {
      if (v) {
        if (isNative && TextToSpeech) TextToSpeech.stop();
        else window.speechSynthesis?.cancel();
      }
      return !v;
    });
  }, [isNative]);

  const setOnCommand = useCallback((fn: (cmd: VoiceCommand) => void) => {
    onCommandRef.current = fn;
  }, []);

  useEffect(() => {
    return () => {
      if (isNative && SpeechRecognition) SpeechRecognition.stop().catch(() => {});
      else recognitionRef.current?.stop();
      if (isNative && TextToSpeech) TextToSpeech.stop().catch(() => {});
      else window.speechSynthesis?.cancel();
    };
  }, [isNative]);

  return {
    isVoiceMode,
    toggleVoiceMode,
    isListening,
    isSpeaking,
    isSupported,
    lastTranscript,
    startListening,
    stopListening,
    speak,
    setOnCommand,
  };
}
import { useState, useRef, useCallback, useEffect } from "react";

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

  // Navigazione / ricerca
  const searchPatterns = [
    /^(?:vai a|portami a|cerca|naviga verso|go to|take me to|search for|navigate to|aller à|llevar a|الذهاب إلى|前往)\s+(.+)$/i,
  ];
  for (const pattern of searchPatterns) {
    const match = t.match(pattern);
    if (match) return { type: "search", query: match[1] };
  }

  // Analizza
  if (/\b(analizza|analyze|analyser|analizar|تحليل|分析)\b/.test(t))
    return { type: "analyze" };

  // Mostra/nascondi POI
  if (/\b(mostra poi|show poi|afficher poi|mostrar poi|إظهار|显示)\b/.test(t))
    return { type: "show_poi" };
  if (/\b(nascondi poi|hide poi|masquer poi|ocultar poi|إخفاء|隐藏)\b/.test(t))
    return { type: "hide_poi" };

  // Posizione
  if (/\b(posizione|my location|ma position|mi ubicación|موقعي|我的位置)\b/.test(t))
    return { type: "my_location" };

  // Lingua
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onCommandRef = useRef<((cmd: VoiceCommand) => void) | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const speak = useCallback((text: string, lang = "it-IT") => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  const startListening = useCallback((currentLang = "it-IT") => {
    if (!isSupported) return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = currentLang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setLastTranscript(transcript);
      const command = parseCommand(transcript);
      onCommandRef.current?.(command);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleVoiceMode = useCallback(() => {
    setIsVoiceMode((v) => {
      if (v) window.speechSynthesis?.cancel();
      return !v;
    });
  }, []);

  const setOnCommand = useCallback((fn: (cmd: VoiceCommand) => void) => {
    onCommandRef.current = fn;
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

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

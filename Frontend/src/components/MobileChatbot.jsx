import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Globe2,
  Heart,
  History,
  Hospital,
  Info,
  LoaderCircle,
  MapPin,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Paperclip,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

const suggestedPrompts = [
  { icon: Clock3, text: "What are the visiting hours?" },
  { icon: Hospital, text: "List of departments in the hospital" },
  { icon: CalendarDays, text: "How can I book an appointment?" },
  { icon: Heart, text: "What services does the hospital offer?" },
  { icon: MapPin, text: "Where is the hospital located?" },
];

const initialMessages = [
  {
    id: "init-1",
    role: "assistant",
    content: "Hi! How can I help you today?",
    time: "9:41 AM",
  },
  {
    id: "init-2",
    role: "user",
    content: "What are the visiting hours?",
    time: "9:41 AM",
    read: true,
  },
  {
    id: "init-3",
    role: "assistant",
    content:
      "Visiting hours are from 10:00 AM to 1:00 PM and 4:00 PM to 7:00 PM.",
    time: "9:41 AM",
  },
];

const defaultSession = {
  id: "session-default",
  title: "Visiting Hours Inquiry",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  threadId: "",
  storedFilename: "",
  documentMeta: null,
  messages: initialMessages,
};

export default function MobileChatbot() {
  // Multiple Chat Conversations State
  const [sessions, setSessions] = useState(() => {
    try {
      const saved = localStorage.getItem("ozocoChatSessions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [defaultSession];
  });

  const [activeSessionId, setActiveSessionId] = useState(() => {
    try {
      const savedId = localStorage.getItem("ozocoActiveSessionId");
      if (savedId) return savedId;
    } catch {}
    return "session-default";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ozocoTheme') || 'dark';
  });

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0] || defaultSession;

  const messages = activeSession.messages || initialMessages;
  const threadId = activeSession.threadId || "";
  const storedFilename = activeSession.storedFilename || "";
  const documentMeta = activeSession.documentMeta || null;

  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreamingAnswer, setIsStreamingAnswer] = useState(false);
  const [error, setError] = useState("");

  // Voice States
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);

  // Drawer / Modal states
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const fileInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const activeAudioRef = useRef(null);
  const activeAudioUrlRef = useRef(null);

  const voiceMeterRef = useRef({
    audioContext: null,
    analyser: null,
    frameId: null,
    heardVoice: false,
    lastLevelUpdate: 0,
  });

  const stopVoiceOutput = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
  };

  const stopAllVoice = () => {
    stopVoiceOutput();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    const meter = voiceMeterRef.current;
    if (meter.frameId) cancelAnimationFrame(meter.frameId);
    if (meter.audioContext) meter.audioContext.close().catch(() => {});
    voiceMeterRef.current = {
      audioContext: null,
      analyser: null,
      frameId: null,
      heardVoice: meter.heardVoice,
      lastLevelUpdate: 0,
    };

    setIsRecording(false);
    setVoiceLoading(false);
    setVoiceStatus("");
  };

  // Save sessions to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem("ozocoChatSessions", JSON.stringify(sessions));
      localStorage.setItem("ozocoActiveSessionId", activeSessionId);
    } catch {}
  }, [sessions, activeSessionId]);

  // Internal Scroll: Always scroll to latest message inside chat body
  useEffect(() => {
    const scrollContainer = chatScrollRef.current;
    if (scrollContainer) {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isSending, voiceLoading, isUploading, activeSessionId]);

  // Helper to update active session state
  const updateActiveSession = (updater) => {
    setSessions((prevSessions) =>
      prevSessions.map((session) => {
        if (session.id === activeSessionId) {
          const updated =
            typeof updater === "function" ? updater(session) : updater;
          return { ...session, ...updated, updatedAt: Date.now() };
        }
        return session;
      })
    );
  };

  // Multiple Conversations Management
  const createNewChat = () => {
    stopAllVoice();

    const newId = `session-${Date.now()}`;
    const newSession = {
      id: newId,
      title: "New Chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      threadId: "",
      storedFilename: storedFilename,
      documentMeta: documentMeta,
      messages: [
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Hi! How can I help you today?",
          time: formatTime(),
        },
      ],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    setIsHistoryOpen(false);
    setIsMenuOpen(false);
  };

  const switchChat = (sessionId) => {
    stopAllVoice();
    setActiveSessionId(sessionId);
    setIsHistoryOpen(false);
    setIsMenuOpen(false);
  };

  const deleteChat = (sessionId, e) => {
    if (e) e.stopPropagation();
    setSessions((prev) => {
      const filtered = prev.filter((s) => s.id !== sessionId);
      if (filtered.length === 0) {
        const fresh = {
          id: `session-${Date.now()}`,
          title: "New Chat",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          threadId: "",
          storedFilename: "",
          documentMeta: null,
          messages: initialMessages,
        };
        setActiveSessionId(fresh.id);
        return [fresh];
      }
      if (activeSessionId === sessionId) {
        setActiveSessionId(filtered[0].id);
      }
      return filtered;
    });
  };

  const clearChatHistory = () => {
    updateActiveSession({
      messages: initialMessages,
      threadId: "",
    });
    setIsHistoryOpen(false);
    setIsMenuOpen(false);
  };

  const formatTime = () => {
    const date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? "0" + minutes : minutes;
    return `${hours}:${minutes} ${ampm}`;
  };

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return { data, isJson: true };
    }
    const text = await response.text();
    return { data: text, isJson: false };
  };

  // Audio Playback for TTS Response
  const playBase64Audio = (base64Data) => {
    if (!base64Data) return;
    stopVoiceOutput();

    try {
      const byteChars = atob(base64Data);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      activeAudioUrlRef.current = url;
      audio.play().catch((err) => console.error("Audio playback error:", err));
      audio.addEventListener("ended", () => {
        if (activeAudioRef.current === audio) activeAudioRef.current = null;
        if (activeAudioUrlRef.current === url) {
          URL.revokeObjectURL(url);
          activeAudioUrlRef.current = null;
        }
      });
    } catch (err) {
      console.error("Failed to decode base64 audio:", err);
    }
  };

  // Voice Meter (Web Audio API Amplitude Visualizer)
  const stopVoiceMeter = () => {
    const meter = voiceMeterRef.current;
    if (meter.frameId) cancelAnimationFrame(meter.frameId);
    if (meter.audioContext) meter.audioContext.close().catch(() => {});

    voiceMeterRef.current = {
      audioContext: null,
      analyser: null,
      frameId: null,
      heardVoice: meter.heardVoice,
      lastLevelUpdate: 0,
    };
    setVoiceLevel(0);
  };

  const startVoiceMeter = (stream) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 2048;
      source.connect(analyser);

      const samples = new Uint8Array(analyser.fftSize);
      voiceMeterRef.current = {
        audioContext,
        analyser,
        frameId: null,
        heardVoice: false,
        lastLevelUpdate: 0,
      };

      const measure = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
          const centered = (samples[i] - 128) / 128;
          sum += centered * centered;
        }

        const rms = Math.sqrt(sum / samples.length);
        if (rms > 0.025) voiceMeterRef.current.heardVoice = true;

        const now = performance.now();
        if (now - voiceMeterRef.current.lastLevelUpdate > 60) {
          voiceMeterRef.current.lastLevelUpdate = now;
          setVoiceLevel(Math.min(1, rms * 14));
        }

        voiceMeterRef.current.frameId = requestAnimationFrame(measure);
      };

      measure();
    } catch (err) {
      console.error("Voice meter initialization error:", err);
    }
  };

  // Send Recorded Audio to Voice API
  const sendVoiceFile = async (file) => {
    if (!file) return;

    setVoiceError("");
    setVoiceStatus("Transcribing your voice...");
    setVoiceLoading(true);

    const formData = new FormData();
    formData.append("audio", file, file.name);
    if (threadId) formData.append("thread_id", threadId);
    if (storedFilename) formData.append("stored_filename", storedFilename);

    let hasTranscript = false;
    let assistantReply = "";
    const assistantMsgId = Date.now().toString();

    try {
      const response = await fetch("/documents/voice/stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { data, isJson } = await parseResponse(response);
        throw new Error(
          isJson ? data?.detail || "Voice request failed." : data || "Voice request failed."
        );
      }

      if (!response.body) {
        throw new Error("Voice streaming not supported.");
      }

      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      let buffer = "";
      let assistantMsgAdded = false;

      const updateAssistantMessage = (content) => {
        updateActiveSession((sess) => ({
          messages: sess.messages.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: content || "..." } : msg
          ),
        }));
      };

      const ensureAssistantMessage = () => {
        if (assistantMsgAdded) return;
        assistantMsgAdded = true;
        updateActiveSession((sess) => ({
          messages: [
            ...sess.messages,
            {
              id: assistantMsgId,
              role: "assistant",
              content: "...",
              time: formatTime(),
            },
          ],
        }));
      };

      const handleEvent = (rawEvent) => {
        const dataLine = rawEvent
          .split("\n")
          .find((line) => line.startsWith("data:"));
        if (!dataLine) return;

        try {
          const payload = JSON.parse(dataLine.slice(5).trim());

          if (payload.type === "status") {
            setVoiceStatus(payload.message || "");
          } else if (payload.type === "transcript") {
            const transcript = (payload.text || "").trim();
            if (!transcript) return;
            hasTranscript = true;

            updateActiveSession((sess) => {
              const updatedTitle =
                sess.title === "New Chat"
                  ? transcript.slice(0, 24) + "..."
                  : sess.title;
              return {
                title: updatedTitle,
                messages: [
                  ...sess.messages,
                  {
                    id: Date.now().toString(),
                    role: "user",
                    content: transcript,
                    time: formatTime(),
                    read: true,
                  },
                ],
              };
            });
            setVoiceStatus("Generating voice and text response...");
          } else if (payload.type === "token") {
            if (typeof payload.content === "string") {
              assistantReply += payload.content;
            }
          } else if (payload.type === "done") {
            if (payload.thread_id) {
              updateActiveSession({ threadId: payload.thread_id });
            }
            if (payload.response) {
              assistantReply = payload.response;
            }
          } else if (payload.type === "audio") {
            // Reveal text and play sound AT ONCE TOGETHER!
            ensureAssistantMessage();
            updateAssistantMessage(assistantReply || "Voice response received.");
            if (payload.audio_base64) {
              playBase64Audio(payload.audio_base64);
            }
            setVoiceStatus("Voice response played.");
          } else if (payload.type === "voice_done") {
            if (payload.thread_id) {
              updateActiveSession({ threadId: payload.thread_id });
            }
            if (payload.response) assistantReply = payload.response;
            ensureAssistantMessage();
            updateAssistantMessage(assistantReply || "Voice response received.");
          } else if (payload.type === "error") {
            throw new Error(payload.message || "Voice request failed.");
          }
        } catch {
          /* parse fallback */
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        events.forEach((event) => {
          if (event.trim()) handleEvent(event);
        });
      }

      buffer += decoder.decode();
      if (buffer.trim()) handleEvent(buffer);

      if (!hasTranscript) {
        const fallbackText = "Visiting hours are from 10:00 AM to 1:00 PM and 4:00 PM to 7:00 PM.";
        updateActiveSession((sess) => ({
          messages: [
            ...sess.messages,
            {
              id: Date.now().toString(),
              role: "user",
              content: "🎙️ Voice Question",
              time: formatTime(),
              read: true,
            },
            {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: fallbackText,
              time: formatTime(),
            },
          ],
        }));
      }
    } catch (err) {
      setVoiceError(err.message || "Unable to process voice input.");
    } finally {
      setVoiceLoading(false);
    }
  };

  const startVoiceRecording = async () => {
    stopAllVoice();
    setVoiceError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Microphone access is not supported by your browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      recordingChunksRef.current = [];
      startVoiceMeter(stream);

      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      });

      const recordingStartTime = Date.now();

      recorder.addEventListener("stop", async () => {
        stopVoiceMeter();
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        const durationMs = Date.now() - recordingStartTime;
        if (durationMs < 800) {
          setVoiceError("Recording was too short. Hold mic to speak.");
          return;
        }

        const blobMime = recorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(recordingChunksRef.current, { type: blobMime });

        if (recordedBlob.size === 0) {
          setVoiceError("No audio captured.");
          return;
        }

        const file = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: blobMime });
        await sendVoiceFile(file);
      });

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setVoiceStatus("Recording voice... Tap mic again to finish.");
    } catch (err) {
      stopVoiceMeter();
      setVoiceError(err.message || "Microphone access denied.");
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    mediaRecorderRef.current = null;
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setError("");

    const currentTime = formatTime();
    updateActiveSession((sess) => ({
      messages: [
        ...sess.messages,
        {
          id: Date.now().toString(),
          role: "user",
          content: `Uploaded PDF: ${file.name}`,
          time: currentTime,
          read: true,
        },
      ],
    }));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/documents/upload", {
        method: "POST",
        body: formData,
      });

      const { data, isJson } = await parseResponse(response);
      if (!response.ok) {
        throw new Error(
          isJson ? data?.detail || "Upload failed." : data || "Upload failed."
        );
      }

      const payload = isJson ? data : {};
      const newMeta = {
        filename: payload.original_filename || file.name,
        pages: payload.pages || 1,
      };

      setSessions((prev) =>
        prev.map((sess) => ({
          ...sess,
          storedFilename: payload.stored_filename || sess.storedFilename,
          threadId: payload.thread_id || sess.threadId,
          documentMeta: newMeta,
        }))
      );

      window.localStorage.setItem(
        "ozocoUploadedDocument",
        JSON.stringify(payload)
      );

      updateActiveSession((sess) => ({
        messages: [
          ...sess.messages,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content:
              payload.llm_response ||
              payload.response ||
              `I've processed "${file.name}". You can now ask me any specific questions about it!`,
            time: formatTime(),
          },
        ],
      }));
    } catch (err) {
      setError(err.message || "Failed to upload PDF document.");
    } finally {
      setIsUploading(false);
    }
  };

  const sendQuestion = async (questionText) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    setInput("");
    setError("");
    setIsSending(true);

    const currentTime = formatTime();
    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    updateActiveSession((sess) => {
      const updatedTitle =
        sess.title === "New Chat" ? trimmed.slice(0, 24) + "..." : sess.title;
      return {
        title: updatedTitle,
        messages: [
          ...sess.messages,
          {
            id: userMsgId,
            role: "user",
            content: trimmed,
            time: currentTime,
            read: true,
          },
        ],
      };
    });

    try {
      const response = await fetch("/documents/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          thread_id: threadId || undefined,
          stored_filename: storedFilename || undefined,
        }),
      });

      if (!response.ok) {
        const { data, isJson } = await parseResponse(response);
        throw new Error(
          isJson
            ? data?.detail || "Unable to reach chatbot service."
            : data || "Unable to reach chatbot service."
        );
      }

      if (!response.body) {
        throw new Error("Streaming response not supported by browser.");
      }

      let assistantReply = "";
      let buffer = "";
      const decoder = new TextDecoder();
      const reader = response.body.getReader();

      setIsStreamingAnswer(true);

      updateActiveSession((sess) => ({
        messages: [
          ...sess.messages,
          {
            id: assistantMsgId,
            role: "assistant",
            content: "...",
            time: formatTime(),
          },
        ],
      }));

      const updateAssistantMessage = (content) => {
        updateActiveSession((sess) => ({
          messages: sess.messages.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: content || "..." } : msg
          ),
        }));
      };

      const handleEvent = (rawEvent) => {
        const dataLine = rawEvent
          .split("\n")
          .find((line) => line.startsWith("data:"));
        if (!dataLine) return;

        try {
          const payload = JSON.parse(dataLine.slice(5).trim());
          if (payload.type === "token" && typeof payload.content === "string") {
            assistantReply += payload.content;
            updateAssistantMessage(assistantReply);
          } else if (payload.type === "done") {
            if (payload.thread_id) {
              updateActiveSession({ threadId: payload.thread_id });
            }
            if (!assistantReply && payload.response) {
              assistantReply = payload.response;
              updateAssistantMessage(assistantReply);
            }
          }
        } catch {
          /* ignore parse error */
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        events.forEach((event) => {
          if (event.trim()) handleEvent(event);
        });
      }

      buffer += decoder.decode();
      if (buffer.trim()) handleEvent(buffer);

      if (!assistantReply) {
        const fallbackAnswers = {
          "What are the visiting hours?":
            "Visiting hours are from 10:00 AM to 1:00 PM and 4:00 PM to 7:00 PM.",
          "List of departments in the hospital":
            "We have Cardiology, Neurology, Pediatrics, Orthopedics, Oncology, General Surgery, Emergency & ICU services.",
          "How can I book an appointment?":
            "You can book an appointment online via our patient portal or call our hotline at 1800-123-4567.",
          "What services does the hospital offer?":
            "We offer 24/7 Emergency Care, Diagnostic Imaging (MRI, CT, X-Ray), Pharmacy, Blood Bank, and Outpatient Consultations.",
          "Where is the hospital located?":
            "Our hospital is located at 100 Health Avenue, Central City. Nearest metro station is City Center (Exit 2).",
        };
        updateAssistantMessage(
          fallbackAnswers[trimmed] ||
            "I'm here to help! Please let me know if you need specific details about hospital schedules, departments, or appointments."
        );
      }
    } catch (err) {
      const fallbackAnswers = {
        "What are the visiting hours?":
          "Visiting hours are from 10:00 AM to 1:00 PM and 4:00 PM to 7:00 PM.",
        "List of departments in the hospital":
          "Our departments include Cardiology, Neurology, Pediatrics, Orthopedics, Oncology, and 24/7 Emergency Services.",
        "How can I book an appointment?":
          "Appointments can be booked through our helpline or by speaking with the reception desk.",
        "What services does the hospital offer?":
          "We offer Inpatient Care, ICU, OPD, Lab Diagnostics, Radiology, Pharmacy, and Emergency Ambulance Service.",
        "Where is the hospital located?":
          "We are located at 100 Health Avenue, Central City.",
      };
      const answer =
        fallbackAnswers[trimmed] ||
        `Thank you for your question about "${trimmed}". How else can I assist you with your hospital visit today?`;

      updateAssistantMessage(answer);
    } finally {
      setIsStreamingAnswer(false);
      setIsSending(false);
    }
  };

  const handleSendSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendQuestion(input);
    }
  };

  return (
    <div
      className={`m-app-viewport ${theme === 'dark' ? 'dark' : ''}`}
      onPointerDown={stopVoiceOutput}
    >
      {/* Outer Mobile Frame Container */}
      <div className="m-phone-frame">
        {/* Top Status Bar */}
        <div className="m-status-bar" aria-hidden="true">
          <span className="m-status-time">9:41</span>
          <div className="m-status-notch" />
          <div className="m-status-icons">
            <svg width="15" height="11" viewBox="0 0 16 12" fill="currentColor">
              <path d="M8 12L0 3.5C2.1 1.3 5 0 8 0C11 0 13.9 1.3 16 3.5L8 12Z" />
            </svg>
            <svg width="15" height="11" viewBox="0 0 16 12" fill="currentColor">
              <path d="M1 11H15V1H1V11Z" />
            </svg>
            <svg width="18" height="10" viewBox="0 0 20 12" fill="currentColor">
              <rect x="1" y="1" width="15" height="10" rx="2" stroke="currentColor" fill="none" strokeWidth="2" />
              <rect x="3" y="3" width="9" height="6" rx="1" />
              <path d="M18 4V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Top Navigation Bar */}
        <header className="m-header">
          <button
            className="m-icon-btn"
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={2.2} />
          </button>

          <div className="m-brand-logo">
            <div className="m-brand-avatar">
              <Bot size={18} strokeWidth={2.5} />
            </div>
            <div className="m-brand-title">
              <span className="m-ozoco">ozoco</span>
              <span className="m-chatbuddy">ChatBuddy</span>
            </div>
          </div>

          <div className="m-header-right-actions">
            <button
              className="m-icon-btn"
              type="button"
              onClick={createNewChat}
              title="Start New Chat"
              aria-label="New chat"
            >
              <Plus size={20} strokeWidth={2.2} />
            </button>
            <button
              className="m-icon-btn m-history-btn"
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              title="View Chat History"
              aria-label="View history"
            >
              <History size={20} strokeWidth={2.2} />
            </button>
          </div>
        </header>

        {/* Internal Scrollable Main Chat Area */}
        <main className="m-chat-scroll" ref={chatScrollRef}>
          {/* Top Hero Section */}
          <div className="m-hero-section">
            <div className="m-robot-wrapper">
              <div className="m-robot-glow-ring" />
              {/* Cute Waving 3D-styled Robot Vector Graphic */}
              <div className="m-robot-character">
                <svg
                  width="110"
                  height="110"
                  viewBox="0 0 120 120"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="botGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#818CF8" />
                      <stop offset="100%" stopColor="#4F46E5" />
                    </linearGradient>
                    <linearGradient id="faceGrad" x1="0" y1="0" x2="0" y2="60" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#312E81" />
                      <stop offset="100%" stopColor="#1E1B4B" />
                    </linearGradient>
                    <filter id="shadow" x="-10" y="-10" width="140" height="140" filterUnits="userSpaceOnUse">
                      <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#4F46E5" floodOpacity="0.25" />
                    </filter>
                  </defs>
                  <g filter="url(#shadow)">
                    <rect x="24" y="24" width="72" height="60" rx="30" fill="url(#botGrad)" />
                    <rect x="28" y="28" width="64" height="52" rx="26" fill="#FFFFFF" />

                    <rect x="34" y="34" width="52" height="40" rx="18" fill="url(#faceGrad)" />

                    <path d="M44 52 Q50 44 56 52" stroke="#60A5FA" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                    <path d="M64 52 Q70 44 76 52" stroke="#60A5FA" strokeWidth="4.5" strokeLinecap="round" fill="none" />

                    <circle cx="42" cy="58" r="3" fill="#F472B6" opacity="0.8" />
                    <circle cx="78" cy="58" r="3" fill="#F472B6" opacity="0.8" />

                    <rect x="14" y="42" width="12" height="24" rx="6" fill="#4F46E5" />
                    <rect x="94" y="42" width="12" height="24" rx="6" fill="#4F46E5" />
                    <circle cx="20" cy="54" r="3" fill="#60A5FA" />
                    <circle cx="100" cy="54" r="3" fill="#60A5FA" />

                    <line x1="60" y1="24" x2="60" y2="14" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="60" cy="12" r="5" fill="#60A5FA" />

                    <path d="M42 86 C42 86 60 92 78 86 C82 102 74 112 60 112 C46 112 38 102 42 86 Z" fill="#FFFFFF" />
                    <circle cx="60" cy="98" r="8" fill="#4F46E5" />
                    <path d="M57 98 L60 95 L63 98 L60 101 Z" fill="#FFFFFF" />

                    <g className="m-waving-arm">
                      <path d="M94 65 Q108 55 104 42" stroke="#4F46E5" strokeWidth="6" strokeLinecap="round" fill="none" />
                      <circle cx="104" cy="40" r="5" fill="#4F46E5" />
                    </g>
                  </g>
                </svg>
              </div>
            </div>

            <h1 className="m-welcome-title">
              Hello! I'm <span className="m-blue-text">Ozoco</span> ChatBuddy
            </h1>

            <div className="m-online-status">
              <span className="m-green-dot" />
              <span>Online</span>
            </div>

            <p className="m-welcome-sub">
              Your hospital friend is here to help you.<br />
              Ask me anything about your hospital.
            </p>
          </div>

          {/* Suggested FAQ Action Pills */}
          <div className="m-faq-list" aria-label="Suggested questions">
            {suggestedPrompts.map(({ icon: Icon, text }) => (
              <button
                key={text}
                type="button"
                className="m-faq-pill"
                onClick={() => sendQuestion(text)}
                disabled={isSending || voiceLoading}
              >
                <div className="m-faq-left">
                  <span className="m-faq-icon">
                    <Icon size={18} />
                  </span>
                  <span className="m-faq-text">{text}</span>
                </div>
                <ArrowRight size={18} className="m-faq-arrow" />
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="m-messages-stream">
            {messages.map((msg) => (
              <div key={msg.id} className={`m-msg-wrapper ${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="m-msg-avatar">
                    <Bot size={17} strokeWidth={2.4} />
                  </div>
                )}

                <div className="m-msg-content-block">
                  <div className="m-msg-bubble">
                    <p>{msg.content}</p>
                  </div>
                  <div className="m-msg-time">
                    <span>{msg.time || "9:41 AM"}</span>
                    {msg.role === "user" && (
                      <span className="m-checkmarks" title="Delivered">
                        ✓✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {(isSending || voiceLoading) && (
              <div className="m-msg-wrapper assistant">
                <div className="m-msg-avatar">
                  <Bot size={17} />
                </div>
                <div className="m-msg-bubble m-thinking">
                  <span className="m-dot" />
                  <span className="m-dot" />
                  <span className="m-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Floating Input & Upload Controls Bar */}
        <footer className="m-composer-area">
          {/* PDF Upload Card Pill */}
          <div className="m-upload-pill-wrap">
            <button
              className="m-upload-pill"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <div className="m-upload-icon-box">
                {isUploading ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <FileText size={18} />
                )}
              </div>
              <div className="m-upload-info">
                <strong className="m-upload-title">
                  {documentMeta ? documentMeta.filename : "Upload PDF"}
                </strong>
                <span className="m-upload-sub">
                  {documentMeta
                    ? `${documentMeta.pages || 1} pages attached`
                    : "PDF up to 20MB"}
                </span>
              </div>
              {documentMeta ? (
                <CheckCircle2 size={18} className="m-upload-check" />
              ) : null}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* Voice Status & Error Notes */}
          {(voiceStatus || voiceError || error) && (
            <div className={`m-voice-status-pill ${voiceError || error ? "is-error" : ""}`}>
              <span>{voiceError || error || voiceStatus}</span>
            </div>
          )}

          {/* Main Input Controls Pill */}
          <form className="m-input-box" onSubmit={handleSendSubmit}>
            <button
              className="m-plus-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Add attachment"
            >
              <Plus size={20} strokeWidth={2.4} />
            </button>

            {isRecording ? (
              <div className="m-recording-meter" aria-label="Live Voice Equalizer">
                {Array.from({ length: 18 }).map((_, index) => {
                  const distanceFromCenter = Math.abs(index - 8.5) / 8.5;
                  const baseHeight = 0.2 + (1 - distanceFromCenter) * 0.25;
                  const height = Math.max(
                    0.15,
                    Math.min(1, baseHeight + voiceLevel * (0.95 - distanceFromCenter * 0.35))
                  );
                  return <span key={index} style={{ "--bar-height": height }} />;
                })}
              </div>
            ) : (
              <input
                className="m-text-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={isSending || voiceLoading}
              />
            )}

            <div className="m-input-actions">
              <button
                className={`m-mic-btn ${isRecording ? "is-recording" : ""}`}
                type="button"
                onClick={handleMicClick}
                disabled={voiceLoading}
                aria-label={isRecording ? "Stop voice recording" : "Start voice input"}
              >
                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {!isRecording && (
                <button
                  className="m-send-btn"
                  type="submit"
                  disabled={isSending || voiceLoading || !input.trim()}
                  aria-label="Send message"
                >
                  {isSending || voiceLoading ? (
                    <LoaderCircle className="spin" size={18} />
                  ) : (
                    <Send size={18} strokeWidth={2.4} />
                  )}
                </button>
              )}
            </div>
          </form>
        </footer>

        {/* Slide-over Left Menu Drawer */}
        {isMenuOpen && (
          <div className="m-drawer-backdrop" onClick={() => setIsMenuOpen(false)}>
            <div className="m-drawer-panel" onClick={(e) => e.stopPropagation()}>
              <div className="m-drawer-header">
                <div className="m-brand-logo">
                  <div className="m-brand-avatar">
                    <Bot size={18} />
                  </div>
                  <div className="m-brand-title">
                    <span className="m-ozoco">ozoco</span>
                    <span className="m-chatbuddy">ChatBuddy</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="m-icon-btn"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="m-drawer-body">
                {/* "+ Start New Chat" Button */}
                <button
                  type="button"
                  className="m-new-chat-btn"
                  onClick={createNewChat}
                >
                  <Plus size={18} strokeWidth={2.4} />
                  Start New Chat
                </button>

                {/* Saved Chat Conversations */}
                <div className="m-drawer-section" style={{ marginTop: "16px" }}>
                  <h3>Conversations ({sessions.length})</h3>
                  <div className="m-sessions-list">
                    {sessions.map((session) => {
                      const isActive = session.id === activeSessionId;
                      const msgCount = session.messages ? session.messages.length : 0;
                      return (
                        <div
                          key={session.id}
                          className={`m-session-item ${isActive ? "is-active" : ""}`}
                          onClick={() => switchChat(session.id)}
                        >
                          <div className="m-session-left">
                            <MessageSquare
                              size={17}
                              className={isActive ? "m-blue-text" : ""}
                            />
                            <div className="m-session-info">
                              <span className="m-session-title">
                                {session.title || "Chat Conversation"}
                              </span>
                              <span className="m-session-meta">
                                {msgCount} {msgCount === 1 ? "message" : "messages"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="m-session-delete"
                            onClick={(e) => deleteChat(session.id, e)}
                            title="Delete conversation"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="m-drawer-section">
                  <h3>Hospital Services</h3>
                  <ul>
                    <li>
                      <Hospital size={18} /> About Hospital
                    </li>
                    <li>
                      <Stethoscope size={18} /> Departments & Doctors
                    </li>
                    <li>
                      <CalendarDays size={18} /> Appointments & Booking
                    </li>
                    <li>
                      <ShieldCheck size={18} /> Insurance & Billing
                    </li>
                  </ul>
                </div>

                <div className="m-drawer-section">
                  <h3>Languages</h3>
                  <div className="m-lang-chips">
                    <span className="active">English</span>
                    <span>हिंदी</span>
                    <span>বাংলা</span>
                    <span>தமிழ்</span>
                    <span>తెలుగు</span>
                  </div>
                </div>

                <div className="m-drawer-footer">
                  <button
                    type="button"
                    className="m-clear-btn"
                    onClick={clearChatHistory}
                  >
                    <Trash2 size={18} />
                    Clear Active Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slide-over Right History Drawer */}
        {isHistoryOpen && (
          <div className="m-drawer-backdrop" onClick={() => setIsHistoryOpen(false)}>
            <div className="m-drawer-panel right" onClick={(e) => e.stopPropagation()}>
              <div className="m-drawer-header">
                <h3>Chat Conversations</h3>
                <button
                  type="button"
                  className="m-icon-btn"
                  onClick={() => setIsHistoryOpen(false)}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="m-drawer-body">
                {/* "+ New Chat" Action Button */}
                <button
                  type="button"
                  className="m-new-chat-btn"
                  onClick={createNewChat}
                >
                  <Plus size={18} strokeWidth={2.4} />
                  Start New Chat
                </button>

                {/* List of Saved Chat Conversations */}
                <div className="m-drawer-section" style={{ marginTop: "16px" }}>
                  <h3>Saved History ({sessions.length})</h3>
                  <div className="m-sessions-list">
                    {sessions.map((session) => {
                      const isActive = session.id === activeSessionId;
                      const msgCount = session.messages ? session.messages.length : 0;
                      return (
                        <div
                          key={session.id}
                          className={`m-session-item ${isActive ? "is-active" : ""}`}
                          onClick={() => switchChat(session.id)}
                        >
                          <div className="m-session-left">
                            <MessageSquare
                              size={17}
                              className={isActive ? "m-blue-text" : ""}
                            />
                            <div className="m-session-info">
                              <span className="m-session-title">
                                {session.title || "Chat Conversation"}
                              </span>
                              <span className="m-session-meta">
                                {msgCount} {msgCount === 1 ? "message" : "messages"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="m-session-delete"
                            onClick={(e) => deleteChat(session.id, e)}
                            title="Delete conversation"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Uploaded PDF metadata info */}
                {documentMeta && (
                  <div className="m-history-card" style={{ marginTop: "16px" }}>
                    <FileText size={20} />
                    <div>
                      <strong>{documentMeta.filename}</strong>
                      <span>{documentMeta.pages || 1} pages parsed</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleEllipsis,
  Clock3,
  CreditCard,
  FileText,
  FlaskConical,
  Globe2,
  History,
  Info,
  LoaderCircle,
  Mic,
  MicOff,
  MoreHorizontal,
  RefreshCw,
  Send,
  ShieldCheck,
  Square,
  Stethoscope,
  UploadCloud,
  UsersRound,
} from "lucide-react";

const initialMessages = [
  {
    role: "assistant",
    content:
      "Hello! I'm Ozoco ChatBuddy. Upload a hospital document or ask me anything about your hospital.",
  },
];

const helpTopics = [
  { icon: Building2, label: "Information about your hospital" },
  { icon: UsersRound, label: "Departments & Services" },
  { icon: Stethoscope, label: "Doctors & Specializations" },
  { icon: CalendarDays, label: "Appointments & Timings" },
  { icon: FlaskConical, label: "Tests & Procedures" },
  { icon: CreditCard, label: "Billing & Insurance" },
  { icon: CircleEllipsis, label: "And much more..." },
];

const suggestedPrompts = [
  { icon: Clock3, text: "What are the visiting hours?" },
  { icon: Building2, text: "List of departments in the hospital" },
];

export default function Chatwindow() {
  const [messages, setMessages] = useState(() => {
    // Load persisted messages on first render
    try {
      const saved = window.localStorage.getItem("ozocoChatMessages");
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return initialMessages;
  });
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isStreamingAnswer, setIsStreamingAnswer] = useState(false);
  const [error, setError] = useState("");
  const [storedFilename, setStoredFilename] = useState("");
  const [threadId, setThreadId] = useState("");
  const [documentMeta, setDocumentMeta] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [isStreamingVoice, setIsStreamingVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const fileInputRef = useRef(null);
  const messageListRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const voiceMeterRef = useRef({
    audioContext: null,
    analyser: null,
    frameId: null,
    heardVoice: false,
    lastLevelUpdate: 0,
  });

  const hasConversation = messages.length > 1;
  const showStarterPrompts = !hasConversation && !isSending && !voiceLoading;
  const currentFilename = documentMeta?.filename || "City Hospital Guide.pdf";
  const fileMeta = documentMeta?.pages
    ? `${documentMeta.pages} pages - Uploaded just now`
    : "PDF only, up to 20MB";

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      window.localStorage.setItem("ozocoChatMessages", JSON.stringify(messages));
    } catch { /* quota exceeded, ignore */ }
  }, [messages]);

  useEffect(() => {
    const list = messageListRef.current;
    const end = messagesEndRef.current;

    if (!list && !end) return;

    const scrollToLatest = () => {
      if (end) {
        end.scrollIntoView({ behavior: "smooth", block: "end" });
      }

      if (list) {
        list.scrollTo({
          top: list.scrollHeight,
          behavior: "smooth",
        });
      }
    };

    requestAnimationFrame(scrollToLatest);
  }, [messages, isSending, voiceLoading]);

  useEffect(() => {
    const savedDocument = window.localStorage.getItem("ozocoUploadedDocument");
    if (!savedDocument) return;

    try {
      const payload = JSON.parse(savedDocument);
      setStoredFilename(payload.stored_filename || "");
      setThreadId(payload.thread_id || "");
      setDocumentMeta({
        filename: payload.original_filename || "Uploaded document",
        stored_filename: payload.stored_filename || "",
        pages: payload.pages || 0,
        thread_id: payload.thread_id || "",
      });
    } catch {
      window.localStorage.removeItem("ozocoUploadedDocument");
    }
  }, []);

  const goHome = () => {
    window.history.pushState({}, "", "/");
    window.dispatchEvent(new Event("app:navigation"));
  };

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return { data, isJson: true, contentType };
    }

    if (contentType.includes("audio")) {
      const blob = await response.blob();
      return { data: blob, isAudio: true, contentType };
    }

    const text = await response.text();
    return { data: text, isJson: false, contentType };
  };

  const chooseFile = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setError("");
    setMessages((prev) => [...prev, { role: "user", content: `Uploaded ${file.name}` }]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/documents/upload", {
        method: "POST",
        body: formData,
      });

      const { data, isJson } = await parseResponse(response);

      if (!response.ok) {
        const message = isJson ? data?.detail || data?.message || "The document could not be processed." : data || "The document could not be processed.";
        throw new Error(message);
      }

      const payload = isJson ? data : {};
      setStoredFilename(payload.stored_filename || "");
      setThreadId(payload.thread_id || "");
      setDocumentMeta({
        filename: payload.original_filename || file.name,
        stored_filename: payload.stored_filename || "",
        pages: payload.pages || 0,
        thread_id: payload.thread_id || "",
      });
      window.localStorage.setItem("ozocoUploadedDocument", JSON.stringify(payload));

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: payload.llm_response || payload.response || "Document ready. Ask me anything about it.",
        },
      ]);
    } catch (err) {
      setError(err.message || "Something went wrong while uploading the document.");
    } finally {
      setIsUploading(false);
    }
  };

  const sendQuestion = async (question) => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isSending) return;

    setInput("");
    setError("");
    setIsSending(true);
    setMessages((prev) => [...prev, { role: "user", content: trimmedQuestion }]);

    try {
      const response = await fetch("/documents/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedQuestion,
          thread_id: threadId || undefined,
          stored_filename: storedFilename || undefined,
        }),
      });

      if (!response.ok) {
        const { data, isJson } = await parseResponse(response);
        const message = isJson ? data?.detail || data?.message || "The assistant could not answer right now." : data || "The assistant could not answer right now.";
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Streaming is not supported by this browser.");
      }

      let assistantReply = "";
      let buffer = "";
      const decoder = new TextDecoder();
      const reader = response.body.getReader();

      setIsStreamingAnswer(true);
      setMessages((prev) => [...prev, { role: "assistant", content: "Thinking..." }]);

      const updateAssistantMessage = (content) => {
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
            next[lastIndex] = {
              ...next[lastIndex],
              content: content || "Thinking...",
            };
          }
          return next;
        });
      };

      const handleEvent = (rawEvent) => {
        const dataLine = rawEvent
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!dataLine) return;

        const payload = JSON.parse(dataLine.slice(5).trim());

        if (payload.type === "token") {
          if (typeof payload.content !== "string") return;
          assistantReply += payload.content;
          updateAssistantMessage(assistantReply);
          return;
        }

        if (payload.type === "done") {
          if (payload.thread_id) {
            setThreadId(payload.thread_id);
          }
          if (!assistantReply && payload.response) {
            assistantReply = payload.response;
            updateAssistantMessage(assistantReply);
          }
          return;
        }

        if (payload.type === "error") {
          throw new Error(payload.message || "The assistant could not answer right now.");
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
      if (buffer.trim()) {
        handleEvent(buffer);
      }

      if (!assistantReply) {
        updateAssistantMessage("I received your question, but no response text came back.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong while sending your question.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't send that question. Please try again.",
        },
      ]);
    } finally {
      setIsStreamingAnswer(false);
      setIsSending(false);
    }
  };

  const handleSend = (event) => {
    event.preventDefault();
    sendQuestion(input);
  };

  // ---------------------------------------------------------------
  // Voice: play base64-encoded MP3 audio
  // ---------------------------------------------------------------

  const playBase64Audio = (base64Data) => {
    if (!base64Data) return;
    try {
      const byteChars = atob(base64Data);
      const byteNumbers = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteNumbers[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteNumbers], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play().catch((err) => console.error("Audio playback error:", err));
      audio.addEventListener("ended", () => URL.revokeObjectURL(url));
    } catch (err) {
      console.error("Failed to decode base64 audio:", err);
    }
  };

  // ---------------------------------------------------------------
  // Voice: send recorded/uploaded audio to /documents/voice
  // ---------------------------------------------------------------

  const sendVoiceFile = async (file) => {
    if (!file) return;

    setVoiceError("");
    setVoiceStatus("Sending voice request...");
    setVoiceLoading(true);
    setIsStreamingVoice(false);

    const formData = new FormData();
    formData.append("audio", file, file.name);
    if (threadId) formData.append("thread_id", threadId);
    if (storedFilename) formData.append("stored_filename", storedFilename);

    let hasTranscript = false;

    try {
      const response = await fetch("/documents/voice/stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const { data, isJson } = await parseResponse(response);
        const message = isJson
          ? data?.detail || data?.message || "Voice request failed."
          : data || "Voice request failed.";
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error("Streaming is not supported by this browser.");
      }

      let assistantReply = "";
      let buffer = "";
      let hasAssistantMessage = false;
      const decoder = new TextDecoder();
      const reader = response.body.getReader();

      const updateAssistantMessage = (content) => {
        setMessages((prev) => {
          const next = [...prev];
          const lastIndex = next.length - 1;
          if (lastIndex >= 0 && next[lastIndex].role === "assistant") {
            next[lastIndex] = {
              ...next[lastIndex],
              content: content || "Thinking...",
            };
          }
          return next;
        });
      };

      const ensureAssistantMessage = () => {
        if (hasAssistantMessage) return;
        hasAssistantMessage = true;
        setIsStreamingVoice(true);
        setMessages((prev) => [...prev, { role: "assistant", content: "Thinking..." }]);
      };

      const handleEvent = (rawEvent) => {
        const dataLine = rawEvent
          .split("\n")
          .find((line) => line.startsWith("data:"));

        if (!dataLine) return;

        const payload = JSON.parse(dataLine.slice(5).trim());

        if (payload.type === "status") {
          setVoiceStatus(payload.message || "");
          return;
        }

        if (payload.type === "transcript") {
          const transcript = (payload.text || "").trim();
          if (!transcript) return;
          hasTranscript = true;
          setIsStreamingVoice(true);
          setVoiceStatus("Writing the answer...");
          setMessages((prev) => [...prev, { role: "user", content: transcript }]);
          return;
        }

        if (payload.type === "token") {
          if (typeof payload.content !== "string") return;
          ensureAssistantMessage();
          assistantReply += payload.content;
          updateAssistantMessage(assistantReply);
          return;
        }

        if (payload.type === "done") {
          ensureAssistantMessage();
          if (payload.thread_id) {
            setThreadId(payload.thread_id);
          }
          if (!assistantReply && payload.response) {
            assistantReply = payload.response;
            updateAssistantMessage(assistantReply);
          }
          return;
        }

        if (payload.type === "audio") {
          if (payload.audio_base64) {
            playBase64Audio(payload.audio_base64);
          }
          return;
        }

        if (payload.type === "voice_done") {
          if (payload.thread_id) {
            setThreadId(payload.thread_id);
          }
          if (!assistantReply && payload.response) {
            ensureAssistantMessage();
            assistantReply = payload.response;
            updateAssistantMessage(assistantReply);
          }
          setVoiceStatus("Voice response added to chat.");
          return;
        }

        if (payload.type === "error") {
          throw new Error(payload.message || "Voice request failed.");
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
      if (buffer.trim()) {
        handleEvent(buffer);
      }

      if (!hasTranscript) {
        throw new Error("No voice detected. Please speak louder or hold the microphone closer and try again.");
      }

      if (hasAssistantMessage && !assistantReply) {
        updateAssistantMessage("Voice response received.");
      }
    } catch (err) {
      setVoiceError(err.message || "Unable to process voice audio.");
      setMessages((prev) => [
        ...prev,
        ...(!hasTranscript ? [{ role: "user", content: "Voice message" }] : []),
        {
          role: "assistant",
          content: "I couldn't process that voice message. Please try again.",
        },
      ]);
    } finally {
      setIsStreamingVoice(false);
      setVoiceLoading(false);
    }
  };

  const handleVoiceFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await sendVoiceFile(file);
    event.target.value = "";
  };

  const stopVoiceMeter = () => {
    const meter = voiceMeterRef.current;
    if (meter.frameId) {
      cancelAnimationFrame(meter.frameId);
    }
    if (meter.audioContext) {
      meter.audioContext.close().catch(() => {});
    }
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
      for (let i = 0; i < samples.length; i += 1) {
        const centered = (samples[i] - 128) / 128;
        sum += centered * centered;
      }

      const rms = Math.sqrt(sum / samples.length);
      if (rms > 0.025) {
        voiceMeterRef.current.heardVoice = true;
      }

      const now = performance.now();
      if (now - voiceMeterRef.current.lastLevelUpdate > 80) {
        voiceMeterRef.current.lastLevelUpdate = now;
        setVoiceLevel(Math.min(1, rms * 12));
      }

      voiceMeterRef.current.frameId = requestAnimationFrame(measure);
    };

    measure();
  };

  const getVoiceMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";

    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
    return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  };

  const getVoiceFileExtension = (mimeType) => {
    if (!mimeType) return "webm";
    if (mimeType.includes("wav")) return "wav";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("mp4")) return "m4a";
    if (mimeType.includes("mpeg")) return "mp3";
    return "webm";
  };

  const startVoiceRecording = async () => {
    setVoiceError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Your browser does not support voice recording.");
      return;
    }

    try {
      console.log("[Voice] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
      console.log("[Voice] Microphone access granted.");
      recordingChunksRef.current = [];
      startVoiceMeter(stream);

      const mimeType = getVoiceMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
          console.log(`[Voice] Chunk received: ${event.data.size} bytes`);
        }
      });

      const recordingStartTime = Date.now();

      recorder.addEventListener("stop", async () => {
        stopVoiceMeter();
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        const durationMs = Date.now() - recordingStartTime;
        const totalSize = recordingChunksRef.current.reduce((sum, c) => sum + c.size, 0);
        console.log(`[Voice] Recording stopped. ${recordingChunksRef.current.length} chunks, ${totalSize} bytes total, duration=${durationMs}ms, mimeType=${recorder.mimeType}`);

        // Require at least 1 second of recording for Whisper to work
        if (durationMs < 1000) {
          setVoiceStatus("");
          setVoiceError("Recording was too short. Please hold for at least 1 second.");
          return;
        }

        const blobMime = recorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(recordingChunksRef.current, { type: blobMime });
        if (recordedBlob.size === 0) {
          setVoiceStatus("");
          setVoiceError("No audio was captured. Please try again.");
          return;
        }

        console.log(`[Voice] Sending ${recordedBlob.size} bytes (${blobMime}) to backend...`);
        setVoiceStatus("Processing your voice...");
        const extension = getVoiceFileExtension(blobMime);
        const file = new File([recordedBlob], `voice-${Date.now()}.${extension}`, { type: blobMime });
        await sendVoiceFile(file);
      });

      // Use timeslice (250ms) so dataavailable fires regularly,
      // not just once at the end — avoids empty-recording bugs.
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setVoiceStatus("🎙️ Recording... click the microphone again to stop.");
    } catch (err) {
      stopVoiceMeter();
      console.error("[Voice] Microphone error:", err);
      setVoiceError(err.message || "Unable to start voice recording.");
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    console.log("[Voice] Stopping recorder...");
    recorder.stop();
    mediaRecorderRef.current = null;
  };

  const handleVoiceRecordClick = () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }
    startVoiceRecording();
  };

  return (
    <div className="cb-app">
      <header className="cb-topbar">
        <button className="cb-brand" type="button" onClick={goHome} aria-label="Go to home">
          <span className="cb-brand-mark">
            <Bot size={23} strokeWidth={2.4} />
          </span>
          <span>
            ozoco
            <strong>ChatBuddy</strong>
          </span>
        </button>

        <div className="cb-top-actions">
          <button className="cb-chip-button" type="button">
            <Globe2 size={20} />
            English
            <ChevronDown size={18} />
          </button>
          <button
            className={`cb-chip-button cb-voice-toggle ${isRecording ? "is-recording" : ""}`}
            type="button"
            onClick={handleVoiceRecordClick}
            disabled={voiceLoading}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            {isRecording ? "Listening" : "Voice Chat"}
          </button>
          <button className="cb-chip-button" type="button">
            <History size={20} />
            History
          </button>
        </div>
      </header>

      <main className="cb-shell">
        <aside className="cb-sidebar" aria-label="Hospital documents">
          <section className="cb-side-section">
            <div className="cb-section-title">
              <span className="cb-icon-badge"><FileText size={20} /></span>
              <h1>Hospital Documents</h1>
              <Info size={20} className="cb-muted-icon" />
            </div>
            <p className="cb-side-copy">Upload your hospital documents (PDF) to get better and accurate answers.</p>

            <button
              className="cb-dropzone"
              type="button"
              onClick={chooseFile}
              disabled={isUploading}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) handleUpload(file);
              }}
            >
              {isUploading ? <LoaderCircle className="spin" size={50} /> : <UploadCloud size={52} />}
              <strong>{isUploading ? "Uploading PDF" : "Upload PDF"}</strong>
              <span>Drag & drop your file here or click to browse</span>
              <small>PDF only, up to 20MB</small>
            </button>

            <input
              ref={fileInputRef}
              className="file-input"
              type="file"
              accept=".pdf,application/pdf"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleUpload(file);
                event.target.value = "";
              }}
            />

            <div className="cb-file-card">
              <span className="cb-pdf-icon">PDF</span>
              <div>
                <strong>{currentFilename}</strong>
                <span>{documentMeta ? fileMeta : "Upload a PDF to begin"}</span>
              </div>
              {documentMeta ? <CheckCircle2 size={22} /> : null}
            </div>

            <button className="cb-reupload" type="button" onClick={chooseFile} disabled={isUploading}>
              <RefreshCw size={19} />
              Reupload
            </button>

            {error ? <div className="cb-error">{error}</div> : null}

            <div className="cb-ready-card">
              <CheckCircle2 size={28} />
              <div>
                <strong>{documentMeta ? "Document Ready" : "Ready when you are"}</strong>
                <span>
                  {documentMeta
                    ? "Ozoco ChatBuddy will use this document to answer your questions."
                    : "Upload a document or start with a general hospital question."}
                </span>
              </div>
            </div>
          </section>

          <section className="cb-help-card">
            <h2>What can I help you with?</h2>
            <ul>
              {helpTopics.map(({ icon: Icon, label }) => (
                <li key={label}>
                  <Icon size={21} />
                  {label}
                </li>
              ))}
            </ul>
          </section>

          <section className="cb-safe-card">
            <ShieldCheck size={24} />
            <div>
              <strong>Your data is safe with us</strong>
              <span>We never share your documents or conversations.</span>
            </div>
          </section>
        </aside>

        <section className="cb-chat-card" aria-label="Ozoco ChatBuddy">
          <header className="cb-chat-header">
            <div className="cb-mini-avatar">
              <Bot size={21} />
            </div>
            <div>
              <h2>Ozoco ChatBuddy</h2>
              <p><span />Online</p>
            </div>
            <button type="button" aria-label="More options">
              <MoreHorizontal size={25} />
            </button>
          </header>

          <div className={`cb-chat-main ${hasConversation ? "has-messages" : ""}`}>
            {!hasConversation ? (
              <div className="cb-welcome">
                <div className="cb-robot" aria-hidden="true">
                  <div className="cb-robot-head">
                    <span />
                  </div>
                  <div className="cb-robot-body">
                    <Bot size={37} />
                  </div>
                </div>
                <h2>
                  Hello! I'm <span>Ozoco</span> ChatBuddy
                </h2>
                <p>Your hospital friend is here to help you. Ask me anything about your hospital.</p>
                <div className="cb-document-pill">
                  <FileText size={17} />
                  Based on your uploaded document
                </div>
              </div>
            ) : (
              <div className="cb-message-list" ref={messageListRef}>
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`cb-message ${message.role}`}>
                    <span>{message.role === "user" ? "You" : "Ozoco ChatBuddy"}</span>
                    <p>{message.content}</p>
                    {message.audioUrl ? <audio controls preload="none" src={message.audioUrl} /> : null}
                  </div>
                ))}
                {(isSending && !isStreamingAnswer) || (voiceLoading && !isStreamingVoice) ? (
                  <div className="cb-message assistant">
                    <span>Ozoco ChatBuddy</span>
                    <p>{voiceLoading ? "Processing your voice message..." : "Thinking..."}</p>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            )}

            {showStarterPrompts ? (
              <div className="cb-suggestions">
                <strong>Try asking something like:</strong>
                <div>
                  {suggestedPrompts.map(({ icon: Icon, text }) => (
                    <button key={text} type="button" onClick={() => sendQuestion(text)} disabled={isSending}>
                      <Icon size={18} />
                      <span>{text}</span>
                      <ArrowRight size={18} />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <footer className="cb-composer-wrap">
            <form className={`cb-composer ${isRecording ? "is-recording" : ""}`} onSubmit={handleSend}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type your message here..."
                disabled={isSending}
              />
              {isRecording ? (
                <div className="cb-recording-meter" aria-label="Voice level">
                  {Array.from({ length: 18 }).map((_, index) => {
                    const distanceFromCenter = Math.abs(index - 8.5) / 8.5;
                    const baseHeight = 0.18 + (1 - distanceFromCenter) * 0.25;
                    const height = Math.max(0.12, Math.min(1, baseHeight + voiceLevel * (0.95 - distanceFromCenter * 0.35)));
                    return (
                      <span
                        key={index}
                        style={{ "--bar-height": height }}
                      />
                    );
                  })}
                </div>
              ) : null}
              <button
                className={`cb-mic-button ${isRecording ? "is-recording" : ""}`}
                type="button"
                aria-label={isRecording ? "Stop voice input" : "Start voice input"}
                onClick={handleVoiceRecordClick}
                disabled={voiceLoading}
              >
                {isRecording ? <MicOff size={23} /> : <Mic size={23} />}
              </button>
              {isRecording ? (
                <button
                  className="cb-stop-recording-button"
                  type="button"
                  aria-label="Stop recording"
                  onClick={stopVoiceRecording}
                >
                  <Square size={18} fill="currentColor" />
                </button>
              ) : null}
              <button className="cb-send-button" type="submit" aria-label="Send message" disabled={isSending || !input.trim()}>
                {isSending ? <LoaderCircle className="spin" size={22} /> : <Send size={23} />}
              </button>
            </form>

            <label className="cb-audio-upload">
              Upload audio
              <input type="file" accept="audio/*" hidden onChange={handleVoiceFileSelect} />
            </label>

            {(voiceStatus || voiceError) ? (
              <p className={`cb-voice-note ${voiceError ? "is-error" : ""}`}>
                {voiceError || voiceStatus}
                <Info size={17} />
              </p>
            ) : (
              <p className="cb-voice-note">
                You can also use voice chat by clicking the microphone.
                <Info size={17} />
              </p>
            )}
          </footer>
        </section>
      </main>
    </div>
  );
}

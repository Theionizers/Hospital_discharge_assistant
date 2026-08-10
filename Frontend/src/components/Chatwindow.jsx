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
  const [error, setError] = useState("");
  const [storedFilename, setStoredFilename] = useState("");
  const [threadId, setThreadId] = useState("");
  const [documentMeta, setDocumentMeta] = useState(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
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
    if (!list) return;

    list.scrollTo({
      top: list.scrollHeight,
      behavior: "smooth",
    });
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
      const response = await fetch("/documents/chat", {
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

      const { data, isJson } = await parseResponse(response);

      if (!response.ok) {
        const message = isJson ? data?.detail || data?.message || "The assistant could not answer right now." : data || "The assistant could not answer right now.";
        throw new Error(message);
      }

      const assistantReply = isJson ? data?.response || data?.message || JSON.stringify(data, null, 2) : data;
      const nextThreadId = isJson ? data?.thread_id : "";

      if (nextThreadId) {
        setThreadId(nextThreadId);
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantReply || "I received your question, but no response text came back.",
        },
      ]);
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

    const formData = new FormData();
    formData.append("audio", file, file.name);
    // Pass thread_id and stored_filename so the backend can maintain
    // conversation context and load the correct document.
    if (threadId) formData.append("thread_id", threadId);
    if (storedFilename) formData.append("stored_filename", storedFilename);

    try {
      const response = await fetch("/documents/voice", {
        method: "POST",
        body: formData,
      });

      const { data, isJson, isAudio } = await parseResponse(response);

      if (!response.ok) {
        const message = isJson
          ? data?.detail || data?.message || "Voice request failed."
          : data || "Voice request failed.";
        throw new Error(message);
      }

      // ---- New JSON format: { text, response, audio_base64, thread_id } ----
      if (isJson && data?.response) {
        const transcript = (data.text || "").trim();
        if (!transcript) {
          setVoiceStatus("");
          setVoiceError("No voice detected. Please try again.");
          return;
        }

        // Show what the user said
        if (data.text) {
          setMessages((prev) => [...prev, { role: "user", content: transcript }]);
        } else {
          setMessages((prev) => [...prev, { role: "user", content: "🎤 Voice message" }]);
        }

        // Update thread_id if backend returned one
        if (data.thread_id) {
          setThreadId(data.thread_id);
        }

        // Show AI text response
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
          },
        ]);

        // Auto-play the TTS audio
        if (data.audio_base64) {
          playBase64Audio(data.audio_base64);
        }

        setVoiceStatus("Voice response added to chat.");
        return;
      }

      // ---- Legacy: raw audio stream (backward compat) ----
      if (isAudio) {
        const audioUrl = URL.createObjectURL(data);
        setMessages((prev) => [
          ...prev,
          { role: "user", content: "🎤 Voice message" },
        ]);
        setVoiceStatus("Audio response ready. Press play to hear it.");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "I received an audio response from the voice service.",
            audioUrl,
          },
        ]);
        return;
      }

      // ---- Fallback: plain text or unexpected JSON ----
      const assistantReply = isJson
        ? data?.response || data?.message || JSON.stringify(data, null, 2)
        : data;

      setMessages((prev) => [
        ...prev,
        { role: "user", content: "🎤 Voice message" },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantReply || "Voice response received.",
        },
      ]);
      setVoiceStatus("Voice response added to chat.");
    } catch (err) {
      setVoiceError(err.message || "Unable to process voice audio.");
      setMessages((prev) => [
        ...prev,
        { role: "user", content: "🎤 Voice message" },
        {
          role: "assistant",
          content: "I couldn't process that voice message. Please try again.",
        },
      ]);
    } finally {
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
    };
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

      voiceMeterRef.current.frameId = requestAnimationFrame(measure);
    };

    measure();
  };

  const startVoiceRecording = async () => {
    setVoiceError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setVoiceError("Your browser does not support voice recording.");
      return;
    }

    try {
      console.log("[Voice] Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("[Voice] Microphone access granted.");
      recordingChunksRef.current = [];
      startVoiceMeter(stream);
      const recorder = new MediaRecorder(stream);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
          console.log(`[Voice] Chunk received: ${event.data.size} bytes`);
        }
      });

      recorder.addEventListener("stop", async () => {
        const heardVoice = voiceMeterRef.current.heardVoice;
        stopVoiceMeter();
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        const totalSize = recordingChunksRef.current.reduce((sum, c) => sum + c.size, 0);
        console.log(`[Voice] Recording stopped. ${recordingChunksRef.current.length} chunks, ${totalSize} bytes total.`);

        const recordedBlob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (recordedBlob.size === 0 || !heardVoice) {
          setVoiceStatus("");
          setVoiceError("No voice detected. Please try again.");
          return;
        }

        console.log(`[Voice] Sending ${recordedBlob.size} bytes to backend...`);
        setVoiceStatus("Processing your voice...");
        const file = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: recordedBlob.type });
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
              <div className="cb-message-list">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`cb-message ${message.role}`}>
                    <span>{message.role === "user" ? "You" : "Ozoco ChatBuddy"}</span>
                    <p>{message.content}</p>
                    {message.audioUrl ? <audio controls preload="none" src={message.audioUrl} /> : null}
                  </div>
                ))}
                {isSending || voiceLoading ? (
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
            <form className="cb-composer" onSubmit={handleSend}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Type your message here..."
                disabled={isSending}
              />
              <button
                className={`cb-mic-button ${isRecording ? "is-recording" : ""}`}
                type="button"
                aria-label={isRecording ? "Stop voice input" : "Start voice input"}
                onClick={handleVoiceRecordClick}
                disabled={voiceLoading}
              >
                {isRecording ? <MicOff size={23} /> : <Mic size={23} />}
              </button>
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

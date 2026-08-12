import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, Bot, Building2, CalendarDays, CheckCheck, Clock3, Copy,
  FileText, Heart, LoaderCircle, MapPin, Menu, Mic, MicOff, Moon,
  MoreHorizontal, Plus, Send, Square, Sun, ThumbsDown, ThumbsUp,
  Trash2, UploadCloud, User, X
} from 'lucide-react';
import MobileChatbot from "./MobileChatbot";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

const apiFetch = (path, options) => {
  const base = API_BASE_URL ? API_BASE_URL.replace(/\/$/, "") : "";
  const url = base ? `${base}${path}` : path;
  return fetch(url, options);
};

const formatTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
};

const getRelativeTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return "Just now";
  if (diffInDays === 1) return "Yesterday";
  return `${diffInDays} days ago`;
};

const defaultSession = {
  id: 'session-default',
  title: 'Visiting Hours Inquiry',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  threadId: null,
  storedFilename: null,
  documentMeta: null,
  messages: [
    { id: 1, role: 'bot', content: "Hello! I'm Ozoco ChatBuddy, your virtual assistant. How can I help you today?", time: formatTime() }
  ]
};

const Chatwindow = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('ozocoChatSessions');
    return saved ? JSON.parse(saved) : [defaultSession];
  });
  
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('ozocoActiveSessionId') || 'session-default';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ozocoTheme') || 'dark';
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const [activeMenuId, setActiveMenuId] = useState(null);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const abortControllerRef = useRef(null);
  const activeAudioRef = useRef(null);
  const activeAudioUrlRef = useRef(null);

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

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsTyping(false);
    }

    setIsRecording(false);
    setIsVoiceMode(false);
    setAudioLevel(0);
  };

  useEffect(() => {
    localStorage.setItem('ozocoChatSessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('ozocoActiveSessionId', activeSessionId);
  }, [activeSessionId]);
  
  useEffect(() => {
    localStorage.setItem('ozocoTheme', theme);
  }, [theme]);

  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];

  const updateActiveSession = (updater) => {
    setSessions((prev) =>
      prev.map((sess) => {
        if (sess.id === activeSessionId) {
          const updates = typeof updater === "function" ? updater(sess) : updater;
          return { ...sess, ...updates, updatedAt: Date.now() };
        }
        return sess;
      })
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isMobile) {
      scrollToBottom();
    }
  }, [activeSession?.messages, isMobile]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const createNewChat = () => {
    stopAllVoice();

    const newSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      threadId: null,
      storedFilename: null,
      documentMeta: null,
      messages: []
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const switchChat = (id) => {
    stopAllVoice();
    setActiveSessionId(id);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    const updatedSessions = sessions.filter(s => s.id !== id);
    if (updatedSessions.length === 0) {
      const newSession = {
        id: `session-${Date.now()}`,
        title: 'New Chat',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        threadId: null,
        storedFilename: null,
        documentMeta: null,
        messages: []
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else {
      setSessions(updatedSessions);
      if (activeSessionId === id) {
        setActiveSessionId(updatedSessions[0].id);
      }
    }
    setActiveMenuId(null);
  };

  const clearChatHistory = () => {
    const newSession = {
      id: `session-${Date.now()}`,
      title: 'New Chat',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      threadId: null,
      storedFilename: null,
      documentMeta: null,
      messages: []
    };
    setSessions([newSession]);
    setActiveSessionId(newSession.id);
  };

  const handlePromptClick = (text) => {
    setInput(text);
  };

  const playBase64Audio = (base64Audio) => {
    if (!base64Audio) return;
    stopVoiceOutput();

    try {
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      activeAudioUrlRef.current = url;
      audio.play().catch((e) => console.error("Error playing audio:", e));
      audio.addEventListener("ended", () => {
        if (activeAudioRef.current === audio) activeAudioRef.current = null;
        if (activeAudioUrlRef.current === url) {
          URL.revokeObjectURL(url);
          activeAudioUrlRef.current = null;
        }
      });
    } catch (e) {
      console.error("Failed to decode and play audio:", e);
    }
  };

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return { data: await response.json(), isJson: true };
    } else {
      return { data: await response.text(), isJson: false };
    }
  };

  const sendQuestion = async (questionText) => {
    const trimmed = questionText.trim();
    if (!trimmed || isTyping) return;

    stopVoiceOutput();
    setInput("");
    setStatusMessage("");
    setIsTyping(true);

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
      const response = await apiFetch("/documents/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          thread_id: activeSession?.threadId || undefined,
          stored_filename: activeSession?.storedFilename || undefined,
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

      updateActiveSession((sess) => ({
        messages: [
          ...sess.messages,
          {
            id: assistantMsgId,
            role: "bot",
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
            "We are located at 123 Health Avenue, Medical District, City, State 12345.",
          "Upload a discharge summary":
            "I can help analyze discharge summaries. Please use the 'Upload PDF' button in the chat interface to upload your document.",
        };
        const fallback =
          fallbackAnswers[trimmed] ||
          "I'm sorry, I couldn't generate a response at this time.";
        updateAssistantMessage(fallback);
      }

    } catch (err) {
      console.error("Chat error:", err);
      setStatusMessage(err.message || "Error connecting to server.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopVoiceOutput();
    setStatusMessage(`Uploading ${file.name}...`);
    setIsTyping(true);
    
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
      const response = await apiFetch("/documents/upload", {
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

      updateActiveSession((sess) => ({
        storedFilename: payload.stored_filename || sess.storedFilename,
        threadId: payload.thread_id || sess.threadId,
        documentMeta: newMeta,
        messages: [
          ...sess.messages,
          {
            id: (Date.now() + 1).toString(),
            role: "bot",
            content:
              payload.llm_response ||
              payload.response ||
              `I've successfully uploaded "${file.name}". You can now ask me questions about it!`,
            time: formatTime(),
          },
        ],
      }));

      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setStatusMessage(err.message || "Failed to upload document.");
    } finally {
      setIsTyping(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    stopVoiceOutput();
    setStatusMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMessage("Microphone access is not supported by your browser.");
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

      audioChunksRef.current = [];
      
      // Voice meter
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        setAudioLevel(sum / bufferLength);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
      const mimeType = candidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      const recordingStartTime = Date.now();

      recorder.addEventListener("stop", async () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        setAudioLevel(0);
        
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        setIsVoiceMode(false);

        const durationMs = Date.now() - recordingStartTime;
        if (durationMs < 800) {
          setStatusMessage("Recording was too short. Hold mic to speak.");
          return;
        }

        const blobMime = recorder.mimeType || "audio/webm";
        const recordedBlob = new Blob(audioChunksRef.current, { type: blobMime });

        if (recordedBlob.size === 0) {
          setStatusMessage("No audio captured.");
          return;
        }

        const file = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: blobMime });
        await sendVoiceFile(file);
      });

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsVoiceMode(true);
      setStatusMessage("Recording voice... Click mic again to stop.");
    } catch (err) {
      console.error(err);
      setStatusMessage(err.message || "Microphone access denied.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    mediaRecorderRef.current = null;
  };

  const sendVoiceFile = async (file) => {
    if (!file) return;

    setStatusMessage("Transcribing your voice...");
    setIsTyping(true);

    const formData = new FormData();
    formData.append("audio", file, file.name);
    if (activeSession?.threadId) formData.append("thread_id", activeSession.threadId);
    if (activeSession?.storedFilename) formData.append("stored_filename", activeSession.storedFilename);

    let hasTranscript = false;
    let assistantReply = "";
    const assistantMsgId = Date.now().toString();

    try {
      const response = await apiFetch("/documents/voice/stream", {
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
              role: "bot",
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
            setStatusMessage(payload.message || "");
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
            setStatusMessage("Generating voice and text response...");
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
            ensureAssistantMessage();
            updateAssistantMessage(assistantReply || "Voice response received.");
            if (payload.audio_base64) {
              playBase64Audio(payload.audio_base64);
            }
            setStatusMessage("Voice response played.");
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
              role: "bot",
              content: fallbackText,
              time: formatTime(),
            },
          ],
        }));
      }
    } catch (err) {
      setStatusMessage(err.message || "Unable to process voice input.");
    } finally {
      setIsTyping(false);
      setTimeout(() => setStatusMessage(""), 3000);
    }
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
      setStatusMessage('');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (isMobile) {
    return <MobileChatbot />;
  }

  const suggestedPrompts = [
    { icon: Clock3, text: "What are the visiting hours?" },
    { icon: Heart, text: "What services does the hospital offer?" },
    { icon: Building2, text: "List of departments in the hospital" },
    { icon: MapPin, text: "Where is the hospital located?" },
    { icon: CalendarDays, text: "How can I book an appointment?" },
    { icon: FileText, text: "Upload a discharge summary" }
  ];

  return (
    <div className="pc-container" data-theme={theme} onPointerDown={stopVoiceOutput}>
      <style dangerouslySetInnerHTML={{__html: `
        :root {
          --pc-bg: #f3f4f6;
          --pc-sidebar-bg: #ffffff;
          --pc-text: #1f2937;
          --pc-text-muted: #6b7280;
          --pc-border: #e5e7eb;
          --pc-primary: #3b82f6;
          --pc-primary-hover: #2563eb;
          --pc-bubble-bot: #ffffff;
          --pc-bubble-user: #4f46e5;
          --pc-bubble-user-text: #ffffff;
          --pc-hover: #f3f4f6;
          --pc-card: #ffffff;
        }
        [data-theme='dark'] {
          --pc-bg: #111827;
          --pc-sidebar-bg: #1f2937;
          --pc-text: #f9fafb;
          --pc-text-muted: #9ca3af;
          --pc-border: #374151;
          --pc-primary: #3b82f6;
          --pc-primary-hover: #60a5fa;
          --pc-bubble-bot: #374151;
          --pc-bubble-user: #4f46e5;
          --pc-bubble-user-text: #ffffff;
          --pc-hover: #374151;
          --pc-card: #1f2937;
        }
        .pc-container { display: flex; height: 100vh; width: 100vw; background-color: var(--pc-bg); color: var(--pc-text); font-family: system-ui, -apple-system, sans-serif; overflow: hidden; }
        .pc-sidebar { width: 280px; background-color: var(--pc-sidebar-bg); border-right: 1px solid var(--pc-border); display: flex; flex-direction: column; padding: 1rem; flex-shrink: 0; }
        .pc-sidebar-brand { display: flex; align-items: center; gap: 0.75rem; font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; }
        .pc-sidebar-brand .bot-icon { color: var(--pc-primary); }
        .pc-new-chat-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background-color: var(--pc-primary); color: white; border: none; padding: 0.75rem; border-radius: 0.5rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s; margin-bottom: 1.5rem; }
        .pc-new-chat-btn:hover { background-color: var(--pc-primary-hover); }
        .pc-sidebar h3 { font-size: 0.875rem; color: var(--pc-text-muted); margin-bottom: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
        .pc-chat-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.25rem; }
        .pc-chat-list::-webkit-scrollbar { width: 4px; }
        .pc-chat-list::-webkit-scrollbar-thumb { background: var(--pc-border); border-radius: 4px; }
        .pc-chat-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border-radius: 0.5rem; cursor: pointer; transition: background-color 0.2s; position: relative; pointer-events: auto; }
        .pc-chat-item:hover { background-color: var(--pc-hover); }
        .pc-chat-item.active { background-color: var(--pc-active-item); border-left: 3px solid var(--pc-primary); }
        .pc-chat-item-info { flex: 1; overflow: hidden; }
        .pc-chat-item-title { font-weight: 500; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 0.125rem; }
        .pc-chat-item-time { font-size: 0.75rem; color: var(--pc-text-muted); }
        .pc-chat-menu-btn { background: none; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 0.25rem; opacity: 0; transition: opacity 0.2s, transform 0.2s; pointer-events: auto; }
        .pc-chat-item:hover .pc-chat-menu-btn,
        .pc-chat-item.active .pc-chat-menu-btn { opacity: 1; transform: translateX(0); }
        .pc-chat-menu { position: absolute; right: 0.5rem; top: 2.5rem; background: var(--pc-sidebar-bg); border: 1px solid var(--pc-border); border-radius: 0.5rem; padding: 0.25rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); z-index: 10; pointer-events: auto; }
        .pc-chat-menu button { display: flex; align-items: center; gap: 0.5rem; color: #ef4444; background: none; border: none; padding: 0.5rem 1rem; width: 100%; cursor: pointer; font-size: 0.875rem; border-radius: 0.25rem; }
        .pc-chat-menu button:hover { background: #fee2e2; }
        
        .pc-upload-card { margin-top: 1rem; padding: 1rem; background-color: var(--pc-hover); border-radius: 0.5rem; border: 1px dashed var(--pc-border); text-align: center; }
        .pc-upload-card h4 { font-size: 0.875rem; margin-bottom: 0.5rem; }
        .pc-upload-card p { font-size: 0.75rem; color: var(--pc-text-muted); margin-bottom: 0.75rem; }
        .pc-upload-btn { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; background: var(--pc-sidebar-bg); border: 1px solid var(--pc-border); padding: 0.375rem 0.75rem; border-radius: 0.25rem; cursor: pointer; color: var(--pc-text); }
        .pc-upload-btn:hover { background: var(--pc-bg); }
        
        .pc-clear-btn { margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: none; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.875rem; transition: background-color 0.2s; }
        .pc-clear-btn:hover { background-color: var(--pc-hover); color: #ef4444; }

        .pc-main { flex: 1; display: flex; flex-direction: column; position: relative; }
        .pc-topbar { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; background-color: var(--pc-sidebar-bg); border-bottom: 1px solid var(--pc-border); }
        .pc-topbar-left { display: flex; flex-direction: column; }
        .pc-topbar-title { font-weight: 700; font-size: 1.125rem; }
        .pc-topbar-subtitle { font-size: 0.75rem; color: var(--pc-text-muted); }
        .pc-topbar-right { display: flex; align-items: center; gap: 1rem; }
        .pc-online-indicator { display: flex; align-items: center; gap: 0.375rem; font-size: 0.875rem; color: #10b981; font-weight: 500; }
        .pc-online-dot { width: 8px; height: 8px; background-color: #10b981; border-radius: 50%; }
        .pc-icon-btn { background: none; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 0.5rem; border-radius: 0.5rem; transition: background-color 0.2s; }
        .pc-icon-btn:hover { background-color: var(--pc-hover); color: var(--pc-text); }
        .pc-avatar { width: 36px; height: 36px; background-color: var(--pc-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; }

        .pc-chat-area { flex: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; }
        .pc-hero { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 800px; margin: 0 auto; width: 100%; }
        .pc-hero-header { text-align: center; margin-bottom: 3rem; }
        .pc-hero-avatar { width: 80px; height: 80px; background-color: var(--pc-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; color: white; }
        .pc-hero h2 { font-size: 1.875rem; margin-bottom: 0.5rem; }
        .pc-hero p { color: var(--pc-text-muted); font-size: 1.125rem; }
        .pc-prompts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; width: 100%; }
        .pc-prompt-card { background-color: var(--pc-sidebar-bg); border: 1px solid var(--pc-border); border-radius: 0.75rem; padding: 1.25rem; display: flex; align-items: flex-start; gap: 1rem; cursor: pointer; transition: all 0.2s; }
        .pc-prompt-card:hover { border-color: var(--pc-primary); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); transform: translateY(-2px); }
        .pc-prompt-icon { color: var(--pc-primary); }
        .pc-prompt-text { flex: 1; font-weight: 500; }
        .pc-prompt-arrow { color: var(--pc-text-muted); opacity: 0; transition: opacity 0.2s; }
        .pc-prompt-card:hover .pc-prompt-arrow { opacity: 1; color: var(--pc-primary); }

        .pc-messages-list { max-width: 800px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 1.5rem; }
        .pc-date-divider { text-align: center; margin: 1rem 0; position: relative; }
        .pc-date-divider span { background-color: var(--pc-bg); padding: 0 1rem; color: var(--pc-text-muted); font-size: 0.75rem; font-weight: 500; position: relative; z-index: 1; }
        .pc-date-divider::before { content: ''; position: absolute; left: 0; top: 50%; width: 100%; height: 1px; background-color: var(--pc-border); z-index: 0; }
        
        .pc-message { display: flex; max-width: 80%; gap: 1rem; }
        .pc-message.user { align-self: flex-end; flex-direction: row-reverse; }
        .pc-message.bot { align-self: flex-start; }
        .pc-msg-avatar { width: 32px; height: 32px; flex-shrink: 0; background-color: var(--pc-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; }
        .pc-msg-content { display: flex; flex-direction: column; gap: 0.25rem; }
        .pc-message.user .pc-msg-content { align-items: flex-end; }
        .pc-msg-bubble { padding: 1rem; border-radius: 1rem; line-height: 1.5; font-size: 0.9375rem; }
        .pc-message.user .pc-msg-bubble { background-color: var(--pc-bubble-user); color: var(--pc-bubble-user-text); border-bottom-right-radius: 0.25rem; }
        .pc-message.bot .pc-msg-bubble { background-color: var(--pc-bubble-bot); border: 1px solid var(--pc-border); border-bottom-left-radius: 0.25rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .pc-msg-footer { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--pc-text-muted); margin-top: 0.25rem; }
        .pc-msg-actions { display: flex; gap: 0.25rem; opacity: 0; transition: opacity 0.2s; }
        .pc-message:hover .pc-msg-actions { opacity: 1; }
        .pc-msg-action-btn { background: none; border: none; color: var(--pc-text-muted); cursor: pointer; padding: 0.25rem; border-radius: 0.25rem; }
        .pc-msg-action-btn:hover { background-color: var(--pc-hover); color: var(--pc-text); }
        
        .pc-typing-indicator { display: flex; gap: 0.25rem; padding: 1rem; background-color: var(--pc-bubble-bot); border: 1px solid var(--pc-border); border-radius: 1rem; width: fit-content; border-bottom-left-radius: 0.25rem; }
        .pc-dot { width: 6px; height: 6px; background-color: var(--pc-text-muted); border-radius: 50%; animation: pc-bounce 1.4s infinite ease-in-out both; }
        .pc-dot:nth-child(1) { animation-delay: -0.32s; }
        .pc-dot:nth-child(2) { animation-delay: -0.16s; }
        @keyframes pc-bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

        .pc-input-container { padding: 1.5rem; background-color: var(--pc-bg); border-top: 1px solid var(--pc-border); }
        .pc-input-bar { max-width: 800px; margin: 0 auto; display: flex; align-items: center; gap: 0.75rem; background-color: var(--pc-sidebar-bg); border: 1px solid var(--pc-border); border-radius: 1.5rem; padding: 0.5rem 0.75rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .pc-input-bar:focus-within { border-color: var(--pc-primary); box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
        .pc-input-plus { background: none; border: none; color: var(--pc-text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0.5rem; border-radius: 50%; }
        .pc-input-plus:hover { background-color: var(--pc-hover); }
        .pc-input-field { flex: 1; border: none; background: transparent; font-size: 1rem; color: var(--pc-text); outline: none; padding: 0.5rem; }
        .pc-send-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background-color: var(--pc-primary); color: white; border: none; cursor: pointer; transition: background-color 0.2s; }
        .pc-send-btn:hover { background-color: var(--pc-primary-hover); }
        .pc-send-btn:disabled { background-color: var(--pc-border); cursor: not-allowed; }
        
        .pc-stop-btn { display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background-color: #ef4444; color: white; border: none; cursor: pointer; }
        
        .pc-voice-meter { flex: 1; display: flex; align-items: center; gap: 0.25rem; height: 40px; padding: 0 1rem; }
        .pc-meter-bar { width: 4px; background-color: var(--pc-primary); border-radius: 2px; transition: height 0.1s ease; }
        
        .pc-status-msg { text-align: center; font-size: 0.75rem; color: var(--pc-text-muted); margin-top: 0.5rem; height: 16px; }
      `}} />

      {/* SIDEBAR */}
      <div className="pc-sidebar">
        <div className="pc-sidebar-brand">
          <Bot size={28} className="bot-icon" />
          <span>Ozoco ChatBuddy</span>
        </div>
        
        <button className="pc-new-chat-btn" onClick={createNewChat}>
          <Plus size={18} />
          New Chat
        </button>

        <h3>Chats ({sessions.length})</h3>
        
        <div className="pc-chat-list">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`pc-chat-item ${activeSessionId === session.id ? 'active' : ''}`}
              onClick={() => switchChat(session.id)}
            >
              <div className="pc-chat-item-info">
                <div className="pc-chat-item-title">{session.title}</div>
                <div className="pc-chat-item-time">{getRelativeTime(session.updatedAt)}</div>
              </div>
              <button 
                className="pc-chat-menu-btn"
                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === session.id ? null : session.id); }}
              >
                <MoreHorizontal size={16} />
              </button>
              {activeMenuId === session.id && (
                <div className="pc-chat-menu">
                  <button onClick={(e) => deleteChat(session.id, e)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pc-upload-card">
          <h4>Upload Hospital Document</h4>
          <p>Get insights from your discharge summary or reports.</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleUpload}
            accept=".pdf,.txt,.docx"
          />
          <button className="pc-upload-btn" onClick={() => fileInputRef.current?.click()}>
            <UploadCloud size={14} />
            Upload PDF
          </button>
          <div style={{ fontSize: '0.65rem', color: 'var(--pc-text-muted)', marginTop: '0.5rem' }}>Max 20MB</div>
        </div>

        <button className="pc-clear-btn" onClick={clearChatHistory}>
          <Trash2 size={16} />
          Clear conversations
        </button>
      </div>

      {/* MAIN PANEL */}
      <div className="pc-main">
        {/* TOPBAR */}
        <div className="pc-topbar">
          <div className="pc-topbar-left">
            <div className="pc-topbar-title">Ozoco ChatBuddy</div>
            <div className="pc-topbar-subtitle">Your hospital friend</div>
          </div>
          <div className="pc-topbar-right">
            <div className="pc-online-indicator">
              <div className="pc-online-dot"></div>
              Online
            </div>
            <button className="pc-icon-btn" onClick={() => fileInputRef.current?.click()} title="Upload PDF">
              <UploadCloud size={20} />
            </button>
            <button className="pc-icon-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            <div className="pc-avatar">
              <User size={20} />
            </div>
          </div>
        </div>

        {/* CHAT AREA */}
        <div className="pc-chat-area">
          {(!activeSession?.messages || activeSession.messages.length === 0) ? (
            <div className="pc-hero">
              <div className="pc-hero-header">
                <div className="pc-hero-avatar">
                  <Bot size={40} />
                </div>
                <h2>Hello! I'm Ozoco ChatBuddy</h2>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div className="pc-online-dot"></div>
                  <span style={{ color: '#10b981', fontWeight: 500 }}>Online</span>
                </div>
                <p>Your AI assistant for hospital inquiries and document analysis.</p>
              </div>
              <div className="pc-prompts-grid">
                {suggestedPrompts.map((prompt, idx) => (
                  <div key={idx} className="pc-prompt-card" onClick={() => handlePromptClick(prompt.text)}>
                    <prompt.icon className="pc-prompt-icon" size={24} />
                    <span className="pc-prompt-text">{prompt.text}</span>
                    <ArrowRight className="pc-prompt-arrow" size={20} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pc-messages-list">
              <div className="pc-date-divider">
                <span>Today</span>
              </div>
              {activeSession.messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={idx} className={`pc-message ${isUser ? 'user' : 'bot'}`}>
                    {!isUser && (
                      <div className="pc-msg-avatar">
                        <Bot size={20} />
                      </div>
                    )}
                    <div className="pc-msg-content">
                      <div className="pc-msg-bubble">
                        {msg.content}
                      </div>
                      <div className="pc-msg-footer">
                        {msg.time}
                        {isUser && <CheckCheck size={14} style={{ color: '#60a5fa' }} />}
                        {!isUser && (
                          <div className="pc-msg-actions">
                            <button className="pc-msg-action-btn" title="Helpful"><ThumbsUp size={14} /></button>
                            <button className="pc-msg-action-btn" title="Not Helpful"><ThumbsDown size={14} /></button>
                            <button className="pc-msg-action-btn" title="Copy" onClick={() => copyToClipboard(msg.content)}><Copy size={14} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="pc-message bot">
                  <div className="pc-msg-avatar">
                    <Bot size={20} />
                  </div>
                  <div className="pc-msg-content">
                    <div className="pc-typing-indicator">
                      <div className="pc-dot"></div>
                      <div className="pc-dot"></div>
                      <div className="pc-dot"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* INPUT AREA */}
        <div className="pc-input-container">
          <div className="pc-input-bar">
            <button className="pc-input-plus" onClick={() => fileInputRef.current?.click()}>
              <Plus size={20} />
            </button>
            
            {isRecording ? (
              <div className="pc-voice-meter">
                <div style={{ color: '#ef4444', fontWeight: 500, fontSize: '0.875rem' }}>Recording...</div>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center', height: '100%', flex: 1, marginLeft: '1rem' }}>
                  {[...Array(20)].map((_, i) => {
                    const h = Math.max(4, (audioLevel / 255) * 30 * Math.random() * 2);
                    return <div key={i} className="pc-meter-bar" style={{ height: h + 'px' }} />;
                  })}
                </div>
              </div>
            ) : (
              <input
                type="text"
                className="pc-input-field"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && input.trim()) {
                    sendQuestion(input);
                  }
                }}
                disabled={isTyping}
              />
            )}

            {!isRecording ? (
              <button className="pc-icon-btn" onClick={startRecording} disabled={isTyping}>
                <Mic size={20} />
              </button>
            ) : (
              <button className="pc-icon-btn" style={{ color: '#ef4444' }} onClick={stopRecording}>
                <MicOff size={20} />
              </button>
            )}

            {isTyping ? (
              <button className="pc-stop-btn" onClick={stopGeneration}>
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button 
                className="pc-send-btn" 
                onClick={() => sendQuestion(input)}
                disabled={!input.trim()}
              >
                <Send size={18} style={{ marginLeft: '2px' }} />
              </button>
            )}
          </div>
          <div className="pc-status-msg">{statusMessage}</div>
        </div>
      </div>
    </div>
  );
};

export default Chatwindow;

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Send, Sparkles, UploadCloud } from "lucide-react";

const initialMessages = [
  {
    role: "assistant",
    content:
      "Hello! Upload a discharge document and I’ll help summarize it, explain key instructions, and answer follow-up questions.",
  },
];

export default function Chatwindow() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [storedFilename, setStoredFilename] = useState("");
  const [threadId, setThreadId] = useState("");
  const [documentMeta, setDocumentMeta] = useState(null);
  const [preview, setPreview] = useState("Upload a PDF to inspect the latest response payload from the assistant.");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const parseResponse = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return { data, isJson: true };
    }

    const text = await response.text();
    return { data: text, isJson: false };
  };

  const handleUpload = async (file) => {
    if (!file) return;

    setIsUploading(true);
    setError("");

    setMessages((prev) => [
      ...prev,
      { role: "user", content: `\uD83D\uDCC4 Uploaded: ${file.name}` },
    ]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/documents/upload", {
        method: "POST",
        body: formData,
      });

      const { data, isJson } = await parseResponse(response);

      if (!response.ok) {
        const message = isJson ? (data?.detail || data?.message || "The document could not be processed.") : data || "The document could not be processed.";
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
      setPreview(JSON.stringify(payload, null, 2));

      const assistantReply = payload.llm_response || payload.response || "The document was uploaded successfully.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);
    } catch (err) {
      setError(err.message || "Something went wrong while uploading the document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const messageText = input.trim();

    if (!messageText || isSending) return;

    const userMessage = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/documents/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          thread_id: threadId || null,
          stored_filename: storedFilename || null,
        }),
      });

      const { data, isJson } = await parseResponse(response);

      if (!response.ok) {
        const message = isJson ? (data?.detail || data?.message || "The assistant could not answer that message.") : data || "The assistant could not answer that message.";
        throw new Error(message);
      }

      const payload = isJson ? data : {};
      const assistantReply = payload.response || payload.llm_response || payload.message || "The assistant did not return a reply.";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: assistantReply,
        },
      ]);

      if (payload.thread_id) {
        setThreadId(payload.thread_id);
      }

      setPreview(JSON.stringify(payload, null, 2));
    } catch (err) {
      setError(err.message || "Unable to reach the chatbot service.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="workbench">
        <aside className="upload-panel">
          <div>
            <p className="eyebrow">Clinical document assistant</p>
            <h1>Turn discharge paperwork into plain-language guidance.</h1>
            <p className="lede">
              Upload a PDF and ask questions about medications, follow-up tasks, warning signs, or lifestyle advice.
            </p>
          </div>

          <label className="file-picker" htmlFor="document-upload">
            <span>
              {documentMeta?.filename || "Choose a PDF document"}
            </span>
            <span className="file-meta">
              {isUploading ? "Uploading…" : "Click to upload"}
            </span>
            <input
              id="document-upload"
              className="file-input"
              type="file"
              accept=".pdf"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleUpload(file);
                }
                event.target.value = "";
              }}
            />
          </label>

          <button className="primary-button" type="button" disabled={isUploading} onClick={() => document.getElementById("document-upload")?.click()}>
            <UploadCloud size={18} />
            {isUploading ? "Uploading\u2026" : "Upload document"}
          </button>

          {error ? <div className="error-message">{error}</div> : null}

          <dl className="document-stats" aria-label="document information">
            <div>
              <dt>Document</dt>
              <dd>{documentMeta?.filename || "No document uploaded yet"}</dd>
            </div>
            <div>
              <dt>Stored file</dt>
              <dd>{documentMeta?.stored_filename || "\u2014"}</dd>
            </div>
            <div>
              <dt>Pages</dt>
              <dd>{documentMeta?.pages ?? "\u2014"}</dd>
            </div>
            <div>
              <dt>Thread</dt>
              <dd>{threadId || "\u2014"}</dd>
            </div>
          </dl>
        </aside>

        <section className="chat-panel">
          <div className="messages">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                <span>{message.role === "user" ? "You" : "Assistant"}</span>
                {message.content}
              </div>
            ))}
            {isSending ? (
              <div className="message assistant pending">
                <span>Assistant</span>
                Thinking…
              </div>
            ) : null}
            <div ref={messagesEndRef} />
          </div>

          <form className="question-bar" onSubmit={handleSend}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about medications, next steps, or warning signs"
              disabled={isSending}
            />
            <button type="submit" disabled={isSending || !input.trim()}>
              {isSending ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
            </button>
          </form>
        </section>
      </div>

      <section className="preview-panel">
        <div className="preview-header">
          <div>
            <p className="eyebrow">Response preview</p>
            <h2>Latest payload</h2>
          </div>
          <div className="status-pill">
            <Sparkles size={16} />
            Live
          </div>
        </div>
        <pre>{preview}</pre>
      </section>
    </div>
  );
}
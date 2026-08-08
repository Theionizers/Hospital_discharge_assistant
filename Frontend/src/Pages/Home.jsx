import { Bot, CheckCircle2, LoaderCircle, LockKeyhole, MessageCircle, RotateCcw, Upload, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

export default function Home() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedDocument, setUploadedDocument] = useState(null);

  const chooseFile = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const parseUploadResponse = (xhr) => {
    const contentType = xhr.getResponseHeader("content-type") || "";

    if (contentType.includes("application/json") && xhr.responseText) {
      return JSON.parse(xhr.responseText);
    }

    return xhr.responseText;
  };

  const uploadPdf = (file) => {
    setFileName(file.name);
    setUploadProgress(0);
    setUploadStatus("Preparing upload");
    setUploadError("");
    setUploadedDocument(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/documents/upload");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;

      const nextProgress = Math.round((event.loaded / event.total) * 100);
      setUploadProgress(nextProgress);
      setUploadStatus(nextProgress < 100 ? "Uploading PDF" : "Processing PDF");
    };

    xhr.onload = () => {
      try {
        const response = parseUploadResponse(xhr);

        if (xhr.status < 200 || xhr.status >= 300) {
          const message =
            typeof response === "object"
              ? response?.detail || response?.message || "The PDF could not be uploaded."
              : response || "The PDF could not be uploaded.";
          throw new Error(message);
        }

        setUploadProgress(100);
        setUploadStatus("Upload complete");
        setUploadedDocument(response);
        window.localStorage.setItem("ozocoUploadedDocument", JSON.stringify(response));
      } catch (error) {
        setUploadError(error.message || "The PDF could not be uploaded.");
        setUploadStatus("Upload failed");
      } finally {
        setIsUploading(false);
      }
    };

    xhr.onerror = () => {
      setUploadError("Unable to reach the upload service.");
      setUploadStatus("Upload failed");
      setIsUploading(false);
    };

    xhr.send(formData);
  };

  const continueToChat = () => {
    window.history.pushState({}, "", "/chat");
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  return (
    <main className={`home-page ${isUploading ? "is-uploading" : ""}`}>
      <header className="home-brand" aria-label="Ozoco">
        <svg className="brand-mark" viewBox="0 0 64 56" aria-hidden="true">
          <path d="M32 4 57 47H7L32 4Z" fill="none" stroke="#247be8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M19 26 32 4l13 22" fill="none" stroke="#ff3a48" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 47 19 26h26l12 21" fill="none" stroke="#f4c600" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m19 26 13 21 13-21" fill="none" stroke="#21b96f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>OZOCO</span>
      </header>

      <section className="home-content" aria-labelledby="home-title">
        <div className="buddy-icon" aria-hidden="true">
          <Bot size={84} strokeWidth={1.8} />
        </div>

        <h1 id="home-title">
          Chat with <span>Ozoco Buddy</span>
        </h1>
        <p className="home-subtitle">Your AI health assistant for quick<br />guidance and support.</p>

        <section className="upload-card" aria-label="Upload discharge summary">
          <div className="upload-zone">
            <div className={`upload-icon-wrap ${isUploading ? "is-uploading" : ""} ${uploadStatus === "Upload complete" ? "is-complete" : ""}`} aria-hidden="true">
              {isUploading ? (
                <LoaderCircle className="upload-icon spin" size={58} strokeWidth={1.8} />
              ) : uploadStatus === "Upload complete" ? (
                <CheckCircle2 className="upload-icon" size={58} strokeWidth={1.8} />
              ) : (
                <Upload className="upload-icon" size={58} strokeWidth={1.8} />
              )}
            </div>
            <h2>Upload your discharge summary</h2>
            <p>Upload your discharge summary to get<br />personalized assistance.</p>

            <input
              ref={fileInputRef}
              className="home-file-input"
              type="file"
              accept=".pdf,application/pdf"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadPdf(file);
                event.target.value = "";
              }}
            />
            <button className="home-upload-button" type="button" onClick={chooseFile} disabled={isUploading}>
              {isUploading ? <UploadCloud size={20} strokeWidth={2} /> : null}
              {isUploading ? "Uploading..." : "Upload File"}
            </button>
            <small>{fileName || "PDF only (Max. 10MB)"}</small>

            {uploadedDocument ? (
              <div className="home-upload-actions" aria-label="Upload complete actions">
                <button className="home-chat-button" type="button" onClick={continueToChat}>
                  <MessageCircle size={20} strokeWidth={2} />
                  Continue to chat
                </button>
                <button className="home-reupload-button" type="button" onClick={chooseFile}>
                  <RotateCcw size={19} strokeWidth={2} />
                  Reupload PDF
                </button>
              </div>
            ) : null}

            {(isUploading || uploadStatus) && (
              <div className="home-upload-progress" role="status" aria-live="polite">
                <div className="upload-progress-meta">
                  <span>{uploadStatus}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div
                  className="upload-progress-track"
                  role="progressbar"
                  aria-label="PDF upload progress"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={uploadProgress}
                >
                  <span style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {uploadError ? <div className="home-upload-error">{uploadError}</div> : null}
          </div>
        </section>
      </section>

      <footer className="home-security">
        <LockKeyhole size={20} strokeWidth={1.8} />
        <span>Your data is safe and secure with Ozoco AI</span>
      </footer>
    </main>
  );
}

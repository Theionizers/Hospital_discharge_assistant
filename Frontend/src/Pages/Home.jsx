import { Bot, LockKeyhole, Upload } from "lucide-react";
import { useRef, useState } from "react";

export default function Home() {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");

  const chooseFile = () => fileInputRef.current?.click();

  return (
    <main className="home-page">
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
            <Upload className="upload-icon" size={58} strokeWidth={1.8} aria-hidden="true" />
            <h2>Upload your discharge summary</h2>
            <p>Upload your discharge summary to get<br />personalized assistance.</p>

            <input
              ref={fileInputRef}
              className="home-file-input"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) setFileName(file.name);
                event.target.value = "";
              }}
            />
            <button className="home-upload-button" type="button" onClick={chooseFile}>
              Upload File
            </button>
            <small>{fileName || "PDF, JPG or PNG (Max. 10MB)"}</small>
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

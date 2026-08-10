import {
  ArrowRight,
  Bot,
  CalendarDays,
  Globe2,
  Heart,
  Hospital,
  Mic,
  MessageCircle,
  Pill,
  Send,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
} from "lucide-react";

const featureCards = [
  {
    icon: MessageCircle,
    title: "Smart Answers",
    copy: "Get instant and accurate answers about your hospital.",
    tone: "violet",
  },
  {
    icon: Globe2,
    title: "Multilanguage",
    copy: "Communicate in your preferred language.",
    tone: "green",
  },
  {
    icon: Mic,
    title: "Voice Chat",
    copy: "Talk to ChatBuddy using your voice.",
    tone: "orange",
  },
  {
    icon: ShieldCheck,
    title: "Trusted & Secure",
    copy: "Your data is safe with us. We care for your privacy.",
    tone: "blue",
  },
];

const quickActions = [
  { icon: Hospital, label: "About Hospital" },
  { icon: Stethoscope, label: "Departments" },
  { icon: CalendarDays, label: "Appointments" },
  { icon: Pill, label: "Services" },
];

const languages = [
  { flag: "US", label: "English" },
  { flag: "IN", label: "हिंदी" },
  { flag: "BD", label: "বাংলা" },
  { flag: "IN", label: "தமிழ்" },
  { flag: "IN", label: "తెలుగు" },
  { flag: "IN", label: "मराठी" },
];

export default function Home() {
  const continueToChat = () => {
    window.history.pushState({}, "", "/chat");
    window.dispatchEvent(new Event("app:navigation"));
  };

  return (
    <main className="oz-home">
      <header className="oz-navbar" aria-label="Ozoco navigation">
        <button className="oz-logo" type="button" onClick={continueToChat} aria-label="Ozoco home">
          <span className="oz-logo-mark">
            <Bot size={21} strokeWidth={2.4} />
          </span>
          <span>ozoco</span>
        </button>

        <nav className="oz-navlinks" aria-label="Primary navigation">
          <a className="is-active" href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#languages">Languages</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

        <div className="oz-nav-actions">
          <button className="oz-icon-button" type="button" aria-label="Toggle theme">
            <Sun size={20} />
          </button>
          <button className="oz-small-cta" type="button" onClick={continueToChat}>
            Get Started
          </button>
        </div>
      </header>

      <section id="home" className="oz-hero" aria-labelledby="oz-home-title">
        <div className="oz-hero-copy">
          <div className="oz-pill">
            <Sparkles size={16} />
            Smart Hospital Assistant
          </div>

          <h1 id="oz-home-title">
            Ozoco
            <span>ChatBuddy</span>
          </h1>

          <p className="oz-hero-lede">
            Your intelligent hospital friend is here to help you 24/7 with care,
            <strong> anytime, anywhere.</strong>
          </p>

          <ul className="oz-benefits" aria-label="ChatBuddy benefits">
            <li>
              <MessageCircle size={18} />
              Get answers about your hospital
            </li>
            <li>
              <Globe2 size={18} />
              Multilanguage Support
            </li>
            <li>
              <Mic size={18} />
              Voice Chat Available
            </li>
            <li>
              <ShieldCheck size={18} />
              Secure, Fast & Reliable
            </li>
          </ul>

          <button className="oz-primary-cta" type="button" onClick={continueToChat}>
            <Sparkles size={18} />
            Let's Get Started
            <ArrowRight size={19} />
          </button>

          <div className="oz-status">
            <span />
            Always here to help you
          </div>
        </div>

        <div className="oz-hero-visual" aria-label="Ozoco ChatBuddy preview">
          <div className="oz-chat-card">
            <div className="oz-chat-header">
              <div className="oz-chat-avatar">
                <Bot size={22} />
              </div>
              <div>
                <h2>Ozoco ChatBuddy</h2>
                <p><span />Online</p>
              </div>
              <button type="button" aria-label="More options">...</button>
            </div>

            <div className="oz-chat-body">
              <div className="oz-robot" aria-hidden="true">
                <div className="oz-robot-head">
                  <span />
                </div>
                <div className="oz-robot-body">
                  <Bot size={34} />
                </div>
              </div>

              <div className="oz-speech">
                <strong>Hello! 👋</strong>
                <span>I'm Ozoco ChatBuddy, your hospital friend. How can I help you today?</span>
              </div>

              <div className="oz-quick-grid">
                {quickActions.map(({ icon: Icon, label }) => (
                  <button key={label} type="button">
                    <Icon size={17} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="oz-chat-input">
              <span>Type your message...</span>
              <Mic size={22} />
              <button type="button" aria-label="Send message">
                <Send size={24} />
              </button>
            </div>
          </div>

          <div className="oz-voice-card">
            <div className="oz-voice-icon">
              <Mic size={29} />
            </div>
            <div>
              <strong>Voice Chat Available</strong>
              <span>Tap the mic and speak with Ozoco</span>
            </div>
            <div className="oz-wave" aria-hidden="true">
              {Array.from({ length: 13 }).map((_, index) => (
                <span key={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="oz-features" aria-labelledby="oz-features-title">
        <h2 id="oz-features-title">
          Why <span>Ozoco</span> ChatBuddy?
        </h2>

        <div className="oz-feature-grid">
          {featureCards.map(({ icon: Icon, title, copy, tone }) => (
            <article className="oz-feature-card" key={title}>
              <div className={`oz-feature-icon ${tone}`}>
                <Icon size={28} />
              </div>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="languages" className="oz-language-panel" aria-labelledby="oz-language-title">
        <h2 id="oz-language-title">Multilanguage Support</h2>
        <p>Chat in the language you are most comfortable with.</p>

        <div className="oz-language-list">
          {languages.map((language) => (
            <button key={`${language.flag}-${language.label}`} type="button">
              <span className={`oz-flag flag-${language.flag.toLowerCase()}`}>{language.flag}</span>
              {language.label}
            </button>
          ))}
          <button type="button">
            <span className="oz-plus">+</span>
            More
          </button>
        </div>
      </section>

      <p id="about" className="oz-closing">
        <Heart size={22} fill="currentColor" />
        More than a chatbot, Ozoco ChatBuddy is your hospital friend.
        <strong>We're here for you, always.</strong>
      </p>

      <span id="contact" className="oz-contact-anchor" aria-hidden="true" />
    </main>
  );
}

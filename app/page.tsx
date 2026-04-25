import { WaitlistForm } from "./WaitlistForm";

const FEATURES = [
  {
    icon: "⚡",
    title: "Signal, No Noise",
    body: "Personalized industry intelligence that impacts your bottom line.",
  },
  {
    icon: "🎯",
    title: "Competitor Radar",
    body: "Track product launches and hires before they hit the mainstream.",
  },
  {
    icon: "💰",
    title: "Capital Flows",
    body: "Real-time updates on M&A and funding rounds in your specific space.",
  },
];

export default function Home() {
  return (
    <main className="page">
      <nav className="nav">
        <span className="logo">3 Min Bite</span>
      </nav>

      <section className="hero">
        <div className="tag">180 seconds. Every morning.</div>

        <h1 className="headline">
          Know everything.<br />
          <span className="accent">Read nothing.</span>
        </h1>

        <p className="subheadline">
          The daily brief for high-performing founders and investors who can&apos;t
          afford to miss a move but won&apos;t waste an hour finding it.
        </p>

        <ul className="features">
          {FEATURES.map(({ icon, title, body }) => (
            <li key={title} className="feature">
              <span className="feature-icon">{icon}</span>
              <div>
                <strong className="feature-title">{title}</strong>
                <p className="feature-body">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="form-wrapper">
          <p className="form-label">Get your free brief in 30 seconds</p>
          <WaitlistForm />
          <p className="disclaimer">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      <footer className="footer">
        © {new Date().getFullYear()} 3 Min Bite
      </footer>
    </main>
  );
}

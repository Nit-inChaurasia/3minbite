"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "already" | "error";

export function WaitlistForm() {
  const [form, setForm] = useState({ name: "", industry: "", description: "", email: "" });
  const [status, setStatus] = useState<Status>("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setStatus("error"); return; }
      setStatus(data.status === "already_joined" ? "already" : "success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          name="name"
          type="text"
          required
          placeholder="Your name"
          value={form.name}
          onChange={handleChange}
          disabled={status === "loading"}
          className="form-input"
        />
        <input
          name="industry"
          type="text"
          required
          placeholder="Your industry (e.g. Fintech, SaaS, D2C)"
          value={form.industry}
          onChange={handleChange}
          disabled={status === "loading"}
          className="form-input"
        />
        <input
          name="description"
          type="text"
          placeholder="One line about your work (optional)"
          value={form.description}
          onChange={handleChange}
          disabled={status === "loading"}
          className="form-input"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="your@email.com"
          value={form.email}
          onChange={handleChange}
          disabled={status === "loading"}
          className="form-input"
        />
        <button type="submit" disabled={status === "loading"} className="cta-btn full-width">
          {status === "loading" ? "Fetching your brief…" : "Try Now"}
        </button>
        {status === "error" && (
          <p className="error-msg">Something went wrong. Try again.</p>
        )}
      </form>

      {(status === "success" || status === "already") && (
        <div className="modal-overlay">
          <div className="modal-box">
            <button
              onClick={() => setStatus("idle")}
              className="modal-close"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="modal-check">✓</div>
            <h2 className="modal-title">
              {status === "already" ? "Already on the list!" : "You're in!"}
            </h2>
            <p className="modal-body">
              {status === "already"
                ? "Check your inbox. Your brief is on its way."
                : "Your brief is being put together. Check your inbox in a couple of minutes."}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

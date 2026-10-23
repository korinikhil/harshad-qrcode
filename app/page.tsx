"use client";

import { useEffect, useRef, useState } from "react";

const WIDGET_ID = process.env.NEXT_PUBLIC_MSG91_WIDGET_ID;
const TOKEN_AUTH = process.env.NEXT_PUBLIC_MSG91_TOKEN_AUTH;
const OTP_LENGTH = 4;
const TIMEOUT_MS = 20000;
const BRAND = "MAP N GO HOLIDAYS"; // client ka naam yahan

function loadMsg91Script() {
  return new Promise((resolve, reject) => {
    if (typeof window.initSendOTP === "function") return resolve();
    const urls = ["https://verify.msg91.com/otp-provider.js", "https://verify.phone91.com/otp-provider.js"];
    let i = 0;
    const attempt = () => {
      const s = document.createElement("script");
      s.src = urls[i];
      s.async = true;
      s.onload = resolve;
      s.onerror = () => (++i < urls.length ? attempt() : reject(new Error("Verification service is unavailable. Please try again later.")));
      document.head.appendChild(s);
    };
    attempt();
  });
}

function withTimeout(onTimeout) {
  let finished = false;
  const timer = setTimeout(() => { if (!finished) { finished = true; onTimeout(); } }, TIMEOUT_MS);
  return (fn) => (arg) => { if (finished) return; finished = true; clearTimeout(timer); fn(arg); };
}

const IconShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/></svg>
);
const IconClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
);
const IconLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
);
const IconInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>
);
const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v4M12 17h.01"/></svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
);

export default function Home() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("form"); // form | otp | done
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const ready = useRef(false);

  useEffect(() => {
    loadMsg91Script()
      .then(() => {
        window.initSendOTP({
          widgetId: WIDGET_ID,
          tokenAuth: TOKEN_AUTH,
          exposeMethods: true,
          captchaRenderId: "captcha-renderer",
          success: () => {},
          failure: () => {},
        });
        ready.current = true;
      })
      .catch((e) => setError(e.message));
  }, []);

  const cleanPhone = phone.replace(/\D/g, "");
  const locked = step === "otp";

  function fail(msg) { setBusy(false); setError(msg); }

  function sendOtp(e) {
    e?.preventDefault();
    setError(""); setInfo("");
    if (!name.trim()) return setError("Please enter your name.");
    if (cleanPhone.length !== 10) return setError("Please enter a valid 10-digit mobile number.");
    if (!ready.current || typeof window.sendOtp !== "function") {
      return setError("Verification service is still loading. Please try again in a moment.");
    }
    setBusy(true);
    const done = withTimeout(() => fail("No response from the verification service. Please try again."));
    window.sendOtp(
      "91" + cleanPhone,
      done(() => { setBusy(false); setStep("otp"); setInfo(`We've sent a ${OTP_LENGTH}-digit code to +91 ${cleanPhone}.`); }),
      done((err) => fail(err?.message || "We couldn't send the code. Please try again."))
    );
  }

  function resendOtp() {
    setError(""); setInfo("");
    setBusy(true);
    const done = withTimeout(() => fail("No response from the verification service. Please try again."));
    window.retryOtp(
      null,
      done(() => { setBusy(false); setInfo("A new verification code has been sent."); }),
      done((err) => fail(err?.message || "We couldn't resend the code. Please try again."))
    );
  }

  function verifyAndSave(e) {
    e.preventDefault();
    setError("");
    if (otp.replace(/\D/g, "").length !== OTP_LENGTH) {
      return setError(`Please enter the ${OTP_LENGTH}-digit verification code.`);
    }
    setBusy(true);
    const done = withTimeout(() => fail("No response from the verification service. Please try again."));
    window.verifyOtp(
      otp.trim(),
      done(async (data) => {
        const token = data?.message || data?.token || data;
        try {
          const res = await fetch("/api/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, phone: cleanPhone, message, accessToken: token }),
          });
          const out = await res.json();
          if (!res.ok) throw new Error(out.error || "Something went wrong while saving your details.");
          setBusy(false);
          setStep("done");
        } catch (err) {
          fail(err.message);
        }
      }),
      done((err) => fail(err?.message || "Incorrect verification code. Please try again."))
    );
  }

  function changeNumber() { setStep("form"); setOtp(""); setInfo(""); setError(""); }
  function startOver() { setName(""); setPhone(""); setMessage(""); setOtp(""); setStep("form"); setInfo(""); setError(""); }

  return (
    <main className="page">
      <section className="intro">
        <div className="brand">{BRAND}</div>
        <div>
          <h1>We'd love to hear from you.</h1>
          <p>Leave your details and a member of our team will reach out. It only takes a minute, and we verify your number so we can get back to you reliably.</p>
        </div>
        <div className="trust">
          <span><IconShield /> Verified by OTP</span>
          <span><IconClock /> Response within 24 hours</span>
          <span><IconLock /> Your details stay private</span>
        </div>
      </section>

      <section className="panel">
        <div className="card">
          {step === "done" ? (
            <div className="success" role="status">
              <div className="check"><IconCheck /></div>
              <h2>Thank you, {name.trim()}.</h2>
              <p>Your number has been verified and your details have been received. Our team will get in touch with you shortly.</p>
              <button type="button" className="btn" onClick={startOver}>Submit another response</button>
            </div>
          ) : (
            <>
              <div className="steps" aria-label="Progress">
                <span className={`step ${locked ? "done" : "active"}`}><i>{locked ? "✓" : "1"}</i> Your details</span>
                <hr />
                <span className={`step ${locked ? "active" : ""}`}><i>2</i> Verify number</span>
              </div>

              <form onSubmit={locked ? verifyAndSave : sendOtp} noValidate>
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" placeholder="e.g. Priya Sharma" disabled={locked} />
                </div>

                <div className="field">
                  <label htmlFor="phone">Mobile number</label>
                  <div className="phone">
                    <span className="cc">+91</span>
                    <input id="phone" type="tel" inputMode="numeric" placeholder="98765 43210" value={phone}
                      onChange={(e) => setPhone(e.target.value)} required autoComplete="tel-national" disabled={locked} />
                  </div>
                  {!locked && <span className="hint">We'll send a one-time verification code to this number.</span>}
                </div>

                <div className="field">
                  <label htmlFor="msg">Message <span className="optional">(optional)</span></label>
                  <textarea id="msg" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us how we can help" disabled={locked} />
                </div>

                {locked && (
                  <div className="field">
                    <label htmlFor="otp">Verification code</label>
                    <input id="otp" className="otp-input" inputMode="numeric" autoComplete="one-time-code" placeholder="••••"
                      maxLength={OTP_LENGTH} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} autoFocus />
                    <span className="hint">
                      Didn't receive it?{" "}
                      <button type="button" className="link" onClick={resendOtp} disabled={busy}>Resend code</button>
                      {" · "}
                      <button type="button" className="link" onClick={changeNumber} disabled={busy}>Change number</button>
                    </span>
                  </div>
                )}

                <div id="captcha-renderer" />

                {info && <div className="note info"><IconInfo /><span>{info}</span></div>}
                {error && <div className="note error" role="alert"><IconAlert /><span>{error}</span></div>}

                <button className="btn" type="submit" disabled={busy}>
                  {busy && <span className="spinner" aria-hidden="true" />}
                  {busy ? "Please wait…" : locked ? "Verify and submit" : "Send verification code"}
                </button>

                <p className="legal">By continuing, you agree to be contacted by {BRAND} regarding your enquiry.</p>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
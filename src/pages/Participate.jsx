import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const STEPS = ["Name", "Best", "Worst", "Best → Others", "Others → Worst", "Submit"];

const LINGUISTIC_OPTIONS = [
  { value: 1, label: "Equal" },
  { value: 2, label: "Slightly more" },
  { value: 4, label: "Moderately more" },
  { value: 6, label: "Strongly more" },
  { value: 9, label: "Absolutely more" },
];

const LINGUISTIC_LABELS = Object.fromEntries(
  LINGUISTIC_OPTIONS.map((o) => [o.value, o.label])
);

function Stepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((_, i) => (
        <div
          key={i}
          className={`step-dot ${i === current ? "active" : i < current ? "done" : ""}`}
        />
      ))}
    </div>
  );
}

function LinguisticScale({ value, onChange, reversed }) {
  const options = reversed ? [...LINGUISTIC_OPTIONS].reverse() : LINGUISTIC_OPTIONS;
  return (
    <div className="linguistic-scale">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          className={`linguistic-btn linguistic-btn-pos-${i + 1} ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {value === opt.value ? "✓ " : ""}{opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Participate() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [bestItem, setBestItem] = useState(null);
  const [worstItem, setWorstItem] = useState(null);
  const [bestToOthers, setBestToOthers] = useState({});
  const [othersToWorst, setOthersToWorst] = useState({});

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  useEffect(() => {
    fetch(`/api/get-session?id=${sessionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Session not found");
        return r.json();
      })
      .then((data) => setSession(data))
      .catch(() => setError("Session not found. Check the link and try again."))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <span>Loading session…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="status error">{error}</div>
        <Link to="/" className="btn btn-outline" style={{ marginTop: "1rem" }}>
          ← Back to Home
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div>
        <h1>Response Submitted</h1>
        <div className="status success">
          Your comparisons have been recorded. Thank you!
        </div>
        <div className="btn-row">
          <Link to={`/s/${sessionId}/results`} className="btn btn-primary">
            View Results
          </Link>
        </div>
      </div>
    );
  }

  const { items: itemObjects, title } = session;
  const items = itemObjects.map((i) => i.title);
  const descMap = Object.fromEntries(itemObjects.map((i) => [i.title, i.description]));
  const othersFromBest = items.filter((i) => i !== bestItem);
  const othersFromWorst = items.filter((i) => i !== worstItem);

  const canAdvance = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return bestItem !== null;
      case 2: return worstItem !== null;
      case 3: return othersFromBest.every((i) => bestToOthers[i]);
      case 4: return othersFromWorst.every((i) => othersToWorst[i]);
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          participantName: name.trim(),
          bestItem,
          worstItem,
          bestToOthers,
          othersToWorst,
        }),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <p className="step-label">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>
      <h1>{title}</h1>
      <Stepper current={step} />

      <div className="card">
        {/* Step 0: Name */}
        {step === 0 && (
          <div>
            <h2>What's your name?</h2>
            <p>This helps identify your responses in the results.</p>
            <div className="field">
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && canAdvance() && setStep(1)}
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Step 1: Pick Best */}
        {step === 1 && (
          <div>
            <div className="rating-sticky-header">
              <h2>Which item is most important?</h2>
              <p>Select the single item you consider the highest priority.</p>
            </div>
            <div className="item-grid">
              {items.map((item) => (
                <div
                  key={item}
                  className={`item-card ${bestItem === item ? "selected" : ""}`}
                  onClick={() => {
                    setBestItem(item);
                    // Clear worst if same
                    if (worstItem === item) setWorstItem(null);
                  }}
                >
                  {item}
                  {descMap[item] && (
                    <span className="item-description">{descMap[item]}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Pick Worst */}
        {step === 2 && (
          <div>
            <div className="rating-sticky-header">
              <h2>Which item is least important?</h2>
              <p>Select the single item you consider the lowest priority.</p>
            </div>
            <div className="item-grid">
              {items.map((item) => (
                <div
                  key={item}
                  className={`item-card ${worstItem === item ? "selected" : ""} ${
                    item === bestItem ? "disabled" : ""
                  }`}
                  onClick={() => item !== bestItem && setWorstItem(item)}
                >
                  {item}
                  {descMap[item] && (
                    <span className="item-description">{descMap[item]}</span>
                  )}
                  {item === bestItem && (
                    <span style={{ display: "block", fontSize: "0.72rem", color: "var(--gray-400)" }}>
                      (your best)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Best-to-Others ratings */}
        {step === 3 && (
          <div>
            <div className="rating-sticky-header">
              <h2>How much more important is "{bestItem}"?</h2>
              <p>
                Select how much more important <strong>{bestItem}</strong> is
                compared to each other item.
              </p>
            </div>
            <div className="scale-endpoint-labels">
              <span>← Very different</span>
              <span>Similar →</span>
            </div>
            {othersFromBest.map((item) => (
              <div className="rating-row" key={item}>
                <span className="rating-sentence">
                  <strong>{bestItem}</strong> is
                </span>
                <LinguisticScale
                  value={bestToOthers[item] || null}
                  onChange={(v) =>
                    setBestToOthers((prev) => ({ ...prev, [item]: v }))
                  }
                  reversed
                />
                <span className="rating-sentence">
                  more important than{" "}
                  <strong className={descMap[item] ? "has-tooltip" : ""}>
                    {item}
                    {descMap[item] && (
                      <>
                        <span className="tooltip-icon"> ⓘ</span>
                        <span className="tooltip-popup">{descMap[item]}</span>
                      </>
                    )}
                  </strong>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Others-to-Worst ratings */}
        {step === 4 && (
          <div>
            <div className="rating-sticky-header">
              <h2>How much more important is each item than "{worstItem}"?</h2>
              <p>
                Select how much more important each item is compared to{" "}
                <strong>{worstItem}</strong>.
              </p>
            </div>
            <div className="scale-endpoint-labels">
              <span>← Very different</span>
              <span>Similar →</span>
            </div>
            {othersFromWorst.map((item) => (
              <div className="rating-row" key={item}>
                <span className="rating-sentence">
                  <strong className={descMap[item] ? "has-tooltip" : ""}>
                    {item}
                    {descMap[item] && (
                      <>
                        <span className="tooltip-icon"> ⓘ</span>
                        <span className="tooltip-popup">{descMap[item]}</span>
                      </>
                    )}
                  </strong>{" "}is
                </span>
                <LinguisticScale
                  value={othersToWorst[item] || null}
                  onChange={(v) =>
                    setOthersToWorst((prev) => ({ ...prev, [item]: v }))
                  }
                  reversed
                />
                <span className="rating-sentence">
                  more important than <strong>{worstItem}</strong>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {step === 5 && (
          <div>
            <h2>Review & Submit</h2>
            <p>Here's a summary of your comparisons.</p>
            <div style={{ marginBottom: "1rem" }}>
              <h3>Your choices</h3>
              <p>
                Most important: <strong>{bestItem}</strong>
                <br />
                Least important: <strong>{worstItem}</strong>
              </p>
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <h3>"{bestItem}" compared to others</h3>
              {othersFromBest.map((item) => (
                <div key={item} style={{ fontSize: "0.9rem", padding: "0.2rem 0" }}>
                  vs {item}: <strong>{LINGUISTIC_LABELS[bestToOthers[item]] || bestToOthers[item]}</strong>
                </div>
              ))}
            </div>
            <div>
              <h3>Each item compared to "{worstItem}"</h3>
              {othersFromWorst.map((item) => (
                <div key={item} style={{ fontSize: "0.9rem", padding: "0.2rem 0" }}>
                  {item}: <strong>{LINGUISTIC_LABELS[othersToWorst[item]] || othersToWorst[item]}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="btn-row">
          {step > 0 && (
            <button className="btn btn-outline" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          {step < 5 && (
            <button
              className="btn btn-primary"
              disabled={!canAdvance()}
              onClick={() => setStep(step + 1)}
            >
              Continue →
            </button>
          )}
          {step === 5 && (
            <button
              className="btn btn-gold"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit My Response"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

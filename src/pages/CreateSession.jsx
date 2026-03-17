import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CreateSession() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [itemsText, setItemsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    const items = itemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!title.trim()) {
      setError("Please enter a session title.");
      return;
    }
    if (items.length < 3) {
      setError("Please enter at least 3 items (one per line).");
      return;
    }
    if (items.length > 15) {
      setError("Please limit to 15 items or fewer for practical comparisons.");
      return;
    }

    const uniqueItems = [...new Set(items)];
    if (uniqueItems.length < items.length) {
      setError("Duplicate items found. Please remove duplicates.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), items }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const data = await res.json();
      navigate(`/s/${data.sessionId}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const itemCount = itemsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean).length;

  const comparisonCount = itemCount > 0 ? 2 * itemCount - 3 : 0;

  return (
    <div>
      <h1>Create a Prioritization Session</h1>
      <p className="subtitle">
        Use the Best-Worst Method to have your group rank items by importance.
      </p>

      <div className="card">
        <div className="field">
          <label htmlFor="title">Session Title</label>
          <input
            id="title"
            type="text"
            placeholder='e.g. "Q3 Feature Priorities"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="items">Items to Prioritize</label>
          <textarea
            id="items"
            placeholder={"Enter one item per line, e.g.:\nUser authentication\nDashboard redesign\nAPI documentation\nMobile support\nPerformance optimization"}
            value={itemsText}
            onChange={(e) => setItemsText(e.target.value)}
          />
          <p className="field-hint">
            {itemCount > 0 ? (
              <>
                {itemCount} item{itemCount !== 1 && "s"} →{" "}
                {comparisonCount} comparison{comparisonCount !== 1 && "s"} per
                participant
              </>
            ) : (
              "Enter 3–15 items, one per line"
            )}
          </p>
        </div>

        {error && <div className="status error">{error}</div>}

        <div className="btn-row">
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? "Creating…" : "Create Session"}
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: "2rem" }}>
        <h3>How it works</h3>
        <p>
          The Best-Worst Method asks each participant to identify the most and
          least important items, then rate how each item compares to those two
          anchors. This requires far fewer comparisons than comparing every pair
          directly, while producing statistically robust priority weights.
        </p>
        <p style={{ marginBottom: 0 }}>
          Once you create a session, you'll get a shareable link. Send it to
          your participants, and view aggregated results when everyone has
          responded.
        </p>
      </div>
    </div>
  );
}

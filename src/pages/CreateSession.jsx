import { useState } from "react";
import { useNavigate } from "react-router-dom";

const emptyItem = () => ({ title: "", description: "" });

export default function CreateSession() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([emptyItem(), emptyItem(), emptyItem()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
  };

  const removeItem = (index) => {
    if (items.length > 3) setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    const filled = items
      .map((i) => ({ title: i.title.trim(), description: i.description.trim() }))
      .filter((i) => i.title);

    if (!title.trim()) {
      setError("Please enter a session title.");
      return;
    }
    if (filled.length < 3) {
      setError("Please enter at least 3 items with titles.");
      return;
    }
    const titles = filled.map((i) => i.title);
    if (new Set(titles).size < titles.length) {
      setError("Duplicate item titles found. Please make each title unique.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), items: filled }),
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

  const filledCount = items.filter((i) => i.title.trim()).length;
  const comparisonCount = filledCount > 0 ? 2 * filledCount - 3 : 0;

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
          <label>Items to Prioritize</label>
          <div className="item-list">
            {items.map((item, i) => (
              <div className="item-row" key={i}>
                <div className="item-row-fields">
                  <input
                    type="text"
                    placeholder={`Item ${i + 1} title`}
                    value={item.title}
                    onChange={(e) => updateItem(i, "title", e.target.value)}
                  />
                  <textarea
                    className="item-description-input"
                    placeholder="Description (optional)"
                    value={item.description}
                    maxLength={1000}
                    rows={2}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                  />
                  {item.description.length > 0 && (
                    <span className="char-count">{item.description.length}/1000</span>
                  )}
                </div>
                <button
                  type="button"
                  className="item-remove-btn"
                  onClick={() => removeItem(i)}
                  disabled={items.length <= 3}
                  title="Remove item"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline add-item-btn"
            onClick={addItem}
          >
            + Add Item
          </button>
          <p className="field-hint">
            {filledCount > 0 ? (
              <>
                {filledCount} item{filledCount !== 1 && "s"} →{" "}
                {comparisonCount} comparison{comparisonCount !== 1 && "s"} per
                participant
              </>
            ) : (
              "Enter at least 3 items"
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

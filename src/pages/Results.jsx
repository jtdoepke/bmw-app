import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { solveBWM, aggregateWeights, aggregateFuzzyWeights, weightsToPriorities } from "../lib/bwm-solver";

export default function Results() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    try {
      const [sessionRes, resultsRes] = await Promise.all([
        fetch(`/api/get-session?id=${sessionId}`),
        fetch(`/api/get-results?id=${sessionId}`),
      ]);

      if (!sessionRes.ok) throw new Error("Session not found");

      const sessionData = await sessionRes.json();
      const resultsData = await resultsRes.json();

      setSession(sessionData);
      setResponses(resultsData.responses || []);
    } catch {
      setError("Could not load results. Check the link and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sessionId]);

  const copyLink = () => {
    const url = `${window.location.origin}/s/${sessionId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" />
        <span>Loading results…</span>
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

  const { items: itemObjects, title } = session;
  const items = itemObjects.map((i) => i.title);
  const descMap = Object.fromEntries(itemObjects.map((i) => [i.title, i.description]));

  // Solve BWM for each participant
  const individualResults = responses.map((r) => {
    const result = solveBWM(
      items,
      r.bestItem,
      r.worstItem,
      r.bestToOthers,
      r.othersToWorst
    );
    return { ...result, name: r.participantName };
  });

  // Aggregate
  const hasResponses = individualResults.length > 0;
  const aggWeights = hasResponses ? aggregateWeights(individualResults, items) : {};
  const priorities = hasResponses ? weightsToPriorities(aggWeights) : {};
  const hasFuzzy = individualResults.some((r) => r.fuzzyWeights);
  const aggFuzzy = hasFuzzy ? aggregateFuzzyWeights(individualResults, items) : {};

  // Sort items by weight descending
  const sorted = hasResponses
    ? Object.entries(aggWeights).sort((a, b) => b[1] - a[1])
    : [];
  const maxWeight = sorted.length > 0 ? sorted[0][1] : 1;

  const avgConsistency = hasResponses
    ? individualResults.reduce((sum, r) => sum + r.consistencyRatio, 0) /
      individualResults.length
    : 0;

  const consistencyLabel = (cr) => {
    if (cr <= 0.1) return { label: "Excellent", cls: "good" };
    if (cr <= 0.25) return { label: "Good", cls: "good" };
    if (cr <= 0.4) return { label: "Fair", cls: "fair" };
    return { label: "Poor", cls: "poor" };
  };

  const consistencyTooltip = "Measures how logically consistent the comparisons are. " +
    "0% = perfectly consistent. " +
    "Values over 100% indicate severe contradictions in the ratings.";

  return (
    <div>
      <h1>Results: {title}</h1>
      <p className="subtitle">
        {responses.length} response{responses.length !== 1 && "s"} collected
      </p>

      {/* Share link */}
      <div className="card">
        <h3>Share with participants</h3>
        <div className="share-box">
          <span className="share-url">
            {window.location.origin}/s/{sessionId}
          </span>
          <button className="btn btn-sm btn-outline" onClick={copyLink}>
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="btn-row" style={{ marginTop: "0.75rem" }}>
          <button className="btn btn-sm btn-outline" onClick={fetchData}>
            ↻ Refresh Results
          </button>
          <Link to={`/s/${sessionId}`} className="btn btn-sm btn-outline">
            Submit a Response
          </Link>
        </div>
      </div>

      {!hasResponses ? (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="status info">
            No responses yet. Share the link above and check back!
          </div>
        </div>
      ) : (
        <>
          {/* Aggregated Weights Chart */}
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ marginBottom: 0 }}>Priority Rankings</h2>
              <span className={`consistency ${consistencyLabel(avgConsistency).cls}`} title={consistencyTooltip}>
                Consistency: {consistencyLabel(avgConsistency).label} ({(avgConsistency * 100).toFixed(0)}%)
              </span>
            </div>

            <div className="bar-chart">
              {sorted.map(([item, weight], i) => {
                const pct = (weight / maxWeight) * 100;
                const priority = priorities[item];
                const fuzzy = aggFuzzy[item];
                const upperPct = fuzzy ? (fuzzy[2] / maxWeight) * 100 : pct;
                return (
                  <div className="bar-row" key={item}>
                    <span className={`priority-badge priority-${priority}`}>
                      {i + 1}
                    </span>
                    <span className="bar-label" title={descMap[item] || undefined}>{item}</span>
                    <div className="bar-track">
                      {hasFuzzy && (
                        <div
                          className="bar-fill-range"
                          style={{ width: `${Math.max(upperPct, 8)}%` }}
                        />
                      )}
                      <div className="bar-fill" style={{ width: `${Math.max(pct, 8)}%` }}>
                        {pct > 25 && (
                          <span className="bar-value">
                            {(weight * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="bar-value-outside">
                      {pct <= 25 && <>{(weight * 100).toFixed(1)}%</>}
                      {hasFuzzy && fuzzy && (
                        <span className="fuzzy-range">
                          {" "}[{(fuzzy[0] * 100).toFixed(0)}–{(fuzzy[2] * 100).toFixed(0)}%]
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Responses */}
          <div className="card" style={{ marginTop: "1.5rem" }}>
            <h2>Individual Responses</h2>
            <div className="participant-chips">
              {individualResults.map((r) => (
                <span className="chip" key={r.name}>
                  {r.name}
                </span>
              ))}
            </div>

            <div style={{ overflowX: "auto", marginTop: "1rem" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--gray-200)" }}>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600 }}>
                      Item
                    </th>
                    {individualResults.map((r) => (
                      <th
                        key={r.name}
                        style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600 }}
                      >
                        {r.name}
                      </th>
                    ))}
                    <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 700, color: "var(--gold)" }}>
                      Average
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(([item]) => (
                    <tr key={item} style={{ borderBottom: "1px solid var(--gray-100)" }}>
                      <td style={{ padding: "0.5rem 0.75rem", fontWeight: 500 }} title={descMap[item] || undefined}>
                        {item}
                      </td>
                      {individualResults.map((r) => (
                        <td
                          key={r.name}
                          style={{ textAlign: "right", padding: "0.5rem 0.75rem", color: "var(--gray-500)" }}
                        >
                          {((r.weights[item] || 0) * 100).toFixed(1)}%
                        </td>
                      ))}
                      <td
                        style={{
                          textAlign: "right",
                          padding: "0.5rem 0.75rem",
                          fontWeight: 700,
                          color: "var(--navy)",
                        }}
                      >
                        {((aggWeights[item] || 0) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--gray-200)" }}>
                    <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>
                      Consistency
                    </td>
                    {individualResults.map((r) => {
                      const c = consistencyLabel(r.consistencyRatio);
                      return (
                        <td key={r.name} style={{ textAlign: "right", padding: "0.5rem 0.75rem" }}>
                          <span className={`consistency ${c.cls}`} style={{ fontSize: "0.75rem" }} title={`${c.label} (${(r.consistencyRatio * 100).toFixed(0)}%) — ${consistencyTooltip}`}>
                            {c.label}
                          </span>
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

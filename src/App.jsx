import { Component } from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import CreateSession from "./pages/CreateSession";
import Participate from "./pages/Participate";
import Results from "./pages/Results";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Uncaught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ textAlign: "center", marginTop: "2rem" }}>
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred.</p>
          <button
            className="btn btn-primary"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          Best<span>·</span>Worst
        </Link>
        <span className="header-subtitle">Group Decision Tool</span>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="page">
        <Header />
        <main className="main">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<CreateSession />} />
              <Route path="/s/:sessionId" element={<Participate />} />
              <Route path="/s/:sessionId/results" element={<Results />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>
    </BrowserRouter>
  );
}

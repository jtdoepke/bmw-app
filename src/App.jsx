import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import CreateSession from "./pages/CreateSession";
import Participate from "./pages/Participate";
import Results from "./pages/Results";

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
          <Routes>
            <Route path="/" element={<CreateSession />} />
            <Route path="/s/:sessionId" element={<Participate />} />
            <Route path="/s/:sessionId/results" element={<Results />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

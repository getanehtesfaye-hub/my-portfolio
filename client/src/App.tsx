import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Tracker } from "./analytics";
import Chatbot from "./components/Chatbot";
import { useSite } from "./SiteContext";
import Nav from "./components/Nav";
import { SiteFooter } from "./components/Sections";
import Home from "./pages/Home";
import ProjectPage from "./pages/ProjectPage";

export default function App() {
  const { pathname } = useLocation();
  const { data } = useSite();
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <Nav />
      <main id="main" key={pathname} className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects/:slug" element={<ProjectPage />} />
          <Route path="*" element={<div className="wrap pad"><h1 className="h2">Page not found</h1><Link className="btn" to="/">Back home</Link></div>} />
        </Routes>
      </main>
      <SiteFooter />
      <Chatbot />
      <Tracker enabled={data.settings.analytics?.enabled !== false} />
    </>
  );
}

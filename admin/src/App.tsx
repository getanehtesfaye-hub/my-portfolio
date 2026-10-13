import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Placeholder from "./pages/Placeholder";
import ThemeEditor from "./pages/ThemeEditor";
import HeroEditor from "./pages/HeroEditor";
import { contentRoutes } from "./pages/content";
import { moreRoutes } from "./pages/more";

function Protected() {
  const { admin, loading } = useAuth();
  if (loading) return <p className="center">Loading…</p>;
  return admin ? <Layout /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route index element={<Overview />} />
        <Route path="design/theme" element={<ThemeEditor />} />
        <Route path="website/hero" element={<HeroEditor />} />
        {contentRoutes}
        {moreRoutes}
        <Route path="*" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}

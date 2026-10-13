import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

type Item = { label: string; to: string; ready?: boolean };
const groups: { title: string; items: Item[] }[] = [
  { title: "Dashboard", items: [{ label: "Overview", to: "/", ready: true }] },
  { title: "Content", items: ["About", "Skills", "Services", "Projects", "Social Links"].map((l) => ({ label: l, to: `/content/${l.toLowerCase().replace(" ", "-")}` })) },
  { title: "Appearance", items: [{ label: "Theme and colors", to: "/design/theme", ready: true }, { label: "Typography", to: "/design/typography" }, { label: "Animations", to: "/design/animations" }] },
  { title: "Website", items: [{ label: "Hero", to: "/website/hero", ready: true }, { label: "Navigation", to: "/website/navigation" }, { label: "Footer", to: "/website/footer" }, { label: "SEO", to: "/website/seo" }] },
  { title: "Chatbot", items: [{ label: "Settings and FAQs", to: "/chatbot" }] },
  { title: "Communication", items: [{ label: "Contact messages", to: "/messages" }] },
  { title: "More", items: [{ label: "Analytics", to: "/analytics" }, { label: "Media", to: "/media" }, { label: "Settings", to: "/settings" }, { label: "Account", to: "/account" }] },
];

const built = ["/content", "/website", "/chatbot", "/messages", "/design", "/analytics", "/media", "/settings", "/account"];

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Portfolio Admin</div>
        <nav aria-label="Admin sections">
          {groups.map((g) => (
            <div key={g.title}>
              <p className="group">{g.title}</p>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to} end className={({ isActive }) => `link${isActive ? " active" : ""}`}>
                  {i.label}
                  {!i.ready && !built.some((b) => i.to.startsWith(b)) && <span className="soon">soon</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="main">
        <header className="topbar">
          <span>{admin?.email}</span>
          <button className="btn ghost" onClick={async () => { await logout(); navigate("/login"); }}>Sign out</button>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}

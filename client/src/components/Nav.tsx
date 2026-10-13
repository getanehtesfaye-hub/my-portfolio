import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSite } from "../SiteContext";

export function SmartLink({ href, children, onClick, className }: { href: string; children: ReactNode; onClick?: () => void; className?: string }) {
  const { pathname } = useLocation();
  if (href.startsWith("#")) return pathname === "/" ? <a className={className} href={href} onClick={onClick}>{children}</a> : <Link className={className} to={`/${href}`} onClick={onClick}>{children}</Link>;
  if (href.startsWith("/")) return <Link className={className} to={href} onClick={onClick}>{children}</Link>;
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export default function Nav() {
  const { data, mode, toggleMode } = useSite();
  const [open, setOpen] = useState(false);
  const brand = data.settings.site?.brandName ?? "Portfolio";
  return (
    <header className="nav">
      <div className="wrap navin">
        <Link to="/" className="brand">{brand}</Link>
        <button className="btn ghost menu" aria-expanded={open} aria-controls="menu" onClick={() => setOpen(!open)}>{open ? "Close" : "Menu"}</button>
        <nav id="menu" aria-label="Main" className={open ? "open" : ""}>
          {data.nav.map((n) => <SmartLink key={n.id} href={n.href} onClick={() => setOpen(false)}>{n.label}</SmartLink>)}
          {data.settings.theme?.switcher !== false && (
            <button className="btn ghost" onClick={toggleMode} aria-label={`Switch to ${mode === "dark" ? "light" : "dark"} mode`}>{mode === "dark" ? "Light" : "Dark"}</button>
          )}
        </nav>
      </div>
    </header>
  );
}

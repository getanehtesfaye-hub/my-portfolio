import { useLocation } from "react-router-dom";

export default function Placeholder() {
  const { pathname } = useLocation();
  const name = pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ?? "";
  return (
    <div className="card">
      <h1 style={{ textTransform: "capitalize" }}>{name}</h1>
      <p className="muted">This screen is built in the next phase. The server already supports it, so nothing needs changing there.</p>
    </div>
  );
}

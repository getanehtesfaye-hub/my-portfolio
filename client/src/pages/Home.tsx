import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Hero from "../components/Hero";
import { About, Contact, Projects, Services, Skills } from "../components/Sections";

export default function Home() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    try { document.querySelector(hash)?.scrollIntoView(); } catch { /* ignore invalid hash */ }
  }, [hash]);
  return (<><Hero /><About /><Skills /><Services /><Projects /><Contact /></>);
}

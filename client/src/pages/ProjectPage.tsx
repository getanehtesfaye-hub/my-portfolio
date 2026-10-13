import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { SmartLink } from "../components/Nav";
import { useSite } from "../SiteContext";

export default function ProjectPage() {
  const { slug } = useParams();
  const { data } = useSite();
  const p = data.projects.find((x) => x.slug === slug);
  useEffect(() => { window.scrollTo(0, 0); if (p) document.title = `${p.title} | ${data.settings.site?.brandName ?? "Portfolio"}`; }, [p, data]);

  if (!p) return <div className="wrap pad"><h1 className="h2">Project not found</h1><Link className="btn" to="/#projects">Back to projects</Link></div>;
  const date = p.completed_on ? new Date(p.completed_on).toLocaleDateString(undefined, { year: "numeric", month: "long" }) : "";
  return (
    <article className="wrap pad">
      <Link to="/#projects" className="muted">← All projects</Link>
      <p className="eyebrow">{p.category}</p>
      <h1 className="display small">{p.title}</h1>
      <p className="lead">{p.short_description}</p>
      <div className="thumb big" style={p.main_image_url ? { backgroundImage: `url("${p.main_image_url}")` } : undefined} role="img" aria-label={p.main_image_url ? `${p.title} preview` : ""} />
      <dl className="facts row">
        {p.client && <><dt>Client</dt><dd>{p.client}</dd></>}
        {date && <><dt>Completed</dt><dd>{date}</dd></>}
      </dl>
      {p.full_description && <p className="pre">{p.full_description}</p>}
      {p.case_study && <><h2 className="h3">Case study</h2><p className="pre">{p.case_study}</p></>}
      <div className="ctas">
        {p.live_url && <SmartLink className="btn primary" href={p.live_url}>Live site</SmartLink>}
        {p.github_url && <SmartLink className="btn" href={p.github_url}>Source code</SmartLink>}
        {p.video_url && <SmartLink className="btn" href={p.video_url}>Watch video</SmartLink>}
      </div>
    </article>
  );
}

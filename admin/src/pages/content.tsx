import { Link, Route } from "react-router-dom";
import ResourceManager, { type Config } from "../crud/ResourceManager";
import SettingEditor from "../components/SettingEditor";
import { CheckField, ColorField, LinesField, NumberField, SelectField, TextField, getIn, type Obj } from "../components/ui";
import Messages from "./Messages";

const skills: Config = {
  path: "skills", title: "Skills", description: "Your skills, grouped by category.", singular: "skill", titleKey: "name",
  subtitle: (r) => `${r.level}% · ${r.years} yrs`, related: { to: "/content/skill-categories", label: "Manage categories" },
  defaults: { visible: true, level: 50, years: 1 },
  toggles: [{ key: "visible", label: "Visible" }, { key: "featured", label: "Featured" }],
  fields: [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "category_id", label: "Category", type: "select", relation: { path: "skill-categories", label: "name" } },
    { key: "icon", label: "Icon name", type: "text" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "level", label: "Skill level (0-100)", type: "number" },
    { key: "years", label: "Years of experience", type: "number" },
    { key: "visible", label: "Visible on the site", type: "checkbox" },
    { key: "featured", label: "Featured", type: "checkbox" },
  ],
};
const services: Config = {
  path: "services", title: "Services", description: "What you offer.", singular: "service", titleKey: "title",
  subtitle: (r) => String(r.short_description ?? ""), defaults: { visible: true },
  toggles: [{ key: "visible", label: "Visible" }],
  fields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "short_description", label: "Short description", type: "textarea" },
    { key: "long_description", label: "Long description", type: "textarea" },
    { key: "icon", label: "Icon name", type: "text" },
    { key: "image_url", label: "Image URL", type: "text", link: true, hint: "Image upload arrives with the Media phase" },
    { key: "features", label: "Features", type: "list" },
    { key: "price", label: "Price or rate (optional)", type: "text" },
    { key: "cta_label", label: "Button label", type: "text" },
    { key: "cta_url", label: "Button link", type: "text", link: true },
    { key: "visible", label: "Visible on the site", type: "checkbox" },
  ],
};
const projects: Config = {
  path: "projects", title: "Projects", description: "Drafts stay private until you publish them.", singular: "project", titleKey: "title",
  subtitle: (r) => String(r.category ?? ""), defaults: { status: "draft" },
  toggles: [{ key: "status", label: "Published", on: "published", off: "draft" }, { key: "featured", label: "Featured" }],
  duplicate: (r) => ({ ...r, title: `${r.title} (copy)`, slug: `${r.slug}-copy-${Date.now().toString(36).slice(-4)}`, status: "draft", featured: false }),
  fields: [
    { key: "title", label: "Title", type: "text", required: true },
    { key: "slug", label: "Slug", type: "text", required: true, hint: "Lowercase letters, numbers and dashes, e.g. my-project" },
    { key: "short_description", label: "Short description", type: "textarea" },
    { key: "full_description", label: "Full description", type: "textarea" },
    { key: "category", label: "Category", type: "text" },
    { key: "main_image_url", label: "Main image URL", type: "text", link: true, hint: "Image upload arrives with the Media phase" },
    { key: "video_url", label: "Video URL", type: "text", link: true },
    { key: "live_url", label: "Live site URL", type: "text", link: true },
    { key: "github_url", label: "GitHub URL", type: "text", link: true },
    { key: "case_study", label: "Case study", type: "textarea" },
    { key: "client", label: "Client", type: "text" },
    { key: "completed_on", label: "Completion date", type: "date" },
    { key: "status", label: "Status", type: "select", options: ["draft", "published"] },
    { key: "featured", label: "Featured", type: "checkbox" },
  ],
};
const social: Config = {
  path: "social-links", title: "Social links", description: "GitHub, LinkedIn and others.", singular: "link", titleKey: "platform",
  subtitle: (r) => String(r.url), defaults: { visible: true }, toggles: [{ key: "visible", label: "Visible" }],
  fields: [
    { key: "platform", label: "Platform", type: "text", required: true, hint: "github, linkedin, x, instagram, youtube, facebook, discord or custom" },
    { key: "label", label: "Label", type: "text" },
    { key: "url", label: "URL", type: "text", required: true },
    { key: "icon", label: "Icon name", type: "text" },
    { key: "visible", label: "Visible on the site", type: "checkbox" },
  ],
};
const navigation: Config = {
  path: "navigation", title: "Navigation", description: "Rename, reorder, hide or re-link your menu items.", singular: "menu item", titleKey: "label",
  subtitle: (r) => String(r.href), defaults: { visible: true }, toggles: [{ key: "visible", label: "Visible" }],
  fields: [
    { key: "label", label: "Label", type: "text", required: true },
    { key: "href", label: "Link", type: "text", required: true, hint: "#projects for a section, or a full https:// address" },
    { key: "visible", label: "Visible", type: "checkbox" },
  ],
};
const faqs: Config = {
  path: "faqs", title: "Chatbot FAQs", description: "The chatbot answers only from these entries.", singular: "FAQ", titleKey: "question",
  subtitle: (r) => String(r.answer).slice(0, 80), related: { to: "/chatbot/faq-categories", label: "Manage categories" },
  defaults: { active: true }, toggles: [{ key: "active", label: "Active" }],
  fields: [
    { key: "question", label: "Question", type: "text", required: true },
    { key: "answer", label: "Answer", type: "textarea", required: true },
    { key: "category_id", label: "Category", type: "select", relation: { path: "faq-categories", label: "name" } },
    { key: "keywords", label: "Keywords", type: "list", hint: "Words visitors might use. Commas between them." },
    { key: "priority", label: "Priority (0-100)", type: "number" },
    { key: "active", label: "Active", type: "checkbox" },
  ],
};
const category = (path: string, title: string): Config => ({
  path, title, description: "Used to group items.", singular: "category", titleKey: "name",
  fields: [{ key: "name", label: "Name", type: "text", required: true }],
});

const box = (children: React.ReactNode) => <div className="preview hero">{children}</div>;

const About = () => (
  <SettingEditor settingKey="about" title="About" description="Your story, shown in the About section."
    preview={(v: Obj) => box(<><h2>{String(getIn(v, "name") ?? "")}</h2><p className="muted">{String(getIn(v, "title") ?? "")} · {String(getIn(v, "location") ?? "")}</p><p>{String(getIn(v, "shortBio") ?? "")}</p></>)}
    render={(ctx) => (<>
      <TextField label="Name" path="name" ctx={ctx} /><TextField label="Professional title" path="title" ctx={ctx} />
      <TextField label="Short introduction" path="shortBio" ctx={ctx} multiline /><TextField label="Long biography" path="longBio" ctx={ctx} multiline />
      <TextField label="Location" path="location" ctx={ctx} /><NumberField label="Years of experience" path="yearsExperience" ctx={ctx} min={0} max={60} />
      <TextField label="Résumé link (PDF)" path="resumeUrl" ctx={ctx} />
    </>)} />
);
const Footer = () => (
  <SettingEditor settingKey="footer" title="Footer" description="Text at the bottom of every page."
    preview={(v: Obj) => getIn(v, "visible") === false ? <p className="preview empty">The footer is hidden.</p> : box(<><p>{String(getIn(v, "text") ?? "")}</p><p className="muted">{String(getIn(v, "copyright") ?? "")}</p></>)}
    render={(ctx) => (<>
      <CheckField label="Show the footer" path="visible" ctx={ctx} /><TextField label="Footer text" path="text" ctx={ctx} />
      <TextField label="Copyright text" path="copyright" ctx={ctx} /><TextField label="Contact email" path="email" ctx={ctx} />
    </>)} />
);
const Seo = () => (
  <SettingEditor settingKey="seo" title="SEO" description="How your site appears in Google and when shared."
    preview={(v: Obj) => box(<><p className="muted">{String(getIn(v, "canonicalUrl") || "https://your-site.com")}</p><h3 style={{ color: "#8ab4f8", margin: "2px 0" }}>{String(getIn(v, "title") ?? "")}</h3><p>{String(getIn(v, "description") ?? "")}</p></>)}
    render={(ctx) => (<>
      <TextField label="Site title" path="title" ctx={ctx} /><TextField label="Meta description" path="description" ctx={ctx} multiline />
      <TextField label="Keywords (comma separated)" path="keywords" ctx={ctx} /><TextField label="Social share title" path="ogTitle" ctx={ctx} />
      <TextField label="Social share description" path="ogDescription" ctx={ctx} multiline /><TextField label="Share image URL" path="ogImage" ctx={ctx} />
      <TextField label="Canonical URL" path="canonicalUrl" ctx={ctx} />
      <SelectField label="Search engines" path="robots" ctx={ctx} options={["index,follow", "noindex,nofollow"]} />
    </>)} />
);
const ChatbotSettings = () => (
  <SettingEditor settingKey="chatbot" title="Chatbot" description="The floating FAQ assistant on your site."
    preview={(v: Obj) => getIn(v, "enabled") === false ? <p className="preview empty">The chatbot is hidden.</p> : box(<><strong style={{ color: String(getIn(v, "primaryColor") ?? "") }}>{String(getIn(v, "name") ?? "")}</strong><p>{String(getIn(v, "welcome") ?? "")}</p><input readOnly placeholder={String(getIn(v, "placeholder") ?? "")} /></>)}
    render={(ctx) => (<>
      <Link className="btn" to="/chatbot/faqs">Manage FAQs</Link>
      <CheckField label="Enable the chatbot" path="enabled" ctx={ctx} /><TextField label="Chatbot name" path="name" ctx={ctx} />
      <TextField label="Welcome message" path="welcome" ctx={ctx} multiline /><TextField label="Input placeholder" path="placeholder" ctx={ctx} />
      <ColorField label="Primary color" path="primaryColor" ctx={ctx} />
      <SelectField label="Position" path="position" ctx={ctx} options={["bottom-right", "bottom-left"]} />
      <LinesField label="Suggested questions" path="suggested" ctx={ctx} />
      <SelectField label="Opening behavior" path="openBehavior" ctx={ctx} options={["closed", "auto-open"]} />
      <TextField label="Fallback message (no FAQ matched)" path="fallbackMessage" ctx={ctx} multiline />
    </>)} />
);

export const contentRoutes = (
  <>
    <Route path="content/skills" element={<ResourceManager key="skills" cfg={skills} />} />
    <Route path="content/skill-categories" element={<ResourceManager key="skill-categories" cfg={category("skill-categories", "Skill categories")} />} />
    <Route path="content/services" element={<ResourceManager key="services" cfg={services} />} />
    <Route path="content/projects" element={<ResourceManager key="projects" cfg={projects} />} />
    <Route path="content/social-links" element={<ResourceManager key="social" cfg={social} />} />
    <Route path="content/about" element={<About />} />
    <Route path="website/navigation" element={<ResourceManager key="navigation" cfg={navigation} />} />
    <Route path="website/footer" element={<Footer />} />
    <Route path="website/seo" element={<Seo />} />
    <Route path="chatbot" element={<ChatbotSettings />} />
    <Route path="chatbot/faqs" element={<ResourceManager key="faqs" cfg={faqs} />} />
    <Route path="chatbot/faq-categories" element={<ResourceManager key="faq-categories" cfg={category("faq-categories", "FAQ categories")} />} />
    <Route path="messages" element={<Messages />} />
  </>
);

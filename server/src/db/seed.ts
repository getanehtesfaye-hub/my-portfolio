import { pool, query } from "./pool";

// SAMPLE DATA: every item below is a placeholder. Replace it from the admin dashboard.
const setting = (key: string, data: object) =>
  query("insert into site_settings (key, draft, published, published_at) values ($1, $2, $2, now()) on conflict (key) do nothing", [key, JSON.stringify(data)]);
const isEmpty = async (t: string) => (await query<{ n: string }>(`select count(*) n from ${t}`))[0].n === "0";

async function main() {
  const dark = { background: "#0a0c14", surface: "#12151f", card: "#171b28", text: "#e9ecf5", muted: "#8b93ad", border: "#262c42", primary: "#7c6cff", secondary: "#3ddbd0", accent: "#ffb454", error: "#ff6b6b", success: "#4ade80" };
  await setting("site", { brandName: "[SAMPLE] Your Name", tagline: "Creative developer", title: "Your Name | Creative Developer" });
  await setting("theme", { defaultMode: "dark", switcher: true, dark, light: { ...dark, background: "#f6f7fb", surface: "#ffffff", card: "#ffffff", text: "#121521", muted: "#5b6277", border: "#dde1ee" }, radius: { card: 16, button: 12 }, layout: { maxWidth: 1200, sectionSpacing: 120 } });
  await setting("typography", { heading: "Bricolage Grotesque", body: "DM Sans", baseSize: 16, lineHeight: 1.6 });
  await setting("animation", { enabled: true, intensity: 1, speed: 1, scroll: true, hover: true, parallax: true, cursor: false, reducedMotion: "system" });
  await setting("hero", { visible: true, title: "[SAMPLE] Your Name", subtitle: "Creative Developer", description: "I build sophisticated digital experiences.", primaryCta: { label: "View projects", href: "#projects" }, secondaryCta: { label: "Get in touch", href: "#contact" }, scene: { model: "orb", scale: 1, mouse: true, speed: 1, particles: { visible: true, count: 600 } } });
  await setting("about", { name: "[SAMPLE] Your Name", title: "Creative Developer", shortBio: "Replace with your introduction.", longBio: "Replace with your story.", location: "Addis Ababa", yearsExperience: 1 });
  await setting("seo", { title: "Your Name | Creative Developer", description: "Portfolio of a creative developer.", robots: "index,follow" });
  await setting("footer", { visible: true, text: "Built with care.", copyright: "© Your Name" });
  await setting("chatbot", { enabled: true, name: "Assistant", welcome: "Hi! Ask me about my work.", placeholder: "Ask a question", primaryColor: "#7c6cff", position: "bottom-right", suggested: ["What technologies do you use?", "Are you available for work?"], fallbackMessage: "I don't have an answer for that yet. Please use the contact form." });
  await setting("contact", { email: "getanehetesfaye301@gmail.com", showPhone: false, availability: "Open to work" });

  if (await isEmpty("skill_categories")) {
    const [fe] = await query<{ id: string }>("insert into skill_categories (name, sort_order) values ('Frontend', 1) returning id");
    const [be] = await query<{ id: string }>("insert into skill_categories (name, sort_order) values ('Backend', 2) returning id");
    for (const [i, s] of [[fe.id, "React", 85], [fe.id, "Three.js", 70], [be.id, "Node.js", 75]].entries())
      await query("insert into skills (category_id, name, level, years, featured, sort_order) values ($1,$2,$3,2,true,$4)", [...s as [string, string, number], i]);
  }
  if (await isEmpty("services")) {
    await query("insert into services (title, short_description, features, sort_order) values ('[SAMPLE] Web applications', 'Fast, accessible products.', $1, 1)", [["React", "TypeScript", "APIs"]]);
    await query("insert into services (title, short_description, features, sort_order) values ('[SAMPLE] 3D experiences', 'Interactive WebGL scenes.', $1, 2)", [["Three.js", "Animation"]]);
  }
  if (await isEmpty("projects")) {
    await query("insert into projects (slug, title, short_description, category, status, featured, sort_order) values ('sample-one', '[SAMPLE] Project one', 'Replace me.', 'Web app', 'published', true, 1), ('sample-two', '[SAMPLE] Project two', 'Replace me.', '3D', 'published', false, 2)");
  }
  if (await isEmpty("social_links")) {
    await query("insert into social_links (platform, label, url, icon, sort_order) values ('github','GitHub','https://github.com/',  'github', 1), ('linkedin','LinkedIn','https://linkedin.com/','linkedin', 2)");
  }
  if (await isEmpty("navigation_items")) {
    const items = [["Home", "#home"], ["About", "#about"], ["Skills", "#skills"], ["Services", "#services"], ["Projects", "#projects"], ["Contact", "#contact"]];
    for (const [i, [label, href]] of items.entries()) await query("insert into navigation_items (label, href, sort_order) values ($1,$2,$3)", [label, href, i]);
  }
  if (await isEmpty("faqs")) {
    await query("insert into faqs (question, answer, keywords, priority) values ('What technologies do you specialize in?', 'React, TypeScript, Node.js, Three.js and modern web applications.', $1, 10)", [["technologies", "stack", "skills", "react"]]);
    await query("insert into faqs (question, answer, keywords) values ('Are you available for work?', 'Yes. Use the contact form and I will reply soon.', $1)", [["available", "hire", "freelance", "work"]]);
  }
  await pool.end();
  console.log("Seed complete. Replace every [SAMPLE] item from the admin dashboard.");
}
main().catch((e) => { console.error(e); process.exit(1); });

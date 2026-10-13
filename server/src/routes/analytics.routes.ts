import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool";
import { validate } from "../middleware/validate";
import { HttpError } from "../utils/errors";

export const publicAnalytics = Router();
export const adminAnalytics = Router();

// Privacy: no IP address, no cookies, no exact location. Only an anonymous random id and coarse device info.
const collectBody = z.object({
  sessionId: z.string().uuid(), visitorId: z.string().min(8).max(64), type: z.string().regex(/^[a-z_]{2,40}$/),
  path: z.string().max(300).optional(), target: z.string().max(300).optional(), referrer: z.string().max(200).optional(),
  screen: z.string().max(20).optional(), ms: z.number().int().min(0).max(3_600_000).optional(),
});
const parseUa = (h: string) => ({
  device: /tablet|ipad/i.test(h) ? "tablet" : /mobi|android|iphone/i.test(h) ? "mobile" : "desktop",
  browser: /edg\//i.test(h) ? "Edge" : /chrome|crios/i.test(h) ? "Chrome" : /firefox|fxios/i.test(h) ? "Firefox" : /safari/i.test(h) ? "Safari" : "Other",
  os: /windows/i.test(h) ? "Windows" : /android/i.test(h) ? "Android" : /iphone|ipad/i.test(h) ? "iOS" : /mac os/i.test(h) ? "macOS" : /linux/i.test(h) ? "Linux" : "Other",
});
const SEARCH = /google|bing|duckduckgo|yahoo|baidu/, SOCIAL = /facebook|instagram|linkedin|twitter|t\.co|x\.com|youtube|reddit|tiktok|telegram|whatsapp/;

publicAnalytics.post("/analytics/collect", validate(collectBody), async (req, res) => {
  const [cfg] = await query<{ enabled: string | null }>("select published->>'enabled' as enabled from site_settings where key = 'analytics'");
  if (cfg?.enabled === "false") return void res.status(204).end();
  const b = req.body as z.infer<typeof collectBody>;
  if (b.type === "pageview") {
    const [seen] = await query<{ n: string }>("select count(*) n from analytics_sessions where visitor_id = $1 and id <> $2", [b.visitorId, b.sessionId]);
    const u = parseUa(req.get("user-agent") ?? "");
    await query(`insert into analytics_sessions (id, visitor_id, device, browser, os, screen, referrer, landing_path, is_new_visitor, page_count)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,1)
      on conflict (id) do update set page_count = analytics_sessions.page_count + 1, last_seen_at = now()`,
      [b.sessionId, b.visitorId, u.device, u.browser, u.os, b.screen ?? null, b.referrer ?? null, b.path ?? null, seen.n === "0"]);
  } else {
    await query("update analytics_sessions set last_seen_at = now() where id = $1", [b.sessionId]);
  }
  await query(`insert into analytics_events (session_id, type, path, target, meta)
    select $1::uuid, $2::text, $3::text, $4::text, $5::jsonb where exists (select 1 from analytics_sessions where id = $1::uuid)`,
    [b.sessionId, b.type, b.path ?? null, b.target ?? null, JSON.stringify(b.ms === undefined ? {} : { ms: b.ms })]);
  res.status(204).end();
});

const rangeQ = z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
type KV = { k: string; n: string };
const rows = (r: KV[]) => r.map((x) => ({ label: x.k, value: Number(x.n) }));

adminAnalytics.get("/analytics/summary", async (req, res) => {
  const { from, to } = rangeQ.parse(req.query);
  const start = new Date(`${from}T00:00:00Z`), end = new Date(new Date(`${to}T00:00:00Z`).getTime() + 864e5);
  if (!(start < end) || end.getTime() - start.getTime() > 400 * 864e5) throw new HttpError(400, "Choose a valid date range (up to 400 days)");
  const p = [start, end];
  const S = "started_at >= $1 and started_at < $2", E = "created_at >= $1 and created_at < $2";
  const by = (col: "device" | "browser" | "os") => query<KV>(`select coalesce(${col}, 'Unknown') k, count(*) n from analytics_sessions where ${S} group by 1 order by n desc limit 6`, p);

  const [tot, series, pages, secs, projects, refs, devices, browsers, os, events, msgs] = await Promise.all([
    query<Record<string, string>>(`select count(*) sessions, count(distinct visitor_id) visitors, count(distinct visitor_id) filter (where is_new_visitor) new_visitors,
      coalesce(sum(page_count),0) pageviews, coalesce(avg(extract(epoch from last_seen_at - started_at)),0) avg_secs, count(*) filter (where page_count = 1) bounces
      from analytics_sessions where ${S}`, p),
    query<{ day: string; visitors: string; sessions: string; views: string }>(`select to_char(d, 'YYYY-MM-DD') as day, coalesce(s.visitors,0) visitors, coalesce(s.sessions,0) sessions, coalesce(v.views,0) views
      from generate_series($1::timestamptz, $2::timestamptz - interval '1 day', interval '1 day') d
      left join (select date_trunc('day', started_at) dd, count(*) sessions, count(distinct visitor_id) visitors from analytics_sessions where ${S} group by 1) s on s.dd = date_trunc('day', d)
      left join (select date_trunc('day', created_at) dd, count(*) views from analytics_events where type = 'pageview' and ${E} group by 1) v on v.dd = date_trunc('day', d)
      order by d`, p),
    query<{ path: string; views: string }>(`select path, count(*) views from analytics_events where type = 'pageview' and ${E} group by 1 order by views desc limit 50`, p),
    query<{ path: string; secs: string }>(`select path, avg((meta->>'ms')::numeric) / 1000 secs from analytics_events where type = 'duration' and ${E} group by 1`, p),
    query<KV>(`select coalesce(pr.title, x.slug) k, x.views n from (select substring(path from '^/projects/([^/?#]+)') slug, count(*) views from analytics_events
      where type = 'pageview' and path like '/projects/%' and ${E} group by 1) x left join projects pr on pr.slug = x.slug order by x.views desc limit 10`, p),
    query<{ ref: string | null; n: string }>(`select referrer ref, count(*) n from analytics_sessions where ${S} group by 1 order by n desc`, p),
    by("device"), by("browser"), by("os"),
    query<KV>(`select type k, count(*) n from analytics_events where type not in ('pageview','duration') and ${E} group by 1 order by n desc`, p),
    query<{ n: string }>(`select count(*) n from contact_messages where ${E}`, p),
  ]);

  const t = tot[0], sessions = Number(t.sessions), visitors = Number(t.visitors), newVisitors = Number(t.new_visitors);
  const sources: Record<string, number> = { direct: 0, search: 0, social: 0, referral: 0 };
  const referrers: { label: string; value: number }[] = [];
  for (const r of refs) {
    const n = Number(r.n), h = r.ref ?? "";
    sources[!h ? "direct" : SEARCH.test(h) ? "search" : SOCIAL.test(h) ? "social" : "referral"] += n;
    if (h && referrers.length < 8) referrers.push({ label: h, value: n });
  }
  const secsBy = new Map(secs.map((s) => [s.path, Number(s.secs)]));
  const ev = rows(events);
  res.json({
    totals: { sessions, visitors, newVisitors, returning: Math.max(0, visitors - newVisitors), pageviews: Number(t.pageviews), avgSeconds: Number(t.avg_secs), bounceRate: sessions ? Number(t.bounces) / sessions : 0 },
    messages: Number(msgs[0].n),
    chatbot: ev.filter((e) => /^(chatbot|faq)/.test(e.label)).reduce((a, e) => a + e.value, 0),
    projectViews: projects.reduce((a, r) => a + Number(r.n), 0),
    series: series.map((s) => ({ day: s.day, visitors: Number(s.visitors), sessions: Number(s.sessions), views: Number(s.views) })),
    sources, referrers,
    pages: pages.map((r) => ({ path: r.path, views: Number(r.views), seconds: secsBy.get(r.path) ?? null })),
    projects: rows(projects), devices: rows(devices), browsers: rows(browsers), os: rows(os), events: ev,
  });
});

export async function purgeOldAnalytics() {
  const [s] = await query<{ d: string | null }>("select published->>'retentionDays' d from site_settings where key = 'analytics'");
  const days = Math.max(7, Number(s?.d) || 365);
  await query("delete from analytics_sessions where started_at < now() - ($1 || ' days')::interval", [String(days)]);
}

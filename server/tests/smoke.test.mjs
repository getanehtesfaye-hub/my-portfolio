// Run with the server started: npm run smoke
import test from "node:test";
import assert from "node:assert/strict";

const API = process.env.API_URL ?? "http://localhost:4000/api";
const json = { "Content-Type": "application/json" };
const call = (p, o) => fetch(API + p, o);

test("health", async () => assert.equal((await (await call("/health")).json()).ok, true));
test("site settings are an object", async () => assert.equal(typeof (await (await call("/site")).json()), "object"));
test("projects list is an array", async () => assert.ok(Array.isArray((await (await call("/projects")).json()).data)));
test("unknown route returns a JSON 404", async () => { const r = await call("/nope"); assert.equal(r.status, 404); assert.ok((await r.json()).error); });
test("admin routes need a login", async () => assert.equal((await call("/admin/projects")).status, 401));
test("contact form validates input", async () => assert.equal((await call("/contact", { method: "POST", headers: json, body: JSON.stringify({ name: "", email: "bad", message: "x" }) })).status, 400));
test("analytics rejects bad input", async () => assert.equal((await call("/analytics/collect", { method: "POST", headers: json, body: JSON.stringify({ type: "x" }) })).status, 400));
test("chatbot answers or falls back", async () => assert.equal(typeof (await (await call("/chatbot/query", { method: "POST", headers: json, body: JSON.stringify({ question: "hello there" }) })).json()).answer, "string"));

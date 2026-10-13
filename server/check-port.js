require("dotenv").config();
const net = require("net");
const host = new URL(process.env.DATABASE_URL).hostname;

for (const port of [5432, 6543]) {
  const s = net.connect({ host, port, timeout: 6000 });
  s.on("connect", () => { console.log(port, "OPEN"); s.destroy(); });
  s.on("timeout", () => { console.log(port, "BLOCKED"); s.destroy(); });
  s.on("error", (e) => console.log(port, e.code));
}
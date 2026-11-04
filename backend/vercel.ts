// Vercel function entry. Every /api/* request is routed here (see scripts/vercel-output.mjs) and handled by the
// same handleApiRequest() the dev server and `npm run server` use.
import type { IncomingMessage, ServerResponse } from "http";
import { handleApiRequest } from "./api.ts";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  // The route passes the original path as ?__path=<rest>; restore /api/<rest>?<query> so the API sees the real URL.
  const url = new URL(req.url || "/", "http://localhost");
  const path = url.searchParams.get("__path");
  if (path !== null) {
    url.searchParams.delete("__path");
    req.url = "/api/" + path + url.search;
  }
  try {
    if (!(await handleApiRequest(req, res))) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  } catch (err: any) {
    console.error("API route error:", err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

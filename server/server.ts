import http from "http";
import { handleApiRequest } from "./api";

const PORT = parseInt(process.env.PORT || process.env.SERVER_PORT || "3001", 10);

const server = http.createServer(async (req, res) => {
  // Global CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const handled = await handleApiRequest(req, res);
    if (!handled) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Endpoint not found", path: req.url }));
    }
  } catch (err: any) {
    console.error("Server API error:", err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message || "Internal server error" }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`CivicSense API server listening on http://localhost:${PORT}`);
  console.log(`Endpoints available:`);
  console.log(` - GET  /api/health`);
  console.log(` - POST /api/cloudinary/sign-upload`);
  console.log(` - GET  /api/id-card/view`);
  console.log(` - GET  /api/complaint-evidence/view`);
  console.log(` - GET  /api/department-units`);
  console.log(` - POST /api/complaints/update-status`);
  console.log(` - POST /api/admin/create-official`);
  console.log(` - POST /api/admin/toggle-active`);
  console.log(` - POST /api/admin/reassign-complaint`);
  console.log(` - GET  /api/activity-logs`);
});

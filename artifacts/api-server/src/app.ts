import express, { type Express, type Request, type Response, type NextFunction } from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lightweight health endpoint for Koyeb / load balancers.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// API routes
app.use("/api", router);

// ---------------------------------------------------------------------------
// Production: serve the built Vite frontend (FinalScore) from this same
// process, so a single Koyeb service exposes both the API and the web app
// on the same $PORT.
// ---------------------------------------------------------------------------
if (process.env["NODE_ENV"] === "production") {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // The bundled server lives at artifacts/api-server/dist/index.mjs at runtime.
  // The Vite build outputs to artifacts/finalscore/dist/public.
  const candidates = [
    path.resolve(here, "../../finalscore/dist/public"),
    path.resolve(here, "../../../artifacts/finalscore/dist/public"),
    path.resolve(process.cwd(), "artifacts/finalscore/dist/public"),
  ];
  const staticDir = candidates.find((p) => fs.existsSync(path.join(p, "index.html")));

  if (!staticDir) {
    logger.warn(
      { candidates },
      "Frontend build not found — only the /api routes will be served.",
    );
  } else {
    logger.info({ staticDir }, "Serving frontend static files");

    app.use(
      express.static(staticDir, {
        index: false,
        maxAge: "1h",
        setHeaders: (res, filePath) => {
          // Aggressive caching for hashed assets, no caching for the HTML shell
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          } else if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          }
        },
      }),
    );

    // SPA fallback — return index.html for any non-API GET that the static
    // middleware did not match. We intentionally avoid path patterns to
    // dodge Express 5 / path-to-regexp quirks.
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET") return next();
      if (req.path.startsWith("/api")) return next();
      if (req.path.startsWith("/health")) return next();
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.sendFile(path.join(staticDir, "index.html"));
    });
  }
}

export default app;

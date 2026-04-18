import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import { attachUser } from "./middlewares/auth";
import router from "./routes";
import { logger } from "./lib/logger";
import { seedDefaultUsersIfEmpty } from "./lib/auth";

// Pre-create the session table so connect-pg-simple doesn't need its bundled
// table.sql at runtime (esbuild can't bundle the .sql file).
async function ensureSessionTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid")
    ) WITH (OIDS=FALSE);
    CREATE INDEX IF NOT EXISTS "IDX_user_sessions_expire" ON "user_sessions" ("expire");
  `);
}

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProd = process.env.NODE_ENV === "production";
app.set("trust proxy", 1);

const PgSession = connectPgSimple(session);
app.use(
  session({
    name: "sid",
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET || "stitching-erp-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);

app.use(attachUser);

app.use("/api", router);

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err }, "Unhandled error");
  const message = err.message || "Internal server error";
  const isDuplicate = message.includes("duplicate key") || message.includes("unique constraint");
  const isForeignKey = message.includes("foreign key") || message.includes("violates foreign key");
  if (isDuplicate) {
    res.status(409).json({ error: "A record with this value already exists" });
    return;
  }
  if (isForeignKey) {
    res.status(400).json({ error: "Referenced record does not exist" });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

ensureSessionTable()
  .then(() => seedDefaultUsersIfEmpty())
  .catch((err) => {
    logger.error({ err }, "Failed to initialize auth");
  });

export default app;

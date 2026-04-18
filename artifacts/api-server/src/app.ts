import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { CLERK_PROXY_PATH, clerkProxyMiddleware } from "./middlewares/clerkProxyMiddleware";
import { attachUser } from "./middlewares/auth";
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

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(clerkMiddleware());
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

export default app;

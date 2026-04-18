import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const isResizeObserverError = (msg: unknown): boolean => {
  if (typeof msg !== "string") return false;
  return (
    msg.includes("ResizeObserver loop") ||
    msg.includes("ResizeObserver loop completed with undelivered notifications") ||
    msg.includes("ResizeObserver loop limit exceeded")
  );
};

window.addEventListener("error", (event) => {
  if (isResizeObserverError(event.message)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const msg = typeof reason === "string" ? reason : reason?.message;
  if (isResizeObserverError(msg)) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

createRoot(document.getElementById("root")!).render(<App />);

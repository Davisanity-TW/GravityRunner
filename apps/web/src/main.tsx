import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App.js";
import "./styles.css";

const root = document.querySelector<HTMLDivElement>("#app");

if (root === null) {
  throw new Error("Missing #app mount element");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);

import "./styles.css";
import { createBootMarkup } from "./index.js";

const root = document.querySelector<HTMLDivElement>("#app");

if (root === null) {
  throw new Error("Missing #app mount element");
}

root.innerHTML = createBootMarkup();

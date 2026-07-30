import { describe, expect, it } from "vitest";

import { createBootMarkup, webApplication } from "./index.js";

describe("web shell boot markup", () => {
  it("renders the application name and ready status", () => {
    const markup = createBootMarkup();

    expect(markup).toContain(webApplication.name);
    expect(markup).toContain("Web shell ready");
  });
});

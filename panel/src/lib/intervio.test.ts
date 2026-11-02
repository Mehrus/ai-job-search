import { describe, expect, it } from "vitest";

import { intervioCatalogUrl, intervioTopics } from "./intervio";

describe("intervioTopics", () => {
  it("maps posting phrases to Intervio tags", () => {
    const topics = intervioTopics([
      "Senior Angular Developer",
      "Standalone components, signals and signal forms",
      "No explicit NgRx mention",
      "Backend-heavy C# scope",
    ]);
    expect(topics.map((t) => t.label)).toEqual(["State management", "Signals", "Forms", ".NET / C#"]);
    expect(topics.find((t) => t.label === ".NET / C#")?.tag).toBe("tag-dotnet");
    expect(intervioTopics(["Java Spring backend"])[0].tag).toBeNull();
    expect(topics.find((t) => t.label === "Signals")?.search).toBe("signal");
  });

  it("returns each topic once", () => {
    expect(intervioTopics(["RxJS", "rxjs observable"])).toHaveLength(1);
  });
});

describe("intervioCatalogUrl", () => {
  it("targets the Angular catalog with senior difficulty", () => {
    const url = new URL(
      intervioCatalogUrl("http://localhost:3001", { title: "Senior Angular Developer", tags: ["tag-rxjs", "tag-forms"] }),
    );
    expect(url.pathname).toBe("/catalog/it/frontend/angular");
    expect(url.searchParams.get("tags")).toBe("tag-rxjs,tag-forms");
    expect(url.searchParams.get("difficulty")).toBe("mid,senior");
  });

  it("searches the whole IT catalog for fullstack roles", () => {
    const url = new URL(intervioCatalogUrl("http://x", { title: "Fullstack .NET + Angular", tags: ["tag-dotnet"] }));
    expect(url.pathname).toBe("/catalog/it");
  });

  it("falls back to the front-end catalog", () => {
    const url = new URL(intervioCatalogUrl("http://x", { title: "Frontend Developer", tags: [] }));
    expect(url.pathname).toBe("/catalog/it/frontend");
    expect(url.searchParams.has("tags")).toBe(false);
  });
});

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { archiveFolderName, parseOutcome, type OutcomeFile } from "./applications";
import type { TrackerRow } from "./tracker";

export interface PrepPack {
  stage: string;
  file: string;
  markdown: string;
}

export interface Archive {
  folder: string;
  exists: boolean;
  outcome: OutcomeFile | null;
  prepPacks: PrepPack[];
  postingMarkdown: string | null;
  files: string[];
}

export function applicationsDir(root: string): string {
  return process.env.JOB_SEARCH_APPLICATIONS
    ? path.resolve(process.env.JOB_SEARCH_APPLICATIONS)
    : path.join(root, "documents", "applications");
}

async function readText(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return null;
  }
}

export async function loadArchive(root: string, row: TrackerRow): Promise<Archive | null> {
  const name = archiveFolderName(row.company, row.role);
  if (!name) return null;
  const folder = path.join(applicationsDir(root), name);

  let files: string[];
  try {
    files = (await readdir(folder, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name).sort();
  } catch {
    return { folder, exists: false, outcome: null, prepPacks: [], postingMarkdown: null, files: [] };
  }

  const outcomeText = files.includes("outcome.md") ? await readText(path.join(folder, "outcome.md")) : null;
  const prepPacks: PrepPack[] = [];
  for (const file of files) {
    const m = file.match(/^interview_prep_(.+)\.md$/);
    if (!m) continue;
    const markdown = await readText(path.join(folder, file));
    if (markdown !== null) prepPacks.push({ stage: m[1].replace(/_/g, " "), file, markdown });
  }
  const postingMarkdown = files.includes("job_posting.md") ? await readText(path.join(folder, "job_posting.md")) : null;

  return {
    folder,
    exists: true,
    outcome: outcomeText ? parseOutcome(outcomeText) : null,
    prepPacks,
    postingMarkdown,
    files,
  };
}

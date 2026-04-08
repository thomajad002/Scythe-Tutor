#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const sourceArg = args.find((arg) => !arg.startsWith("--"));

const repoRoot = process.cwd();
const sourceDir = path.resolve(repoRoot, sourceArg || "public/assets");
const targetRoot = path.resolve(repoRoot, "public/assets");

const DIRECTORY_RULES = [
  {
    target: "boards",
    test: (name) => /^scythe_board\./i.test(name),
  },
  {
    target: (name) => {
      const match = name.match(/^(black|blue|red|white|yellow)_/i);
      const color = match?.[1]?.toLowerCase();
      return color ? `tokens/factions/${color}` : null;
    },
    test: (name) =>
      /^(black|blue|red|white|yellow)_(armory|mech|mill|mine|monument|player|popularity|star|strength|worker)\./i.test(name),
  },
  {
    target: "tokens/resources",
    test: (name) => /^(grain|lumber|oil|ore)\./i.test(name),
  },
  {
    target: "tokens/coins",
    test: (name) => /^(one|five|ten|twenty)_(front|back)\./i.test(name),
  },
  {
    target: "tokens/structure-bonus",
    test: (name) => /^sb_(encounter_adj|farm_tundra_adj|lake_adj|linear_struct|mine_adj|on_mine)\./i.test(name),
  },
];

function classify(fileName) {
  for (const rule of DIRECTORY_RULES) {
    if (rule.test(fileName)) {
      if (typeof rule.target === "function") {
        return rule.target(fileName);
      }

      return rule.target;
    }
  }

  return null;
}

async function walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await walkFiles(fullPath);
      files.push(...nestedFiles);
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function isInsideDir(filePath, dirPath) {
  const relative = path.relative(dirPath, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function ensureTargetDirs() {
  await Promise.all([
    fs.mkdir(path.join(targetRoot, "boards"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "icons"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "tokens"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "tokens", "factions"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "tokens", "resources"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "tokens", "coins"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "tokens", "structure-bonus"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "ui"), { recursive: true }),
    fs.mkdir(path.join(targetRoot, "audio"), { recursive: true }),
  ]);
}

async function main() {
  await ensureTargetDirs();

  let files;
  try {
    files = await walkFiles(sourceDir);
  } catch {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const movePlan = [];
  const unclassified = [];

  for (const filePath of files) {
    const fileName = path.basename(filePath);
    const targetDirName = classify(fileName);

    if (!targetDirName) {
      unclassified.push(fileName);
      continue;
    }

    const destination = path.join(targetRoot, targetDirName, fileName);
    if (filePath === destination) {
      continue;
    }

    if (!isInsideDir(filePath, targetRoot) && sourceDir !== targetRoot) {
      movePlan.push({ from: filePath, to: destination });
      continue;
    }

    movePlan.push({ from: filePath, to: destination });
  }

  if (movePlan.length === 0) {
    console.log("No moves needed.");
  } else {
    console.log(`Planned moves (${movePlan.length}):`);
    for (const item of movePlan) {
      console.log(`- ${path.relative(repoRoot, item.from)} -> ${path.relative(repoRoot, item.to)}`);
    }
  }

  if (unclassified.length > 0) {
    console.log("\nUnclassified files (left in place):");
    for (const fileName of unclassified) {
      console.log(`- ${fileName}`);
    }
  }

  if (!apply) {
    console.log("\nDry run only. Use --apply to perform moves.");
    return;
  }

  for (const item of movePlan) {
    await fs.mkdir(path.dirname(item.to), { recursive: true });
    await fs.rename(item.from, item.to);
  }

  console.log(`\nMoved ${movePlan.length} file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

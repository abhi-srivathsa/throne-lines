import { BOOKS, EXTRA_LINKS, PEOPLE, THRONE } from "../src/data.js";
import { PORTRAITS } from "../src/portraits.js";
import { accessSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const people = new Set(PEOPLE.map((person) => person.id));
const books = new Set(BOOKS.map((book) => book.id));
const errors = [];

for (const person of PEOPLE) {
  for (const parent of person.parents || []) {
    if (!people.has(parent)) errors.push(`${person.id} references missing parent ${parent}`);
  }
  for (const parent of person.legalParents || []) {
    if (!people.has(parent)) errors.push(`${person.id} references missing legal parent ${parent}`);
  }
  for (const spouse of person.spouses || []) {
    if (!people.has(spouse)) errors.push(`${person.id} references missing spouse ${spouse}`);
  }
  for (const book of person.books || []) {
    if (!books.has(book)) errors.push(`${person.id} references missing book ${book}`);
  }
  const portrait = PORTRAITS[person.id];
  if (!portrait) {
    errors.push(`${person.id} is missing portrait metadata`);
  } else {
    if (!portrait.image) errors.push(`${person.id} portrait is missing image`);
    if (!portrait.fallback) errors.push(`${person.id} portrait is missing fallback`);
    if (!portrait.sourceType) errors.push(`${person.id} portrait is missing sourceType`);
    for (const key of ["image", "fallback"]) {
      const value = portrait[key];
      if (value?.startsWith("./")) {
        const localPath = path.join(root, value.slice(2));
        try {
          accessSync(localPath);
        } catch {
          errors.push(`${person.id} portrait ${key} file is missing: ${value}`);
        }
      }
    }
  }
}

for (const link of EXTRA_LINKS) {
  if (!people.has(link.source)) errors.push(`extra link references missing source ${link.source}`);
  if (!people.has(link.target)) errors.push(`extra link references missing target ${link.target}`);
}

for (const entry of THRONE) {
  if (!people.has(entry.id)) errors.push(`throne entry references missing person ${entry.id}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${PEOPLE.length} people, ${BOOKS.length} books, ${THRONE.length} throne entries.`);

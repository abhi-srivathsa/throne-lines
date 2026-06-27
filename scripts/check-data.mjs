import { BOOKS, EXTRA_LINKS, PEOPLE, THRONE } from "../src/data.js";

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

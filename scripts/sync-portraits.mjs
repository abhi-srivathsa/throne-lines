import { mkdir, writeFile, access } from "node:fs/promises";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HOUSES, PEOPLE } from "../src/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const generatedDir = path.join(root, "assets", "portraits", "generated");
const portraitModule = path.join(root, "src", "portraits.js");
const endpoint = "https://gameofthrones.fandom.com/api.php";

const titleById = {
  aegon_i: "Aegon I Targaryen",
  rhaenys_t: "Rhaenys Targaryen",
  visenya_t: "Visenya Targaryen",
  aenys_i: "Aenys Targaryen",
  maegor_i: "Maegor Targaryen",
  jaehaerys_i: "Jaehaerys I Targaryen",
  alysanne_t: "Alysanne Targaryen",
  aemon_prince: "Aemon Targaryen (son of Jaehaerys I)",
  baelon_prince: "Baelon Targaryen",
  alyssa_t: "Alyssa Targaryen",
  rhaenys_queen: "Rhaenys Targaryen (daughter of Aemon)",
  viserys_i: "Viserys I Targaryen",
  daemon_t: "Daemon Targaryen",
  aegon_ii: "Aegon II Targaryen",
  helaena_t: "Helaena Targaryen",
  aemond_t: "Aemond Targaryen",
  daeron_daring: "Daeron Targaryen",
  aegon_iii: "Aegon Targaryen (son of Rhaenyra)",
  viserys_ii: "Viserys Targaryen (son of Rhaenyra)",
  daeron_i: "Daeron I Targaryen",
  baelor_i: "Baelor I Targaryen",
  daena_t: "Daena Targaryen",
  aegon_iv: "Aegon IV Targaryen",
  naerys_t: "Naerys Targaryen",
  aemon_dragonknight: "Aemon Targaryen (son of Viserys II)",
  daeron_ii: "Daeron II Targaryen",
  baelor_breakspear: "Baelor Targaryen",
  aerys_i: "Aerys Targaryen (son of Daeron II)",
  maekar_i: "Maekar Targaryen",
  aerion_brightflame: "Aerion Targaryen",
  aegon_v: "Aegon Targaryen",
  jaehaerys_ii: "Jaehaerys II Targaryen",
  aerys_ii: "Aerys II Targaryen",
  rhaella_t: "Rhaella Targaryen",
  viserys_beggar: "Viserys Targaryen (son of Aerys II)",
  brandon_stark_uncle: "Brandon Stark",
  cassana_baratheon: "Cassana Baratheon",
  gendry: "Gendry Baratheon"
};

const generatedOnly = new Set([
  "aemon_prince",
  "jocelyn_baratheon",
  "betha_blackwood",
  "jaehaerys_ii",
  "lyarra_stark",
  "cassana_baratheon",
  "joanna_lannister"
]);

const showSourceIds = new Set([
  "rhaenys_queen",
  "corlys_velaryon",
  "viserys_i",
  "daemon_t",
  "aemma_arryn",
  "alicent_hightower",
  "laena_velaryon",
  "laenor_velaryon",
  "rhaenyra",
  "aegon_ii",
  "helaena_t",
  "aemond_t",
  "jacaerys",
  "lucerys",
  "joffrey_velaryon",
  "aegon_iii",
  "viserys_ii",
  "baelor_breakspear",
  "maekar_i",
  "aerion_brightflame",
  "aegon_v",
  "duncan_tall",
  "aerys_ii",
  "rhaegar_t",
  "viserys_beggar",
  "daenerys_t",
  "rickard_stark",
  "eddard_stark",
  "lyanna_stark",
  "benjen_stark",
  "catelyn_stark",
  "robb_stark",
  "sansa_stark",
  "arya_stark",
  "bran_stark",
  "rickon_stark",
  "jon_snow",
  "robert_baratheon",
  "stannis_baratheon",
  "renly_baratheon",
  "shireen_baratheon",
  "gendry",
  "tywin_lannister",
  "cersei_lannister",
  "jaime_lannister",
  "tyrion_lannister",
  "joffrey_baratheon",
  "myrcella_baratheon",
  "tommen_baratheon"
]);

const traitOverrides = {
  rhaenys_t: "Valyrian queen with silver-gold hair, violet eyes, fine features, and a calm conqueror's bearing.",
  visenya_t: "Stern Valyrian warrior queen with silver-gold hair, violet eyes, severe cheekbones, and dark armor.",
  aemon_prince: "Valyrian crown prince with silver hair, violet eyes, aquiline features, and restrained dragonrider armor.",
  jocelyn_baratheon: "Black-haired Baratheon noblewoman with strong stormland features, blue eyes, and formal court dress.",
  daena_t: "Defiant Valyrian princess with silver-gold hair, violet eyes, athletic bearing, and a bold red-black gown.",
  betha_blackwood: "Riverlands queen with dark hair, thoughtful brown eyes, and raven-feather Blackwood-inspired embroidery.",
  lyarra_stark: "Northern noblewoman with long brown hair, grey eyes, pale winter complexion, and quiet Stark dignity.",
  joanna_lannister: "Golden-haired Lannister noblewoman with green eyes, elegant poise, and crimson-and-gold court dress.",
  cassana_baratheon: "Stormlands lady with chestnut hair, clear eyes, and dignified green-and-gold Estermont court dress.",
  jaehaerys_ii: "A slight Valyrian king with silver hair, pale violet eyes, fine tired features, and a sober black-red doublet."
};

const houseTraits = {
  targaryen: "silver-gold hair, pale skin, violet or lilac eyes, fine Valyrian features, black and muted crimson clothing",
  velaryon: "silver or white-blond hair, refined seafaring noble features, sea-blue and silver clothing",
  stark: "brown or dark hair, grey eyes, long northern face, restrained charcoal wool and leather",
  baratheon: "black hair, strong jaw, blue eyes, broad stormland features, dark gold and black clothing",
  lannister: "golden blond hair, green eyes, aristocratic features, crimson and gold clothing",
  hightower: "auburn or brown hair, composed oldtown courtly features, green and pale gold clothing",
  other: "period-accurate Westerosi noble features and clothing based on the character note"
};

const houseColor = new Map(HOUSES.map((house) => [house.id, house.color]));

await mkdir(generatedDir, { recursive: true });
await Promise.all(PEOPLE.map(writeFallbackPortrait));

const sourced = await fetchPortraitSources();
const portraits = {};

for (const person of PEOPLE) {
  const fallback = `./assets/portraits/generated/${person.id}.svg`;
  const webp = `./assets/portraits/generated/${person.id}.webp`;
  const png = `./assets/portraits/generated/${person.id}.png`;
  const generatedImage = (await exists(path.join(root, webp.slice(2))))
    ? webp
    : (await exists(path.join(root, png.slice(2))))
      ? png
      : fallback;
  const source = sourced.get(person.id);
  const generatedTraits = traitsFor(person);

  if (source && !generatedOnly.has(person.id)) {
    const sourceType = showSourceIds.has(person.id) ? "show" : "book-art";
    portraits[person.id] = {
      image: source.image,
      fallback: generatedImage,
      sourceType,
      sourceLabel: sourceType === "show" ? "Show / official guide thumbnail" : "Book / lore illustration thumbnail",
      sourceName: "Game of Thrones Wiki",
      sourceUrl: source.url,
      pageTitle: source.title,
      generatedTraits
    };
  } else {
    portraits[person.id] = {
      image: generatedImage,
      fallback,
      sourceType: "generated",
      sourceLabel: generatedImage !== fallback ? "Generated book-trait portrait" : "Local trait portrait",
      sourceName: "Original generated asset",
      sourceUrl: "",
      pageTitle: "",
      generatedTraits
    };
  }
}

await writeFile(
  portraitModule,
  `// Generated by scripts/sync-portraits.mjs. Edit that script for aliases or source policy changes.\n` +
    `export const PORTRAITS = ${JSON.stringify(portraits, null, 2)};\n`,
  "utf8"
);

const counts = Object.values(portraits).reduce((acc, item) => {
  acc[item.sourceType] = (acc[item.sourceType] || 0) + 1;
  return acc;
}, {});
console.log(`Portrait manifest written: ${PEOPLE.length} people.`);
console.log(counts);

async function fetchPortraitSources() {
  const titles = PEOPLE.map((person) => titleById[person.id] || person.name);
  const chunks = [];
  for (let i = 0; i < titles.length; i += 40) chunks.push(titles.slice(i, i + 40));

  const pages = new Map();
  for (const chunk of chunks) {
    const params = new URLSearchParams({
      action: "query",
      titles: chunk.join("|"),
      prop: "pageimages|info",
      inprop: "url",
      pithumbsize: "500",
      redirects: "1",
      format: "json",
      origin: "*"
    });
    const json = await fetchJson(`${endpoint}?${params}`);
    Object.values(json.query?.pages || {}).forEach((page) => {
      pages.set(page.title, page);
      if (page.fullurl) pages.set(page.fullurl.split("/wiki/").pop()?.replace(/_/g, " "), page);
    });
  }

  const byPerson = new Map();
  for (const person of PEOPLE) {
    const title = titleById[person.id] || person.name;
    const page =
      pages.get(title) ||
      [...pages.values()].find((candidate) => candidate.title?.toLowerCase() === title.toLowerCase());
    if (page?.thumbnail?.source) {
      byPerson.set(person.id, {
        title: page.title,
        image: page.thumbnail.source,
        url: page.fullurl
      });
    }
  }
  return byPerson;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`Fandom API failed: ${response.statusCode}`));
          response.resume();
          return;
        }
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", reject);
  });
}

async function writeFallbackPortrait(person) {
  const file = path.join(generatedDir, `${person.id}.svg`);
  const color = houseColor.get(person.house) || "#8f8270";
  const traits = traitsFor(person);
  const initials = person.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
  const hair = hairColor(person);
  const skin = skinColor(person);
  const eye = eyeColor(person);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 560" role="img" aria-label="${escapeXml(person.name)} portrait">\n` +
    `  <defs>\n` +
    `    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#08090a"/><stop offset="1" stop-color="${color}"/></linearGradient>\n` +
    `    <radialGradient id="glow" cx="50%" cy="18%" r="70%"><stop stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="#050607" stop-opacity="0"/></radialGradient>\n` +
    `  </defs>\n` +
    `  <rect width="420" height="560" fill="url(#bg)"/>\n` +
    `  <rect width="420" height="560" fill="url(#glow)"/>\n` +
    `  <path d="M58 500c28-94 84-142 152-142s124 48 152 142" fill="#111417"/>\n` +
    `  <path d="M122 178c8-78 58-123 93-123 56 0 96 61 87 132-9 76-51 142-91 142-43 0-98-72-89-151Z" fill="${hair}" opacity=".95"/>\n` +
    `  <path d="M150 172c13-48 105-48 119 0 10 34 3 105-20 131-22 25-56 25-78 0-24-26-31-97-21-131Z" fill="${skin}"/>\n` +
    `  <path d="M143 178c38-38 91-49 134-12-6-43-37-80-75-80-37 0-68 31-59 92Z" fill="${hair}"/>\n` +
    `  <circle cx="184" cy="223" r="5" fill="${eye}"/><circle cx="237" cy="223" r="5" fill="${eye}"/>\n` +
    `  <path d="M194 269c13 10 30 10 43 0" fill="none" stroke="#5f3a34" stroke-width="5" stroke-linecap="round" opacity=".55"/>\n` +
    `  <path d="M102 487h216l-28-92c-43 42-112 42-155 0Z" fill="${color}" opacity=".78"/>\n` +
    `  <path d="M88 516h244" stroke="#d8c48a" stroke-width="3" opacity=".7"/>\n` +
    `  <text x="210" y="524" text-anchor="middle" fill="#f0eadf" font-family="Georgia, serif" font-size="36" letter-spacing="4">${escapeXml(initials)}</text>\n` +
    `  <title>${escapeXml(`${person.name}: ${traits}`)}</title>\n` +
    `</svg>\n`;
  await writeFile(file, svg, "utf8");
}

function traitsFor(person) {
  return traitOverrides[person.id] || `${houseTraits[person.house] || houseTraits.other}; ${person.note}`;
}

function hairColor(person) {
  if (person.house === "targaryen" || person.house === "velaryon") return "#d9d1bd";
  if (person.house === "lannister") return "#d6a348";
  if (person.house === "baratheon") return "#15100d";
  if (person.house === "stark") return "#3b2d28";
  if (person.house === "hightower") return "#7a4a33";
  if (person.id.includes("blackwood")) return "#221916";
  return "#6d4d37";
}

function eyeColor(person) {
  if (person.house === "targaryen") return "#9c82c8";
  if (person.house === "velaryon") return "#8db7c2";
  if (person.house === "lannister") return "#6f965f";
  if (person.house === "baratheon") return "#597da8";
  if (person.house === "stark") return "#9aa4aa";
  return "#7d6b55";
}

function skinColor(person) {
  if (person.house === "velaryon" || person.id === "corlys_velaryon") return "#8b5945";
  if (person.house === "targaryen") return "#d5b6a2";
  return "#bf8f70";
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

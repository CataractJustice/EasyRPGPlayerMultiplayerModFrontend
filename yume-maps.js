#!/usr/bin/env node

const fs = require("node:fs/promises");
const path = require("node:path");

const API = "https://yume.wiki/api.php";
const PAGE_SIZE = "max";

function slugify(value) {
    return value.toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

async function apiRequest(params) {
    const url = new URL(API);

    for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, String(value));
    }

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
        throw new Error(data.error.info);
    }

    return data;
}

// Extract the complete Locationbox template, including nested templates.
function extractTemplate(wikitext, templateName) {
    const regex = new RegExp(
        `\\{\\{\\s*${templateName}\\b`,
        "i"
    );

    const match = regex.exec(wikitext);

    if (!match) return null;

    const start = match.index;
    let depth = 0;

    for (let i = start; i < wikitext.length - 1; i++) {
        const pair = wikitext.slice(i, i + 2);

        if (pair === "{{") {
            depth++;
            i++;
        } else if (pair === "}}") {
            depth--;
            i++;

            if (depth === 0) {
                return wikitext.slice(start, i + 1);
            }
        }
    }

    return null;
}

// Split a template into parameters, respecting nested templates and links.
function splitTemplateParameters(template) {
    const parts = [];

    let depth = 0;
    let squareDepth = 0;
    let start = 0;

    for (let i = 0; i < template.length; i++) {
        const pair = template.slice(i, i + 2);

        if (pair === "{{") {
            depth++;
            i++;
        } else if (pair === "}}") {
            depth--;
            i++;
        } else if (pair === "[[") {
            squareDepth++;
            i++;
        } else if (pair === "]]") {
            squareDepth--;
            i++;
        } else if (
            template[i] === "|" &&
            depth === 1 &&
            squareDepth === 0
        ) {
            parts.push(template.slice(start, i));
            start = i + 1;
        }
    }

    parts.push(template.slice(start));

    return parts;
}

// Convert common wiki formatting into readable text.
function cleanWikiText(value) {
    return String(value || "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
        .replace(/<ref[^>]*\/>/gi, "")
        .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
        .replace(/\[\[([^\]]+)\]\]/g, "$1")
        .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1")
        .replace(/'''([^']+)'''/g, "$1")
        .replace(/''([^']+)''/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

// Parse all Locationbox parameters into a metadata object.
function parseLocationbox(wikitext) {
    const template = extractTemplate(wikitext, "Locationbox");

    if (!template) return {};

    const parts = splitTemplateParameters(template);
    const metadata = {};

    for (const part of parts.slice(1)) {
        const separator = part.indexOf("=");

        if (separator === -1) continue;

        const key = part.slice(0, separator).trim();
        const value = part.slice(separator + 1).trim();

        if (!key || !value) continue;

        metadata[key] = cleanWikiText(value);
    }

    return metadata;
}

// Keep the working map ID extraction logic.
function extractMapIds(wikitext) {
    const results = [];

    const propertyRegex =
        /^\s*\|\s*Map\s*IDs?\s*=\s*(.*?)\s*$/gim;

    for (const match of wikitext.matchAll(propertyRegex)) {
        const value = match[1].replace(/\}\}\s*$/, "").trim();

        for (const idMatch of value.matchAll(/\b\d{1,6}\b/g)) {
            const id = Number(idMatch[0]);

            if (id > 0) {
                results.push(id);
            }
        }
    }

    return [...new Set(results)];
}

// Get the first descriptive paragraph after the Locationbox.
function extractDescription(wikitext) {
    const template = extractTemplate(wikitext, "Locationbox");

    if (!template) return null;

    const templateEnd = wikitext.indexOf(template) + template.length;

    let remaining = wikitext.slice(templateEnd);

    remaining = remaining
        .replace(/<!--[\s\S]*?-->/g, "")
        .trim();

    // Skip headings and empty lines.
    remaining = remaining.replace(/^(?:\s*\n|={2,}.*?={2,}\s*\n)+/, "");

    const paragraph = remaining.split(/\n\s*\n/)[0] || "";

    const description = cleanWikiText(paragraph)
        .replace(/\{\{[^{}]*\}\}/g, "")
        .trim();

    return description || null;
}

function getPageContent(page) {
    const revision = page.revisions?.[0];

    return (
        revision?.slots?.main?.content ??
        revision?.content ??
        ""
    );
}

function getLocationName(title, game) {
    const prefix = `${game}:`;

    const name = title.toLowerCase().startsWith(prefix.toLowerCase())
        ? title.slice(prefix.length)
        : title;

    return name.replaceAll("_", " ").trim();
}

async function getGameMaps(game) {
    const maps = {};

    let continuation = {};
    let totalPages = 0;
    let pagesWithIds = 0;

    do {
        const data = await apiRequest({
            action: "query",

            generator: "categorymembers",
            gcmtitle: `Category:${game} Locations`,
            gcmtype: "page",
            gcmlimit: PAGE_SIZE,

            prop: "info|revisions",
            inprop: "url",
            rvprop: "content",
            rvslots: "main",

            format: "json",
            formatversion: "2",

            ...continuation
        });

        const pages = data.query?.pages || [];

        for (const page of pages) {
            totalPages++;

            const content = getPageContent(page);

            if (!content) continue;

            const ids = extractMapIds(content);

            if (ids.length === 0) continue;

            pagesWithIds++;

            const name = getLocationName(page.title, game);

            const location = {
                name,
                wiki: page.fullurl ||
                    `https://yume.wiki/${page.title.replaceAll(" ", "_")}`,
                mapIds: ids,
                metadata: parseLocationbox(content),
                description: extractDescription(content)
            };

            // Every map ID gets its own entry.
            for (const id of ids) {
                if (maps[id]) {
                    console.warn(`Duplicate map ID: ${id}`);
                    continue;
                }

                maps[id] = location;
            }
        }

        continuation = data.continue || {};

        console.log(
            `Pages: ${totalPages} | Maps: ${Object.keys(maps).length}`
        );

    } while (Object.keys(continuation).length > 0);

    console.log(`Pages containing map IDs: ${pagesWithIds}`);

    if (Object.keys(maps).length === 0) {
        throw new Error("No map IDs found.");
    }

    return Object.fromEntries(
        Object.entries(maps).sort(
            ([a], [b]) => Number(a) - Number(b)
        )
    );
}

async function main() {
    const game = process.argv.slice(2).join(" ").trim();

    if (!game) {
        throw new Error(
            'Usage: node yume-maps.js "Yume 2kki"'
        );
    }

    console.log(`Game: ${game}`);

    const maps = await getGameMaps(game);

    const outputDir = path.join(process.cwd(), "output");

    await fs.mkdir(outputDir, { recursive: true });

    const outputPath = path.join(
        outputDir,
        `${slugify(game)}-maps.json`
    );

    await fs.writeFile(
        outputPath,
        JSON.stringify(maps, null, 2),
        "utf8"
    );

    console.log(`\nTotal maps: ${Object.keys(maps).length}`);
    console.log(`Saved: ${outputPath}`);
}

main().catch(error => {
    console.error("\nERROR:", error.message);
    process.exit(1);
});

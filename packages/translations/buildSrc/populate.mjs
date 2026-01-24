import MojangAPI from "@minimessage-js/mojang";
import path from "node:path";
import {createWriteStream} from "node:fs";
import fs from "node:fs/promises"
import {Writable} from "node:stream";

//

const GENERATED_SOURCE_HEADER = `/**\n * GENERATED FILE\n * DO NOT MODIFY\n*/\n\n`;

const fileExists = (async (path) => {
    try {
        await fs.stat(path);
        return true;
    } catch (e) {
        return false;
    }
});

const isUpToDate = (async (projectDir, releaseID) => {
    const versionFile = path.resolve(projectDir, ".mc-version");
    if (process.argv.indexOf("-f") === -1 && await fileExists(versionFile)) {
        console.log(`Checking .mc-version`);
        const version = await fs.readFile(versionFile, { encoding: "utf-8" });
        if (version === releaseID) {
            console.info(`Skipping, up to date (${releaseID}). Use -f to force.`);
            return true;
        }
    }
    return false;
});

/**
 * @param file {string}
 * @param task {(put: (text: string) => void) => Promise<void> | void}
 */
function writeText(file, task) {
    let queue = [];
    let release = (() => {});

    async function *chunks() {
        while (true) {
            const { length } = queue;
            if (length === 0) {
                await new Promise((res) => {
                    release = res;
                });
                continue;
            }
            const next = queue.splice(0, 1)[0];
            if (next.done) {
                const { error } = next;
                if (error) throw error;
                return;
            }
            yield `${next.value}`;
        }
    }

    (async () => {
        const put = ((text) => {
            queue.push({
                done: false,
                value: text
            });
            release();
        });
        try {
            await task(put);
            queue.push({ done: true });
        } catch (e) {
            queue.push({
                done: true,
                error: e
            });
        }
    })().catch(console.error);

    return ReadableStream.from(chunks())
        .pipeThrough(new TextEncoderStream())
        .pipeTo(Writable.toWeb(createWriteStream(file)));
}

/**
 * @param localesFile {string}
 * @param locales {string[]}
 */
async function writeLocalesFile(localesFile, locales) {
    await writeText(localesFile, (put) => {
        put(GENERATED_SOURCE_HEADER);
        put(`export type Locale = `);
        for (let i = 0; i < locales.length; i++) {
            if (i) put(" | ");
            put(`"${locales[i]}"`);
        }
        put(";\n");
    });
}

/**
 * @param locale {string}
 * @return {string}
 */
function createImportName(locale) {
    let chars = [ 0x64, 0x61, 0x74, 0x61 ]; // data
    let upper = true;

    for (let i = 0; i < locale.length; i++) {
        let char = locale.charCodeAt(i);
        if (char === 0x5f) { // underscore
            upper = true;
            continue;
        }

        if (char < 0x61 || char > 0x7a) {
            throw new Error(`Unhandled character '${String.fromCharCode(char)}' at position ${i} in locale key ${locale}`);
        }

        if (upper) {
            char -= 0x20;
            upper = false;
        }

        chars.push(char);
    }

    return String.fromCharCode(...chars);
}

/**
 * @param dataScript {string}
 * @param locales {string[]}
 * @param version {string}
 */
async function writeDataScript(dataScript, locales, version) {
    const importNames = new Array(locales.length);
    for (let i = 0; i < locales.length; i++) {
        const locale = locales[i];
        importNames[i] = createImportName(locale);
    }

    await writeText(dataScript, (put) => {
        put(GENERATED_SOURCE_HEADER);

        const importNames = new Array(locales.length);
        for (let i = 0; i < locales.length; i++) {
            const locale = locales[i];
            const importName = createImportName(locale);
            importNames[i] = importName;
            put(`import ${importName} from "./data/${locale}.json" with { type: "json" };\n`);
        }

        put("\nconst translations = Object.freeze({\n");
        for (let i = 0; i < locales.length; i++) {
            put(`    "${locales[i]}": ${importNames[i]},\n`);
        }
        put("});\n");

        put("\nconst locales = [\n");
        for (let i = 0; i < locales.length; i++) {
            put(`    "${locales[i]}",\n`);
        }
        put("];\n");

        put(`\nconst version = "${version}";\n`);

        put("\nconst data = { translations, locales, version };");
        put("\nexport default data;\n");
    });
}

const run = (async (projectDir) => {
    const release = await MojangAPI.getLatestRelease();
    const releaseID = release.id;
    if (await isUpToDate(projectDir, releaseID)) return;

    // Assemble the locale set
    console.log(`Reading assets for version ${releaseID}`);
    const assets = await release.getAssets((s) => /^minecraft\/lang\/.*\.json$/.test(s));
    const locales = new Set([ "en_us" ]);
    for (const path in assets) {
        const locale = path.substring(15, path.length - 5);
        locales.add(locale);
    }
    const sortedLocales = [...locales];
    sortedLocales.sort();

    // Write types/locales.d.ts
    console.log(`Writing types/locales.d.ts`);
    const localesFile = path.resolve(projectDir, "types", "locales.d.ts");
    await writeLocalesFile(localesFile, sortedLocales);

    // Write src/data/[locale].json
    const dataDir = path.resolve(projectDir, "src", "data");
    if (!(await fileExists(dataDir))) {
        console.log(`Creating src/data`);
        await fs.mkdir(dataDir);
    }
    for (const locale of sortedLocales) {
        console.log(`Writing src/data/${locale}.json`);
        const localeFile = path.resolve(dataDir, `${locale}.json`);
        if ("en_us" === locale) {
            const resource = await release.getResource("assets/minecraft/lang/en_us.json");
            await fs.writeFile(localeFile, resource);
        } else {
            const asset = assets[`minecraft/lang/${locale}.json`];
            const stream = await asset.download();
            await stream.pipeTo(Writable.toWeb(createWriteStream(localeFile)));
        }
    }

    // Write src/data.mjs
    console.log(`Writing src/data.mjs`);
    const dataScript = path.resolve(projectDir, "src", "data.mjs");
    await writeDataScript(dataScript, sortedLocales, releaseID);

    // Write .mc-version
    console.log(`Writing .mc-version`);
    const versionFile = path.resolve(projectDir, ".mc-version");
    await fs.writeFile(versionFile, releaseID, { encoding: "utf-8" });
    console.log(`Done!`);
});

if (import.meta.main) {
    const projectDir = path.resolve(import.meta.dirname, "..");
    run(projectDir).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

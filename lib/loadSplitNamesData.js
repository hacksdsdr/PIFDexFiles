/**
 * The fusion name data is only available in Ruby source code, so this module
 * has a *really* stupid hardcoded parser for SplitNames.rb
 */

import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Context from "./StringContext.js";

const MAX_ID = 470;
const DATA_PATH = join(
	dirname(fileURLToPath(import.meta.url)),
	"data/SplitNames.rb"
);

const WS_RE = /[ \t\n]*/y;
const COMMENT_RE = /#.*\n[ \t\n]*/y;
const START_RE = /module GameData/y;
const SPLIT_NAMES_START_RE = /SPLIT_NAMES = \[/y;
const SPLIT_NAMES_DATA_RE = /\["([^"]*)", "([^"]*)"\],/y;
const SPLIT_NAMES_END_RE = /\]/y;
const NAT_DEX_START_RE = /NAT_DEX_MAPPING = {/y;
const NAT_DEX_DATA_RE = /([1-9][0-9]*) => ([1-9][0-9]*),/y;
const NAT_DEX_END_RE = /\}/y;
const END_RE = /end/y;

/** @type {[string, string][]} */
const SPLIT_NAMES = [];

/** @type {{[id: string]: number}} */
const NAT_DEX_MAPPINGS = {};

/** @type {{[id: string]: [string, string]}} */
const DATA = {};

const context = new Context(fs.readFileSync(DATA_PATH, "utf-8"));

context.match(WS_RE);
if (context.match(START_RE) == null)
	throw new Error("Could not detect start of module.");

context.match(WS_RE);
if (context.match(SPLIT_NAMES_START_RE) == null)
	throw new Error("Could not detect SPLIT_NAMES data start.");

context.match(WS_RE);
while (context.match(SPLIT_NAMES_END_RE) == null) {
	const data = context.match(SPLIT_NAMES_DATA_RE);
	if (data == null)
		throw new Error("Error when detecting data in SPLIT_NAMES data block.");

	const [, start, end] = data;
	SPLIT_NAMES.push([start, end]);
	context.match(WS_RE);
}

context.match(WS_RE);
if (context.match(NAT_DEX_START_RE) == null)
	throw new Error("Could not detect NAT_DEX_MAPPING data start.");

context.match(WS_RE);
while (context.match(NAT_DEX_END_RE) == null) {
	context.match(COMMENT_RE);
	const data = context.match(NAT_DEX_DATA_RE);
	if (data == null)
		throw new Error(
			"Error when detecting data in NAT_DEX_MAPPING data block."
		);

	const [, a, b] = data;
	NAT_DEX_MAPPINGS[a] = parseInt(b, 10);
	context.match(WS_RE);
}

context.match(WS_RE);
if (context.match(END_RE) == null)
	throw new Error("Could not detect end of module.");

context.match(WS_RE);
if (!context.end) throw new Error("Unexpected additional data in module.");

/**
 * Transform SPLIT_NAMES and NAT_DEX_MAPPINGS to DATA
 */
for (let i = 1; i <= MAX_ID; ++i)
	DATA[i] = structuredClone(SPLIT_NAMES[NAT_DEX_MAPPINGS[i] ?? i]);

export default DATA;

/**
 * @typedef {{
 *   target: string,
 *   method: string,
 *   param:  string,
 * }} Evolution
 *
 * @typedef {{ move: string, level: number }} LearnedMove
 *
 * @typedef {{
 *  id:               string,
 *  name:             string,
 *  category:         string,
 *  pokedex_entry:    string,
 *  primary_type:     string,
 *  secondary_type:   string,
 *  base_hp:          number,
 *  base_atk:         number,
 *  base_def:         number,
 *  base_sp_atk:      number,
 *  base_sp_def:      number,
 *  base_spd:         number,
 *  ev_hp:            number,
 *  ev_atk:           number,
 *  ev_def:           number,
 *  ev_sp_atk:        number,
 *  ev_sp_def:        number,
 *  ev_spd:           number,
 *  base_exp:         number,
 *  growth_rate:      string,
 *  gender_ratio:     string,
 *  catch_rate:       number,
 *  happiness:        number,
 *  egg_groups:       string[],
 *  hatch_steps:      number,
 *  height:           number,
 *  weight:           number,
 *  color:            string,
 *  shape:            string,
 *  habitat:          string,
 *  back_sprite_x:    number,
 *  back_sprite_y:    number,
 *  front_sprite_x:   number,
 *  front_sprite_y:   number,
 *  front_sprite_a:   number,
 *  shadow_x:         number,
 *  shadow_size:      number,
 *  moves:            LearnedMove[],
 *  tutor_moves:      string[],
 *  egg_moves:        string[],
 *  abilities:        string[],
 *  hidden_abilities: string[],
 *  evolutions:       Evolution[]
 * }} Pokemon
 */

import fs from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { unique } from "./util.js";
import fuse from "./generateFusionData.js";
import Marshal from "./Marshal.js";

const DATA_PATH = join(
	dirname(fileURLToPath(import.meta.url)),
	"data/species.dat"
);

// A lot of Pokémon have duplicate names, this changes a few names to make them unique.
const NAME_OVERRIDES = {
	29: "Nidoran F",
	32: "Nidoran M",
	430: "Oricorio Baile Style",
	431: "Oricorio Pom-Pom Style",
	432: "Oricorio Pa'u Style",
	433: "Oricorio Sensu Style",
	464: "Lycanroc Midday",
	465: "Lycanroc Midnight",
	466: "Meloetta Aria Forme",
	467: "Meloetta Pirouette Forme",
	470: "Ultra Necrozma",
};

// Triple IDs are special, this maps them to "regular" IDs.
const TRIPLETS = {
	ZAPMOLTICUNO: "144.145.146",
	ENRAICUNE: "243.244.245",
	KYODONQUAZA: "340.341.342",
	PALDIATINA: "343.344.345",
	ZEKYUSHIRAM: "349.350.351",
	CELEMEWCHI: "151.251.381",
	VENUSTOIZARD: "3.6.9",
	MEGALIGASION: "154.157.160",
	SWAMPTILIKEN: "278.281.284",
	TORTERNEON: "318.321.324",
	DEOSECTWO: "150.348.380",
	TRIPLE_KANTO1: "1.4.7",
	TRIPLE_KANTO2: "2.5.8",
	TRIPLE_JOHTO1: "152.155.158",
	TRIPLE_JOHTO2: "153.156.159",
	TRIPLE_HOENN1: "276.279.282",
	TRIPLE_HOENN2: "277.280.283",
	TRIPLE_SINNOH1: "316.319.322",
	TRIPLE_SINNOH2: "317.320.323",
	REGITRIO: "447.448.449",
};

// Triple data that can be skipped
const BOSSES = new Set([
	"BIRDBOSS",
	"BIRDBOSS_1",
	"BIRDBOSS_2",
	"BIRDBOSS_3",
	"SILVERBOSS_1",
	"SILVERBOSS_2",
	"SILVERBOSS_3",
	"TYRANTRUM_CARDBOARD",
]);

// This is a quick hack to set Ultra Necrozma to be an evolution of Necrozma
const EVOLUTION_OVERRIDES = {
	450: [{ target: "U_NECROZMA", method: "NECROZMA", param: "" }],
};

/**
 * The game stores both evolutions and prevolutions, since we can derive
 * prevolutions we skip that data before normalizing the evolution data.
 *
 * @param {[string, string, string|number, boolean][]} evolutions
 * @return {Evolution[]}
 */
const transformEvolutions = (evolutions) =>
	unique(
		evolutions
			.filter(([, , , prevolution]) => !prevolution)
			.map(([target, method, parameter]) => ({
				target,
				method,
				param: parameter.toString(),
			}))
	);

/**
 * Keep track of the game's internal string IDs to convert to numeric IDs.
 *
 * @type {Map<string,string>}
 */
const EVOLUTION_ID_MAP = new Map();

/** @param {Pokemon[]} pokemon */
const fixEvolutions = (pokemon) =>
	pokemon.forEach((pokemon) => {
		pokemon.evolutions.forEach((evolution) => {
			evolution.target =
				EVOLUTION_ID_MAP.get(evolution.target) ?? "ERROR";
		});
	});

/** @type {Pokemon[]} */
export const base = [];

/** @type {Pokemon[]} */
export const triples = [];

/**
 * species.dat is a key-value array containing all the base Pokémon, every boss
 * and every triple fusion. They are keyed once by their numeric ID and once by
 * their string ID - as such if naively iterated through each entry would show
 * up twice. To avoid this simply skip either the string key'd entries, or the
 * numeric ID key'd entries.
 */
const marshal = await Marshal.fromReadable(fs.createReadStream(DATA_PATH));

for await (const [key, data] of marshal.streamDecode()) {
	// Should never happen, but helps with IDE type hinting
	if ("object" !== typeof data || data == null) continue;

	// De-duplicate data
	if (key !== data["id_number"]) continue;
	if (BOSSES.has(data["id"])) continue;

	const isTriple = data["id"] in TRIPLETS;
	const id = isTriple ? TRIPLETS[data["id"]] : key.toString();

	EVOLUTION_ID_MAP.set(data["id"], id);
	/** @type {Pokemon} */
	const pokemon = {
		id,
		name: NAME_OVERRIDES[id] ?? data["real_name"],
		category: data["real_category"],
		pokedex_entry: data["real_pokedex_entry"],
		primary_type: data["type1"],
		secondary_type: data["type2"],
		base_hp: data["base_stats"].HP,
		base_atk: data["base_stats"].ATTACK,
		base_def: data["base_stats"].DEFENSE,
		base_sp_atk: data["base_stats"].SPECIAL_ATTACK,
		base_sp_def: data["base_stats"].SPECIAL_DEFENSE,
		base_spd: data["base_stats"].SPEED,
		ev_hp: data["evs"].HP,
		ev_atk: data["evs"].ATTACK,
		ev_def: data["evs"].DEFENSE,
		ev_sp_atk: data["evs"].SPECIAL_ATTACK,
		ev_sp_def: data["evs"].SPECIAL_DEFENSE,
		ev_spd: data["evs"].SPEED,
		base_exp: data["base_exp"],
		growth_rate: data["growth_rate"],
		gender_ratio: data["gender_ratio"],
		catch_rate: data["catch_rate"],
		happiness: data["happiness"],
		egg_groups: data["egg_groups"],
		hatch_steps: data["hatch_steps"],
		height: data["height"],
		weight: data["weight"],
		color: data["color"],
		shape: data["shape"],
		habitat: data["habitat"],
		back_sprite_x: data["back_sprite_x"],
		back_sprite_y: data["back_sprite_y"],
		front_sprite_x: data["front_sprite_x"],
		front_sprite_y: data["front_sprite_y"],
		front_sprite_a: data["front_sprite_altitude"],
		shadow_x: data["shadow_x"],
		shadow_size: data["shadow_size"],

		moves: unique(data["moves"].map(([level, move]) => ({ level, move }))),
		tutor_moves: unique(data["tutor_moves"]),
		egg_moves: unique(data["egg_moves"]),
		abilities: unique(data["abilities"]),
		hidden_abilities: unique(data["hidden_abilities"]),
		evolutions:
			EVOLUTION_OVERRIDES[id] ?? transformEvolutions(data["evolutions"]),
	};

	if (isTriple) {
		triples.push(pokemon);
	} else {
		base.push(pokemon);
	}
}

fixEvolutions(base);
fixEvolutions(triples);
EVOLUTION_ID_MAP.clear();
triples.sort((a, b) => a.id.localeCompare(b.id, "en-US", { numeric: true }));

/**
 * @param {Pokemon[]} pokemon
 * @yield {{head: Pokemon, body: Pokemon, result: Pokemon}}
 */
function* makeFusions(pokemon) {
	for (const head of pokemon)
		for (const body of pokemon) yield fuse(head, body);
}

export const fusions = makeFusions(base);

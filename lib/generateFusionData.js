/**
 * Ported from:
 * - https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/Data/Scripts/048_Fusion/FusedSpecies.rb
 *
 * @typedef {import("./loadPokemon.js").Pokemon} Pokemon
 */

import fuseNames from "./generateFusionName.js";
import { unique } from "./util.js";

// TODO: May change for balance
const GROWTH_RATE_PRIORITY = [
	"Slow",
	"Erratic",
	"Fluctuating",
	"Parabolic",
	"Medium",
	"Fast",
];

/**
 * @param {string} start
 * @param {string} end
 * @param {string} separator
 * @return {string}
 */
const splitAndCombineText = (start, end, separator) =>
	start.split(separator, 2)[0] + separator + end.split(separator, 2).at(-1);

/**
 * @param {number} dominant
 * @param {number} recessive
 * @return {number}
 */
const calcStat = (dominant, recessive) =>
	Math.max(1, Math.floor((dominant + dominant + recessive) / 3));

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
const calcEv = (a, b) => Math.max(0, Math.floor((a + b) / 2));

/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
const avg = (a, b) => Math.floor((a + b) / 2);

/**
 * @param {Pokemon} head
 * @param {Pokemon} body
 * @return {Pokemon}
 */
export default (head, body) => {
	const id = head.id + "." + body.id;
	const name = fuseNames(head.id, body.id);

	const category = splitAndCombineText(head.category, body.category, " ");
	const pokedex_entry =
		splitAndCombineText(
			head.pokedex_entry.replaceAll(head.name, name),
			body.pokedex_entry.replaceAll(body.name, name),
			"."
		) + ".";

	// TODO: type exceptions
	const primary_type =
		head.primary_type === "NORMAL" && head.secondary_type === "FLYING"
			? "FLYING"
			: head.primary_type;

	const secondary_type =
		primary_type === body.secondary_type
			? body.primary_type
			: body.secondary_type;

	const base_stats = {
		hp: calcStat(head.base_hp, body.base_hp),
		atk: calcStat(body.base_atk, head.base_atk),
		def: calcStat(body.base_def, head.base_def),
		sp_atk: calcStat(head.base_sp_atk, body.base_sp_atk),
		sp_def: calcStat(head.base_sp_def, body.base_sp_def),
		spd: calcStat(body.base_spd, head.base_spd),
	};

	const evs = {
		hp: calcEv(head.ev_hp, body.ev_hp),
		atk: calcEv(head.ev_atk, body.ev_atk),
		def: calcEv(head.ev_def, body.ev_def),
		sp_atk: calcEv(head.ev_sp_atk, body.ev_sp_atk),
		sp_def: calcEv(head.ev_sp_def, body.ev_sp_def),
		spd: calcEv(head.ev_spd, body.ev_spd),
	};

	const base_exp = avg(head.base_exp, body.base_exp);
	const growth_rate =
		GROWTH_RATE_PRIORITY.find(
			(rate) => rate === head.growth_rate || rate === body.growth_rate
		) ?? "Medium";

	// TODO
	const gender_ratio = "Genderless";
	const catch_rate = Math.min(head.catch_rate, body.catch_rate);
	const happiness = head.happiness;

	// TODO
	const egg_groups = ["Undiscovered"];
	const hatch_steps = avg(head.hatch_steps, body.hatch_steps);

	const height = avg(head.height, body.height);
	const weight = avg(head.weight, body.weight);
	const color = head.color;
	const shape = body.shape;
	const habitat = "None";

	const back_sprite_x = body.back_sprite_x;
	const back_sprite_y = body.back_sprite_y;
	const front_sprite_x = body.front_sprite_x;
	const front_sprite_y = body.front_sprite_y;
	const front_sprite_a = body.front_sprite_a;
	const shadow_x = body.shadow_x;
	const shadow_size = body.shadow_size;

	const moves = unique(head.moves, body.moves);
	const tutor_moves = unique(head.tutor_moves, body.tutor_moves);
	const egg_moves = unique(head.egg_moves, body.egg_moves);

	const abilities = [
		body.abilities[0],
		head.abilities[1] ?? head.abilities[0],
	].filter((s) => s != null);

	const hidden_abilities = [
		head.abilities[0],
		body.abilities[1] ?? body.abilities[0],
		body.hidden_abilities[0],
		head.hidden_abilities[0],
	].filter((s) => s != null);

	const evolutions = [];
	for (const evolution of head.evolutions) {
		evolutions.push({
			target: evolution.target + "." + body.id,
			method: evolution.method,
			param: evolution.param,
		});
	}

	for (const evolution of body.evolutions) {
		evolutions.push({
			target: head.id + "." + evolution.target,
			method: evolution.method,
			param: evolution.param,
		});
	}

	return {
		id,
		name,
		category,
		pokedex_entry,
		primary_type,
		secondary_type,
		base_hp: base_stats.hp,
		base_atk: base_stats.atk,
		base_def: base_stats.def,
		base_sp_atk: base_stats.sp_atk,
		base_sp_def: base_stats.sp_def,
		base_spd: base_stats.spd,
		ev_hp: evs.hp,
		ev_atk: evs.atk,
		ev_def: evs.def,
		ev_sp_atk: evs.sp_atk,
		ev_sp_def: evs.sp_def,
		ev_spd: evs.spd,
		base_exp,
		growth_rate,
		gender_ratio,
		catch_rate,
		happiness,
		egg_groups,
		hatch_steps,
		height,
		weight,
		color,
		shape,
		habitat,
		back_sprite_x,
		back_sprite_y,
		front_sprite_x,
		front_sprite_y,
		front_sprite_a,
		shadow_x,
		shadow_size,
		moves: unique(moves),
		tutor_moves: unique(tutor_moves),
		egg_moves: unique(egg_moves),
		abilities: unique(abilities),
		hidden_abilities: unique(hidden_abilities),
		evolutions: unique(evolutions),
	};
};

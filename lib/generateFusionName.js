/**
 * Ported from:
 * - https://raw.githubusercontent.com/infinitefusion/infinitefusion-e18/main/Data/Scripts/048_Fusion/FusedSpecies.rb
 */

import DATA from "./loadSplitNamesData.js";

/**
 * @param {string} head
 * @param {string} body
 * @return {string}
 */
export default (head, body) => {
	let prefix = DATA[head][0];
	let suffix = DATA[body][1];

	if (prefix.at(-1) === suffix[0]) {
		prefix = prefix.slice(0, -1);
	}

	const name = prefix + suffix;
	return name[0].toUpperCase() + name.slice(1);
};

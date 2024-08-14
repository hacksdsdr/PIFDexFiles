import { base, fusions, triples } from "./lib/loadPokemon.js";

// Log all base pokemon, fusions, and triples
for (const pokemon of base) {
	console.log(pokemon);

	if (pokemon.id >= 5) break;
}

// for (const pokemon of fusions) {
// 	console.log(pokemon.id, pokemon.name);
// }

// for (const pokemon of triples) {
// 	console.log(pokemon.id, pokemon.name);
// }

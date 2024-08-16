import { base, fusions, triples } from "./lib/loadPokemon.js";
import fs from 'fs/promises';

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   evolvesFrom: Array<{
 *     id: string,
 *     name: string,
 *     target: string,
 *     method: string,
 *     param: string
 *   }>,
 *   evolvesTo: Array<{
 *     id: string,
 *     name: string,
 *     target: string,
 *     method: string,
 *     param: string
 *   }>,
 *   evolutionChain: Array<{
 *     id: string,
 *     name: string,
 *     target: string,
 *     method: string,
 *     param: string
 *   }>
 * }} PokemonEvolution
 */

/**
 * @param {Pokemon[]} pokemonList 
 * @returns {Map<string, PokemonEvolution>}
 */
function extractEvolutions(pokemonList) {
    /** @type {Map<string, PokemonEvolution>} */
    const evolutionMap = new Map();

    for (const pokemon of pokemonList) {
        evolutionMap.set(pokemon.id, {
            id: pokemon.id,
            name: pokemon.name,
            evolvesFrom: [],
            evolvesTo: pokemon.evolutions.map(evo => ({
                id: evo.target,
                name: "", // Placeholder, will be filled later
                target: evo.target,
                method: evo.method,
                param: evo.param
            })),
            evolutionChain: []
        });
    }

    // Set evolvesFrom and fill in missing names in evolvesTo
    for (const [id, evo] of evolutionMap) {
        for (const evolvesToEntry of evo.evolvesTo) {
            const evolvesTo = evolutionMap.get(evolvesToEntry.id);
            if (evolvesTo) {
                evolvesTo.evolvesFrom.push({
                    id: evo.id,
                    name: evo.name,
                    target: evolvesToEntry.target,
                    method: evolvesToEntry.method,
                    param: evolvesToEntry.param
                });
                evolvesToEntry.name = evolvesTo.name;
            }
        }
    }

    // Remove duplicate entries in evolvesFrom and evolvesTo arrays
    for (const evo of evolutionMap.values()) {
        evo.evolvesFrom = removeDuplicates(evo.evolvesFrom);
        evo.evolvesTo = removeDuplicates(evo.evolvesTo);
    }

    return evolutionMap;
}

/**
 * @param {Array} array 
 * @returns {Array}
 */
function removeDuplicates(array) {
    return array.filter((item, index, self) =>
        index === self.findIndex((t) => (
            t.id === item.id && t.method === item.method && t.param === item.param
        ))
    );
}

/**
 * @param {Map<string, PokemonEvolution>} evolutionMap 
 */
function buildEvolutionChains(evolutionMap) {
    for (const evo of evolutionMap.values()) {
        if (evo.evolvesFrom.length === 0) {
            const chain = [];
            let current = evo;
            while (current) {
                chain.push({
                    id: current.id,
                    name: current.name,
                    target: current.evolvesTo[0]?.target || "",
                    method: current.evolvesTo[0]?.method || "",
                    param: current.evolvesTo[0]?.param || ""
                });
                current = current.evolvesTo.length > 0 ? evolutionMap.get(current.evolvesTo[0].id) : null;
            }
            // Assign the full chain to each Pokémon in the chain
            for (const link of chain) {
                const pokemon = evolutionMap.get(link.id);
                if (pokemon) {
                    pokemon.evolutionChain = removeDuplicates(chain);
                }
            }
        }
    }
}

async function main() {
    const baseEvolutions = extractEvolutions(base);
    const tripleEvolutions = extractEvolutions(triples);
    const fusionEvolutions = extractEvolutions(fusions);

    const allEvolutions = new Map([...baseEvolutions, ...tripleEvolutions, ...fusionEvolutions]);
    buildEvolutionChains(allEvolutions);

    // Convert to a more JSON-friendly format
    const evolutionData = Object.fromEntries(allEvolutions);

    try {
        await fs.writeFile('evolution_data.json', JSON.stringify(evolutionData, null, 2));
        console.log('Evolution data saved to evolution_data.json');
    } catch (error) {
        console.error('Error writing files:', error);
    }
}

main();

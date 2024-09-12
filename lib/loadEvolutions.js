import * as fs from 'fs';

const SpritesFolders = {
    base: '/graphics/base',
    fusion: '/graphics/fusions',
    triple: '/graphics/triples'
};

const AutogenFolders = '/graphics/autogen';

// Cache the sprite JSON data
let spriteDataCache = null;

/**
 * Load and cache the sprite JSON data.
 */
function loadSpriteData() {
    if (!spriteDataCache) {
        const spriteData = fs.readFileSync('./lib/data/artists.json', 'utf-8');
        spriteDataCache = JSON.parse(spriteData);
    }
    return spriteDataCache;
}

/**
 * Get the sprite image for a given ID.
 * 
 * @param {string} id The ID of the sprite to fetch.
 * @returns {string} The file path of the sprite image.
 */
function getSpriteImage(id) {
    const spriteData = loadSpriteData();

    const spriteEntries = spriteData.filter(sprite => sprite.base_id === id);
    const imageId = spriteEntries.length > 0 ? spriteEntries[0].sprite_id : null;

    let spriteImage = null;
    let spriteType = id.split('.').length === 1 ? 'base_sprite'
        : id.split('.').length === 2 ? 'fusion_sprite'
        : 'triple_sprite';

    if (spriteType === 'base_sprite') {
        if (imageId) {
            spriteImage = `${SpritesFolders.base}/${imageId}.png`;
        }
    }

    if (spriteType === 'fusion_sprite') {
        if (imageId) {
            spriteImage = `${SpritesFolders.fusion}/${imageId}.png`;
        } else {
            spriteImage = `${AutogenFolders}/${id}.png`;
        }
    }

    if (spriteType === 'triple_sprite') {
        if (imageId) {
            spriteImage = `${SpritesFolders.triple}/${imageId}.png`;
        }
    }

    return spriteImage;
}

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   evolvesFrom: Array<{
 *     id: string,
 *     name: string,
 *     target: string,
 *     method: string,
 *     param: string | null,
 *     image: string
 *   }>,
 *   evolvesTo: Array<{
 *     id: string,
 *     name: string,
 *     target: string,
 *     method: string,
 *     param: string | null,
 *     image: string
 *   }>,
 *   evolutionChain: Array<{
 *     id: string,
 *     name: string,
 *     target: string | null,
 *     method: string | null,
 *     param: string | null,
 *     image: string
 *   }>
 * }} PokemonEvolution
 */

/**
 * @param {Pokemon[]} pokemonList 
 * @returns {Map<string, PokemonEvolution>}
 */
export function extractEvolutions(pokemonList) {
    const evolutionMap = new Map();

    // Build base data with empty evolvesTo/evolvesFrom/evolutionChain
    for (const pokemon of pokemonList) {
        const evolvesTo = pokemon.evolutions ? pokemon.evolutions.map(evo => ({
            id: evo.target,
            name: null,
            target: evo.target,
            method: evo.method,
            param: evo.param || null,
            image: getSpriteImage(evo.target) || ''
        })) : [];

        const pokemonData = {
            ...pokemon,
            evolvesFrom: [],
            evolvesTo: evolvesTo,
            evolutionChain: []
        };

        delete pokemonData.evolutions;
        // console.log(`Processed evolutions for id ${pokemon.id}`);

        evolutionMap.set(pokemon.id, pokemonData);
    }

    // Populate evolvesFrom and resolve evolve names
    for (const [id, evo] of evolutionMap) {
        for (const evolvesToEntry of evo.evolvesTo) {
            const evolvesTo = evolutionMap.get(evolvesToEntry.id);
            if (evolvesTo) {
                evolvesTo.evolvesFrom.push({
                    id: evo.id,
                    name: evo.name,
                    target: evolvesToEntry.target,
                    method: evolvesToEntry.method,
                    param: evolvesToEntry.param,
                    image: getSpriteImage(evo.id) || ''
                });
                evolvesToEntry.name = evolvesTo.name;
            }
        }
    }

    return evolutionMap;
}

/**
 * @param {Map<string, PokemonEvolution>} evolutionMap 
 */
export function buildEvolutionChains(evolutionMap) {
    for (const [id, evo] of evolutionMap) {
        // Only build chain if it's empty
        if (evo.evolutionChain.length === 0) {
            // console.log(`Building chain for Pokémon ID: ${id} (${evo.name})`);
            const chain = [];

            let current = evo;

            // Traverse backward to find the base Pokémon (if evolves_from exists)
            while (current.evolvesFrom.length > 0) {
                const previous = evolutionMap.get(current.evolvesFrom[0].id);
                if (previous) {
                    current = previous;
                } else {
                    break;
                }
            }

            // Start building the chain from the base Pokémon
            let chainBuilt = false;
            while (current) {
                // console.log(`Adding ${current.name} (ID: ${current.id}) to the chain`);

                // Add the current Pokémon to the chain
                chain.push({
                    id: current.id,
                    name: current.name,
                    target: current.evolvesTo.length > 0 ? current.evolvesTo[0].target : null,
                    method: current.evolvesTo.length > 0 ? current.evolvesTo[0].method : null,
                    param: current.evolvesTo.length > 0 ? current.evolvesTo[0].param : null,
                    image: getSpriteImage(current.id)
                });

                // Move to the next evolution stage
                if (current.evolvesTo.length > 0) {
                    // Handle multiple evolutions (e.g., Eevee)
                    for (const evolvesToEntry of current.evolvesTo) {
                        const nextEvo = evolutionMap.get(evolvesToEntry.id);
                        if (nextEvo) {
                            chain.push({
                                id: nextEvo.id,
                                name: nextEvo.name,
                                target: evolvesToEntry.target,
                                method: evolvesToEntry.method,
                                param: evolvesToEntry.param,
                                image: getSpriteImage(nextEvo.id)
                            });
                        }
                    }

                    // Break if there are no more evolutions
                    if (!current.evolvesTo || current.evolvesTo.length === 0) {
                        break;
                    }
                } else {
                    break;
                }

                current = evolutionMap.get(current.evolvesTo[0]?.id);
                chainBuilt = true;
            }

            // If no forward chain is built but evolves_from exists, still push the current Pokémon into the chain
            if (!chainBuilt && evo.evolvesFrom.length > 0) {
                chain.push({
                    id: evo.id,
                    name: evo.name,
                    target: null, // No next stage
                    method: null,
                    param: null,
                    image: getSpriteImage(evo.id)
                });
            }

            // Assign the evolution chain to all Pokémon in the chain
            for (const link of chain) {
                const pokemon = evolutionMap.get(link.id);
                if (pokemon) {
                    pokemon.evolutionChain = chain.map(chainLink => ({
                        id: chainLink.id,
                        name: chainLink.name,
                        target: chainLink.target,
                        method: chainLink.method,
                        param: chainLink.param,
                        image: chainLink.image
                    }));
                }
            }

            // Log the final evolution chain for debugging purposes
            // console.log(`Final evolution chain for ${evo.name} (ID: ${evo.id}):`, chain);
        }
    }
}

import * as fs from 'fs';

const SpritesFolders = {
    base: './graphics/custom-sprites/Other/BaseSprites',
    fusion: './graphics/custom-sprites/CustomBattlers',
    triple: './graphics/custom-sprites/Other/Triples'
};

const AutogenFolders = './graphics/autogen-sprites';

function getSpriteImage(id) {
    // Determine the sprite type based on the structure of the ID
    let spriteType = id.split('.').length === 1 ? 'base_sprite' 
                   : id.split('.').length === 2 ? 'fusion_sprite'
                   : 'triple_sprite';

    let spriteImage;

    /**
     * Handle sprite image paths based on the sprite type:
     * 
     * 1. Base Sprites and Triple Sprites:
     *    - Construct the image path directly using the format:
     *      `${SpritesFolders.base}/${id}.png` for base sprites.
     *      `${SpritesFolders.triple}/${id}.png` for triple sprites.
     *
     * 2. Fusion Sprites:
     *    - First, check if the custom fusion sprite image exists in the Fusion folder.
     *    - If the custom image is not found, generate the path for an auto-generated
     *      fusion sprite image:
     *      - The fusion ID is in the format `headId.bodyId`, where `headId` represents the
     *        head Pokémon's Pokedex ID and `bodyId` represents the body Pokémon's Pokedex ID.
     *      - Construct the path for the auto-generated image:
     *        `${AutogenFolders}/${headId}/${id}.png`
     *    - Set the spriteImage to the custom fusion image if it exists; otherwise, use the auto-generated image.
     */

    if (spriteType === 'base_sprite') {
        // For base sprites, construct the image path directly
        spriteImage = `${SpritesFolders.base}/${id}.png`;
    } else if (spriteType === 'triple_sprite') {
        // For triple sprites, construct the image path directly
        spriteImage = `${SpritesFolders.triple}/${id}.png`;
    } else if (spriteType === 'fusion_sprite') {
        // For fusion sprites, first attempt to find a custom fusion image
        const [headId, bodyId] = id.split('.');
        const fusionImage = `${SpritesFolders.fusion}/${id}.png`;
        const autogenImage = `${AutogenFolders}/${headId}/${id}.png`;

        // Use the custom fusion image if it exists, otherwise use the auto-generated image
        spriteImage = fs.existsSync(fusionImage) ? fusionImage : autogenImage;
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

   for (const pokemon of pokemonList) {
       const evolvesTo = pokemon.evolutions ? pokemon.evolutions.map(evo => ({
           id: evo.target,
           name: null,
           target: evo.target,
           method: evo.method,
           param: evo.param || null,
           image: getSpriteImage(evo.target)
       })) : [];

       const pokemonData = {
           ...pokemon,
           evolvesFrom: [],
           evolvesTo: evolvesTo,
           evolutionChain: []
       };

       // Remove the evolutions property from the final data
       delete pokemonData.evolutions;
       console.log(`Processed evolutions for id ${pokemon.id}`)

       evolutionMap.set(pokemon.id, pokemonData);
   }

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
                   image: getSpriteImage(evo.id)
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
       if (evo.evolutionChain.length === 0) {
           const chain = [];

           let current = evo;
           while (current.evolvesFrom.length > 0) {
               const previous = evolutionMap.get(current.evolvesFrom[0].id);
               if (previous) {
                   current = previous;
               } else {
                   break;
               }
           }

           while (current) {
               chain.push({
                   id: current.id,
                   name: current.name,
                   target: current.evolvesTo[0]?.target || null,
                   method: current.evolvesTo[0]?.method || null,
                   param: current.evolvesTo[0]?.param || null,
                   image: getSpriteImage(current.id)
               });

               if (current.evolvesTo.length > 0) {
                   current = evolutionMap.get(current.evolvesTo[0].id);
               } else {
                   current = null;
               }
           }

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
       }
   }
}

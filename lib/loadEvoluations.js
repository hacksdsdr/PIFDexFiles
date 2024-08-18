/**
 * @typedef {{
*   id: string,
*   name: string,
*   evolvesFrom: Array<{
*     id: string,
*     name: string,
*     target: string,
*     method: string,
*     param: string | null
*   }>,
*   evolvesTo: Array<{
*     id: string,
*     name: string,
*     target: string,
*     method: string,
*     param: string | null
*   }>,
*   evolutionChain: Array<{
*     id: string,
*     name: string,
*     target: string | null,
*     method: string | null,
*     param: string | null
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
           param: evo.param || null
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
                   param: evolvesToEntry.param
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
                   param: current.evolvesTo[0]?.param || null
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
                       param: chainLink.param
                   }));
               }
           }
       }
   }
}
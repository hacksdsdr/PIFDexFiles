import { base, fusions, triples } from "./lib/loadPokemon.js";
import fs from 'fs';
import { buildEvolutionChains, extractEvolutions } from "./lib/loadEvoluations.js";



async function main() {
    const baseEvolutions = extractEvolutions(base);
    const tripleEvolutions = extractEvolutions(triples);
    const fusionEvolutions = extractEvolutions(fusions);

    const allEvolutions = new Map([...baseEvolutions, ...tripleEvolutions, ...fusionEvolutions]);
    buildEvolutionChains(allEvolutions);

    // Convert to a more JSON-friendly format
    const evolutionData = Object.fromEntries(allEvolutions);

    try {
        const writeStream = fs.createWriteStream('pokemons_data.json', { flags: 'w' });

        // Write the opening brace for the JSON object
        writeStream.write('{\n');

        const pokemonEntries = Object.entries(evolutionData);
        for (let i = 0; i < pokemonEntries.length; i++) {
            const [key, value] = pokemonEntries[i];
            const jsonEntry = `"${key}": ${JSON.stringify(value, null, 2)}`;

            // Write the JSON entry
            writeStream.write(jsonEntry);

            // If it's not the last entry, add a comma and newline
            if (i < pokemonEntries.length - 1) {
                writeStream.write(',\n');
            }

            // Log progress every 1000 entries
            if (i % 1000 === 0) {
                console.log(`Processed ${i} entries...`);
            }
        }

        // Write the closing brace for the JSON object
        writeStream.write('\n}');

        // Close the stream
        writeStream.end();
        console.log('Evolution data saved to pokemons_data.json');
    } catch (error) {
        console.error('Error writing files:', error);
    }
}

main();
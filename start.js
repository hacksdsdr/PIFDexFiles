import { base, fusions, triples } from "./lib/loadPokemon.js";
import { buildEvolutionChains, extractEvolutions } from "./lib/loadEvoluations.js";
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SPRITE_CREDITS_PATH = './lib/data/Sprite Credits.csv';
const SPRITE_FOLDERS = {
    base: './graphics/custom-sprites/Other/BaseSprites',
    fusion: './graphics/custom-sprites/CustomBattlers',
    triple: './graphics/custom-sprites/Other/Triples'
};
const AUTOGEN_FOLDER = './graphics/autogen-sprites';

async function readCSV(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const results = [];
    for await (const line of rl) {
        const [id, artist, type, notes] = line.split(',');
        results.push({ id, artist, type, notes });
    }
    return results;
}

function getSpritesForId(id, folderPath) {
    const files = fs.readdirSync(folderPath);
    const regex = new RegExp(`^${id}[a-z]?\\.png$`);
    return files.filter(file => regex.test(file));
}

function processSprites(pokemonList, spriteCredits, type) {
    const folderPath = SPRITE_FOLDERS[type];
    
    for (const pokemon of pokemonList) {
        const id = pokemon.id;
        const sprites = getSpritesForId(id, folderPath);
        let primaryImage, alternativeSprites = [];

        if (sprites.length > 0) {
            // For primary image: check full ID in CSV, fallback to just number if needed
            const credit = spriteCredits.find(c => c.id === id) || 
                           spriteCredits.find(c => c.id === id.split('.').pop());

            primaryImage = {
                url: path.join(folderPath, `${id}.png`),
                artist: credit ? credit.artist.split(' & ') : []
            };

            alternativeSprites = sprites.map(sprite => {
                const spriteId = path.parse(sprite).name;
                const spriteCredit = spriteCredits.find(c => c.id === spriteId) || 
                                     spriteCredits.find(c => c.id === spriteId.replace(/[a-z]$/, ''));
                return {
                    url: path.join(folderPath, sprite),
                    artist: spriteCredit ? spriteCredit.artist.split(' & ') : []
                };
            });
        }

        // If no custom sprites are available and type is fusion, use autogen
        if (type === 'fusion' && !primaryImage) {
            primaryImage = {
                url: path.join(AUTOGEN_FOLDER, id.split('.')[0], `${id}.png`),
                artist: ['Jeapal Fusion Calculator']
            };
            alternativeSprites.push(primaryImage);
        }

        // Assign primary and alternative sprites to the Pokémon object
        pokemon.primary_image = primaryImage;
        pokemon.alternative_sprites = alternativeSprites;
    }
}

async function main() {
    try {
        console.log("Reading sprite credits...");
        const spriteCredits = await readCSV(SPRITE_CREDITS_PATH);
        console.log(`Read ${spriteCredits.length} sprite credit entries.`);
        
        console.log("Processing base Pokémon sprites...");
        processSprites(base, spriteCredits, 'base');
        
        console.log("Processing fusion Pokémon sprites...");
        processSprites(fusions, spriteCredits, 'fusion');
        
        console.log("Processing triple Pokémon sprites...");
        processSprites(triples, spriteCredits, 'triple');
        
        console.log("Extracting evolutions...");
        const baseEvolutions = extractEvolutions(base);
        const fusionEvolutions = extractEvolutions(fusions);
        const tripleEvolutions = extractEvolutions(triples);

        const allEvolutions = new Map([...baseEvolutions, ...fusionEvolutions, ...tripleEvolutions]);
        
        console.log("Building evolution chains...");
        buildEvolutionChains(allEvolutions);

        const evolutionData = Object.fromEntries(allEvolutions);

        console.log("Writing data to file in chunks...");
        const writeStream = fs.createWriteStream('pokemons_data.json', { flags: 'w' });
        writeStream.write('{\n');

        const pokemonEntries = Object.entries(evolutionData);
        for (let i = 0; i < pokemonEntries.length; i++) {
            const [key, value] = pokemonEntries[i];
            const jsonEntry = `"${key}": ${JSON.stringify(value, null, 2)}`;

            if (i > 0) {
                writeStream.write(',\n');
            }
            writeStream.write(jsonEntry);

            if (i % 1000 === 0) {
                console.log(`Processed ${i} entries...`);
            }
        }

        writeStream.write('\n}');
        writeStream.end();

        console.log('Pokémon data saved to pokemons_data.json');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();

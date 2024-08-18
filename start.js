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

function getCachedSprites(folderPath) {
    return fs.promises.readdir(folderPath).then(files => {
        return files.reduce((cache, file) => {
            const [id] = file.split('.');
            cache[id] = file;
            return cache;
        }, {});
    });
}

async function processSprites(pokemonList, spriteCredits, type, spriteCache) {
    const folderPath = SPRITE_FOLDERS[type];
    
    for (const pokemon of pokemonList) {
        const id = pokemon.id;
        console.log(`Processing Sprites for ID: ${id}`);

        const primarySprite = spriteCache[id] || null;
        const alternativeSprites = [];

        // Find sprite credits
        const credit = spriteCredits.find(c => c.id === id) || 
                       spriteCredits.find(c => c.id === id.split('.').pop());

        if (primarySprite) {
            pokemon.primary_image = {
                url: path.join(folderPath, primarySprite),
                artist: credit ? credit.artist.split(' & ') : []
            };

            alternativeSprites.push(pokemon.primary_image);
        }

        // Handle alternative sprites
        const allSprites = Object.values(spriteCache).filter(file => file.startsWith(id));
        for (const sprite of allSprites) {
            const spriteId = path.parse(sprite).name;
            const spriteCredit = spriteCredits.find(c => c.id === spriteId) || 
                                 spriteCredits.find(c => c.id === spriteId.replace(/[a-z]$/, ''));
            alternativeSprites.push({
                url: path.join(folderPath, sprite),
                artist: spriteCredit ? spriteCredit.artist.split(' & ') : []
            });
        }

        if (type === 'fusion' && !primarySprite) {
            pokemon.primary_image = {
                url: path.join(AUTOGEN_FOLDER, id.split('.')[0], `${id}.png`),
                artist: ['Jeapal Fusion Calculator']
            };
            alternativeSprites.push(pokemon.primary_image);
        }

        pokemon.alternative_sprites = alternativeSprites;
    }
}

async function main() {
    try {
        console.log("Reading sprite credits...");
        const spriteCredits = await readCSV(SPRITE_CREDITS_PATH);
        console.log(`Read ${spriteCredits.length} sprite credit entries.`);
        
        // Caching sprite files
        const baseSpriteCache = await getCachedSprites(SPRITE_FOLDERS.base);
        const fusionSpriteCache = await getCachedSprites(SPRITE_FOLDERS.fusion);
        const tripleSpriteCache = await getCachedSprites(SPRITE_FOLDERS.triple);

        console.log("Processing base Pokémon sprites...");
        await processSprites(base, spriteCredits, 'base', baseSpriteCache);
        
        console.log("Processing fusion Pokémon sprites...");
        await processSprites(fusions, spriteCredits, 'fusion', fusionSpriteCache);
        
        console.log("Processing triple Pokémon sprites...");
        await processSprites(triples, spriteCredits, 'triple', tripleSpriteCache);
        
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

            console.log(`Processed Pokémon with ID: ${key} (${i + 1}/${pokemonEntries.length})`);

            if (i % 1000 === 0) {
                writeStream.write('\n');  // Flush buffer to avoid memory issues
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

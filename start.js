import { base, fusions, triples } from "./lib/loadPokemon.js";
import { buildEvolutionChains, extractEvolutions } from "./lib/loadEvoluations.js";
import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const SPRITE_CREDITS_PATH = './lib/data/Sprite Credits.csv';
const SPRITE_FOLDERS = {
    base: './graphics/custom-sprites/Other/BaseSprites',
    fusion: './graphics/custom-sprites/CustomBattlers',
    triple: './graphics/custom-sprites/Other/Triples'
};
const AUTOGEN_FOLDER = './graphics/autogen-sprites';
const DB_PATH = './pokemon_data.sqlite';
const CHUNK_SIZE = 1000;

let spriteFiles = {};
let spriteCredits = [];

async function initializeDatabase(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sprites (
            id TEXT PRIMARY KEY,
            name TEXT,
            category TEXT,
            pokedex_entry TEXT,
            primary_type TEXT,
            secondary_type TEXT,
            base_hp INTEGER,
            base_atk INTEGER,
            base_def INTEGER,
            base_sp_atk INTEGER,
            base_sp_def INTEGER,
            base_spd INTEGER,
            ev_hp INTEGER,
            ev_atk INTEGER,
            ev_def INTEGER,
            ev_sp_atk INTEGER,
            ev_sp_def INTEGER,
            ev_spd INTEGER,
            base_exp INTEGER,
            growth_rate TEXT,
            gender_ratio TEXT,
            catch_rate INTEGER,
            happiness INTEGER,
            egg_groups JSON,
            hatch_steps INTEGER,
            height INTEGER,
            weight INTEGER,
            color TEXT,
            shape TEXT,
            habitat TEXT,
            back_sprite_x INTEGER,
            back_sprite_y INTEGER,
            front_sprite_x INTEGER,
            front_sprite_y INTEGER,
            front_sprite_a INTEGER,
            shadow_x INTEGER,
            shadow_size INTEGER,
            moves JSON,
            tutor_moves JSON,
            egg_moves JSON,
            abilities JSON,
            hidden_abilities JSON,
            primary_image JSON,
            alternative_sprites JSON,
            evolves_from JSON,
            evolves_to JSON,
            evolution_chain JSON
        )
    `);
}


async function readCSV(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent.split('\n').map(line => {
        const [id, artist, type, notes] = line.split(',');
        return { id, artist, type, notes };
    });
}

async function cacheFileList() {
    for (const [key, folder] of Object.entries(SPRITE_FOLDERS)) {
        spriteFiles[key] = new Set(await fs.readdir(folder));
    }
}

function getSpritesForId(id, type) {
    const regex = new RegExp(`^${id}[a-z]?\\.png$`);
    return Array.from(spriteFiles[type]).filter(file => regex.test(file));
}

function processSprites(pokemon, type) {
    const folderPath = SPRITE_FOLDERS[type];
    const sprites = getSpritesForId(pokemon.id, type);

    let primaryImage, alternativeSprites = [];

    if (sprites.length > 0) {
        const credit = spriteCredits.find(c => c.id === pokemon.id) || 
                       spriteCredits.find(c => c.id === pokemon.id.split('.').pop());

        primaryImage = {
            url: path.join(folderPath, `${pokemon.id}.png`),
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

    if (type === 'fusion' && !primaryImage) {
        primaryImage = {
            url: path.join(AUTOGEN_FOLDER, pokemon.id.split('.')[0], `${pokemon.id}.png`),
            artist: ['Jeapal Fusion Calculator']
        };
    }
    
    alternativeSprites.push(primaryImage);

    return {
        ...pokemon,
        primary_image: primaryImage,
        alternative_sprites: alternativeSprites
    };
}

async function insertPokemonData(db, pokemon) {
    const stmt = await db.prepare(`
        INSERT OR REPLACE INTO pokemon (
            id, name, category, pokedex_entry, primary_type, secondary_type,
            base_hp, base_atk, base_def, base_sp_atk, base_sp_def, base_spd,
            ev_hp, ev_atk, ev_def, ev_sp_atk, ev_sp_def, ev_spd,
            base_exp, growth_rate, gender_ratio, catch_rate, happiness,
            egg_groups, hatch_steps, height, weight, color, shape, habitat,
            back_sprite_x, back_sprite_y, front_sprite_x, front_sprite_y,
            front_sprite_a, shadow_x, shadow_size,
            moves, tutor_moves, egg_moves, abilities, hidden_abilities,
            primary_image, alternative_sprites, evolves_from, evolves_to, evolution_chain
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
        pokemon.id,
        pokemon.name,
        pokemon.category,
        pokemon.pokedex_entry,
        pokemon.primary_type,
        pokemon.secondary_type,
        pokemon.base_hp,
        pokemon.base_atk,
        pokemon.base_def,
        pokemon.base_sp_atk,
        pokemon.base_sp_def,
        pokemon.base_spd,
        pokemon.ev_hp,
        pokemon.ev_atk,
        pokemon.ev_def,
        pokemon.ev_sp_atk,
        pokemon.ev_sp_def,
        pokemon.ev_spd,
        pokemon.base_exp,
        pokemon.growth_rate,
        pokemon.gender_ratio,
        pokemon.catch_rate,
        pokemon.happiness,
        JSON.stringify(pokemon.egg_groups),
        pokemon.hatch_steps,
        pokemon.height,
        pokemon.weight,
        pokemon.color,
        pokemon.shape,
        pokemon.habitat,
        pokemon.back_sprite_x,
        pokemon.back_sprite_y,
        pokemon.front_sprite_x,
        pokemon.front_sprite_y,
        pokemon.front_sprite_a,
        pokemon.shadow_x,
        pokemon.shadow_size,
        JSON.stringify(pokemon.moves),
        JSON.stringify(pokemon.tutor_moves),
        JSON.stringify(pokemon.egg_moves),
        JSON.stringify(pokemon.abilities),
        JSON.stringify(pokemon.hidden_abilities),

        JSON.stringify(pokemon.primary_image),
        JSON.stringify(pokemon.alternative_sprites),
        JSON.stringify(pokemon.evolvesFrom),
        JSON.stringify(pokemon.evolvesTo),
        JSON.stringify(pokemon.evolutionChain)
    );

    await stmt.finalize();
}

async function processPokemonChunk(db, pokemonChunk) {
    await db.run('BEGIN TRANSACTION');
    for (const pokemon of pokemonChunk) {
        const type = pokemon.id.includes('.') ? 'fusion' : (pokemon.id.includes('-') ? 'triple' : 'base');
        const processedPokemon = processSprites(pokemon, type);
        await insertPokemonData(db, processedPokemon);
        // console.log(`Processed Pokémon: ${pokemon.id} - ${pokemon.name}`);
    }
    await db.run('COMMIT');
}

async function main() {
    try {
        console.log("Initializing...");
        spriteCredits = await readCSV(SPRITE_CREDITS_PATH);
        console.log(`Read ${spriteCredits.length} sprite credit entries.`);

        console.log("Caching file lists...");
        await cacheFileList();

        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        await initializeDatabase(db);

        console.log("Processing Pokémon data...");
        const allPokemon = [...base, ...fusions, ...triples];

        console.log("Extracting evolutions...");
        const allEvolutions = extractEvolutions(allPokemon);

        console.log("Building evolution chains...");
        buildEvolutionChains(allEvolutions);

        allPokemon.forEach(pokemon => {
            const evolutionData = allEvolutions.get(pokemon.id) || {};
            pokemon.evolvesFrom = evolutionData.evolvesFrom || [];
            pokemon.evolvesTo = evolutionData.evolvesTo || [];
            pokemon.evolutionChain = evolutionData.evolutionChain || [];
        });

        console.log("Inserting data into SQLite database...");
        for (let i = 0; i < allPokemon.length; i += CHUNK_SIZE) {
            const chunk = allPokemon.slice(i, i + CHUNK_SIZE);
            await processPokemonChunk(db, chunk);
            console.log(`Processed ${i + chunk.length}/${allPokemon.length} Pokémon`);
        }

        await db.close();

        console.log('Pokémon data saved to SQLite database');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();

import fs from 'fs/promises';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { base, fusions, triples } from "./lib/loadPokemon.js";
import { buildEvolutionChains, extractEvolutions } from "./lib/loadEvolutions.js";

const DB_PATH = './data.sqlite';
const DEX_PATH = './lib/data/dex.json';
const CHUNK_SIZE = 10000;

// Function to load dex.json entries
async function loadDexEntries() {
    const dexData = await fs.readFile(DEX_PATH, 'utf-8');
    return JSON.parse(dexData);
}

// Initialize the database and create tables
async function initializeDatabase(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS sprites (
            id TEXT PRIMARY KEY,
            name TEXT,
            category TEXT,
            pokedex_entry TEXT,
            base_pokemons JSON,
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
            evolves_from JSON,
            evolves_to JSON,
            evolution_chain JSON
        )
    `);
}

// Function to create base Pokémon names by ID
function createBasePokemonName() {
    const pokemons = {};
    for (const pokemon of base) {
        pokemons[pokemon.id] = pokemon.name;
    }
    return pokemons;
}

const basePokemonName = createBasePokemonName();

// Process Pokémon data, check dex.json for additional entries
async function processPokemonData(db, pokemon, dexEntries) {

    const basePokemons = pokemon.id.split('.').map(pokemonId => {
        let baseObj = {};
        baseObj[pokemonId] = basePokemonName[pokemonId];
        return baseObj;  // Correct return value
    });
    
    

    // Check if the sprite has a matching entry in dex.json
    const dexEntry = dexEntries.find(entry => entry.sprite === `${pokemon.id}.png`);
    const pokedexEntry = dexEntry ? dexEntry.entry : pokemon.pokedex_entry;

    return {
        ...pokemon,
        basePokemons: {...basePokemons},
        pokedex_entry: pokedexEntry // Update pokedex_entry if found in dex.json
    };
}

// Insert Pokémon data into SQLite
async function insertPokemonData(db, pokemon) {
    const stmt = await db.prepare(`
        INSERT OR REPLACE INTO sprites (
            id, name, category, pokedex_entry, base_pokemons, primary_type, secondary_type,
            base_hp, base_atk, base_def, base_sp_atk, base_sp_def, base_spd,
            ev_hp, ev_atk, ev_def, ev_sp_atk, ev_sp_def, ev_spd,
            base_exp, growth_rate, gender_ratio, catch_rate, happiness,
            egg_groups, hatch_steps, height, weight, color, shape, habitat,
            back_sprite_x, back_sprite_y, front_sprite_x, front_sprite_y,
            front_sprite_a, shadow_x, shadow_size,
            moves, tutor_moves, egg_moves, abilities, hidden_abilities,
            evolves_from, evolves_to, evolution_chain
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.run(
        pokemon.id,
        pokemon.name,
        pokemon.category,
        pokemon.pokedex_entry,
        JSON.stringify(pokemon.basePokemons),
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
        JSON.stringify(pokemon.evolves_from),
        JSON.stringify(pokemon.evolves_to),
        JSON.stringify(pokemon.evolution_chain)
    );

    await stmt.finalize();
}

// Process Pokémon in chunks for performance
async function processPokemonChunk(db, pokemonChunk, dexEntries) {
    await db.run('BEGIN TRANSACTION');
    try {
        for (const pokemon of pokemonChunk) {
            const processedPokemon = await processPokemonData(db, pokemon, dexEntries);
            await insertPokemonData(db, processedPokemon);
        }
        await db.run('COMMIT');
    } catch (error) {
        await db.run('ROLLBACK');
        console.error('Error processing chunk:', error);
    }
}

// Main function to run the whole process
async function main() {
    try {
        console.log("Loading dex entries...");
        const dexEntries = await loadDexEntries();

        console.log("Initializing database...");
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        await initializeDatabase(db);

        console.log("Processing Pokémon data...");
        // const allPokemon = [...base];
        const allPokemon = [...base, ...fusions, ...triples];

        console.log("Extracting evolutions...");
        const allEvolutions = extractEvolutions(allPokemon);

        console.log("Building evolution chains...");
        buildEvolutionChains(allEvolutions);

        allPokemon.forEach(pokemon => {
            const evolutionData = allEvolutions.get(pokemon.id) || {};
            pokemon.evolves_from = evolutionData.evolvesFrom || [];
            pokemon.evolves_to = evolutionData.evolvesTo || [];
            pokemon.evolution_chain = evolutionData.evolutionChain || [];
        });

        console.log("Inserting Pokémon data into SQLite...");
        for (let i = 0; i < allPokemon.length; i += CHUNK_SIZE) {
            const chunk = allPokemon.slice(i, i + CHUNK_SIZE);
            await processPokemonChunk(db, chunk, dexEntries);
            console.log(`Processed ${i + chunk.length}/${allPokemon.length} Pokémon`);
        }

        await db.close();
        console.log('Pokémon data saved to SQLite database');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();

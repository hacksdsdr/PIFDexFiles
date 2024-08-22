import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import path from 'path';

// Define paths and constants
const DB_PATH = './pokemon_data.sqlite';

// Function to initialize the base_sprites table
async function initializeBaseSpritesTable(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS base_sprites (
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
            total_variants INTEGER,
            evolves_from JSON,
            evolves_to JSON,
            evolution_chain JSON,
            fusion_as_head JSON,
            fusion_as_body JSON,
            total_head_fusions INTEGER,
            total_body_fusions INTEGER
        )
    `);
}

// Function to fetch base Pokémon data
async function fetchBaseSprites(db) {
    return db.all('SELECT * FROM sprites WHERE id NOT LIKE "%.%";');
}

async function processBaseSprite(db, baseSprite) {
    const baseId = baseSprite.id;
    const headFusions = [];
    const bodyFusions = [];
    let totalHeadFusions = 0;
    let totalBodyFusions = 0;

    // Parse JSON fields safely
    // const primaryImage = baseSprite.primary_image ? JSON.parse(baseSprite.primary_image) : {};
    // const alternativeSprites = baseSprite.alternative_sprites ? JSON.parse(baseSprite.alternative_sprites) : [];
    // const eggGroups = baseSprite.egg_groups ? JSON.parse(baseSprite.egg_groups) : [];
    // const moves = baseSprite.moves ? JSON.parse(baseSprite.moves) : [];
    // const tutorMoves = baseSprite.tutor_moves ? JSON.parse(baseSprite.tutor_moves) : [];
    // const eggMoves = baseSprite.egg_moves ? JSON.parse(baseSprite.egg_moves) : [];
    // const abilities = baseSprite.abilities ? JSON.parse(baseSprite.abilities) : [];
    // const hiddenAbilities = baseSprite.hidden_abilities ? JSON.parse(baseSprite.hidden_abilities) : [];
    // const evolvesFrom = baseSprite.evolves_from ? JSON.parse(baseSprite.evolves_from) : [];
    // const evolvesTo = baseSprite.evolves_to ? JSON.parse(baseSprite.evolves_to) : [];
    // const evolutionChain = baseSprite.evolution_chain ? JSON.parse(baseSprite.evolution_chain) : [];

    // Search for head fusions
    for (let i = 1; i <= 470; i++) {
        const fusionId = `${baseId}.${i}`;
        const fusion = await db.get('SELECT * FROM sprites WHERE id = ?', [fusionId]);
        if (fusion) {
            headFusions.push({
                id: fusion.id,
                name: fusion.name,
                primary_type: fusion.primary_type,
                secondary_type: fusion.secondary_type,
                total_variants: fusion.total_variants,
                primary_image: fusion.primary_image
            });

            // Count only custom variants
            const primaryImage = fusion.primary_image ? JSON.parse(fusion.primary_image) : {};
            if (primaryImage.artist && primaryImage.artist[0] !== 'Jeapal Fusion Calculator') {
                totalHeadFusions++;
            }
        }
    }

    // Search for body fusions
    for (let i = 1; i <= 470; i++) {
        const fusionId = `${i}.${baseId}`;
        const fusion = await db.get('SELECT * FROM sprites WHERE id = ?', [fusionId]);
        if (fusion) {
            bodyFusions.push({
                id: fusion.id,
                name: fusion.name,
                primary_type: fusion.primary_type,
                secondary_type: fusion.secondary_type,
                total_variants: fusion.total_variants,
                primary_image: fusion.primary_image
            });

            // Count only custom variants
            const primaryImage = fusion.primary_image ? JSON.parse(fusion.primary_image) : {};
            if (primaryImage.artist && primaryImage.artist[0] !== 'Jeapal Fusion Calculator') {
                totalBodyFusions++;
            }
        }
    }

    // Store the processed base Pokémon with its fusions in the database
    await insertBaseSpriteData(db, {
        ...baseSprite,
        fusion_as_head: headFusions,
        fusion_as_body: bodyFusions,
        total_head_fusions: totalHeadFusions,
        total_body_fusions: totalBodyFusions
    });

    console.log(`Processed Base Sprite ID: ${baseId}`);
}


// Function to insert base sprite data into the database
async function insertBaseSpriteData(db, pokemon) {
    const stmt = await db.prepare(`
        INSERT OR REPLACE INTO base_sprites (
            id, name, category, pokedex_entry, primary_type, secondary_type,
            base_hp, base_atk, base_def, base_sp_atk, base_sp_def, base_spd,
            ev_hp, ev_atk, ev_def, ev_sp_atk, ev_sp_def, ev_spd,
            base_exp, growth_rate, gender_ratio, catch_rate, happiness,
            egg_groups, hatch_steps, height, weight, color, shape, habitat,
            back_sprite_x, back_sprite_y, front_sprite_x, front_sprite_y,
            front_sprite_a, shadow_x, shadow_size, moves, tutor_moves,
            egg_moves, abilities, hidden_abilities, primary_image,
            alternative_sprites, total_variants, evolves_from, evolves_to,
            evolution_chain, fusion_as_head, fusion_as_body, total_head_fusions, total_body_fusions
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        pokemon.total_variants,
        JSON.stringify(pokemon.evolves_from),
        JSON.stringify(pokemon.evolves_to),
        JSON.stringify(pokemon.evolution_chain),
        JSON.stringify(pokemon.fusion_as_head),
        JSON.stringify(pokemon.fusion_as_body),
        pokemon.total_head_fusions,
        pokemon.total_body_fusions
    );

    await stmt.finalize();
}

// Main function to process the data
async function main() {
    try {
        console.log("Connecting to database...");
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        console.log("Initializing base_sprites table...");
        await initializeBaseSpritesTable(db);

        console.log("Fetching base Pokémon data...");
        const baseSprites = await fetchBaseSprites(db);

        console.log("Processing base Pokémon data...");
        for (let i = 0; i < baseSprites.length; i++) {
            const baseSprite = baseSprites[i];
            console.log(baseSprite);
            await processBaseSprite(db, baseSprite);
        }

        await db.close();
        console.log('Base sprites data processed and saved to SQLite database');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();

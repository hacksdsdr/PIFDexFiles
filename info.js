import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';
import { fusions } from './lib/loadPokemon.js';

async function getPokemonStats() {
    const db = await open({
        filename: 'data.sqlite',
        driver: sqlite3.Database
    });

    try {
        // 1. Total sprites
        const totalSprites = await db.get('SELECT COUNT(*) as count FROM sprites');

        // 2. Total custom sprites
        const totalCustomSprites = await db.all(`
          SELECT COUNT(DISTINCT base_id) as totalCustomSprites
          FROM artists
          WHERE base_id LIKE '%[0-9]%'
          AND base_id NOT LIKE '%[^0-9.]%'
          AND base_id LIKE '%_.%' OR base_id LIKE '%';
      `);

        // 3. Custom sprites as head and body
        const basePokemons = await db.all(`
            SELECT id FROM sprites WHERE id NOT LIKE '%.%'
        `);

        const customSpritesJson = {};
        for (const { id } of basePokemons) {
            const headCount = await db.get(`
                SELECT COUNT(*) as count
                FROM artists
                WHERE sprite_id GLOB '${id}.[0-9]*' AND (sprite_type = 'main')
            `);
            
            const bodyCount = await db.get(`
                SELECT COUNT(*) as count
                FROM artists
                WHERE sprite_id GLOB '[0-9]*.${id}' AND (sprite_type = 'main')
            `);
            
            customSpritesJson[id] = { 
                head: headCount.count, 
                body: bodyCount.count 
            };
        }

        // 4. Base Pokemon names
        const basePokemonNames = await db.all(`
            SELECT id, name
            FROM sprites
            WHERE id NOT LIKE '%.%'
        `);

        const basePokemonNamesJson = {};
        basePokemonNames.forEach(row => {
            basePokemonNamesJson[row.id] = row.name;
        });

        // 5. Sprite type counts (fixing the alias issue)
        const spriteTypeCounts = await db.get(`
            SELECT 
                SUM(CASE WHEN id NOT LIKE '%.%' THEN 1 ELSE 0 END) as base_count,
                SUM(CASE WHEN id LIKE '%.%' AND id NOT LIKE '%.%.%' THEN 1 ELSE 0 END) as fusion_count,
                SUM(CASE WHEN id LIKE '%.%.%' THEN 1 ELSE 0 END) as triple_count
            FROM sprites
        `);

        // Processing fusions data
        const typesSet = new Set();
        const abilitiesSet = new Set();
        const hiddenAbilitiesSet = new Set();
        const growthRateSet = new Set();
        const colorSet = new Set();
        const shapeSet = new Set();
        const movesSet = new Set();
        const tutorMovesSet = new Set();
        const eggMovesSet = new Set();

        for (const basePokemon of fusions) {
            typesSet.add(basePokemon.primary_type);
            if (basePokemon.secondary_type) {
                typesSet.add(basePokemon.secondary_type);
            }

            if (basePokemon.abilities) {
                basePokemon.abilities.forEach(ability => abilitiesSet.add(ability));
            }
            if (basePokemon.hidden_abilities) {
                basePokemon.hidden_abilities.forEach(hiddenAbility => hiddenAbilitiesSet.add(hiddenAbility));
            }

            growthRateSet.add(basePokemon.growth_rate);
            colorSet.add(basePokemon.color);
            shapeSet.add(basePokemon.shape);

            if (basePokemon.moves) {
                basePokemon.moves.forEach(move => movesSet.add(move.move));
            }
            if (basePokemon.tutor_moves) {
                basePokemon.tutor_moves.forEach(move => tutorMovesSet.add(move));
            }
            if (basePokemon.egg_moves) {
                basePokemon.egg_moves.forEach(move => eggMovesSet.add(move));
            }
        }

        // Convert sets to arrays
        const types = Array.from(typesSet).sort();
        const abilities = Array.from(abilitiesSet).sort();
        const hiddenAbilities = Array.from(hiddenAbilitiesSet).sort();
        const growthRate = Array.from(growthRateSet).sort();
        const color = Array.from(colorSet).sort();
        const shape = Array.from(shapeSet).sort();
        const moves = Array.from(movesSet).sort();
        const tutorMoves = Array.from(tutorMovesSet).sort();
        const eggMoves = Array.from(eggMovesSet).sort();

        // Combine all results
        const result = {
            total_sprites: totalSprites.count,
            custom_sprites_head_body: customSpritesJson,
            base_pokemon_names: basePokemonNamesJson,
            sprite_type_counts: {
                base: spriteTypeCounts.base_count,
                fusion: spriteTypeCounts.fusion_count,
                triple: spriteTypeCounts.triple_count,
                totalCustomSprites: totalCustomSprites[0].totalCustomSprites
            },
            types: types,
            abilities: abilities,
            hiddenAbilities: hiddenAbilities,
            growthRate: growthRate,
            color: color,
            shape: shape,
            moves: moves,
            tutorMoves: tutorMoves,
            eggMoves: eggMoves
        };

        await fs.writeFile('./lib/data/info.json', JSON.stringify(result, null, 2));

        // Create or replace the 'game_info' table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS game_info (
                id INTEGER PRIMARY KEY,
                total_sprites INTEGER,
                custom_sprites_head_body JSON,
                base_pokemon_names JSON,
                sprite_type_counts JSON,
                types JSON,
                abilities JSON,
                hiddenAbilities JSON,
                growth_rate JSON,
                color JSON,
                shape JSON,
                moves JSON,
                tutor_moves JSON,
                egg_moves JSON
            )
        `);

        // Delete any existing rows in game_info table to avoid duplicates
        await db.exec('DELETE FROM game_info');

        // Insert the result into the 'game_info' table
        const stmt = await db.prepare(`
            INSERT INTO game_info (
                total_sprites, custom_sprites_head_body, base_pokemon_names, 
                sprite_type_counts, types, abilities, hiddenAbilities, growth_rate, 
                color, shape, moves, tutor_moves, egg_moves
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        await stmt.run(
            result.total_sprites,
            JSON.stringify(result.custom_sprites_head_body),
            JSON.stringify(result.base_pokemon_names),
            JSON.stringify(result.sprite_type_counts),
            JSON.stringify(result.types),
            JSON.stringify(result.abilities),
            JSON.stringify(result.hiddenAbilities),
            JSON.stringify(result.growthRate),
            JSON.stringify(result.color),
            JSON.stringify(result.shape),
            JSON.stringify(result.moves),
            JSON.stringify(result.tutorMoves),
            JSON.stringify(result.eggMoves)
        );

        await stmt.finalize();

        console.log('Game data saved to game_info table in SQLite database.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.close();
    }
}

getPokemonStats();

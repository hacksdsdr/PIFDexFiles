import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';

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
            SELECT COUNT(DISTINCT base_id) AS unique_pokemon_count
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
                WHERE sprite_id LIKE '${id}.%' AND sprite_type = 'main'
            `);

            const bodyCount = await db.get(`
                SELECT COUNT(*) as count
                FROM artists
                WHERE sprite_id LIKE '%.${id}' AND sprite_type = 'main'
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

        // 5. Sprite type counts
        const spriteTypeCounts = await db.all(`
            SELECT 
                SUM(CASE WHEN id NOT LIKE '%.%' THEN 1 ELSE 0 END) as base_count,
                SUM(CASE WHEN id LIKE '%.%' AND id NOT LIKE '%.%.%' THEN 1 ELSE 0 END) as fusion_count,
                SUM(CASE WHEN id LIKE '%.%.%' THEN 1 ELSE 0 END) as triple_count
            FROM sprites
        `);

        // Combine all results
        const result = {
            total_sprites: totalSprites.count,
            custom_sprites_head_body: customSpritesJson.unique_pokemon_count,
            base_pokemon_names: basePokemonNamesJson,
            sprite_type_counts: {
                base: spriteTypeCounts[0].base_count,
                fusion: spriteTypeCounts[0].fusion_count,
                triple: spriteTypeCounts[0].triple_count,
                custom: totalCustomSprites.unique_pokemon_count
            }
        };

        // Save the result to a JSON file
        const filePath = path.join(process.cwd(), 'lib', 'data', 'info.json');
        await fs.writeFile(filePath, JSON.stringify(result, null, 2));
        console.log(`Data saved to ${filePath}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await db.close();
    }
}

getPokemonStats();
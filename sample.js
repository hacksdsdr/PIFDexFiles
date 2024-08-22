import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const SPRITE_CREDITS_PATH = './lib/data/Sprite Credits.csv';
const DB_PATH = './pokemon_data.db';
const CHUNK_SIZE = 1000;

async function initializeDatabase(db) {
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
            fusion_from_head JSON,
            fusion_from_body JSON,
            triple_fusion JSON
        );

        CREATE TABLE IF NOT EXISTS artists (
            artist_name TEXT PRIMARY KEY,
            total_sprites INTEGER,
            sprites_data JSON
        );
    `);
}

async function readCSV(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent.split('\n').map(line => {
        const [id, artist, type, notes] = line.split(',');
        return { id, artist, type, notes };
    });
}

async function processBaseSprites(db) {
    const baseSprites = await db.all('SELECT * FROM sprites WHERE id NOT LIKE "%.%" AND id NOT LIKE "%-%"');

    for (const baseSprite of baseSprites) {
        const fusionsAsHead = await db.all('SELECT id, name, primary_image, alternative_sprites FROM sprites WHERE id LIKE ?', `${baseSprite.id}.%`);
        const fusionsAsBody = await db.all('SELECT id, name, primary_image, alternative_sprites FROM sprites WHERE id LIKE ?', `%.${baseSprite.id}`);
        const tripleFusions = await db.all('SELECT id, name, primary_image, alternative_sprites FROM sprites WHERE id LIKE ?', `%-${baseSprite.id}-%`);
 
        const baseSpriteData = {
            ...baseSprite,
            fusion_from_head: fusionsAsHead.map(f => ({
                name: f.name,
                id: f.id,
                image: JSON.parse(f.primary_image).url,
                total_variants: JSON.parse(f.alternative_sprites).length + 1
            })),
            fusion_from_body: fusionsAsBody.map(f => ({
                name: f.name,
                id: f.id,
                image: JSON.parse(f.primary_image).url,
                total_variants: JSON.parse(f.alternative_sprites).length + 1
            })),
            triple_fusion: tripleFusions.map(f => ({
                name: f.name,
                id: f.id,
                image: JSON.parse(f.primary_image).url,
                total_variants: JSON.parse(f.alternative_sprites).length + 1
            }))
        };
        console.log(baseSpriteData)
        const columns = Object.keys(baseSpriteData).join(', ');
        const placeholders = Object.keys(baseSpriteData).map(() => '?').join(', ');

        const stmt = await db.prepare(`
            INSERT OR REPLACE INTO base_sprites (${columns})
            VALUES (${placeholders})
        `);

        await stmt.run(...Object.values(baseSpriteData).map(value => 
            typeof value === 'object' ? JSON.stringify(value) : value
        ));

        await stmt.finalize();
    }
}

async function processArtists(db, spriteCredits) {
    const artistData = {};

    const allSprites = await db.all('SELECT id, name, primary_type, secondary_type, primary_image, alternative_sprites FROM sprites');

    for (const sprite of allSprites) {
        const primaryImage = JSON.parse(sprite.primary_image);
        const alternativeSprites = JSON.parse(sprite.alternative_sprites);
        const allImages = [primaryImage, ...alternativeSprites];
        
        for (const image of allImages) {
            let artists = image.artist;
            if (!artists || artists.length === 0) {
                const credit = spriteCredits.find(c => c.id === sprite.id) || 
                               spriteCredits.find(c => c.id === sprite.id.split('.').pop());
                artists = credit ? credit.artist.split(' & ') : ['Unknown'];
            }

            for (const artist of artists) {
                if (!artistData[artist]) {
                    artistData[artist] = {
                        artist_name: artist,
                        total_sprites: 0,
                        sprites_data: []
                    };
                }

                artistData[artist].total_sprites++;
                artistData[artist].sprites_data.push({
                    pokemon_name: sprite.name,
                    id: sprite.id,
                    image: image.url,
                    types: [sprite.primary_type, sprite.secondary_type].filter(Boolean)
                });
            }
        }
    }

    for (const [artist, data] of Object.entries(artistData)) {
        const stmt = await db.prepare(`
            INSERT OR REPLACE INTO artists (artist_name, total_sprites, sprites_data)
            VALUES (?, ?, ?)
        `);

        await stmt.run(
            artist,
            data.total_sprites,
            JSON.stringify(data.sprites_data)
        );

        await stmt.finalize();
    }
}

async function main() {
    try {
        console.log("Initializing...");
        const spriteCredits = await readCSV(SPRITE_CREDITS_PATH);
        console.log(`Read ${spriteCredits.length} sprite credit entries.`);

        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        await initializeDatabase(db);

        console.log("Processing base sprites...");
        await processBaseSprites(db);

        console.log("Processing artists...");
        await processArtists(db, spriteCredits);

        await db.close();

        console.log('Base sprites and artists data saved to SQLite database');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();
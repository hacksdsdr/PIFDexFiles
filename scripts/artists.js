import fs from 'fs/promises';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Paths and settings
const SPRITE_CREDITS_PATH = '/workspaces/PIFDexFiles/graphics/Sprite Credits.csv';
const SPRITE_FOLDERS = {
    base: '/workspaces/PIFDexFiles/graphics/base',
    fusion: '/workspaces/PIFDexFiles/graphics/fusions',
    triple: '/workspaces/PIFDexFiles/graphics/triples'
};

const DB_PATH = '/workspaces/PIFDexFiles/data.sqlite';
const BATCH_SIZE = 5000; 

// Function to read CSV
async function readCSV(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent.trim().split('\n').map(line => {
        const [id, artist, type, notes] = line.split(',');
        return { id, artist, type, notes };
    });
}

// Function to process files in sprite folders
async function getSpriteFiles() {
    let allSprites = [];
    for (const folder of Object.values(SPRITE_FOLDERS)) {
        const files = await fs.readdir(folder);
        files.forEach(file => {
            if (file.endsWith('.png')) {
                const sprite_id = file.replace('.png', '');
                allSprites.push({ sprite_id });
            }
        });
    }
    return allSprites;
}

// Determine base ID by removing any trailing letter or artist credits
function getBaseId(sprite_id) {
    const baseIdMatch = sprite_id.match(/^\d+(\.\d+)*[a-zA-Z]?/);
    return baseIdMatch ? baseIdMatch[0].replace(/[a-zA-Z]$/, '') : sprite_id.split(' by ')[0];
}

// Process sprite data and group by artists
function processSprites(csvData, spriteFiles) {
    const artistMap = new Map();

    // Map CSV data for quick lookup
    const csvMap = new Map(csvData.map(item => [item.id, item]));

    // Process each sprite file
    spriteFiles.forEach(({ sprite_id }) => {
        const spriteData = csvMap.get(sprite_id);

        if (!spriteData) {
            return;  // Skip if no sprite data
        }

        // Get base ID
        const base_id = getBaseId(sprite_id);
        const artists = spriteData.artist ? spriteData.artist.split(' & ') : [];

        // Add sprite to each artist's entry
        artists.forEach(artist => {
            if (!artistMap.has(artist)) {
                artistMap.set(artist, {
                    total_sprites: 0,
                    sprites: []
                });
            }

            const artistEntry = artistMap.get(artist);
            artistEntry.total_sprites += 1;
            // Add sprite_id and base_id as an object
            artistEntry.sprites.push({ sprite_id, base_id });
        });
    });

    // Convert artistMap to an array of objects
    return Array.from(artistMap.entries()).map(([artist, data]) => ({
        artist_name: artist,
        total_sprites: data.total_sprites,
        sprites: JSON.stringify(data.sprites)  // Store as JSON array of objects
    }));
}

// Create SQLite artists table
async function createArtistsTable(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS artists (
            artist_name TEXT PRIMARY KEY,
            total_sprites INTEGER,
            sprites JSON
        )
    `);
}

// Insert data into SQLite artists table
async function insertArtistsData(db, data) {
    const totalEntries = data.length;
    const stmt = await db.prepare(`
        INSERT OR REPLACE INTO artists (artist_name, total_sprites, sprites)
        VALUES (?, ?, ?)
    `);

    for (let i = 0; i < totalEntries; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        await db.run("BEGIN TRANSACTION");
        for (const entry of batch) {
            await stmt.run(
                entry.artist_name,
                entry.total_sprites,
                entry.sprites
            );
        }
        await db.run("COMMIT");

        // Log progress after each batch
        const percentage = ((i + batch.length) / totalEntries * 100).toFixed(2);
        console.log(`Inserted ${i + batch.length}/${totalEntries} rows (${percentage}%)`);
    }

    await stmt.finalize();
}

// Main function to run all steps
async function main() {
    try {
        // Read CSV data
        const csvData = await readCSV(SPRITE_CREDITS_PATH);
        console.log(`Read ${csvData.length} entries from CSV.`);

        // Get sprite files
        const spriteFiles = await getSpriteFiles();
        console.log(`Found ${spriteFiles.length} sprite files.`);

        // Process sprites grouped by artists
        const processedData = processSprites(csvData, spriteFiles);
        console.log(`Processed ${processedData.length} artist entries.`);

        // Open SQLite database
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        // Create artists table
        await createArtistsTable(db);

        // Insert data into SQLite with batch processing
        await insertArtistsData(db, processedData);

        // Close the database
        await db.close();
        console.log('Artists data saved to SQLite database.');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();

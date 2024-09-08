import fs from 'fs/promises';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// Paths and settings
const SPRITE_CREDITS_PATH = './graphics/Sprite Credits.csv';
const SPRITE_FOLDERS = {
    base: './graphics/base',          // Path to base sprites
    fusion: './graphics/fusions',     // Path to fusion sprites
    triple: './graphics/triples'      // Path to triple sprites
};

const DB_PATH = './data.sqlite';
const BATCH_SIZE = 5000; // Adjust this based on your system's memory capacity

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
    for (const [type, folder] of Object.entries(SPRITE_FOLDERS)) {
        const files = await fs.readdir(folder);
        files.forEach(file => {
            if (file.endsWith('.png')) {
                const sprite_id = file.replace('.png', '');
                allSprites.push({ sprite_id, type });
            }
        });
    }
    return allSprites;
}

// Determine if sprite is main or alt based on ID
function determineSpriteType(sprite_id) {
    const lastChar = sprite_id[sprite_id.length - 1];
    return /[a-zA-Z]/.test(lastChar) || sprite_id.includes(' by ') ? 'alt' : 'main';
}

// Determine base ID by removing any trailing letter or artist credits
function getBaseId(sprite_id) {
    // Match base ID formats like "1", "1.1", or "1.1.1", and ignore trailing letters or 'by' parts
    const baseIdMatch = sprite_id.match(/^\d+(\.\d+)*[a-zA-Z]?/);
    
    // If there's a match, return the matched part (base ID), otherwise return the full sprite_id
    return baseIdMatch ? baseIdMatch[0].replace(/[a-zA-Z]$/, '') : sprite_id.split(' by ')[0];
}

// Process sprite data with sorting logic
function processSprites(csvData, spriteFiles) {
    const processedData = [];

    // Map CSV data for quick lookup
    const csvMap = new Map(csvData.map(item => [item.id, item]));

    // Process each sprite file
    spriteFiles.forEach(({ sprite_id, type }) => {
        let spriteData = csvMap.get(sprite_id);

        if (!spriteData) {
            // Create new entry if not in CSV
            spriteData = {
                id: sprite_id,
                artist: null,
                type: determineSpriteType(sprite_id),
                notes: null
            };
        } else {
            // Update type based on actual sprite file
            spriteData.type = determineSpriteType(sprite_id);
        }

        // Get base ID for foreign key reference
        const base_id = getBaseId(sprite_id);

        // Preserve notes as they are, or use null if empty
        const notes = spriteData.notes || null;

        // Handle artist splitting by ' & ', or use null if no artists
        const artists = spriteData.artist ? spriteData.artist.split(' & ') : null;

        processedData.push({
            sprite_id: spriteData.id,
            sprite_type: spriteData.type,
            base_id: spriteData.type === 'alt' ? base_id : spriteData.id,  // Set base_id for alt and main types
            artists: artists,
            notes: notes
        });
    });

    // Sort logic:
    processedData.sort((a, b) => {
        const baseIdA = getBaseId(a.sprite_id);
        const baseIdB = getBaseId(b.sprite_id);

        // First compare base IDs
        if (baseIdA !== baseIdB) {
            return baseIdA.localeCompare(baseIdB);
        }

        // Next, handle specific sprite ordering
        const isMainA = !/[a-zA-Z]/.test(a.sprite_id) && !a.sprite_id.includes(' by ');
        const isMainB = !/[a-zA-Z]/.test(b.sprite_id) && !b.sprite_id.includes(' by ');

        const isAltA = /[a-zA-Z]$/.test(a.sprite_id) && !a.sprite_id.includes(' by ');
        const isAltB = /[a-zA-Z]$/.test(b.sprite_id) && !b.sprite_id.includes(' by ');

        const hasArtistA = a.sprite_id.includes(' by ');
        const hasArtistB = b.sprite_id.includes(' by ');

        // Main comes first
        if (isMainA && !isMainB) return -1;
        if (!isMainA && isMainB) return 1;

        // Alt comes second
        if (isAltA && !isAltB) return -1;
        if (!isAltA && isAltB) return 1;

        // Artists come last
        if (hasArtistA && !hasArtistB) return 1;
        if (!hasArtistA && hasArtistB) return -1;

        return 0;
    });

    return processedData;
}

// Create SQLite artists table with foreign key to sprites table
async function createArtistsTable(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS artists (
            sprite_id TEXT PRIMARY KEY,
            sprite_type TEXT,
            base_id TEXT,
            artists JSON,
            notes TEXT
        )
    `);
}

// Insert data into SQLite artists table
async function insertArtistsData(db, data) {
    const totalEntries = data.length;
    const stmt = await db.prepare(`
        INSERT OR REPLACE INTO artists (sprite_id, sprite_type, base_id, artists, notes)
        VALUES (?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < totalEntries; i += BATCH_SIZE) {
        const batch = data.slice(i, i + BATCH_SIZE);
        await db.run("BEGIN TRANSACTION");
        for (const entry of batch) {
            await stmt.run(
                entry.sprite_id,
                entry.sprite_type,
                entry.base_id,
                entry.artists ? JSON.stringify(entry.artists) : null,  // Store artists as JSON array, or null if no artists
                entry.notes ? entry.notes : null  // Store notes as is, or null if empty
            );
        }
        await db.run("COMMIT");

        // Log progress after each batch
        const percentage = ((i + batch.length) / totalEntries * 100).toFixed(2);
        console.log(`Inserted ${i + batch.length}/${totalEntries} rows (${percentage}%)`);
    }

    await stmt.finalize();
}

// Save JSON file with artists data
async function saveArtistsToJSON(data) {
    try {
        await fs.writeFile('./lib/data/artists.json', JSON.stringify(data, null, 2), 'utf-8');
        console.log(`Artists data saved to './lib/data/artists.json'`);
    } catch (error) {
        console.error('Error saving artists data to JSON file:', error);
    }
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

        // Process sprites
        const processedData = processSprites(csvData, spriteFiles);
        console.log(`Processed ${processedData.length} sprite entries.`);

        // Open SQLite database
        const db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        // Create artists table with foreign key reference
        await createArtistsTable(db);

        // Insert data into SQLite with batch processing
        await insertArtistsData(db, processedData);

        // Save JSON file of this data
        const artistsArr = processedData.map(artist => ({
            sprite_id: artist.sprite_id,
            base_id: artist.base_id,
            // type: artist.sprite_type,
        }));
        
        await saveArtistsToJSON(artistsArr)

        // Close the database
        await db.close();
        console.log('Artists data saved to SQLite database.');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();

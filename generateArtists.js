import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import fs from 'fs/promises';

// Define paths and constants
const DB_PATH = './pokemon_data.sqlite';
const CSV_PATH = './lib/data/Sprite Credits.csv';

// Function to initialize the artists table
async function initializeArtistsTable(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS artists (
            name TEXT PRIMARY KEY,
            total_sprites INTEGER,
            sprite_ids JSON
        )
    `);
}

// Function to read CSV file and parse it into JSON
async function readCSV(filePath) {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return fileContent.split('\n').map(line => {
        const [id, artist] = line.split(','); // Only use the first and second columns
        return { id, artist };
    });
}

// Function to process artist data from the parsed CSV
async function processArtistsData(db, parsedCSV) {
    const artistsMap = new Map();

    for (const { id, artist } of parsedCSV) {
        if (!artist) continue; // Skip lines without artist data

        const artistNames = artist.split(' & ').map(name => name.trim());

        for (const artistName of artistNames) {
            if (!artistsMap.has(artistName)) {
                artistsMap.set(artistName, {
                    total_sprites: 0,
                    sprite_ids: []
                });
            }

            const artistData = artistsMap.get(artistName);
            artistData.total_sprites += 1;
            artistData.sprite_ids.push(id);
            console.log(artistName)
        }
    }

    for (const [name, { total_sprites, sprite_ids }] of artistsMap) {
        await insertArtistData(db, name, total_sprites, sprite_ids);
    }
}

// Function to insert artist data into the artists table
async function insertArtistData(db, name, total_sprites, sprite_ids) {
    const stmt = await db.prepare(`
        INSERT OR REPLACE INTO artists (name, total_sprites, sprite_ids)
        VALUES (?, ?, ?)
    `);

    await stmt.run(name, total_sprites, JSON.stringify(sprite_ids));
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

        console.log("Initializing artists table...");
        await initializeArtistsTable(db);

        console.log("Reading and parsing CSV file...");
        const parsedCSV = await readCSV(CSV_PATH);

        console.log("Processing and inserting artists data...");
        await processArtistsData(db, parsedCSV);

        await db.close();
        console.log('Artists data processed and saved to SQLite database');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

main();

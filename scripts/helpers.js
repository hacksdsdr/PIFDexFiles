import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs'

const jsonFiles = [
    "abilities.json",
    "items.json",
    "moves.json",
    "types.json"
];

const jsonDir = '/workspaces/PIFDexFiles/lib/data/json';

// Function to load JSON data from a file
async function loadJSON(fileName) {
    const response = JSON.parse(fs.readFileSync(`${jsonDir}/${fileName}`));
    return response;
}

// Main function to save all the data to the database
async function saveDataToDatabase() {
    // Open SQLite database
    const db = await open({
        filename: '/workspaces/PIFDexFiles/data.sqlite',
        driver: sqlite3.Database
    });

    // Create tables
    await createTables(db);

    // Fetch all JSON data
    const abilities = await loadJSON(jsonFiles[0]);
    const items = await loadJSON(jsonFiles[1]);
    const moves = await loadJSON(jsonFiles[2]);
    const types = await loadJSON(jsonFiles[3]);

    // Save data to respective tables
    await saveAbilities(db, abilities);
    await saveItems(db, items);
    await saveMoves(db, moves);
    await saveTypes(db, types);

    console.log("Data saved successfully!");

    // Close the database
    await db.close();
}

// Create the required tables in the database
async function createTables(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS abilities (
            id TEXT PRIMARY KEY,
            real_name TEXT,
            real_description TEXT
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS items (
            id TEXT PRIMARY KEY,
            real_name TEXT,
            real_name_plural TEXT,
            pocket INTEGER,
            price INTEGER,
            real_description TEXT,
            field_use INTEGER,
            battle_use INTEGER,
            type INTEGER,
            move TEXT
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS moves (
            id TEXT PRIMARY KEY,
            real_name TEXT,
            function_code TEXT,
            base_damage INTEGER,
            type TEXT,
            category INTEGER,
            accuracy INTEGER,
            total_pp INTEGER,
            effect_chance INTEGER,
            target TEXT,
            priority INTEGER,
            flags TEXT,
            real_description TEXT
        )
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS types (
            id TEXT PRIMARY KEY,
            real_name TEXT,
            pseudo_type BOOLEAN,
            special_type BOOLEAN,
            weaknesses JSON,
            resistances JSON,
            immunities JSON
        )
    `);
}

// Save abilities data to the abilities table
async function saveAbilities(db, abilities) {
    for (const ability of abilities) {
        await db.run(`
            INSERT OR REPLACE INTO abilities (id, real_name, real_description) 
            VALUES (?, ?, ?)
        `, [ability.id, ability.real_name, ability.real_description]);
    }
}

// Save items data to the items table
async function saveItems(db, items) {
    for (const item of items) {
        await db.run(`
            INSERT OR REPLACE INTO items (id, real_name, real_name_plural, pocket, price, real_description, field_use, battle_use, type, move) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            item.id, item.real_name, item.real_name_plural, item.pocket, 
            item.price, item.real_description, item.field_use, item.battle_use, 
            item.type, item.move
        ]);
    }
}

// Save moves data to the moves table
async function saveMoves(db, moves) {
    for (const move of moves) {
        await db.run(`
            INSERT OR REPLACE INTO moves (id, real_name, function_code, base_damage, type, category, accuracy, total_pp, effect_chance, target, priority, flags, real_description) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            move.id, move.real_name, move.function_code, move.base_damage, 
            move.type, move.category, move.accuracy, move.total_pp, 
            move.effect_chance, move.target, move.priority, move.flags, 
            move.real_description
        ]);
    }
}

// Save types data to the types table
async function saveTypes(db, types) {
    for (const type of types) {
        await db.run(`
            INSERT OR REPLACE INTO types (id, real_name, pseudo_type, special_type, weaknesses, resistances, immunities) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            type.id, type.real_name, type.pseudo_type, type.special_type,
            JSON.stringify(type.weaknesses), JSON.stringify(type.resistances), 
            JSON.stringify(type.immunities)
        ]);
    }
}

// Run the data-saving logic
saveDataToDatabase().catch(err => console.error(err));

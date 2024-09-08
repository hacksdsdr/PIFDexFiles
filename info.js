import { fusions } from "./lib/loadPokemon.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs/promises";
import path from "path";

async function getPokemonStats() {
  const db = await open({
    filename: "data.sqlite",
    driver: sqlite3.Database
  });

  try {
    // 1. Total sprites
    const totalSprites = await db.get("SELECT COUNT(*) as count FROM sprites");

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


   
    const typesSet = new Set();
    const abilitiesSet = new Set();
    const hiddenAbilitiesSet = new Set();
    const growthRateSet = new Set();
    const genderRatioSet = new Set();
    const eggGroupsSet = new Set();
    const habitatSet = new Set();
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

      // Safely handle abilities and hidden abilities
      if (basePokemon.abilities) {
        basePokemon.abilities.forEach(ability => abilitiesSet.add(ability));
      }
      if (basePokemon.hidden_abilities) {
        basePokemon.hidden_abilities.forEach(hiddenAbility =>
          hiddenAbilitiesSet.add(hiddenAbility)
        );
      }

      growthRateSet.add(basePokemon.growth_rate);
      genderRatioSet.add(basePokemon.gender_ratio);
      if (basePokemon.egg_groups) {
        basePokemon.egg_groups.forEach(group => eggGroupsSet.add(group));
      }
      habitatSet.add(basePokemon.habitat);
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



    const types = Array.from(typesSet).sort();
    const abilities = Array.from(abilitiesSet).sort();
    const hiddenAbilities = Array.from(hiddenAbilitiesSet).sort();
    const growthRate = Array.from(growthRateSet).sort();
    const genderRatio = Array.from(genderRatioSet).sort();
    const eggGroups = Array.from(eggGroupsSet).sort();
    const habitat = Array.from(habitatSet).sort();
    const color = Array.from(colorSet).sort();
    const shape = Array.from(shapeSet).sort();
    const moves = Array.from(movesSet).sort();
    const tutorMoves = Array.from(tutorMovesSet).sort();
    const eggMoves = Array.from(eggMovesSet).sort();

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
      },
      types: types,
      abilities: abilities,
      hiddenAbilities: hiddenAbilities,
      growthRate: growthRate,
      genderRatio: genderRatio,
      eggGroups: eggGroups,
      habitat: habitat,
      color: color,
      shape: shape,
      moves: moves,
      tutorMoves: tutorMoves,
      eggMoves: eggMoves
    };

    // Save the result to a JSON file
    const filePath = path.join(process.cwd(), "lib", "data", "info.json");
    await fs.writeFile(filePath, JSON.stringify(result, null, 2));
    console.log(`Data saved to ${filePath}`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await db.close();
  }
}

getPokemonStats();

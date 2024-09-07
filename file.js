import { fusions } from './lib/loadPokemon.js';

const pokemons = {};  // Object to store pokemon id as key and name as value
// const categoriesSet = new Set();
const typesSet = new Set();
const abilitiesSet = new Set();
const hiddenAbilitiesSet = new Set();
const growthRateSet = new Set();
// const genderRatioSet = new Set();
// const eggGroupsSet = new Set();
// const habitatSet = new Set();
const colorSet = new Set();
const shapeSet = new Set();
const movesSet = new Set();
const tutorMovesSet = new Set();
const eggMovesSet = new Set();

for (const basePokemon of fusions) {
  // Adding Pokémon id as key and name as value in the object
  pokemons[basePokemon.id] = basePokemon.name;

  // Populate sets with unique values
  typesSet.add(basePokemon.primary_type);
  if (basePokemon.secondary_type) {
    typesSet.add(basePokemon.secondary_type);
  }
  basePokemon.abilities.forEach(ability => abilitiesSet.add(ability));
  basePokemon.hidden_abilities.forEach(hiddenAbility => hiddenAbilitiesSet.add(hiddenAbility));
  growthRateSet.add(basePokemon.growth_rate);
  // genderRatioSet.add(basePokemon.gender_ratio);
  // basePokemon.egg_groups.forEach(group => eggGroupsSet.add(group));
  // habitatSet.add(basePokemon.habitat);
  colorSet.add(basePokemon.color);
  shapeSet.add(basePokemon.shape);
  basePokemon.moves.forEach(move => movesSet.add(move.move));
  basePokemon.tutor_moves.forEach(move => tutorMovesSet.add(move));
  basePokemon.egg_moves.forEach(move => eggMovesSet.add(move));
}

// Convert sets to arrays
// const categories = Array.from(categoriesSet).sort();
const types = Array.from(typesSet).sort();
const abilities = Array.from(abilitiesSet).sort();
const hiddenAbilities = Array.from(hiddenAbilitiesSet).sort();
const growthRate = Array.from(growthRateSet).sort();
// const genderRatio = Array.from(genderRatioSet).sort();
// const eggGroups = Array.from(eggGroupsSet).sort();
// const habitat = Array.from(habitatSet).sort();
const color = Array.from(colorSet).sort();
const shape = Array.from(shapeSet).sort();
const moves = Array.from(movesSet).sort();
const tutorMoves = Array.from(tutorMovesSet).sort();
const eggMoves = Array.from(eggMovesSet).sort();

const data = {
  pokemons: pokemons,
  // // categories: categories,
  types: types,
  abilities: abilities,
  hiddenAbilities: hiddenAbilities,
  growthRate: growthRate,
  // genderRatio: genderRatio,
  // eggGroups: eggGroups,
  // habitat: habitat,
  color: color,
  shape: shape,
  moves: moves,
  tutorMoves: tutorMoves,
  eggMoves: eggMoves
};


for (const value in data) {
  console.log(value + ' : ' + data[value].length)
}

export default data;

import fuseNames from "./generateFusionName.js";
import { unique } from "./util.js";

const GROWTH_RATE_PRIORITY = [
  "Slow",
  "Erratic",
  "Fluctuating",
  "Parabolic",
  "Medium",
  "Fast",
];

const TYPE_CHART = {
  NORMAL: 0, FIRE: 1, WATER: 2, ELECTRIC: 3, GRASS: 4, ICE: 5, FIGHTING: 6,
  POISON: 7, GROUND: 8, FLYING: 9, PSYCHIC: 10, BUG: 11, ROCK: 12, GHOST: 13,
  DRAGON: 14, DARK: 15, STEEL: 16, FAIRY: 17,
};

const HABITATS = [
  'Grassland', 'Mountain', 'WatersEdge', 'Forest', 'RoughTerrain',
  'Cave', 'Urban', 'Sea', 'Rare', 'None'
];

const GENDER_RATIOS = {
  AlwaysMale: { id: "AlwaysMale", name: "Always Male", female_chance: 0 },
  AlwaysFemale: { id: "AlwaysFemale", name: "Always Female", female_chance: 255 },
  Genderless: { id: "Genderless", name: "Genderless", female_chance: -1 },
  FemaleOneEighth: { id: "FemaleOneEighth", name: "Female One Eighth", female_chance: 32 },
  Female25Percent: { id: "Female25Percent", name: "Female 25 Percent", female_chance: 64 },
  Female50Percent: { id: "Female50Percent", name: "Female 50 Percent", female_chance: 128 },
  Female75Percent: { id: "Female75Percent", name: "Female 75 Percent", female_chance: 192 },
  FemaleSevenEighths: { id: "FemaleSevenEighths", name: "Female Seven Eighths", female_chance: 224 },
};

const splitAndCombineText = (start, end, separator) =>
  start.split(separator, 2)[0] + separator + end.split(separator, 2).at(-1);

const calcStat = (dominant, recessive) =>
  Math.max(1, Math.floor((dominant + dominant + recessive) / 3));

const calcEv = (a, b) => Math.max(0, Math.floor((a + b) / 2));

const avg = (a, b) => Math.floor((a + b) / 2);

const determineTypes = (head, body) => {
  let primaryType = head.primary_type;
  let secondaryType = body.primary_type;

  // Special case for Normal/Flying becoming pure Flying
  if (primaryType === "NORMAL" && head.secondary_type === "FLYING") {
    primaryType = "FLYING";
  }

  // Ensure types are unique
  if (primaryType === secondaryType) {
    secondaryType = body.secondary_type;
  }

  return { primary_type: primaryType, secondary_type: secondaryType };
};

const determineHabitat = (head, body) => {
  const headHabitat = HABITATS.includes(head.habitat) ? head.habitat : 'None';
  const bodyHabitat = HABITATS.includes(body.habitat) ? body.habitat : 'None';
  
  if (headHabitat === bodyHabitat) return headHabitat;
  if (headHabitat === 'None') return bodyHabitat;
  if (bodyHabitat === 'None') return headHabitat;
  
  // Prioritize rarer habitats
  const rareHabitats = ['Rare', 'Sea', 'Cave'];
  for (const habitat of rareHabitats) {
    if (headHabitat === habitat || bodyHabitat === habitat) return habitat;
  }
  
  // Default to head's habitat if no priority is found
  return headHabitat;
};

const determineEggGroups = (head, body) => {
  const eggGroups = unique([...head.egg_groups, ...body.egg_groups]);
  return eggGroups.length > 0 ? eggGroups : ["Undiscovered"];
};

const determineGenderRatio = (head, body) => {
  const headRatio = GENDER_RATIOS[head.gender_ratio] || GENDER_RATIOS.Female50Percent;
  const bodyRatio = GENDER_RATIOS[body.gender_ratio] || GENDER_RATIOS.Female50Percent;

  if (headRatio.id === "Genderless" || bodyRatio.id === "Genderless") {
    return GENDER_RATIOS.Genderless;
  }

  if (headRatio.id === "AlwaysMale" || bodyRatio.id === "AlwaysMale") {
    return GENDER_RATIOS.AlwaysMale;
  }

  if (headRatio.id === "AlwaysFemale" || bodyRatio.id === "AlwaysFemale") {
    return GENDER_RATIOS.AlwaysFemale;
  }

  // Average the female chances
  const avgFemaleChance = Math.floor((headRatio.female_chance + bodyRatio.female_chance) / 2);
  
  // Find the closest matching ratio
  return Object.values(GENDER_RATIOS).reduce((prev, curr) => {
    return (Math.abs(curr.female_chance - avgFemaleChance) < Math.abs(prev.female_chance - avgFemaleChance))
      ? curr
      : prev;
  });
};

export default (head, body) => {
  const id = head.id + "." + body.id;
  const name = fuseNames(head.id, body.id);

  const category = splitAndCombineText(head.category, body.category, " ");
  const pokedex_entry = splitAndCombineText(
    head.pokedex_entry.replaceAll(head.name, name),
    body.pokedex_entry.replaceAll(body.name, name),
    "."
  ) + ".";

  const { primary_type, secondary_type } = determineTypes(head, body);

  const base_stats = {
    hp: calcStat(head.base_hp, body.base_hp),
    atk: calcStat(body.base_atk, head.base_atk),
    def: calcStat(body.base_def, head.base_def),
    sp_atk: calcStat(head.base_sp_atk, body.base_sp_atk),
    sp_def: calcStat(head.base_sp_def, body.base_sp_def),
    spd: calcStat(body.base_spd, head.base_spd),
  };

  const evs = {
    hp: calcEv(head.ev_hp, body.ev_hp),
    atk: calcEv(head.ev_atk, body.ev_atk),
    def: calcEv(head.ev_def, body.ev_def),
    sp_atk: calcEv(head.ev_sp_atk, body.ev_sp_atk),
    sp_def: calcEv(head.ev_sp_def, body.ev_sp_def),
    spd: calcEv(head.ev_spd, body.ev_spd),
  };

  const base_exp = avg(head.base_exp, body.base_exp);
  const growth_rate = GROWTH_RATE_PRIORITY.find(
    (rate) => rate === head.growth_rate || rate === body.growth_rate
  ) ?? "Medium";

  const genderRatio = determineGenderRatio(head, body);
  const catch_rate = Math.min(head.catch_rate, body.catch_rate);
  const happiness = head.happiness;

  const egg_groups = determineEggGroups(head, body);
  const hatch_steps = avg(head.hatch_steps, body.hatch_steps);

  const height = avg(head.height, body.height);
  const weight = avg(head.weight, body.weight);
  const color = head.color;
  const shape = body.shape;
  const habitat = determineHabitat(head, body);

  const back_sprite_x = body.back_sprite_x;
  const back_sprite_y = body.back_sprite_y;
  const front_sprite_x = body.front_sprite_x;
  const front_sprite_y = body.front_sprite_y;
  const front_sprite_a = body.front_sprite_a;
  const shadow_x = body.shadow_x;
  const shadow_size = body.shadow_size;

  const moves = unique([...head.moves, ...body.moves]);
  const tutor_moves = unique([...head.tutor_moves, ...body.tutor_moves]);
  const egg_moves = unique([...head.egg_moves, ...body.egg_moves]);

  const abilities = unique([
    body.abilities[0],
    head.abilities[1] ?? head.abilities[0],
  ]);

  const hidden_abilities = unique([
    head.abilities[0],
    body.abilities[1] ?? body.abilities[0],
    ...body.hidden_abilities,
    ...head.hidden_abilities,
  ]);

  const evolutions = [];
  for (const evolution of head.evolutions) {
    evolutions.push({
      target: evolution.target + "." + body.id,
      method: evolution.method,
      param: evolution.param,
    });
  }

  for (const evolution of body.evolutions) {
    evolutions.push({
      target: head.id + "." + evolution.target,
      method: evolution.method,
      param: evolution.param,
    });
  }

  return {
    id,
    name,
    category,
    pokedex_entry,
    primary_type,
    secondary_type,
    base_hp: base_stats.hp,
    base_atk: base_stats.atk,
    base_def: base_stats.def,
    base_sp_atk: base_stats.sp_atk,
    base_sp_def: base_stats.sp_def,
    base_spd: base_stats.spd,
    ev_hp: evs.hp,
    ev_atk: evs.atk,
    ev_def: evs.def,
    ev_sp_atk: evs.sp_atk,
    ev_sp_def: evs.sp_def,
    ev_spd: evs.spd,
    base_exp,
    growth_rate,
    gender_ratio: genderRatio.id,
    catch_rate,
    happiness,
    egg_groups,
    hatch_steps,
    height,
    weight,
    color,
    shape,
    habitat,
    back_sprite_x,
    back_sprite_y,
    front_sprite_x,
    front_sprite_y,
    front_sprite_a,
    shadow_x,
    shadow_size,
    moves,
    tutor_moves,
    egg_moves,
    abilities,
    hidden_abilities,
    evolutions: unique(evolutions),
  };
};
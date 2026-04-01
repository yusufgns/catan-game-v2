import { createSettlement, settlementMeta } from './settlement';
import { createCity,       cityMeta       } from './city';
import { createRoad,       roadMeta       } from './road';
import { createShip,       shipMeta       } from './ship';
import { createRobber,     robberMeta     } from './robber';
import { createSheep,      sheepMeta      } from './sheep';
import { createWheat,      wheatMeta      } from './wheat';
import { createWood,       woodMeta       } from './wood';
import { createOre,        oreMeta        } from './ore';
import { createBrick,      brickMeta      } from './brick';
import {
  createResourceLumber, resourceLumberMeta,
  createResourceBrick,  resourceBrickMeta,
  createResourceWool,   resourceWoolMeta,
  createResourceGrain,  resourceGrainMeta,
  createResourceOre,    resourceOreMeta,
} from './resourceCards';

// Game piece registry (always loaded)
export const REGISTRY = [
  { ...settlementMeta, create: createSettlement },
  { ...cityMeta,       create: createCity       },
  { ...roadMeta,       create: createRoad       },
  { ...shipMeta,       create: createShip       },
  { ...robberMeta,     create: createRobber     },
  { ...sheepMeta,      create: createSheep      },
  { ...wheatMeta,      create: createWheat      },
  { ...woodMeta,       create: createWood       },
  { ...oreMeta,        create: createOre        },
  { ...brickMeta,      create: createBrick      },
  { ...resourceLumberMeta, create: createResourceLumber },
  { ...resourceBrickMeta,  create: createResourceBrick  },
  { ...resourceWoolMeta,   create: createResourceWool   },
  { ...resourceGrainMeta,  create: createResourceGrain  },
  { ...resourceOreMeta,    create: createResourceOre    },
];

// Hex terrain tiles — loaded lazily to avoid breaking the main registry
const hexModules = [
  () => import('./hexForest').then(m => ({ ...m.hexForestMeta, create: m.createHexForest })),
  () => import('./hexPasture').then(m => ({ ...m.hexPastureMeta, create: m.createHexPasture })),
  () => import('./hexFields').then(m => ({ ...m.hexFieldsMeta, create: m.createHexFields })),
  () => import('./hexHills').then(m => ({ ...m.hexHillsMeta, create: m.createHexHills })),
  () => import('./hexMountains').then(m => ({ ...m.hexMountainsMeta, create: m.createHexMountains })),
  () => import('./hexDesert').then(m => ({ ...m.hexDesertMeta, create: m.createHexDesert })),
  () => import('./hexOcean').then(m => ({ ...m.hexOceanMeta, create: m.createHexOcean })),
];

// Load hex models into registry (async, non-blocking)
export async function loadHexModels() {
  const results = await Promise.allSettled(hexModules.map(fn => fn()));
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      REGISTRY.push(result.value);
    } else {
      console.warn('Failed to load hex model:', result.reason);
    }
  });
}

export const getModel = (id) => REGISTRY.find((m) => m.id === id);

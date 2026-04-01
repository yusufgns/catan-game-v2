---
id: elemental-serenity
name: Elemental Serenity
description: Anime/toon cel-shading with a 4-step gradient map and black outlines. Matches the Elemental Serenity design system.
material: toon
gradientSteps: 4
outline.enabled: true
outline.thickness: 0.025
outline.color: #111111
lighting.keyColor: #fff4e6
lighting.keyIntensity: 2.0
lighting.fillColor: #87ceeb
lighting.fillIntensity: 0.55
lighting.rimColor: #ffd7a3
lighting.rimIntensity: 0.3
lighting.ambientColor: #fff8f0
lighting.ambientIntensity: 0.45
palette.settlementWall: #d4956a
palette.settlementRoof: #8b3a3a
palette.settlementDoor: #5c3317
palette.settlementTimber: #5c3a1e
palette.settlementStone: #8a8070
palette.settlementWindow: #ffb347
palette.grassGreen: #5a8a3a
palette.flowerPink: #ff6b8a
palette.flowerYellow: #ffcc44
palette.cityWall: #8a7a6a
palette.cityRoof: #4a3a8a
palette.cityStone: #aaa090
palette.roadWood: #8b5e3c
palette.roadDark: #5c3a1e
palette.shipHull: #8b5e3c
palette.shipSail: #f5f0e8
palette.shipMast: #5c3a1e
palette.shipFlag: #c0392b
palette.robberBody: #2a2a2a
palette.robberCloak: #1a1a1a
palette.robberEye: #ff3300
palette.robberStaff: #4a3a2a
palette.sheepWool: #f2ede6
palette.sheepSkin: #d4b896
palette.sheepDark: #2a1f14
palette.sheepEye: #1a1210
palette.wheatStalk: #d4a832
palette.wheatGrain: #e8c040
palette.wheatLeaf: #8ab840
palette.wheatTie: #b87333
palette.woodBark: #5c3a1e
palette.woodRing: #8b5e3c
palette.woodLeaf: #2d6a2d
palette.woodDark: #4a2e12
palette.oreRock: #6a7a8a
palette.oreVein: #8090a8
palette.oreCrystal: #5588cc
palette.brickMain: #b84428
palette.brickMortar: #c8b89a
palette.brickKiln: #a03820
palette.hexForestGround: #2d7a3a
palette.hexForestTree: #1e6b2e
palette.hexForestTrunk: #5c3a1e
palette.hexPastureGround: #6cc520
palette.hexPastureFence: #8b6b3c
palette.hexFieldsGround: #c8a030
palette.hexFieldsWheat: #e8b830
palette.hexHillsGround: #b85a28
palette.hexHillsClay: #9a4420
palette.hexMountainsGround: #788898
palette.hexMountainsRock: #5a6a7a
palette.hexMountainsPeak: #d8d8e0
palette.hexDesertGround: #d4a838
palette.hexDesertSand: #e8c060
palette.hexDesertCactus: #3a7a3a
palette.hexOceanWater: #2e80c8
palette.hexOceanDeep: #1a5a90
palette.hexFrame: #d4b87a
---

# Elemental Serenity

The default Catan style. Uses `MeshToonMaterial` with a 4-step gradient map for
cel-shading, and back-face scaled meshes for the black outline effect.

## Creating a new style

Copy this file, rename it, add an entry to `index.json`, then change any of the
`palette.*` keys and/or the `material` / `outline.*` / `lighting.*` values.

| Key | Options |
|-----|---------|
| `material` | `toon` · `standard` · `physical` |
| `gradientSteps` | `2` · `3` · `4` (only for toon) |
| `outline.enabled` | `true` · `false` |

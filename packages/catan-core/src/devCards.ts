import type { DevCardType, DevCards } from './types';
import { EMPTY_DEV_CARDS } from './types';

/** Full dev card deck: 14 Knight, 5 VP, 2 Road Building, 2 Year of Plenty, 2 Monopoly */
export function createDevCardDeck(): DevCardType[] {
  const deck: DevCardType[] = [
    ...Array<DevCardType>(14).fill("knight"),
    ...Array<DevCardType>(5).fill("victoryPoint"),
    ...Array<DevCardType>(2).fill("roadBuilding"),
    ...Array<DevCardType>(2).fill("yearOfPlenty"),
    ...Array<DevCardType>(2).fill("monopoly"),
  ];
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export { EMPTY_DEV_CARDS };

import { describe, expect, it } from 'vitest';
import { harborIntersectionIds } from '../harborUtils';
import { HARBORS } from '../hexGrid';
import {
  tradeSignature,
  validateFinalizeTrade,
  validateMaritimeTrade,
  validateOfferTrade,
  validatePreAcceptTrade,
} from '../tradeRules';
import type { Resources } from '../types';
import { CTX_OK, makePlayer, makeTrade, res } from './helpers';

describe('turn-context gate (shared by maritime + offer)', () => {
  const p1 = makePlayer('p1', { resources: res({ lumber: 4 }) });
  const give = { resource: 'lumber' as const, amount: 4 };

  it('rejects during setup', () => {
    expect(validateMaritimeTrade(p1, give, 'ore', { ...CTX_OK, isSetup: true })).toBe('WRONG_PHASE');
  });
  it("rejects when it is not the player's turn", () => {
    expect(validateMaritimeTrade(p1, give, 'ore', { ...CTX_OK, isCurrentPlayerTurn: false })).toBe('NOT_YOUR_TURN');
  });
  it('rejects before the dice roll', () => {
    expect(validateMaritimeTrade(p1, give, 'ore', { ...CTX_OK, diceRolled: false })).toBe('WRONG_PHASE');
  });
  it('rejects while robber/steal/discard is pending', () => {
    expect(validateMaritimeTrade(p1, give, 'ore', { ...CTX_OK, needsRobber: true })).toBe('WRONG_PHASE');
    expect(validateMaritimeTrade(p1, give, 'ore', { ...CTX_OK, needsSteal: true })).toBe('WRONG_PHASE');
    expect(validateMaritimeTrade(p1, give, 'ore', { ...CTX_OK, needsDiscard: true })).toBe('WRONG_PHASE');
  });
});

describe('validateMaritimeTrade', () => {
  it('accepts a 4:1 bank trade', () => {
    const p1 = makePlayer('p1', { resources: res({ lumber: 4 }) });
    expect(validateMaritimeTrade(p1, { resource: 'lumber', amount: 4 }, 'ore', CTX_OK)).toBeNull();
  });

  it('rejects amounts that do not exactly match the rate', () => {
    const p1 = makePlayer('p1', { resources: res({ lumber: 8 }) });
    expect(validateMaritimeTrade(p1, { resource: 'lumber', amount: 3 }, 'ore', CTX_OK)).toBe('INVALID_TRADE');
    expect(validateMaritimeTrade(p1, { resource: 'lumber', amount: 8 }, 'ore', CTX_OK)).toBe('INVALID_TRADE');
    expect(validateMaritimeTrade(p1, { resource: 'lumber', amount: 0 }, 'ore', CTX_OK)).toBe('INVALID_TRADE');
    expect(validateMaritimeTrade(p1, { resource: 'lumber', amount: 4.5 }, 'ore', CTX_OK)).toBe('INVALID_TRADE');
  });

  it('rejects trading a resource for itself and unknown resources', () => {
    const p1 = makePlayer('p1', { resources: res({ lumber: 4 }) });
    expect(validateMaritimeTrade(p1, { resource: 'lumber', amount: 4 }, 'lumber', CTX_OK)).toBe('INVALID_TRADE');
    expect(
      validateMaritimeTrade(p1, { resource: 'gold' as never, amount: 4 }, 'ore', CTX_OK),
    ).toBe('INVALID_TRADE');
  });

  it('rejects insufficient resources', () => {
    const p1 = makePlayer('p1', { resources: res({ lumber: 3 }) });
    expect(validateMaritimeTrade(p1, { resource: 'lumber', amount: 4 }, 'ore', CTX_OK)).toBe('INSUFFICIENT_RESOURCES');
  });

  it('uses the 2:1 harbor rate when the player owns the harbor', () => {
    const brickIdx = HARBORS.findIndex(h => h.type === '2:1' && h.resource === 'brick');
    const [intId] = harborIntersectionIds(brickIdx);
    const p1 = makePlayer('p1', {
      settlements: [intId],
      resources: res({ brick: 4 }),
    });
    // with the harbor, only exactly 2 is valid
    expect(validateMaritimeTrade(p1, { resource: 'brick', amount: 2 }, 'ore', CTX_OK)).toBeNull();
    expect(validateMaritimeTrade(p1, { resource: 'brick', amount: 4 }, 'ore', CTX_OK)).toBe('INVALID_TRADE');
  });
});

describe('tradeSignature', () => {
  it('is insensitive to key order and missing zero entries', () => {
    const a = tradeSignature({ lumber: 2, ore: 1 }, { grain: 1 });
    const b = tradeSignature({ ore: 1, lumber: 2 }, { grain: 1, wool: 0 } as Partial<Resources>);
    expect(a).toBe(b);
  });

  it('is directional (offer↔want are not interchangeable)', () => {
    expect(tradeSignature({ lumber: 1 }, { ore: 1 })).not.toBe(tradeSignature({ ore: 1 }, { lumber: 1 }));
  });
});

describe('validateOfferTrade', () => {
  const others = [makePlayer('p2'), makePlayer('p3')];

  function offerer(resources: Partial<Resources> = { lumber: 2 }) {
    return makePlayer('p1', { resources: res(resources) });
  }

  it('accepts a valid open offer and a valid targeted offer', () => {
    const p1 = offerer();
    expect(validateOfferTrade(p1, { lumber: 2 }, { ore: 1 }, undefined, [p1, ...others], [], CTX_OK)).toBeNull();
    expect(validateOfferTrade(p1, { lumber: 2 }, { ore: 1 }, 'p2', [p1, ...others], [], CTX_OK)).toBeNull();
  });

  it('rejects empty, zero, negative, or fractional bundles', () => {
    const p1 = offerer();
    expect(validateOfferTrade(p1, {}, { ore: 1 }, undefined, [p1], [], CTX_OK)).toBe('INVALID_TRADE');
    expect(validateOfferTrade(p1, { lumber: 0 }, { ore: 1 }, undefined, [p1], [], CTX_OK)).toBe('INVALID_TRADE');
    expect(validateOfferTrade(p1, { lumber: -1 }, { ore: 1 }, undefined, [p1], [], CTX_OK)).toBe('INVALID_TRADE');
    expect(validateOfferTrade(p1, { lumber: 1.5 }, { ore: 1 }, undefined, [p1], [], CTX_OK)).toBe('INVALID_TRADE');
    expect(validateOfferTrade(p1, { lumber: 2 }, {}, undefined, [p1], [], CTX_OK)).toBe('INVALID_TRADE');
  });

  it('rejects offering and wanting the same resource', () => {
    const p1 = offerer({ lumber: 3 });
    expect(validateOfferTrade(p1, { lumber: 2 }, { lumber: 1 }, undefined, [p1], [], CTX_OK)).toBe('INVALID_TRADE');
  });

  it('rejects offers the player cannot cover', () => {
    const p1 = offerer({ lumber: 1 });
    expect(validateOfferTrade(p1, { lumber: 2 }, { ore: 1 }, undefined, [p1], [], CTX_OK)).toBe('INSUFFICIENT_RESOURCES');
  });

  it('rejects targeting self or an unknown player', () => {
    const p1 = offerer();
    expect(validateOfferTrade(p1, { lumber: 2 }, { ore: 1 }, 'p1', [p1, ...others], [], CTX_OK)).toBe('INVALID_TRADE');
    expect(validateOfferTrade(p1, { lumber: 2 }, { ore: 1 }, 'ghost', [p1, ...others], [], CTX_OK)).toBe('INVALID_TRADE');
  });

  it('rejects a duplicate of an already-open identical offer', () => {
    const p1 = offerer();
    const open = makeTrade({ fromPlayerId: 'p1', offer: { lumber: 2 }, want: { ore: 1 } });
    expect(validateOfferTrade(p1, { lumber: 2 }, { ore: 1 }, undefined, [p1, ...others], [open], CTX_OK)).toBe('DUPLICATE_TRADE');
    // same signature from ANOTHER player is fine
    const foreign = makeTrade({ fromPlayerId: 'p2', offer: { lumber: 2 }, want: { ore: 1 } });
    expect(validateOfferTrade(p1, { lumber: 2 }, { ore: 1 }, undefined, [p1, ...others], [foreign], CTX_OK)).toBeNull();
  });
});

describe('validatePreAcceptTrade', () => {
  it('validates the happy path', () => {
    const accepter = makePlayer('p2', { resources: res({ ore: 1 }) });
    expect(validatePreAcceptTrade(accepter, makeTrade(), 't1')).toBeNull();
  });

  it('rejects missing or mismatched trades', () => {
    const accepter = makePlayer('p2', { resources: res({ ore: 1 }) });
    expect(validatePreAcceptTrade(accepter, null, 't1')).toBe('NO_ACTIVE_TRADE');
    expect(validatePreAcceptTrade(accepter, makeTrade({ id: 'other' }), 't1')).toBe('NO_ACTIVE_TRADE');
  });

  it('rejects accepting your own trade', () => {
    const accepter = makePlayer('p1', { resources: res({ ore: 1 }) });
    expect(validatePreAcceptTrade(accepter, makeTrade(), 't1')).toBe('CANNOT_ACCEPT_OWN_TRADE');
  });

  it('rejects trades targeted at someone else', () => {
    const accepter = makePlayer('p3', { resources: res({ ore: 1 }) });
    expect(validatePreAcceptTrade(accepter, makeTrade({ toPlayerId: 'p2' }), 't1')).toBe('TRADE_TARGETED_AT_OTHER');
  });

  it('rejects double pre-accepts', () => {
    const accepter = makePlayer('p2', { resources: res({ ore: 1 }) });
    expect(validatePreAcceptTrade(accepter, makeTrade({ acceptedBy: ['p2'] }), 't1')).toBe('ALREADY_ACCEPTED');
  });

  it('accepter must hold what the offerer WANTS', () => {
    const broke = makePlayer('p2'); // no resources
    expect(validatePreAcceptTrade(broke, makeTrade(), 't1')).toBe('INSUFFICIENT_RESOURCES');
  });
});

describe('validateFinalizeTrade', () => {
  const trade = makeTrade({ acceptedBy: ['p2'] });

  it('validates the happy path', () => {
    const offerer = makePlayer('p1', { resources: res({ lumber: 1 }) });
    const partner = makePlayer('p2', { resources: res({ ore: 1 }) });
    expect(validateFinalizeTrade(offerer, partner, trade, 't1', 'p2')).toBeNull();
  });

  it('only the offerer can finalize', () => {
    const imposter = makePlayer('p3', { resources: res({ lumber: 1 }) });
    const partner = makePlayer('p2', { resources: res({ ore: 1 }) });
    expect(validateFinalizeTrade(imposter, partner, trade, 't1', 'p2')).toBe('NOT_YOUR_TURN');
  });

  it('partner must have pre-accepted', () => {
    const offerer = makePlayer('p1', { resources: res({ lumber: 1 }) });
    const partner = makePlayer('p3', { resources: res({ ore: 1 }) });
    expect(validateFinalizeTrade(offerer, partner, trade, 't1', 'p3')).toBe('PARTNER_NOT_PRE_ACCEPTED');
    expect(validateFinalizeTrade(offerer, null, trade, 't1', 'p2')).toBe('PARTNER_NOT_PRE_ACCEPTED');
  });

  it('re-checks both sides can still pay at finalize time', () => {
    const brokeOfferer = makePlayer('p1');
    const partner = makePlayer('p2', { resources: res({ ore: 1 }) });
    expect(validateFinalizeTrade(brokeOfferer, partner, trade, 't1', 'p2')).toBe('INSUFFICIENT_RESOURCES');

    const offerer = makePlayer('p1', { resources: res({ lumber: 1 }) });
    const brokePartner = makePlayer('p2');
    expect(validateFinalizeTrade(offerer, brokePartner, trade, 't1', 'p2')).toBe('INSUFFICIENT_RESOURCES');
  });

  it('rejects unknown trade ids', () => {
    const offerer = makePlayer('p1', { resources: res({ lumber: 1 }) });
    const partner = makePlayer('p2', { resources: res({ ore: 1 }) });
    expect(validateFinalizeTrade(offerer, partner, null, 't1', 'p2')).toBe('NO_ACTIVE_TRADE');
    expect(validateFinalizeTrade(offerer, partner, trade, 'wrong', 'p2')).toBe('NO_ACTIVE_TRADE');
  });
});

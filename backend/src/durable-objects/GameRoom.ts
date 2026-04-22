import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../env';
import { createDb } from '../db/client';
import { games, gamePlayers, gameActions, lobbies, users, userStats } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  type GameState, type Player, type BoardGraph, type Hex, type ResourceType,
  type ClientMessage, type ServerMessage,
  EMPTY_RESOURCES, EMPTY_DEV_CARDS,
  BEGINNER_BOARD, generateRandomBoard,
  buildBoardGraph,
  canPlaceSettlement, canUpgradeCity, canPlaceRoad,
  computeLongestRoad, distributeResources,
  createDevCardDeck,
  canAfford, deductCost,
  ROAD_COST, SETTLEMENT_COST, CITY_COST, DEV_CARD_COST,
  playerTradeRates,
  validateMaritimeTrade, validateOfferTrade,
  validatePreAcceptTrade, validateFinalizeTrade,
  shouldBotAcceptTrade,
  TRADE_TTL_MS, DISCARD_TIMEOUT_MS, DISCARD_THRESHOLD,
  ALL_RESOURCES,
  type TradeContext,
  computeEloChanges, xpForResult, levelForXp,
  type PlayerGameResult,
  calculateVP, checkWinner,
  NUMBER_PIPS,
} from '@catan/core';

const DEFAULT_TURN_TIMER_MS = 60_000; // default 60s per turn
const GAME_IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour idle → auto-close
const DISCONNECT_GRACE_MS = 2 * 60 * 1000; // 2 min grace before bot takeover
const BOT_THINK_DELAY_MS = 1000; // delay before bot plays (feels natural)
const AFK_TURNS_TO_REPLACE = 3; // consecutive auto-actions before bot replacement
const PLAYER_COLORS = ['#d97706', '#2563eb', '#16a34a', '#dc2626'];

type AlarmPurpose = 'bot_turn' | 'turn_timer' | 'idle_cleanup' | 'trade_timeout' | 'discard_timeout';

export class GameRoom extends DurableObject<Env> {
  private connections = new Map<string, WebSocket>();
  private playerTabIds = new Map<string, string>(); // playerId → tabId
  private disconnectedAt = new Map<string, number>();
  private state: GameState | null = null;
  private graph: BoardGraph | null = null;
  private hexes: Hex[] = [];
  private pendingBotAction = false;
  private gameLog: string[] = []; // in-memory log for reconnecting players

  // Turn timer & AFK
  private turnTimerMs: number = DEFAULT_TURN_TIMER_MS; // 0 = Off
  private turnDeadline: number | null = null;
  private alarmPurpose: AlarmPurpose | null = null;
  private afkCount = new Map<string, number>(); // playerId → consecutive auto-turn count
  private botReplacedPlayers = new Map<string, string>(); // originalPlayerId → marker
  private playerActedThisTurn = false; // did current player do any manual action?

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Initialize game from lobby data
    if (url.searchParams.has('init')) {
      const body = await request.json() as any;
      await this.initGame(body.gameId, body.players, body.mode, body.settings);
      return new Response('Game initialized', { status: 200 });
    }

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const playerId = url.searchParams.get('playerId') ?? 'unknown';
      const tabId = url.searchParams.get('tabId') ?? '';

      // Close existing connection if player connects from a DIFFERENT tab
      const existingWs = this.connections.get(playerId);
      if (existingWs) {
        const existingTabId = this.playerTabIds.get(playerId);
        if (tabId && existingTabId && tabId === existingTabId) {
          // Same tab reconnecting — silently replace
          try { existingWs.close(1000, 'Reconnected'); } catch {}
        } else {
          // Different tab — notify old tab
          try {
            existingWs.send(JSON.stringify({ type: 'SESSION_REPLACED' }));
            existingWs.close(4001, 'Session replaced by new tab');
          } catch {}
        }
      }
      this.playerTabIds.set(playerId, tabId);

      this.ctx.acceptWebSocket(server, [playerId]);
      this.connections.set(playerId, server);
      this.disconnectedAt.delete(playerId); // clear disconnect status on reconnect

      // Load state if not in memory
      if (!this.state) await this.loadState();

      // Restore player from bot replacement
      if (this.botReplacedPlayers.has(playerId)) {
        this.botReplacedPlayers.delete(playerId);
        this.afkCount.set(playerId, 0);
        await this.ctx.storage.put('botReplacedPlayers', Object.fromEntries(this.botReplacedPlayers));
        this.addLog(`👋 ${this.state?.players.find(p => p.id === playerId)?.name || playerId} geri döndü!`);
        this.broadcast({ type: 'PLAYER_RECONNECTED_FROM_BOT', playerId } as any);

        // If it's their turn and bot was pending, cancel bot and start turn timer
        const cp = this.state?.players[this.state?.currentPlayerIndex ?? -1];
        if (cp?.id === playerId) {
          this.pendingBotAction = false;
          this.scheduleTurnTimer();
        }
      }

      // Send full state to reconnecting player
      if (this.state) {
        this.sendToPlayer(playerId, { type: 'GAME_STATE', state: this.publicState() } as any);
        this.sendPrivateState(playerId);
        // Send log history
        if (this.gameLog.length > 0) {
          this.sendToPlayer(playerId, { type: 'GAME_LOG_HISTORY', logs: this.gameLog } as any);
        }
        this.broadcast({ type: 'PLAYER_CONNECTED', playerId });
        this.scheduleBotTurn();
      }

      return new Response(null, { status: 101, webSocket: client });
    }

    // Status endpoint
    return new Response(JSON.stringify({
      gameId: this.state?.id,
      phase: this.state?.phase,
      turn: this.state?.turnNumber,
      players: this.state?.players.length,
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
    const playerId = this.getPlayerId(ws);
    if (!playerId || !this.state || !this.graph) return;

    let msg: ClientMessage;
    try { msg = JSON.parse(data); } catch {
      ws.send(JSON.stringify({ type: 'ERROR', code: 'PARSE_ERROR', message: 'Invalid JSON' }));
      return;
    }

    try {
      await this.handleAction(playerId, msg);
    } catch (e: any) {
      ws.send(JSON.stringify({ type: 'ERROR', code: 'ACTION_ERROR', message: e.message }));
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const playerId = this.getPlayerId(ws);
    if (!playerId) return;
    this.connections.delete(playerId);
    this.disconnectedAt.set(playerId, Date.now());
    this.broadcast({ type: 'PLAYER_DISCONNECTED', playerId });

    // Exclude the closing WS — it's still in getWebSockets() until handler returns
    const activeWs = this.ctx.getWebSockets().filter(w => w !== ws);
    console.log(JSON.stringify({ event: 'ws_close', playerId, activeWsRemaining: activeWs.length }));

    if (activeWs.length === 0) {
      if (await this.checkAllPlayersGone()) return;
    }
    // Always reconcile alarms — preserves in-flight turn_timer when a brief
    // disconnect would otherwise clobber it with idle_cleanup.
    this.rescheduleAlarms();
  }

  async alarm(): Promise<void> {
    if (!this.state) return;

    // Load state if needed (DO might have been evicted and restored)
    if (!this.graph) {
      await this.loadState();
      if (!this.state || !this.graph) return;
    }

    if (this.state.phase === 'ended') return;

    const purpose = this.alarmPurpose;
    this.alarmPurpose = null;

    // ── Bot turn ──
    if (purpose === 'bot_turn' && this.pendingBotAction) {
      this.pendingBotAction = false;
      await this.executeBotTurn();
      this.rescheduleAlarms();
      return;
    }

    // ── Turn timer expired ──
    if (purpose === 'turn_timer') {
      await this.handleTurnTimeout();
      this.rescheduleAlarms();
      return;
    }

    // ── Trade timeout — drop expired trades ──
    if (purpose === 'trade_timeout') {
      this.expireStaleTrades();
      this.broadcastState();
      await this.persistState();
      this.rescheduleAlarms();
      return;
    }

    // ── Discard timeout — auto-discard for any player still owing ──
    if (purpose === 'discard_timeout') {
      this.forceAllPendingDiscards();
      // If current player is a bot and was waiting, kick the bot turn forward.
      const cp = this.state.players[this.state.currentPlayerIndex];
      if (cp && this.isBot(cp.id) && (this.state as any).needsRobber) {
        this.scheduleBotTurn();
      } else if (cp && !this.isBot(cp.id)) {
        this.scheduleTurnTimer();
      }
      this.broadcastState();
      await this.persistState();
      this.rescheduleAlarms();
      return;
    }

    // ── Idle cleanup ──
    if (purpose === 'idle_cleanup' || !purpose) {
      console.log(JSON.stringify({ event: 'alarm_idle_cleanup', activeWs: this.ctx.getWebSockets().length }));

      // If any real player is within their disconnect grace window, reschedule rather than delete.
      // This lets refreshes / brief drops recover instead of nuking the game (and DB rows).
      const now = Date.now();
      let earliestDisconnect = Infinity;
      let anyInGrace = false;
      for (const p of this.state.players) {
        if (p.id.startsWith('bot_')) continue;
        if (this.botReplacedPlayers.has(p.id)) continue;
        if (this.connections.has(p.id)) { anyInGrace = true; break; }
        const dt = this.disconnectedAt.get(p.id);
        if (dt !== undefined && now - dt < DISCONNECT_GRACE_MS) {
          anyInGrace = true;
          if (dt < earliestDisconnect) earliestDisconnect = dt;
        }
      }
      if (anyInGrace && this.ctx.getWebSockets().length === 0) {
        const remaining = earliestDisconnect === Infinity
          ? 30_000
          : Math.max((earliestDisconnect + DISCONNECT_GRACE_MS) - now + 1_000, 5_000);
        console.log(JSON.stringify({ event: 'idle_cleanup_reschedule', remainingMs: remaining }));
        this.scheduleAlarm('idle_cleanup', remaining);
        return;
      }

      // Grace expired or no real players ever existed — check if all gone → delete
      if (await this.checkAllPlayersGone()) return;

      // If no active WebSockets and grace expired, end and delete
      if (this.ctx.getWebSockets().length === 0) {
        const gameId = this.state.id;
        this.state.phase = 'ended';
        await this.deleteGameFromDb(gameId);
        await this.ctx.storage.deleteAll();
        this.state = null;
        return;
      }

      // Disconnected player grace check (advance turn if currentPlayer AFK past grace)
      const cp = this.state.players[this.state.currentPlayerIndex];
      const disconnectTime = this.disconnectedAt.get(cp.id);
      if (disconnectTime && Date.now() - disconnectTime > DISCONNECT_GRACE_MS) {
        this.advanceTurnAndBroadcast();
      }
    }
  }

  // ── Game Initialization ───────────────────────────────────────────────────

  private async initGame(gameId: string, playerData: { id: string; name: string; color: string }[], mode: string, settings?: { turnTimerMs?: number }) {
    this.hexes = mode === 'ranked' ? generateRandomBoard() : [...BEGINNER_BOARD];
    this.graph = buildBoardGraph(this.hexes);

    const players: Player[] = playerData.map((p, i) => ({
      id: p.id,
      name: p.name,
      color: p.color || PLAYER_COLORS[i],
      settlements: [],
      cities: [],
      roads: [],
      resources: { ...EMPTY_RESOURCES },
      devCards: { ...EMPTY_DEV_CARDS },
      knightsPlayed: 0,
      hasPlayedDevCardThisTurn: false,
    }));

    const desert = this.hexes.find(h => h.type === 'desert');

    this.state = {
      id: gameId,
      mode: mode as any,
      phase: 'setup1',
      currentPlayerIndex: 0,
      turnNumber: 0,
      players,
      hexes: this.hexes,
      robberHex: desert ? `${desert.q},${desert.r}` : '0,0',
      longestRoadHolder: null,
      largestArmyHolder: null,
      devCardDeck: createDevCardDeck(),
      setupConstraint: null,
      diceRolled: false,
      diceValues: null,
      stealTargets: [],
      activeTrades: [],
      discardRequired: {},
      discardDeadline: null,
      winner: null,
    };

    // Apply timer settings
    if (settings?.turnTimerMs !== undefined) {
      this.turnTimerMs = settings.turnTimerMs;
    }
    await this.ctx.storage.put('gameId', gameId);
    await this.ctx.storage.put('turnTimerMs', this.turnTimerMs);

    await this.persistState();

    // If first player is a bot, start bot turn; otherwise start turn timer
    if (!this.scheduleBotTurn()) {
      this.scheduleTurnTimer();
    }
  }

  // ── Action Handler ────────────────────────────────────────────────────────

  private async handleAction(playerId: string, msg: ClientMessage) {
    const s = this.state!;
    const g = this.graph!;
    const cp = s.players[s.currentPlayerIndex];

    // Verify it's this player's turn (except for trade responses, and bots handle themselves)
    if (msg.type !== 'ACCEPT_TRADE' && msg.type !== 'REJECT_TRADE' && msg.type !== 'DISCARD_RESOURCES') {
      if (cp.id !== playerId && !this.isBot(cp.id)) throw new Error('Not your turn');
    }

    // Mark that current player took a manual action (resets AFK)
    if (cp.id === playerId && !this.isBot(playerId)) {
      this.playerActedThisTurn = true;
      this.afkCount.set(playerId, 0);
    }

    switch (msg.type) {
      case 'ROLL_DICE':
        this.handleRollDice();
        break;
      case 'BUILD_SETTLEMENT':
        this.handleBuildSettlement(playerId, msg.intersectionId);
        break;
      case 'BUILD_CITY':
        this.handleBuildCity(playerId, msg.intersectionId);
        break;
      case 'BUILD_ROAD':
        this.handleBuildRoad(playerId, msg.edgeId);
        break;
      case 'BUY_DEV_CARD':
        this.handleBuyDevCard(playerId);
        break;
      case 'PLAY_DEV_CARD':
        this.handlePlayDevCard(playerId, msg.cardType, msg.payload);
        break;
      case 'OFFER_TRADE':
        this.handleOfferTrade(playerId, msg.offer, msg.want, msg.targetPlayer);
        break;
      case 'ACCEPT_TRADE':
        this.handleAcceptTrade(playerId, msg.tradeId, msg.with);
        break;
      case 'REJECT_TRADE':
        this.handleRejectTrade(playerId, msg.tradeId);
        break;
      case 'MARITIME_TRADE':
        this.handleMaritimeTrade(playerId, msg.give, msg.want);
        break;
      case 'MOVE_ROBBER':
        this.handleMoveRobber(playerId, msg.hexId, msg.stealFrom);
        break;
      case 'CHOOSE_STEAL':
        this.handleChooseSteal(playerId, (msg as any).targetId);
        break;
      case 'DISCARD_RESOURCES':
        this.handleDiscard(playerId, msg.resources);
        break;
      case 'END_TURN':
        this.handleEndTurn(playerId);
        break;
    }

    // Log action
    await this.logAction(playerId, msg.type, msg);

    // Persist
    await this.persistState();

    // Broadcast updated state
    this.broadcastState();

    // Check if next player is a bot → schedule bot turn; else schedule turn timer.
    // We restart the timer after END_TURN (new player's clock) and after any
    // setup-phase action so a stalled player mid-placement gets timed out too.
    if (!this.scheduleBotTurn()) {
      if (msg.type === 'END_TURN' || this.state!.phase === 'setup1' || this.state!.phase === 'setup2') {
        this.scheduleTurnTimer();
      }
    }
    // Reconcile so in-flight turn_timer / bot_turn / idle_cleanup don't
    // clobber each other (only one alarm slot per DO).
    this.rescheduleAlarms();
  }

  // ── Bot AI ────────────────────────────────────────────────────────────────

  private addLog(message: string) {
    this.gameLog.push(message);
    if (this.gameLog.length > 100) this.gameLog = this.gameLog.slice(-100);
    this.broadcast({ type: 'GAME_LOG', message } as any);
  }

  private isBot(playerId: string): boolean {
    return playerId.startsWith('bot_') || this.botReplacedPlayers.has(playerId);
  }

  private scheduleAlarm(purpose: AlarmPurpose, delayMs: number) {
    this.alarmPurpose = purpose;
    this.pendingBotAction = purpose === 'bot_turn';
    this.ctx.storage.setAlarm(Date.now() + delayMs);
  }

  /**
   * Reconcile pending alarms after any state change. DOs only have one alarm
   * slot, so we always set the EARLIEST of: pending turn_timer, pending
   * bot_turn, or pending idle_cleanup. Without this, e.g. webSocketClose's
   * idle_cleanup overwrites an in-progress turn_timer and the game stalls
   * (no auto-roll, no auto-end-turn).
   */
  private rescheduleAlarms() {
    if (!this.state || this.state.phase === 'ended') return;
    const now = Date.now();
    const cp = this.state.players[this.state.currentPlayerIndex];
    if (!cp) return;

    const candidates: { purpose: AlarmPurpose; fireAt: number }[] = [];

    // Bot turn pending?
    if (this.pendingBotAction && this.isBot(cp.id)) {
      candidates.push({ purpose: 'bot_turn', fireAt: now + BOT_THINK_DELAY_MS });
    }

    // Turn timer for human current player
    if (!this.isBot(cp.id) && this.turnDeadline !== null && this.turnTimerMs > 0) {
      candidates.push({ purpose: 'turn_timer', fireAt: this.turnDeadline });
    }

    // Trade timeout — earliest expiring trade
    if (this.state.activeTrades.length > 0) {
      const earliestExpiry = Math.min(...this.state.activeTrades.map(t => t.expiresAt));
      candidates.push({ purpose: 'trade_timeout', fireAt: earliestExpiry });
    }

    // Discard timeout — pending forced discards
    if (this.state.discardDeadline !== null && Object.keys(this.state.discardRequired).length > 0) {
      candidates.push({ purpose: 'discard_timeout', fireAt: this.state.discardDeadline });
    }

    // Idle cleanup if any non-bot, non-replaced players are disconnected (grace check)
    let earliestDisconnect = Infinity;
    let anyDisconnected = false;
    let allRealGoneOrInGrace = true;
    for (const p of this.state.players) {
      if (p.id.startsWith('bot_')) continue;
      if (this.botReplacedPlayers.has(p.id)) continue;
      if (this.connections.has(p.id)) { allRealGoneOrInGrace = false; break; }
      const dt = this.disconnectedAt.get(p.id);
      if (dt !== undefined) {
        anyDisconnected = true;
        if (dt < earliestDisconnect) earliestDisconnect = dt;
      } else {
        allRealGoneOrInGrace = false;
      }
    }
    if (allRealGoneOrInGrace && anyDisconnected) {
      const graceEnd = earliestDisconnect + DISCONNECT_GRACE_MS + 1_000;
      candidates.push({ purpose: 'idle_cleanup', fireAt: Math.max(graceEnd, now + 5_000) });
    }

    if (candidates.length === 0) return;
    candidates.sort((a, b) => a.fireAt - b.fireAt);
    const next = candidates[0];
    const delay = Math.max(next.fireAt - now, 100);
    this.scheduleAlarm(next.purpose, delay);
  }

  /** Schedule bot turn. Returns true if bot was scheduled. */
  private scheduleBotTurn(): boolean {
    if (!this.state || this.state.phase === 'ended') return false;
    const cp = this.state.players[this.state.currentPlayerIndex];
    if (!cp || !this.isBot(cp.id)) return false;

    this.scheduleAlarm('bot_turn', BOT_THINK_DELAY_MS);
    return true;
  }

  /** Start turn timer for human player. Does nothing if timer is Off or player is bot.
   *  Runs in setup AND main phases so forgotten placements don't stall the game. */
  private scheduleTurnTimer() {
    if (this.turnTimerMs <= 0) return;
    if (!this.state || this.state.phase === 'ended') return;
    const cp = this.state.players[this.state.currentPlayerIndex];
    if (!cp || this.isBot(cp.id)) return;
    if (this.state.phase !== 'main' && this.state.phase !== 'setup1' && this.state.phase !== 'setup2') return;

    this.turnDeadline = Date.now() + this.turnTimerMs;
    this.playerActedThisTurn = false;
    this.scheduleAlarm('turn_timer', this.turnTimerMs);
  }

  // ── Turn Timer & AFK ────────────────────────────────────────────────────

  private async handleTurnTimeout() {
    if (!this.state || !this.graph) return;
    const s = this.state;
    const cp = s.players[s.currentPlayerIndex];
    if (!cp || this.isBot(cp.id)) return;

    // Track AFK across every timeout fire (setup + main). Shared counter so
    // a player who burns 3 placements in a row also gets replaced by a bot.
    const bumpAfk = async (): Promise<boolean> => {
      if (this.playerActedThisTurn) return false;
      const count = (this.afkCount.get(cp.id) || 0) + 1;
      this.afkCount.set(cp.id, count);
      if (count >= AFK_TURNS_TO_REPLACE && this.turnTimerMs > 0) {
        await this.replaceWithBot(cp.id);
        return true;
      }
      return false;
    };

    // Setup phases — auto-place settlement or road for the stalled player,
    // then advance. Uses the bot's heuristic picker for a sensible default.
    if (s.phase === 'setup1' || s.phase === 'setup2') {
      try {
        if (!s.setupConstraint) {
          const intId = this.botPickSettlement(cp.id);
          if (intId) {
            this.handleBuildSettlement(cp.id, intId);
            this.addLog(`⏱ ${cp.name} süre doldu — settlement otomatik yerleşti`);
          }
        } else {
          const edgeId = this.botPickSetupRoad(cp.id);
          if (edgeId) {
            this.handleBuildRoad(cp.id, edgeId);
            this.addLog(`⏱ ${cp.name} süre doldu — yol otomatik yerleşti`);
          }
        }
      } catch (e) {
        console.error(JSON.stringify({ event: 'setup_auto_failed', gameId: s.id, error: String(e) }));
      }
      if (await bumpAfk()) return;
      this.broadcastState();
      await this.persistState();
      // If current player is still the same (e.g. just placed settlement and
      // owes a road), keep the timer. Otherwise schedule for next player.
      if (!this.scheduleBotTurn()) this.scheduleTurnTimer();
      return;
    }

    // Phase 1: Need steal → auto steal random target
    if ((s as any).needsSteal && s.stealTargets.length > 0) {
      const target = s.stealTargets[Math.floor(Math.random() * s.stealTargets.length)];
      this.handleChooseSteal(cp.id, target);
      this.addLog(`⏱ ${cp.name} süre doldu — otomatik çalındı`);
      this.broadcastState();
      await this.persistState();
      this.scheduleTurnTimer(); // restart timer for remaining turn
      return;
    }

    // Phase 2: Need robber → auto move to random valid hex
    if ((s as any).needsRobber) {
      // Cannot move robber while any forced discards remain. Restart timer
      // so we re-check after discard_timeout completes.
      if (Object.keys(s.discardRequired).length > 0) {
        this.scheduleTurnTimer();
        return;
      }
      const validHexes = s.hexes
        .map(h => `${h.q},${h.r}`)
        .filter(id => id !== s.robberHex && s.hexes.find(h => `${h.q},${h.r}` === id)?.type !== 'desert');
      const randomHex = validHexes[Math.floor(Math.random() * validHexes.length)] || s.robberHex;
      this.handleMoveRobber(cp.id, randomHex, null);
      this.addLog(`⏱ ${cp.name} süre doldu — robber otomatik taşındı`);
      this.broadcastState();
      await this.persistState();
      this.scheduleTurnTimer();
      return;
    }

    // Phase 3: Dice not rolled → auto roll
    if (!s.diceRolled) {
      this.handleRollDice();
      this.addLog(`⏱ ${cp.name} süre doldu — zar otomatik atıldı`);
      this.broadcastState();
      await this.persistState();
      // If 7 → robber needed, restart timer for robber phase
      if ((s as any).needsRobber) {
        this.scheduleTurnTimer();
        return;
      }
      // Dice rolled, restart timer for build/end phase
      this.scheduleTurnTimer();
      return;
    }

    // Phase 4: Dice rolled, no pending actions → auto end turn
    this.addLog(`⏱ ${cp.name} süre doldu — tur otomatik geçti`);
    if (await bumpAfk()) return;
    this.advanceTurnAndBroadcast();
  }

  private async advanceTurnAndBroadcast() {
    const s = this.state!;
    this.turnDeadline = null;
    this.advanceTurn();
    this.broadcast({ type: 'TURN_ENDED', nextPlayerIndex: s.currentPlayerIndex, turnNumber: s.turnNumber });
    this.broadcastState();
    await this.persistState();
    if (!this.scheduleBotTurn()) {
      this.scheduleTurnTimer();
    }
  }

  private async replaceWithBot(playerId: string) {
    const player = this.state?.players.find(p => p.id === playerId);
    const botMarker = `bot_afk_${Date.now()}`;
    this.botReplacedPlayers.set(playerId, botMarker);
    await this.ctx.storage.put('botReplacedPlayers', Object.fromEntries(this.botReplacedPlayers));

    // Notify the replaced player
    const ws = this.connections.get(playerId);
    if (ws) {
      try {
        ws.send(JSON.stringify({ type: 'REPLACED_BY_BOT', reason: 'afk' }));
        ws.close(4002, 'Replaced by bot due to AFK');
      } catch {}
      this.connections.delete(playerId);
    }

    // Notify all other players
    this.addLog(`🤖 ${player?.name || playerId} AFK — bot devam ediyor`);
    this.broadcast({ type: 'PLAYER_REPLACED_BY_BOT', playerId } as any);
    this.broadcastState();
    await this.persistState();

    // Check if all real players are gone → end and delete game
    if (await this.checkAllPlayersGone()) return;

    // If it's this player's turn, start bot turn
    const cp = this.state!.players[this.state!.currentPlayerIndex];
    if (cp.id === playerId) {
      this.turnDeadline = null;
      this.scheduleBotTurn();
    }
  }

  /**
   * Check if no real (non-bot) player is still connected or able to return.
   * A real player is "still around" if they are connected OR disconnected within
   * the DISCONNECT_GRACE_MS window (refresh / brief network drop).
   * If only bots remain → end game, delete from DB.
   * Returns true if game was ended.
   */
  private async checkAllPlayersGone(): Promise<boolean> {
    if (!this.state) await this.loadState();
    if (!this.state || this.state.phase === 'ended') return false;

    const now = Date.now();
    const hasActiveRealPlayer = this.state.players.some(p => {
      if (p.id.startsWith('bot_')) return false;
      if (this.botReplacedPlayers.has(p.id)) return false;
      // Live connection counts
      if (this.connections.has(p.id)) return true;
      // Disconnected but within grace period — give them time to refresh / reconnect
      const dt = this.disconnectedAt.get(p.id);
      if (dt !== undefined && now - dt < DISCONNECT_GRACE_MS) return true;
      return false;
    });

    console.log(JSON.stringify({
      event: 'check_all_players_gone',
      gameId: this.state.id,
      playerCount: this.state.players.length,
      connectionsSize: this.connections.size,
      hasActiveRealPlayer,
      disconnected: [...this.disconnectedAt.keys()],
      botReplaced: [...this.botReplacedPlayers.keys()],
    }));

    if (hasActiveRealPlayer) return false;

    // All real players are gone — end game
    const gameId = this.state.id;
    this.state.phase = 'ended';
    this.turnDeadline = null;
    this.broadcast({ type: 'GAME_OVER', winnerId: null, finalScores: {}, reason: 'all_players_left' } as any);

    // Close remaining connections
    for (const ws of this.connections.values()) {
      try { ws.close(1000, 'Game ended — all players left'); } catch {}
    }
    this.connections.clear();

    // Delete from DB first (before clearing DO storage which nulls state)
    await this.deleteGameFromDb(gameId);

    // Clean up DO storage
    await this.ctx.storage.deleteAll();
    this.state = null;

    return true;
  }

  private async deleteGameFromDb(gameId: string) {
    console.log(JSON.stringify({ event: 'game_delete_start', gameId }));
    try {
      const db = createDb(this.env.NEON_DATABASE_URL);
      const r1 = await db.delete(gameActions).where(eq(gameActions.gameId, gameId));
      console.log(JSON.stringify({ event: 'game_delete_actions', gameId, result: r1 }));
      const r2 = await db.delete(gamePlayers).where(eq(gamePlayers.gameId, gameId));
      console.log(JSON.stringify({ event: 'game_delete_players', gameId, result: r2 }));
      const r3 = await db.delete(games).where(eq(games.id, gameId));
      console.log(JSON.stringify({ event: 'game_delete_game', gameId, result: r3 }));
      console.log(JSON.stringify({ event: 'game_deleted', gameId, reason: 'all_players_left' }));
    } catch (e) {
      console.error(JSON.stringify({ event: 'game_delete_failed', gameId, error: String(e) }));
    }
  }

  private async executeBotTurn() {
    if (!this.state || !this.graph || this.state.phase === 'ended') return;

    // Load graph if not present (DO might have been restored from alarm)
    if (!this.graph && this.state.hexes) {
      this.hexes = this.state.hexes;
      this.graph = buildBoardGraph(this.state.hexes);
    }
    if (!this.graph) return;

    const s = this.state;
    const g = this.graph;
    const cp = s.players[s.currentPlayerIndex];
    if (!cp || !this.isBot(cp.id)) return;

    try {
      await this._executeBotAction(s, g, cp);
    } catch (e) {
      console.error('[Bot Error]', cp.name, e);
      // On error, just end turn to prevent stuck game
      try {
        this.advanceTurn();
        this.broadcast({ type: 'TURN_ENDED', nextPlayerIndex: s.currentPlayerIndex, turnNumber: s.turnNumber });
        this.broadcastState();
        await this.persistState();
        this.scheduleBotTurn();
      } catch (e) { console.error(JSON.stringify({ event: 'bot_recovery_failed', gameId: this.state?.id, error: String(e) })); }
    }
  }

  private async _executeBotAction(s: GameState, g: BoardGraph, cp: Player) {

    // Setup phase
    if (s.phase === 'setup1' || s.phase === 'setup2') {
      if (!s.setupConstraint) {
        // Place settlement — pick highest pip score intersection
        const intId = this.botPickSettlement(cp.id);
        if (intId) {
          this.handleBuildSettlement(cp.id, intId);
          this.broadcastState();
          await this.persistState();
          this.scheduleBotTurn();
          return;
        }
      } else {
        // Place road adjacent to setup constraint
        const edgeId = this.botPickSetupRoad(cp.id);
        if (edgeId) {
          this.handleBuildRoad(cp.id, edgeId);
          this.broadcastState();
          await this.persistState();
          this.scheduleBotTurn();
          return;
        }
      }
      return;
    }

    // Main phase — Step 1: Play knight before rolling (move robber strategically)
    if (!s.diceRolled && cp.devCards.knight > 0 && !cp.hasPlayedDevCardThisTurn) {
      cp.devCards.knight--;
      cp.hasPlayedDevCardThisTurn = true;
      cp.knightsPlayed++;
      this.recalcLargestArmy();
      const robberHex = this.botPickRobberHex();
      const stealTarget = this.botPickStealTarget(robberHex, cp.id);
      this.handleMoveRobber(cp.id, robberHex, stealTarget);
      this.broadcast({ type: 'DEV_CARD_PLAYED', playerId: cp.id, cardType: 'knight' as any });
      this.broadcastState();
      await this.persistState();
      this.scheduleBotTurn();
      return;
    }

    // Main phase — Step 2: Roll dice
    if (!s.diceRolled) {
      this.handleRollDice();
      this.broadcastState();
      await this.persistState();
      this.scheduleBotTurn();
      return;
    }

    // Main phase — Step 3: Handle robber (needsRobber flag set by dice 7)
    if ((s as any).needsRobber) {
      // Wait for human players to finish forced discards before moving robber.
      // discard_timeout alarm will eventually fire and force-resolve, then we
      // get rescheduled via the standard turn loop.
      if (Object.keys(s.discardRequired).length > 0) {
        return;
      }
      const robberHex = this.botPickRobberHex();
      try {
        this.handleMoveRobber(cp.id, robberHex, null); // handleMoveRobber will auto-steal or set targets
      } catch (e) { console.error(JSON.stringify({ event: 'bot_robber_failed', gameId: this.state?.id, error: String(e) })); }
      // If multiple steal targets, handle that too
      if ((s as any).needsSteal && s.stealTargets.length > 0) {
        this.handleChooseSteal(cp.id, s.stealTargets[0]);
      }
      this.broadcastState();
      await this.persistState();
      this.scheduleBotTurn();
      return;
    }

    // Main phase — Step 4: Play dev cards (road building, year of plenty, monopoly)
    if (!cp.hasPlayedDevCardThisTurn) {
      const played = this.botPlayDevCard(cp);
      if (played) {
        this.broadcastState();
        await this.persistState();
        this.scheduleBotTurn();
        return;
      }
    }

    // Main phase — Step 5: Build (city > settlement > road > buy dev card)
    const built = this.botTryBuild(cp);
    if (built) {
      this.broadcastState();
      await this.persistState();
      this.scheduleBotTurn();
      return;
    }

    // Main phase — Step 6: Maritime trade if stuck
    const traded = this.botTryMaritimeTrade(cp);
    if (traded) {
      this.broadcastState();
      await this.persistState();
      // After trading, try building again
      this.scheduleBotTurn();
      return;
    }

    // Main phase — Step 7: End turn
    this.advanceTurn();
    this.broadcast({ type: 'TURN_ENDED', nextPlayerIndex: s.currentPlayerIndex, turnNumber: s.turnNumber });
    this.broadcastState();
    await this.persistState();
    this.scheduleBotTurn();
  }

  private botPickSettlement(playerId: string): string | null {
    const g = this.graph!;
    const s = this.state!;
    let bestId: string | null = null;
    let bestScore = -1;

    for (const [intId] of g.intersections) {
      if (!canPlaceSettlement(intId, g, s.players, playerId)) continue;
      let score = 0;
      for (const [hexKey, intIds] of g.hexIntersections) {
        if (!intIds.includes(intId)) continue;
        const hex = s.hexes.find(h => `${h.q},${h.r}` === hexKey);
        if (hex?.number) score += (NUMBER_PIPS[hex.number] || 0);
      }
      if (score > bestScore) { bestScore = score; bestId = intId; }
    }
    return bestId;
  }

  private botPickSetupRoad(playerId: string): string | null {
    const g = this.graph!;
    const s = this.state!;
    let bestEdge: string | null = null;
    let bestScore = -1;

    for (const [edgeId, edge] of g.edges) {
      if (s.setupConstraint && !edge.intersections.includes(s.setupConstraint)) continue;
      if (!canPlaceRoad(edgeId, g, s.players, playerId)) continue;
      // Score: pip value of the other endpoint
      const otherId = edge.intersections[0] === s.setupConstraint ? edge.intersections[1] : edge.intersections[0];
      let score = 0;
      for (const [hexKey, intIds] of g.hexIntersections) {
        if (!intIds.includes(otherId)) continue;
        const hex = s.hexes.find(h => `${h.q},${h.r}` === hexKey);
        if (hex?.number) score += (NUMBER_PIPS[hex.number] || 0);
      }
      if (score > bestScore) { bestScore = score; bestEdge = edgeId; }
    }
    return bestEdge;
  }

  private botPickRobberHex(): string {
    const s = this.state!;
    // Pick random non-desert, non-current hex
    const candidates = s.hexes.filter(h =>
      h.type !== 'desert' && h.type !== 'ocean' && `${h.q},${h.r}` !== s.robberHex
    );
    if (candidates.length === 0) return s.robberHex;
    const hex = candidates[Math.floor(Math.random() * candidates.length)];
    return `${hex.q},${hex.r}`;
  }

  private botPickStealTarget(robberHex: string, botId: string): string | null {
    const s = this.state!;
    const g = this.graph!;
    const intIds = g.hexIntersections.get(robberHex) || [];
    // Find opponents with buildings on this hex
    for (const intId of intIds) {
      for (const p of s.players) {
        if (p.id === botId) continue;
        if (p.settlements.includes(intId) || p.cities.includes(intId)) {
          const totalRes = Object.values(p.resources).reduce((a, b) => a + b, 0);
          if (totalRes > 0) return p.id;
        }
      }
    }
    return null;
  }

  private botPlayDevCard(cp: Player): boolean {
    const s = this.state!;
    const g = this.graph!;

    // Road building: if we have 2 valid road spots
    if (cp.devCards.roadBuilding > 0) {
      let roadCount = 0;
      const roadsBuilt: string[] = [];
      for (const [edgeId] of g.edges) {
        if (canPlaceRoad(edgeId, g, s.players, cp.id)) {
          roadsBuilt.push(edgeId);
          roadCount++;
          if (roadCount >= 2) break;
        }
      }
      if (roadCount >= 2) {
        cp.devCards.roadBuilding--;
        cp.hasPlayedDevCardThisTurn = true;
        // Build 2 free roads
        for (const edgeId of roadsBuilt) {
          cp.roads.push(edgeId);
        }
        this.recalcLongestRoad();
        this.broadcast({ type: 'DEV_CARD_PLAYED', playerId: cp.id, cardType: 'roadBuilding' as any });
        return true;
      }
    }

    // Year of plenty: take 2 most needed resources
    if (cp.devCards.yearOfPlenty > 0) {
      cp.devCards.yearOfPlenty--;
      cp.hasPlayedDevCardThisTurn = true;
      // Pick resources we need most (for settlement: lumber + brick)
      const needs: ResourceType[] = [];
      if (cp.resources.grain < 2) needs.push('grain');
      else if (cp.resources.ore < 3) needs.push('ore');
      else needs.push('lumber');
      if (cp.resources.brick < 1) needs.push('brick');
      else if (cp.resources.wool < 1) needs.push('wool');
      else needs.push('grain');
      for (const r of needs) cp.resources[r]++;
      this.broadcast({ type: 'DEV_CARD_PLAYED', playerId: cp.id, cardType: 'yearOfPlenty' as any });
      return true;
    }

    // Monopoly: steal the resource opponents have most of
    if (cp.devCards.monopoly > 0) {
      cp.devCards.monopoly--;
      cp.hasPlayedDevCardThisTurn = true;
      // Find which resource opponents have the most
      const totals: Record<ResourceType, number> = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 };
      for (const p of s.players) {
        if (p.id === cp.id) continue;
        for (const r of ['lumber', 'brick', 'wool', 'grain', 'ore'] as ResourceType[]) {
          totals[r] += p.resources[r];
        }
      }
      let bestRes: ResourceType = 'lumber';
      let bestAmount = 0;
      for (const [r, amount] of Object.entries(totals) as [ResourceType, number][]) {
        if (amount > bestAmount) { bestAmount = amount; bestRes = r; }
      }
      // Steal all of that resource
      let stolen = 0;
      for (const p of s.players) {
        if (p.id === cp.id) continue;
        stolen += p.resources[bestRes];
        p.resources[bestRes] = 0;
      }
      cp.resources[bestRes] += stolen;
      this.broadcast({ type: 'DEV_CARD_PLAYED', playerId: cp.id, cardType: 'monopoly' as any });
      return true;
    }

    return false;
  }

  private botTryMaritimeTrade(cp: Player): boolean {
    const rates = playerTradeRates(cp);
    // Find a resource we have surplus of and one we need
    const needs: ResourceType[] = [];
    if (canAfford(cp.resources, { grain: 2, ore: 3 })) {
      // Can afford city, don't trade
    } else if (cp.resources.grain < 2 || cp.resources.ore < 3) {
      if (cp.resources.grain < 2) needs.push('grain');
      if (cp.resources.ore < 3) needs.push('ore');
    }
    if (needs.length === 0) {
      if (cp.resources.lumber < 1) needs.push('lumber');
      if (cp.resources.brick < 1) needs.push('brick');
      if (cp.resources.wool < 1) needs.push('wool');
    }
    if (needs.length === 0) return false;

    for (const [res, amount] of Object.entries(cp.resources) as [ResourceType, number][]) {
      const rate = rates[res];
      if (amount >= rate + 1 && !needs.includes(res)) {
        const wantRes = needs[0];
        cp.resources[res] -= rate;
        cp.resources[wantRes]++;
        return true;
      }
    }
    return false;
  }

  private botTryBuild(cp: Player): boolean {
    const s = this.state!;
    const g = this.graph!;
    const res = cp.resources;

    // City upgrade
    if (canAfford(res, CITY_COST as any) && cp.settlements.length > 0) {
      try {
        this.handleBuildCity(cp.id, cp.settlements[0]);
        return true;
      } catch (e) { console.error(JSON.stringify({ event: 'bot_build_failed', action: 'city', gameId: s.id, error: String(e) })); }
    }

    // Settlement
    if (canAfford(res, SETTLEMENT_COST as any)) {
      const intId = this.botPickSettlement(cp.id);
      if (intId) {
        try {
          this.handleBuildSettlement(cp.id, intId);
          return true;
        } catch (e) { console.error(JSON.stringify({ event: 'bot_build_failed', action: 'settlement', gameId: s.id, error: String(e) })); }
      }
    }

    // Road
    if (canAfford(res, ROAD_COST as any) && cp.roads.length < 12) {
      for (const [edgeId] of g.edges) {
        if (canPlaceRoad(edgeId, g, s.players, cp.id)) {
          try {
            this.handleBuildRoad(cp.id, edgeId);
            return true;
          } catch (e) { console.error(JSON.stringify({ event: 'bot_build_failed', action: 'road', gameId: s.id, error: String(e) })); }
        }
      }
    }

    // Dev card
    if (canAfford(res, DEV_CARD_COST as any) && s.devCardDeck.length > 0) {
      try {
        this.handleBuyDevCard(cp.id);
        return true;
      } catch (e) { console.error(JSON.stringify({ event: 'bot_build_failed', action: 'dev_card', gameId: s.id, error: String(e) })); }
    }

    return false;
  }

  // ── Action Implementations ────────────────────────────────────────────────

  private handleRollDice() {
    const s = this.state!;
    if (s.phase !== 'main') throw new Error('Cannot roll in setup');
    if (s.diceRolled) throw new Error('Already rolled');

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const total = d1 + d2;
    s.diceValues = [d1, d2];
    s.diceRolled = true;

    const rollerName = s.players[s.currentPlayerIndex].name;
    this.addLog(`🎲 ${rollerName} zar attı: ${d1}+${d2}=${total}`);

    this.broadcast({
      type: 'DICE_ROLLED', values: [d1, d2], total,
      playerId: s.players[s.currentPlayerIndex].id,
    });

    if (total === 7) {
      this.addLog(`☠️ 7 geldi — Robber hareket etmeli`);
      (s as any).needsRobber = true;
      s.stealTargets = [];
      // Cancel all active trades — robber phase blocks trading
      for (const t of s.activeTrades) {
        this.broadcast({ type: 'TRADE_RESOLVED', tradeId: t.id, accepted: false } as any);
      }
      s.activeTrades = [];

      // Forced discard: every player with > DISCARD_THRESHOLD cards owes
      // half (rounded down) to the bank. Robber cannot move until all
      // owed discards are submitted (or auto-resolved).
      const required: Record<string, number> = {};
      for (const p of s.players) {
        const total = ALL_RESOURCES.reduce((a, r) => a + p.resources[r], 0);
        if (total > DISCARD_THRESHOLD) required[p.id] = Math.floor(total / 2);
      }
      s.discardRequired = required;
      if (Object.keys(required).length > 0) {
        s.discardDeadline = Date.now() + DISCARD_TIMEOUT_MS;
        this.addLog(`⚠️ ${Object.keys(required).length} oyuncu kart bağışlamalı (${DISCARD_TIMEOUT_MS / 1000}s)`);
        // Bots auto-discard immediately
        for (const pid of Object.keys(required)) {
          if (this.isBot(pid)) this.autoDiscardForPlayer(pid);
        }
      } else {
        s.discardDeadline = null;
      }
      return;
    }

    // Distribute resources
    s.players = distributeResources(total, s.hexes, this.graph!, s.players, s.robberHex);

    // Build production map for broadcast
    const production: Record<string, Partial<Record<ResourceType, number>>> = {};
    for (const p of s.players) {
      // Compare with previous state would be ideal, but we broadcast full state anyway
    }
    this.broadcast({ type: 'RESOURCES_PRODUCED', production });
  }

  private handleBuildSettlement(playerId: string, intId: string) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId)!;

    if (!canPlaceSettlement(intId, this.graph!, s.players, playerId)) {
      throw new Error('Invalid settlement placement');
    }

    if (s.phase === 'main') {
      if (!canAfford(player.resources, SETTLEMENT_COST as any)) throw new Error('Cannot afford');
      player.resources = deductCost(player.resources, SETTLEMENT_COST as any);
    }

    player.settlements.push(intId);

    if (s.phase === 'setup1' || s.phase === 'setup2') {
      s.setupConstraint = intId;
      // In setup, after settlement → must place road
    }

    this.recalcLongestRoad();
    this.checkVictory();

    const pName = this.state!.players.find(p => p.id === playerId)?.name;
    this.addLog(`🏠 ${pName} settlement yerleştirdi`);
    this.broadcast({
      type: 'BUILDING_PLACED', playerId, buildingType: 'settlement', locationId: intId,
    });
  }

  private handleBuildCity(playerId: string, intId: string) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId)!;

    if (!canUpgradeCity(intId, s.players, playerId)) throw new Error('Invalid city upgrade');
    if (!canAfford(player.resources, CITY_COST as any)) throw new Error('Cannot afford');

    player.resources = deductCost(player.resources, CITY_COST as any);
    player.settlements = player.settlements.filter(id => id !== intId);
    player.cities.push(intId);

    this.checkVictory();

    const cName = this.state!.players.find(p => p.id === playerId)?.name;
    this.addLog(`🏰 ${cName} city yükseltti`);
    this.broadcast({
      type: 'BUILDING_PLACED', playerId, buildingType: 'city', locationId: intId,
    });
  }

  private handleBuildRoad(playerId: string, edgeId: string) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId)!;

    if (s.setupConstraint) {
      const edge = this.graph!.edges.get(edgeId);
      if (!edge || !edge.intersections.includes(s.setupConstraint)) {
        throw new Error('Road must connect to last settlement');
      }
    }

    if (!canPlaceRoad(edgeId, this.graph!, s.players, playerId)) {
      throw new Error('Invalid road placement');
    }

    if (s.phase === 'main') {
      if (!canAfford(player.resources, ROAD_COST as any)) throw new Error('Cannot afford');
      player.resources = deductCost(player.resources, ROAD_COST as any);
    }

    player.roads.push(edgeId);
    this.recalcLongestRoad();

    if (s.phase === 'setup1' || s.phase === 'setup2') {
      this.advanceSetupTurn();
    }

    this.checkVictory();

    const rName = this.state!.players.find(p => p.id === playerId)?.name;
    this.addLog(`🛤️ ${rName} road yerleştirdi`);
    this.broadcast({
      type: 'BUILDING_PLACED', playerId, buildingType: 'road', locationId: edgeId,
    });
  }

  private handleBuyDevCard(playerId: string) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId)!;

    if (s.phase !== 'main' || !s.diceRolled) throw new Error('Cannot buy now');
    if (s.devCardDeck.length === 0) throw new Error('No cards left');
    if (!canAfford(player.resources, DEV_CARD_COST as any)) throw new Error('Cannot afford');

    player.resources = deductCost(player.resources, DEV_CARD_COST as any);
    const card = s.devCardDeck.pop()!;
    player.devCards[card]++;

    this.checkVictory();
    this.sendPrivateState(playerId);
  }

  private handlePlayDevCard(playerId: string, cardType: string, payload: any) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId)!;

    if (player.hasPlayedDevCardThisTurn) throw new Error('Already played a dev card this turn');
    if (player.devCards[cardType as keyof typeof player.devCards] <= 0) throw new Error('No such card');

    player.devCards[cardType as keyof typeof player.devCards]--;
    player.hasPlayedDevCardThisTurn = true;

    switch (cardType) {
      case 'knight':
        player.knightsPlayed++;
        this.recalcLargestArmy();
        // Robber move handled by subsequent MOVE_ROBBER message
        break;
      case 'roadBuilding':
        // Player gets 2 free roads — handled by client sending 2 BUILD_ROAD messages
        // (with cost bypass flag, or we track "free roads remaining")
        break;
      case 'yearOfPlenty':
        if (payload?.resources) {
          const [r1, r2] = payload.resources as [ResourceType, ResourceType];
          player.resources[r1]++;
          player.resources[r2]++;
        }
        break;
      case 'monopoly':
        if (payload?.resource) {
          const res = payload.resource as ResourceType;
          let total = 0;
          for (const p of s.players) {
            if (p.id === playerId) continue;
            total += p.resources[res];
            p.resources[res] = 0;
          }
          player.resources[res] += total;
        }
        break;
    }

    this.checkVictory();
    this.broadcast({ type: 'DEV_CARD_PLAYED', playerId, cardType: cardType as any });
  }

  private tradeContext(playerId: string): TradeContext {
    const s = this.state!;
    const cp = s.players[s.currentPlayerIndex];
    return {
      isCurrentPlayerTurn: cp.id === playerId,
      diceRolled: s.diceRolled,
      needsRobber: !!(s as any).needsRobber,
      needsSteal: !!(s as any).needsSteal,
      needsDiscard: Object.keys(s.discardRequired ?? {}).length > 0,
      isSetup: s.phase !== 'main',
    };
  }

  private handleOfferTrade(playerId: string, offer: any, want: any, targetPlayer?: string) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId);
    if (!player) throw new Error('INVALID_TRADE');

    console.log(JSON.stringify({ event: 'offer_trade_attempt', playerId, offer, want, targetPlayer }));
    const err = validateOfferTrade(player, offer, want, targetPlayer, s.players, s.activeTrades, this.tradeContext(playerId));
    if (err) {
      console.log(JSON.stringify({ event: 'offer_trade_rejected', playerId, error: err }));
      throw new Error(err);
    }

    const now = Date.now();
    const newTrade = {
      id: `trade_${now}_${Math.random().toString(36).slice(2, 6)}`,
      fromPlayerId: playerId,
      toPlayerId: targetPlayer,
      offer,
      want,
      acceptedBy: [],
      createdAt: now,
      expiresAt: now + TRADE_TTL_MS,
    };
    s.activeTrades = [...s.activeTrades, newTrade];

    this.broadcast({
      type: 'TRADE_OFFERED',
      tradeId: newTrade.id,
      from: playerId,
      offer,
      want,
      targetPlayer,
    } as any);

    // Let bot recipients evaluate and respond inline. Decision is deterministic.
    this.processBotTradeResponses(newTrade.id);
  }

  /**
   * Synchronous bot trade evaluation for a specific trade. Each bot recipient
   * (open offer or targeted) decides to pre-accept or silently decline.
   */
  private processBotTradeResponses(tradeId: string) {
    const s = this.state!;
    const trade = s.activeTrades.find(t => t.id === tradeId);
    if (!trade) return;

    const recipients = s.players.filter(p => {
      if (p.id === trade.fromPlayerId) return false;
      if (trade.toPlayerId !== undefined && trade.toPlayerId !== p.id) return false;
      return true;
    });

    for (const recipient of recipients) {
      if (!this.isBot(recipient.id)) continue;
      if (trade.acceptedBy.includes(recipient.id)) continue;

      const accept = shouldBotAcceptTrade(s, recipient.id, trade.offer, trade.want);
      if (accept) {
        trade.acceptedBy = [...trade.acceptedBy, recipient.id];
        this.addLog(`🤝 ${recipient.name} teklifi kabul etmek istiyor`);
      } else {
        this.addLog(`🚫 ${recipient.name} teklifi reddetti`);
      }
    }
  }

  private handleAcceptTrade(playerId: string, tradeId: string, withPlayer?: string) {
    const s = this.state!;
    const accepter = s.players.find(p => p.id === playerId);
    if (!accepter) throw new Error('INVALID_TRADE');
    const trade = s.activeTrades.find(t => t.id === tradeId);
    if (!trade) throw new Error('NO_ACTIVE_TRADE');

    // Offerer finalizes
    if (playerId === trade.fromPlayerId) {
      if (!withPlayer) throw new Error('NO_PRE_ACCEPTOR');
      const partner = s.players.find(p => p.id === withPlayer) ?? null;
      const err = validateFinalizeTrade(accepter, partner, trade, tradeId, withPlayer);
      if (err) throw new Error(err);

      for (const [res, amount] of Object.entries(trade.offer)) {
        accepter.resources[res as ResourceType] -= amount as number;
        partner!.resources[res as ResourceType] += amount as number;
      }
      for (const [res, amount] of Object.entries(trade.want)) {
        partner!.resources[res as ResourceType] -= amount as number;
        accepter.resources[res as ResourceType] += amount as number;
      }

      s.activeTrades = s.activeTrades.filter(t => t.id !== tradeId);
      this.broadcast({ type: 'TRADE_RESOLVED', tradeId, accepted: true, finalizedWith: withPlayer } as any);
      return;
    }

    // Recipient pre-accept
    const err = validatePreAcceptTrade(accepter, trade, tradeId);
    if (err) throw new Error(err);
    trade.acceptedBy = [...trade.acceptedBy, playerId];
    // Activity extends the trade's life so it doesn't expire mid-conversation
    trade.expiresAt = Date.now() + TRADE_TTL_MS;
  }

  private handleRejectTrade(playerId: string, tradeId: string) {
    const s = this.state!;
    const trade = s.activeTrades.find(t => t.id === tradeId);
    if (!trade) return;

    // Offerer cancels the trade entirely
    if (playerId === trade.fromPlayerId) {
      s.activeTrades = s.activeTrades.filter(t => t.id !== tradeId);
      this.broadcast({ type: 'TRADE_RESOLVED', tradeId, accepted: false } as any);
      return;
    }

    // Recipient: must be valid candidate (open offer or targeted at them)
    const isCandidate = trade.toPlayerId === undefined || trade.toPlayerId === playerId;
    if (!isCandidate) return;

    // If they had pre-accepted, withdraw; otherwise NOOP (recipient just dismisses UI)
    if (trade.acceptedBy.includes(playerId)) {
      trade.acceptedBy = trade.acceptedBy.filter(id => id !== playerId);
      trade.expiresAt = Date.now() + TRADE_TTL_MS;
    }
  }

  /** Backwards-compat: convert old `activeTrade: TradeOffer | null` schema
   *  into the new `activeTrades: TradeOffer[]` schema, and ensure required
   *  fields exist on any trades restored from disk. */
  private migrateTradeState() {
    const s: any = this.state;
    if (!s) return;
    if (!Array.isArray(s.activeTrades)) {
      const old = s.activeTrade;
      s.activeTrades = old ? [old] : [];
      delete s.activeTrade;
    }
    const now = Date.now();
    for (const t of s.activeTrades as any[]) {
      if (!Array.isArray(t.acceptedBy)) t.acceptedBy = [];
      if (typeof t.createdAt !== 'number') t.createdAt = now;
      if (typeof t.expiresAt !== 'number') t.expiresAt = now + TRADE_TTL_MS;
    }
    if (typeof s.discardRequired !== 'object' || s.discardRequired === null) s.discardRequired = {};
    if (typeof s.discardDeadline !== 'number' && s.discardDeadline !== null) s.discardDeadline = null;
  }

  /** Drop trades whose expiresAt has passed. Called by trade_timeout alarm. */
  private expireStaleTrades() {
    const s = this.state;
    if (!s) return;
    const now = Date.now();
    const remaining: typeof s.activeTrades = [];
    for (const t of s.activeTrades) {
      if (t.expiresAt <= now) {
        this.broadcast({ type: 'TRADE_RESOLVED', tradeId: t.id, accepted: false } as any);
        const fromPlayer = s.players.find(p => p.id === t.fromPlayerId);
        if (fromPlayer) this.addLog(`⏱ ${fromPlayer.name}'in trade teklifi süresi doldu`);
      } else {
        remaining.push(t);
      }
    }
    s.activeTrades = remaining;
  }

  private handleMaritimeTrade(playerId: string, give: { resource: ResourceType; amount: number }, want: ResourceType) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId);
    if (!player) throw new Error('INVALID_TRADE');

    const err = validateMaritimeTrade(player, give, want, this.tradeContext(playerId));
    if (err) throw new Error(err);

    player.resources[give.resource] -= give.amount;
    player.resources[want]++;
  }

  private handleMoveRobber(playerId: string, hexId: string, stealFrom: string | null) {
    const s = this.state!;
    // Block robber move until all forced discards are settled.
    if (Object.keys(s.discardRequired).length > 0) throw new Error('DISCARD_PENDING');
    if (hexId === s.robberHex) throw new Error('Must move to different hex');

    s.robberHex = hexId;
    (s as any).needsRobber = false;

    // Find opponents with buildings on the new robber hex
    const g = this.graph!;
    const intIds = g.hexIntersections.get(hexId) || [];
    const opponentIds = new Set<string>();
    for (const intId of intIds) {
      for (const p of s.players) {
        if (p.id === playerId) continue;
        if (p.settlements.includes(intId) || p.cities.includes(intId)) {
          const totalRes = Object.values(p.resources).reduce((a, b) => a + b, 0);
          if (totalRes > 0) opponentIds.add(p.id);
        }
      }
    }

    const targets = [...opponentIds];

    // If stealFrom is specified directly, use it
    if (stealFrom && opponentIds.has(stealFrom)) {
      this.executeSteal(playerId, stealFrom);
      this.broadcast({ type: 'ROBBER_MOVED', hexId, stealFrom, stolenResource: undefined });
      return;
    }

    // Auto-steal if exactly 1 target
    if (targets.length === 1) {
      this.executeSteal(playerId, targets[0]);
      this.broadcast({ type: 'ROBBER_MOVED', hexId, stealFrom: targets[0], stolenResource: undefined });
      return;
    }

    // Multiple targets — client needs to choose (set stealTargets)
    if (targets.length > 1) {
      s.stealTargets = targets;
      (s as any).needsSteal = true;
      this.broadcast({ type: 'ROBBER_MOVED', hexId, stealFrom: null });
      return;
    }

    // No targets
    this.broadcast({ type: 'ROBBER_MOVED', hexId, stealFrom: null });
  }

  private executeSteal(thiefId: string, victimId: string) {
    const s = this.state!;
    const victim = s.players.find(p => p.id === victimId);
    const thief = s.players.find(p => p.id === thiefId);
    if (victim && thief) {
      const available = (Object.keys(victim.resources) as ResourceType[]).filter(r => victim.resources[r] > 0);
      if (available.length > 0) {
        const stolen = available[Math.floor(Math.random() * available.length)];
        victim.resources[stolen]--;
        thief.resources[stolen]++;
      }
    }
  }

  private handleChooseSteal(playerId: string, targetId: string) {
    const s = this.state!;
    if (!s.stealTargets.includes(targetId)) throw new Error('Invalid steal target');
    this.executeSteal(playerId, targetId);
    s.stealTargets = [];
    (s as any).needsSteal = false;
  }

  private handleDiscard(playerId: string, resources: any) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId);
    if (!player) return;
    const required = s.discardRequired[playerId];
    if (!required) throw new Error('NO_DISCARD_REQUIRED');

    // Validate amounts: positive integers, total must equal required, and
    // player must own at least that much of each resource.
    let total = 0;
    for (const r of ALL_RESOURCES) {
      const n = (resources?.[r] ?? 0) as number;
      if (!Number.isInteger(n) || n < 0) throw new Error('INVALID_DISCARD');
      if (n > player.resources[r]) throw new Error('INSUFFICIENT_RESOURCES');
      total += n;
    }
    if (total !== required) throw new Error('INVALID_DISCARD_COUNT');

    for (const r of ALL_RESOURCES) {
      const n = (resources?.[r] ?? 0) as number;
      if (n > 0) player.resources[r] -= n;
    }
    delete s.discardRequired[playerId];
    this.addLog(`🃏 ${player.name} ${required} kart bağışladı`);

    // All discards complete → clear deadline; robber phase remains until current player moves it
    if (Object.keys(s.discardRequired).length === 0) {
      s.discardDeadline = null;
      // If current player is a bot stuck waiting on robber, kick its turn now.
      const cp = s.players[s.currentPlayerIndex];
      if (cp && this.isBot(cp.id) && (s as any).needsRobber) this.scheduleBotTurn();
    }
  }

  /** Pick `n` random cards weighted by current holdings (no excess of one). */
  private autoDiscardForPlayer(playerId: string) {
    const s = this.state!;
    const player = s.players.find(p => p.id === playerId);
    if (!player) return;
    const required = s.discardRequired[playerId] ?? 0;
    if (required <= 0) return;

    const picked: Record<ResourceType, number> = { lumber: 0, brick: 0, wool: 0, grain: 0, ore: 0 };
    const pool: ResourceType[] = [];
    for (const r of ALL_RESOURCES) for (let i = 0; i < player.resources[r]; i++) pool.push(r);
    for (let i = 0; i < required && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      picked[pool[idx]]++;
      pool.splice(idx, 1);
    }
    for (const r of ALL_RESOURCES) {
      if (picked[r] > 0) player.resources[r] -= picked[r];
    }
    delete s.discardRequired[playerId];
    this.addLog(`🃏 ${player.name} ${required} kart bağışladı (otomatik)`);
    if (Object.keys(s.discardRequired).length === 0) s.discardDeadline = null;
  }

  /** Called by discard_timeout alarm — forces remaining players to discard. */
  private forceAllPendingDiscards() {
    const s = this.state;
    if (!s) return;
    const ids = Object.keys(s.discardRequired);
    for (const pid of ids) this.autoDiscardForPlayer(pid);
  }

  private handleEndTurn(playerId: string) {
    const s = this.state!;
    if (s.phase !== 'main') throw new Error('Cannot end turn in setup');
    this.turnDeadline = null;
    this.advanceTurn();
    this.broadcast({
      type: 'TURN_ENDED',
      nextPlayerIndex: s.currentPlayerIndex,
      turnNumber: s.turnNumber,
    });
    // Timer for next player will be scheduled in handleAction → scheduleBotTurn/scheduleTurnTimer
  }

  // ── Setup Phase Logic ─────────────────────────────────────────────────────

  private advanceSetupTurn() {
    const s = this.state!;
    s.setupConstraint = null;

    if (s.phase === 'setup1') {
      if (s.currentPlayerIndex === s.players.length - 1) {
        s.phase = 'setup2';
      } else {
        s.currentPlayerIndex++;
      }
    } else if (s.phase === 'setup2') {
      if (s.currentPlayerIndex === 0) {
        s.phase = 'main';
        s.currentPlayerIndex = 0;
        s.turnNumber = 1;
      } else {
        s.currentPlayerIndex--;
      }
    }
  }

  private advanceTurn() {
    const s = this.state!;
    s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
    s.turnNumber++;
    this.addLog(`▸ Sıra ${s.players[s.currentPlayerIndex].name}'de`);
    s.diceRolled = false;
    s.diceValues = null;
    // Cancel all in-flight trades on turn change
    for (const t of s.activeTrades) {
      this.broadcast({ type: 'TRADE_RESOLVED', tradeId: t.id, accepted: false } as any);
    }
    s.activeTrades = [];
    (s as any)._robberHandled = false;
    (s as any).needsRobber = false;
    (s as any).needsSteal = false;
    for (const p of s.players) {
      p.hasPlayedDevCardThisTurn = false;
    }
  }

  // ── Calculations ──────────────────────────────────────────────────────────

  private recalcLongestRoad() {
    const s = this.state!;
    let bestId: string | null = null;
    let bestLen = 4; // minimum 5 to claim

    for (const p of s.players) {
      const len = computeLongestRoad(p.id, this.graph!, s.players);
      if (len > bestLen) { bestLen = len; bestId = p.id; }
    }

    // Only update if someone beats current holder or holder drops below 5
    if (s.longestRoadHolder) {
      const holderLen = computeLongestRoad(s.longestRoadHolder, this.graph!, s.players);
      if (holderLen >= 5 && (!bestId || bestLen <= holderLen)) return;
    }
    s.longestRoadHolder = bestId;
  }

  private recalcLargestArmy() {
    const s = this.state!;
    let bestId: string | null = null;
    let bestCount = 2; // minimum 3 to claim

    for (const p of s.players) {
      if (p.knightsPlayed > bestCount) {
        bestCount = p.knightsPlayed;
        bestId = p.id;
      }
    }

    if (s.largestArmyHolder) {
      const holder = s.players.find(p => p.id === s.largestArmyHolder);
      if (holder && holder.knightsPlayed >= 3 && (!bestId || bestCount <= holder.knightsPlayed)) return;
    }
    s.largestArmyHolder = bestId;
  }

  private checkVictory() {
    const s = this.state!;
    const winnerId = checkWinner(s);
    if (!winnerId) return;

    s.winner = winnerId;
    s.phase = 'ended';

    const finalScores: Record<string, number> = {};
    for (const p of s.players) {
      finalScores[p.id] = calculateVP(p, s);
    }

    // Persist `phase='ended'` to Neon synchronously so /user/active-game won't
    // surface this game in the "Devam Eden Oyun" banner after the player exits.
    // DO storage is updated via the handler's normal persistState() at end of
    // the action, but that only schedules a waitUntil for Neon — too late.
    this.ctx.waitUntil((async () => {
      try {
        const db = createDb(this.env.NEON_DATABASE_URL);
        await db.update(games).set({
          phase: 'ended',
          winnerUserId: winnerId,
          finishedAt: new Date(),
          turnCount: s.turnNumber,
        }).where(eq(games.id, s.id));
      } catch (e) {
        console.error(JSON.stringify({ event: 'mark_game_ended_failed', gameId: s.id, error: String(e) }));
      }
    })());

    // Rank players by VP (winner first, then descending VP, tie-broken arbitrarily)
    const ranked = [...s.players].sort((a, b) => {
      if (a.id === winnerId) return -1;
      if (b.id === winnerId) return 1;
      return finalScores[b.id] - finalScores[a.id];
    });
    const positions: Record<string, number> = {};
    ranked.forEach((p, idx) => { positions[p.id] = idx + 1; });

    // Async post-game persistence (ELO, XP, level, stats). Don't block broadcast.
    this.ctx.waitUntil(this.finalizeGameRecords(winnerId, finalScores, positions));

    // Immediate broadcast: GAME_OVER now includes `results` array for the UI
    const results = s.players.map(p => ({
      playerId: p.id,
      name: p.name,
      color: p.color,
      vp: finalScores[p.id],
      position: positions[p.id],
      // ELO / level / xp deltas will come in a follow-up broadcast once DB resolves.
      // Client should render preliminary with isPending: true.
    }));
    this.broadcast({ type: 'GAME_OVER', winnerId, finalScores, results } as any);
  }

  /**
   * Compute ELO/XP/level deltas against pre-game user stats, persist to DB,
   * and broadcast the settled results so the victory UI can animate them in.
   * Runs in waitUntil — game is already over from the client's perspective.
   */
  private async finalizeGameRecords(
    winnerId: string,
    finalScores: Record<string, number>,
    positions: Record<string, number>,
  ) {
    const s = this.state;
    if (!s) return;
    try {
      const db = createDb(this.env.NEON_DATABASE_URL);
      // Read pre-game ELO, level, xp, ranked games for each real (non-bot) player
      const realPlayers = s.players.filter(p => !this.isBot(p.id));
      const ids = realPlayers.map(p => p.id);
      if (ids.length === 0) {
        // Nothing to persist — still emit settled results for the UI
        this.broadcastSettledResults(winnerId, finalScores, positions, {});
        return;
      }

      // Load current users + stats
      const userRows = await db.select().from(users).where(inArray(users.id, ids));
      const statsRows = await db.select().from(userStats).where(inArray(userStats.userId, ids));
      const userById = new Map(userRows.map(u => [u.id, u]));
      const statsById = new Map(statsRows.map(st => [st.userId, st]));

      const isRanked = s.mode === 'ranked';
      const input: PlayerGameResult[] = realPlayers.map(p => {
        const u = userById.get(p.id);
        const st = statsById.get(p.id);
        return {
          playerId: p.id,
          eloBefore: u?.eloRating ?? 1000,
          vp: finalScores[p.id],
          position: positions[p.id],
          gamesPlayed: st?.rankedGamesPlayed ?? 0,
        };
      });

      const eloChanges = isRanked ? computeEloChanges(input) : {};
      const settled: Record<string, {
        eloBefore: number; eloAfter: number; eloChange: number;
        xpEarned: number; levelBefore: number; levelAfter: number;
        gamesPlayedBefore: number;
      }> = {};

      for (const inp of input) {
        const u = userById.get(inp.playerId);
        const st = statsById.get(inp.playerId);
        const eloChange = eloChanges[inp.playerId] ?? 0;
        const eloAfter = inp.eloBefore + eloChange;
        const xpEarned = xpForResult(inp.position);
        const xpBefore = u?.xp ?? 0;
        const levelBefore = u?.level ?? 1;
        const xpAfter = xpBefore + xpEarned;
        const levelAfter = levelForXp(xpAfter);

        settled[inp.playerId] = {
          eloBefore: inp.eloBefore,
          eloAfter,
          eloChange,
          xpEarned,
          levelBefore,
          levelAfter,
          gamesPlayedBefore: inp.gamesPlayed,
        };

        // Persist user row
        await db.update(users)
          .set({ eloRating: eloAfter, xp: xpAfter, level: levelAfter, updatedAt: new Date() })
          .where(eq(users.id, inp.playerId));

        // Persist stats: bump gamesPlayed/Won, ranked counters, vp totals, etc.
        const isWinner = inp.playerId === winnerId;
        if (st) {
          await db.update(userStats).set({
            gamesPlayed: st.gamesPlayed + 1,
            gamesWon: st.gamesWon + (isWinner ? 1 : 0),
            rankedGamesPlayed: st.rankedGamesPlayed + (isRanked ? 1 : 0),
            rankedGamesWon: st.rankedGamesWon + (isRanked && isWinner ? 1 : 0),
            totalVp: st.totalVp + inp.vp,
            updatedAt: new Date(),
          }).where(eq(userStats.userId, inp.playerId));
        } else {
          await db.insert(userStats).values({
            userId: inp.playerId,
            gamesPlayed: 1,
            gamesWon: isWinner ? 1 : 0,
            rankedGamesPlayed: isRanked ? 1 : 0,
            rankedGamesWon: isRanked && isWinner ? 1 : 0,
            totalVp: inp.vp,
          });
        }

        // Persist gamePlayers vpFinal etc.
        await db.update(gamePlayers).set({
          vpFinal: inp.vp,
          settlements: s.players.find(pl => pl.id === inp.playerId)?.settlements.length ?? 0,
          cities: s.players.find(pl => pl.id === inp.playerId)?.cities.length ?? 0,
          roads: s.players.find(pl => pl.id === inp.playerId)?.roads.length ?? 0,
          longestRoad: s.longestRoadHolder === inp.playerId,
          largestArmy: s.largestArmyHolder === inp.playerId,
        }).where(and(eq(gamePlayers.gameId, s.id), eq(gamePlayers.userId, inp.playerId)));
      }

      this.broadcastSettledResults(winnerId, finalScores, positions, settled);
    } catch (e) {
      console.error(JSON.stringify({ event: 'finalize_game_failed', gameId: s.id, error: String(e) }));
      // Emit a "no deltas" results payload so the client still gets
      // authoritative VP/positions instead of falling back to local compute.
      try { this.broadcastSettledResults(winnerId, finalScores, positions, {}); } catch {}
    }
  }

  private broadcastSettledResults(
    winnerId: string,
    finalScores: Record<string, number>,
    positions: Record<string, number>,
    settled: Record<string, any>,
  ) {
    const s = this.state;
    if (!s) return;
    const results = s.players.map(p => {
      const st = settled[p.id];
      return {
        playerId: p.id,
        name: p.name,
        color: p.color,
        vp: finalScores[p.id],
        position: positions[p.id],
        isBot: this.isBot(p.id),
        eloBefore: st?.eloBefore ?? null,
        eloAfter: st?.eloAfter ?? null,
        eloChange: st?.eloChange ?? 0,
        xpEarned: st?.xpEarned ?? 0,
        levelBefore: st?.levelBefore ?? null,
        levelAfter: st?.levelAfter ?? null,
      };
    });
    this.broadcast({ type: 'GAME_RESULTS', winnerId, results } as any);
  }

  // ── State Management ──────────────────────────────────────────────────────

  private async loadState() {
    // Load timer and bot-replaced settings
    const storedTimer = await this.ctx.storage.get<number>('turnTimerMs');
    if (storedTimer !== undefined) this.turnTimerMs = storedTimer;
    const storedBotReplaced = await this.ctx.storage.get<Record<string, string>>('botReplacedPlayers');
    if (storedBotReplaced) this.botReplacedPlayers = new Map(Object.entries(storedBotReplaced));

    // Try DO storage first (fast)
    const stored = await this.ctx.storage.get<GameState>('state');
    if (stored) {
      this.state = stored;
      this.hexes = stored.hexes;
      this.graph = buildBoardGraph(stored.hexes);
      this.migrateTradeState();
      return;
    }

    // Fallback: load from Neon (use stored gameId or try DO name)
    try {
      const db = createDb(this.env.NEON_DATABASE_URL);
      const storedGameId = await this.ctx.storage.get<string>('gameId');
      if (!storedGameId) return; // no game ID stored, can't load from Neon
      const result = await db.select().from(games).where(eq(games.id, storedGameId)).limit(1);
      if (result.length > 0 && result[0].state) {
        this.state = result[0].state as any;
        this.hexes = this.state!.hexes;
        this.graph = buildBoardGraph(this.hexes);
        this.migrateTradeState();
        // Cache in DO storage
        await this.ctx.storage.put('state', this.state);
      }
    } catch (e) {
      console.error('Failed to load state from Neon:', e);
    }
  }

  private async persistState() {
    if (!this.state) return;

    // Fast: DO storage
    await this.ctx.storage.put('state', this.state);

    // Async: Neon (non-blocking)
    this.ctx.waitUntil(this.persistToNeon());
  }

  private async persistToNeon() {
    try {
      const db = createDb(this.env.NEON_DATABASE_URL);
      await db.update(games).set({
        state: this.state as any,
        phase: this.state!.phase,
        turnCount: this.state!.turnNumber,
        winnerUserId: this.state!.winner,
        finishedAt: this.state!.phase === 'ended' ? new Date() : null,
      }).where(eq(games.id, this.state!.id));
    } catch (e) {
      console.error('Failed to persist to Neon:', e);
    }
  }

  private async logAction(playerId: string, actionType: string, payload: any) {
    this.ctx.waitUntil((async () => {
      try {
        const db = createDb(this.env.NEON_DATABASE_URL);
        await db.insert(gameActions).values({
          gameId: this.state!.id,
          userId: playerId,
          actionType,
          payload,
          turnNumber: this.state!.turnNumber,
        });
      } catch (e) { console.error(JSON.stringify({ event: 'log_action_failed', gameId: this.state?.id, actionType, error: String(e) })); }
    })());
  }

  // ── Broadcasting ──────────────────────────────────────────────────────────

  private publicState(): any {
    const s = this.state!;
    return {
      ...s,
      devCardDeck: undefined,
      _robberHandled: undefined,
      needsRobber: (s as any).needsRobber || false,
      needsSteal: (s as any).needsSteal || false,
      devCardDeckSize: s.devCardDeck.length,
      turnDeadline: this.turnDeadline,
      turnTimerMs: this.turnTimerMs,
      serverTime: Date.now(),
      botReplacedPlayers: Object.fromEntries(this.botReplacedPlayers),
      players: s.players.map(p => ({
        ...p,
        devCards: undefined,
        devCardCount: Object.values(p.devCards).reduce((a, b) => a + b, 0),
        tradeRates: playerTradeRates(p),
      })),
    };
  }

  private sendPrivateState(playerId: string) {
    const player = this.state?.players.find(p => p.id === playerId);
    if (!player) return;
    this.sendToPlayer(playerId, {
      type: 'PRIVATE_STATE',
      resources: player.resources,
      devCards: player.devCards,
    } as any);
  }

  private sendToPlayer(playerId: string, message: any) {
    const ws = this.connections.get(playerId);
    if (ws) {
      try { ws.send(JSON.stringify(message)); } catch { /* closed */ }
    }
  }

  private broadcastState() {
    if (!this.state) return;
    this.broadcast({ type: 'GAME_STATE', state: this.publicState() } as any);
    // Send private state to each player
    for (const p of this.state.players) {
      this.sendPrivateState(p.id);
    }
  }

  private broadcast(message: any) {
    const data = JSON.stringify(message);
    for (const ws of this.connections.values()) {
      try { ws.send(data); } catch { /* closed */ }
    }
  }

  private getPlayerId(ws: WebSocket): string | null {
    // First check in-memory connections
    for (const [id, conn] of this.connections) {
      if (conn === ws) return id;
    }
    // Fallback: use hibernation API tags (survives DO eviction)
    try {
      const tags = this.ctx.getTags(ws);
      if (tags.length > 0) return tags[0];
    } catch {}
    return null;
  }
}

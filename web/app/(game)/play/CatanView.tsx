"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import "../../../game-engine/catan.scss";
import GameHUD from "../../../game-engine/ui/GameHUD";
import { useGameState } from "../../../game-engine/ui/useGameState";
import { SessionReplacedDialog } from "../../../game-engine/ui/SessionReplacedDialog";
import { ReplacedByBotDialog } from "../../../game-engine/ui/ReplacedByBotDialog";

interface CatanViewProps {
  gameId?: string | null;
}

export default function CatanView({ gameId }: CatanViewProps) {
  const [gameState, setGameState] = useState<any>(null);
  const [gameInstance, setGameInstance] = useState<any>(null);
  const [syncing, setSyncing] = useState(!!gameId);
  const [engineReady, setEngineReady] = useState(false); // Three.js board loaded
  const [sessionReplaced, setSessionReplaced] = useState(false);
  const [replacedByBot, setReplacedByBot] = useState(false);
  const [accessChecked, setAccessChecked] = useState(!gameId); // skip check when no gameId (local mode)
  const initRef = useRef(false);
  const catanModRef = useRef<any>(null);

  // Verify access BEFORE initializing the engine / opening the WS. If the
  // game doesn't exist, is already over, or the user isn't a participant,
  // bounce them to home instead of stranding them on a "connecting" spinner.
  useEffect(() => {
    if (!gameId || accessChecked) return;
    let cancelled = false;
    (async () => {
      try {
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
        const res = await fetch(`${API}/game/${gameId}/access`, { credentials: 'include' });
        if (cancelled) return;
        if (!res.ok) {
          // 404/410/403 → we shouldn't be here. Bail to home.
          window.location.href = '/';
          return;
        }
        setAccessChecked(true);
      } catch {
        if (!cancelled) window.location.href = '/';
      }
    })();
    return () => { cancelled = true; };
  }, [gameId, accessChecked]);

  // Listen for session replaced / bot replacement events
  useEffect(() => {
    (window as any).__catanSessionReplacedCallback = () => setSessionReplaced(true);
    (window as any).__catanReplacedByBotCallback = () => setReplacedByBot(true);
    return () => {
      (window as any).__catanSessionReplacedCallback = null;
      (window as any).__catanReplacedByBotCallback = null;
    };
  }, []);

  const handleReconnect = useCallback(() => {
    setSessionReplaced(false);
    (window as any).__catanSessionReplaced = false;
    // Re-import and reconnect
    import("../../../game-engine/multiplayer").then((mod) => {
      // The multiplayer ref is on window — trigger reconnect via catan module
      import("../../../game-engine/catan").then((catanMod) => {
        const mp = catanMod.getMultiplayerRef?.();
        const gs = catanMod.getGameState?.();
        if (mp && gameId) {
          fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787') + '/user/me', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
              if (data?.user?.id) {
                if (gs) (gs as any).myPlayerId = data.user.id;
                mp.connect(gameId, data.user.id);
              }
            });
        }
      });
    });
  }, [gameId]);

  const handleClose = useCallback(() => {
    window.close();
    // If window.close() doesn't work (not opened by script), navigate away
    window.location.href = '/';
  }, []);

  // Init engine ONCE — no dependency on user (prevents re-init on focus refetch).
  // Gated on accessChecked so unauthorized users are bounced by the check above
  // before we ever open a socket.
  useEffect(() => {
    if (!accessChecked) return;
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    requestAnimationFrame(() => {
      if (cancelled) return;
      import("../../../game-engine/catan").then((mod) => {
        if (cancelled) { mod.destroyCatan(); return; }
        catanModRef.current = mod;
        mod.default();
        pollTimer = setInterval(() => {
          if (cancelled) { clearInterval(pollTimer!); return; }
          const gs = mod.getGameState();
          const gi = mod.getGameRef();
          if (gs) {
            setGameState(gs);
            setGameInstance(gi);
            setEngineReady(true);
            clearInterval(pollTimer!);
            pollTimer = null;

            if (gameId) {
              const checkSync = setInterval(() => {
                if (gs.phase !== 'waiting') {
                  setSyncing(false);
                  clearInterval(checkSync);
                }
              }, 200);
              setTimeout(() => { setSyncing(false); clearInterval(checkSync); }, 10000);
            }
          }
        }, 200);
      });
    });

    return () => {
      cancelled = true;
      initRef.current = false;
      if (pollTimer) clearInterval(pollTimer);
      // Disconnect multiplayer IMMEDIATELY (sync) to prevent auto-reconnect
      if (catanModRef.current) {
        catanModRef.current.getMultiplayerRef()?.disconnect();
        catanModRef.current.destroyCatan();
      } else {
        import("../../../game-engine/catan").then((mod) => mod.destroyCatan());
      }
      document.querySelectorAll(".stats-panel, #stats").forEach(el => el.remove());
    };
  }, [gameId, accessChecked]);

  const { state, actions } = useGameState(gameState);

  const computeVP = (player: any) => {
    if (!gameState) return 0;
    return gameState.computeVP(player);
  };

  return (
    <>
    <div id="catan-game">
      {/* Font Awesome for game icons */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css"
      />

      {/* Three.js render target */}
      <canvas id="three" />

      {/* Loader */}
      <div id="loader">
        <div className="loader-title">
          <i className="fa-solid fa-hexagon loader-hex" />
          Catan
        </div>
        <div className="loader-progress">
          <div className="loader-progress-bar" id="progress-bar" />
        </div>
        <p className="loader-text" id="loader-text">
          Preparing the world&hellip;
        </p>
        <div className="explore-buttons" id="explore-buttons">
          <button
            className="explore-button explore-button-dark"
            id="explore-with-music"
          >
            <i className="fa-solid fa-music" /> Müzikle Başla
          </button>
          <button
            className="explore-button explore-button-light"
            id="explore-without-music"
          >
            <i className="fa-solid fa-play" /> Başla
          </button>
        </div>
      </div>

      {/* Page title */}
      <div id="page-title" style={{ opacity: 0, pointerEvents: "none" }}>
        <i className="fa-solid fa-hexagon" style={{ color: "#e8a628" }} />
        Catan
      </div>

      {/* Control panel (season/daynight/music) */}
      <div id="control-panel" style={{ opacity: 0, pointerEvents: "none" }}>
        <div className="pill-group" id="time-pill">
          <button className="pill-btn daynight-button" data-time="day" title="Gündüz">
            <i className="fa-solid fa-sun" />
          </button>
          <button className="pill-btn daynight-button" data-time="night" title="Gece">
            <i className="fa-solid fa-moon" />
          </button>
        </div>
        <div className="pill-group" id="season-pill">
          <button className="pill-btn season-button" data-season="spring" title="İlkbahar">
            <i className="fa-solid fa-seedling" />
          </button>
          <button className="pill-btn season-button" data-season="autumn" title="Sonbahar">
            <i className="fa-solid fa-leaf" />
          </button>
          <button className="pill-btn season-button" data-season="winter" title="Kış">
            <i className="fa-solid fa-snowflake" />
          </button>
          <button className="pill-btn season-button" data-season="rain" title="Yağmur">
            <i className="fa-solid fa-cloud-rain" />
          </button>
        </div>
        <button className="pill-btn pill-standalone" id="music-control" title="Ses">
          <i className="fa-solid fa-volume-xmark" />
        </button>
      </div>

      {/* Settings overlay */}
      <div id="settings-overlay" className="hidden" style={{ display: "none", opacity: 0 }}>
        <div id="settings-modal" role="dialog" aria-modal="true">
          <div className="modal-header">
            <h2 className="modal-title">Settings</h2>
            <button className="modal-close" id="settings-close" title="Kapat">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
          <div className="modal-tabs">
            <button className="modal-tab active" data-tab="settings">Settings</button>
            <button className="modal-tab" data-tab="about">About</button>
            <button className="modal-tab" data-tab="credits">Credits</button>
          </div>
          <div className="tab-content active" id="tab-settings">
            <div className="settings-card">
              <h3 className="settings-card-title">Audio Settings</h3>
              <div className="settings-card-divider" />
              <div className="setting-row">
                <label className="setting-label">Master Volume</label>
                <div className="setting-control">
                  <input type="range" id="master-volume" min={0} max={100} defaultValue={80} />
                  <span className="setting-value" id="master-volume-value">80%</span>
                </div>
              </div>
              <div className="setting-row">
                <label className="setting-label">Music Volume</label>
                <div className="setting-control">
                  <input type="range" id="music-volume" min={0} max={100} defaultValue={60} />
                  <span className="setting-value" id="music-volume-value">60%</span>
                </div>
              </div>
              <div className="setting-row">
                <label className="setting-label">Sound Volume</label>
                <div className="setting-control">
                  <input type="range" id="sound-volume" min={0} max={100} defaultValue={70} />
                  <span className="setting-value" id="sound-volume-value">70%</span>
                </div>
              </div>
            </div>
            <div className="settings-card">
              <h3 className="settings-card-title">Graphics Settings</h3>
              <div className="settings-card-divider" />
              <div className="setting-row">
                <label className="setting-label">Quality Preset</label>
                <div className="setting-control">
                  <div className="custom-select-wrapper">
                    <select id="graphics-quality" defaultValue="medium">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="ultra">Ultra</option>
                    </select>
                    <i className="fa-solid fa-chevron-down select-arrow" />
                  </div>
                </div>
              </div>
              <div className="quality-affects" id="quality-affects">
                <span className="affects-label">AFFECTS:</span>
                Balanced grass density, standard shadows, moderate particle effects.
              </div>
            </div>
          </div>
          <div className="tab-content" id="tab-about">
            <div className="settings-card">
              <h3 className="settings-card-title">About Catan</h3>
              <div className="settings-card-divider" />
              <p className="about-text">
                Catan, 3-4 oyuncu için strateji tabanlı bir board oyunudur.
              </p>
            </div>
          </div>
          <div className="tab-content" id="tab-credits">
            <div className="settings-card">
              <h3 className="settings-card-title">Credits</h3>
              <div className="settings-card-divider" />
              <div className="credits-list">
                <div className="credit-row">
                  <span className="credit-role">Visual Design</span>
                  <span className="credit-name">Elemental Serenity</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    {/* Hide legacy loader when React overlay is active */}
    {(!engineReady || syncing) && (
      <style>{`#loader { display: none !important; }`}</style>
    )}

    {/* ─── Loading / Syncing overlay ─── */}
    {(!engineReady || syncing) && (
      <div style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: engineReady ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.85)",
        backdropFilter: engineReady ? "blur(6px)" : "none",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        transition: "background 0.5s ease",
      }}>
        <div style={{
          background: "rgba(255,255,255,0.95)", borderRadius: 16, padding: "40px 48px",
          textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}>
          <div style={{
            width: 48, height: 48, margin: "0 auto 16px",
            border: "3px solid #d97706", borderTop: "3px solid transparent",
            borderRadius: "50%", animation: "spin 1s linear infinite",
          }} />
          <div style={{ fontSize: 16, fontWeight: 800, color: "#1a1a2e", letterSpacing: 2, textTransform: "uppercase" }}>
            {engineReady ? "Senkronizasyon" : "Yükleniyor"}
          </div>
          <div style={{ fontSize: 13, color: "#717182", marginTop: 8 }}>
            {engineReady ? "Sunucuyla bağlantı kuruluyor..." : "Oyun dünyası hazırlanıyor..."}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    )}

    {/* ─── React Game HUD (outside #catan-game to avoid SCSS scope) ─── */}
    {state && !syncing && (
      <GameHUD
        state={state}
        actions={actions}
        computeVP={computeVP}
      />
    )}

    {/* ─── Session replaced dialog ─── */}
    {sessionReplaced && (
      <SessionReplacedDialog
        onGoToOtherTab={handleClose}
        onReconnect={handleReconnect}
      />
    )}

    {/* ─── Replaced by bot dialog ─── */}
    {replacedByBot && (
      <ReplacedByBotDialog
        gameId={gameId || ''}
        onGoHome={() => { window.location.href = '/'; }}
        onReconnect={() => {
          setReplacedByBot(false);
          (window as any).__catanReplacedByBot = false;
          handleReconnect();
        }}
      />
    )}
    </>
  );
}

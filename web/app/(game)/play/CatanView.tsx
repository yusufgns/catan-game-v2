"use client";

import { useEffect, useState } from "react";
import "../../../game-engine/catan.scss";
import GameHUD from "../../../game-engine/ui/GameHUD";
import { useGameState } from "../../../game-engine/ui/useGameState";

export default function CatanView() {
  const [gameState, setGameState] = useState<any>(null);
  const [gameInstance, setGameInstance] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    requestAnimationFrame(() => {
      if (cancelled) return;
      import("../../../game-engine/catan").then((mod) => {
        if (cancelled) { mod.destroyCatan(); return; }
        mod.default();
        pollTimer = setInterval(() => {
          if (cancelled) { clearInterval(pollTimer!); return; }
          const gs = mod.getGameState();
          const gi = mod.getGameRef();
          if (gs) {
            setGameState(gs);
            setGameInstance(gi);
            clearInterval(pollTimer!);
            pollTimer = null;
          }
        }, 200);
      });
    });

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      import("../../../game-engine/catan").then((mod) => mod.destroyCatan());
      document.querySelectorAll(".stats-panel, #stats").forEach(el => el.remove());
    };
  }, []);

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

      {/* Control panel (season/daynight/music) — kept as-is */}
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

    {/* ─── React Game HUD (outside #catan-game to avoid SCSS scope) ─── */}
    {state && (
      <GameHUD
        state={state}
        actions={actions}
        computeVP={computeVP}
      />
    )}
    </>
  );
}

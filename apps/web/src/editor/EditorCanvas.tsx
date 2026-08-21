import { useRef, useState } from "react";

import type { LevelManifest } from "@gravity-runner/shared-contracts";

type Point = { x: number; y: number };
type Viewport = { x: number; y: number; scale: number };

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.4;
const GRID_SIZE = 64;

function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function formatScale(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}

export function EditorCanvas({ level }: { level: LevelManifest }) {
  const [viewport, setViewport] = useState<Viewport>({
    x: 24,
    y: 24,
    scale: 0.72
  });
  const dragRef = useRef<{ pointer: Point; viewport: Viewport } | null>(null);

  const zoom = (delta: number) => {
    setViewport((current) => ({
      ...current,
      scale: clampScale(current.scale + delta)
    }));
  };

  return (
    <section className="editor-shell" aria-labelledby="editor-title">
      <div className="editor-toolbar">
        <div>
          <p className="eyebrow">EDITOR / LEVEL DOCUMENT</p>
          <h1 id="editor-title">{level.name}</h1>
        </div>
        <div className="editor-toolbar__actions">
          <span className="editor-status">DRAFT · NOT SAVED</span>
          <button
            className="text-button"
            type="button"
            onClick={() => setViewport({ x: 24, y: 24, scale: 0.72 })}
          >
            Reset view
          </button>
        </div>
      </div>

      <div className="editor-workspace">
        <aside className="editor-panel" aria-label="Editor tools">
          <p className="eyebrow">TOOLS</p>
          <button className="editor-tool editor-tool--active" type="button">
            <span>▦</span> Select
          </button>
          <button className="editor-tool" type="button" disabled>
            <span>＋</span> Add object
          </button>
          <div className="editor-panel__divider" />
          <p className="eyebrow">VIEWPORT</p>
          <label className="editor-toggle">
            <span>Safe area</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="editor-toggle">
            <span>Grid</span>
            <input type="checkbox" defaultChecked />
          </label>
          <p className="editor-help">Drag to pan · Scroll to zoom</p>
        </aside>

        <div
          className="editor-viewport"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              pointer: { x: event.clientX, y: event.clientY },
              viewport
            };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (drag === null) return;
            setViewport({
              ...drag.viewport,
              x: drag.viewport.x + event.clientX - drag.pointer.x,
              y: drag.viewport.y + event.clientY - drag.pointer.y
            });
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
          onWheel={(event) => {
            event.preventDefault();
            zoom(event.deltaY < 0 ? 0.08 : -0.08);
          }}
        >
          <svg
            className="editor-canvas"
            role="img"
            aria-label="Level editor canvas"
            viewBox={`0 0 ${level.width} ${level.height}`}
          >
            <defs>
              <pattern
                id="editor-grid"
                width={GRID_SIZE}
                height={GRID_SIZE}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                  fill="none"
                  stroke="#6fffc2"
                  strokeOpacity="0.13"
                />
              </pattern>
            </defs>
            <g
              transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}
            >
              <rect width={level.width} height={level.height} fill="#081725" />
              <rect
                width={level.width}
                height={level.height}
                fill="url(#editor-grid)"
              />
              <rect
                x="0"
                y="0"
                width="1280"
                height="720"
                fill="none"
                stroke="#72fbc1"
                strokeDasharray="18 10"
                strokeOpacity="0.8"
                strokeWidth="4"
              />
              <text x="20" y="36" fill="#72fbc1" fontSize="18">
                SAFE AREA · 1280 × 720
              </text>
              {level.platforms.map((platform) => (
                <rect
                  key={platform.id}
                  x={platform.x}
                  y={platform.y}
                  width={platform.width}
                  height={platform.height}
                  fill="#17425a"
                  stroke="#55a5c6"
                  strokeWidth="3"
                />
              ))}
              {level.hazards.map((hazard) => (
                <rect
                  key={hazard.id}
                  x={hazard.x}
                  y={hazard.y}
                  width={hazard.width}
                  height={hazard.height}
                  rx="8"
                  fill={hazard.type === "electric" ? "#79dfff" : "#ffc857"}
                  fillOpacity="0.9"
                  stroke="#06101e"
                  strokeWidth="3"
                />
              ))}
              {level.checkpoints.map((checkpoint) => (
                <line
                  key={checkpoint.id}
                  x1={checkpoint.x}
                  y1="0"
                  x2={checkpoint.x}
                  y2={level.height}
                  stroke="#72fbc1"
                  strokeDasharray="8 8"
                  strokeWidth="3"
                />
              ))}
              <rect
                x={level.finish.x}
                y={level.finish.y}
                width={level.finish.width}
                height={level.finish.height}
                fill="#72fbc1"
                fillOpacity="0.18"
                stroke="#72fbc1"
                strokeWidth="4"
              />
            </g>
          </svg>
          <div className="editor-zoom-controls" aria-label="Zoom controls">
            <button
              type="button"
              onClick={() => zoom(-0.08)}
              aria-label="Zoom out"
            >
              −
            </button>
            <output>{formatScale(viewport.scale)}</output>
            <button
              type="button"
              onClick={() => zoom(0.08)}
              aria-label="Zoom in"
            >
              ＋
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

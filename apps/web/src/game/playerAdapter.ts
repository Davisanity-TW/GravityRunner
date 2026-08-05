import type { PlayerState } from "@gravity-runner/shared-contracts";

export type PhaserPlayerBody = {
  setActive(active: boolean): unknown;
  setAlpha(alpha: number): unknown;
  setFlipY(flipY: boolean): unknown;
  setPosition(x: number, y: number): unknown;
  setVelocity(x: number, y: number): unknown;
  setVisible(visible: boolean): unknown;
};

export function syncPlayerBody(
  body: PhaserPlayerBody,
  player: PlayerState
): void {
  body.setPosition(player.x, player.y);
  body.setVelocity(player.vx, player.vy);
  body.setFlipY(player.gravityDirection === -1);
  body.setAlpha(player.alive ? 1 : 0.35);
  body.setActive(player.alive);
  // Keep the body visible during death so the presentation layer can show
  // its authored death state before the checkpoint respawn countdown.
  body.setVisible(true);
}

export const webApplication = {
  name: "Gravity Switch Runner",
  role: "web-shell"
} as const;

export function createBootMarkup(): string {
  return `
    <main class="boot-shell">
      <p class="eyebrow">SYSTEM BOOT / PHASE 0</p>
      <h1>${webApplication.name}</h1>
      <p class="status" role="status">Web shell ready</p>
      <p class="note">Original gameplay runtime arrives in the next development phases.</p>
    </main>
  `;
}

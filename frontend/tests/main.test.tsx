import { expect, it, vi } from "vitest";
import { App } from "../app";
const { render, createRoot } = vi.hoisted(() => {
  const render = vi.fn();
  return { render, createRoot: vi.fn(() => ({ render })) };
});
vi.mock("react-dom/client", () => ({ createRoot }));
it("boots the React browser entry point", async () => {
  document.body.innerHTML = '<div id="app"></div>';
  await import("../main");
  expect(createRoot).toHaveBeenCalledWith(document.getElementById("app"));
  expect(render).toHaveBeenCalledWith(expect.objectContaining({ type: App }));
});

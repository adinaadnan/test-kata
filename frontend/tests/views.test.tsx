import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Feedback, Inbox, Login, TicketDetail } from "../views";
import { ticket, user } from "./fixtures";

afterEach(cleanup);
it("renders untrusted ticket text safely and formats the date", () => {
  const { container } = render(
    <TicketDetail
      ticket={{
        ...ticket,
        subject: "Export <script>",
        customer: "<img src=x>",
        description: "&<>\"'",
      }}
      onBack={vi.fn()}
    />,
  );
  expect(screen.getByRole("heading").textContent).toBe("Export <script>");
  expect(container.querySelector("script, img")).toBeNull();
  expect(screen.getByText("22 Oct 2026")).toBeTruthy();
  expect(container.querySelector(".description")!.textContent).toBe("&<>\"'");
});
it.each([
  ["high", "High"],
  ["medium", "Medium"],
  ["low", "Low"],
] as const)("renders %s priority", (priority, label) => {
  render(<TicketDetail ticket={{ ...ticket, priority }} onBack={vi.fn()} />);
  expect(screen.getByText(label)).toBeTruthy();
});
it("renders safe login feedback", () => {
  const { container } = render(<Login message="<oops>" onSignIn={vi.fn()} />);
  expect(screen.getByRole("alert").textContent).toBe("<oops>");
  expect(container.querySelector("oops")).toBeNull();
});
it("renders the customer role and safe failure messages", () => {
  render(
    <Inbox
      user={{ ...user, role: "customer" }}
      tickets={[]}
      selected={null}
      detail={{ status: "empty" }}
      showDetail={false}
      onOpen={vi.fn()}
      onBack={vi.fn()}
      onSignOut={vi.fn()}
    />,
  );
  expect(screen.getByText("· Customer")).toBeTruthy();
  render(<Feedback message="<bad>" onRetry={vi.fn()} />);
  expect(screen.getByRole("alert").textContent).toBe("<bad>");
});

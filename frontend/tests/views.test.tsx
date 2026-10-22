import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Feedback, Inbox, Login, TicketDetail } from "../views";
import { deferred, ticket, user } from "./fixtures";

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
      isAgent
      onAssign={vi.fn().mockResolvedValue(undefined)}
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
  render(
    <TicketDetail
      ticket={{ ...ticket, priority }}
      onBack={vi.fn()}
      isAgent
      onAssign={vi.fn().mockResolvedValue(undefined)}
    />,
  );
  expect(screen.getByText(label)).toBeTruthy();
});
it("shows an unassigned state, disables the claim while pending, then completes", async () => {
  const pending = deferred<void>();
  const onAssign = vi.fn(() => pending.promise);
  render(
    <TicketDetail
      ticket={ticket}
      onBack={vi.fn()}
      isAgent
      onAssign={onAssign}
    />,
  );
  expect(screen.getByText("Unassigned")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Assign to me" }));
  expect(onAssign).toHaveBeenCalledWith(ticket.id);
  expect(
    (screen.getByRole("button", { name: "Assigning…" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  await act(async () => pending.resolve());
  expect(screen.getByRole("button", { name: "Assign to me" })).toBeTruthy();
});
it("shows the saved assignee and hides the claim action", () => {
  render(
    <TicketDetail
      ticket={{ ...ticket, assignee_id: 3, assignee: "Sara" }}
      onBack={vi.fn()}
      isAgent
      onAssign={vi.fn().mockResolvedValue(undefined)}
    />,
  );
  expect(screen.getByText("Assigned to Sara")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Assign to me" })).toBeNull();
});
it("does not offer claim to customers and shows actionable errors", async () => {
  const onAssign = vi.fn().mockRejectedValue(new Error("Ticket already claimed."));
  const { rerender } = render(
    <TicketDetail
      ticket={ticket}
      onBack={vi.fn()}
      isAgent={false}
      onAssign={onAssign}
    />,
  );
  expect(screen.queryByRole("button", { name: "Assign to me" })).toBeNull();
  rerender(
    <TicketDetail
      ticket={ticket}
      onBack={vi.fn()}
      isAgent
      onAssign={onAssign}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Assign to me" }));
  expect((await screen.findByRole("alert")).textContent).toBe(
    "Ticket already claimed.",
  );
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
      onAssign={vi.fn().mockResolvedValue(undefined)}
      onBack={vi.fn()}
      onSignOut={vi.fn()}
    />,
  );
  expect(screen.getByText("· Customer")).toBeTruthy();
  render(<Feedback message="<bad>" onRetry={vi.fn()} />);
  expect(screen.getByRole("alert").textContent).toBe("<bad>");
});

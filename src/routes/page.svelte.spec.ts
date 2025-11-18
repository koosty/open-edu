import { page } from "vitest/browser";
import { describe, expect, it } from "vitest";
import { render } from "vitest-browser-svelte";
import Page from "./+page.svelte";
import { authState } from "$lib/auth.svelte";

describe("Home Page", () => {
  it("should render the main heading", async () => {
    render(Page);

    const heading = page.getByRole("heading", { level: 1 });
    await expect.element(heading).toBeInTheDocument();
    await expect.element(heading).toContainText("Transform Your Learning");
  });

  it("should show Sign In button when user is not authenticated", async () => {
    // Mock unauthenticated state
    render(Page);

    const signInButton = page.getByRole("link", {
      name: /start learning today/i,
    });
    await expect.element(signInButton).toBeInTheDocument();
  });
});

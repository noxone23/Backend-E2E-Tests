import { expect, test } from "@playwright/test";

test("the page shows the heading and the form", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Reading List" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add book" })).toBeVisible();
});

test("add a book and delete it", async ({ page }) => {
  const title = `E2E Book ${Date.now()}`;
  const book = page.getByRole("listitem").filter({ hasText: title });

  await page.goto("/");

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Author").fill("E2E Author");
  await page.getByRole("button", { name: "Add book" }).click();
  await expect(book).toBeVisible();

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(book).toHaveCount(0);
});

test("a book is still there after a reload", async ({ page }) => {
  const title = `E2E Book ${Date.now()}`;
  const book = page.getByRole("listitem").filter({ hasText: title });

  await page.goto("/");

  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Author").fill("E2E Author");
  await page.getByRole("button", { name: "Add book" }).click();
  await expect(book).toBeVisible();

  await page.reload();
  await expect(book).toBeVisible();

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(book).toHaveCount(0);
});

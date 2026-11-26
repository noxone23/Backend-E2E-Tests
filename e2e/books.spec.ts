import { expect, type Page, test } from "@playwright/test";

/** Opens the page and adds a book with a unique title. Returns the title and the list item of the book. */
async function addBook(page: Page) {
  const title = `E2E Book ${Date.now()}`;
  const book = page.getByRole("listitem").filter({ hasText: title });

  await page.goto("/");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Author").fill("E2E Author");
  await page.getByRole("button", { name: "Add book" }).click();
  await expect(book).toBeVisible();

  return { title, book };
}

test("the page shows the heading and the form", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Reading List" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add book" })).toBeVisible();
});

test("add a book and delete it", async ({ page }) => {
  const { title, book } = await addBook(page);

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(book).toHaveCount(0);
});

test("a book is still there after a reload", async ({ page }) => {
  const { title, book } = await addBook(page);

  await page.reload();
  await expect(book).toBeVisible();

  await page.getByRole("button", { name: `Delete ${title}` }).click();
  await expect(book).toHaveCount(0);
});

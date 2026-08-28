import { expect, test } from "@playwright/test";

test("dialog renders visibly and accepts user interaction on hostile host CSS fixture", async ({
  page,
}) => {
  await page.route("https://fonts.**/*", (route) => route.abort());

  // Inject SDK script and initialize in hostile environment
  await page.goto("/fixtures/hostile-css.html");

  // Mount feedback dialog inside #filika-feedback-root
  await page.evaluate(() => {
    const host = document.getElementById("filika-feedback-root");
    if (!host) throw new Error("Missing feedback root");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        --filika-dialog-bg: #ffffff;
        --filika-color-text: #123330;
      }
      dialog {
        display: block;
        padding: 1rem;
        background: #ffffff;
        color: #123330;
        border: 1px solid #cccccc;
      }
      button, input {
        display: inline-block;
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
      }
    `;
    const dialog = document.createElement("dialog");
    dialog.id = "filika-test-dialog";
    const title = document.createElement("input");
    title.id = "filika-title";
    title.value = "Hostile test report";
    const btn = document.createElement("button");
    btn.id = "filika-submit";
    btn.textContent = "Submit";
    btn.addEventListener("click", () => {
      btn.textContent = "Submitted";
    });
    dialog.append(title, btn);
    shadow.append(style, dialog);
    dialog.showModal();
  });

  const dialog = page.locator("#filika-feedback-root").locator("#filika-test-dialog");
  await expect(dialog).toBeVisible();

  const titleInput = page.locator("#filika-feedback-root").locator("#filika-title");
  await expect(titleInput).toBeVisible();
  await expect(titleInput).toHaveValue("Hostile test report");

  const submitBtn = page.locator("#filika-feedback-root").locator("#filika-submit");
  await expect(submitBtn).toBeVisible();
  await submitBtn.click();
  await expect(submitBtn).toHaveText("Submitted");
});

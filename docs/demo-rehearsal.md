# Local Demo Rehearsal

Use this guide to verify the complete local feedback journey before a live demonstration or recording. Use synthetic report content only.

## Preflight

Follow the setup in the [local demo guide](local-demo.md). Confirm all of the following before opening the page:

- Bun reports version `1.3.14`.
- PostgreSQL is available on the configured loopback port.
- The database migration and seed commands complete successfully.
- The collector listens on `http://localhost:8787`.
- The web application listens on `http://localhost:4173`.
- The browser console has no unexpected errors.

Restart `bun run dev` after source changes because the local server does not provide hot reload.

## Rehearsal run

1. Open `http://localhost:4173/` and confirm the status reads `WebMCP demo task ready.` when browser tool support is available.
2. Select each theme control and confirm the page remains readable in light, dark, and system modes.
3. Select **Confirm checklist** and verify the normal task completes without opening feedback.
4. Select **Run sample task** and verify the deterministic save conflict is visible. Select **Reset sample** and verify the task returns to its ready state.
5. Select **Send feedback**. Complete every report field with synthetic content, remove one optional host context value, and select **Review submission**.
6. Confirm the review page shows the edited report, the remaining host context, project `filika-demo`, collector `http://localhost:8787`, retention notice, and SDK version.
7. Select **Edit report**, make one visible change, return to review, and select **Send feedback**.
8. Verify the receipt shows only a feedback ID and received timestamp. It must not repeat the report body.
9. Close the receipt and select **View in inbox** from the notification. If the notification has already closed, use the **Inbox** navigation and open the newest record.
10. Verify the inbox detail separates report content, host context, and server facts. Confirm the external-content warning is visible and use **Back to inbox**.
11. Return to **Demo** and confirm the feedback controls are available again.

## Browser tool journey

When WebMCP is available, run `filika_demo_save_draft` with `{}`. Then call `filika_submit_feedback` with the synthetic input from the [local demo guide](local-demo.md#expected-journey).

The tool call must open the review dialog without transmitting data. Edit the draft, review it, and confirm it manually. Verify the accepted record in the inbox as described above.

When WebMCP is unavailable, repeat the same journey with **Send feedback**. You can also call `Filika.open()` from the browser console to verify the public manual entry point opens the same dialog.

## Outcome checks

The rehearsal is complete when:

- Normal task completion and the deterministic failure both behave consistently.
- Manual and browser-tool entry points use the same review and confirmation UI.
- Cancellation, editing, and optional context removal transmit nothing before confirmation.
- A confirmed report receives a collector receipt and opens as the same inbox record.
- Long summaries, descriptions, steps, IDs, and host labels wrap without clipping or horizontal overflow.
- Keyboard focus remains visible and returns to the invoking control after the dialog closes.
- No personal data, credentials, screenshots, or ambient page content appear in the report.

Run the automated checks in [local development](development.md) after the manual rehearsal.

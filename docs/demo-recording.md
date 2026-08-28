# Demo Recording Checklist

Keep this checklist off camera and use synthetic content throughout the recording.

## Before recording

- [ ] Use Bun `1.3.14` and a clean local build.
- [ ] Start PostgreSQL, migrate and seed the demo database, then start the collector and web application.
- [ ] Confirm ports `4173` and `8787` are used only by the intended local processes.
- [ ] Open `http://localhost:4173/` and confirm there are no unexpected browser console errors.
- [ ] Select the light theme unless the recording specifically demonstrates theme switching.
- [ ] Close unrelated tabs, notifications, terminals, and applications that could reveal personal data.
- [ ] Hide bookmarks, account details, environment variables, database connection strings, and machine-specific paths.
- [ ] Set the browser zoom to 100 percent and choose a viewport that shows the three task cards without clipping.
- [ ] Prepare the synthetic report from the [local demo guide](local-demo.md#expected-journey).
- [ ] Complete one untimed run with the [rehearsal guide](demo-rehearsal.md).

## Recording order

- [ ] Show the Filika header, ready status, task cards, and privacy notice.
- [ ] Run the sample task and pause briefly on the visible save conflict.
- [ ] Open feedback through WebMCP when available. Otherwise use **Send feedback**.
- [ ] Show that the draft is editable and remove one optional context item.
- [ ] Select **Review submission** and pause on the destination, retention, and SDK details.
- [ ] Return to editing once, make a clear change, and review again.
- [ ] Select **Send feedback** and pause on the accepted receipt.
- [ ] Close the receipt and immediately select **View in inbox** from the notification.
- [ ] Show the matching inbox detail and the separation between report content, host context, and server facts.
- [ ] Return to the inbox list, then return to the demo.

## Optional coverage

- [ ] Show light, dark, and system theme selection.
- [ ] Open the same dialog with `Filika.open()` to demonstrate the manual SDK entry point.
- [ ] Cancel a draft and confirm no receipt or inbox record appears.
- [ ] Use a long synthetic summary and description to demonstrate wrapping and scrolling.
- [ ] Navigate the dialog with the keyboard and show the visible focus indicator.

## Before sharing

- [ ] Watch the complete recording with audio enabled.
- [ ] Confirm no personal data, credentials, unrelated tabs, or desktop notifications are visible.
- [ ] Confirm all report content is synthetic.
- [ ] Confirm the accepted feedback ID remains consistent between receipt and inbox detail.
- [ ] Trim setup delays and failed takes without cutting away required review or confirmation steps.
- [ ] Verify text remains readable at normal playback size.
- [ ] Verify the final file opens and plays from start to finish.

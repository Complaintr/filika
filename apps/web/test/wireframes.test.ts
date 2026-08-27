import { describe, expect, test } from "bun:test";

import { LOW_FIDELITY_WIREFRAMES, WIREFRAME_IDS } from "../src/foundation/wireframes";

describe("wireframes", () => {
  test("defines all five required surfaces", () => {
    expect(Object.keys(LOW_FIDELITY_WIREFRAMES).sort()).toEqual([...WIREFRAME_IDS].sort());
  });

  test("keeps authored report, host context, and request facts separate", () => {
    expect(LOW_FIDELITY_WIREFRAMES.inbox_detail.regions.map((region) => region.id)).toEqual([
      "back_navigation",
      "detail_heading",
      "authored_report",
      "host_context",
      "request_facts",
    ]);
  });

  test("keeps reset and manual feedback visible in the sample layout", () => {
    expect(LOW_FIDELITY_WIREFRAMES.sample_application.actions).toContain("Reset sample");
    expect(LOW_FIDELITY_WIREFRAMES.sample_application.actions).toContain("Send feedback");
  });
});

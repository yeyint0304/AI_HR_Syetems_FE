// NOTE (QA): This file started life as a scratch file used to verify that
// `scripts/run-tests.mjs` correctly propagates a non-zero exit code on a
// genuine test failure (see the QA report for that investigation). The
// sandboxed environment this review ran in does not permit deleting files,
// so rather than leave a dangling, confusingly-named, empty test file in
// the repo, it has been repurposed into a real (small) regression test.
//
// Recommended follow-up for whoever picks this branch back up: rename this
// file to `src/lib/__tests__/auth.test.ts` (or fold its one assertion into
// an existing suite) and delete this comment.
import { describe, expect, it } from "vitest";
import { ROLE_LABELS } from "@/types/auth";

describe("ROLE_LABELS", () => {
  it("provides a human-readable label for every role used across the app", () => {
    expect(ROLE_LABELS).toEqual({
      SYSTEM_ADMIN: "System Admin",
      PROJECT_ADMIN: "Project Admin",
      ASSIGNED_USER: "Assigned User",
    });
  });
});

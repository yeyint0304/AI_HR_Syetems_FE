import {
  createTimesheetEntrySchema,
  projectAdminTimesheetSummaryQuerySchema,
  timesheetEntryListQuerySchema,
  updateTimesheetEntrySchema,
} from "@/lib/validators/timesheetEntry.validators";

const VALID_CREATE = {
  projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
  timesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
  entryDate: "2026-03-07",
  hours: 8,
  taskDescription: "Worked on feature implementation",
};

describe("timesheetEntry.validators", () => {
  describe("createTimesheetEntrySchema", () => {
    it("accepts a fully valid payload", () => {
      expect(createTimesheetEntrySchema.safeParse(VALID_CREATE).success).toBe(true);
    });

    it("rejects a non-uuid projectId", () => {
      expect(
        createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, projectId: "not-a-uuid" }).success
      ).toBe(false);
    });

    it("rejects a non-uuid timesheetPeriodId", () => {
      expect(
        createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, timesheetPeriodId: "nope" }).success
      ).toBe(false);
    });

    it("rejects a non YYYY-MM-DD entry date", () => {
      expect(
        createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, entryDate: "03/07/2026" }).success
      ).toBe(false);
    });

    it("rejects zero hours", () => {
      expect(createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, hours: 0 }).success).toBe(false);
    });

    it("rejects negative hours", () => {
      expect(createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, hours: -1 }).success).toBe(false);
    });

    it("rejects hours greater than 24", () => {
      expect(createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, hours: 25 }).success).toBe(false);
    });

    it("accepts hours at the 24 boundary", () => {
      expect(createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, hours: 24 }).success).toBe(true);
    });

    it("rejects an empty task description", () => {
      expect(
        createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, taskDescription: "  " }).success
      ).toBe(false);
    });

    it("rejects a task description over 500 characters", () => {
      expect(
        createTimesheetEntrySchema.safeParse({ ...VALID_CREATE, taskDescription: "a".repeat(501) }).success
      ).toBe(false);
    });
  });

  describe("updateTimesheetEntrySchema", () => {
    it("accepts a valid hours/taskDescription payload", () => {
      expect(
        updateTimesheetEntrySchema.safeParse({ hours: 6, taskDescription: "Updated task description" })
          .success
      ).toBe(true);
    });

    it("rejects a missing task description", () => {
      expect(updateTimesheetEntrySchema.safeParse({ hours: 6, taskDescription: "" }).success).toBe(false);
    });

    it("rejects out-of-range hours", () => {
      expect(updateTimesheetEntrySchema.safeParse({ hours: 30, taskDescription: "x" }).success).toBe(false);
    });
  });

  describe("timesheetEntryListQuerySchema", () => {
    it("accepts an empty filter set", () => {
      expect(timesheetEntryListQuerySchema.safeParse({}).success).toBe(true);
    });

    it("accepts valid userId/projectId/timesheetPeriodId/isApproved filters", () => {
      const result = timesheetEntryListQuerySchema.safeParse({
        userId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
        projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        timesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
        isApproved: "true",
      });
      expect(result.success).toBe(true);
    });

    it("rejects a non-uuid userId", () => {
      expect(timesheetEntryListQuerySchema.safeParse({ userId: "nope" }).success).toBe(false);
    });

    it("accepts the backend's seeded SystemAdmin user id as userId", () => {
      // Regression test: the seeded SystemAdmin account id
      // (`docs/HR_System_BE.postman_collection.json`) fails Zod's stricter
      // `z.uuid()` check — this previously caused a 400 ("Invalid filter
      // parameters.") on `GET /api/timesheet-entries` for that account when
      // "My Timesheets"/"Timesheet History" scoped the request to
      // `userId: currentUserId`.
      const result = timesheetEntryListQuerySchema.safeParse({
        userId: "00000000-0000-0000-0000-000000000001",
      });
      expect(result.success).toBe(true);
    });

    it("rejects an invalid isApproved value", () => {
      expect(timesheetEntryListQuerySchema.safeParse({ isApproved: "yes" }).success).toBe(false);
    });
  });

  describe("projectAdminTimesheetSummaryQuerySchema", () => {
    it("accepts an empty filter (projectId omitted)", () => {
      expect(projectAdminTimesheetSummaryQuerySchema.safeParse({}).success).toBe(true);
    });

    it("accepts a valid projectId", () => {
      expect(
        projectAdminTimesheetSummaryQuerySchema.safeParse({
          projectId: "17342891-4f2f-433b-a814-03f64b4f0df3",
        }).success
      ).toBe(true);
    });

    it("rejects a non-uuid projectId", () => {
      expect(projectAdminTimesheetSummaryQuerySchema.safeParse({ projectId: "nope" }).success).toBe(false);
    });
  });
});

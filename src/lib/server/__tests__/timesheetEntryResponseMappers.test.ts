/**
 * @jest-environment node
 */
import {
  mapBackendProjectAdminTimesheetSummary,
  mapBackendTimesheetEntry,
  mapBackendTimesheetEntryList,
  mapBackendTimesheetEntryPage,
} from "@/lib/server/timesheetEntryResponseMappers";

describe("timesheetEntryResponseMappers", () => {
  describe("mapBackendTimesheetEntry", () => {
    it("maps a PascalCase timesheet entry (per the saved 'Get All Timesheet Entries' example)", () => {
      expect(
        mapBackendTimesheetEntry({
          Id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328",
          UserId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
          UserFirstName: "Lin Thit",
          UserLastName: "Htoo",
          ProjectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
          ProjectCode: "PRJ-001",
          ProjectName: "Project Helix",
          TimesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
          EntryDate: "2025-03-01",
          Hours: 10,
          TaskDescription: "Worked on feature implementation",
          IsApproved: true,
          ApprovedAt: "2026-06-22T05:18:00",
          ApprovedBy: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
          CreatedAt: "2026-06-22T05:12:58",
          UpdatedAt: "2026-06-22T05:18:00",
        })
      ).toEqual({
        id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328",
        userId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
        userFirstName: "Lin Thit",
        userLastName: "Htoo",
        projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
        projectCode: "PRJ-001",
        projectName: "Project Helix",
        timesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
        entryDate: "2025-03-01",
        hours: 10,
        taskDescription: "Worked on feature implementation",
        isApproved: true,
        approvedAt: "2026-06-22T05:18:00",
        approvedBy: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
        createdAt: "2026-06-22T05:12:58",
        updatedAt: "2026-06-22T05:18:00",
      });
    });

    it("maps a camelCase timesheet entry, defaulting IsApproved/ApprovedAt/ApprovedBy", () => {
      expect(
        mapBackendTimesheetEntry({
          id: "33b9749a-ca09-4632-8a5b-bc9a8cf128d2",
          userId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
          projectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
          timesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
          entryDate: "2025-03-01",
          hours: 8,
          taskDescription: "Worked on feature implementation",
        })
      ).toEqual(
        expect.objectContaining({
          id: "33b9749a-ca09-4632-8a5b-bc9a8cf128d2",
          hours: 8,
          isApproved: false,
          approvedAt: null,
          approvedBy: null,
        })
      );
    });

    it("returns null when required fields are missing", () => {
      expect(mapBackendTimesheetEntry({ Id: "1" })).toBeNull();
      expect(mapBackendTimesheetEntry(null)).toBeNull();
      expect(mapBackendTimesheetEntry("not-an-object")).toBeNull();
    });
  });

  describe("mapBackendTimesheetEntryList", () => {
    const BASE_ENTRY = {
      Id: "1",
      UserId: "user-1",
      ProjectId: "project-1",
      TimesheetPeriodId: "period-1",
      EntryDate: "2025-03-01",
    };

    it("extracts a bare array", () => {
      expect(mapBackendTimesheetEntryList([BASE_ENTRY])).toHaveLength(1);
    });

    it("extracts a { data: [...] } wrapper", () => {
      expect(mapBackendTimesheetEntryList({ data: [BASE_ENTRY] })).toHaveLength(1);
    });

    it("returns an empty array for an unrecognized shape", () => {
      expect(mapBackendTimesheetEntryList({ unexpected: true })).toEqual([]);
    });

    it("returns an empty array when Data is null (e.g. after unwrapping an update/delete envelope)", () => {
      expect(mapBackendTimesheetEntryList(null)).toEqual([]);
    });
  });

  describe("mapBackendProjectAdminTimesheetSummary", () => {
    it("maps the saved 'Get Project Admin Timesheet Entry' example", () => {
      const result = mapBackendProjectAdminTimesheetSummary(
        {
          TotalHours: 40,
          ApprovedHours: 20,
          PendingHours: 20,
          ProjectSummaries: [
            {
              ProjectId: "17342891-4f2f-433b-a814-03f64b4f0df3",
              ProjectCode: "D3SG001",
              ProjectName: "Straight Through Processing Enhancement Phase 1",
              TotalHours: 40,
              ApprovedHours: 20,
              PendingHours: 20,
            },
          ],
          Entries: [
            {
              Id: "5a24c616-eba8-4c6f-b4dd-1928a896d792",
              UserId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
              ProjectId: "17342891-4f2f-433b-a814-03f64b4f0df3",
              TimesheetPeriodId: "be79b007-2525-404d-9946-b49efca89872",
              EntryDate: "2026-03-07",
              Hours: 20,
              TaskDescription: "Worked on feature implementation",
              IsApproved: true,
            },
          ],
        },
        1,
        20
      );

      expect(result).toEqual({
        totalHours: 40,
        approvedHours: 20,
        pendingHours: 20,
        projectSummaries: [
          expect.objectContaining({
            projectId: "17342891-4f2f-433b-a814-03f64b4f0df3",
            projectCode: "D3SG001",
            projectName: "Straight Through Processing Enhancement Phase 1",
            totalHours: 40,
            approvedHours: 20,
            pendingHours: 20,
          }),
        ],
        entries: [expect.objectContaining({ id: "5a24c616-eba8-4c6f-b4dd-1928a896d792", hours: 20 })],
        totalCount: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    // Per `feature/timesheets-pagination`: the live backend's saved example
    // nests the entry list under `Items` (sibling to
    // `TotalCount`/`TotalPages`/`PageNo`/`PageSize`) rather than `Entries` —
    // see `mapBackendProjectAdminTimesheetSummary`'s doc comment.
    it("maps the entry list from Items (the live backend's actual field name) and its pagination metadata", () => {
      const result = mapBackendProjectAdminTimesheetSummary(
        {
          TotalHours: 41,
          ApprovedHours: 20,
          PendingHours: 21,
          ProjectSummaries: [],
          TotalCount: 2,
          TotalPages: 1,
          PageNo: 1,
          PageSize: 20,
          Items: [
            {
              Id: "5a24c616-eba8-4c6f-b4dd-1928a896d792",
              UserId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
              ProjectId: "17342891-4f2f-433b-a814-03f64b4f0df3",
              TimesheetPeriodId: "be79b007-2525-404d-9946-b49efca89872",
              EntryDate: "2026-03-07",
              Hours: 20,
              TaskDescription: "Worked on feature implementation",
              IsApproved: true,
            },
          ],
        },
        1,
        20
      );

      expect(result?.entries).toEqual([
        expect.objectContaining({ id: "5a24c616-eba8-4c6f-b4dd-1928a896d792", hours: 20 }),
      ]);
      expect(result).toEqual(
        expect.objectContaining({ totalCount: 2, totalPages: 1, page: 1, pageSize: 20 })
      );
    });

    it("defaults ProjectSummaries/Entries to empty arrays when absent, and back-fills pagination from the requested page/pageSize", () => {
      expect(
        mapBackendProjectAdminTimesheetSummary({ TotalHours: 0, ApprovedHours: 0, PendingHours: 0 }, 1, 20)
      ).toEqual({
        totalHours: 0,
        approvedHours: 0,
        pendingHours: 0,
        projectSummaries: [],
        entries: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });

    it("filters out malformed project summaries/entries missing required ids", () => {
      const result = mapBackendProjectAdminTimesheetSummary(
        {
          TotalHours: 0,
          ApprovedHours: 0,
          PendingHours: 0,
          ProjectSummaries: [{ TotalHours: 5 }],
          Entries: [{ Id: "1" }],
        },
        1,
        20
      );
      expect(result?.projectSummaries).toEqual([]);
      expect(result?.entries).toEqual([]);
    });

    it("returns null for a non-object", () => {
      expect(mapBackendProjectAdminTimesheetSummary(null, 1, 20)).toBeNull();
      expect(mapBackendProjectAdminTimesheetSummary("not-an-object", 1, 20)).toBeNull();
    });
  });

  describe("mapBackendTimesheetEntryPage", () => {
    const BASE_ENTRY = {
      Id: "b365fa4d-6a30-4c5b-ae33-6161d9f81328",
      UserId: "f7c326c1-00b9-4aee-90c3-0000d06b37cc",
      ProjectId: "6f2594d9-224a-414a-a409-30dc98f9a1be",
      TimesheetPeriodId: "31a3ee86-f58c-4434-9f00-7b39493b59e8",
      EntryDate: "2025-03-01",
      Hours: 10,
      TaskDescription: "Worked on feature implementation",
      IsApproved: true,
    };

    it("maps the saved 'Get All Timesheet Entries' example's pagination envelope", () => {
      const result = mapBackendTimesheetEntryPage(
        { TotalCount: 7, TotalPages: 1, PageNo: 1, PageSize: 20, Items: [BASE_ENTRY] },
        1,
        20
      );

      expect(result).toEqual({
        items: [expect.objectContaining({ id: BASE_ENTRY.Id, hours: 10 })],
        totalCount: 7,
        totalPages: 1,
        page: 1,
        pageSize: 20,
      });
    });

    it("back-fills page/pageSize/totalPages from the requested values when the backend omits them", () => {
      const result = mapBackendTimesheetEntryPage([BASE_ENTRY], 2, 20);

      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(20);
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("returns an empty page for an unrecognized shape", () => {
      expect(mapBackendTimesheetEntryPage(null, 1, 20)).toEqual({
        items: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      });
    });
  });
});

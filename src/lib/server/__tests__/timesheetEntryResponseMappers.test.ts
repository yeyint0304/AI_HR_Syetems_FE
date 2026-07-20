/**
 * @jest-environment node
 */
import {
  mapBackendTimesheetEntry,
  mapBackendTimesheetEntryList,
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
});

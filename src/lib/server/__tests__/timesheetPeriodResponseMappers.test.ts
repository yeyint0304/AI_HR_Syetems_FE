/**
 * @jest-environment node
 */
import {
  mapBackendTimesheetPeriod,
  mapBackendTimesheetPeriodList,
  readBackendEnvelope,
} from "@/lib/server/timesheetPeriodResponseMappers";

describe("timesheetPeriodResponseMappers", () => {
  describe("readBackendEnvelope", () => {
    it("reads a successful list envelope (per the saved 'Get All Timesheet Periods' example)", () => {
      const envelope = readBackendEnvelope({
        StatusCode: 200,
        IsSuccess: true,
        Message: "Success",
        Data: [
          {
            Id: "a516eb81-806c-489d-a2a8-be63e1e3e1d8",
            PeriodStart: "2025-01-01",
            PeriodEnd: "2025-02-16",
            IsLocked: false,
            LockedAt: null,
            LockedBy: null,
            CreatedAt: "2026-06-22T01:19:18",
            UpdatedAt: "0001-01-01T00:00:00",
          },
        ],
      });

      expect(envelope.isSuccess).toBe(true);
      expect(envelope.statusCode).toBe(200);
      expect(Array.isArray(envelope.data)).toBe(true);
    });

    it("reads a logical-failure envelope returned at HTTP 200 (per the saved 'not found' example)", () => {
      const envelope = readBackendEnvelope({
        StatusCode: 404,
        IsSuccess: false,
        Message: "Timesheet period not found.",
        Data: null,
      });

      expect(envelope.isSuccess).toBe(false);
      expect(envelope.statusCode).toBe(404);
      expect(envelope.message).toBe("Timesheet period not found.");
      expect(envelope.data).toBeNull();
    });

    it("defaults to a successful envelope for a bare (non-enveloped) payload", () => {
      const envelope = readBackendEnvelope({ foo: "bar" });
      expect(envelope.isSuccess).toBe(true);
      expect(envelope.statusCode).toBe(200);
    });
  });

  describe("mapBackendTimesheetPeriod", () => {
    it("maps a PascalCase timesheet period (per the saved 'Create Timesheet Period' example)", () => {
      expect(
        mapBackendTimesheetPeriod({
          Id: "a516eb81-806c-489d-a2a8-be63e1e3e1d8",
          PeriodStart: "2025-01-01",
          PeriodEnd: "2025-02-16",
          IsLocked: false,
          CreatedAt: "2026-06-22T01:19:17.9821211Z",
        })
      ).toEqual({
        id: "a516eb81-806c-489d-a2a8-be63e1e3e1d8",
        periodStart: "2025-01-01",
        periodEnd: "2025-02-16",
        isLocked: false,
        lockedAt: null,
        lockedBy: null,
        createdAt: "2026-06-22T01:19:17.9821211Z",
        updatedAt: null,
      });
    });

    it("maps a camelCase timesheet period", () => {
      expect(
        mapBackendTimesheetPeriod({
          id: "1",
          periodStart: "2025-01-01",
          periodEnd: "2025-02-16",
          isLocked: true,
          lockedAt: "2026-06-22T01:26:23.93Z",
        })
      ).toEqual(
        expect.objectContaining({ id: "1", periodStart: "2025-01-01", isLocked: true })
      );
    });

    it("returns null when required fields are missing", () => {
      expect(mapBackendTimesheetPeriod({ Id: "1" })).toBeNull();
      expect(mapBackendTimesheetPeriod(null)).toBeNull();
      expect(mapBackendTimesheetPeriod("not-an-object")).toBeNull();
    });
  });

  describe("mapBackendTimesheetPeriodList", () => {
    it("extracts a bare array", () => {
      const result = mapBackendTimesheetPeriodList([
        { Id: "1", PeriodStart: "2025-01-01", PeriodEnd: "2025-02-16" },
      ]);
      expect(result).toHaveLength(1);
    });

    it("extracts a { data: [...] } wrapper", () => {
      const result = mapBackendTimesheetPeriodList({
        data: [{ Id: "1", PeriodStart: "2025-01-01", PeriodEnd: "2025-02-16" }],
      });
      expect(result).toHaveLength(1);
    });

    it("returns an empty array for an unrecognized shape", () => {
      expect(mapBackendTimesheetPeriodList({ unexpected: true })).toEqual([]);
    });

    it("returns an empty array when Data is null (e.g. after unwrapping a delete/unlock envelope)", () => {
      expect(mapBackendTimesheetPeriodList(null)).toEqual([]);
    });
  });
});

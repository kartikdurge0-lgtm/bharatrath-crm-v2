import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

type Staff = {
  id: number;
  name: string;
  email: string | null;
};

type Status = "Present" | "Absent" | "Half Day" | "Leave";
type MeetingStatus = "Present" | "Absent";
type Location = "Office" | "WFH" | "Field";

type Attendance = {
  id?: number;
  sales_person_id: number;
  attendance_date: string;
  status: Status;
  work_location: Location | "";
  work_update: string;
  blockers: string;
  remarks: string;
  check_in: string;
};

type AttendanceRecord = {
  id: number;
  sales_person_id: number | null;
  attendance_date: string;
  status: Status;
  work_location: Location | null;
  work_update: string | null;
  blockers: string | null;
  remarks: string | null;
  check_in: string | null;
};

type MeetingAttendanceRecord = {
  meeting_id: number;
  sales_person_id: number | null;
  status: MeetingStatus;
};

type MeetingRow = {
  id: number;
  meeting_date: string;
  meeting_time: string | null;
  agenda: string | null;
  notes: string | null;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const getMonthStart = (date: string) => `${date.slice(0, 7)}-01`;

const getMonthEnd = (date: string) => {
  const [year, month] = date.split("-").map(Number);
  return `${date.slice(0, 7)}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
};

const statuses: Status[] = ["Present", "Absent", "Half Day", "Leave"];
const locations: Location[] = ["WFH", "Office", "Field"];

const blankRow = (
  staffId: number,
  date: string,
  location: Location | "",
): Attendance => ({
  sales_person_id: staffId,
  attendance_date: date,
  status: "Present",
  work_location: location,
  work_update: "",
  blockers: "",
  remarks: "",
  check_in: "",
});

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-green-500 focus:outline-none disabled:bg-slate-100";
const selectClass =
  "w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-green-500 focus:outline-none disabled:bg-slate-100";

function codeForStatus(status: Status): string {
  if (status === "Present") return "P";
  if (status === "Absent") return "AB";
  if (status === "Half Day") return "HD";
  return "L";
}

function statusPillClass(status: Status): string {
  if (status === "Present") return "bg-green-50 text-green-700";
  if (status === "Absent") return "bg-red-50 text-red-700";
  if (status === "Half Day") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function DailyStatus() {
  const [date, setDate] = useState(today);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rows, setRows] = useState<Record<number, Attendance>>({});
  const [meetingStatuses, setMeetingStatuses] = useState<
    Record<number, MeetingStatus>
  >({});
  const [monthRows, setMonthRows] = useState<AttendanceRecord[]>([]);
  const [monthMeetingRows, setMonthMeetingRows] = useState<
    MeetingAttendanceRecord[]
  >([]);
  const [monthMeetingDates, setMonthMeetingDates] = useState<
    Record<number, string>
  >({});
  const [historyPage, setHistoryPage] = useState(1);
  const historyPageSize = 7;
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [meeting, setMeeting] = useState<MeetingRow | null>(null);
  const [meetingTime, setMeetingTime] = useState("10:00");
  const [agenda, setAgenda] = useState("Daily work planning");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Please log in to continue.");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const administrator =
        profile?.role === "Administrator" && profile?.is_active === true;
      setIsAdmin(administrator);

      const { data: staffData, error: staffError } = await supabase
        .from("sales_persons")
        .select("id, name, email")
        .eq("type", "Staff")
        .eq("is_active", true)
        .order("name", { ascending: true });
      if (staffError) throw staffError;

      const activeStaff = (staffData ?? []) as Staff[];
      setStaff(activeStaff);

      const start = getMonthStart(date);
      const end = getMonthEnd(date);
      const { data: monthlyData, error: monthlyError } = await supabase
        .from("staff_attendance")
        .select(
          "id, sales_person_id, attendance_date, status, work_location, work_update, blockers, remarks, check_in",
        )
        .not("sales_person_id", "is", null)
        .gte("attendance_date", start)
        .lte("attendance_date", end)
        .order("attendance_date", { ascending: true });
      if (monthlyError) throw monthlyError;
      const monthly = (monthlyData ?? []) as AttendanceRecord[];
      setMonthRows(monthly);

      const { data: meetingsInMonth, error: meetingsInMonthError } =
        await supabase
          .from("morning_meetings")
          .select("id, meeting_date")
          .gte("meeting_date", start)
          .lte("meeting_date", end)
          .order("meeting_date", { ascending: false });
      if (meetingsInMonthError) throw meetingsInMonthError;

      const meetingIds = (meetingsInMonth ?? []).map(
        (item) => item.id as number,
      );
      const meetingDates: Record<number, string> = {};
      for (const item of meetingsInMonth ?? []) {
        meetingDates[item.id as number] = item.meeting_date as string;
      }
      setMonthMeetingDates(meetingDates);
      if (meetingIds.length > 0) {
        const {
          data: meetingAttendanceRows,
          error: meetingAttendanceRowsError,
        } = await supabase
          .from("morning_meeting_attendance")
          .select("meeting_id, sales_person_id, status")
          .in("meeting_id", meetingIds)
          .not("sales_person_id", "is", null);
        if (meetingAttendanceRowsError) throw meetingAttendanceRowsError;
        setMonthMeetingRows(
          (meetingAttendanceRows ?? []) as MeetingAttendanceRecord[],
        );
      } else {
        setMonthMeetingRows([]);
      }

      const { data: previousData, error: previousError } = await supabase
        .from("staff_attendance")
        .select("sales_person_id, attendance_date, work_location")
        .not("sales_person_id", "is", null)
        .lt("attendance_date", date)
        .not("work_location", "is", null)
        .order("attendance_date", { ascending: false });
      if (previousError) throw previousError;

      const previousLocations: Record<number, Location> = {};
      for (const item of previousData ?? []) {
        const id = item.sales_person_id as number;
        if (
          previousLocations[id] === undefined &&
          locations.includes(item.work_location as Location)
        ) {
          previousLocations[id] = item.work_location as Location;
        }
      }

      const { data: dailyData, error: dailyError } = await supabase
        .from("staff_attendance")
        .select(
          "id, sales_person_id, attendance_date, status, work_location, work_update, blockers, remarks, check_in",
        )
        .not("sales_person_id", "is", null)
        .eq("attendance_date", date);
      if (dailyError) throw dailyError;

      const nextRows: Record<number, Attendance> = {};
      for (const person of activeStaff) {
        nextRows[person.id] = blankRow(
          person.id,
          date,
          previousLocations[person.id] ?? "",
        );
      }
      for (const item of (dailyData ?? []) as AttendanceRecord[]) {
        if (item.sales_person_id === null) continue;
        nextRows[item.sales_person_id] = {
          ...blankRow(item.sales_person_id, date, ""),
          ...item,
          sales_person_id: item.sales_person_id,
          work_location: item.work_location ?? "",
          work_update: item.work_update ?? "",
          blockers: item.blockers ?? "",
          remarks: item.remarks ?? "",
          check_in: item.check_in ? String(item.check_in).slice(0, 5) : "",
        };
      }
      setRows(nextRows);

      const { data: meetingData, error: meetingError } = await supabase
        .from("morning_meetings")
        .select("id, meeting_date, meeting_time, agenda, notes")
        .eq("meeting_date", date)
        .maybeSingle();
      if (meetingError) throw meetingError;

      const currentMeeting = (meetingData ?? null) as MeetingRow | null;
      setMeeting(currentMeeting);
      setMeetingTime(
        currentMeeting?.meeting_time
          ? String(currentMeeting.meeting_time).slice(0, 5)
          : "10:00",
      );
      setAgenda(currentMeeting?.agenda ?? "Daily work planning");
      setMeetingNotes(currentMeeting?.notes ?? "");

      const nextMeetingStatuses: Record<number, MeetingStatus> = {};
      if (currentMeeting) {
        const { data: meetingAttendance, error: meetingAttendanceError } =
          await supabase
            .from("morning_meeting_attendance")
            .select("sales_person_id, status")
            .eq("meeting_id", currentMeeting.id)
            .not("sales_person_id", "is", null);
        if (meetingAttendanceError) throw meetingAttendanceError;

        for (const item of meetingAttendance ?? []) {
          if (item.sales_person_id !== null) {
            nextMeetingStatuses[item.sales_person_id as number] =
              item.status as MeetingStatus;
          }
        }
      }

      for (const person of activeStaff) {
        if (nextMeetingStatuses[person.id]) continue;
        const saved = nextRows[person.id];
        nextMeetingStatuses[person.id] =
          saved?.status === "Absent" ? "Absent" : "Present";
      }
      setMeetingStatuses(nextMeetingStatuses);
    } catch (err) {
      console.error("Daily Status load failed:", err);
      setError(
        err instanceof Error ? err.message : "Unable to load Daily Status.",
      );
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const updateRow = (staffId: number, changes: Partial<Attendance>) => {
    setRows((current) => ({
      ...current,
      [staffId]: { ...current[staffId], ...changes },
    }));
  };

  const updateMeetingStatus = (staffId: number, status: MeetingStatus) => {
    setMeetingStatuses((current) => ({ ...current, [staffId]: status }));
    // Meeting status prefills daily attendance, but an administrator can edit it afterwards.
    setRows((current) => ({
      ...current,
      [staffId]: {
        ...current[staffId],
        status:
          current[staffId]?.status === "Half Day" ||
          current[staffId]?.status === "Leave"
            ? current[staffId].status
            : status,
      },
    }));
  };

  const shareMeetingOnWhatsApp = async () => {
    const meetingPresent = staff.filter(
      (person) => (meetingStatuses[person.id] ?? "Present") === "Present",
    );
    const meetingAbsent = staff.filter(
      (person) => (meetingStatuses[person.id] ?? "Present") === "Absent",
    );
    const formattedDate = new Date(`${date}T12:00:00`).toLocaleDateString(
      "en-IN",
      { day: "2-digit", month: "short", year: "numeric" },
    );
    const notes = meetingNotes.trim() || "No meeting notes added.";

    const messageText = [
      "*Bharatrath - Morning Meeting Summary*",
      "",
      `Date: ${formattedDate}`,
      `Time: ${meetingTime || "Not set"}`,
      `Agenda: ${agenda.trim() || "Daily work planning"}`,
      "",
      "*Meeting Points / Action Items:*",
      ...notes
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
      "",
      "*Attendance Summary:*",
      `Present (${meetingPresent.length}): ${
        meetingPresent.map((person) => person.name).join(", ") || "None"
      }`,
      `Absent (${meetingAbsent.length}): ${
        meetingAbsent.map((person) => person.name).join(", ") || "None"
      }`,
    ].join("\n");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(messageText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = messageText;
        textArea.setAttribute("readonly", "");
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.select();
        const copied = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (!copied) throw new Error("Copy command was not successful.");
      }
      setError("");
      setMessage(
        "Meeting summary copied. Paste it into WhatsApp, email, or any chat.",
      );
    } catch (err) {
      console.error("Copy meeting summary failed:", err);
      setError(
        "Could not copy automatically. Please try again or copy the meeting details manually.",
      );
    }
  };

  const saveAll = async () => {
    if (!isAdmin) {
      setError("Only an active Administrator can save meeting and attendance.");
      return;
    }
    if (!staff.length) {
      setError("No active Staff records found.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!auth.user) throw new Error("Please log in again.");

      let meetingId = meeting?.id;
      const meetingPayload = {
        meeting_date: date,
        meeting_time: meetingTime || null,
        agenda: agenda.trim() || null,
        notes: meetingNotes.trim() || null,
        created_by: auth.user.id,
      };

      if (meetingId) {
        const { error: updateMeetingError } = await supabase
          .from("morning_meetings")
          .update({
            meeting_time: meetingPayload.meeting_time,
            agenda: meetingPayload.agenda,
            notes: meetingPayload.notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", meetingId);
        if (updateMeetingError) throw updateMeetingError;
      } else {
        const { data: newMeeting, error: insertMeetingError } = await supabase
          .from("morning_meetings")
          .insert(meetingPayload)
          .select("id, meeting_date, meeting_time, agenda, notes")
          .single();
        if (insertMeetingError) throw insertMeetingError;
        meetingId = newMeeting.id;
      }

      for (const person of staff) {
        const meetingStatus = meetingStatuses[person.id] ?? "Present";
        const {
          data: existingMeetingAttendance,
          error: findMeetingAttendanceError,
        } = await supabase
          .from("morning_meeting_attendance")
          .select("id")
          .eq("meeting_id", meetingId)
          .eq("sales_person_id", person.id)
          .maybeSingle();
        if (findMeetingAttendanceError) throw findMeetingAttendanceError;

        const meetingAttendancePayload = {
          meeting_id: meetingId,
          staff_id: null,
          sales_person_id: person.id,
          status: meetingStatus,
          updated_at: new Date().toISOString(),
        };

        if (existingMeetingAttendance) {
          const { error: updateMeetingAttendanceError } = await supabase
            .from("morning_meeting_attendance")
            .update(meetingAttendancePayload)
            .eq("id", existingMeetingAttendance.id);
          if (updateMeetingAttendanceError) throw updateMeetingAttendanceError;
        } else {
          const { error: insertMeetingAttendanceError } = await supabase
            .from("morning_meeting_attendance")
            .insert(meetingAttendancePayload);
          if (insertMeetingAttendanceError) throw insertMeetingAttendanceError;
        }

        const row = rows[person.id] ?? blankRow(person.id, date, "");
        const attendancePayload = {
          sales_person_id: person.id,
          staff_id: null,
          attendance_date: date,
          status: row.status,
          work_location: row.work_location || null,
          work_update: row.work_update.trim() || null,
          blockers: row.blockers.trim() || null,
          remarks: row.remarks.trim() || null,
          check_in: row.check_in || null,
          marked_by: auth.user.id,
          updated_at: new Date().toISOString(),
        };

        const { data: existingAttendance, error: findAttendanceError } =
          await supabase
            .from("staff_attendance")
            .select("id")
            .eq("sales_person_id", person.id)
            .eq("attendance_date", date)
            .maybeSingle();
        if (findAttendanceError) throw findAttendanceError;

        if (existingAttendance) {
          const { error: updateAttendanceError } = await supabase
            .from("staff_attendance")
            .update(attendancePayload)
            .eq("id", existingAttendance.id);
          if (updateAttendanceError) throw updateAttendanceError;
        } else {
          const { error: insertAttendanceError } = await supabase
            .from("staff_attendance")
            .insert(attendancePayload);
          if (insertAttendanceError) throw insertAttendanceError;
        }
      }

      setMessage(`Morning meeting and attendance saved for ${date}.`);
      await loadData();
    } catch (err) {
      console.error("Save meeting and attendance failed:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save meeting and attendance.",
      );
    } finally {
      setSaving(false);
    }
  };

  const countStatus = (status: Status) =>
    staff.filter((person) => rows[person.id]?.status === status).length;

  const present = countStatus("Present");
  const absent = countStatus("Absent");
  const notSet = staff.filter(
    (person) => !rows[person.id]?.work_location,
  ).length;

  const displayMonth = useMemo(
    () =>
      new Date(`${date.slice(0, 7)}-01T12:00:00`).toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      }),
    [date],
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [date]);

  const dailySummary = useMemo(() => {
    // Include dates saved in either attendance or meeting records.
    const savedDates = new Set<string>();
    const attendanceByDate = new Map<string, AttendanceRecord[]>();

    for (const row of monthRows) {
      savedDates.add(row.attendance_date);
      const current = attendanceByDate.get(row.attendance_date) ?? [];
      current.push(row);
      attendanceByDate.set(row.attendance_date, current);
    }

    Object.values(monthMeetingDates).forEach((meetingDate) => {
      savedDates.add(meetingDate);
    });

    return Array.from(savedDates)
      .sort((a, b) => b.localeCompare(a))
      .map((summaryDate) => {
        const records = attendanceByDate.get(summaryDate) ?? [];
        const meetingRecords = monthMeetingRows.filter(
          (meetingRow) =>
            monthMeetingDates[meetingRow.meeting_id] === summaryDate,
        );

        return {
          date: summaryDate,
          present: records.filter((row) => row.status === "Present").length,
          absent: records.filter((row) => row.status === "Absent").length,
          halfDay: records.filter((row) => row.status === "Half Day").length,
          leave: records.filter((row) => row.status === "Leave").length,
          wfh: records.filter((row) => row.work_location === "WFH").length,
          office: records.filter((row) => row.work_location === "Office")
            .length,
          field: records.filter((row) => row.work_location === "Field").length,
          meetingPresent: meetingRecords.filter(
            (row) => row.status === "Present",
          ).length,
          meetingAbsent: meetingRecords.filter((row) => row.status === "Absent")
            .length,
        };
      });
  }, [monthRows, monthMeetingRows, monthMeetingDates]);

  const historyTotalPages = Math.max(
    1,
    Math.ceil(dailySummary.length / historyPageSize),
  );
  const pagedDailySummary = dailySummary.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize,
  );

  const exportCsv = () => {
    const [year, month] = date.slice(0, 7).split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const monthDates = Array.from(
      { length: daysInMonth },
      (_, index) => `${date.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`,
    );

    const statusCode = (status: Status | undefined) => {
      if (status === "Present") return "P";
      if (status === "Absent") return "AB";
      if (status === "Half Day") return "HD";
      if (status === "Leave") return "L";
      return "—";
    };

    // Header row 1: report title
    const titleRow: (string | number)[] = [
      `Monthly Attendance - ${displayMonth}`,
    ];

    // Header row 2: grouped headings, matching the UI report
    const groupHeader: (string | number)[] = [
      "Employee",
      ...monthDates.map((day) => Number(day.slice(-2))),
      "Attendance Total",
      "",
      "",
      "",
      "Work Location",
      "",
      "",
      "Meeting",
      "",
    ];

    // Header row 3: weekdays and individual total columns
    const detailHeader: (string | number)[] = [
      "",
      ...monthDates.map((day) =>
        new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", {
          weekday: "short",
        }),
      ),
      "P",
      "AB",
      "HD",
      "L",
      "WFH",
      "Office",
      "Field",
      "P",
      "AB",
    ];

    const dataRows: (string | number)[][] = staff.map((person) => {
      const personRows = monthRows.filter(
        (row) => row.sales_person_id === person.id,
      );

      const meetingPresentCount = monthMeetingRows.filter(
        (item) =>
          item.sales_person_id === person.id && item.status === "Present",
      ).length;

      const meetingAbsentCount = monthMeetingRows.filter(
        (item) =>
          item.sales_person_id === person.id && item.status === "Absent",
      ).length;

      return [
        person.name,
        ...monthDates.map((day) => {
          const record = personRows.find((row) => row.attendance_date === day);
          return statusCode(record?.status);
        }),
        personRows.filter((row) => row.status === "Present").length,
        personRows.filter((row) => row.status === "Absent").length,
        personRows.filter((row) => row.status === "Half Day").length,
        personRows.filter((row) => row.status === "Leave").length,
        personRows.filter((row) => row.work_location === "WFH").length,
        personRows.filter((row) => row.work_location === "Office").length,
        personRows.filter((row) => row.work_location === "Field").length,
        meetingPresentCount,
        meetingAbsentCount,
      ];
    });

    // Daily total: count Present employees for each date
    const dailyTotalRow: (string | number)[] = [
      "Daily Total",
      ...monthDates.map((day) => {
        const count = monthRows.filter(
          (row) => row.attendance_date === day && row.status === "Present",
        ).length;
        return count || "—";
      }),
      monthRows.filter((row) => row.status === "Present").length,
      monthRows.filter((row) => row.status === "Absent").length,
      monthRows.filter((row) => row.status === "Half Day").length,
      monthRows.filter((row) => row.status === "Leave").length,
      monthRows.filter((row) => row.work_location === "WFH").length,
      monthRows.filter((row) => row.work_location === "Office").length,
      monthRows.filter((row) => row.work_location === "Field").length,
      monthMeetingRows.filter((item) => item.status === "Present").length,
      monthMeetingRows.filter((item) => item.status === "Absent").length,
    ];

    // Escape CSV cells safely for Excel
    const quote = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csv = [
      titleRow,
      groupHeader,
      detailHeader,
      ...dataRows,
      dailyTotalRow,
    ]
      .map((line) => line.map(quote).join(","))
      .join("\r\n");

    // BOM helps Excel open UTF-8 CSV correctly
    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `staff-attendance-${date.slice(0, 7)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 pb-8">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold tracking-wide text-green-700">
            TEAM HUB
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Daily Status
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Morning meeting, attendance and work location
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="attendance-date" className="text-sm text-slate-600">
            Date
          </label>
          <input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`${inputClass} mt-0 w-auto`}
          />
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading || saving}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Active Staff</p>
          <p className="mt-1 text-xl font-bold">{staff.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Present</p>
          <p className="mt-1 text-xl font-bold text-green-700">{present}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-xs text-slate-500">Absent</p>
          <p className="mt-1 text-xl font-bold text-red-600">{absent}</p>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {!isAdmin && !loading && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
          View-only access. Only an Administrator can save meeting and
          attendance.
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-900">Morning Meeting</h2>
          <p className="mt-1 text-xs text-slate-500">
            Mark meeting attendance here. It prefills daily attendance below;
            save everything once.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 sm:grid-cols-[140px_1fr]">
          <label className="text-xs font-medium text-slate-600">
            Meeting time
            <input
              type="time"
              value={meetingTime}
              disabled={!isAdmin}
              onChange={(event) => setMeetingTime(event.target.value)}
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Agenda
            <input
              value={agenda}
              disabled={!isAdmin}
              onChange={(event) => setAgenda(event.target.value)}
              placeholder="Daily work planning"
              className={inputClass}
            />
          </label>
          <label className="text-xs font-medium text-slate-600 sm:col-span-2">
            Meeting notes / decisions (optional)
            <textarea
              rows={2}
              value={meetingNotes}
              disabled={!isAdmin}
              onChange={(event) => setMeetingNotes(event.target.value)}
              placeholder="Key decisions or action items"
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={shareMeetingOnWhatsApp}
              disabled={staff.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
            >
              <span aria-hidden="true">↗</span>
              Share Meeting on WhatsApp
            </button>
            <span className="text-xs text-slate-500">
              Copies the summary. Paste it into WhatsApp, email, or any chat.
            </span>
          </div>
        </div>
        {loading ? (
          <p className="p-5 text-center text-sm text-slate-500">
            Loading staff...
          </p>
        ) : staff.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            No active Staff records found. Add Staff under Settings → Team &
            Sales Persons.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {staff.map((person) => (
              <div
                key={person.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {person.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {person.email || "Staff"}
                  </p>
                </div>
                <span className="text-xs text-slate-500">
                  Meeting attendance
                </span>
                <select
                  aria-label={`Meeting attendance for ${person.name}`}
                  value={meetingStatuses[person.id] ?? "Present"}
                  disabled={!isAdmin}
                  onChange={(event) =>
                    updateMeetingStatus(
                      person.id,
                      event.target.value as MeetingStatus,
                    )
                  }
                  className={`${selectClass} sm:w-36`}
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="font-semibold text-slate-900">
              Daily Attendance & Work Location
            </h2>
            <p className="text-xs text-slate-500">
              Meeting attendance prefills status; you can correct attendance
              separately.
            </p>
          </div>
          <span className="whitespace-nowrap text-xs text-slate-500">
            {notSet} locations not set
          </span>
        </div>
        {loading ? (
          <p className="p-6 text-center text-sm text-slate-500">
            Loading attendance...
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {staff.map((person) => {
              const row = rows[person.id] ?? blankRow(person.id, date, "");
              const isExpanded = !!expanded[person.id];
              return (
                <div key={person.id} className="px-3 py-3 sm:px-4">
                  <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(140px,1fr)_130px_120px_auto]">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {person.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Daily status:{" "}
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${statusPillClass(row.status)}`}
                        >
                          {codeForStatus(row.status)}
                        </span>
                      </p>
                    </div>
                    <select
                      aria-label={`Daily attendance status for ${person.name}`}
                      value={row.status}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        updateRow(person.id, {
                          status: event.target.value as Status,
                        })
                      }
                      className={selectClass}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={`Work location for ${person.name}`}
                      value={row.work_location}
                      disabled={!isAdmin}
                      onChange={(event) =>
                        updateRow(person.id, {
                          work_location: event.target.value as Location | "",
                        })
                      }
                      className={selectClass}
                    >
                      <option value="">Location</option>
                      {locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((current) => ({
                          ...current,
                          [person.id]: !current[person.id],
                        }))
                      }
                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {isExpanded ? "Hide details −" : "Work update +"}
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2">
                      <label className="text-xs font-medium text-slate-600">
                        Daily work update
                        <textarea
                          rows={2}
                          value={row.work_update}
                          disabled={!isAdmin}
                          onChange={(event) =>
                            updateRow(person.id, {
                              work_update: event.target.value,
                            })
                          }
                          placeholder="Tasks planned or completed"
                          className={inputClass}
                        />
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        Blockers / issues
                        <textarea
                          rows={2}
                          value={row.blockers}
                          disabled={!isAdmin}
                          onChange={(event) =>
                            updateRow(person.id, {
                              blockers: event.target.value,
                            })
                          }
                          placeholder="Pending work or issue"
                          className={inputClass}
                        />
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        Check-in time (optional)
                        <input
                          type="time"
                          value={row.check_in}
                          disabled={!isAdmin}
                          onChange={(event) =>
                            updateRow(person.id, {
                              check_in: event.target.value,
                            })
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="text-xs font-medium text-slate-600">
                        Remarks (optional)
                        <input
                          value={row.remarks}
                          disabled={!isAdmin}
                          onChange={(event) =>
                            updateRow(person.id, {
                              remarks: event.target.value,
                            })
                          }
                          placeholder="Additional notes"
                          className={inputClass}
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
          <p className="text-xs text-slate-500">
            {date} · Meeting and daily attendance are saved together.
          </p>
          {isAdmin && (
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={loading || saving || staff.length === 0}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Meeting & Attendance"}
            </button>
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">Monthly Report</h2>
            <p className="text-sm text-slate-500">{displayMonth}</p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            disabled={staff.length === 0}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-3 sm:grid-cols-4">
          {[
            {
              label: "Present entries",
              value: monthRows.filter((r) => r.status === "Present").length,
            },
            {
              label: "Absent entries",
              value: monthRows.filter((r) => r.status === "Absent").length,
            },
            {
              label: "WFH days",
              value: monthRows.filter((r) => r.work_location === "WFH").length,
            },
            {
              label: "Office days",
              value: monthRows.filter((r) => r.work_location === "Office")
                .length,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{item.label}</p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto">
          {(() => {
            const [year, month] = date.slice(0, 7).split("-").map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();
            const monthDates = Array.from(
              { length: daysInMonth },
              (_, index) =>
                `${date.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`,
            );
            const statusCode = (status: Status | undefined) => {
              if (status === "Present") return "P";
              if (status === "Absent") return "AB";
              if (status === "Half Day") return "HD";
              if (status === "Leave") return "L";
              return "—";
            };
            const statusClass = (status: Status | undefined) => {
              if (status === "Present") return "bg-green-50 text-green-700";
              if (status === "Absent") return "bg-red-50 text-red-700";
              if (status === "Half Day") return "bg-amber-50 text-amber-700";
              if (status === "Leave") return "bg-slate-100 text-slate-700";
              return "text-slate-300";
            };
            return (
              <table className="w-full min-w-max text-center text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-10 min-w-40 border-r border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold"
                    >
                      Employee
                    </th>
                    {monthDates.map((day) => (
                      <th
                        key={day}
                        className="min-w-10 border-r border-slate-100 px-2 py-2 font-semibold"
                      >
                        {Number(day.slice(-2))}
                      </th>
                    ))}
                    <th
                      colSpan={4}
                      className="border-l border-slate-200 px-3 py-2 font-semibold"
                    >
                      Attendance Total
                    </th>
                    <th
                      colSpan={3}
                      className="border-l border-slate-200 px-3 py-2 font-semibold"
                    >
                      Work Location
                    </th>
                    <th
                      colSpan={2}
                      className="border-l border-slate-200 px-3 py-2 font-semibold"
                    >
                      Meeting
                    </th>
                  </tr>
                  <tr>
                    {monthDates.map((day) => (
                      <th
                        key={day}
                        className="border-r border-slate-100 px-2 py-2 font-normal"
                      >
                        {new Date(`${day}T12:00:00`).toLocaleDateString(
                          "en-IN",
                          { weekday: "short" },
                        )}
                      </th>
                    ))}
                    <th className="border-l border-slate-200 px-2 py-2 text-green-700">
                      P
                    </th>
                    <th className="px-2 py-2 text-red-600">AB</th>
                    <th className="px-2 py-2 text-amber-700">HD</th>
                    <th className="px-2 py-2">L</th>
                    <th className="border-l border-slate-200 px-2 py-2">WFH</th>
                    <th className="px-2 py-2">Office</th>
                    <th className="px-2 py-2">Field</th>
                    <th className="border-l border-slate-200 px-2 py-2 text-green-700">
                      P
                    </th>
                    <th className="px-2 py-2 text-red-600">AB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((person) => {
                    const personRows = monthRows.filter(
                      (row) => row.sales_person_id === person.id,
                    );
                    const rowForDate = (day: string) =>
                      personRows.find((row) => row.attendance_date === day);
                    const meetingPresentCount = monthMeetingRows.filter(
                      (item) =>
                        item.sales_person_id === person.id &&
                        item.status === "Present",
                    ).length;
                    const meetingAbsentCount = monthMeetingRows.filter(
                      (item) =>
                        item.sales_person_id === person.id &&
                        item.status === "Absent",
                    ).length;
                    return (
                      <tr key={person.id} className="hover:bg-slate-50">
                        <td className="sticky left-0 z-[1] border-r border-slate-200 bg-white px-3 py-3 text-left font-medium text-slate-800">
                          {person.name}
                        </td>
                        {monthDates.map((day) => {
                          const record = rowForDate(day);
                          return (
                            <td
                              key={day}
                              title={
                                record?.work_location
                                  ? `${statusCode(record.status)} · ${record.work_location}`
                                  : statusCode(record?.status)
                              }
                              className="border-r border-slate-100 px-2 py-2"
                            >
                              <span
                                className={`inline-flex min-w-7 justify-center rounded px-1.5 py-1 font-semibold ${statusClass(record?.status)}`}
                              >
                                {statusCode(record?.status)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="border-l border-slate-200 px-2 py-3 text-green-700">
                          {
                            personRows.filter((row) => row.status === "Present")
                              .length
                          }
                        </td>
                        <td className="px-2 py-3 text-red-600">
                          {
                            personRows.filter((row) => row.status === "Absent")
                              .length
                          }
                        </td>
                        <td className="px-2 py-3 text-amber-700">
                          {
                            personRows.filter(
                              (row) => row.status === "Half Day",
                            ).length
                          }
                        </td>
                        <td className="px-2 py-3">
                          {
                            personRows.filter((row) => row.status === "Leave")
                              .length
                          }
                        </td>
                        <td className="border-l border-slate-200 px-2 py-3">
                          {
                            personRows.filter(
                              (row) => row.work_location === "WFH",
                            ).length
                          }
                        </td>
                        <td className="px-2 py-3">
                          {
                            personRows.filter(
                              (row) => row.work_location === "Office",
                            ).length
                          }
                        </td>
                        <td className="px-2 py-3">
                          {
                            personRows.filter(
                              (row) => row.work_location === "Field",
                            ).length
                          }
                        </td>
                        <td className="border-l border-slate-200 px-2 py-3 text-green-700">
                          {meetingPresentCount}
                        </td>
                        <td className="px-2 py-3 text-red-600">
                          {meetingAbsentCount}
                        </td>
                      </tr>
                    );
                  })}
                  {staff.length === 0 && (
                    <tr>
                      <td
                        colSpan={daysInMonth + 10}
                        className="px-4 py-6 text-center text-slate-500"
                      >
                        No staff data available.
                      </td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                    <td className="sticky left-0 z-[1] border-r border-slate-200 bg-slate-50 px-3 py-3 text-left">
                      Daily total
                    </td>
                    {monthDates.map((day) => {
                      const records = monthRows.filter(
                        (row) => row.attendance_date === day,
                      );
                      const presentCount = records.filter(
                        (row) => row.status === "Present",
                      ).length;
                      return (
                        <td
                          key={day}
                          title={`${presentCount} present`}
                          className="border-r border-slate-100 px-2 py-2"
                        >
                          {presentCount || "—"}
                        </td>
                      );
                    })}
                    <td className="border-l border-slate-200 px-2 py-3 text-green-700">
                      {
                        monthRows.filter((row) => row.status === "Present")
                          .length
                      }
                    </td>
                    <td className="px-2 py-3 text-red-600">
                      {
                        monthRows.filter((row) => row.status === "Absent")
                          .length
                      }
                    </td>
                    <td className="px-2 py-3 text-amber-700">
                      {
                        monthRows.filter((row) => row.status === "Half Day")
                          .length
                      }
                    </td>
                    <td className="px-2 py-3">
                      {monthRows.filter((row) => row.status === "Leave").length}
                    </td>
                    <td className="border-l border-slate-200 px-2 py-3">
                      {
                        monthRows.filter((row) => row.work_location === "WFH")
                          .length
                      }
                    </td>
                    <td className="px-2 py-3">
                      {
                        monthRows.filter(
                          (row) => row.work_location === "Office",
                        ).length
                      }
                    </td>
                    <td className="px-2 py-3">
                      {
                        monthRows.filter((row) => row.work_location === "Field")
                          .length
                      }
                    </td>
                    <td className="border-l border-slate-200 px-2 py-3 text-green-700">
                      {
                        monthMeetingRows.filter(
                          (item) => item.status === "Present",
                        ).length
                      }
                    </td>
                    <td className="px-2 py-3 text-red-600">
                      {
                        monthMeetingRows.filter(
                          (item) => item.status === "Absent",
                        ).length
                      }
                    </td>
                  </tr>
                </tbody>
              </table>
            );
          })()}
        </div>
        <div className="border-t border-slate-200">
          <div className="flex flex-col justify-between gap-1 px-4 py-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-semibold text-slate-900">
                Daily Summary History
              </h3>
              <p className="text-xs text-slate-500">
                Saved days in {displayMonth}, latest first. Use the date picker
                above to view another month.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              {dailySummary.length} dates with saved attendance or meeting
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">P</th>
                  <th className="px-3 py-3 font-medium">AB</th>
                  <th className="px-3 py-3 font-medium">HD</th>
                  <th className="px-3 py-3 font-medium">L</th>
                  <th className="px-3 py-3 font-medium">WFH</th>
                  <th className="px-3 py-3 font-medium">Office</th>
                  <th className="px-3 py-3 font-medium">Field</th>
                  <th className="px-3 py-3 font-medium">Meeting P/AB</th>
                  <th className="px-3 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedDailySummary.map((item) => (
                  <tr key={item.date} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      {item.date}
                    </td>
                    <td className="px-3 py-3 text-green-700">{item.present}</td>
                    <td className="px-3 py-3 text-red-600">{item.absent}</td>
                    <td className="px-3 py-3 text-amber-700">{item.halfDay}</td>
                    <td className="px-3 py-3">{item.leave}</td>
                    <td className="px-3 py-3">{item.wfh}</td>
                    <td className="px-3 py-3">{item.office}</td>
                    <td className="px-3 py-3">{item.field}</td>
                    <td className="px-3 py-3">
                      {item.meetingPresent} / {item.meetingAbsent}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setDate(item.date)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:border-green-300 hover:bg-green-50"
                      >
                        View day
                      </button>
                    </td>
                  </tr>
                ))}
                {pagedDailySummary.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-4 py-6 text-center text-slate-500"
                    >
                      No saved daily summaries for this month yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Page {historyPage} of {historyTotalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={historyPage <= 1}
                onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={historyPage >= historyTotalPages}
                onClick={() =>
                  setHistoryPage((page) =>
                    Math.min(historyTotalPages, page + 1),
                  )
                }
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Only saved attendance records are counted. Missing records are not
          automatically counted as Absent. Meeting attendance is stored
          separately for meeting reporting.
        </p>
      </section>
    </div>
  );
}

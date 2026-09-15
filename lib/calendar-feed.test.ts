import { describe, expect, it } from "vitest";
import { expandFeed, parseFeedsConfig } from "@/lib/calendar-feed";

// Shaped like Google's "Secret address in iCal format" export. Asia/Ho_Chi_Minh
// is the calendar's zone; Europe/Moscow (+03, no DST) is there so the zone
// registration is actually tested: on a machine at +07, an unregistered
// Ho Chi Minh time happens to come out right anyway.
const ICS = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "VERSION:2.0",
  "CALSCALE:GREGORIAN",
  "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
  "BEGIN:VTIMEZONE",
  "TZID:Asia/Ho_Chi_Minh",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0700",
  "TZOFFSETTO:+0700",
  "TZNAME:GMT+7",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Moscow",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0300",
  "TZOFFSETTO:+0300",
  "TZNAME:MSK",
  "DTSTART:19700101T000000",
  "END:STANDARD",
  "END:VTIMEZONE",
  // Weekdays 09:00-17:30, Wednesday the 9th skipped, Thursday the 10th moved.
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260907T090000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260907T173000",
  "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
  "EXDATE;TZID=Asia/Ho_Chi_Minh:20260909T090000",
  "UID:work@google.com",
  "SUMMARY:Working Hour",
  "LOCATION:107 Nguyễn Đình Chiểu",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "RECURRENCE-ID;TZID=Asia/Ho_Chi_Minh:20260910T090000",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260910T130000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260910T180000",
  "UID:work@google.com",
  "SUMMARY:Working Hour (dời)",
  "END:VEVENT",
  // Fridays from the 4th, ten times; the 30 Oct one pulled forward to 19 Sep.
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260904T080000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260904T090000",
  "RRULE:FREQ=WEEKLY;COUNT=10",
  "UID:standup@google.com",
  "SUMMARY:Standup",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "RECURRENCE-ID;TZID=Asia/Ho_Chi_Minh:20261030T080000",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260919T080000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260919T090000",
  "UID:standup@google.com",
  "SUMMARY:Standup (dời lên sớm)",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260912",
  "DTEND;VALUE=DATE:20260913",
  "UID:birthday@google.com",
  "SUMMARY:Sinh nhật",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260914",
  "DTEND;VALUE=DATE:20260916",
  "UID:trip@google.com",
  "SUMMARY:Công tác",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20260913T153000Z",
  "DTEND:20260913T171500Z",
  "UID:match@google.com",
  "SUMMARY:Manchester United - Manchester City",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Europe/Moscow:20260911T120000",
  "DTEND;TZID=Europe/Moscow:20260911T130000",
  "UID:moscow@google.com",
  "SUMMARY:Call Moscow",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;TZID=Asia/Ho_Chi_Minh:20260911T190000",
  "DTEND;TZID=Asia/Ho_Chi_Minh:20260911T200000",
  "UID:cancelled@google.com",
  "STATUS:CANCELLED",
  "SUMMARY:Đã huỷ",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:20261201T020000Z",
  "DTEND:20261201T030000Z",
  "UID:later@google.com",
  "SUMMARY:Ngoài khoảng",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const week = () => expandFeed(ICS, "2026-09-07", "2026-09-14");
const startsOf = (title: string, events = week()) =>
  events.filter((e) => e.title === title).map((e) => e.start);

describe("expandFeed", () => {
  it("expands a weekly series in its own time zone", () => {
    expect(startsOf("Working Hour")).toEqual(
      expect.arrayContaining([
        "2026-09-07T02:00:00.000Z",
        "2026-09-08T02:00:00.000Z",
        "2026-09-11T02:00:00.000Z",
      ]),
    );
  });

  it("drops a date listed in EXDATE", () => {
    expect(startsOf("Working Hour")).not.toContain("2026-09-09T02:00:00.000Z");
  });

  it("shows a moved instance at its new time, not its old slot", () => {
    expect(startsOf("Working Hour")).not.toContain("2026-09-10T02:00:00.000Z");
    expect(week().find((e) => e.title === "Working Hour (dời)")).toMatchObject({
      start: "2026-09-10T06:00:00.000Z",
      end: "2026-09-10T11:00:00.000Z",
      allDay: false,
    });
  });

  it("finds an instance moved into the range from a slot after it", () => {
    const events = expandFeed(ICS, "2026-09-14", "2026-09-21");
    expect(startsOf("Standup (dời lên sớm)", events)).toEqual(["2026-09-19T01:00:00.000Z"]);
  });

  it("honours a zone other than the machine's", () => {
    expect(startsOf("Call Moscow")).toEqual(["2026-09-11T09:00:00.000Z"]);
  });

  it("keeps all-day events as dates with an exclusive end", () => {
    expect(week().find((e) => e.title === "Sinh nhật")).toMatchObject({
      allDay: true,
      start: "2026-09-12",
      end: "2026-09-13",
    });
    expect(week().find((e) => e.title === "Công tác")).toMatchObject({
      start: "2026-09-14",
      end: "2026-09-16",
    });
  });

  it("keeps UTC times as they are", () => {
    expect(week().find((e) => e.title.startsWith("Manchester"))).toMatchObject({
      start: "2026-09-13T15:30:00.000Z",
      end: "2026-09-13T17:15:00.000Z",
    });
  });

  it("carries location and gives each occurrence its own id", () => {
    const work = week().filter((e) => e.title === "Working Hour");
    expect(work[0].location).toBe("107 Nguyễn Đình Chiểu");
    expect(new Set(work.map((e) => e.id)).size).toBe(work.length);
  });

  it("skips cancelled events and events outside the range", () => {
    const titles = week().map((e) => e.title);
    expect(titles).not.toContain("Đã huỷ");
    expect(titles).not.toContain("Ngoài khoảng");
  });
});

describe("parseFeedsConfig", () => {
  const url = "https://calendar.google.com/calendar/ical/secret/basic.ics";

  it("reads a valid list", () => {
    expect(parseFeedsConfig(JSON.stringify([{ name: "MIT", color: "#16a34a", url }]))).toEqual({
      ok: true,
      feeds: [{ name: "MIT", color: "#16a34a", url }],
    });
  });

  it("fills in a colour when none or a bad one is given", () => {
    const config = parseFeedsConfig(JSON.stringify([{ name: "MIT", url, color: "green" }]));
    expect(config.ok && config.feeds[0].color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("turns webcal:// into https://", () => {
    const config = parseFeedsConfig(
      JSON.stringify([{ name: "Lễ", url: "webcal://example.com/holidays.ics" }]),
    );
    expect(config.ok && config.feeds[0].url).toBe("https://example.com/holidays.ics");
  });

  it.each([
    ["missing", undefined],
    ["blank", "  "],
    ["not JSON", "[{"],
    ["not an array", JSON.stringify({ name: "MIT", url })],
    ["an entry without url", JSON.stringify([{ name: "MIT" }])],
    ["plain http", JSON.stringify([{ name: "MIT", url: "http://example.com/a.ics" }])],
    ["two feeds with one name", JSON.stringify([{ name: "MIT", url }, { name: "MIT", url }])],
  ])("rejects %s", (_label, raw) => {
    expect(parseFeedsConfig(raw)).toMatchObject({ ok: false });
  });

  it("never puts the secret URL in an error", () => {
    const config = parseFeedsConfig(JSON.stringify([{ name: "MIT", url: "http://secret-token" }]));
    expect(config.ok).toBe(false);
    expect(!config.ok && config.error).not.toContain("secret-token");
  });
});

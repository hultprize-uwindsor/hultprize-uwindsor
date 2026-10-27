# Attendance email templates

Executable plain-text templates live in `attEmail_()` and `attEventText_()` in `google-apps-script/Attendance.gs`. They render the **current** event record when sent, with the attendee's per-event status. Tokens are generated at send time; only hashes are stored. No email body or raw management token is persisted in the delivery table.

| Message | Subject / content |
| --- | --- |
| Confirmed attendance | “You’re registered! Hult Prize at UWindsor.” Names each confirmed event and provides its schedule, venue and calendar link. |
| Mixed confirmation / waitlist | Identifies which events are confirmed and which have only a waitlist place. A waitlisted place does not reserve a seat. |
| Management link | “Your secure attendance management link.” View registrations, add events, update support needs and cancel individual events. Link expires after 48 hours and is single use. |
| Reminder | “Reminder: [event title].” Sent approximately 24 hours before a confirmed event; includes any preparation notes. Skipped if attendance or the event is cancelled or the event has started. |
| Seat offer | “A seat is available: [event title].” Explains that attendance is not yet confirmed, gives a Windsor-time acceptance deadline and an acceptance link. Offers last up to 24 hours, capped at the event start (or event end when issued during late registration). |
| Expired offer | “Your seat offer has expired.” Explains that the person remains waitlisted without a reserved seat; asks them to contact organisers if still interested. |
| Individual cancellation | “Your event attendance has been cancelled.” Confirms cancellation for that event; other attendance can be managed separately. |
| Cancelled event | “Event cancelled: [event title].” Explains that the organiser cancelled the event and no attendance reminder will be sent. |
| Material update | “Event update: [event title].” Provides current date, local time, full venue and attendance status. Triggered by the organiser's send-update control. |

Every event block contains title, status, day/date, Windsor start/end time with timezone, full venue including floor, supplied preparation instructions, and the free refreshments note. Confirmed events include Google Calendar and Outlook (Microsoft 365) links; the confirmation/manage page also offers an ICS download for Apple Calendar and other apps.

Every email includes a private management link, separate competition registration link and November 20, 2026 deadline, a reminder that each team member registers individually, and the approved Discord invite https://discord.gg/ybeQYQxcqZ by default. The optional `ATTENDANCE_DISCORD_URL` script property overrides the email invite; leave it unset to use the approved default shared with `SITE.discordUrl`. The global prize is identified as the US$1 million seed investment prize.

Delivery failures are retained and visible to organisers. Retrying a delivery does not recreate registrations. Sending is **disabled by default**. Use `ATTENDANCE_EMAIL_MODE=test` with explicit `ATTENDANCE_TEST_EMAILS` recipients in an isolated staging spreadsheet. Enable `live` only after reviewing the sender and recipient data.

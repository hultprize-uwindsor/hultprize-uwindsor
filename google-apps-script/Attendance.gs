/**
 * Dedicated event attendance deployment. Do NOT paste into the interest-form project.
 * Script properties: ATTENDANCE_SHARED_SECRET (32+ random characters), optional
 * ATTENDANCE_SHEET_ID, ATTENDANCE_SITE_URL, ATTENDANCE_REPLY_TO, ATTENDANCE_DISCORD_URL.
 * Run setupAttendance(), then installAttendanceTriggers(); deploy execute-as-owner,
 * Anyone access. All HTTP operations require the server's shared secret.
 * Follow-ups (thank-you cards, missed-you letters): sendFollowUpTest() previews them; sendFollowUpsForLatestEvent()
 * catches up a missed send. They are sent automatically only once ATTENDANCE_FOLLOW_UP_MODE is set to auto.
 * See docs/event-registration.md. Every mutation is serialised, journaled, then materialised.
 */
var ATT_TABLES = ['attendees', 'events', 'registrations', 'consents', 'deliveries', 'checkins', 'tokens', 'rateLimits'];
var ATT_CATEGORIES = ['undergraduate', 'graduate', 'other-student', 'sponsor', 'founder', 'faculty', 'alumni', 'community'];
var ATT_CONSENT = 'I understand that Hult Prize at UWindsor will use my details to manage my event registrations and send essential event updates.';
var ATT_MARKETING = 'Keep me updated about other Hult Prize at UWindsor events and opportunities.';
var ATT_DAY = 86400000;
// Follow-ups after each event: thank-you cards at 7 PM Windsor time that day (or an hour after it ends, if later)
// and missed-you letters at 10 AM the next morning. Each is queued for six hours from then, so a late check-in still
// counts but a long-past event never sends. Off until the ATTENDANCE_FOLLOW_UP_MODE script property is auto, so
// pasting this file never emails attendees before a test.
var ATT_THANKS_HOUR = 19;
var ATT_MISSED_HOUR = 10;
var ATT_FOLLOW_UP_WINDOW = 6 * 3600000;
// The Ticket Jar runs from its first event to the draw at the finale (src/data/blog.ts, the-ticket-jar).
var ATT_RAFFLE = { firstEventId: 'workshop-1', drawEventId: 'campus-grand-finale' };

function attProps_() { return PropertiesService.getScriptProperties(); }
function attJson_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function attError_(code, message) { var error = new Error(message || code); error.attCode = code; throw error; }
function attId_() { return Utilities.getUuid(); }
function attIso_(now) { return new Date(now).toISOString(); }
function attHash_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join(''); }
/** PRF keyed with a random server secret, not Math.random or a bare UUID. */
function attSecretToken_() { return Utilities.computeHmacSha256Signature(Utilities.getUuid() + ':' + Utilities.getUuid() + ':' + Date.now(), attProps_().getProperty('ATTENDANCE_SHARED_SECRET'), Utilities.Charset.UTF_8).map(function(byte) { return ('0' + ((byte + 256) % 256).toString(16)).slice(-2); }).join(''); }
function attSheet_() { var id = attProps_().getProperty('ATTENDANCE_SHEET_ID'); if (!id) attError_('unavailable'); return SpreadsheetApp.openById(id); }
function attReadTable_(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) attError_('unavailable');
  if (sheet.getLastRow() < 2) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues().filter(function(row) { return row[0] && row[1]; }).map(function(row) { return JSON.parse(row[1]); });
}
function attWriteTable_(ss, name, rows) {
  var sheet = ss.getSheetByName(name), previous = sheet.getLastRow() - 1;
  if (sheet.getMaxRows() < rows.length + 1) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length + 1 - sheet.getMaxRows());
  if (rows.length) sheet.getRange(2, 1, rows.length, 2).setValues(rows.map(function(row) { return [row.id, JSON.stringify(row)]; }));
  if (previous > rows.length) sheet.getRange(rows.length + 2, 1, previous - rows.length, 2).clearContent();
}
/** A single durable journal row makes a partial multi-tab write recoverable. */
function attApplyJournal_(ss, changes) {
  ATT_TABLES.forEach(function(table) {
    var updates = changes.filter(function(change) { return change.table === table; });
    if (!updates.length) return;
    var records = attReadTable_(ss, table);
    updates.forEach(function(update) { var index = records.findIndex(function(row) { return row.id === update.id; }); if (index >= 0) records.splice(index, 1); if (update.value !== null) records.push(update.value); });
    attWriteTable_(ss, table, records);
  });
  SpreadsheetApp.flush();
}
function attRecover_(ss) {
  var sheet = ss.getSheetByName('journal'), cells = sheet.getRange(2, 1, 1, 22).getValues()[0];
  if (cells[0] !== 'pending') return;
  var changes = JSON.parse(cells.slice(2).filter(Boolean).map(function(cell) { if (String(cell).slice(0, 5) !== 'data:') throw new Error('Invalid journal'); return String(cell).slice(5); }).join(''));
  attApplyJournal_(ss, changes);
  sheet.getRange(2, 1, 1, 22).clearContent();
  SpreadsheetApp.flush();
}
function attLoad_() {
  var ss = attSheet_(); attRecover_(ss);
  var db = { _ss: ss, _baseline: {} };
  ATT_TABLES.forEach(function(table) { db[table] = attReadTable_(ss, table); db._baseline[table] = JSON.stringify(db[table]); });
  return db;
}
function attCommit_(db) {
  var changes = [];
  ATT_TABLES.forEach(function(table) {
    var old = JSON.parse(db._baseline[table]), before = {}, after = {};
    old.forEach(function(row) { before[row.id] = JSON.stringify(row); });
    db[table].forEach(function(row) { after[row.id] = true; if (before[row.id] !== JSON.stringify(row)) changes.push({ table: table, id: row.id, value: row }); });
    old.forEach(function(row) { if (!after[row.id]) changes.push({ table: table, id: row.id, value: null }); });
  });
  if (!changes.length) return;
  var payload = JSON.stringify(changes), chunks = [];
  for (var index = 0; index < payload.length; index += 44000) chunks.push('data:' + payload.slice(index, index + 44000));
  if (chunks.length > 20) attError_('busy', 'This operation is too large. Contact the site maintainer.');
  while (chunks.length < 20) chunks.push('');
  db._ss.getSheetByName('journal').getRange(2, 1, 1, 22).setValues([['pending', attId_()].concat(chunks)]);
  SpreadsheetApp.flush();
  attApplyJournal_(db._ss, changes);
  db._ss.getSheetByName('journal').getRange(2, 1, 1, 22).clearContent();
  SpreadsheetApp.flush();
  ATT_TABLES.forEach(function(table) { db._baseline[table] = JSON.stringify(db[table]); });
}
function setupAttendance() {
  var props = attProps_(), secret = props.getProperty('ATTENDANCE_SHARED_SECRET');
  if (!secret || secret.length < 32) throw new Error('Set ATTENDANCE_SHARED_SECRET to 32+ random characters before setup.');
  if (!props.getProperty('ATTENDANCE_SHEET_ID')) props.setProperty('ATTENDANCE_SHEET_ID', SpreadsheetApp.create('Hult Prize UWindsor Event Attendance').getId());
  var ss = attSheet_();
  ATT_TABLES.concat(['journal']).forEach(function(name) { var sheet = ss.getSheetByName(name) || ss.insertSheet(name); if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, 2).setValues([name === 'journal' ? ['State', 'Transaction ID'] : ['ID', 'Record JSON']]); sheet.setFrozenRows(1); });
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try { var db = attLoad_(); attendanceEventSeed_().forEach(function(event) { if (!db.events.some(function(existing) { return existing.id === event.id; })) db.events.push(event); }); attCommit_(db); } finally { lock.releaseLock(); }
}
function installAttendanceTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) { if (trigger.getHandlerFunction() === 'attendanceMaintenance') ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('attendanceMaintenance').timeBased().everyMinutes(5).create();
}
function attLatestEvent_(db, now) { return attEvents_(db, now).filter(function(event) { return event.status !== 'cancelled' && Date.parse(event.endsAt) <= now; }).pop(); }
/**
 * Run from the Apps Script editor to preview the follow-ups for the latest event: a thank-you card and a missed-you
 * letter, each with and without the optional-updates invite. Sent to the first ATTENDANCE_TEST_EMAILS address only.
 * Nothing is queued.
 */
function sendFollowUpTest() {
  var to = (attProps_().getProperty('ATTENDANCE_TEST_EMAILS') || '').split(',')[0].trim().toLowerCase();
  if (!to) throw new Error('Add your email address to the ATTENDANCE_TEST_EMAILS script property first.');
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var db = attLoad_(), now = Date.now(), event = attLatestEvent_(db, now) || attEvents_(db, now)[0];
    // A registered tester gets a working sign-up button; otherwise it falls back to the public form.
    var person = db.attendees.find(function(item) { return item.email === to; }) || { id: 'follow-up-test', firstName: 'friend', email: to };
    ['thanks', 'missed'].forEach(function(type) {
      [true, false].forEach(function(updates) {
        var mail = attFollowUp_(db, event, person, now, updates, type);
        MailApp.sendEmail({ to: to, name: 'Hult Prize at UWindsor', replyTo: attProps_().getProperty('ATTENDANCE_REPLY_TO') || 'hultprizeatuwindsor@gmail.com', subject: '[Test' + (updates ? '' : ', no updates consent') + '] ' + mail.subject, body: mail.body, htmlBody: mail.htmlBody });
      });
    });
    attCommit_(db);
    console.log('Sent four test follow-ups for ' + event.title + ' to ' + to + '.');
  } finally { lock.releaseLock(); }
}
/**
 * Run from the Apps Script editor when follow-ups were missed (for example, before this feature was installed).
 * Queues everything already due for the most recent event that has ended: thank-you cards from 7 PM, missed-you
 * letters from 10 AM the next morning. Anyone who already has one is skipped. The first 15 send now; maintenance
 * sends the rest, 15 every five minutes.
 */
function sendFollowUpsForLatestEvent() {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var db = attLoad_(), now = Date.now(), event = attLatestEvent_(db, now);
    if (!event) throw new Error('No event has ended yet.');
    var report = ['thanks', 'missed'].map(function(type) {
      var at = attFollowUpAt_(type, event), name = type === 'missed' ? 'missed-you letters' : 'thank-you cards';
      if (now < at) return name + ' are not due until ' + Utilities.formatDate(new Date(at), 'America/Toronto', 'EEEE h:mm a z') + ' (run this again then, or let maintenance send them in auto mode)';
      return attQueueFollowUps_(db, event, type, now, true) + ' ' + name + ' queued';
    });
    attCommit_(db); attDeliver_(db, now, 15);
    console.log(event.title + ': ' + report.join('; ') + '. Check the organiser dashboard\'s Email delivery tab for progress. Emails left in today\'s MailApp quota: ' + MailApp.getRemainingDailyQuota() + '.');
  } finally { lock.releaseLock(); }
}
function attText_(value, max, required) { if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) attError_('invalid_request'); value = value.trim(); if (required && !value) attError_('invalid_request'); return value; }
function attValidatePerson_(input) {
  if (!input || typeof input !== 'object') attError_('invalid_request');
  var person = {};
  ['firstName', 'lastName', 'email'].forEach(function(key) { person[key] = attText_(input[key], key === 'email' ? 254 : 100, true); });
  ['institution', 'faculty', 'organisation', 'role', 'teamName', 'referral'].forEach(function(key) { person[key] = attText_(input[key] || '', 180); });
  ['dietary', 'accessibility'].forEach(function(key) { person[key] = attText_(input[key] || '', 1000); });
  person.email = person.email.toLowerCase(); person.category = input.category; person.withTeam = input.withTeam === true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(person.email) || /[\r\n]/.test(person.firstName + person.lastName + person.email) || ATT_CATEGORIES.indexOf(person.category) < 0) attError_('invalid_request');
  if (['undergraduate', 'graduate', 'other-student'].indexOf(person.category) >= 0 && (!person.institution || !person.faculty)) attError_('invalid_request');
  if (person.category === 'sponsor' && !person.organisation) attError_('invalid_request');
  if (!person.withTeam) person.teamName = '';
  return person;
}
function attValidateEvent_(input) {
  if (!input || typeof input !== 'object') attError_('invalid_request');
  var out = {};
  ['id', 'title', 'venue', 'description', 'preparation'].forEach(function(key) { out[key] = attText_(input[key] || '', key === 'id' ? 100 : 2000, key !== 'preparation'); });
  if (!/^[a-zA-Z0-9_-]+$/.test(out.id) || ['community', 'workshops', 'finale'].indexOf(input.group) < 0 || ['open', 'full', 'closed', 'cancelled', 'completed'].indexOf(input.status) < 0) attError_('invalid_request');
  if (input.capacity !== null && (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100000)) attError_('invalid_request');
  if (input.timeZone !== 'America/Toronto' || typeof input.allowLateRegistration !== 'boolean' || ![input.startsAt, input.endsAt].every(function(value) { return typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) && isFinite(Date.parse(value)); }) || Date.parse(input.endsAt) <= Date.parse(input.startsAt)) attError_('invalid_request');
  ['group', 'status', 'capacity', 'timeZone', 'allowLateRegistration', 'startsAt', 'endsAt'].forEach(function(key) { out[key] = input[key]; });
  return out;
}
function attRate_(db, key, max, window, now) {
  var id = attHash_(key), row = db.rateLimits.find(function(record) { return record.id === id; });
  if (!row) { row = { id: id, count: 0, expiresAt: now + window }; db.rateLimits.push(row); }
  if (row.expiresAt <= now) { row.count = 0; row.expiresAt = now + window; }
  row.count += 1;
  if (row.count > max) attError_('rate_limited', 'Too many requests. Please wait a few minutes and try again.');
}
function attReserved_(db, eventId, now) { return db.registrations.filter(function(registration) { return registration.eventId === eventId && (registration.status === 'confirmed' || (registration.status === 'offered' && Date.parse(registration.offerExpiresAt) > now)); }).length; }
function attState_(db, event, now) {
  if (event.status === 'cancelled' || event.status === 'completed') return event.status;
  if (Date.parse(event.endsAt) <= now) return 'completed';
  if (event.status === 'closed' || (!event.allowLateRegistration && Date.parse(event.startsAt) <= now)) return 'closed';
  if (event.status === 'full' || (event.capacity !== null && attReserved_(db, event.id, now) >= event.capacity)) return 'full';
  return 'open';
}
function attEvents_(db, now) { return db.events.map(function(event) { var copy = Object.assign({}, event); copy.status = attState_(db, event, now); return copy; }).sort(function(a, b) { return Date.parse(a.startsAt) - Date.parse(b.startsAt); }); }
function attQueue_(db, type, attendeeId, eventId, key, now, registrationIds) {
  if (db.deliveries.some(function(delivery) { return delivery.key === key; })) return;
  db.deliveries.push({ id: attId_(), key: key, type: type, attendeeId: attendeeId, eventId: eventId || '', eventStartsAt: type === 'reminder' ? db.events.find(function(event) { return event.id === eventId; }).startsAt : '', registrationIds: registrationIds || [], status: 'pending', attempts: 0, createdAt: attIso_(now), nextAttemptAt: now, lastAttemptAt: '', lastError: '' });
}
function attReconcileOffers_(db, now) {
  db.registrations.filter(function(registration) { return registration.status === 'offered' && Date.parse(registration.offerExpiresAt) <= now; }).forEach(function(registration) {
    registration.status = 'waitlisted'; registration.offerExpired = true; registration.updatedAt = attIso_(now);
    attQueue_(db, 'offerExpired', registration.attendeeId, registration.eventId, 'expired:' + registration.id + ':' + registration.offerExpiresAt, now, [registration.id]);
  });
  db.events.forEach(function(event) {
    if (attState_(db, event, now) !== 'open') return;
    var free = event.capacity === null ? Infinity : event.capacity - attReserved_(db, event.id, now);
    var waiting = db.registrations.filter(function(registration) { return registration.eventId === event.id && registration.status === 'waitlisted' && !registration.offerExpired; }).sort(function(a, b) { return Date.parse(a.createdAt) - Date.parse(b.createdAt); });
    waiting.slice(0, free).forEach(function(registration) {
      registration.status = 'offered'; registration.offerExpiresAt = attIso_(Math.min(now + ATT_DAY, Date.parse(event.startsAt) > now ? Date.parse(event.startsAt) : Date.parse(event.endsAt))); registration.updatedAt = attIso_(now);
      attQueue_(db, 'offer', registration.attendeeId, event.id, 'offer:' + registration.id + ':' + registration.offerExpiresAt, now, [registration.id]);
    });
  });
}
function attMember_(db, attendeeId, now) {
  var attendee = db.attendees.find(function(person) { return person.id === attendeeId; });
  if (!attendee || attendee.anonymizedAt) attError_('unauthorized');
  var events = attEvents_(db, now);
  return { ok: true, attendee: attendee, events: events, registrations: db.registrations.filter(function(registration) { return registration.attendeeId === attendeeId; }).map(function(registration) { return Object.assign({}, registration, { event: events.find(function(event) { return event.id === registration.eventId; }) }); }) };
}
function attAdd_(db, attendeeId, ids, now, walkIn) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 30 || ids.some(function(id) { return typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id); })) attError_('invalid_request');
  var unique = ids.filter(function(id, index) { return ids.indexOf(id) === index; });
  unique.forEach(function(id) {
    var event = db.events.find(function(item) { return item.id === id; });
    var closed = !event || ['cancelled', 'completed', 'closed'].indexOf(attState_(db, event, now)) >= 0;
    if (walkIn && event && ['open', 'full'].indexOf(event.status) >= 0 && Date.parse(event.endsAt) > now) closed = false;
    if (closed) attError_('event_unavailable', 'An event is no longer accepting registrations. Please review your selection.');
  });
  var result = [];
  unique.forEach(function(id) {
    var event = db.events.find(function(item) { return item.id === id; });
    var registration = db.registrations.find(function(item) { return item.attendeeId === attendeeId && item.eventId === id; });
    if (!registration || registration.status === 'cancelled') {
      if (!registration) { registration = { id: attId_(), attendeeId: attendeeId, eventId: id, createdAt: attIso_(now) }; db.registrations.push(registration); }
      registration.status = event.status === 'full' || (event.capacity !== null && attReserved_(db, event.id, now) >= event.capacity) ? 'waitlisted' : 'confirmed'; registration.updatedAt = attIso_(now); registration.cancelledAt = ''; registration.offerExpiresAt = ''; registration.offerExpired = false;
    }
    if (walkIn && registration.status === 'confirmed') attCheckIn_(db, registration.id, now);
    result.push(registration);
  });
  return result;
}
function attCheckIn_(db, id, now) {
  var registration = db.registrations.find(function(item) { return item.id === id; });
  if (!registration || registration.status !== 'confirmed') attError_('conflict', 'Only a confirmed attendee can be checked in.');
  var event = db.events.find(function(item) { return item.id === registration.eventId; });
  if (!event || event.status === 'cancelled') attError_('event_unavailable');
  if (!db.checkins.some(function(checkin) { return checkin.registrationId === id; })) db.checkins.push({ id: attId_(), registrationId: id, attendeeId: registration.attendeeId, eventId: registration.eventId, checkedInAt: attIso_(now) });
}
function attIssueToken_(db, attendeeId, purpose, now, registrationId, expiresAt) {
  var token = attSecretToken_();
  db.tokens.push({ id: attHash_(token), attendeeId: attendeeId, purpose: purpose, registrationId: registrationId || '', expiresAt: expiresAt || now + 2 * ATT_DAY, usedAt: '' });
  return token;
}
function attConsume_(db, raw, purpose, now) {
  if (typeof raw !== 'string' || !/^[a-f0-9]{64}$/.test(raw)) attError_('invalid_token');
  var token = db.tokens.find(function(item) { return item.id === attHash_(raw) && item.purpose === purpose; });
  if (!token || token.usedAt || token.expiresAt <= now) attError_('invalid_token', 'This email link has expired or has already been used. Request a new management link.');
  token.usedAt = attIso_(now);
  return token;
}
function attQueueManagement_(db, attendeeId, now) {
  if (db.deliveries.some(function(delivery) { return delivery.attendeeId === attendeeId && delivery.type === 'management' && ['pending', 'failed'].indexOf(delivery.status) >= 0 && delivery.attempts < 5; })) return;
  attQueue_(db, 'management', attendeeId, '', 'link:' + attendeeId + ':' + attId_(), now);
}
function attGeneric_() { return { ok: true, verificationRequired: true, message: 'If this address has registrations, a secure management link will arrive by email. Use it to review or add events.' }; }
function attHandle_(db, request, now) {
  var action = request.action, actor = request.actor || {}, admin = actor.role === 'admin' || actor.role === 'support';
  var adminActions = ['admin', 'saveEvent', 'checkIn', 'walkIn', 'retryEmail', 'sendUpdate'];
  var memberActions = ['manage', 'updateDetails', 'addEvents', 'cancel'];
  if (adminActions.indexOf(action) >= 0 && !admin) attError_('unauthorized');
  if (memberActions.indexOf(action) >= 0 && !actor.attendeeId) attError_('unauthorized');
  if (action === 'events') return { ok: true, events: attEvents_(db, now) };
  if (action === 'rateCheck') return { ok: true };
  if (action === 'register' || action === 'walkIn') {
    var person = attValidatePerson_(request.attendee);
    if (request.consent !== true || typeof request.marketingConsent !== 'boolean' || !/^[a-f0-9-]{36}$/i.test(request.requestId || '') || request.website) attError_('invalid_request');
    attRate_(db, 'email:' + person.email, 6, 600000, now);
    var existing = db.attendees.find(function(item) { return item.email === person.email; });
    if (existing && action !== 'walkIn') { attQueueManagement_(db, existing.id, now); return attGeneric_(); }
    if (!existing) {
      person.id = attId_(); person.createdAt = attIso_(now); person.requestId = request.requestId; person.updatedAt = attIso_(now); db.attendees.push(person);
      db.consents.push({ id: attId_(), attendeeId: person.id, version: 'attendance-2026-10-v1', essentialText: ATT_CONSENT, essentialAccepted: true, marketingText: ATT_MARKETING, marketingAccepted: request.marketingConsent, recordedAt: attIso_(now), source: action === 'walkIn' ? 'organiser-walk-in' : 'registration' });
    } else person = existing;
    var registrations = attAdd_(db, person.id, request.eventIds, now, action === 'walkIn');
    attQueue_(db, 'confirmation', person.id, '', 'confirmation:' + person.id + ':' + request.requestId, now, registrations.map(function(registration) { return registration.id; }));
    return { ok: true, saved: true, attendee: { firstName: person.firstName, lastName: person.lastName }, registrations: registrations.map(function(registration) { return Object.assign({}, registration, { event: db.events.find(function(event) { return event.id === registration.eventId; }) }); }), manageUrl: '/attend/manage' };
  }
  if (action === 'requestLink') {
    var email = attText_(request.email, 254, true).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) attError_('invalid_request');
    attRate_(db, 'email:' + email, 6, 600000, now);
    var attendee = db.attendees.find(function(item) { return item.email === email; });
    if (attendee) attQueueManagement_(db, attendee.id, now);
    return attGeneric_();
  }
  if (action === 'exchange') { var consumed = attConsume_(db, request.token, 'management', now); return { ok: true, sessionAttendeeId: consumed.attendeeId }; }
  if (action === 'acceptOffer') {
    var offer = attConsume_(db, request.token, 'offer', now), registration = db.registrations.find(function(item) { return item.id === offer.registrationId; });
    if (!registration || registration.status !== 'offered' || Date.parse(registration.offerExpiresAt) <= now || offer.expiresAt !== Date.parse(registration.offerExpiresAt)) attError_('conflict', 'This seat offer has expired. Your waitlist record is still available through your management link.');
    var offeredEvent = db.events.find(function(event) { return event.id === registration.eventId; });
    if (!offeredEvent || ['closed', 'completed', 'cancelled'].indexOf(attState_(db, offeredEvent, now)) >= 0) attError_('event_unavailable');
    registration.status = 'confirmed'; registration.updatedAt = attIso_(now); registration.offerExpiresAt = '';
    attQueue_(db, 'confirmation', registration.attendeeId, offeredEvent.id, 'accepted:' + offer.id, now, [registration.id]);
    return Object.assign(attMember_(db, offer.attendeeId, now), { sessionAttendeeId: offer.attendeeId });
  }
  if (memberActions.indexOf(action) >= 0) {
    var member = attMember_(db, actor.attendeeId, now).attendee;
    if (action === 'updateDetails') { member.dietary = attText_(request.dietary || '', 1000); member.accessibility = attText_(request.accessibility || '', 1000); member.updatedAt = attIso_(now); }
    if (action === 'addEvents') { var added = attAdd_(db, member.id, request.eventIds, now, false); attQueue_(db, 'confirmation', member.id, '', 'addition:' + attId_(), now, added.map(function(item) { return item.id; })); }
    if (action === 'cancel') {
      var cancellation = db.registrations.find(function(item) { return item.id === request.registrationId && item.attendeeId === member.id; });
      if (!cancellation) attError_('not_found');
      if (cancellation.status !== 'cancelled') {
        cancellation.status = 'cancelled'; cancellation.cancelledAt = attIso_(now); cancellation.updatedAt = attIso_(now); cancellation.offerExpiresAt = '';
        attQueue_(db, 'cancellation', member.id, cancellation.eventId, 'cancellation:' + cancellation.id + ':' + cancellation.cancelledAt, now, [cancellation.id]);
        attReconcileOffers_(db, now);
      }
    }
    return attMember_(db, member.id, now);
  }
  if (action === 'admin') {
    return { ok: true, events: db.events.map(function(event) { return Object.assign({}, event, { effectiveStatus: attState_(db, event, now) }); }), attendees: db.attendees.map(function(person) { var copy = Object.assign({}, person); if (actor.role !== 'support') { delete copy.dietary; delete copy.accessibility; } delete copy.requestId; return copy; }), registrations: db.registrations, deliveries: db.deliveries.map(function(delivery) { var copy = Object.assign({}, delivery); delete copy.key; return copy; }), checkins: db.checkins, canViewSupport: actor.role === 'support' };
  }
  if (action === 'saveEvent') {
    var event = attValidateEvent_(request.event), old = db.events.find(function(item) { return item.id === event.id; });
    if (!old) attError_('not_found', 'Only the confirmed public event catalogue can be edited.');
    if (event.capacity !== null && event.capacity < attReserved_(db, event.id, now)) attError_('capacity_conflict', 'Capacity cannot be lower than confirmed attendees and unexpired seat offers.');
    var changed = ['startsAt', 'endsAt', 'venue', 'status'].some(function(key) { return old[key] !== event[key]; });
    event.updatedAt = attIso_(now); event.revision = (old.revision || 0) + 1; event.updateSentRevision = old.updateSentRevision || 0;
    Object.assign(old, event);
    if (event.status === 'cancelled') {
      db.registrations.filter(function(item) { return item.eventId === event.id && item.status !== 'cancelled'; }).forEach(function(item) { item.status = 'cancelled'; item.cancelledAt = attIso_(now); item.updatedAt = attIso_(now); item.cancelledByEvent = true; attQueue_(db, 'eventCancelled', item.attendeeId, event.id, 'event-cancelled:' + item.id + ':' + event.revision, now, [item.id]); });
    }
    attReconcileOffers_(db, now);
    return { ok: true, notificationRequired: changed && event.status !== 'cancelled', event: event };
  }
  if (action === 'checkIn') { attCheckIn_(db, request.registrationId, now); return { ok: true }; }
  if (action === 'retryEmail') {
    var delivery = db.deliveries.find(function(item) { return item.id === request.deliveryId; });
    if (!delivery) attError_('not_found');
    if (delivery.status !== 'sent') { delivery.status = 'pending'; delivery.attempts = 0; delivery.nextAttemptAt = now; delivery.lastError = ''; if (delivery.type === 'thanks' || delivery.type === 'missed') delivery.manual = true; }
    return { ok: true };
  }
  if (action === 'sendUpdate') {
    var updated = db.events.find(function(item) { return item.id === request.eventId; }); if (!updated) attError_('not_found');
    var ids = [];
    db.registrations.filter(function(item) { return item.eventId === updated.id && item.status !== 'cancelled'; }).forEach(function(item) {
      if (ids.indexOf(item.attendeeId) >= 0) return; ids.push(item.attendeeId);
      attQueue_(db, 'update', item.attendeeId, updated.id, 'update:' + updated.id + ':' + (updated.revision || 0) + ':' + item.attendeeId, now, [item.id]);
    });
    updated.updateSentRevision = updated.revision || 0; return { ok: true, queued: ids.length };
  }
  attError_('invalid_request');
}
function attCalendar_(event) {
  var compact = function(value) { return value.replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(event.title) + '&dates=' + compact(event.startsAt) + '/' + compact(event.endsAt) + '&ctz=America%2FToronto&location=' + encodeURIComponent(event.venue) + '&details=' + encodeURIComponent(event.description + '\nFree. Drinks and snacks provided.');
}
// Outlook on the web (Microsoft 365, which UWindsor uses), in UTC so it shows in the attendee's own zone.
function attOutlook_(event) {
  var utc = function(value) { return new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z'); };
  return 'https://outlook.office.com/calendar/0/action/compose?rru=addevent&subject=' + encodeURIComponent(event.title) + '&startdt=' + encodeURIComponent(utc(event.startsAt)) + '&enddt=' + encodeURIComponent(utc(event.endsAt)) + '&location=' + encodeURIComponent(event.venue) + '&body=' + encodeURIComponent(event.description + '\nFree. Drinks and snacks provided.');
}
function attEventText_(event, registration) {
  var start = Utilities.formatDate(new Date(event.startsAt), 'America/Toronto', 'EEEE, MMMM d, yyyy'), from = Utilities.formatDate(new Date(event.startsAt), 'America/Toronto', 'h:mm a'), to = Utilities.formatDate(new Date(event.endsAt), 'America/Toronto', 'h:mm a z');
  return [event.title, 'Status: ' + registration.status, start + ', ' + from + '-' + to + ' (Windsor local time)', event.venue, event.preparation ? 'Prepare: ' + event.preparation : '', 'Free · Drinks and snacks provided.', registration.status === 'confirmed' ? 'Add to Google Calendar: ' + attCalendar_(event) + '\nAdd to Outlook: ' + attOutlook_(event) : ''].filter(Boolean).join('\n');
}
function attEmail_(db, delivery, now) {
  var person = db.attendees.find(function(item) { return item.id === delivery.attendeeId; });
  if (!person || person.anonymizedAt || !person.email) return null;
  if (delivery.type === 'thanks' || delivery.type === 'missed') return attFollowUpMail_(db, delivery, person, now);
  var registrations = db.registrations.filter(function(item) { return item.attendeeId === person.id && (delivery.registrationIds.length ? delivery.registrationIds.indexOf(item.id) >= 0 : !delivery.eventId || item.eventId === delivery.eventId); });
  var event = db.events.find(function(item) { return item.id === delivery.eventId; });
  if (delivery.type === 'reminder' && (!event || ['cancelled', 'completed'].indexOf(event.status) >= 0 || Date.parse(event.startsAt) <= now || Date.parse(event.startsAt) - now > ATT_DAY || delivery.eventStartsAt !== event.startsAt || !registrations.some(function(item) { return item.status === 'confirmed'; }))) return null;
  if (['cancellation', 'eventCancelled'].indexOf(delivery.type) >= 0 && !registrations.some(function(item) { return item.status === 'cancelled'; })) return null;
  var offered = registrations.find(function(item) { return item.status === 'offered' && Date.parse(item.offerExpiresAt) > now; });
  if (delivery.type === 'offer' && (!offered || !event || ['cancelled', 'closed', 'completed'].indexOf(attState_(db, event, now)) >= 0)) return null;
  if (delivery.type === 'offerExpired' && !registrations.some(function(item) { return item.status === 'waitlisted' && item.offerExpired; })) return null;
  var site = attSiteUrl_();
  var token = attIssueToken_(db, person.id, 'management', now), manage = site + '/attend/manage#token=' + token;
  var subject = 'Your Hult Prize at UWindsor events', introduction = 'Your event registrations are saved. Each event status is shown below.';
  if (delivery.type === 'confirmation') {
    var mixed = registrations.some(function(item) { return item.status !== 'confirmed'; });
    subject = mixed ? 'Your confirmed events and waitlist requests' : 'You’re registered! Hult Prize at UWindsor';
    introduction = mixed ? 'Your selections are saved. Confirmed events reserve your attendance; waitlisted events do not reserve a seat. Each status is shown below.' : 'You’re registered! Here are the events you’ve signed up for. You can update or cancel your attendance using the secure link below.';
  }
  if (delivery.type === 'management') { subject = 'Your secure attendance management link'; introduction = 'Use the secure link below to view your registrations, add events, update support details or cancel individual events. If you did not request this email, no action is required.'; }
  if (delivery.type === 'reminder') { subject = 'Reminder: ' + event.title; introduction = 'We look forward to seeing you. Your attendance is confirmed. If you can no longer attend, please cancel using the secure link below.'; }
  if (delivery.type === 'cancellation') { subject = 'Your event attendance has been cancelled'; introduction = 'Your cancellation is recorded for the event below. Your other event registrations remain available through your secure management link.'; }
  if (delivery.type === 'eventCancelled') { subject = 'Event cancelled: ' + event.title; introduction = 'The organisers have cancelled this event. Your registration is cancelled and no attendance reminder will be sent for it.'; }
  if (delivery.type === 'update') { subject = 'Event update: ' + event.title; introduction = 'The organisers have updated this event. Please review the current date, time and venue below. Your attendance status is shown separately.'; }
  if (delivery.type === 'offerExpired') { subject = 'Your seat offer has expired'; introduction = 'Your seat offer expired before it was accepted. You remain on the waitlist without a reserved seat. Contact the organising team if you would still like to attend.'; }
  var offerText = '';
  if (delivery.type === 'offer') {
    subject = 'A seat is available: ' + event.title;
    introduction = 'A seat is reserved for you temporarily. You are not confirmed until you accept this offer.';
    var offerToken = attIssueToken_(db, person.id, 'offer', now, offered.id, Date.parse(offered.offerExpiresAt));
    offerText = 'Accept by ' + Utilities.formatDate(new Date(offered.offerExpiresAt), 'America/Toronto', 'MMMM d, h:mm a z') + ':\n' + site + '/attend/manage#offer=' + offerToken;
  }
  var details = delivery.type === 'management' ? [] : registrations.map(function(registration) { var current = db.events.find(function(item) { return item.id === registration.eventId; }); return current ? attEventText_(current, registration) : ''; }).filter(Boolean);
  var discord = attProps_().getProperty('ATTENDANCE_DISCORD_URL') || 'https://discord.gg/ybeQYQxcqZ';
  var body = ['Hi ' + person.firstName + ',', introduction].concat(details).concat([
    offerText, 'Manage attendance (secure link, expires in 48 hours and can be used once):\n' + manage,
    'After opening your secure link, this browser can manage your attendance for 7 days. Request another link at ' + site + '/attend/manage whenever needed.',
    'Bring your team: each person should register separately at ' + site + '/attend. Each attendee counts as one person, even when attending multiple events.',
    'Want to pitch in the competition? Event attendance registration does not register your team to compete or reserve a pitching slot. Complete competition registration separately by November 20, 2026: https://www.hultprize.org/register',
    discord && /^https:\/\//.test(discord) ? 'Join our Discord: ' + discord : '',
    'Hult Prize at UWindsor · One idea. Four minutes. $1,000,000.\nThe global US$1 million seed investment prize.'
  ]).filter(Boolean).join('\n\n');
  return { to: person.email, subject: subject, body: body, name: 'Hult Prize at UWindsor', replyTo: attProps_().getProperty('ATTENDANCE_REPLY_TO') || 'hultprizeatuwindsor@gmail.com' };
}
function attSiteUrl_() {
  var site = attProps_().getProperty('ATTENDANCE_SITE_URL') || 'https://hultprizeuwindsor.ca';
  if (!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(site)) attError_('unavailable');
  return site;
}
function attHtml_(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
/** A whole hour of Windsor time, `days` after the Windsor calendar date of a moment, at that hour's own UTC offset. */
function attWindsorHour_(value, hour, days) {
  var date = Utilities.formatDate(new Date(value), 'America/Toronto', 'yyyy-MM-dd').split('-').map(Number);
  var offset = function(at) { var zone = Utilities.formatDate(new Date(at), 'America/Toronto', 'Z'); return (zone.charAt(0) === '-' ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(3))) * 60000; };
  // The wall time read as UTC, then moved by Windsor's offset, checked again at the answer in case the clocks change between.
  var wall = Date.UTC(date[0], date[1] - 1, date[2] + days, hour);
  return wall - offset(wall - offset(wall));
}
/**
 * When an event's follow-ups go out. An event belongs to the Windsor day it ends on, or the day before if it ends in the
 * small hours. Thank-you cards: 7 PM that day, or an hour after the event ends if later. Missed-you letters: 10 AM the
 * next morning, leaving the evening to record any check-in missed at the door.
 */
function attFollowUpAt_(type, event) {
  var end = Date.parse(event.endsAt), day = end - 4 * 3600000;
  return type === 'missed' ? attWindsorHour_(day, ATT_MISSED_HOUR, 1) : Math.max(end + 3600000, attWindsorHour_(day, ATT_THANKS_HOUR, 0));
}
function attCheckedIn_(db, registrationId) { return db.checkins.some(function(checkin) { return checkin.registrationId === registrationId; }); }
/**
 * One missed-you letter per run of missed events. None if they already have a letter, sent or still being tried, for an
 * event starting no later than this one, and no check-in from that event's start until this one's. A check-in at that
 * event itself counts, so a door mistake corrected after the letter ends the run.
 */
function attStillAway_(db, attendeeId, event) {
  var start = function(id) { var item = db.events.find(function(candidate) { return candidate.id === id; }); return item ? Date.parse(item.startsAt) : NaN; };
  var here = Date.parse(event.startsAt);
  var last = db.deliveries.filter(function(delivery) {
    return delivery.type === 'missed' && delivery.attendeeId === attendeeId && delivery.eventId !== event.id && start(delivery.eventId) <= here
      && (delivery.status === 'sent' || (delivery.status !== 'skipped' && delivery.attempts < 5));
  }).reduce(function(latest, delivery) { return Math.max(latest, start(delivery.eventId)); }, -Infinity);
  return last > -Infinity && !db.checkins.some(function(checkin) { var at = start(checkin.eventId); return checkin.attendeeId === attendeeId && at >= last && at < here; });
}
/**
 * Thank-you cards go to everyone checked in, registered or walk-in. Missed-you letters go to confirmed registrations
 * with no check-in; waitlisted and cancelled ones never had or gave up their seat. Manual sends skip the time window.
 */
function attQueueFollowUps_(db, event, type, now, manual) {
  var targets = type === 'missed'
    ? db.registrations.filter(function(registration) { return registration.eventId === event.id && registration.status === 'confirmed' && !attCheckedIn_(db, registration.id) && !attStillAway_(db, registration.attendeeId, event); }).map(function(registration) { return { attendeeId: registration.attendeeId, registrationId: registration.id }; })
    : db.checkins.filter(function(checkin) { return checkin.eventId === event.id; });
  var queued = 0;
  targets.forEach(function(target) {
    var key = type + ':' + target.registrationId;
    if (db.deliveries.some(function(delivery) { return delivery.key === key; })) return;
    attQueue_(db, type, target.attendeeId, event.id, key, now, [target.registrationId]);
    if (manual) db.deliveries[db.deliveries.length - 1].manual = true;
    queued += 1;
  });
  return queued;
}
/** The privacy notice promises that invitations to other events need the optional consent; the latest answer counts. */
function attWantsUpdates_(db, attendeeId) {
  var latest = db.consents.filter(function(consent) { return consent.attendeeId === attendeeId; }).sort(function(a, b) { return Date.parse(a.recordedAt) - Date.parse(b.recordedAt); }).pop();
  return Boolean(latest && latest.marketingAccepted === true);
}
function attFollowUpMail_(db, delivery, person, now) {
  var event = db.events.find(function(item) { return item.id === delivery.eventId; });
  var registrationId = delivery.registrationIds[0], registration = db.registrations.find(function(item) { return item.id === registrationId; });
  if (!event || event.status === 'cancelled') return null;
  if (delivery.type === 'thanks' && !attCheckedIn_(db, registrationId)) return null;
  // A check-in recorded since the letter was queued means they came after all.
  if (delivery.type === 'missed' && (!registration || registration.status !== 'confirmed' || attCheckedIn_(db, registrationId))) return null;
  if (!delivery.manual && now > attFollowUpAt_(delivery.type, event) + ATT_FOLLOW_UP_WINDOW) return null;
  return Object.assign({ to: person.email, name: 'Hult Prize at UWindsor', replyTo: attProps_().getProperty('ATTENDANCE_REPLY_TO') || 'hultprizeatuwindsor@gmail.com' }, attFollowUp_(db, event, person, now, attWantsUpdates_(db, person.id), delivery.type));
}
/**
 * The follow-up email: an animated picture over a short note, either a thank-you card (type 'thanks') or a
 * missed-you letter ('missed'). With optional consent it also invites the reader to the next event (a one-click
 * sign-up when they aren't registered yet) and explains the Ticket Jar raffle. Pictures are served from the site
 * (public/images/email, made by scripts/generate-email-art.mjs).
 */
function attFollowUp_(db, event, person, now, updates, type) {
  var site = attSiteUrl_(), when = function(value, pattern) { return Utilities.formatDate(new Date(value), 'America/Toronto', pattern); };
  var copy = type === 'missed' ? {
    subject: 'We missed you at ' + event.title + ' 💌', heading: 'We missed you at ' + event.title + '!',
    opening: 'We’re sad you couldn’t make it to ' + event.title + ', but we know things come up. We hope everything’s okay.',
    openingHtml: 'We’re sad you couldn’t make it, but we know things come up. We hope everything’s okay.',
    note: 'Did you make it after all, and we missed you at the door? Just reply and let us know, and we’ll fix our list.',
    invite: 'Come to the next one? We’d love to see you there:', going: 'You’re already signed up for this one, so your seat is waiting!',
    closing: 'Hope to see you soon,', why: 'You’re getting this because you registered for ' + event.title,
    picture: 'missed-you-letter.gif', alt: 'A letter slides out of an envelope and unfolds: We missed you!',
  } : {
    subject: 'Thank you for coming to ' + event.title + ' 💌', heading: 'Thank you for coming to ' + event.title + '!',
    opening: 'Thank you for coming to ' + event.title + '. It meant a lot to have you there, and we hope you left with an idea or two worth chasing.',
    openingHtml: 'It meant a lot to have you there, and we hope you left with an idea or two worth chasing.',
    note: '', invite: 'We’d love to see you at our next event:', going: 'You’re already signed up, so we’ll see you there!',
    closing: 'See you soon,', why: 'You’re getting this because you checked in at ' + event.title,
    picture: 'thank-you-card.gif', alt: 'A thank-you card slides out of an envelope and opens: So glad you came!',
  };
  var events = attEvents_(db, now).filter(function(item) { return item.status !== 'cancelled'; });
  var listed = function(id) { return db.registrations.some(function(item) { return item.attendeeId === person.id && item.eventId === id && item.status !== 'cancelled'; }); };
  // The next event they can still sign up for, or are already on the list for.
  var next = updates ? events.filter(function(item) { return item.id !== event.id && Date.parse(item.startsAt) > now && (['open', 'full'].indexOf(item.status) >= 0 || listed(item.id)); })[0] : null;
  var first = events.find(function(item) { return item.id === ATT_RAFFLE.firstEventId; }), draw = events.find(function(item) { return item.id === ATT_RAFFLE.drawEventId; });
  var raffle = updates && draw && draw.id !== event.id && Date.parse(draw.startsAt) > now;
  var text = ['Hi ' + person.firstName + ',', copy.opening, copy.note];
  var p = function(inner, style) { return '<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#33475b;' + (style || '') + '">' + inner + '</p>'; };
  var h2 = function(inner) { return '<h2 style="margin:0 0 8px;font-size:21px;line-height:1.3;color:#002b51;">' + inner + '</h2>'; };
  var a = function(href, label) { return '<a href="' + attHtml_(href) + '" style="color:#be125e;font-weight:600;text-decoration:underline;">' + attHtml_(label) + '</a>'; };
  var box = function(colour, inner) { return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0;"><tr><td style="background:' + colour + ';border-radius:16px;padding:22px 22px 8px;">' + inner + '</td></tr></table>'; };
  var html = '<h1 style="margin:0 0 14px;font-size:27px;line-height:1.2;color:#002b51;">' + attHtml_(copy.heading) + '</h1>' + p('Hi ' + attHtml_(person.firstName) + ',') + p(attHtml_(copy.openingHtml)) + (copy.note ? p(attHtml_(copy.note), 'font-size:14px;color:#53616f;') : '');
  if (next) {
    var registration = db.registrations.find(function(item) { return item.attendeeId === person.id && item.eventId === next.id && item.status !== 'cancelled'; });
    var day = when(next.startsAt, 'EEEE, MMMM d'), hours = when(next.startsAt, 'h:mm a') + '–' + when(next.endsAt, 'h:mm a z');
    // The time never breaks across lines; on a phone it moves under the date as one piece.
    var nextHtml = p(attHtml_(copy.invite), 'margin-bottom:6px;') + h2(attHtml_(next.title)) + p('<strong style="color:#002b51;">' + attHtml_(day) + ' · ' + attHtml_(hours).replace(/ /g, '&nbsp;') + '</strong><br>' + attHtml_(next.venue), 'margin-bottom:10px;') + (next.description ? p(attHtml_(next.description)) : '');
    text.push(copy.invite + ' ' + next.title + '\n' + day + ' · ' + hours + '\n' + next.venue + (next.description ? '\n' + next.description : ''));
    if (registration && registration.status === 'confirmed') {
      nextHtml += p(attHtml_(copy.going) + ' ' + a(attCalendar_(next), 'Add to Google Calendar') + ' · ' + a(attOutlook_(next), 'Add to Outlook'));
      text.push(copy.going + '\nAdd to Google Calendar: ' + attCalendar_(next) + '\nAdd to Outlook: ' + attOutlook_(next));
    } else if (registration) {
      var status = registration.status === 'offered' ? 'We’re holding a seat for you until ' + when(registration.offerExpiresAt, 'EEEE, MMMM d, h:mm a z') + '. Accept it from your seat-offer email.'
        : registration.offerExpired ? 'Your seat offer for this one has expired. If you’d still like to come, just reply and let us know.'
        : 'You’re on the waitlist for this one. We’ll email you if a seat opens up.';
      nextHtml += p(attHtml_(status));
      text.push(status);
    } else {
      // A one-click sign-up: the management link opens with the next event already ticked.
      var known = db.attendees.some(function(item) { return item.id === person.id; });
      var signUp = known ? site + '/attend/manage#token=' + attIssueToken_(db, person.id, 'management', now) + '&add=' + encodeURIComponent(next.id) : site + '/attend?events=' + encodeURIComponent(next.id);
      var label = next.status === 'full' ? 'Join the waitlist' : 'Save my spot';
      nextHtml += '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 12px;"><tr><td style="background:#da2381;border-radius:15px;"><a href="' + attHtml_(signUp) + '" style="display:inline-block;padding:13px 24px;font-size:16px;font-weight:600;line-height:1.5;color:#ffffff;text-decoration:none;">' + label + ' &rarr;</a></td></tr></table>'
        + p('This button is just for you. It works once, within 48 hours, so please don’t forward this email. After that, you can still sign up at ' + a(site + '/attend/manage', site.replace(/^https:\/\//, '') + '/attend/manage') + '.', 'font-size:13px;color:#53616f;');
      text.push(label + ' (this link is just for you: it works once, within 48 hours, so please don’t forward this email):\n' + signUp + '\nAfter that, you can still sign up at ' + site + '/attend/manage');
    }
    html += box('#edf4f8', nextHtml);
  }
  if (raffle) {
    var started = !first || Date.parse(event.startsAt) >= Date.parse(first.startsAt);
    // A check-in at the first ticket event or later means they already have tickets in the jar.
    var holding = started && db.checkins.some(function(checkin) { var at = db.events.find(function(item) { return item.id === checkin.eventId; }); return checkin.attendeeId === person.id && at && (!first || Date.parse(at.startsAt) >= Date.parse(first.startsAt)); });
    var opens = !started ? 'The Ticket Jar opens at ' + (next && next.id === first.id ? 'our next event, ' + first.title : first.title + ' on ' + when(first.startsAt, 'MMMM d')) + '. From then on, every event you come to gets you a free raffle ticket at check-in.'
      : 'Every event you come to gets you ' + (holding ? 'another' : 'a') + ' free raffle ticket at check-in.';
    var jar = (holding ? 'Your tickets stay' : 'Every ticket stays') + ' in the jar until we draw one at the ' + draw.title + ' on ' + when(draw.startsAt, 'MMMM d, yyyy') + '. Its owner wins $200 cash, thanks to Grayfel Technologies Inc. The more events you come to, the better your odds.';
    var heading = holding ? 'Keep filling the Ticket Jar' : 'Start collecting tickets for $200';
    html += box('#fff0f7', '<img src="' + site + '/images/email/raffle-tickets.png" width="250" alt="Raffle tickets for the Ticket Jar: $200, drawn February 4, 2027" style="display:block;width:250px;max-width:100%;height:auto;margin:0 auto 12px;border:0;">'
      + h2(heading) + p(attHtml_(opens)) + p(attHtml_(jar)) + p(a(site + '/blog/the-ticket-jar', 'How the Ticket Jar works')));
    text.push(heading + '\n' + opens + ' ' + jar + '\nHow the Ticket Jar works: ' + site + '/blog/the-ticket-jar');
  }
  html += p(attHtml_(copy.closing) + '<br>The Hult Prize at UWindsor team', 'margin:26px 0 0;');
  text.push(copy.closing + '\nThe Hult Prize at UWindsor team');
  var discord = attProps_().getProperty('ATTENDANCE_DISCORD_URL') || 'https://discord.gg/ybeQYQxcqZ';
  var why = copy.why + (updates ? ' and said yes to hearing about our other events. To stop, just reply and let us know.' : '.');
  var footer = (/^https:\/\//.test(discord) ? '<a href="' + attHtml_(discord) + '" style="color:#53616f;">Join our Discord</a> · ' : '') + '<a href="' + site + '" style="color:#53616f;">' + site.replace(/^https:\/\//, '') + '</a><br>Hult Prize at UWindsor · One idea. Four minutes. $1,000,000.<br>' + attHtml_(why);
  text.push((/^https:\/\//.test(discord) ? 'Join our Discord: ' + discord + '\n' : '') + 'Hult Prize at UWindsor · One idea. Four minutes. $1,000,000.\n' + why);
  var preview = type === 'missed' ? (next ? 'Sorry you couldn’t make it. Come to ' + next.title + '?' : 'Sorry you couldn’t make it to ' + event.title + '.') : (next ? 'A little thank-you card, and an invite to ' + next.title + '.' : 'A little thank-you card from the Hult Prize at UWindsor team.');
  // Tables and inline styles, because Gmail and Outlook drop most stylesheets. The page colour matches the GIF's edge.
  var htmlBody = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>' + attHtml_(copy.heading) + '</title></head>'
    + '<body style="margin:0;padding:0;background:#fff0f7;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + attHtml_(preview) + '</div>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fff0f7;"><tr><td align="center" style="padding:16px 12px 36px;">'
    + '<!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;font-family:\'Helvetica Neue\',Helvetica,Arial,sans-serif;">'
    + '<tr><td align="center"><img src="' + site + '/images/email/' + copy.picture + '" width="560" alt="' + attHtml_(copy.alt) + '" style="display:block;width:100%;max-width:560px;height:auto;border:0;"></td></tr>'
    + '<tr><td style="background:#ffffff;border-radius:20px;padding:30px 24px 30px;">' + html + '</td></tr>'
    + '<tr><td align="center" style="padding:22px 16px 0;font-size:12px;line-height:1.7;color:#53616f;">' + footer + '</td></tr>'
    + '</table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>';
  return { subject: copy.subject, body: text.filter(Boolean).join('\n\n'), htmlBody: htmlBody };
}
/** Tokens are saved as hashes before MailApp runs; raw links are never persisted. */
function attDeliver_(db, now, limit) {
  var mode = attProps_().getProperty('ATTENDANCE_EMAIL_MODE') || 'disabled';
  if (['live', 'test'].indexOf(mode) < 0) { db.deliveries.filter(function(delivery) { return delivery.status === 'pending'; }).forEach(function(delivery) { delivery.lastError = 'Email sending is disabled. Configure ATTENDANCE_EMAIL_MODE before launch.'; }); attCommit_(db); return; }
  var testEmails = (attProps_().getProperty('ATTENDANCE_TEST_EMAILS') || '').toLowerCase().split(',').map(function(email) { return email.trim(); });
  // Follow-ups wait behind everything else, so a wave of them never holds up someone's sign-in link or confirmation.
  var followUp = function(delivery) { return delivery.type === 'thanks' || delivery.type === 'missed' ? 1 : 0; };
  var pending = db.deliveries.filter(function(delivery) { return (delivery.status === 'pending' || delivery.status === 'failed') && delivery.attempts < 5 && delivery.nextAttemptAt <= now; }).sort(function(a, b) { return followUp(a) - followUp(b); }).slice(0, limit);
  pending.forEach(function(delivery) {
    var mail;
    var recipient = db.attendees.find(function(person) { return person.id === delivery.attendeeId; });
    if (mode === 'test' && recipient && testEmails.indexOf(recipient.email) < 0) { delivery.status = 'failed'; delivery.lastError = 'Test mode blocked a recipient outside ATTENDANCE_TEST_EMAILS.'; delivery.attempts += 1; delivery.nextAttemptAt = now + ATT_DAY; attCommit_(db); return; }
    try { mail = attEmail_(db, delivery, now); } catch (error) { delivery.status = 'failed'; delivery.lastError = 'Email configuration needs attention.'; delivery.attempts += 1; delivery.nextAttemptAt = now + 3600000; attCommit_(db); return; }
    if (!mail) { delivery.status = 'skipped'; delivery.lastError = 'No longer applicable to the current registration.'; attCommit_(db); return; }
    delivery.attempts += 1; delivery.totalAttempts = (delivery.totalAttempts || 0) + 1; delivery.lastAttemptAt = attIso_(now); attCommit_(db);
    try {
      MailApp.sendEmail(mail);
      delivery.status = 'sent'; delivery.sentAt = attIso_(now); delivery.lastError = '';
    } catch (error) {
      delivery.status = 'failed'; delivery.lastError = 'Email provider rejected or could not complete delivery. Check MailApp quota and authorisation.'; delivery.nextAttemptAt = now + Math.min(ATT_DAY, 300000 * Math.pow(2, delivery.attempts));
    }
    attCommit_(db);
  });
}
function attMaintenance_(db, now) {
  attReconcileOffers_(db, now);
  db.events.forEach(function(event) {
    var until = Date.parse(event.startsAt) - now;
    if (event.status === 'cancelled' || event.status === 'completed' || until <= 0 || until > ATT_DAY) return;
    db.registrations.filter(function(registration) { return registration.eventId === event.id && registration.status === 'confirmed'; }).forEach(function(registration) {
      attQueue_(db, 'reminder', registration.attendeeId, event.id, 'reminder:' + registration.id + ':' + event.startsAt, now, [registration.id]);
    });
  });
  // In start order, so the repeat no-show rule sees an earlier event's letter before a later one's.
  if (attProps_().getProperty('ATTENDANCE_FOLLOW_UP_MODE') === 'auto') db.events.slice().sort(function(a, b) { return Date.parse(a.startsAt) - Date.parse(b.startsAt) || (a.id < b.id ? -1 : 1); }).forEach(function(event) {
    ['thanks', 'missed'].forEach(function(type) {
      var at = attFollowUpAt_(type, event);
      if (event.status !== 'cancelled' && now >= at && now <= at + ATT_FOLLOW_UP_WINDOW) attQueueFollowUps_(db, event, type, now, false);
    });
  });
  db.tokens = db.tokens.filter(function(token) { return token.expiresAt > now && !token.usedAt; });
  db.rateLimits = db.rateLimits.filter(function(rate) { return rate.expiresAt > now; });
  db.attendees.forEach(function(person) {
    var ends = db.registrations.filter(function(registration) { return registration.attendeeId === person.id; }).map(function(registration) { var event = db.events.find(function(item) { return item.id === registration.eventId; }); return event ? Date.parse(event.endsAt) : 0; });
    var last = Math.max.apply(null, ends);
    if (isFinite(last) && last > 0 && now > last + 30 * ATT_DAY) { person.dietary = ''; person.accessibility = ''; }
  });
  var seasonEnd = Math.max.apply(null, db.events.map(function(event) { return Date.parse(event.endsAt); }));
  if (isFinite(seasonEnd) && now > seasonEnd + 365 * ATT_DAY) {
    db.attendees.forEach(function(person) { if (person.anonymizedAt) return; var retained = { id: person.id, category: person.category, institution: person.institution, faculty: person.faculty, anonymizedAt: attIso_(now) }; Object.keys(person).forEach(function(key) { delete person[key]; }); Object.assign(person, retained); });
    db.consents = []; db.tokens = []; db.deliveries = []; db.rateLimits = [];
  }
}
function attendanceMaintenance() {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return;
  try { var db = attLoad_(), now = Date.now(); attMaintenance_(db, now); attCommit_(db); attDeliver_(db, now, 15); } catch (error) { console.error('Attendance maintenance could not complete; review deployment and retry.'); } finally { lock.releaseLock(); }
}
function doPost(e) {
  var params = e && e.parameter || {}, secret = attProps_().getProperty('ATTENDANCE_SHARED_SECRET');
  if (!secret || secret.length < 32 || params.secret !== secret) return attJson_({ ok: false, code: 'unauthorized' });
  var request;
  try { if (!params.payload || params.payload.length > 22000) throw new Error('body'); request = JSON.parse(params.payload); if (!request || typeof request !== 'object' || !/^[a-f0-9]{64}$/.test(request.clientKey || '')) throw new Error('client'); } catch (error) { return attJson_({ ok: false, code: 'invalid_request' }); }
  var lock = LockService.getScriptLock(); if (!lock.tryLock(10000)) return attJson_({ ok: false, code: 'busy' });
  try {
    var db = attLoad_(), now = Date.now(), bucket = request.action === 'rateCheck' ? 'login' : ['events', 'admin', 'manage'].indexOf(request.action) >= 0 ? 'read' : request.actor && ['admin', 'support'].indexOf(request.actor.role) >= 0 ? 'adminWrite' : 'write';
    try { attRate_(db, 'ip:' + bucket + ':' + request.clientKey, bucket === 'read' || bucket === 'adminWrite' ? 600 : bucket === 'login' ? 10 : 30, 600000, now); } catch (rateError) { attCommit_(db); throw rateError; }
    attCommit_(db);
    attReconcileOffers_(db, now); attCommit_(db);
    var response = attHandle_(db, request, now); attCommit_(db);
    // Durable save precedes mail. Mail failure never rolls back attendance.
    if (['events', 'admin', 'manage', 'rateCheck'].indexOf(request.action) < 0) { try { attDeliver_(db, now, 3); } catch (mailError) { /* Pending journal recovers at the next request. */ } }
    return attJson_(response);
  } catch (error) {
    return attJson_({ ok: false, code: error.attCode || 'unconfirmed', message: error.attCode ? error.message : 'The operation could not be confirmed. Please retry safely.' });
  } finally { lock.releaseLock(); }
}
function doGet() { return attJson_({ ok: false, code: 'method_not_allowed' }); }

// BEGIN GENERATED ATTENDANCE EVENT SEED
function attendanceEventSeed_() { return [
  {
    "id": "info-session-1",
    "title": "Info Session #1",
    "group": "community",
    "startsAt": "2026-10-29T20:30:00Z",
    "endsAt": "2026-10-29T21:30:00Z",
    "timeZone": "America/Toronto",
    "venue": "Fusion Conference Room, Joyce Entrepreneurship Centre, second floor",
    "description": "Meet the organising team and learn how to get involved, whether you plan to compete or simply explore.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "workshop-1",
    "title": "Workshop 1: Problem, Insight & Story",
    "group": "workshops",
    "startsAt": "2026-11-07T15:00:00Z",
    "endsAt": "2026-11-07T17:20:00Z",
    "timeZone": "America/Toronto",
    "venue": "Sterling Cybersecurity and Advisory Group, 300 Ouellette Avenue, Windsor",
    "description": "Explore the problem you want to solve and build a clear story around your insight. Sponsored by FRCT; in partnership with Sterling Cybersecurity and Advisory Group.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "founders-panel",
    "title": "Founders Panel",
    "group": "community",
    "startsAt": "2026-11-13T22:30:00Z",
    "endsAt": "2026-11-14T00:00:00Z",
    "timeZone": "America/Toronto",
    "venue": "Fusion Conference Room, Joyce Entrepreneurship Centre, second floor",
    "description": "Hear from founders and connect with the community. Co-hosted with CBNA, OMA and CSS.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "workshop-2",
    "title": "Workshop 2: Solution, Business Model & Impact",
    "group": "workshops",
    "startsAt": "2026-11-14T15:00:00Z",
    "endsAt": "2026-11-14T17:20:00Z",
    "timeZone": "America/Toronto",
    "venue": "Sterling Cybersecurity and Advisory Group, 300 Ouellette Avenue, Windsor",
    "description": "Develop your solution, business model and approach to measurable impact. Sponsored by FRCT; in partnership with Sterling Cybersecurity and Advisory Group.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "info-session-2",
    "title": "Info Session #2",
    "group": "community",
    "startsAt": "2026-11-16T21:30:00Z",
    "endsAt": "2026-11-16T22:30:00Z",
    "timeZone": "America/Toronto",
    "venue": "Fusion Conference Room, Joyce Entrepreneurship Centre, second floor",
    "description": "Ask questions about Hult Prize, meet the community and explore your next steps.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "team-mixer",
    "title": "Team Mixer",
    "group": "community",
    "startsAt": "2026-11-17T22:30:00Z",
    "endsAt": "2026-11-18T00:00:00Z",
    "timeZone": "America/Toronto",
    "venue": "Fusion Conference Room, Joyce Entrepreneurship Centre, second floor",
    "description": "Meet potential teammates and make new connections. Co-hosted with CBNA, OMA and CSS.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "workshop-3",
    "title": "Workshop 3: Traction, Market & Financials",
    "group": "workshops",
    "startsAt": "2026-11-28T15:00:00Z",
    "endsAt": "2026-11-28T17:20:00Z",
    "timeZone": "America/Toronto",
    "venue": "Sterling Cybersecurity and Advisory Group, 300 Ouellette Avenue, Windsor",
    "description": "Explore your market, evidence of traction and the financial foundations of your venture. Sponsored by FRCT; in partnership with Sterling Cybersecurity and Advisory Group.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "workshop-4",
    "title": "Workshop 4: Delivery, Storytelling & Slide Design",
    "group": "workshops",
    "startsAt": "2026-12-05T15:00:00Z",
    "endsAt": "2026-12-05T17:20:00Z",
    "timeZone": "America/Toronto",
    "venue": "Sterling Cybersecurity and Advisory Group, 300 Ouellette Avenue, Windsor",
    "description": "Shape a compelling pitch with clear storytelling, slide design and delivery. Sponsored by FRCT; in partnership with Sterling Cybersecurity and Advisory Group.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "workshop-5",
    "title": "Workshop 5: Dress Rehearsal & Q&A Mastery",
    "group": "workshops",
    "startsAt": "2027-01-09T15:00:00Z",
    "endsAt": "2027-01-09T17:20:00Z",
    "timeZone": "America/Toronto",
    "venue": "Sterling Cybersecurity and Advisory Group, 300 Ouellette Avenue, Windsor",
    "description": "Attend to learn from pitches and feedback. Registering to attend does not reserve a practice pitch slot. Sponsored by FRCT; in partnership with Sterling Cybersecurity and Advisory Group.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  },
  {
    "id": "campus-grand-finale",
    "title": "Campus Grand Finale",
    "group": "finale",
    "startsAt": "2027-02-04T19:00:00Z",
    "endsAt": "2027-02-04T23:00:00Z",
    "timeZone": "America/Toronto",
    "venue": "CAW Auditorium, University of Windsor",
    "description": "Watch student ventures pitch at the campus finale. Registration reserves attendance only and does not guarantee a pitching slot.",
    "status": "open",
    "capacity": null,
    "allowLateRegistration": false,
    "preparation": ""
  }
]; }
// END GENERATED ATTENDANCE EVENT SEED

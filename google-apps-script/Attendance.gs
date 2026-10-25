/**
 * Dedicated event attendance deployment. Do NOT paste into the interest-form project.
 * Script properties: ATTENDANCE_SHARED_SECRET (32+ random characters), optional
 * ATTENDANCE_SHEET_ID, ATTENDANCE_SITE_URL, ATTENDANCE_REPLY_TO, ATTENDANCE_DISCORD_URL.
 * Run setupAttendance(), then installAttendanceTriggers(); deploy execute-as-owner,
 * Anyone access. All HTTP operations require the server's shared secret.
 * See docs/event-registration.md. Every mutation is serialised, journaled, then materialised.
 */
var ATT_TABLES = ['attendees', 'events', 'registrations', 'consents', 'deliveries', 'checkins', 'tokens', 'rateLimits'];
var ATT_CATEGORIES = ['undergraduate', 'graduate', 'other-student', 'sponsor', 'founder', 'faculty', 'alumni', 'community'];
var ATT_CONSENT = 'I understand that Hult Prize at UWindsor will use my details to manage my event registrations and send essential event updates.';
var ATT_MARKETING = 'Keep me updated about other Hult Prize at UWindsor events and opportunities.';
var ATT_DAY = 86400000;

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
    if (delivery.status !== 'sent') { delivery.status = 'pending'; delivery.attempts = 0; delivery.nextAttemptAt = now; delivery.lastError = ''; }
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
function attEventText_(event, registration) {
  var start = Utilities.formatDate(new Date(event.startsAt), 'America/Toronto', 'EEEE, MMMM d, yyyy'), from = Utilities.formatDate(new Date(event.startsAt), 'America/Toronto', 'h:mm a'), to = Utilities.formatDate(new Date(event.endsAt), 'America/Toronto', 'h:mm a z');
  return [event.title, 'Status: ' + registration.status, start + ', ' + from + '-' + to + ' (Windsor local time)', event.venue, event.preparation ? 'Prepare: ' + event.preparation : '', 'Free · Drinks and snacks provided.', registration.status === 'confirmed' ? 'Add to calendar: ' + attCalendar_(event) : ''].filter(Boolean).join('\n');
}
function attEmail_(db, delivery, now) {
  var person = db.attendees.find(function(item) { return item.id === delivery.attendeeId; });
  if (!person || person.anonymizedAt || !person.email) return null;
  var registrations = db.registrations.filter(function(item) { return item.attendeeId === person.id && (delivery.registrationIds.length ? delivery.registrationIds.indexOf(item.id) >= 0 : !delivery.eventId || item.eventId === delivery.eventId); });
  var event = db.events.find(function(item) { return item.id === delivery.eventId; });
  if (delivery.type === 'reminder' && (!event || ['cancelled', 'completed'].indexOf(event.status) >= 0 || Date.parse(event.startsAt) <= now || Date.parse(event.startsAt) - now > ATT_DAY || delivery.eventStartsAt !== event.startsAt || !registrations.some(function(item) { return item.status === 'confirmed'; }))) return null;
  if (['cancellation', 'eventCancelled'].indexOf(delivery.type) >= 0 && !registrations.some(function(item) { return item.status === 'cancelled'; })) return null;
  var offered = registrations.find(function(item) { return item.status === 'offered' && Date.parse(item.offerExpiresAt) > now; });
  if (delivery.type === 'offer' && (!offered || !event || ['cancelled', 'closed', 'completed'].indexOf(attState_(db, event, now)) >= 0)) return null;
  if (delivery.type === 'offerExpired' && !registrations.some(function(item) { return item.status === 'waitlisted' && item.offerExpired; })) return null;
  var site = attProps_().getProperty('ATTENDANCE_SITE_URL') || 'https://hultprizeuwindsor.ca';
  if (!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(site)) attError_('unavailable');
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
/** Tokens are saved as hashes before MailApp runs; raw links are never persisted. */
function attDeliver_(db, now, limit) {
  var mode = attProps_().getProperty('ATTENDANCE_EMAIL_MODE') || 'disabled';
  if (['live', 'test'].indexOf(mode) < 0) { db.deliveries.filter(function(delivery) { return delivery.status === 'pending'; }).forEach(function(delivery) { delivery.lastError = 'Email sending is disabled. Configure ATTENDANCE_EMAIL_MODE before launch.'; }); attCommit_(db); return; }
  var testEmails = (attProps_().getProperty('ATTENDANCE_TEST_EMAILS') || '').toLowerCase().split(',').map(function(email) { return email.trim(); });
  var pending = db.deliveries.filter(function(delivery) { return (delivery.status === 'pending' || delivery.status === 'failed') && delivery.attempts < 5 && delivery.nextAttemptAt <= now; }).slice(0, limit);
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

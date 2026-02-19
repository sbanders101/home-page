(function attachIcsCore(globalScope) {
  'use strict';

  function parseIcs(text) {
    const events = [];
    const warnings = [];
    const errors = [];

    try {
      const lines = unfoldIcsLines(text);
      let inEvent = false;
      let eventLines = [];

      const pushEvent = () => {
        if (!eventLines.length) {
          return;
        }

        const parsed = parseEvent(eventLines);
        if (parsed) {
          events.push(parsed);
        }
        eventLines = [];
      };

      for (const line of lines) {
        if (!line) {
          continue;
        }

        if (line === 'BEGIN:VEVENT') {
          inEvent = true;
          eventLines = [];
          continue;
        }

        if (line === 'END:VEVENT') {
          inEvent = false;
          pushEvent();
          continue;
        }

        if (inEvent) {
          eventLines.push(line);
        }
      }

      if (!events.length) {
        warnings.push('No VEVENT entries found in the file.');
      }

      return { events, warnings, errors };
    } catch (error) {
      errors.push(error.message);
      return { events: [], warnings, errors };
    }
  }

  function unfoldIcsLines(rawText) {
    const normalized = String(rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const rawLines = normalized.split('\n');
    const out = [];

    for (const line of rawLines) {
      if (line.startsWith(' ') || line.startsWith('\t')) {
        if (out.length) {
          out[out.length - 1] += line.substring(1);
        }
        continue;
      }

      if (line.trim().length === 0) {
        continue;
      }

      out.push(line.trimEnd());
    }

    return out;
  }

  function parseEvent(lines) {
    const event = {
      uid: '',
      uidCanonical: '',
      summary: '',
      description: '',
      location: '',
      start: null,
      end: null,
      durationMs: null,
      rrule: '',
      rdates: [],
      exdates: [],
      recurrenceId: null,
      recurrenceIdKey: '',
      recurrenceDayKey: '',
      status: 'CONFIRMED',
      invalid: false,
      allDay: false,
    };

    for (const line of lines) {
      const property = parseProperty(line);
      if (!property) {
        continue;
      }

      const name = property.name;
      const value = icsUnescape(property.value);

      switch (name) {
        case 'UID':
          event.uid = value;
          event.uidCanonical = normalizeUid(value);
          break;
        case 'SUMMARY':
          event.summary = value;
          break;
        case 'DESCRIPTION':
          event.description = value;
          break;
        case 'LOCATION':
          event.location = value;
          break;
        case 'DTSTART':
          event.start = parseIcsDate(value, property.params);
          event.allDay = event.start ? event.start.allDay : false;
          break;
        case 'DTEND':
          event.end = parseIcsDate(value, property.params);
          break;
        case 'DURATION':
          event.durationMs = parseDurationMs(value);
          break;
        case 'RRULE':
          event.rrule = value.trim();
          break;
        case 'RDATE':
          parseRdate(value, event.rdates, property.params);
          break;
        case 'EXDATE':
          parseExdate(value, event.exdates, property.params);
          break;
        case 'RECURRENCE-ID': {
          const recurrence = parseIcsDate(value, property.params);
          event.recurrenceId = recurrence ? recurrence.date.getTime() : null;
          event.recurrenceIdKey = parseRecurrenceTokenKey(value) || (recurrence ? formatDateTimeKeyLocal(recurrence.date) : '');
          event.recurrenceDayKey = event.recurrenceIdKey ? event.recurrenceIdKey.slice(0, 8) : '';
          break;
        }
        case 'STATUS':
          event.status = value.trim().toUpperCase();
          break;
        default:
          break;
      }
    }

    if (!event.summary) {
      event.summary = 'Untitled Event';
    }

    if (!event.start) {
      event.invalid = true;
      event.invalidReason = 'Missing DTSTART';
      return event;
    }

    if (!event.end && event.durationMs == null) {
      event.durationMs = 0;
    }

    if (event.end && event.durationMs == null && event.start && !event.allDay) {
      event.durationMs = Math.max(0, event.end.date.getTime() - event.start.date.getTime());
    }

    if (event.end && event.end.allDay && event.start && event.start.allDay) {
      event.durationMs = Math.max(0, event.end.date.getTime() - event.start.date.getTime());
    }

    return event;
  }

  function parseProperty(line) {
    const colon = line.indexOf(':');
    if (colon < 0) {
      return null;
    }

    const rawNameAndParams = line.substring(0, colon);
    const rawValue = line.substring(colon + 1);
    const parts = rawNameAndParams.split(';');
    const rawName = parts.shift() || '';

    const params = {};
    for (const part of parts) {
      const idx = part.indexOf('=');
      if (idx < 0) {
        params[part.toUpperCase()] = '';
        continue;
      }

      const key = part.substring(0, idx).toUpperCase();
      const value = part.substring(idx + 1);
      params[key] = unquoteParam(value);
    }

    return { name: rawName.toUpperCase(), params, value: rawValue };
  }

  function unquoteParam(value) {
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
      return value.substring(1, value.length - 1);
    }
    return value;
  }

  function icsUnescape(value) {
    return value
      .replace(/\\([;,\\])/g, '$1')
      .replace(/\\n/gi, '\n')
      .replace(/\\N/g, '\n')
      .replace(/\\r/gi, '\r');
  }

  function parseIcsDate(value, params) {
    const normalized = String(value || '').trim();
    const safeParams = params || {};

    if (safeParams.VALUE === 'DATE' || /^\d{8}$/.test(normalized)) {
      const match = normalized.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (!match) {
        return null;
      }
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      return {
        date: new Date(year, month, day, 0, 0, 0, 0),
        allDay: true,
        tzid: safeParams.TZID || '',
      };
    }

    const matchDateTime = normalized.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
    if (!matchDateTime) {
      const fallback = new Date(normalized);
      if (Number.isNaN(fallback.getTime())) {
        return null;
      }
      return { date: fallback, allDay: false, tzid: safeParams.TZID || '' };
    }

    const yearNum = Number(matchDateTime[1]);
    const monthNum = Number(matchDateTime[2]) - 1;
    const dayNum = Number(matchDateTime[3]);
    const h = Number(matchDateTime[4]);
    const m = Number(matchDateTime[5]);
    const s = Number(matchDateTime[6]);

    if (normalized.endsWith('Z')) {
      return {
        date: new Date(Date.UTC(yearNum, monthNum, dayNum, h, m, s)),
        allDay: false,
        tzid: 'UTC',
      };
    }

    return {
      date: new Date(yearNum, monthNum, dayNum, h, m, s),
      allDay: false,
      tzid: safeParams.TZID || '',
    };
  }

  function parseExdate(value, out, params) {
    parseDateEntryList(value, out, params);
  }

  function parseRdate(value, out, params) {
    parseDateEntryList(value, out, params);
  }

  function parseDateEntryList(value, out, params) {
    if (!value) {
      return;
    }

    const valueParts = String(value).split(',');
    for (const part of valueParts) {
      const trimmed = part.trim();
      if (!trimmed) {
        continue;
      }

      const parsed = parseIcsDate(trimmed, params || {});
      if (!parsed) {
        continue;
      }

      const key = parseRecurrenceTokenKey(trimmed) || formatDateTimeKeyLocal(parsed.date);
      out.push({
        ms: parsed.date.getTime(),
        key,
        dayKey: key ? key.slice(0, 8) : '',
      });
    }
  }

  function parseDurationMs(value) {
    if (!value || value[0] !== 'P') {
      return 0;
    }

    const body = value.substring(1);
    const durDate = body.split('T');
    const datePart = durDate[0];
    const timePart = durDate[1] || '';

    let days = 0;
    let hours = 0;
    let minutes = 0;
    let seconds = 0;

    const dayMatch = datePart.match(/(\d+)D/);
    if (dayMatch) {
      days = Number(dayMatch[1]);
    }

    const hourMatch = timePart.match(/(\d+)H/);
    if (hourMatch) {
      hours = Number(hourMatch[1]);
    }

    const minuteMatch = timePart.match(/(\d+)M/);
    if (minuteMatch) {
      minutes = Number(minuteMatch[1]);
    }

    const secondMatch = timePart.match(/(\d+)S/);
    if (secondMatch) {
      seconds = Number(secondMatch[1]);
    }

    return (((days * 24 + hours) * 60 + minutes) * 60 + seconds) * 1000;
  }

  function convertEventsToLines(parsed, options, runtime) {
    const warnings = [...(parsed.warnings || [])];
    const customerGroups = [];
    const customerMap = new Map();
    const recurrenceOverridesByUid = buildRecurrenceOverridesByUid(parsed.events || []);
    let expandedRows = 0;
    const noDurationCustomers = new Set();

    const range = resolveRange(options.dateFrom, options.dateTo);
    if (range.isDefault) {
      warnings.push('No date range was provided; temporary local safety range is set to 365 days before/after today.');
    }

    for (const event of parsed.events || []) {
      if (event.status === 'CANCELLED') {
        continue;
      }

      if (event.invalid) {
        warnings.push(`Skipping event missing DTSTART: ${event.summary || event.uid || 'Unknown'}.`);
        continue;
      }

      const occurrences = getEventOccurrences(event, range, warnings, recurrenceOverridesByUid, runtime || globalScope);
      if (!occurrences.length) {
        continue;
      }

      const customerName = event.summary || 'Untitled Event';
      const customer = getOrCreateCustomerGroup(customerMap, customerGroups, customerName, options);

      if ((event.durationMs || 0) === 0) {
        noDurationCustomers.add(event.summary || 'Untitled Event');
      }

      for (const occurrence of occurrences) {
        const description = buildDescription(event);
        const durationHours = clampToTwoDecimals((event.durationMs || 0) / 3600000);
        const row = {
          id: `row-${customer.rows.length}-${occurrence.getTime()}`,
          date: formatDateOnly(occurrence),
          sortKey: occurrence.getTime(),
          description,
          durationHours,
          selected: true,
        };

        customer.rows.push(row);
        expandedRows += 1;
      }
    }

    for (const customerName of noDurationCustomers) {
      warnings.push(
        `One or more events for customer "${customerName}" has no duration. Amount defaults to 0.00 unless edited with a manual rate override.`
      );
    }

    for (const customer of customerGroups) {
      customer.rows.sort((a, b) => a.sortKey - b.sortKey);
    }

    return {
      customerGroups,
      expandedRows,
      warnings,
      rangeLabel: `${range.labelFrom} to ${range.labelTo}`,
    };
  }

  function buildRecurrenceOverridesByUid(events) {
    const map = new Map();

    for (const event of events) {
      if (!event.uidCanonical || event.recurrenceId == null) {
        continue;
      }

      if (!map.has(event.uidCanonical)) {
        map.set(event.uidCanonical, []);
      }

      map.get(event.uidCanonical).push(event);
    }

    return map;
  }

  function getOrCreateCustomerGroup(customerMap, groups, name, options) {
    if (!customerMap.has(name)) {
      const group = {
        name,
        enabled: true,
        item: options.defaultItem,
        rate: options.hourlyRate,
        invoiceDate: getTodayDateOnly(),
        terms: 'Net 30',
        rows: [],
      };
      customerMap.set(name, group);
      groups.push(group);
    }

    return customerMap.get(name);
  }

  function resolveRange(dateFrom, dateTo) {
    const today = new Date();
    const defaultFrom = addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), -365);
    const defaultTo = addDays(new Date(today.getFullYear(), today.getMonth(), today.getDate()), 365);

    if (!dateFrom && !dateTo) {
      return {
        start: startOfDay(defaultFrom),
        end: endOfDay(defaultTo),
        isDefault: true,
        labelFrom: formatDateOnly(defaultFrom),
        labelTo: formatDateOnly(defaultTo),
      };
    }

    const parsedFrom = dateFrom ? new Date(`${dateFrom}T00:00:00`) : startOfDay(defaultFrom);
    const parsedTo = dateTo ? new Date(`${dateTo}T23:59:59`) : endOfDay(defaultTo);

    if (dateFrom && dateTo && parsedFrom > parsedTo) {
      throw new Error('Date range start is after date range end.');
    }

    return {
      start: parsedFrom,
      end: parsedTo,
      isDefault: false,
      labelFrom: formatDateOnly(parsedFrom),
      labelTo: formatDateOnly(parsedTo),
    };
  }

  function getEventOccurrences(event, range, warnings, recurrenceOverridesByUid, runtime) {
    if (!event.start || !event.start.date) {
      return [];
    }

    if (!event.rrule) {
      const nonRecurring = [];
      nonRecurring.push(new Date(event.start.date.getTime()));
      for (const rdate of event.rdates || []) {
        if (rdate && Number.isFinite(rdate.ms)) {
          nonRecurring.push(new Date(rdate.ms));
        }
      }

      return dedupeAndSortDates(nonRecurring).filter((date) => isWithinRange(date, range));
    }

    const baseStart = event.start.date;
    let occurrences = [];

    try {
      const rule = buildRRule(event.rrule, baseStart, warnings, runtime || globalScope);
      if (rule) {
        occurrences = rule.between(range.start, range.end, true);
      }
    } catch (error) {
      warnings.push(`Error expanding recurrence for "${event.summary}": ${error.message}`);
    }

    if (!occurrences.length) {
      occurrences = expandWithFallback(event.rrule, baseStart, range);
      if (occurrences.length) {
        warnings.push(`Fallback recurrence expansion used for: ${event.summary}`);
      }
    }

    for (const rdate of event.rdates || []) {
      if (rdate && Number.isFinite(rdate.ms)) {
        occurrences.push(new Date(rdate.ms));
      }
    }

    const exclusionTimes = new Set();
    const exclusionKeys = new Set();
    const exclusionDayKeys = new Set();
    for (const exdate of event.exdates || []) {
      if (!exdate || typeof exdate !== 'object') {
        continue;
      }

      if (Number.isFinite(exdate.ms)) {
        exclusionTimes.add(new Date(exdate.ms).getTime());
      }
      if (exdate.key) {
        exclusionKeys.add(exdate.key);
      }
      if (exdate.dayKey) {
        exclusionDayKeys.add(exdate.dayKey);
      }
    }

    const overriddenRecurrenceIds = new Set();
    const overriddenRecurrenceKeys = new Set();
    const overriddenRecurrenceDayKeys = new Set();
    if (event.uidCanonical && recurrenceOverridesByUid.has(event.uidCanonical)) {
      for (const override of recurrenceOverridesByUid.get(event.uidCanonical)) {
        if (override.recurrenceId != null) {
          overriddenRecurrenceIds.add(override.recurrenceId);
        }
        if (override.recurrenceIdKey) {
          overriddenRecurrenceKeys.add(override.recurrenceIdKey);
        }
        if (override.recurrenceDayKey) {
          overriddenRecurrenceDayKeys.add(override.recurrenceDayKey);
        }
      }
    }

    return dedupeAndSortDates(occurrences)
      .filter((date) => {
        if (overriddenRecurrenceIds.has(date.getTime())) {
          return false;
        }

        const localKey = formatDateTimeKeyLocal(date);
        if (overriddenRecurrenceKeys.has(localKey)) {
          return false;
        }

        const utcKey = formatDateTimeKeyUtc(date);
        if (overriddenRecurrenceKeys.has(utcKey)) {
          return false;
        }

        const localDay = localKey.slice(0, 8);
        if (overriddenRecurrenceDayKeys.has(localDay)) {
          return false;
        }

        const utcDay = utcKey.slice(0, 8);
        if (overriddenRecurrenceDayKeys.has(utcDay)) {
          return false;
        }

        return true;
      })
      .filter((date) => {
        if (exclusionTimes.has(date.getTime())) {
          return false;
        }

        const localKey = formatDateTimeKeyLocal(date);
        if (exclusionKeys.has(localKey)) {
          return false;
        }

        const utcKey = formatDateTimeKeyUtc(date);
        if (exclusionKeys.has(utcKey)) {
          return false;
        }

        const localDay = localKey.slice(0, 8);
        if (exclusionDayKeys.has(localDay)) {
          return false;
        }

        const utcDay = utcKey.slice(0, 8);
        if (exclusionDayKeys.has(utcDay)) {
          return false;
        }

        return true;
      })
      .filter((date) => isWithinRange(date, range));
  }

  function dedupeAndSortDates(dates) {
    const seen = new Set();
    return (dates || [])
      .filter((date) => date instanceof Date && Number.isFinite(date.getTime()))
      .filter((date) => {
        const ts = date.getTime();
        if (seen.has(ts)) {
          return false;
        }
        seen.add(ts);
        return true;
      })
      .sort((a, b) => a.getTime() - b.getTime());
  }

  function buildRRule(ruleText, dtStart, warnings, runtime) {
    const rruleApi = runtime && runtime.rrule ? runtime.rrule : null;
    if (!rruleApi) {
      return null;
    }

    const formattedStart = formatDateForRRule(dtStart);
    const rruleText = `DTSTART:${formattedStart}\nRRULE:${ruleText}`;

    if (typeof rruleApi.rrulestr === 'function') {
      try {
        return rruleApi.rrulestr(rruleText);
      } catch (error) {
        warnings.push(`rrule parser error for rule "${ruleText}": ${error.message}`);
      }
    }

    if (rruleApi.RRule && typeof rruleApi.RRule.parseString === 'function' && typeof rruleApi.RRule === 'function') {
      const parsed = rruleApi.RRule.parseString(ruleText.replace(/^RRULE:/, '').replace(/^DTSTART:.*\n/, ''));
      const options = {
        ...parsed,
        dtstart: dtStart,
      };
      return new rruleApi.RRule(options);
    }

    throw new Error('No supported rrule API found in loaded library.');
  }

  function expandWithFallback(ruleText, dtStart, range) {
    const options = parseSimpleRRule(ruleText);
    if (!options || !options.FREQ) {
      return [];
    }

    const freq = options.FREQ;
    const interval = Math.max(1, Number(options.INTERVAL || 1));
    const count = options.COUNT ? Number(options.COUNT) : Number.POSITIVE_INFINITY;
    const until = options.UNTIL ? new Date(formatSimpleUntilDate(options.UNTIL)) : null;
    const rangeEnd = until && until < range.end ? until : range.end;
    const byDayList = options.BYDAY ? options.BYDAY.split(',') : [];

    const occurrences = [];
    const cap = 500000;
    const limit = Math.min(count, cap);

    if (freq === 'DAILY') {
      let current = new Date(dtStart.getTime());
      let generated = 0;
      while (current <= rangeEnd && generated < limit) {
        generated += 1;
        if (current >= range.start && current <= rangeEnd) {
          occurrences.push(new Date(current.getTime()));
        }
        current = addDays(current, interval);
      }
      return occurrences;
    }

    if (freq === 'WEEKLY') {
      const weekdays = byDayList.map(normalizeWeekdayToIndex).filter((x) => x >= 0);
      if (!weekdays.length) {
        let current = new Date(dtStart.getTime());
        let generated = 0;
        while (current <= rangeEnd && generated < limit) {
          generated += 1;
          if (current >= range.start && current <= rangeEnd) {
            occurrences.push(new Date(current.getTime()));
          }
          current = addWeeks(current, interval);
        }
        return occurrences;
      }

      const dayZero = getDayZero(dtStart);
      let currentWeekStart = new Date(
        dayZero.getFullYear(),
        dayZero.getMonth(),
        dayZero.getDate(),
        dtStart.getHours(),
        dtStart.getMinutes(),
        dtStart.getSeconds(),
        dtStart.getMilliseconds()
      );

      let generated = 0;
      while (currentWeekStart <= rangeEnd && generated < limit) {
        for (const wd of weekdays) {
          const candidate = moveToWeekday(currentWeekStart, wd);
          candidate.setHours(dtStart.getHours(), dtStart.getMinutes(), dtStart.getSeconds(), dtStart.getMilliseconds());

          if (candidate < dtStart || candidate > rangeEnd) {
            continue;
          }

          generated += 1;
          if (candidate >= range.start && candidate <= range.end) {
            occurrences.push(new Date(candidate.getTime()));
          }

          if (generated >= limit) {
            break;
          }
        }
        currentWeekStart = addWeeks(currentWeekStart, interval);
      }

      return occurrences;
    }

    if (freq === 'MONTHLY') {
      let current = new Date(dtStart.getTime());
      let generated = 0;
      while (current <= rangeEnd && generated < limit) {
        generated += 1;
        if (current >= range.start && current <= rangeEnd) {
          occurrences.push(new Date(current.getTime()));
        }
        current = addMonths(current, interval);
      }
      return occurrences;
    }

    if (freq === 'YEARLY') {
      let current = new Date(dtStart.getTime());
      let generated = 0;
      while (current <= rangeEnd && generated < limit) {
        generated += 1;
        if (current >= range.start && current <= rangeEnd) {
          occurrences.push(new Date(current.getTime()));
        }
        current = addYears(current, interval);
      }
      return occurrences;
    }

    return [];
  }

  function parseSimpleRRule(ruleText) {
    const result = {};
    const trimmed = String(ruleText || '').trim();
    if (!trimmed.startsWith('RRULE:') && !trimmed.includes('FREQ=')) {
      return null;
    }

    const normalized = trimmed.replace(/^RRULE:/, '');
    const parts = normalized.split(';');
    for (const part of parts) {
      if (!part.includes('=')) {
        continue;
      }
      const kv = part.split('=');
      const key = kv[0];
      const value = kv[1];
      result[key.toUpperCase()] = value;
    }

    if (!result.FREQ) {
      return null;
    }

    return result;
  }

  function normalizeUid(uid) {
    const trimmed = String(uid || '').trim();
    if (!trimmed) {
      return '';
    }

    const match = trimmed.match(/^(.*)_R\d{8}T\d{6}Z?(@.*)?$/);
    if (!match) {
      return trimmed;
    }

    return `${match[1]}${match[2] || ''}`;
  }

  function parseRecurrenceTokenKey(value) {
    const normalized = String(value || '').trim();
    const match = normalized.match(/^(\d{8})T(\d{4,6})Z?$/);
    if (!match) {
      return '';
    }

    const rawTime = match[2];
    const hh = rawTime.substring(0, 2);
    const mm = rawTime.substring(2, 4);
    const ss = rawTime.length >= 6 ? rawTime.substring(4, 6) : '00';
    return `${match[1]}T${hh}${mm}${ss}`;
  }

  function formatDateTimeKeyLocal(date) {
    const pad = (number) => String(number).padStart(2, '0');
    return (
      `${date.getFullYear()}` +
      `${pad(date.getMonth() + 1)}` +
      `${pad(date.getDate())}` +
      `T${pad(date.getHours())}` +
      `${pad(date.getMinutes())}` +
      `${pad(date.getSeconds())}`
    );
  }

  function formatDateTimeKeyUtc(date) {
    const pad = (number) => String(number).padStart(2, '0');
    return (
      `${date.getUTCFullYear()}` +
      `${pad(date.getUTCMonth() + 1)}` +
      `${pad(date.getUTCDate())}` +
      `T${pad(date.getUTCHours())}` +
      `${pad(date.getUTCMinutes())}` +
      `${pad(date.getUTCSeconds())}`
    );
  }

  function formatSimpleUntilDate(value) {
    if (/^\d{8}T\d{6}Z$/.test(value)) {
      return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}T${value.substring(9, 11)}:${value.substring(11, 13)}:${value.substring(13, 15)}Z`;
    }

    if (/^\d{8}$/.test(value)) {
      return `${value.substring(0, 4)}-${value.substring(4, 6)}-${value.substring(6, 8)}T23:59:59`;
    }

    return value;
  }

  function addDays(date, amount) {
    const out = new Date(date.getTime());
    out.setDate(out.getDate() + amount);
    return out;
  }

  function addWeeks(date, amount) {
    return addDays(date, amount * 7);
  }

  function addMonths(date, amount) {
    const out = new Date(date.getTime());
    const originalDay = out.getDate();
    out.setDate(1);
    out.setMonth(out.getMonth() + amount);
    const daysInMonth = new Date(out.getFullYear(), out.getMonth() + 1, 0).getDate();
    out.setDate(Math.min(originalDay, daysInMonth));
    return out;
  }

  function addYears(date, amount) {
    const out = new Date(date.getTime());
    const originalDay = out.getDate();
    const originalMonth = out.getMonth();
    out.setDate(1);
    out.setFullYear(out.getFullYear() + amount);
    const daysInMonth = new Date(out.getFullYear(), originalMonth + 1, 0).getDate();
    out.setMonth(originalMonth);
    out.setDate(Math.min(originalDay, daysInMonth));
    return out;
  }

  function getDayZero(date) {
    const out = new Date(date.getTime());
    out.setHours(0, 0, 0, 0);
    out.setDate(out.getDate() - out.getDay());
    return out;
  }

  function moveToWeekday(date, weekday) {
    const out = new Date(date.getTime());
    const currentWeekday = out.getDay();
    const delta = (weekday - currentWeekday + 7) % 7;
    out.setDate(out.getDate() + delta);
    return out;
  }

  function normalizeWeekdayToIndex(token) {
    switch (token) {
      case 'SU':
        return 0;
      case 'MO':
        return 1;
      case 'TU':
        return 2;
      case 'WE':
        return 3;
      case 'TH':
        return 4;
      case 'FR':
        return 5;
      case 'SA':
        return 6;
      default:
        return -1;
    }
  }

  function formatDateForRRule(date) {
    const pad = (number) => String(number).padStart(2, '0');
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const hh = pad(date.getHours());
    const mm = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `${y}${m}${d}T${hh}${mm}${ss}`;
  }

  function isWithinRange(date, range) {
    return date.getTime() >= range.start.getTime() && date.getTime() <= range.end.getTime();
  }

  function startOfDay(date) {
    const out = new Date(date.getTime());
    out.setHours(0, 0, 0, 0);
    return out;
  }

  function endOfDay(date) {
    const out = new Date(date.getTime());
    out.setHours(23, 59, 59, 999);
    return out;
  }

  function formatDateOnly(date) {
    const normalized = new Date(date.getTime());
    const y = normalized.getFullYear();
    const m = `${normalized.getMonth() + 1}`.padStart(2, '0');
    const d = `${normalized.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getTodayDateOnly() {
    return formatDateOnly(new Date());
  }

  function clampToTwoDecimals(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }

  function buildDescription(event) {
    const description = (event.description || '').trim();
    return description.length ? description.replace(/\s+/g, ' ') : '(no details)';
  }

  const api = {
    parseIcs,
    convertEventsToLines,
    resolveRange,
    parseIcsDate,
    normalizeUid,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (globalScope) {
    globalScope.IcsCore = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);

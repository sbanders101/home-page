const MAX_ROWS_WARNING = 50000;

const state = {
  file: null,
  customerGroups: [],
  objectUrls: [],
  stats: {
    rawEvents: 0,
    expandedRows: 0,
  },
};

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const dropIndicator = document.getElementById('drop-indicator');
const parseBtn = document.getElementById('parse-btn');
const exportBtn = document.getElementById('export-btn');
const statusEl = document.getElementById('status');
const warningsEl = document.getElementById('warnings');
const downloadLinks = document.getElementById('download-links');
const selectAllBtn = document.getElementById('select-all-btn');
const deselectAllBtn = document.getElementById('deselect-all-btn');
const previewContainer = document.getElementById('preview-container');

const controls = {
  dateFrom: document.getElementById('date-from'),
  dateTo: document.getElementById('date-to'),
  rate: document.getElementById('hourly-rate'),
  item: document.getElementById('default-item'),
  outputMode: document.getElementById('output-mode'),
};

function init() {
  bindDropZone();
  parseBtn.addEventListener('click', () => parseAndPreview());
  exportBtn.addEventListener('click', () => exportCsv());
  selectAllBtn.addEventListener('click', () => setAllSelection(true));
  deselectAllBtn.addEventListener('click', () => setAllSelection(false));
  setSelectionControlsEnabled(false);
  setExportEnabled();
}

function bindDropZone() {
  dropZone.addEventListener('click', () => fileInput.click());

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, (event) => event.preventDefault());
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (event) => {
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      fileInput.files = files;
      setLoadedFile(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      setLoadedFile(fileInput.files[0]);
    }
  });
}

function setLoadedFile(file) {
  state.file = file;
  dropZone.classList.add('has-file');
  dropIndicator.textContent = `Loaded: ${file.name}`;
  setStatus(`Loaded ${file.name}. Click Parse + Preview.`);
}

function resetDownloadLinks() {
  state.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  state.objectUrls = [];
  downloadLinks.innerHTML = '';
  downloadLinks.hidden = true;
}

function clearPreview() {
  previewContainer.className = 'preview-empty';
  previewContainer.textContent = 'Parse + Preview to generate grouped rows.';
  setSelectionControlsEnabled(false);
}

function setSelectionControlsEnabled(enabled) {
  selectAllBtn.disabled = !enabled;
  deselectAllBtn.disabled = !enabled;
}

function setAllSelection(selected) {
  if (!state.customerGroups.length) {
    return;
  }

  for (const customer of state.customerGroups) {
    customer.enabled = selected;
  }

  renderPreview(state.customerGroups);
  setExportEnabled();
}

function setStatus(text) {
  statusEl.textContent = text;
}

function setExportEnabled() {
  const selectedRows = countSelectedRows();
  exportBtn.disabled = selectedRows === 0;
}

function countSelectedRows() {
  return state.customerGroups.reduce((total, customer) => {
    if (!customer.enabled) {
      return total;
    }

    return total + customer.rows.filter((row) => row.selected).length;
  }, 0);
}

function addWarnings(entries) {
  warningsEl.innerHTML = '';
  if (!entries.length) {
    return;
  }

  for (const message of entries) {
    const li = document.createElement('li');
    li.textContent = message;
    if (message.startsWith('Error:')) {
      li.classList.add('error');
    } else {
      li.classList.add('success');
    }
    warningsEl.appendChild(li);
  }
}

function getOptions() {
  const hourlyRate = Number(controls.rate.value);
  if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
    return {
      valid: false,
      errors: ['Error: Default hourly rate must be a non-negative number.'],
    };
  }

  return {
    valid: true,
    dateFrom: controls.dateFrom.value || '',
    dateTo: controls.dateTo.value || '',
    hourlyRate,
    defaultItem: controls.item.value.trim() || 'Tutoring',
    outputMode: controls.outputMode.value,
  };
}

function parseAndPreview() {
  const file = fileInput.files ? fileInput.files[0] : null;
  if (!file) {
    setStatus('Please pick an .ics file first.');
    return;
  }

  const optionsResult = getOptions();
  if (!optionsResult.valid) {
    setStatus(optionsResult.errors[0]);
    addWarnings(optionsResult.errors);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result || '');
      const parserCore = getParserCore();
      const parsed = parserCore.parseIcs(text);
      if (parsed.errors.length > 0) {
        setStatus('Parse failed. Fix the calendar export and try again.');
        addWarnings(['Error: Could not read calendar content.'].concat(parsed.errors));
        exportBtn.disabled = true;
        resetDownloadLinks();
        clearPreview();
        return;
      }

      const conversion = parserCore.convertEventsToLines(parsed, optionsResult);

      state.customerGroups = conversion.customerGroups;
      state.stats.rawEvents = parsed.events.length;
      state.stats.expandedRows = conversion.expandedRows;

      renderPreview(conversion.customerGroups);
      const totalRows = conversion.expandedRows;
      const groupedCount = conversion.customerGroups.length;

      setStatus(
        `Parsed ${state.stats.rawEvents} event(s). ` +
          `Expanded to ${totalRows} row(s) across ${groupedCount} customer(s). ` +
          `Range used: ${conversion.rangeLabel}`
      );

      const renderWarnings = [...parsed.warnings, ...conversion.warnings, `Built ${totalRows} invoice row(s).`];
      addWarnings(renderWarnings);

      resetDownloadLinks();
      setSelectionControlsEnabled(totalRows > 0);
      setExportEnabled();

      if (totalRows === 0) {
        setStatus('No events matched the selected range. Adjust dates and parse again.');
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      addWarnings([`Error: ${error.message}`]);
      resetDownloadLinks();
      clearPreview();
      exportBtn.disabled = true;
    }
  };

  reader.onerror = () => {
    setStatus('Failed to read the selected file.');
    addWarnings(['Error: Could not read the selected file.']);
    exportBtn.disabled = true;
    clearPreview();
  };

  reader.readAsText(file);
}

function getParserCore() {
  if (
    window.IcsCore &&
    typeof window.IcsCore.parseIcs === 'function' &&
    typeof window.IcsCore.convertEventsToLines === 'function'
  ) {
    return window.IcsCore;
  }

  return { parseIcs, convertEventsToLines };
}

function renderPreview(groups) {
  previewContainer.innerHTML = '';
  if (!groups.length) {
    previewContainer.className = 'preview-empty';
    previewContainer.textContent = 'No invoice line items found for the selected range.';
    setSelectionControlsEnabled(false);
    return;
  }

  previewContainer.className = 'customer-sections';

  for (const group of groups) {
    const details = document.createElement('details');
    details.className = 'customer-group';
    details.open = false;

    const summary = document.createElement('summary');
    summary.className = 'customer-summary';
    summary.addEventListener('click', (event) => {
      if (event.target.closest('.summary-control, .no-toggle')) {
        event.preventDefault();
      }
    });

    const chevron = document.createElement('span');
    chevron.className = 'customer-chevron';
    chevron.textContent = '▸';
    chevron.setAttribute('aria-hidden', 'true');

    const summaryLeft = document.createElement('label');
    summaryLeft.className = 'customer-heading';
    const customerCheckbox = document.createElement('input');
    customerCheckbox.type = 'checkbox';
    customerCheckbox.className = 'customer-include no-toggle';
    customerCheckbox.checked = group.enabled;
    customerCheckbox.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    const customerTitle = document.createElement('span');
    customerTitle.className = 'customer-title';
    customerTitle.textContent = group.name;

    const customerCount = document.createElement('span');
    customerCount.className = 'customer-count';
    customerCount.textContent = `${group.rows.length} events`;

    const customerTotals = document.createElement('span');
    customerTotals.className = 'customer-stats';

    summaryLeft.append(customerCheckbox, customerTitle, customerCount, customerTotals);

    const summaryRight = document.createElement('div');
    summaryRight.className = 'customer-controls';

    const defaultItemLabel = document.createElement('label');
    defaultItemLabel.className = 'compact-control summary-control';
    const itemInput = document.createElement('input');
    itemInput.type = 'text';
    itemInput.value = group.item;
    const defaultItemText = document.createElement('span');
    defaultItemText.textContent = 'Item';

    const defaultRateLabel = document.createElement('label');
    defaultRateLabel.className = 'compact-control summary-control';
    const rateInput = document.createElement('input');
    rateInput.type = 'number';
    rateInput.min = '0';
    rateInput.step = '0.01';
    rateInput.value = String(group.rate);
    const defaultRateText = document.createElement('span');
    defaultRateText.textContent = 'Rate';

    const invoiceDateLabel = document.createElement('label');
    invoiceDateLabel.className = 'compact-control summary-control';
    const invoiceDateInput = document.createElement('input');
    invoiceDateInput.type = 'date';
    invoiceDateInput.value = normalizeDateOnly(group.invoiceDate);
    const invoiceDateText = document.createElement('span');
    invoiceDateText.textContent = 'Invoice Date';

    const termsLabel = document.createElement('label');
    termsLabel.className = 'compact-control summary-control';
    const termsSelect = document.createElement('select');
    const net30Option = document.createElement('option');
    net30Option.value = 'Net 30';
    net30Option.textContent = 'Net 30';
    const net15Option = document.createElement('option');
    net15Option.value = 'Net 15';
    net15Option.textContent = 'Net 15';
    termsSelect.append(net30Option, net15Option);
    termsSelect.value = normalizeTerms(group.terms);
    const termsText = document.createElement('span');
    termsText.textContent = 'Terms';

    defaultItemLabel.append(defaultItemText, itemInput);
    defaultRateLabel.append(defaultRateText, rateInput);
    invoiceDateLabel.append(invoiceDateText, invoiceDateInput);
    termsLabel.append(termsText, termsSelect);
    summaryRight.append(defaultItemLabel, defaultRateLabel, invoiceDateLabel, termsLabel);

    summary.append(chevron, summaryLeft, summaryRight);
    details.appendChild(summary);

    const rowsWrapper = document.createElement('div');
    rowsWrapper.className = 'customer-events';

    const rowElements = [];

    const sortedRows = [...group.rows].sort((a, b) => a.sortKey - b.sortKey);

    let rowIndex = 0;
    for (const row of sortedRows) {
      const rowEl = document.createElement('div');
      rowEl.className = 'event-row';
      rowEl.style.setProperty('--row-index', String(rowIndex));

      const eventCheckbox = document.createElement('input');
      eventCheckbox.type = 'checkbox';
      eventCheckbox.className = 'event-include no-toggle';
      eventCheckbox.checked = row.selected;

      const eventSummary = document.createElement('div');
      eventSummary.className = 'event-summary';

      const eventDate = document.createElement('span');
      eventDate.className = 'event-date';
      eventDate.textContent = row.date;

      const eventTitle = document.createElement('span');
      eventTitle.className = 'event-title';
      eventTitle.textContent = row.description;

      const eventMeta = document.createElement('div');
      eventMeta.className = 'event-meta';

      const qtyLabel = document.createElement('span');
      qtyLabel.className = 'event-meta-item';
      qtyLabel.textContent = `Qty ${clampToTwoDecimals(row.durationHours).toFixed(2)}h`;

      const rateLabel = document.createElement('span');
      rateLabel.className = 'event-meta-item';
      rateLabel.textContent = `Rate $${group.rate.toFixed(2)}`;

      const amountLabel = document.createElement('span');
      amountLabel.className = 'event-meta-item event-amount';
      amountLabel.textContent = `Amount $${clampMoney(row.durationHours * group.rate).toFixed(2)}`;

      eventMeta.append(qtyLabel, rateLabel, amountLabel);
      eventSummary.append(eventDate, eventTitle);

      rowEl.append(eventCheckbox, eventSummary, eventMeta);
      rowsWrapper.appendChild(rowEl);

      rowElements.push({
        row,
        rowEl,
        rateLabel,
        amountLabel,
      });

      rowIndex += 1;

      eventCheckbox.addEventListener('change', () => {
        row.selected = eventCheckbox.checked;
        updateCustomerTotals();
        setExportEnabled();
      });
    }

    const updateRowAmounts = () => {
      const safeRate = Number(group.rate);
      const numericRate = Number.isFinite(safeRate) && safeRate >= 0 ? safeRate : 0;
      group.rate = numericRate;
      for (const item of rowElements) {
        item.rateLabel.textContent = `Rate $${numericRate.toFixed(2)}`;
        item.amountLabel.textContent = `Amount $${clampMoney(item.row.durationHours * numericRate).toFixed(2)}`;
      }
    };

    const updateCustomerTotals = () => {
      const totals = getCustomerTotals(group);
      const selectedCount = getSelectedEventCount(group);
      customerCount.textContent = `${selectedCount} events (out of ${group.rows.length} total)`;
      customerTotals.textContent = `${formatHours(totals.durationHours)} • ${formatMoney(totals.amount)}`;
    };

    customerCheckbox.addEventListener('change', () => {
      group.enabled = customerCheckbox.checked;
      updateCustomerTotals();
      setExportEnabled();
    });

    itemInput.addEventListener('input', () => {
      group.item = itemInput.value.trim() || 'Tutoring';
      setExportEnabled();
    });

    rateInput.addEventListener('input', () => {
      const parsedRate = Number(rateInput.value);
      if (!Number.isFinite(parsedRate) || parsedRate < 0) {
        group.rate = 0;
      } else {
        group.rate = parsedRate;
      }

      rateInput.value = String(group.rate);
      updateRowAmounts();
      updateCustomerTotals();
      setExportEnabled();
    });

    invoiceDateInput.addEventListener('change', () => {
      group.invoiceDate = normalizeDateOnly(invoiceDateInput.value);
      invoiceDateInput.value = group.invoiceDate;
      setExportEnabled();
    });

    termsSelect.addEventListener('change', () => {
      group.terms = normalizeTerms(termsSelect.value);
      termsSelect.value = group.terms;
      setExportEnabled();
    });

    updateCustomerTotals();
    details.appendChild(rowsWrapper);
    previewContainer.appendChild(details);
  }
}

function parseIcs(text) {
  const events = [];
  const warnings = [];
  const errors = [];

  try {
    const lines = unfoldIcsLines(text);
    let i = 0;
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

    for (; i < lines.length; i += 1) {
      const line = lines[i];
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
  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
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

function parseIcsDate(value, params = {}) {
  const normalized = value.trim();

  if (params.VALUE === 'DATE' || /^\d{8}$/.test(normalized)) {
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
      tzid: params.TZID || '',
    };
  }

  const matchDateTime = normalized.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (!matchDateTime) {
    const fallback = new Date(normalized);
    if (Number.isNaN(fallback.getTime())) {
      return null;
    }
    return { date: fallback, allDay: false, tzid: params.TZID || '' };
  }

  const [_, year, month, day, hour, minute, second] = matchDateTime;
  const yearNum = Number(year);
  const monthNum = Number(month) - 1;
  const dayNum = Number(day);
  const h = Number(hour);
  const m = Number(minute);
  const s = Number(second);

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
    tzid: params.TZID || '',
  };
}

function parseExdate(value, out, params = {}) {
  if (!value) {
    return;
  }

  const valueParts = value.split(',');
  for (const part of valueParts) {
    const trimmed = part.trim();
    const parsed = parseIcsDate(trimmed, params);
    if (parsed) {
      const key = parseRecurrenceTokenKey(trimmed) || formatDateTimeKeyLocal(parsed.date);
      out.push({
        ms: parsed.date.getTime(),
        key,
        dayKey: key ? key.slice(0, 8) : '',
      });
    }
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

function convertEventsToLines(parsed, options) {
  const warnings = [...parsed.warnings];
  const customerGroups = [];
  const customerMap = new Map();
  const recurrenceOverridesByUid = buildRecurrenceOverridesByUid(parsed.events);
  let expandedRows = 0;
  const noDurationCustomers = new Set();

  const range = resolveRange(options.dateFrom, options.dateTo);
  if (range.isDefault) {
    warnings.push('No date range was provided; temporary local safety range is set to 365 days before/after today.');
  }

  for (const event of parsed.events) {
    if (event.status === 'CANCELLED') {
      continue;
    }

    if (event.invalid) {
      warnings.push(`Skipping event missing DTSTART: ${event.summary || event.uid || 'Unknown'}.`);
      continue;
    }

    const occurrences = getEventOccurrences(event, range, warnings, recurrenceOverridesByUid);
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
    warnings.push(`One or more events for customer \"${customerName}\" has no duration. Amount defaults to 0.00 unless edited with a manual rate override.`);
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

function getEventOccurrences(event, range, warnings, recurrenceOverridesByUid = new Map()) {
  if (!event.rrule) {
    return event.start && isWithinRange(event.start.date, range) ? [event.start.date] : [];
  }

  if (!event.start || !event.start.date) {
    return [];
  }

  const baseStart = event.start.date;
  const seen = new Set();
  let occurrences = [];

  try {
    const rule = buildRRule(event.rrule, baseStart, warnings);
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

  const exclusionTimes = new Set();
  const exclusionKeys = new Set();
  const exclusionDayKeys = new Set();
  for (const exdate of event.exdates || []) {
    if (typeof exdate === 'number') {
      exclusionTimes.add(new Date(exdate).getTime());
      continue;
    }

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

  return occurrences
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
    .filter((date) => isWithinRange(date, range))
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

function buildRRule(ruleText, dtStart, warnings) {
  if (!window.rrule) {
    return null;
  }

  const formattedStart = formatDateForRRule(dtStart);
  const rruleText = `DTSTART:${formattedStart}\nRRULE:${ruleText}`;

  const rruleApi = window.rrule;
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

    const firstStart = new Date(dtStart.getTime());
    const dayZero = getDayZero(firstStart);
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
  const trimmed = ruleText.trim();
  if (!trimmed.startsWith('RRULE:') && !trimmed.includes('FREQ=')) {
    return null;
  }

  const normalized = trimmed.replace(/^RRULE:/, '');
  const parts = normalized.split(';');
  for (const part of parts) {
    if (!part.includes('=')) {
      continue;
    }
    const [key, value] = part.split('=');
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

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())) {
    return null;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function normalizeDateOnly(value) {
  const parsed = parseDateOnly(value);
  return parsed ? formatDateOnly(parsed) : getTodayDateOnly();
}

function normalizeTerms(value) {
  return value === 'Net 15' ? 'Net 15' : 'Net 30';
}

function getTermsDays(terms) {
  return normalizeTerms(terms) === 'Net 15' ? 15 : 30;
}

function getDueDate(invoiceDate, terms) {
  const safeInvoiceDate = normalizeDateOnly(invoiceDate);
  const parsed = parseDateOnly(safeInvoiceDate);
  if (!parsed) {
    return getTodayDateOnly();
  }
  return formatDateOnly(addDays(parsed, getTermsDays(terms)));
}

function clampToTwoDecimals(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.round(value * 100) / 100;
}

function clampMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function formatHours(value) {
  return `${clampToTwoDecimals(value).toFixed(2)}h`;
}

function formatMoney(value) {
  return `$${clampMoney(value).toFixed(2)}`;
}

function getCustomerTotals(group) {
  if (!group || !group.rows) {
    return { durationHours: 0, amount: 0 };
  }

  if (!group.enabled) {
    return { durationHours: 0, amount: 0 };
  }

  let durationHours = 0;
  let amount = 0;

  for (const row of group.rows) {
    if (!row.selected) {
      continue;
    }

    const duration = Number(row.durationHours || 0);
    const rate = Number(group.rate || 0);
    durationHours += duration;
    amount += duration * rate;
  }

  return {
    durationHours: clampToTwoDecimals(durationHours),
    amount: clampMoney(amount),
  };
}

function getSelectedEventCount(group) {
  if (!group || !group.rows) {
    return 0;
  }

  return group.rows.filter((row) => row.selected).length;
}

function buildDescription(event) {
  const description = (event.description || '').trim();
  return description.length ? description.replace(/\s+/g, ' ') : '(no details)';
}

function buildCsvContent(lines) {
  const headers = [
    'InvoiceNo',
    'Customer',
    'InvoiceDate',
    'DueDate',
    'Terms',
    'Item(Product/Service)',
    'ItemQty',
    'ItemRate',
    'ItemAmount',
    'ServiceDate',
  ];
  const rows = [headers.join(',')];

  for (const line of lines) {
    rows.push(
      [
        csvCell(line.invoiceNo),
        csvCell(line.customer),
        csvCell(line.invoiceDate),
        csvCell(line.dueDate),
        csvCell(line.terms),
        csvCell(line.item),
        csvCell(clampToTwoDecimals(line.itemQty).toFixed(2)),
        csvCell(clampMoney(line.itemRate).toFixed(2)),
        csvCell(clampMoney(line.itemAmount).toFixed(2)),
        csvCell(line.serviceDate),
      ].join(',')
    );
  }

  return rows.join('\n');
}

function csvCell(value) {
  const text = String(value ?? '').replaceAll('"', '""');
  return `"${text}"`;
}

function exportCsv() {
  const lines = getExportLines();
  if (!lines.length) {
    setStatus('No enabled customer/event rows to export.');
    return;
  }

  if (lines.length > MAX_ROWS_WARNING) {
    const confirmed = window.confirm(
      `This export has ${lines.length} rows. Continue?\nLarge exports may be slow in the browser.`
    );
    if (!confirmed) {
      return;
    }
  }

  resetDownloadLinks();

  if (controls.outputMode.value === 'per-customer') {
    const perCustomer = new Map();
    for (const line of lines) {
      if (!perCustomer.has(line.customer)) {
        perCustomer.set(line.customer, []);
      }
      perCustomer.get(line.customer).push(line);
    }

    perCustomer.forEach((customerLines, customerName) => {
      const csv = buildCsvContent(customerLines);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      state.objectUrls.push(url);

      const link = document.createElement('a');
      link.href = url;
      link.download = `qbo-invoice-${sanitizeFileName(customerName)}.csv`;
      link.className = 'download-link';
      link.textContent = `Download ${customerName} (${customerLines.length} rows)`;
      link.addEventListener('click', () => {
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
      downloadLinks.appendChild(link);
    });

    downloadLinks.hidden = false;
    setStatus(`Prepared ${perCustomer.size} customer CSV file(s).`);
    return;
  }

  const csv = buildCsvContent(lines);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  state.objectUrls.push(url);

  const link = document.createElement('a');
  link.href = url;
  link.download = `qbo-invoice-export-${Date.now()}.csv`;
  link.className = 'download-link';
  link.textContent = `Download combined CSV (${lines.length} rows)`;
  link.addEventListener('click', () => {
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  });
  downloadLinks.appendChild(link);
  downloadLinks.hidden = false;

  setStatus(`Prepared combined CSV with ${lines.length} row(s).`);
}

function getExportLines() {
  const lines = [];
  let invoiceNo = 1001;

  for (const customer of state.customerGroups) {
    if (!customer.enabled) {
      continue;
    }

    const rows = [...customer.rows].sort((a, b) => a.sortKey - b.sortKey);
    const selectedRows = rows.filter((row) => row.selected);
    if (!selectedRows.length) {
      continue;
    }

    const item = customer.item || 'Tutoring';
    const safeRate = Number(customer.rate);
    const rate = Number.isFinite(safeRate) && safeRate >= 0 ? safeRate : 0;
    const invoiceDate = normalizeDateOnly(customer.invoiceDate);
    const terms = normalizeTerms(customer.terms);
    const dueDate = getDueDate(invoiceDate, terms);

    for (const row of selectedRows) {
      lines.push({
        invoiceNo,
        customer: customer.name,
        invoiceDate,
        dueDate,
        terms,
        item,
        itemQty: row.durationHours,
        itemRate: clampMoney(rate),
        itemAmount: clampMoney(row.durationHours * rate),
        serviceDate: row.date,
      });
    }

    invoiceNo += 1;
  }

  return lines;
}

function sanitizeFileName(value) {
  return String(value || 'customer')
    .trim()
    .replace(/[^a-zA-Z0-9-_\.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

window.addEventListener('DOMContentLoaded', init);

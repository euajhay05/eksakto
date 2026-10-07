/* Eksakto: tracker para sa Pinoy creatives (based on ShootTracker)
   Standalone implementation of the ShootTracker.dc.html design. */
(function () {
  'use strict';

  /* ---------------- constants & sample data ---------------- */

  const STATUS_META = [
    { value: 'tentative', label: 'Tentative',  color: 'oklch(0.6 0.02 150)',   progress: 5 },
    { value: 'idea',      label: 'Booked',     color: 'oklch(0.48 0.015 150)', progress: 15 },
    { value: 'resched',   label: 'Resched',    color: 'oklch(0.62 0.17 45)',   progress: 15 },
    { value: 'shot',      label: 'Editing',    color: 'oklch(0.55 0.12 175)',  progress: 55 },
    { value: 'approval',  label: 'For Approval', color: 'oklch(0.62 0.16 70)', progress: 80 },
    { value: 'posted',    label: 'Completed',  color: 'oklch(0.45 0.14 150)',  progress: 100 },
  ];
  const SCRIPT_STATUS_META = {
    'Not Started': { color: 'oklch(0.48 0.015 150)', bg: 'oklch(0.48 0.015 150 / 0.14)' },
    'Drafting':    { color: 'oklch(0.5 0.16 240)',   bg: 'oklch(0.55 0.15 240 / 0.16)' },
    'In Review':   { color: 'oklch(0.58 0.16 80)',   bg: 'oklch(0.62 0.15 80 / 0.16)' },
    'Final':       { color: 'oklch(0.55 0.14 150)',  bg: 'oklch(0.55 0.14 150 / 0.16)' },
  };
  /* ---------------- icons (one consistent set: 24px grid, 1.7 stroke, round ends) ---------------- */
  const ICON_PATHS = {
    home: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM14 4v3h6V4zM4 17v3h6v-3z"/>',
    shoots: '<rect x="3" y="7" width="13" height="11" rx="2"/><path d="M16 11l5-3v9l-5-3"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    clients: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.3-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.6c2 .7 3.2 2.6 3.5 5.4"/>',
    payments: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h3"/>',
    money: '<path d="M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7"/>',
    docs: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M4.2 7.5l2.1 1.2M17.7 15.3l2.1 1.2M4.2 16.5l2.1-1.2M17.7 8.7l2.1-1.2"/><circle cx="12" cy="12" r="7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    cloud: '<path d="M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7z"/><path d="M12 16v-5M9.5 13.5 12 11l2.5 2.5"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="M16 10.5l5-3v9l-5-3z"/>',
    camera: '<path d="M3 8h4l2-3h6l2 3h4v11H3z"/><circle cx="12" cy="13" r="3.5"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  };
  function icon(name, size) {
    const sz = size || 20;
    return `<svg class="ico" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
  }

  /* ---------------- business settings (set by the buyer in Settings) ---------------- */
  // Buyer-editable names for stages, lead statuses and categories (stored values stay the same).
  function applyLabelSettings() {
    const sl = S().statusLabels || {};
    STATUS_META.forEach(m => { if (!m.base) m.base = m.label; m.label = String(sl[m.value] || '').trim() || m.base; });
  }
  function expenseCategories() {
    const list = (S().expenseCategories || []).map(x => String(x || '').trim()).filter(Boolean);
    return list.concat(['Other']);
  }
  function fillTemplate(tpl, d, mf) {
    const map = { business: bizName(), owner: ownerName() || bizName(), client: d.clientName || '[Client Name]', project: d.description || '[Project/Service]', date: d.date ? fmtDate(d.date) : '[Date]', amount: (mf || fmtMoney)(d.amount), valid: d.dueDate ? fmtDateShortYear(d.dueDate) : '' };
    return String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
  }
  function projectTypes() { return (S().projectTypes || []).map(x => String(x || '').trim()).filter(Boolean); }
  const STARTER_PRESETS = {
    video: {
      label: 'Videographer', tagline: 'Video Production',
      packages: [{ value: 'pk_v1', name: 'Highlights Film', price: 15000 }, { value: 'pk_v2', name: 'Same Day Edit', price: 30000 }, { value: 'pk_v3', name: 'Full Coverage', price: 45000 }],
      addons: [{ key: 'ad_v1', label: 'Raw Footage', price: 3000, flat: true }, { key: 'ad_v2', label: 'Drone Coverage', price: 5000, flat: true }, { key: 'ad_v3', label: 'Extra Hour of Coverage', price: 2000, flat: false }],
      projectTypes: ['Wedding', 'Prenup', 'Debut', 'Event', 'Corporate', 'Music Video', 'Others'],
    },
    photo: {
      label: 'Photographer', tagline: 'Photography',
      packages: [{ value: 'pk_p1', name: 'Mini Session', price: 5000 }, { value: 'pk_p2', name: 'Half Day', price: 12000 }, { value: 'pk_p3', name: 'Whole Day', price: 20000 }],
      addons: [{ key: 'ad_p1', label: 'Extra Edited Photos (10 pcs)', price: 1000, flat: false }, { key: 'ad_p2', label: 'Printed Album', price: 6000, flat: true }, { key: 'ad_p3', label: 'Extra Hour of Coverage', price: 1500, flat: false }],
      projectTypes: ['Wedding', 'Prenup', 'Portrait', 'Family', 'Product', 'Event', 'Others'],
    },
  };
  function defaultSettings() {
    return {
      businessName: '',
      ownerName: '',
      tagline: 'Video & Photo Production',
      contactLine: '',
      logo: '',            // small dataURL, resized on upload
      paymentQr: '',
      paymentDetails: '',
      packages: [
        { value: 'basic',    name: 'Basic',    price: 8000 },
        { value: 'standard', name: 'Standard', price: 12000 },
        { value: 'premium',  name: 'Premium',  price: 18000 },
      ],
      addons: [
        { key: 'rawFootage',  label: 'Raw Footage', price: 2000, flat: true },
        { key: 'extraVideo',  label: 'Extra Edited Video', price: 3000, flat: false },
        { key: 'extraHour',   label: 'Extra Hour of Coverage', price: 1500, flat: false },
      ],
      milestones: [
        { label: 'Down Payment', pct: 50 },
        { label: 'Final Payment', pct: 50 },
      ],
      quoteNextStep: 'To confirm your booking, simply reply to this quotation. Once confirmed, we will send the contract and the down payment details.',
      quoteTerms: 'A down payment is required to lock in your date. The remaining balance is due upon delivery of the final output.',
      contractTerms: '',
      statusLabels: { tentative: 'Inquiry', idea: 'Booked', resched: 'Resched', shot: 'Editing', approval: 'For Approval', posted: 'Delivered' },
      leadLabels: { 'New Lead': 'New Lead', 'Contacted': 'Contacted', 'Proposal Sent': 'Proposal Sent', 'Booked': 'Booked', 'Client': 'Completed', 'Lost': 'Lost' },
      projectTypes: ['Wedding', 'Prenup', 'Event', 'Corporate', 'Product', 'Others'],
      expenseCategories: ['Gear & Equipment', 'Gear Rental', 'Transport & Fuel', 'Food sa Shoot', 'Talent & Crew', 'Software & Subscriptions', 'Props & Venue', 'Marketing & Ads', 'Bills & Internet'],
      tplContract: 'This Service Agreement is entered into between {business} and {client} for the production of "{project}", to be delivered on {date} for a total contract value of {amount}.',
      tplQuotation: 'Thank you for the opportunity to work with you. Below is our proposed scope of work and pricing for {project}.',
      tplInvoice: 'Statement of account for {client} for "{project}", dated {date}. Amount due: {amount}.',
      yearlyGoal: 0,
      features: { gear: true, loans: false, goals: false, salary: false, clients: true, expenses: true, docs: true, insights: true },
      checklistHidden: false,
      onboarded: false,
    };
  }
  function S() { try { return (state && state.settings) || defaultSettings(); } catch (e) { return defaultSettings(); } }
  function bizName() { return (S().businessName || '').trim() || 'Your Business'; }
  function ownerName() { return (S().ownerName || '').trim(); }
  function bizInitials() {
    const w = bizName().split(/\s+/).filter(Boolean);
    return ((w[0] || 'E')[0] + (w[1] ? w[1][0] : '')).toUpperCase();
  }
  function fileSlug() { return (bizName().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/ /g, '_') || 'eksakto'); }
  function feat(name) { const f = S().features || {}; return !!f[name]; }

  // Package tiers come from Settings; "Custom Quote" is always last.
  function packageTiers() {
    const pk = (S().packages || []).filter(p => p && p.name);
    return pk.map((p, i) => ({ value: p.value || ('pk' + i), price: Number(p.price) || 0, label: `${p.name} (₱${(Number(p.price) || 0).toLocaleString('en-US')})` }))
      .concat([{ value: 'custom', label: 'Custom Quote', price: null }]);
  }
  function getLiveTiers() { return packageTiers(); }
  function customTier() { const t = packageTiers(); return t[t.length - 1]; }
  function addonDefs() {
    return (S().addons || []).filter(a => a && a.label).map((a, i) => ({ key: a.key || ('ad' + i), label: a.label, price: Number(a.price) || 0, flat: !!a.flat, unitLabel: a.flat ? 'flat rate' : 'each' }));
  }
  const USD_TO_PHP = 58;
  // Payment schedule from Settings (e.g. 50% down, 50% final). `cumulative` is the running
  // total after that milestone; multiply by the grand total to get the amount due to reach it.
  function milestoneDefs() {
    let ms = (S().milestones || []).filter(m => m && Number(m.pct) > 0);
    if (!ms.length) ms = [{ label: 'Full Payment', pct: 100 }];
    const total = ms.reduce((a, m) => a + Number(m.pct), 0) || 100;
    let run = 0;
    return ms.map((m, i) => {
      const w = Number(m.pct) / total * 100;
      run += w;
      return { key: 'm' + i, label: `${Math.round(w)}% ${m.label}`, shortLabel: `${Math.round(w)}% ${m.label.split(' ')[0]}`, weight: w, cumulative: i === ms.length - 1 ? 1 : run / 100 };
    });
  }
  function shootPayLabels() { return milestoneDefs().map(m => m.label).concat(['Payment']); }
  // Given a grand total and how much has been paid, the next milestone still owed and the exact
  // amount needed to reach it (never more than the remaining balance).
  function nextMilestoneDue(grandTotal, paid) {
    const g = Number(grandTotal) || 0, p = Number(paid) || 0;
    const fullBalance = Math.max(g - p, 0);
    const next = milestoneDefs().map(m => ({ ...m, target: g * m.cumulative })).find(m => p < m.target);
    const due = next ? Math.max(Math.min(next.target - p, fullBalance), 0) : 0;
    return { next, due, fullBalance };
  }
  const SHOOT_TYPES = ['Real Estate', 'General Project'];
  // Stored values stay the same for old data; shown to the user as Package / Custom.
  const SHOOT_TYPE_LABELS = { 'Real Estate': 'Package', 'General Project': 'Custom Project' };
  function shootTypeLabel(v) { return SHOOT_TYPE_LABELS[v] || v || 'Project'; }
  const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const MONTH_SHORT_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const LEAD_STATUSES = ['New Lead', 'Contacted', 'Proposal Sent', 'Booked', 'Client', 'Lost'];
  // Display-only labels — the stored value stays 'Client' (so old Supabase records and all the
  // leadStatus === 'Client' checks throughout the app keep working), but "Client" read confusingly
  // next to a page that's already called "Clients." Shown as "Completed" instead, everywhere.
  const LEAD_STATUS_LABELS = { Client: 'Completed' };
  function leadStatusLabel(v) { const ll = (S().leadLabels || {}); return ll[v] || LEAD_STATUS_LABELS[v] || v; }
  const LEAD_STATUS_META = {
    'New Lead':      { color: 'oklch(0.5 0.16 235)',  bg: 'oklch(0.55 0.15 235 / 0.16)' },
    'Contacted':     { color: 'oklch(0.58 0.16 80)',  bg: 'oklch(0.62 0.15 80 / 0.16)' },
    'Proposal Sent': { color: 'oklch(0.55 0.12 175)', bg: 'oklch(0.55 0.12 175 / 0.16)' },
    'Booked':        { color: 'oklch(0.55 0.14 150)', bg: 'oklch(0.55 0.14 150 / 0.16)' },
    'Client':        { color: 'oklch(0.45 0.14 150)', bg: 'oklch(0.5 0.13 150 / 0.14)' },
    'Lost':          { color: 'oklch(0.48 0.015 150)', bg: 'oklch(0.48 0.015 150 / 0.16)' },
  };

  const DOC_TYPE_META = {
    contract:  { title: 'Service Agreement / Contract', body: (d, mf = fmtMoney) => fillTemplate(S().tplContract, d, mf) + (S().contractTerms ? ' ' + S().contractTerms : '') },
    quotation: { title: 'Quotation',                      body: (d, mf = fmtMoney) => fillTemplate(S().tplQuotation, d, mf) + (d.dueDate ? ` This quotation is valid until ${fmtDateShortYear(d.dueDate)}.` : '') },
    invoice:   { title: 'Statement of Account',           body: (d, mf = fmtMoney) => fillTemplate(S().tplInvoice, d, mf) },
  };


  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  const TODAY_STR = todayStr();
  const TODAY = new Date(TODAY_STR + 'T00:00:00');
  const THIS_MONTH_KEY = TODAY_STR.slice(0, 7);
  // For dashboard week/month grouping: a shoot sits on its shoot date, while an
  // edit-only task sits on its edit/delivery deadline (falling back to the day it
  // was created if no deadline was set). Keeps "shoots" and "edits" honest.
  function dashDateOf(s) { return (s.serviceType === 'edit' && s.deadline) ? s.deadline : s.date; }

  /* ---------------- helpers ---------------- */

  function addDays(dstr, n) {
    const d = new Date(dstr + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function formatInvoiceNumber(n, kind) {
    const prefix = kind === 'invoice' ? 'INV' : 'SOA';
    return `${prefix} ${TODAY_STR.slice(0, 4)} ${String(n).padStart(3, '0')}`;
  }
  // Cross-device numbering: derive the next sequence number from the synced documents
  // themselves (highest existing "-NNN" suffix + 1) so it never restarts at 1 on a new
  // device and never reissues a number already saved in the cloud history.
  function deriveInvoiceCounter(documents) {
    let max = 0;
    (documents || []).forEach(r => {
      const m = /[-\s](\d+)\s*$/.exec((r && r.draft && r.draft.invoiceNumber) || '');
      if (m) max = Math.max(max, Number(m[1]) || 0);
    });
    return max + 1;
  }
  // The next number to suggest, using the synced documents as the source of truth and the
  // device-local counter only as a floor (covers the brand-new-account, no-documents case).
  function nextInvoiceNumber(s, kind) {
    return formatInvoiceNumber(Math.max(Number(s.invoiceCounter) || 1, deriveInvoiceCounter(s.documents)), kind);
  }
  // Single source of truth for a fresh billing-document draft (was duplicated verbatim in
  // several places, which drifted whenever a field was added).
  function settingsPaymentDetails() { try { return (state && state.settings && state.settings.paymentDetails) || ''; } catch (e) { return ''; } }
  function blankDocDraft(invoiceNumber) {
    return { clientName: '', description: '', amount: '', date: TODAY_STR, notes: '', invoiceNumber, dueDate: addDays(TODAY_STR, 10), clientContact: '', lineItems: '', paymentDetails: settingsPaymentDetails(), paymentStatus: 'Unpaid', packageTotal: '', paidToDate: '', milestoneLabel: '', currency: 'PHP', includeQr: true, billingKind: 'soa' };
  }
  function fmtMoney(n) {
    n = Number(n) || 0;
    // Whole pesos display with no decimals (₱8,000); anything with centavos always shows
    // exactly 2 decimal places (₱89,960.30) instead of the inconsistent 1-or-0 that
    // Number.prototype.toLocaleString gives by default.
    const hasCents = Math.round(n * 100) % 100 !== 0;
    return (n < 0 ? '−₱' : '₱') + Math.abs(n).toLocaleString('en-PH', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
  }
  // Currency-aware money formatter for documents (invoices can be billed in USD for foreign
  // clients). PHP uses the ₱ sign; USD uses "$". Same whole-number/2-decimal rule as fmtMoney.
  function fmtMoneyCur(n, cur) {
    n = Number(n) || 0;
    const hasCents = Math.round(n * 100) % 100 !== 0;
    if (cur === 'USD') return '$' + n.toLocaleString('en-US', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
    return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 });
  }
  // Splits a free-text "Line Items Breakdown" field (one entry per line, e.g.
  // "Package fee - ₱10,000") into { label, amount } rows for the itemized invoice table.
  // Used by both the on-screen preview and the generated PDF so they stay in sync.
  function parseLineItems(str) {
    // "Label: ₱10,000" (or the older "Label - ₱10,000") puts the amount in its own column.
    return String(str || '').split('\n').map(s => s.trim()).filter(Boolean).map(line => {
      const m = line.match(/^(.*?)(?:\s+-\s+|\s*:\s*)(?:PHP|₱|\$)?\s*([\d,]+(?:\.\d+)?)\s*(?:PHP)?$/i);
      if (!m) return { label: line, amount: null };
      return { label: m[1].trim(), amount: Number(m[2].replace(/,/g, '')) };
    });
  }
  // Strips anything that isn't a digit or decimal point from a money input's raw typed value
  // (commas, letters, extra dots) — this is what actually gets stored in state, so calculations
  // (Number(...)) never see commas. Only the DISPLAYED value gets comma-formatted.
  function sanitizeMoneyInput(v) {
    v = String(v == null ? '' : v).replace(/[^\d.]/g, '');
    const dotIdx = v.indexOf('.');
    if (dotIdx !== -1) v = v.slice(0, dotIdx + 1) + v.slice(dotIdx + 1).replace(/\./g, '');
    return v;
  }
  // Live "as-you-type" thousands-separator formatting for money inputs, e.g. "9584.02" -> "9,584.02".
  function formatMoneyLiveDisplay(v) {
    const s = sanitizeMoneyInput(v);
    if (!s) return '';
    const dotIdx = s.indexOf('.');
    let intPart = dotIdx === -1 ? s : s.slice(0, dotIdx);
    const decPart = dotIdx === -1 ? null : s.slice(dotIdx + 1);
    intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decPart !== null ? `${intPart}.${decPart}` : intPart;
  }
  // After reformatting adds/removes commas, the cursor's raw character-index no longer lines up
  // with the same visual spot — walk the new formatted string until we've passed the same number
  // of non-comma characters that were to the left of the cursor before formatting.
  function moneyCursorAfterFormat(formatted, rawCharsBeforeCursor) {
    if (rawCharsBeforeCursor <= 0) return 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (formatted[i] !== ',') count++;
      if (count >= rawCharsBeforeCursor) return i + 1;
    }
    return formatted.length;
  }
  function fmtDateLong(dstr) {
    if (!dstr) return '';
    const dt = new Date(dstr + 'T00:00:00');
    return isNaN(dt) ? dstr : dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  function fmtDate(dstr) {
    if (!dstr) return 'No date';
    const d = new Date(dstr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function fmtDateShortYear(dstr) {
    if (!dstr) return '';
    const d = new Date(dstr + 'T00:00:00');
    return isNaN(d) ? dstr : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  function fmtTime(tstr) {
    if (!tstr) return 'TBD';
    const [h, m] = tstr.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}:${String(m).padStart(2, '0')} ${ap}`;
  }
  function setTimePart(timeStr, part, value) {
    let [hh, mm] = (timeStr || '09:00').split(':').map(Number);
    let hour12 = hh % 12 === 0 ? 12 : hh % 12;
    let meridiem = hh >= 12 ? 'PM' : 'AM';
    if (part === 'hour') hour12 = value;
    if (part === 'minute') mm = value;
    if (part === 'meridiem') meridiem = value;
    const newHH = meridiem === 'PM' ? (hour12 % 12) + 12 : (hour12 % 12);
    return `${String(newHH).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  function daysLeftOf(dstr) {
    if (!dstr) return null;
    const d = new Date(dstr + 'T00:00:00');
    return Math.round((d - TODAY) / 86400000);
  }
  function daysLeftLabelAndColor(days) {
    if (days === null) return { label: 'No date', color: 'oklch(0.55 0.015 150)' };
    if (days < 0) return { label: `${Math.abs(days)}d overdue`, color: 'oklch(0.58 0.19 25)' };
    if (days === 0) return { label: 'Today', color: 'oklch(0.58 0.19 25)' };
    if (days <= 3) return { label: `${days}d left`, color: 'oklch(0.58 0.19 25)' };
    if (days <= 7) return { label: `${days}d left`, color: 'oklch(0.58 0.16 80)' };
    return { label: `${days}d left`, color: 'oklch(0.48 0.015 150)' };
  }
  function ordinal(n) {
    n = Number(n);
    const v = n % 100;
    const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
    return n + (suffixes[v - 20] || suffixes[v] || 'th');
  }
  // Loans have a recurring monthly due DAY (e.g. "the 23rd") rather than a one-time date —
  // this finds the next actual calendar date that day falls on (today if it's today, else
  // next month), clamping to the last day of shorter months (e.g. day 31 in Feb -> Feb 28/29).
  function nextMonthlyDueDate(dueDay) {
    const day = Number(dueDay);
    if (!day || day < 1 || day > 31) return null;
    const clampedDayIn = (y, m) => Math.min(day, new Date(y, m + 1, 0).getDate());
    let y = TODAY.getFullYear(), m = TODAY.getMonth();
    let d = clampedDayIn(y, m);
    if (d < TODAY.getDate()) {
      m += 1; if (m > 11) { m = 0; y++; }
      d = clampedDayIn(y, m);
    }
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  function statusMeta(status) { return STATUS_META.find(s => s.value === status) || STATUS_META[0]; }
  function goalIcon(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('car')) return '🚗';
    if (n.includes('emergency')) return '🛟';
    if (n.includes('stock')) return '📈';
    if (n.includes('mp2') || n.includes('pag-ibig') || n.includes('pagibig')) return '🏦';
    if (n.includes('creative')) return '🎬';
    return '🎯';
  }
  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function csvCell(v) {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function downloadCSV(filename, rows) {
    const csvBody = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function setPath(obj, path, value) {
    const keys = path.split('.');
    const root = Array.isArray(obj) ? obj.slice() : { ...obj };
    let cur = root;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      cur[k] = Array.isArray(cur[k]) ? cur[k].slice() : { ...cur[k] };
      cur = cur[k];
    }
    cur[keys[keys.length - 1]] = value;
    return root;
  }
  function buildCalendarCells(year, month, shoots, selectedDate, disableFuture) {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ blank: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dayShoots = shoots.filter(s => s.date === dateStr);
      const isToday = dateStr === TODAY_STR;
      const isSelected = dateStr === selectedDate;
      const isFuture = disableFuture && dateStr > TODAY_STR;
      cells.push({
        dayNum: d, dateStr, disabled: isFuture, isToday, isSelected,
        bg: isSelected ? 'oklch(0.55 0.14 150 / 0.22)' : (isToday ? 'oklch(0 0 0 / 0.06)' : 'oklch(0.97 0.006 150)'),
        border: isSelected ? 'oklch(0.55 0.14 150 / 0.6)' : 'oklch(0 0 0 / 0.05)',
        textColor: isFuture ? 'oklch(0.75 0.01 150)' : (isToday ? 'oklch(0.6 0.15 150)' : 'oklch(0.35 0.015 150)'),
        // Two representations of the same day's shoots: `dots` (small colored dots) is still
        // used by the compact date-picker popover inside the Shoot modal, where there's no room
        // for text. `shootItems`/`extraShootCount` (client name + location) is used by the big
        // Shoots-page calendar, which has room to show real details instead of just dots.
        dots: dayShoots.slice(0, 4).map(s => statusMeta(s.status).color),
        shootItems: dayShoots.slice(0, 2).map(s => {
          const isEdit = s.serviceType === 'edit';
          return {
            id: s.id,
            client: s.client || 'Untitled',
            location: s.location || '',
            color: isEdit ? '#33503c' : 'oklch(0.42 0.13 150)',
            bg: isEdit ? '#e6ece8' : 'oklch(0.945 0.05 150)',
            border: isEdit ? '#9fbaa9' : 'oklch(0.82 0.09 150)',
          };
        }),
        extraShootCount: Math.max(0, dayShoots.length - 2),
      });
    }
    return cells;
  }

  // Generic day-grid date picker, matching the shoot date picker chrome. Replaces the old
  // native <input type="date"> fields so every date field across the app looks the same.
  // opts: { align: 'left'|'right', future: bool (true = allow future dates), placeholder }
  function dpField(label, bind, value, opts) {
    opts = opts || {};
    const align = opts.align === 'right' ? 'right:0' : 'left:0';
    const disableFuture = !opts.future;
    const open = state.dpKey === bind;
    const dispLabel = value
      ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
      : (opts.placeholder || 'Select date');
    const y = (state.dpYear != null ? state.dpYear : TODAY.getFullYear());
    const m = (state.dpMonth != null ? state.dpMonth : TODAY.getMonth());
    const monLabel = new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const cells = buildCalendarCells(y, m, [], value, disableFuture);
    return `<div class="field" style="position:relative"><label>${label}</label>
      <button type="button" data-action="dp-toggle" data-bind="${bind}" data-value="${esc(value || '')}" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:10px 12px;color:${value ? 'inherit' : 'oklch(0.6 0.01 150)'};font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between"><span>${dispLabel}</span><span style="font-size:13px;opacity:0.5">\u{1F4C5}</span></button>
      ${open ? `
      <div data-picker-popover style="position:absolute;${align};top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:16px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:260px;max-width:min(300px,86vw)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <div class="sg" style="font-weight:700;font-size:15px">${monLabel}</div>
          <div style="display:flex;gap:6px">
            <button type="button" data-action="dp-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
            <button type="button" data-action="dp-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
          ${WEEKDAY_LABELS.map(w => `<div style="text-align:center;font-size:10.5px;font-weight:700;color:oklch(0.55 0.015 150)">${w}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
          ${cells.map(c => c.blank ? `<div></div>` : (c.disabled
            ? `<div style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:600;color:${c.textColor};opacity:0.4">${c.dayNum}</div>`
            : `<div data-action="dp-pick" data-bind="${bind}" data-date="${c.dateStr}" style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12.5px;font-weight:600;background:${c.bg};border:1px solid ${c.border};color:${c.textColor}">${c.dayNum}</div>`)).join('')}
        </div>
      </div>` : ''}
    </div>`;
  }

  function buildExpenseCalendarCells(year, month, expenses, selectedDate) {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ blank: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const dayExpenses = expenses.filter(e => e.date === dateStr);
      const dayTotal = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const isToday = dateStr === TODAY_STR;
      const isSelected = dateStr === selectedDate;
      cells.push({
        dayNum: d, dateStr,
        bg: isSelected ? 'oklch(0.55 0.14 150 / 0.22)' : (isToday ? 'oklch(0 0 0 / 0.06)' : 'oklch(0.97 0.006 150)'),
        border: isSelected ? 'oklch(0.55 0.14 150 / 0.6)' : 'oklch(0 0 0 / 0.05)',
        textColor: isToday ? 'oklch(0.6 0.15 150)' : 'oklch(0.35 0.015 150)',
        hasExpense: dayExpenses.length > 0,
        dayTotalLabel: dayExpenses.length > 0 ? fmtMoney(dayTotal) : '',
      });
    }
    return cells;
  }

  function buildRangeCalendarCells(year, month, draftFrom, draftTo) {
    const firstDay = new Date(year, month, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ blank: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const isEndpoint = dateStr === draftFrom || dateStr === draftTo;
      const inRange = draftFrom && draftTo && dateStr > draftFrom && dateStr < draftTo;
      const disabled = dateStr > TODAY_STR;
      cells.push({
        dayNum: d, dateStr, disabled,
        bg: disabled ? 'transparent' : (isEndpoint ? 'oklch(0.45 0.14 150)' : (inRange ? 'oklch(0.55 0.14 150 / 0.18)' : 'transparent')),
        color: disabled ? 'oklch(0.8 0.01 150)' : (isEndpoint ? 'oklch(1 0 0)' : 'oklch(0.3 0.015 150)'),
      });
    }
    return cells;
  }

  // Small non blocking confirmation (no browser alert dialogs).
  function setSettings(patch) { setState(s => ({ settings: { ...s.settings, ...patch } })); }
  // Opens the file picker, shrinks the image to fit `max` px, and hands back a dataURL.
  // `bg` fills transparent areas (white for QR codes; null keeps transparency for logos).
  function pickImage(max, bg, cb) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.width, h = img.height;
          if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const cctx = canvas.getContext('2d');
          if (bg) { cctx.fillStyle = bg; cctx.fillRect(0, 0, w, h); }
          cctx.drawImage(img, 0, 0, w, h);
          let dataUrl;
          try { dataUrl = canvas.toDataURL('image/png'); } catch (e) { dataUrl = reader.result; }
          if (dataUrl.length > 900000) { alertSoft('Masyadong malaki ang image. Subukan ang mas maliit na file.'); return; }
          cb(dataUrl);
        };
        img.onerror = () => alertSoft('Hindi mabasa ang image. Subukan ang PNG o JPG.');
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    input.click();
  }

  function alertSoft(msg) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:10px 16px;font-size:13px;z-index:9999;box-shadow:0 6px 24px rgba(0,0,0,.12)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
  /* ---------------- state ---------------- */

  function defaultState() {
    return {
      view: 'dashboard',
      mobileNavOpen: false,
      sidebarCollapsed: localStorage.getItem('shoottracker_sidebar_collapsed') === '1',
      shoots: [],
      expenses: [],
      loans: [],
      fullTimeIncome: [],
      goals: [],
      clients: [],
      settings: defaultSettings(),
      globalSearch: '', quickAddOpen: false, moreOpen: false, mSearchOpen: false,
      financeTab: 'sidehustle',
      financeMonthKey: THIS_MONTH_KEY,
      ftDraft: { sourceType: '1st', sourceOther: '', amount: '', date: TODAY_STR },
      ftDraftDatePickerOpen: false, ftDraftDateCalYear: TODAY.getFullYear(), ftDraftDateCalMonth: TODAY.getMonth(),
      dashMonthKey: THIS_MONTH_KEY,
      modal: null,
      draft: null,
      draftDateLocked: false,
      shootAddonsOpen: false,
      shootConfirmCloseOpen: false,
      rescheduleDraft: null,
      financeBreakdown: null,
      financeExportOpen: false,
      financeExportRange: '3m',
      expenseExportOpen: false,
      expenseExportRange: '3m',
      exportCustom: { from: '', to: '' },
      shootDatePickerOpen: false,
      timePickerOpen: false,
      shootDateCalYear: TODAY.getFullYear(),
      shootDateCalMonth: TODAY.getMonth(),
      dpKey: null,
      dpYear: TODAY.getFullYear(),
      dpMonth: TODAY.getMonth(),
      shootDeadlinePickerOpen: false,
      shootDeadlineCalYear: TODAY.getFullYear(),
      shootDeadlineCalMonth: TODAY.getMonth(),
      shootsMode: 'board',
      calendarYear: TODAY.getFullYear(),
      calendarMonth: TODAY.getMonth(),
      selectedDate: TODAY_STR,
      telegramModalOpen: false,
      expenseDraft: { description: '', amount: '', date: TODAY_STR },
      expensesMonthKey: THIS_MONTH_KEY,
      expensesSelectedDate: TODAY_STR,
      expensesDayCalYear: TODAY.getFullYear(),
      expensesDayCalMonth: TODAY.getMonth(),
      expensesReportYear: TODAY.getFullYear(),
      expensesReportSelectedMonth: THIS_MONTH_KEY,
      expensesListOpen: true,
      loanModal: null,
      loanDraft: null,
      loanStartPickerOpen: false,
      loanStartCalYear: TODAY.getFullYear(),
      loanPaymentModal: null,
      loanPaymentDraft: null,
      shootPaymentModal: null,
      shootPaymentDraft: null,
      goalModal: null,
      goalDraft: null,
      goalFundModal: null,
      goalFundDraft: null,
      clientModal: null,
      clientDraft: null,
      gearItems: [],
      gearModal: null,
      gearDraft: null,
      gearSearch: '',
      docType: 'contract',
      invoiceCounter: Number(localStorage.getItem('shoottracker_invoice_counter')) || 1,
      usdRate: (() => { try { return Number(localStorage.getItem('pol_usd_rate')) || 0; } catch (e) { return 0; } })(),
      usdRateDate: (() => { try { return localStorage.getItem('pol_usd_rate_date') || ''; } catch (e) { return ''; } })(),
      docDatePickerOpen: false, docDateCalYear: TODAY.getFullYear(), docDateCalMonth: TODAY.getMonth(),
      docDuePickerOpen: false, docDueCalYear: TODAY.getFullYear(), docDueCalMonth: TODAY.getMonth(),
      docDraft: blankDocDraft(formatInvoiceNumber(Number(localStorage.getItem('shoottracker_invoice_counter')) || 1, 'soa')),
      documents: [],
      docsHistoryOpen: false,
      editingDocId: null,
      insightsChartYear: TODAY.getFullYear(),
      insightsChartSelectedMonth: THIS_MONTH_KEY,
      chipModal: null,
      shootsSearch: '', clientsSearch: '', expensesSearch: '', loansSearch: '', goalsSearch: '',
    };
  }

  const PERSIST_KEYS = ['shoots', 'expenses', 'loans', 'fullTimeIncome', 'goals', 'clients', 'documents', 'gearItems', 'settings'];
  const VALID_VIEWS = ['dashboard', 'shoots', 'clients', 'finances', 'expenses', 'loans', 'goals', 'gear', 'docs', 'insights', 'settings'];

  /* ---------------- local storage (data stays on this device) ---------------- */

  const DATA_KEY = 'eksakto_data_v1';
  function readLocalData() {
    try { const raw = localStorage.getItem(DATA_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  // Copy a saved data object into state, applying the same normalizations used on load.
  function applyPersistedData(saved) {
    const data = (saved && saved.data) || {};
    PERSIST_KEYS.forEach(k => {
      let val = data[k];
      if (val == null) return;
      if (k === 'shoots') {
        val = val.map(sh => ({
          ...sh,
          status: normalizeShootStatus(sh.status),
          scriptStatus: normalizeScriptStatus(sh.scriptStatus),
          shootType: normalizeShootType(sh.shootType),
        }));
      } else if (k === 'goals') {
        val = val.map(g => ({ currency: 'PHP', ...g }));
      } else if (k === 'settings') {
        const dflt = defaultSettings();
        val = { ...dflt, ...val, statusLabels: { ...dflt.statusLabels, ...(val.statusLabels || {}) }, leadLabels: { ...dflt.leadLabels, ...(val.leadLabels || {}) }, features: { ...dflt.features, ...(val.features || {}) } };
      }
      state = { ...state, [k]: val };
    });
  }

  // --- save indicator (Saved / Save failed) ---
  let saveIndicatorTimer = null;
  function ensureSaveIndicatorEl() {
    let el = document.getElementById('save-indicator');
    if (!el) {
      el = document.createElement('div');
      el.id = 'save-indicator';
      el.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2000;font-size:12.5px;font-weight:600;padding:8px 12px;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,0.16);display:none;align-items:center;gap:6px;font-family:Inter,system-ui,sans-serif;max-width:320px;line-height:1.4';
      document.body.appendChild(el);
    }
    return el;
  }
  function showSaveStatus(kind) {
    const el = ensureSaveIndicatorEl();
    if (saveIndicatorTimer) { clearTimeout(saveIndicatorTimer); saveIndicatorTimer = null; }
    el.style.display = 'flex';
    if (kind === 'saved') {
      el.style.background = 'var(--tint)'; el.style.color = 'var(--brand-deep)';
      el.textContent = '✓ Saved';
      saveIndicatorTimer = setTimeout(() => { el.style.display = 'none'; }, 1400);
    } else if (kind === 'error') {
      el.style.background = 'var(--danger)'; el.style.color = '#fff';
      el.textContent = 'Puno na ang storage ng browser. Mag Backup ka sa Settings para hindi mawala ang data mo.';
    }
  }

  // Saves everything to this device. Debounced so typing fast doesn't write on every key.
  let persistTimer = null;
  function persist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(writeLocalNow, 250);
  }
  function writeLocalNow() {
    persistTimer = null;
    const data = {};
    PERSIST_KEYS.forEach(k => { data[k] = state[k]; });
    try {
      localStorage.setItem(DATA_KEY, JSON.stringify({ app: 'eksakto', version: 1, savedAt: new Date().toISOString(), data }));
      showSaveStatus('saved');
    } catch (e) {
      console.error('Save failed', e);
      showSaveStatus('error');
    }
  }
  window.addEventListener('pagehide', () => { if (persistTimer) writeLocalNow(); });
  // Ask the browser to keep our data even when the device is low on space.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ignore */ }

  let state = defaultState();
  let draggingId = null;
  let dashboardCountUpDone = false;
  let dashboardCountUpMonthKey = null;

  function animateCountUps(root) {
    const els = root.querySelectorAll('[data-count-up]');
    els.forEach(el => {
      const target = Number(el.dataset.countUp) || 0;
      const prefix = el.dataset.countPrefix || '';
      const duration = 900;
      const start = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const current = Math.round(target * eased);
        el.textContent = prefix + current.toLocaleString('en-PH');
        if (t < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  function setState(patch) {
    const partial = typeof patch === 'function' ? patch(state) : patch;
    const changed = PERSIST_KEYS.some(k => k in partial);
    state = { ...state, ...partial };
    if (changed) persist();
    render();
  }

  /* ---------------- derived data ---------------- */

  // Defensive display-time fallbacks for older stored values that no longer exist
  // in this design (also normalized once in-storage on load, see fetchRemoteState callers).
  function normalizeShootStatus(status) {
    if (status === 'reschedule') return 'resched';
    if (status === 'planned') return 'shot';
    if (status === 'edited') return 'shot';
    return status;
  }
  function normalizeScriptStatus(scriptStatus) {
    if (scriptStatus === 'Approved') return 'Final';
    return scriptStatus;
  }
  function normalizeShootType(shootType) {
    return SHOOT_TYPES.includes(shootType) ? shootType : 'General Project';
  }
  function promoteClientToCompleted(clients, clientName) {
    const name = (clientName || '').trim().toLowerCase();
    if (!name) return clients;
    let changed = false;
    const updated = clients.map(c => {
      if (c.name.trim().toLowerCase() === name && c.leadStatus !== 'Client' && c.leadStatus !== 'Lost') {
        changed = true;
        return { ...c, leadStatus: 'Client' };
      }
      return c;
    });
    return changed ? updated : clients;
  }

  function decorate(sh) {
    const status = normalizeShootStatus(sh.status);
    const scriptStatus = normalizeScriptStatus(sh.scriptStatus) || 'Not Started';
    const shootType = normalizeShootType(sh.shootType);
    const sm = statusMeta(status);
    const scm = SCRIPT_STATUS_META[scriptStatus] || SCRIPT_STATUS_META['Not Started'];
    // Booked/Resched haven't started editing yet, so the countdown that matters is the shoot
    // date itself. Once it's in Editing (or later), the countdown switches to the edit/delivery
    // deadline (falling back to the shoot date if no deadline was set).
    const usesShootDateOnly = status === 'idea' || status === 'resched';
    const days = daysLeftOf(usesShootDateOnly ? sh.date : (sh.deadline || sh.date));
    const pkg = Number(sh.package) || 0;
    const paidAmt = Number(sh.paid) || 0;
    const dl = (status === 'posted' || status === 'approval')
      ? (paidAmt < pkg ? { label: 'Delivered, unpaid', color: 'oklch(0.62 0.17 45)' } : { label: 'Delivered', color: 'oklch(0.45 0.14 150)' })
      : status === 'tentative' ? { label: 'Not confirmed', color: 'oklch(0.5 0.015 150)' }
      : daysLeftLabelAndColor(days);
    const balance = pkg - paidAmt;
    const dpAmt = pkg * 0.2;
    const liveTiers = getLiveTiers();
    return {
      ...sh,
      status, shootType,
      dateLabel: fmtDate(sh.date),
      timeLabel: fmtTime(sh.time),
      scriptStatusLabel: scriptStatus,
      scriptStatusColor: scm.color, scriptStatusBg: scm.bg,
      showScriptBadge: sh.packageTier !== 'basic' && sh.packageTier !== 'standard',
      showClientScriptBadge: sh.packageTier === 'basic' || sh.packageTier === 'standard',
      showDpBadge: pkg > 0 && paidAmt > 0,
      dpBadgeLabel: paidAmt >= pkg
        ? 'Paid in full ✓'
        : `DP paid: ${fmtMoney(paidAmt)}${paidAmt >= dpAmt ? ' ✓' : ' / ' + fmtMoney(dpAmt)}`,
      packageTierLabel: (liveTiers.find(t => t.value === (sh.packageTier || 'custom')) || customTier()).label,
      statusLabel: sm.label,
      progressPercent: sm.progress,
      daysLeft: days,
      daysLeftLabel: dl.label, daysLeftColor: dl.color,
      packageLabel: fmtMoney(sh.package), paidLabel: fmtMoney(sh.paid),
      balanceLabel: balance > 0 ? fmtMoney(balance) : 'Paid up',
      balanceColor: balance > 0 ? 'oklch(0.62 0.17 45)' : 'oklch(0.5 0.15 150)',
    };
  }

  // ---- shoot payment log ---------------------------------------------------
  // A shoot may carry a `payments` array of { id, amount, date, label } entries
  // so income lands in the month each payment was actually received. Legacy
  // shoots (no payments array) keep the old behavior: their single `paid` total
  // counts in the shoot's own month.
  function shootPaymentsOf(s) { return Array.isArray(s.payments) ? s.payments : []; }
  function shootPaidTotal(s) {
    const ps = shootPaymentsOf(s);
    return ps.length ? ps.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : (Number(s.paid) || 0);
  }
  function shootCollectedInMonth(s, monthKey) {
    const ps = shootPaymentsOf(s);
    if (ps.length) return ps.reduce((sum, p) => sum + (((p.date || '').slice(0, 7) === monthKey) ? (Number(p.amount) || 0) : 0), 0);
    // No payment log: attribute the plain paid amount to the month it was RECEIVED
    // (paidDate) if the user set one; otherwise fall back to the shoot date's month.
    return (((s.paidDate || s.date) || '').slice(0, 7) === monthKey) ? (Number(s.paid) || 0) : 0;
  }

  /* ---------------- backup reminder + PWA install ---------------- */
  // Remember the last time a backup was downloaded (device-local) so we can nudge
  // the user to back up again after a while — all their data lives in one Supabase row.
  const BACKUP_KEY = 'shoottracker_last_backup';
  const BACKUP_REMIND_DAYS = 7;
  let backupReminderDismissed = false;
  function markBackupDone() { try { localStorage.setItem(BACKUP_KEY, TODAY_STR); } catch (e) { /* storage unavailable */ } }
  function daysSinceBackup() {
    let last = null;
    try { last = localStorage.getItem(BACKUP_KEY); } catch (e) { /* storage unavailable */ }
    if (!last) return null; // never backed up
    const d = Math.floor((new Date(TODAY_STR + 'T00:00:00') - new Date(last + 'T00:00:00')) / 86400000);
    return isNaN(d) ? null : d;
  }

  // PWA "Install app": the browser fires beforeinstallprompt when the app is installable.
  // We capture it and show our own button that triggers the native prompt on demand.
  let deferredInstallPrompt = null;
  let installReady = false;
  function safeRerender() {
    // Only re-render when the full app (not the lock screen / loading screen) is showing.
    if (document.querySelector('.app-shell')) { try { render(); } catch (e) { /* not ready */ } }
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installReady = true;
    safeRerender();
  });
  window.addEventListener('appinstalled', () => {
    installReady = false;
    deferredInstallPrompt = null;
    safeRerender();
  });

  // "Rule key" = the first alphabetic token (3+ letters) in a description. Used to learn from the
  // user's manual corrections: correcting one "SNR" teaches every future "SNR" without changing how
  // they type in Telegram.
  function expenseRuleKey(desc) {
    const m = (desc || '').toLowerCase().match(/[a-z]{3,}/);
    return m ? m[0] : (desc || '').toLowerCase().trim();
  }
  function guessExpenseCategory(desc) {
    const s = (desc || '').toLowerCase();
    if (/(rent(al)?\b|renta|hiram|upa ng)/.test(s)) return 'Gear Rental';
    if (/(\blens\b|\bcamera\b|tripod|gimbal|\bdrone\b|sd card|memory card|hard ?drive|\bssd\b|battery|\bmic\b|microphone|\blight\b|ilaw|softbox|filter|\bnd\b|charger|cable|equipment|\bgear\b)/.test(s)) return 'Gear & Equipment';
    if (/(\bgas\b|fuel|petron|shell|caltex|parking|\bfare\b|pamasahe|pasahe|indrive|\bgrab\b|angkas|joyride|taxi|\btoll\b|lalamove|transpo|tricycle|\bbus\b|\bferry\b|flight|airfare)/.test(s)) return 'Transport & Fuel';
    if (/(talent|model|\bcrew\b|assistant|second shooter|2nd shooter|editor|\bpa\b|makeup artist|\bmua\b|stylist|bayad kay|sahod ng)/.test(s)) return 'Talent & Crew';
    if (/(adobe|premiere|lightroom|photoshop|capcut|davinci|final cut|canva|subscription|frame\.io|dropbox|google one|icloud|\bplugin|\blut|music license|artlist|epidemic|envato)/.test(s)) return 'Software & Subscriptions';
    if (/(props|venue|studio|backdrop|location fee|permit|decor)/.test(s)) return 'Props & Venue';
    if (/(\bads\b|boost|facebook ads|meta ads|tiktok ads|promo|marketing|print|tarp|calling card|business card)/.test(s)) return 'Marketing & Ads';
    if (/(internet|wifi|\bload\b|electric|meralco|\bbill\b|prepaid|data)/.test(s)) return 'Bills & Internet';
    if (/(lunch|dinner|\bfood\b|breakfast|snack|merienda|meryenda|meal|coffee|kape|jollibee|mcdo|\bwater\b|tubig|kain)/.test(s)) return 'Food sa Shoot';
    return 'Other';
  }
  // rules: optional { ruleKey: category } learned from the user's past manual corrections.
  function expenseCategoryOf(desc, rules) {
    if (rules) { const k = expenseRuleKey(desc); if (rules[k]) return rules[k]; }
    const g = guessExpenseCategory(desc);
    return expenseCategories().includes(g) ? g : 'Other';
  }
  // The effective category of one expense: an explicit per-expense override wins, else learned rules, else the guess.
  function categoryOfExpense(e, rules) {
    return (e && e.category) ? e.category : expenseCategoryOf(e ? e.description : '', rules);
  }
  function buildCategoryRules(expenses) {
    const rules = {};
    (expenses || []).forEach(e => { if (e && e.category) rules[expenseRuleKey(e.description || '')] = e.category; });
    return rules;
  }
  function smoothLinePath(P) {
    if (!P || P.length === 0) return '';
    if (P.length === 1) return `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    let d = `M${P[0][0].toFixed(1)},${P[0][1].toFixed(1)}`;
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function buildCtx() {
    const view = state.view;
    const shoots = state.shoots.map(decorate);

    const navColor = (name) => view === name
      ? { color: 'oklch(0.4 0.13 150)', bg: 'oklch(0.92 0.06 150)' }
      : { color: 'oklch(0.45 0.015 150)', bg: 'transparent' };

    const goalCards = state.goals.map(g => {
      const currency = g.currency || 'PHP';
      return {
        ...g, currency,
        icon: goalIcon(g.name),
        percent: g.target > 0 ? Math.min(100, Math.round((g.current / g.target) * 100)) : 0,
        targetLabel: fmtMoney(g.target), currentLabel: fmtMoney(g.current),
        isUSD: currency === 'USD',
        usdCurrentLabel: currency === 'USD' ? `$${Math.round(g.current / USD_TO_PHP).toLocaleString('en-US')}` : '',
        usdTargetLabel: currency === 'USD' ? `$${Math.round(g.target / USD_TO_PHP).toLocaleString('en-US')}` : '',
      };
    });

    const dashMonthKey = state.dashMonthKey || THIS_MONTH_KEY;
    const dashMonthLabel = new Date(dashMonthKey + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const completed = shoots.filter(s => s.status === 'posted');
    // "Pending" / outstanding counts only confirmed shoots (Booked onward) —
    // Not-confirmed (tentative) shoots are excluded until they're actually booked.
    const outstanding = shoots.filter(s => s.status !== 'tentative').reduce((sum, s) => sum + Math.max((Number(s.package) || 0) - (Number(s.paid) || 0), 0), 0);

    // Dashboard-card-specific: follows the dashMonthKey month switcher.
    const dashMonthItems = shoots.filter(s => { const dt = dashDateOf(s); return dt && dt.slice(0, 7) === dashMonthKey; });
    const dashMonthShoots = dashMonthItems.filter(s => s.serviceType !== 'edit');
    const dashMonthEdits = dashMonthItems.filter(s => s.serviceType === 'edit');

    const upcomingList = shoots.filter(s => s.status !== 'posted' && s.daysLeft !== null)
      .sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 5);
    const nextUpList = upcomingList.slice(0, 4).map(s => ({
      ...s,
      dayNum: s.date ? String(new Date(s.date + 'T00:00:00').getDate()) : '–',
    }));
    const noNextUp = nextUpList.length === 0;

    const shootsSearchLower = state.shootsSearch.toLowerCase();
    const searchedShoots = shootsSearchLower
      ? shoots.filter(s => s.client.toLowerCase().includes(shootsSearchLower) || s.location.toLowerCase().includes(shootsSearchLower))
      : shoots;
    const columns = STATUS_META.map(sm => ({
      status: sm.value, label: sm.label, color: sm.color,
      shoots: searchedShoots.filter(s => s.status === sm.value),
    }));

    const totalPackage = shoots.reduce((sum, s) => sum + (Number(s.package) || 0), 0);
    const totalPaid = shoots.reduce((sum, s) => sum + (Number(s.paid) || 0), 0);

    // Gear ROI: how much of the gear investment has been earned back from side-hustle
    // income (money actually collected from shoots). Selling gear reduces the amount to recover.
    const gearItems = state.gearItems || [];
    const gearTotalCost = gearItems.reduce((s, g) => s + (Number(g.cost) || 0), 0);
    const gearSoldProceeds = gearItems.filter(g => g.sold).reduce((s, g) => s + (Number(g.soldFor) || 0), 0);
    const gearNetInvestment = Math.max(0, gearTotalCost - gearSoldProceeds);
    const gearRoiIncome = totalPaid; // side-hustle collected across all shoots
    const gearRoiRemaining = Math.max(0, gearNetInvestment - gearRoiIncome);
    const gearRoiPercent = gearNetInvestment > 0 ? Math.min(100, Math.round((gearRoiIncome / gearNetInvestment) * 100)) : 0;
    const gearRoiReached = gearNetInvestment > 0 && gearRoiIncome >= gearNetInvestment;
    const gearOwnedCount = gearItems.filter(g => !g.sold).length;
    const gearSoldCount = gearItems.filter(g => g.sold).length;
    const gearRows = gearItems.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .filter(g => (g.name || '').toLowerCase().includes((state.gearSearch || '').toLowerCase()))
      .map(g => ({
        ...g,
        costLabel: fmtMoney(g.cost),
        dateLabel: g.date ? new Date(g.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        soldForLabel: g.soldFor ? fmtMoney(g.soldFor) : '',
        soldDateLabel: g.soldDate ? new Date(g.soldDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
      }));

    const loanCards = state.loans.map(l => {
      const paidPercent = l.amount > 0 ? Math.min(100, Math.round(((l.amount - l.remainingBalance) / l.amount) * 100)) : 100;
      // A loan counts as paid off when its status says so, its balance is fully paid,
      // or today is past its payoff / end date (matatapos na).
      const pastEnd = l.endDate ? (TODAY_STR > l.endDate) : false;
      const isPaid = l.status === 'paid' || (Number(l.remainingBalance) || 0) <= 0 || pastEnd;
      // Upcoming: payments have not started yet (first due month is still in the future),
      // so the loan should read as "not started", never as behind/overdue.
      const startKey = l.startMonth || null;
      const isUpcoming = !isPaid && !!startKey && startKey > THIS_MONTH_KEY;
      const startLabel = startKey ? new Date(startKey + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
      // dueDay (1-31) is the recurring monthly due day (e.g. "every 23rd"); older records may
      // only have a one-time dueDate, so fall back to that date's day-of-month for compatibility.
      const dueDay = l.dueDay ? Number(l.dueDay) : (l.dueDate ? new Date(l.dueDate + 'T00:00:00').getDate() : null);
      const nextDue = (!isPaid && dueDay) ? nextMonthlyDueDate(dueDay) : null;
      const dueDays = nextDue ? daysLeftOf(nextDue) : null;
      const dueBadge = dueDays !== null ? daysLeftLabelAndColor(dueDays) : null;
      const monthlyDueNum = Number(l.monthlyDue) || 0;
      const remainingNum = Number(l.remainingBalance) || 0;
      // Months left: if an explicit end date is set, count the monthly dues from the next
      // due date up to (and including) the end-date month — so it stops on the real payoff
      // month instead of guessing from balance. Otherwise fall back to balance / monthly due.
      let monthsLeft = null;
      if (!isPaid) {
        if (l.termMonths && monthlyDueNum > 0 && remainingNum > 0) {
          // Count how many monthly dues are already settled against the fixed term, instead of
          // ceil-dividing the leftover balance. A balance that is a few pesos off a clean multiple
          // (e.g. 18,334 vs 5 x 3,666 = 18,330) used to round UP a whole extra month.
          const paidSoFar = Math.max(0, (Number(l.amount) || 0) - remainingNum);
          const paymentsMade = Math.round(paidSoFar / monthlyDueNum);
          monthsLeft = Math.max(1, Number(l.termMonths) - paymentsMade);
        } else if (l.endDate && nextDue) {
          const _end = new Date(l.endDate + 'T00:00:00');
          const _next = new Date(nextDue + 'T00:00:00');
          monthsLeft = Math.max(0, (_end.getFullYear() - _next.getFullYear()) * 12 + (_end.getMonth() - _next.getMonth()) + 1);
        } else if (monthlyDueNum > 0 && remainingNum > 0) {
          monthsLeft = Math.ceil(remainingNum / monthlyDueNum);
        }
      }
      // "Paid this month?" — awareness that the current month's due is already settled,
      // based on any logged payment dated within the current calendar month (resets each month).
      const hasMonthlyDue = !!(dueDay && monthlyDueNum > 0);
      const paidThisMonth = (l.paymentHistory || []).some(h => (h.date || '').slice(0, 7) === THIS_MONTH_KEY);
      const nearDue = dueDays !== null && dueDays <= 7;
      const showMonthPay = !isPaid && !isUpcoming && hasMonthlyDue;
      return {
        ...l, paidPercent, dueDay, dueDays,
        showMonthPay, paidThisMonth, isUpcoming,
        startBadgeLabel: startLabel ? `Starts ${startLabel}` : 'Not started yet',
        monthPayShowDue: !paidThisMonth && nearDue,
        monthPayLabel: paidThisMonth ? 'Paid this month ✓' : (nearDue ? 'Not paid yet' : (dueDays !== null ? `Due in ${dueDays}d` : 'Not paid yet this month')),
        monthPayColor: paidThisMonth ? 'oklch(0.42 0.14 150)' : (nearDue ? 'oklch(0.5 0.17 55)' : 'oklch(0.45 0.015 150)'),
        monthPayBg: paidThisMonth ? 'oklch(0.75 0.15 160 / 0.16)' : (nearDue ? 'oklch(0.82 0.15 65 / 0.18)' : 'oklch(0.9 0.02 150)'),
        statusLabel: isPaid ? 'Paid Off' : (isUpcoming ? 'Upcoming' : 'Ongoing'),
        statusColor: isPaid ? 'oklch(0.5 0.15 150)' : (isUpcoming ? 'oklch(0.48 0.14 245)' : 'oklch(0.58 0.16 80)'),
        statusBg: isPaid ? 'oklch(0.75 0.15 160 / 0.16)' : (isUpcoming ? 'oklch(0.68 0.11 245 / 0.16)' : 'oklch(0.78 0.14 80 / 0.16)'),
        amountLabel: fmtMoney(l.amount), remainingLabel: fmtMoney(l.remainingBalance), monthlyDueLabel: fmtMoney(l.monthlyDue),
        dueLabel: dueDay ? `Due every ${ordinal(dueDay)} of the month` : 'No active due date',
        showDueBadge: !!dueBadge, dueBadgeLabel: dueBadge ? dueBadge.label : '', dueBadgeColor: dueBadge ? dueBadge.color : '',
        monthsLeftLabel: isPaid ? 'Paid off ✓' : (monthsLeft !== null ? `~${monthsLeft} month${monthsLeft === 1 ? '' : 's'} left to pay off` : null),
      };
    });
    // Loans whose next monthly payment is due within a week (or already overdue) —
    // surfaced on the dashboard so a payment is less likely to be missed.
    const loansDueSoon = loanCards
      .filter(l => l.showDueBadge && l.dueDays !== null && l.dueDays <= 7 && !l.paidThisMonth && !l.isUpcoming)
      .sort((a, b) => a.dueDays - b.dueDays);

    // Backup reminder state (device-local last-backup date).
    const backupDays = daysSinceBackup();
    const hasAnyData = state.shoots.length + state.expenses.length + state.clients.length + state.documents.length > 0;
    const showBackupReminder = hasAnyData && !backupReminderDismissed && (backupDays === null || backupDays >= BACKUP_REMIND_DAYS);
    const backupReminderLabel = backupDays === null
      ? 'Wala ka pang backup.'
      : `${backupDays} araw na mula sa huling backup mo.`;

    const expenses = state.expenses;
    const todayTotal = expenses.filter(e => e.date === TODAY_STR).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const monthExpenses = expenses.filter(e => e.date && e.date.slice(0, 7) === THIS_MONTH_KEY);
    const monthTotal = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const avgDaily = monthTotal / Math.max(TODAY.getDate(), 1);
    let analysisText, analysisColor;
    if (todayTotal > avgDaily * 1.3) {
      analysisText = `You're spending more today (${fmtMoney(todayTotal)}) compared to your average of ${fmtMoney(Math.round(avgDaily))}/day this month.`;
      analysisColor = 'oklch(0.62 0.17 45)';
    } else if (todayTotal > 0 && todayTotal < avgDaily * 0.7) {
      analysisText = `You're spending less today, only ${fmtMoney(todayTotal)} compared to your average of ${fmtMoney(Math.round(avgDaily))}/day.`;
      analysisColor = 'oklch(0.5 0.15 150)';
    } else {
      analysisText = `Your spending today is in the normal range (${fmtMoney(todayTotal)} vs ${fmtMoney(Math.round(avgDaily))}/day average).`;
      analysisColor = 'oklch(0.45 0.015 150)';
    }
    const decorateExpense = (e) => ({ ...e, dateLabel: fmtDate(e.date), amountLabel: fmtMoney(e.amount) });
    const recentExpenses = expenses.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map(decorateExpense);
    const allExpenseRows = expenses.slice().sort((a, b) => b.date.localeCompare(a.date)).map(decorateExpense);
    const lastExp = expenses.slice().sort((a, b) => b.date.localeCompare(a.date))[0] || { description: '', amount: 0 };

    const expensesMonthKey = state.expensesMonthKey || THIS_MONTH_KEY;
    const expensesMonthLabel = new Date(expensesMonthKey + '-01' + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthExpenseRows = allExpenseRows.filter(e => e.date && e.date.slice(0, 7) === expensesMonthKey);
    const monthExpensesTotal = monthExpenseRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const filteredExpenseRows = monthExpenseRows.filter(e => e.description.toLowerCase().includes(state.expensesSearch.toLowerCase()));

    // ---- Expense Breakdown (Expenses tab): auto-categorized + modern daily line chart ----
    const ebRows = monthExpenseRows;
    const ebTotal = monthExpensesTotal;
    const ebRules = buildCategoryRules(expenses);
    const ebCatMap = {};
    ebRows.forEach(e => {
      const c = categoryOfExpense(e, ebRules);
      if (!ebCatMap[c]) ebCatMap[c] = { name: c, amount: 0, count: 0, items: [] };
      ebCatMap[c].amount += Number(e.amount) || 0;
      ebCatMap[c].count += 1;
      ebCatMap[c].items.push({ id: e.id, desc: e.description || 'Untitled', dateLabel: fmtDate(e.date), amountLabel: fmtMoney(e.amount), amount: Number(e.amount) || 0 });
    });
    const ebCats = Object.values(ebCatMap).sort((a, b) => b.amount - a.amount).map(c => ({
      name: c.name, count: c.count, amount: c.amount, amountLabel: fmtMoney(c.amount),
      items: c.items.sort((a, b) => b.amount - a.amount),
      open: state.expCatOpen === c.name,
      pct: ebTotal ? Math.round((c.amount / ebTotal) * 1000) / 10 : 0,
      isDebt: c.name === 'Debt & Card Payments',
    }));
    const ebCatMax = Math.max(...ebCats.map(c => c.amount), 1);
    const ebDebt = (ebCatMap['Debt & Card Payments'] || { amount: 0 }).amount;
    const ebLiving = ebTotal - ebDebt;
    const ebYM = expensesMonthKey.split('-');
    const ebDaysInMonth = new Date(Number(ebYM[0]), Number(ebYM[1]), 0).getDate();
    const ebDenomDays = expensesMonthKey === THIS_MONTH_KEY ? Math.max(1, TODAY.getDate()) : ebDaysInMonth;
    const ebMonShort = new Date(`${expensesMonthKey}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' });
    const ebDaily = [];
    for (let dd = 1; dd <= ebDaysInMonth; dd++) {
      const dstr = `${expensesMonthKey}-${String(dd).padStart(2, '0')}`;
      const dayRows = ebRows.filter(e => e.date === dstr);
      ebDaily.push({ day: dd, amount: dayRows.reduce((s, e) => s + (Number(e.amount) || 0), 0), items: dayRows.map(e => ({ desc: e.description || 'Untitled', amountLabel: fmtMoney(e.amount) })) });
    }
    const ebRawMax = Math.max(...ebDaily.map(x => x.amount), 1);
    const ebStep = ebRawMax > 40000 ? 20000 : ebRawMax > 8000 ? 5000 : ebRawMax > 2000 ? 1000 : ebRawMax > 800 ? 500 : 200;
    const ebMaxY = Math.max(ebStep, Math.ceil(ebRawMax / ebStep) * ebStep);
    const ebW = 760, ebH = 250, ebLpad = 46, ebRpad = 14, ebTpad = 16, ebBpad = 30;
    const ebPW = ebW - ebLpad - ebRpad, ebPH = ebH - ebTpad - ebBpad;
    const ebXof = i => ebLpad + (ebDaily.length <= 1 ? ebPW / 2 : (i / (ebDaily.length - 1)) * ebPW);
    const ebYof = v => ebTpad + ebPH - (v / ebMaxY) * ebPH;
    const ebPts = ebDaily.map((p, i) => ({ x: ebXof(i), y: ebYof(p.amount), day: p.day, amount: p.amount, amountLabel: fmtMoney(p.amount) }));
    const ebLinePath = smoothLinePath(ebPts.map(p => [p.x, p.y]));
    const ebAreaPath = ebLinePath ? `${ebLinePath}L${ebXof(ebDaily.length - 1).toFixed(1)},${(ebTpad + ebPH).toFixed(1)}L${ebXof(0).toFixed(1)},${(ebTpad + ebPH).toFixed(1)}Z` : '';
    const ebGrid = [];
    for (let g = 0; g <= ebMaxY; g += ebStep) ebGrid.push({ y: ebYof(g), label: g >= 1000 ? (g / 1000) + 'k' : String(g) });
    const ebSpikeDays = {};
    [...ebDaily].sort((a, b) => b.amount - a.amount).slice(0, 2).filter(d => d.amount > ebMaxY * 0.35).forEach(d => { ebSpikeDays[d.day] = fmtMoney(d.amount); });
    const ebSelDay = Number(state.expChartDay) || 0;
    const ebMarkers = ebPts.map((p, i) => {
      const above = p.y > 46;
      const items = ebDaily[i].items;
      const tip = items.length
        ? `${ebMonShort} ${p.day} · ${p.amountLabel}\n` + items.slice(0, 8).map(it => `• ${it.desc}: ${it.amountLabel}`).join('\n') + (items.length > 8 ? `\n…+${items.length - 8} more` : '')
        : `${ebMonShort} ${p.day}, no spending`;
      return {
        x: p.x, y: p.y, day: p.day, amountLabel: p.amountLabel,
        isSpike: !!ebSpikeDays[p.day], annot: ebSpikeDays[p.day] || '',
        annotRectY: above ? p.y - 26 : p.y + 9, annotTextY: above ? p.y - 14 : p.y + 21,
        tip, sel: p.day === ebSelDay,
      };
    });
    const ebSelRow = ebDaily.find(d => d.day === ebSelDay);
    const ebSelDetail = ebSelRow ? {
      label: `${ebMonShort} ${ebSelRow.day}`,
      amountLabel: fmtMoney(ebSelRow.amount),
      hasItems: ebSelRow.items.length > 0,
      items: ebSelRow.items,
    } : null;
    const ebTop = [...ebRows].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)).slice(0, 7).map(e => ({
      desc: e.description || 'Untitled', dateLabel: fmtDate(e.date), amountLabel: fmtMoney(e.amount),
      isDebt: categoryOfExpense(e, ebRules) === 'Debt & Card Payments',
    }));
    const ebCoffeeRows = ebRows.filter(e => categoryOfExpense(e, ebRules) === 'Coffee');
    const ebParkingRows = ebRows.filter(e => /parking/i.test(e.description || ''));
    const expenseBreakdown = {
      hasData: ebRows.length > 0,
      W: ebW, H: ebH, L: ebLpad, R: ebRpad,
      grid: ebGrid, linePath: ebLinePath, areaPath: ebAreaPath, markers: ebMarkers,
      selDetail: ebSelDetail,
      cats: ebCats, catMax: ebCatMax, top: ebTop,
      coffee: { n: ebCoffeeRows.length, sumLabel: fmtMoney(ebCoffeeRows.reduce((s, e) => s + (Number(e.amount) || 0), 0)) },
      parking: { n: ebParkingRows.length, sumLabel: fmtMoney(ebParkingRows.reduce((s, e) => s + (Number(e.amount) || 0), 0)) },
      stat: {
        totalLabel: fmtMoney(ebTotal), entries: ebRows.length,
        perDayLabel: fmtMoney(Math.round(ebTotal / ebDenomDays)),
        debtLabel: fmtMoney(ebDebt), debtPct: ebTotal ? Math.round((ebDebt / ebTotal) * 100) : 0,
        livingLabel: fmtMoney(ebLiving), livingPerDayLabel: fmtMoney(Math.round(ebLiving / ebDenomDays)),
      },
    };

    const expensesSelectedDate = state.expensesSelectedDate || TODAY_STR;
    const expensesSelectedDayLabel = expensesSelectedDate === TODAY_STR ? 'Today' : fmtDate(expensesSelectedDate);
    const expensesSelectedDayRows = allExpenseRows.filter(e => e.date === expensesSelectedDate);
    const expensesSelectedDayTotal = expensesSelectedDayRows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const expensesCalMonthLabel = new Date(state.expensesDayCalYear, state.expensesDayCalMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const expensesCalCells = buildExpenseCalendarCells(state.expensesDayCalYear, state.expensesDayCalMonth, expenses, expensesSelectedDate);

    // Per-month bar chart for a given year — a quick "monthly report" view, separate from the
    // day-level calendar above, so Pol can see the whole year's spending pattern at a glance.
    const expensesReportYear = state.expensesReportYear || TODAY.getFullYear();
    const expensesReportSelectedMonth = state.expensesReportSelectedMonth || THIS_MONTH_KEY;
    const expensesReportMonthsRaw = Array.from({ length: 12 }, (_, i) => {
      const mk = `${expensesReportYear}-${String(i + 1).padStart(2, '0')}`;
      const total = expenses.filter(e => e.date && e.date.slice(0, 7) === mk).reduce((s, e) => s + (Number(e.amount) || 0), 0);
      return {
        monthKey: mk,
        monthLabel: new Date(expensesReportYear, i, 1).toLocaleDateString('en-US', { month: 'long' }),
        shortLabel: MONTH_SHORT_LABELS[i],
        total,
        isCurrentMonth: mk === THIS_MONTH_KEY,
        isSelected: mk === expensesReportSelectedMonth,
      };
    });
    const maxExpensesReportMonth = Math.max(...expensesReportMonthsRaw.map(m => m.total), 1);
    const expensesReportMonths = expensesReportMonthsRaw.map(m => ({
      ...m,
      totalLabel: fmtMoney(m.total),
      heightPx: m.total > 0 ? Math.max(6, Math.round((m.total / maxExpensesReportMonth) * 130)) : 4,
      fill: m.isSelected
        ? 'linear-gradient(180deg, oklch(0.65 0.18 30), oklch(0.5 0.18 25))'
        : (m.total > 0 ? 'oklch(0.88 0.05 25)' : 'oklch(0.93 0.01 150)'),
    }));
    const expensesReportYearTotal = expensesReportMonths.reduce((s, m) => s + m.total, 0);

    const monthLabel = new Date(state.calendarYear, state.calendarMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const calendarCells = buildCalendarCells(state.calendarYear, state.calendarMonth, shoots, state.selectedDate);
    const selectedDateShoots = shoots.filter(s => s.date === state.selectedDate);

    const fullTimeIncome = state.fullTimeIncome;
    const totalFullTime = !feat('salary') ? 0 : fullTimeIncome.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const monthFullTime = fullTimeIncome.filter(f => f.date && f.date.slice(0, 7) === THIS_MONTH_KEY).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const fullTimeRows = fullTimeIncome.slice().sort((a, b) => b.date.localeCompare(a.date)).map(f => ({ ...f, dateLabel: fmtDate(f.date), amountLabel: fmtMoney(f.amount) }));
    const combinedTotal = totalFullTime + totalPaid;
    const fullTimeSharePercent = combinedTotal > 0 ? Math.round((totalFullTime / combinedTotal) * 100) : 0;
    const sideHustleSharePercent = combinedTotal > 0 ? 100 - fullTimeSharePercent : 0;

    // Single shared month-switcher (‹ Month Year ›) drives all three Finances sub-tabs
    // (Raket, Full-Time, Combined) so they all use the same simple picker.
    const financeMonthKey = state.financeMonthKey || THIS_MONTH_KEY;
    const financeMonthLabel = new Date(financeMonthKey + '-01' + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const ftMonthIncome = fullTimeIncome.filter(f => f.date && f.date.slice(0, 7) === financeMonthKey);
    const ftMonthTotal = ftMonthIncome.reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const ftMonthRows = ftMonthIncome.slice().sort((a, b) => b.date.localeCompare(a.date)).map(f => ({ ...f, dateLabel: fmtDate(f.date), amountLabel: fmtMoney(f.amount) }));
    // Shoots relevant to the selected month: dated this month, OR received a
    // payment this month (so a July DP shows in July even if the shoot is in Sept).
    const monthShoots = shoots.filter(s => (s.date && s.date.slice(0, 7) === financeMonthKey) || shootPaymentsOf(s).some(p => (p.date || '').slice(0, 7) === financeMonthKey) || (!shootPaymentsOf(s).length && ((s.paidDate || s.date) || '').slice(0, 7) === financeMonthKey));
    // The subset actually BOOKED in this month — drives the package/remaining cards
    // so those totals aren't double-counted across months.
    const monthShootsDated = monthShoots.filter(s => (s.date || '').slice(0, 7) === financeMonthKey);
    // Collected = payments whose DATE falls in this month (legacy shoots fall back to shoot date).
    const monthSideHustleCollected = monthShoots.reduce((sum, s) => sum + shootCollectedInMonth(s, financeMonthKey), 0);
    // Remaining balance for the SELECTED month only (confirmed shoots, still unpaid) -
    // so the Finances "Remaining Balance" card tracks the month picker like everything else here.
    const monthOutstanding = monthShootsDated.filter(s => s.status !== 'tentative').reduce((sum, s) => sum + Math.max((Number(s.package) || 0) - shootPaidTotal(s), 0), 0);
    // Total package value of the SELECTED month's shoots (matches the table below the cards).
    const monthTotalPackage = monthShootsDated.reduce((sum, s) => sum + (Number(s.package) || 0), 0);
    const monthCombinedTotal = ftMonthTotal + monthSideHustleCollected;
    const monthFullTimeSharePercent = monthCombinedTotal > 0 ? Math.round((ftMonthTotal / monthCombinedTotal) * 100) : 0;
    const monthSideHustleSharePercent = monthCombinedTotal > 0 ? 100 - monthFullTimeSharePercent : 0;

    const clientRows = state.clients.map(c => {
      const lm = LEAD_STATUS_META[c.leadStatus] || LEAD_STATUS_META['New Lead'];
      const linked = shoots.filter(s => s.client.trim().toLowerCase() === c.name.trim().toLowerCase());
      // Only leads still "in play" (not yet Booked/Client, and not Lost) count as overdue —
      // those already have a final outcome, so a past follow-up date there is meaningless.
      const isTentative = c.leadStatus !== 'Booked' && c.leadStatus !== 'Client' && c.leadStatus !== 'Lost';
      const followUpOverdue = !!(isTentative && c.followUpDate && c.followUpDate < TODAY_STR);
      return {
        ...c, statusColor: lm.color, statusBg: lm.bg,
        followUpLabel: c.followUpDate ? fmtDate(c.followUpDate) : 'None set',
        followUpOverdue,
        shootCountLabel: linked.length > 0 ? `${linked.length} shoot(s) · ${fmtMoney(linked.reduce((s, x) => s + (Number(x.package) || 0), 0))}` : 'No shoots yet',
        linkedShoots: linked,
      };
    }).filter(c => c.name.toLowerCase().includes(state.clientsSearch.toLowerCase()));
    const activeClients = state.clients.filter(c => c.leadStatus === 'Booked' || c.leadStatus === 'Client').length;

    const monthPaidFromShoots = shoots.reduce((s, x) => s + shootCollectedInMonth(x, THIS_MONTH_KEY), 0);
    const monthlyRevenue = monthPaidFromShoots + monthFullTime;
    const netProfit = monthlyRevenue - monthTotal;

    const dashMonthPaidFromShoots = shoots.reduce((s, x) => s + shootCollectedInMonth(x, dashMonthKey), 0);
    const dashMonthFullTime = fullTimeIncome.filter(f => f.date && f.date.slice(0, 7) === dashMonthKey).reduce((s, f) => s + (Number(f.amount) || 0), 0);
    const dashMonthlyRevenue = dashMonthPaidFromShoots + dashMonthFullTime;
    const dashMonthExpenses = expenses.filter(e => e.date && e.date.slice(0, 7) === dashMonthKey).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const dashNetProfit = dashMonthlyRevenue - dashMonthExpenses;

    const yearlyGoalIncome = Number(S().yearlyGoal) || 0;
    const yearlyProgressPercent = yearlyGoalIncome > 0 ? Math.min(100, Math.round((combinedTotal / yearlyGoalIncome) * 100)) : 0;

    const userFirstName = (ownerName().split(' ')[0]) || 'there';
    const liveDateTimeLabel = new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

    const WEEK_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const nowForWeek = new Date();
    const weekStart = new Date(nowForWeek); weekStart.setDate(nowForWeek.getDate() - nowForWeek.getDay()); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const weekRangeLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    // Build day keys from LOCAL calendar parts (not toISOString, which shifts a
    // day in positive-UTC zones like PH) so bars line up with the stored dates.
    const todayISO = TODAY_STR;
    const localDayStr = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    // "This Week" agenda: everything happening this week — shoots on their shoot date,
    // edits on their deadline (falling back to creation day) — as a dated list, not a chart.
    const weekStartStr = localDayStr(weekStart);
    const weekEndStr = localDayStr(weekEnd);
    const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weekAgendaAll = shoots
      .filter(s => { const dt = dashDateOf(s); return dt && dt >= weekStartStr && dt <= weekEndStr; })
      .map(s => {
        const dt = dashDateOf(s);
        const dd = new Date(dt + 'T00:00:00');
        const isEditItem = s.serviceType === 'edit';
        return {
          d: dt,
          dayLabel: WEEKDAY_ABBR[dd.getDay()],
          dayNum: dd.getDate(),
          client: s.client || 'Untitled',
          sub: isEditItem ? 'Edit / delivery due' : ((s.location || '').trim() || 'Shoot day'),
          kindLabel: isEditItem ? 'Edit' : 'Shoot',
          kindColor: isEditItem ? 'oklch(0.42 0.05 150)' : 'oklch(0.99 0.01 150)',
          kindBg: isEditItem ? 'oklch(0.9 0.03 150)' : 'oklch(0.5 0.14 150)',
          isToday: dt === todayISO,
        };
      })
      .sort((a, b) => a.d.localeCompare(b.d));
    const weekAgenda = weekAgendaAll.slice(0, 6);
    const weekAgendaMore = Math.max(0, weekAgendaAll.length - weekAgenda.length);

    const statCards = [
      { key: 'thisMonth', hero: true, split: true, label: dashMonthKey === THIS_MONTH_KEY ? 'This Month' : dashMonthLabel, shootsCount: dashMonthShoots.length, editsCount: dashMonthEdits.length },
      { key: 'completed', label: 'Completed', value: String(completed.length), sub: 'Delivered to clients', hero: false },
      { key: 'activeClients', label: 'Active Clients', value: String(activeClients), sub: 'Booked or ongoing', hero: false },
    ];

    const chipModalKey = state.chipModal;
    const CHIP_MODAL_META = {
      thisMonth: { title: dashMonthKey === THIS_MONTH_KEY ? 'Shoots & Edits This Month' : `Shoots & Edits in ${dashMonthLabel}`, items: [...dashMonthShoots.map(s => ({ primary: s.client, secondary: s.dateLabel })), ...dashMonthEdits.map(s => ({ primary: s.client, secondary: 'Edit' + (s.deadline ? ' · due ' + fmtDate(s.deadline) : '') }))] },
      completed: { title: 'Completed Shoots', items: completed.map(s => ({ primary: s.client, secondary: s.dateLabel })) },
      activeClients: { title: 'Active Clients', items: state.clients.filter(c => c.leadStatus === 'Booked' || c.leadStatus === 'Client').map(c => ({ primary: c.name, secondary: leadStatusLabel(c.leadStatus) })) },
      outstandingBalances: {
        title: 'Outstanding Balances',
        items: shoots
          .filter(s => (Number(s.package) || 0) - (Number(s.paid) || 0) > 0)
          .sort((a, b) => ((Number(b.package) || 0) - (Number(b.paid) || 0)) - ((Number(a.package) || 0) - (Number(a.paid) || 0)))
          .map(s => ({ primary: s.client, secondary: fmtMoney((Number(s.package) || 0) - (Number(s.paid) || 0)) })),
      },
    };
    let chipModalData = chipModalKey ? CHIP_MODAL_META[chipModalKey] : null;
    if (!chipModalData && chipModalKey && chipModalKey.startsWith('clientshoots:')) {
      const clientId = chipModalKey.slice('clientshoots:'.length);
      const client = state.clients.find(c => c.id === clientId);
      if (client) {
        const linked = shoots.filter(s => s.client.trim().toLowerCase() === client.name.trim().toLowerCase());
        chipModalData = { title: `${client.name}'s Shoots`, items: linked.map(s => ({ primary: s.location, secondary: s.dateLabel })) };
      }
    }

    const goalsAvgPercent = goalCards.length ? Math.round(goalCards.reduce((s, g) => s + g.percent, 0) / goalCards.length) : 0;
    const insightCards = [
      { icon: '📊', title: 'Outstanding Balances', text: outstanding > 0 ? `You have ${fmtMoney(outstanding)} in outstanding balances across your shoots.` : 'No outstanding balance on any shoots, everything is paid up.', clickKey: outstanding > 0 ? 'outstandingBalances' : null },
      ...((feat('goals') || yearlyGoalIncome > 0) ? [{ icon: '🎯', title: 'Goal Tracking', bars: [
        ...(feat('goals') ? [{ label: 'Savings Goals Progress', percent: goalsAvgPercent, sub: `${goalsAvgPercent}% average completion` }] : []),
        ...(yearlyGoalIncome > 0 ? [{ label: 'Yearly Income Progress', percent: yearlyProgressPercent, sub: `${yearlyProgressPercent}% of ${fmtMoney(yearlyGoalIncome)} target` }] : []),
      ] }] : []),
    ];
    const chartMax = Math.max(monthlyRevenue, monthTotal, 1);

    // Overview chart: combined earnings (full-time + side hustle collected) per month,
    // for the currently-selected year, shown as a 12-bar chart on the Insights page.
    const overviewYear = state.insightsChartYear || TODAY.getFullYear();
    const selectedMonthKey = state.insightsChartSelectedMonth || THIS_MONTH_KEY;
    const earningsByMonth = MONTH_SHORT_LABELS.map((label, i) => {
      const mKey = `${overviewYear}-${String(i + 1).padStart(2, '0')}`;
      const ftSum = fullTimeIncome.filter(f => f.date && f.date.slice(0, 7) === mKey).reduce((s, f) => s + (Number(f.amount) || 0), 0);
      const shSum = shoots.reduce((s, x) => s + shootCollectedInMonth(x, mKey), 0);
      return { label, monthKey: mKey, total: ftSum + shSum, isSelected: mKey === selectedMonthKey };
    });
    const maxEarningsMonth = Math.max(...earningsByMonth.map(m => m.total), 1);
    const overviewBars = earningsByMonth.map(m => ({
      label: m.label,
      monthKey: m.monthKey,
      total: m.total,
      totalLabel: fmtMoney(m.total),
      isSelected: m.isSelected,
      heightPx: m.total > 0 ? Math.max(6, Math.round((m.total / maxEarningsMonth) * 130)) : 4,
      fill: m.isSelected
        ? 'linear-gradient(180deg, oklch(0.6 0.15 150), oklch(0.4 0.13 150))'
        : (m.total > 0 ? 'oklch(0.86 0.05 150)' : 'oklch(0.93 0.01 150)'),
    }));

    // "Revenue vs Expenses" card on Insights follows whichever month is currently
    // selected in the Overview chart above it, instead of always being "this month".
    const selMonthLabel = new Date(selectedMonthKey + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const selMonthRevenue = (fullTimeIncome.filter(f => f.date && f.date.slice(0, 7) === selectedMonthKey).reduce((s, f) => s + (Number(f.amount) || 0), 0))
      + (shoots.reduce((s, x) => s + shootCollectedInMonth(x, selectedMonthKey), 0));
    const selMonthExpenses = expenses.filter(e => e.date && e.date.slice(0, 7) === selectedMonthKey).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const selMonthNetProfit = selMonthRevenue - selMonthExpenses;
    const selMonthChartMax = Math.max(selMonthRevenue, selMonthExpenses, 1);

    // Top Clients & Biggest Expenses follow the SELECTED month (like Revenue vs Expenses),
    // so clicking a month in the chart re-scopes the whole page to that month.
    const clientTotals = {};
    shoots.forEach(s => {
      const collected = shootCollectedInMonth(s, selectedMonthKey);
      if (collected <= 0) return;
      const name = (s.client || '').trim();
      if (!name) return;
      if (!clientTotals[name]) clientTotals[name] = { name, total: 0, count: 0 };
      clientTotals[name].total += collected;
      clientTotals[name].count += 1;
    });
    const topClients = Object.values(clientTotals)
      .filter(c => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(c => ({ name: c.name, totalLabel: fmtMoney(c.total), shootsLabel: `${c.count} shoot${c.count === 1 ? '' : 's'}` }));

    const biggestExpenses = expenses.filter(e => e.date && e.date.slice(0, 7) === selectedMonthKey)
      .sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0))
      .slice(0, 5)
      .map(e => ({ description: e.description || 'Untitled', dateLabel: fmtDate(e.date), amountLabel: fmtMoney(e.amount) }));

    // Outstanding (unpaid balance still to collect) for the selected month — confirmed shoots only.
    const selMonthOutstanding = shoots
      .filter(s => s.date && s.date.slice(0, 7) === selectedMonthKey && s.status !== 'tentative')
      .reduce((a, s) => a + Math.max((Number(s.package) || 0) - (Number(s.paid) || 0), 0), 0);

    return {
      view, shoots, navColor, goalCards, completed, outstanding,
      upcomingList, nextUpList, noNextUp, columns, totalPackage, totalPaid, loanCards,
      loansDueSoon, showBackupReminder, backupReminderLabel,
      gearItems, gearTotalCost, gearSoldProceeds, gearNetInvestment, gearRoiIncome, gearRoiRemaining, gearRoiPercent, gearRoiReached, gearOwnedCount, gearSoldCount, gearRows,
      todayTotal, monthTotal, analysisText, analysisColor, recentExpenses, allExpenseRows,
      filteredExpenseRows, lastExp, monthLabel, calendarCells, selectedDateShoots,
      expensesMonthKey, expensesMonthLabel, monthExpensesTotal, expenseBreakdown,
      expensesSelectedDate, expensesSelectedDayLabel, expensesSelectedDayTotal, expensesSelectedDayRows,
      expensesCalMonthLabel, expensesCalCells,
      expensesReportYear, expensesReportMonths, expensesReportYearTotal,
      totalFullTime, monthFullTime, fullTimeRows, combinedTotal, fullTimeSharePercent, sideHustleSharePercent,
      financeMonthKey, financeMonthLabel, ftMonthTotal, ftMonthRows,
      monthShoots, monthSideHustleCollected, monthCombinedTotal, monthFullTimeSharePercent, monthSideHustleSharePercent, monthOutstanding, monthTotalPackage,
      clientRows, activeClients, monthlyRevenue, netProfit, yearlyGoalIncome, yearlyProgressPercent,
      overviewBars, overviewYear,
      selMonthLabel, selMonthRevenue, selMonthExpenses, selMonthNetProfit, selMonthChartMax, selMonthOutstanding,
      topClients, biggestExpenses,
      dashMonthKey, dashMonthLabel, dashMonthlyRevenue, dashMonthExpenses, dashNetProfit,
      userFirstName, liveDateTimeLabel, weekRangeLabel, weekAgenda, weekAgendaMore, statCards,
      chipModalKey, chipModalData, insightCards, chartMax,
    };
  }

  /* ---------------- small UI atoms ---------------- */

  function badge(label, color, bg) {
    return `<span class="badge" style="background:${bg};color:${color}">${esc(label)}</span>`;
  }
  function progressBar(percent, gradient) {
    const bg = gradient || 'linear-gradient(90deg, oklch(0.55 0.14 150), oklch(0.55 0.12 175))';
    return `<div class="progress"><div style="width:${percent}%;background:${bg}"></div></div>`;
  }

  /* ---------------- sidebar ---------------- */

  function navBtn(view, icon, label, action) {
    const c = ctxGlobal.navColor(view);
    return `<button type="button" class="nav-btn" style="color:${c.color};background:${c.bg}" data-action="nav" data-view="${action || view}" title="${esc(label)}">
      <span class="ic"><i class="ti ti-${icon}" aria-hidden="true"></i></span><span class="nav-label">${esc(label)}</span>
    </button>`;
  }

  // The buyer's logo if they uploaded one, otherwise their initials in a badge.
  function bizMark(size) {
    const st = S();
    if (st.logo) return `<img src="${st.logo}" alt="" style="width:${size}px;height:${size}px;object-fit:contain;border-radius:8px;flex:none"/>`;
    return `<div class="logo-badge" style="width:${size}px;height:${size}px;padding:0;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.4)}px">${esc(bizInitials())}</div>`;
  }

  const DOCK = [
    { key: 'home', label: 'Home', icon: 'home', views: ['dashboard'] },
    { key: 'shoots', label: 'Shoots', icon: 'shoots', views: ['shoots'] },
    { key: 'calendar', label: 'Calendar', icon: 'calendar', views: [] },
    { key: 'clients', label: 'Clients', icon: 'clients', views: ['clients'] },
    { key: 'payments', label: 'Payments', icon: 'payments', views: ['finances'] },
    { key: 'money', label: 'Money', icon: 'money', views: ['expenses', 'insights', 'gear', 'loans', 'goals'] },
    { key: 'docs', label: 'Docs', icon: 'docs', views: ['docs'] },
  ];
  function dockVisible(key) {
    if (key === 'clients') return feat('clients');
    if (key === 'docs') return feat('docs');
    if (key === 'money') return feat('expenses') || feat('insights') || feat('gear') || feat('loans') || feat('goals');
    return true;
  }
  function moneyHomeView() { return feat('expenses') ? 'expenses' : feat('insights') ? 'insights' : feat('gear') ? 'gear' : 'expenses'; }
  function dockActive(key) {
    if (key === 'calendar') return state.view === 'shoots' && state.shootsMode === 'calendar';
    if (key === 'shoots') return state.view === 'shoots' && state.shootsMode !== 'calendar';
    const d = DOCK.find(x => x.key === key);
    return !!(d && d.views.includes(state.view));
  }
  function globalSearchResults() {
    const q = (state.globalSearch || '').trim().toLowerCase();
    if (q.length < 2) return [];
    const shoots = state.shoots.filter(sh => ((sh.client || '') + ' ' + (sh.location || '')).toLowerCase().includes(q)).slice(0, 5)
      .map(sh => ({ kind: 'Shoot', title: sh.client || 'Shoot', sub: [sh.location, sh.date ? fmtDate(sh.date) : ''].filter(Boolean).join(' · '), action: 'shoot-edit', id: sh.id }));
    const clients = state.clients.filter(c => (c.name || '').toLowerCase().includes(q)).slice(0, 4)
      .map(c => ({ kind: 'Client', title: c.name, sub: leadStatusLabel(c.leadStatus), action: 'client-edit', id: c.id }));
    return shoots.concat(clients);
  }
  function renderChrome() {
    const results = globalSearchResults();
    const qa = state.quickAddOpen;
    return `
    <header class="topbar">
      <button type="button" class="tb-biz" data-action="nav" data-view="settings" title="Settings">${bizMark(34)}<span class="tb-names"><b>${esc(bizName())}</b>${ownerName() ? `<small>${esc(ownerName())}</small>` : ''}</span></button>
      <div class="tb-search${state.mSearchOpen ? ' m-open' : ''}">
        ${icon('search', 16)}
        <input type="search" id="global-search" data-search="1" value="${esc(state.globalSearch || '')}" placeholder="Hanapin ang client o shoot" autocomplete="off" aria-label="Search clients and shoots"/>
        ${results.length ? `<div class="tb-results">${results.map(r => `<button type="button" data-action="${r.action}" data-id="${esc(r.id)}" data-search-pick="1"><span class="tr-kind">${r.kind}</span><span><b>${esc(r.title)}</b><small>${esc(r.sub || '')}</small></span></button>`).join('')}</div>` : ''}
      </div>
      <button type="button" class="tb-icon${state.view === 'settings' ? ' on' : ''} desk-only" data-action="nav" data-view="settings" title="Settings" aria-label="Settings">${icon('settings', 20)}</button>
      <div class="m-actions">
        <button type="button" class="m-round" data-action="m-search-toggle" aria-label="Search">${icon(state.mSearchOpen ? 'close' : 'search', 18)}</button>
        <button type="button" class="m-avatar" data-action="more-open" aria-label="Menu">${bizMark(38)}</button>
      </div>
    </header>
    <nav class="dock" aria-label="Main">
      ${DOCK.filter(d => dockVisible(d.key)).map(d => `<button type="button" class="dk${dockActive(d.key) ? ' on' : ''}" data-action="dock" data-key="${d.key}">${icon(d.icon, 22)}<span>${d.label}</span></button>`).join('')}
      <div class="dk-add-wrap">
        <button type="button" class="dk-add${qa ? ' open' : ''}" data-action="quick-add-toggle" aria-label="Add" aria-expanded="${!!qa}">${icon('plus', 22)}</button>

      </div>
    </nav>
    <nav class="m-tabbar" aria-label="Main">
      ${[['home', 'home', 'Home'], ['shoots', 'shoots', 'Shoots']].map(([k, ic, l]) => `<button type="button" class="tb${dockActive(k) ? ' on' : ''}" data-action="dock" data-key="${k}">${icon(ic, 24)}<span>${l}</span></button>`).join('')}
      <button type="button" class="tb-fab${qa ? ' open' : ''}" data-action="quick-add-toggle" aria-label="Add">${icon('plus', 26)}</button>
      <button type="button" class="tb${dockActive('payments') ? ' on' : ''}" data-action="dock" data-key="payments">${icon('payments', 24)}<span>Payments</span></button>
      <button type="button" class="tb${state.moreOpen || ['calendar', 'clients', 'money', 'docs'].some(k => dockActive(k)) || state.view === 'settings' ? ' on' : ''}" data-action="more-open">${icon('more', 24)}<span>More</span></button>
    </nav>
    ${qa ? `<div class="qa-menu">
          <button type="button" data-action="qa-shoot">${icon('shoots', 18)}<span><b>New shoot</b><small>Mag book ng bagong project</small></span></button>
          <button type="button" data-action="qa-payment">${icon('payments', 18)}<span><b>Log payment</b><small>May nagbayad na client</small></span></button>
          ${feat('expenses') ? `<button type="button" data-action="qa-expense">${icon('receipt', 18)}<span><b>Add expense</b><small>Gastos sa shoot o gear</small></span></button>` : ''}
          ${feat('clients') ? `<button type="button" data-action="qa-client">${icon('user', 18)}<span><b>New client</b><small>Bagong inquiry o lead</small></span></button>` : ''}
        </div>` : ''}
    ${qa ? `<div class="qa-dim" data-action="quick-add-toggle"></div>` : ''}
    ${state.moreOpen ? `<div class="sheet-dim" data-action="more-close"></div>
    <div class="sheet" role="dialog" aria-label="Menu">
      <div class="grab"></div>
      <button type="button" class="sheet-biz" data-action="dock-settings">${bizMark(44)}<span><b>${esc(bizName())}</b>${ownerName() ? `<small>${esc(ownerName())}</small>` : ''}</span></button>
      <div class="sheet-grid">
        ${[['calendar', 'calendar', 'Calendar'], ['clients', 'clients', 'Clients'], ['money', 'money', 'Money'], ['docs', 'docs', 'Docs']].filter(([k]) => dockVisible(k)).map(([k, ic, l]) => `<button type="button" data-action="dock" data-key="${k}">${icon(ic, 24)}<span>${l}</span></button>`).join('')}
        ${feat('gear') ? `<button type="button" data-action="sheet-nav" data-view="gear">${icon('camera', 24)}<span>Gear ROI</span></button>` : ''}
        <button type="button" data-action="dock-settings">${icon('settings', 24)}<span>Settings</span></button>
      </div>
    </div>` : ''}`;
  }
  function moneyTabs() {
    const tabs = [].concat(feat('expenses') ? [['expenses', 'Expenses']] : []).concat(feat('insights') ? [['insights', 'Insights']] : []).concat(feat('gear') ? [['gear', 'Gear ROI']] : []).concat(feat('loans') ? [['loans', 'Loans']] : []).concat(feat('goals') ? [['goals', 'Goals']] : []);
    return `<div class="seg-tabs" role="tablist">${tabs.map(([v, l]) => `<button type="button" role="tab" aria-selected="${state.view === v}" class="${state.view === v ? 'on' : ''}" data-action="nav" data-view="${v}">${l}</button>`).join('')}</div>`;
  }

  /* ---------------- dashboard ---------------- */

  function timeGreeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Magandang umaga' : h < 18 ? 'Magandang hapon' : 'Magandang gabi';
  }
  function statusPill(status) {
    const sm = STATUS_META.find(m => m.value === status) || STATUS_META[0];
    const tone = status === 'posted' ? 'done' : (status === 'shot' || status === 'approval') ? 'warn' : status === 'idea' ? 'ok' : 'muted';
    return `<span class="pill ${tone}">${esc(sm.label)}</span>`;
  }
  function viewDashboard(ctx) {
    const monthName = new Date(Number(ctx.dashMonthKey.slice(0, 4)), Number(ctx.dashMonthKey.slice(5, 7)) - 1, 1).toLocaleDateString('en-US', { month: 'long' });
    const monthShoots = state.shoots.filter(sh => (dashDateOf(sh) || '').slice(0, 7) === ctx.dashMonthKey);
    const editingCount = monthShoots.filter(sh => sh.status === 'shot' || sh.status === 'approval').length;
    const dueList = state.shoots
      .filter(sh => sh.status !== 'tentative' && (Number(sh.package) || 0) - (Number(sh.paid) || 0) > 0)
      .map(sh => {
        const total = Number(sh.package) || 0, paid = Number(sh.paid) || 0;
        const nm = nextMilestoneDue(total, paid);
        return { id: sh.id, client: sh.client || 'Project', date: sh.date, due: nm.due || (total - paid), label: nm.next ? nm.next.label : 'Balance', pct: total > 0 ? Math.round(paid / total * 100) : 0, balance: total - paid };
      })
      .sort((x, y) => (x.date || '9999').localeCompare(y.date || '9999'))
      .slice(0, 4);
    const pendingClients = new Set(state.shoots.filter(sh => sh.status !== 'tentative' && (Number(sh.package) || 0) > (Number(sh.paid) || 0)).map(sh => (sh.client || '').toLowerCase())).size;
    const topExpense = (() => {
      const m = {};
      state.expenses.filter(e => (e.date || '').slice(0, 7) === ctx.dashMonthKey).forEach(e => { const c = categoryOfExpense(e); m[c] = (m[c] || 0) + (Number(e.amount) || 0); });
      const top = Object.entries(m).sort((x, y) => y[1] - x[1])[0];
      return top ? 'Top: ' + top[0] : 'Wala pang gastos';
    })();
    const shortDate = (d) => d ? new Date(d + 'T00:00:00') : null;
    return `
    <div class="dash-head">
      <div>
        <div class="dash-eyebrow">${esc(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))}</div>
        <h1 class="dash-title">${timeGreeting()}${ownerName() ? ', ' + esc(ctx.userFirstName) : ''}.</h1>
      </div>
      <div class="dash-month">
        <button type="button" data-action="dash-month-prev" aria-label="Previous month">‹</button>
        <span>${esc(ctx.dashMonthLabel)}</span>
        <button type="button" data-action="dash-month-next" aria-label="Next month">›</button>
        ${ctx.dashMonthKey !== THIS_MONTH_KEY ? `<button type="button" class="today" data-action="dash-month-today">Today</button>` : ''}
      </div>
    </div>

    ${ctx.showBackupReminder && !homeChecklist() ? `
    <div class="notice">
      <span><b>Backup reminder.</b> ${esc(ctx.backupReminderLabel)} I save mo sa Google Drive para sigurado.</span>
      <span class="notice-actions">
        <button type="button" data-action="backup-drive" class="btn-primary" style="padding:8px 14px">Backup sa Drive</button>
        <button type="button" data-action="backup-remind-later" class="btn-link">Later</button>
      </span>
    </div>` : ''}
    ${installReady ? `<div class="notice"><span><b>I install ang app.</b> Para mabilis buksan at gumana kahit offline.</span><span class="notice-actions"><button type="button" data-action="install-app" class="btn-primary" style="padding:8px 14px">Install</button></span></div>` : ''}

    ${homeChecklist()}
    <div class="kpis">
      <button type="button" class="kpi big" data-action="dock" data-key="${dockVisible('money') ? 'money' : 'payments'}">
        ${feat('expenses') ? `<small>Net ngayong ${esc(monthName)}</small>
        <div class="v ${ctx.dashNetProfit < 0 ? 'neg' : ''}">${fmtMoney(ctx.dashNetProfit)}</div>
        <div class="d desk-only">${fmtMoney(ctx.dashMonthlyRevenue)} kita · ${fmtMoney(ctx.dashMonthExpenses)} gastos</div>` : `<small>Kita ngayong ${esc(monthName)}</small>
        <div class="v">${fmtMoney(ctx.dashMonthlyRevenue)}</div><div class="d desk-only">Natanggap na bayad ngayong buwan</div>`}
        ${feat('expenses') ? `<span class="split m-only"><span><small>Kita</small><b>${fmtMoney(ctx.dashMonthlyRevenue)}</b></span><span><small>Gastos</small><b>${fmtMoney(ctx.dashMonthExpenses)}</b></span></span>` : ''}
      </button>
      <button type="button" class="kpi" data-action="dock" data-key="payments"><small><span class="desk-only">Pending na singil</span><span class="m-only">Pending</span></small><div class="v">${fmtMoney(ctx.outstanding)}</div><div class="d">${pendingClients} ${pendingClients === 1 ? 'client' : 'clients'}</div></button>
      <button type="button" class="kpi" data-action="dock" data-key="shoots"><small>Shoots</small><div class="v">${monthShoots.length}</div><div class="d desk-only">${editingCount} editing</div></button>
      <button type="button" class="kpi m-only" data-action="dock" data-key="shoots" data-m="editing"><small>Editing</small><div class="v">${editingCount}</div><div class="d">projects</div></button>
      ${feat('expenses') ? `<button type="button" class="kpi desk-kpi" data-action="dock" data-key="money"><small>Gastos</small><div class="v">${fmtMoney(ctx.dashMonthExpenses)}</div><div class="d">${esc(topExpense)}</div></button>` : ''}
    </div>

    <div class="dash-cols">
      <section>
        <div class="sec-head"><h2>Susunod na shoots</h2><button type="button" class="btn-link" data-action="dock" data-key="calendar">Calendar</button></div>
        ${ctx.nextUpList.length ? ctx.nextUpList.map(n => {
          const d = shortDate(n.date);
          const sh = state.shoots.find(x => x.id === n.id) || {};
          return `<button type="button" class="row-item" data-action="shoot-edit" data-id="${esc(n.id)}">
            <span class="date-chip"><small>${d ? d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : ''}</small><b>${esc(n.dayNum)}</b></span>
            <span class="ri-main"><b>${esc(n.client)}</b><small>${[n.location, sh.time ? fmtTime(sh.time) : '', shootTypeLabel(sh.shootType)].filter(Boolean).map(esc).join(' · ')}</small></span>
            ${statusPill(sh.status)}
          </button>`;
        }).join('') : `<div class="empty">Wala pang naka schedule na shoot. <button type="button" class="btn-link" data-action="shoot-add-open">Mag add ng shoot</button></div>`}
      </section>
      <section>
        <div class="sec-head"><h2>Dapat singilin</h2><button type="button" class="btn-link" data-action="dock" data-key="payments">Payments</button></div>
        ${dueList.length ? dueList.map(x => `
          <button type="button" class="row-item due" data-action="shoot-payment-open" data-id="${esc(x.id)}">
            <span class="ri-main"><b>${esc(x.client)}</b><small>${esc(x.label)}${x.date ? ' · ' + esc(fmtDate(x.date)) : ''}</small><span class="bar"><i style="width:${x.pct}%"></i></span></span>
            <span class="amt"><b>${fmtMoney(x.due)}</b><small>${x.pct > 0 ? x.pct + '% bayad' : 'Wala pa'}</small></span>
          </button>`).join('') : `<div class="empty">Walang naghihintay na singil. Ayos!</div>`}
      </section>
    </div>`;
  }

  /* ---------------- shoots ---------------- */

  function shootCard(s) {
    const total = Number(s.package) || 0, paid = Number(s.paid) || 0;
    const pct = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0;
    const bal = Math.max(total - paid, 0);
    return `
    <div class="shoot-card" draggable="true" data-action="shoot-edit" data-id="${esc(s.id)}">
      <div class="sc-top"><b>${esc(s.client)}</b>${statusPill(s.status)}</div>
      <div class="sc-meta">${[s.dateLabel, s.timeLabel, s.location].filter(x => x && x !== '').map(esc).join(' · ')}</div>
      <div class="sc-type">${s.projectType ? esc(s.projectType) + ' · ' : ''}${esc(shootTypeLabel(s.shootType))}${(() => { const t = packageTiers().find(x => x.value === s.packageTier && x.value !== 'custom'); return t ? ' · ' + esc(t.label.split(' (')[0]) : ''; })()}</div>
      ${total > 0 ? `<div class="sc-money"><span class="bar"><i style="width:${pct}%"></i></span><span class="sc-bal ${bal > 0 ? '' : 'paid'}">${bal > 0 ? fmtMoney(bal) + ' balance' : 'Bayad na'}</span></div>` : ''}
      <div class="sc-foot"><span style="color:${s.daysLeftColor}">${esc(s.daysLeftLabel || '')}</span><button type="button" class="sc-move" data-action="shoot-status-open" data-id="${esc(s.id)}">Move</button></div>
    </div>`;
  }

  function modalShootStatus() {
    if (!state.shootStatusModal) return '';
    const s = state.shoots.find(x => x.id === state.shootStatusModal);
    if (!s) return '';
    const isGeneral = normalizeShootType(s.shootType) !== 'Real Estate';
    const GP_LABELS = { idea: 'To Edit', shot: 'Editing', approval: 'For Approval', posted: 'Completed' };
    const opts = isGeneral
      ? STATUS_META.filter(sm => ['idea', 'shot', 'approval', 'posted'].includes(sm.value)).map(sm => ({ value: sm.value, label: GP_LABELS[sm.value] || sm.label, color: sm.color }))
      : STATUS_META.map(sm => ({ value: sm.value, label: sm.label, color: sm.color }));
    const cur = normalizeShootStatus(s.status);
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="shootstatus">
      <form class="modal-box" style="width:330px" data-stop>
        <div class="modal-head"><div class="modal-title">Move stage</div><button type="button" class="modal-close" data-action="modal-close" data-which="shootstatus">✕</button></div>
        <div style="font-size:12.5px;color:oklch(0.45 0.015 150);margin-bottom:12px">${esc(s.client || 'Shoot')}${s.location ? ` · ${esc(s.location)}` : ''}</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          ${opts.map(o => { const on = o.value === cur; return `<button type="button" data-action="shoot-status-set" data-id="${esc(s.id)}" data-status="${o.value}" style="all:unset;cursor:pointer;box-sizing:border-box;width:100%;display:flex;align-items:center;gap:10px;padding:11px 14px;border-radius:10px;font-size:13px;font-weight:${on ? '700' : '500'};background:${on ? 'oklch(0.92 0.05 150)' : 'var(--card2)'};color:${on ? 'oklch(0.4 0.13 150)' : 'oklch(0.3 0.02 150)'};border:1px solid ${on ? 'oklch(0.45 0.14 150)' : 'transparent'}"><span style="width:8px;height:8px;border-radius:50%;background:${o.color};flex:none"></span>${esc(o.label)}${on ? ' ✓' : ''}</button>`; }).join('')}
        </div>
      </form>
    </div>`;
  }

  function viewShoots(ctx) {
    const searchClear = state.shootsSearch ? `<button type="button" class="search-clear" data-action="search-clear" data-field="shootsSearch">✕</button>` : '';
    const board = `
      <div class="kanban-scroll">
        ${ctx.columns.map(col => `
          <div class="kanban-col${col.shoots.length ? '' : ' empty-col'}" data-dropzone data-status="${col.status}">
            <div class="kanban-col-head">
              <span class="kc-dot" style="background:${col.color}"></span>
              <span class="kc-label">${col.label}</span>
              <span class="kc-count">${col.shoots.length}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:10px;min-height:40px">
              ${col.shoots.map(shootCard).join('')}
            </div>
          </div>`).join('')}
      </div>`;

    const calendar = `
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap">
        <div class="bc card">
          <div class="bc-head">
            <div class="bc-month">${ctx.monthLabel}</div>
            <div class="bc-legend"><span><i></i>Shoot</span><span><i class="ed"></i>Edit</span></div>
            <div class="dash-month bc-nav"><button type="button" data-action="cal-prev" aria-label="Nakaraang buwan">‹</button><button type="button" data-action="cal-next" aria-label="Susunod na buwan">›</button></div>
          </div>
          <div class="cal-grid bc-wd">${WEEKDAY_LABELS.map(wd => `<div>${wd}</div>`).join('')}</div>
          <div class="cal-grid bc-grid">
            ${ctx.calendarCells.map(c => c.blank
              ? `<div class="bc-blank"></div>`
              : `<div class="bc-cell${c.isToday ? ' is-today' : ''}${c.isSelected ? ' is-sel' : ''}" data-action="cal-select" data-date="${c.dateStr}">
                  <span class="bc-num">${c.dayNum}</span>
                  ${c.shootItems.map(si => `<div class="bc-ev${si.color === '#33503c' ? ' ed' : ''}" draggable="true" data-id="${esc(si.id)}" title="Hilahin sa ibang araw para ilipat"><b>${esc(si.client)}</b>${si.location ? `<small>${esc(si.location)}</small>` : ''}</div>`).join('')}
                  ${c.extraShootCount > 0 ? `<div class="bc-more">+${c.extraShootCount} pa</div>` : ''}
                  ${c.shootItems.length ? `<span class="bc-dots">${c.shootItems.map(si => `<i class="${si.color === '#33503c' ? 'ed' : ''}"></i>`).join('')}</span>` : ''}
                </div>`).join('')}
          </div>
        </div>
        <div style="width:280px;flex:none" class="card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px">
            <div class="card-title" style="margin-bottom:0">${state.selectedDate ? fmtDate(state.selectedDate) : 'Select a date'}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:14px">
            ${ctx.selectedDateShoots.map(s => `
              <div style="background:var(--card2);border-radius:10px;padding:11px;cursor:pointer" data-action="shoot-edit" data-id="${esc(s.id)}">
                <div style="font-weight:600;font-size:13.5px;margin-bottom:3px">${esc(s.client)}</div>
                <div style="color:oklch(0.48 0.015 150);font-size:12px">${s.timeLabel} · ${esc(s.location)}</div>
              </div>`).join('')}
            ${ctx.selectedDateShoots.length === 0 ? `<div style="color:oklch(0.55 0.015 150);font-size:13px">No shoots this day.</div>` : ''}
          </div>
          ${state.selectedDate ? `<button type="button" class="btn-primary" style="width:100%;box-sizing:border-box;text-align:center" data-action="shoot-add-open-for-date">+ New Shoot on ${fmtDate(state.selectedDate)}</button>` : ''}
        </div>
      </div>`;

    return `
    <div class="page-head">
      <div>
        <div class="page-title sg">Shoots</div>
        <div class="page-sub">Hilahin ang card para ilipat ng stage</div>
      </div>
      <div style="display:flex;gap:12px;align-items:center">
        <div class="tabbar">
          <button type="button" class="tab-btn" style="color:${state.shootsMode === 'board' ? 'oklch(0.22 0.02 150)' : 'oklch(0.48 0.015 150)'};background:${state.shootsMode === 'board' ? 'oklch(0.92 0.06 150)' : 'transparent'}" data-action="shoots-mode" data-mode="board">Board</button>
          <button type="button" class="tab-btn" style="color:${state.shootsMode === 'calendar' ? 'oklch(0.22 0.02 150)' : 'oklch(0.48 0.015 150)'};background:${state.shootsMode === 'calendar' ? 'oklch(0.92 0.06 150)' : 'transparent'}" data-action="shoots-mode" data-mode="calendar">Calendar</button>
        </div>
        <button type="button" class="btn-primary" data-action="shoot-add-open">+ New Shoot</button>
      </div>
    </div>
    <div class="search-wrap">
      <input type="text" value="${esc(state.shootsSearch)}" data-bind="shootsSearch" placeholder="Hanapin ayon sa client o location"/>
      ${searchClear}
    </div>
    ${state.shootsMode === 'board' ? board : calendar}`;
  }

  /* ---------------- finances ---------------- */

  function viewFinances(ctx) {
    const tab = (key, label) => `<button type="button" class="tab-btn" style="color:${state.financeTab === key ? 'oklch(0.22 0.02 150)' : 'oklch(0.48 0.015 150)'};background:${state.financeTab === key ? 'oklch(0.92 0.06 150)' : 'transparent'}" data-action="finance-tab" data-tab="${key}">${label}</button>`;

    const sideHustle = (() => {
      const mk = ctx.financeMonthKey;
      const shortDate = ds => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const rows = ctx.monthShoots.map(s => {
        const ps = shootPaymentsOf(s).slice().sort((x, y) => (x.date || '').localeCompare(y.date || ''));
        const pkg = Number(s.package) || 0;
        const paidT = shootPaidTotal(s);
        const bal = Math.max(0, pkg - paidT);
        const pct = pkg > 0 ? Math.min(100, Math.round(paidT / pkg * 100)) : 0;
        const nm = nextMilestoneDue(pkg, paidT);
        const payList = ps.length
          ? ps.map(p => `<span class="pay-chip${(p.date || '').slice(0, 7) === mk ? '' : ' old'}">${esc(p.label || 'Payment')} · ${fmtMoney(p.amount)} · ${shortDate(p.date)}</span>`).join('')
          : (paidT > 0 ? `<span class="pay-chip">${fmtMoney(paidT)} · ${shortDate(s.date)}</span>` : `<span class="pay-none">Wala pang bayad</span>`);
        return `
        <div class="pay-row">
          <button type="button" class="pay-main" data-action="shoot-edit" data-id="${esc(s.id)}">
            <b>${esc(s.client)}</b>
            <small>${[s.location, s.packageTierLabel && s.packageTier !== 'custom' ? String(s.packageTierLabel).split(' (')[0] : 'Custom', fmtMoney(pkg)].filter(Boolean).map(esc).join(' · ')}</small>
            <span class="pay-progress"><span class="bar"><i style="width:${pct}%"></i></span><span>${pct}% bayad</span></span>
            <span class="pay-chips">${payList}</span>
          </button>
          <div class="pay-side">
            <div class="pay-bal ${bal > 0 ? '' : 'paid'}">${bal > 0 ? fmtMoney(bal) : 'Bayad na'}</div>
            ${bal > 0 && nm.next ? `<small>Next: ${esc(nm.next.label)} ${fmtMoney(nm.due)}</small>` : ''}
            ${bal > 0 ? `<button type="button" class="btn-primary pay-btn" data-action="shoot-payment-open" data-id="${esc(s.id)}">Log payment</button>` : ''}
          </div>
        </div>`;
      }).join('');
      return `
      <div class="kpis kpis-3">
        <button type="button" class="kpi big" data-action="finance-breakdown" data-key="sidehustle"><small>Collected ngayong ${esc(ctx.financeMonthLabel.split(' ')[0])}</small><div class="v">${fmtMoney(ctx.monthSideHustleCollected)}</div><div class="d">Tingnan ang breakdown</div></button>
        <button type="button" class="kpi" data-action="finance-breakdown" data-key="remaining"><small>Balance pa</small><div class="v">${fmtMoney(ctx.monthOutstanding)}</div><div class="d">Hindi pa nababayaran</div></button>
        <button type="button" class="kpi" data-action="finance-breakdown" data-key="package"><small>Total package value</small><div class="v">${fmtMoney(ctx.monthTotalPackage)}</div><div class="d">Lahat ng projects</div></button>
      </div>
      <div class="pay-list">
        ${rows || `<div class="empty">Walang shoot o bayad sa ${esc(ctx.financeMonthLabel)}.</div>`}
      </div>`;
    })();

    const financeMonthPicker = `
      <div class="dash-month">
        <button type="button" data-action="ft-month-prev" aria-label="Previous month">‹</button>
        <span>${ctx.financeMonthLabel}</span>
        <button type="button" data-action="ft-month-next" aria-label="Next month">›</button>
        ${ctx.financeMonthKey !== THIS_MONTH_KEY ? `<button type="button" class="today" data-action="ft-month-today">Today</button>` : ''}
      </div>`;

    const ftDraftDateLabel = state.ftDraft.date ? fmtDate(state.ftDraft.date) : 'Select date';
    const ftDraftDateMonthLabel = new Date(state.ftDraftDateCalYear, state.ftDraftDateCalMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const ftDraftDateCells = buildCalendarCells(state.ftDraftDateCalYear, state.ftDraftDateCalMonth, [], state.ftDraft.date, true);
    const ftDraftDatePicker = `
      <div class="field" style="flex:1;min-width:130px;position:relative">
        <label>Date</label>
        <button type="button" data-action="ftdraft-date-toggle" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:10px 12px;color:inherit;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between">
          <span>${ftDraftDateLabel}</span>
        </button>
        ${state.ftDraftDatePickerOpen ? `
        <div data-picker-popover style="position:absolute;left:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:16px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:260px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div class="sg" style="font-weight:700;font-size:15px">${ftDraftDateMonthLabel}</div>
            <div style="display:flex;gap:6px">
              <button type="button" data-action="ftdraft-date-cal-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
              <button type="button" data-action="ftdraft-date-cal-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
            ${WEEKDAY_LABELS.map(w => `<div style="text-align:center;font-size:10.5px;font-weight:700;color:oklch(0.55 0.015 150)">${w}</div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
            ${ftDraftDateCells.map(c => c.blank ? `<div></div>` : `
              <div ${c.disabled ? '' : `data-action="ftdraft-date-pick" data-date="${c.dateStr}"`} style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:${c.disabled ? 'not-allowed' : 'pointer'};font-size:12.5px;font-weight:600;background:${c.bg};border:1px solid ${c.border};color:${c.textColor}">${c.dayNum}</div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;

    const fullTime = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
        <div class="card" style="padding:20px;cursor:pointer" data-action="finance-breakdown" data-key="fulltime" title="Tap to see breakdown"><div style="color:oklch(0.45 0.015 150);font-size:12.5px;font-weight:600;text-transform:uppercase">Earned This Month ›</div><div class="sg" style="font-size:26px;font-weight:700;margin-top:8px">${fmtMoney(ctx.ftMonthTotal)}</div><div style="font-size:11.5px;color:oklch(0.55 0.015 150);margin-top:3px">${esc(ctx.financeMonthLabel)}</div></div>
        <div class="card" style="padding:20px;cursor:pointer" data-action="finance-breakdown" data-key="fulltime-all" title="Tap to see breakdown"><div style="color:oklch(0.45 0.015 150);font-size:12.5px;font-weight:600;text-transform:uppercase">Total, All Time ›</div><div class="sg" style="font-size:26px;font-weight:700;margin-top:8px">${fmtMoney(ctx.totalFullTime)}</div><div style="font-size:11.5px;color:oklch(0.55 0.015 150);margin-top:3px">All full time income ever logged</div></div>
      </div>
      <div class="card" style="margin-bottom:24px">
        <div class="card-title">Add Income</div>
        <form data-action="save-fulltime" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">
          <div class="field" style="flex:1.4;min-width:150px"><label>Source</label>
            <select data-bind="ftDraft.sourceType">
              <option value="1st" ${state.ftDraft.sourceType === '1st' ? 'selected' : ''}>1st Cutoff</option>
              <option value="2nd" ${state.ftDraft.sourceType === '2nd' ? 'selected' : ''}>2nd Cutoff</option>
              <option value="other" ${state.ftDraft.sourceType === 'other' ? 'selected' : ''}>Others</option>
            </select>
          </div>
          ${state.ftDraft.sourceType === 'other' ? `<div class="field" style="flex:1.4;min-width:150px"><label>Please Specify</label><input type="text" value="${esc(state.ftDraft.sourceOther)}" data-bind="ftDraft.sourceOther" placeholder="e.g. December Bonus" required/></div>` : ''}
          <div class="field" style="flex:1;min-width:110px"><label>Amount (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(state.ftDraft.amount))}" data-bind="ftDraft.amount" data-fmt="money" placeholder="0" required/></div>
          ${ftDraftDatePicker}
          <button type="submit" class="btn-primary">Add</button>
        </form>
      </div>
      <div class="table-wrap">
        <div class="t-head" style="grid-template-columns:2fr 1fr 1fr 32px"><div>Source</div><div>Date</div><div>Amount</div><div></div></div>
        ${ctx.ftMonthRows.map(f => `
          <div class="t-row" style="grid-template-columns:2fr 1fr 1fr 32px">
            <div style="font-weight:600;font-size:14px">${esc(f.source)}</div>
            <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">${f.dateLabel}</div>
            <div style="font-size:13.5px;font-weight:600;color:oklch(0.5 0.15 150)">${f.amountLabel}</div>
            <button type="button" style="all:unset;cursor:pointer;color:oklch(0.48 0.015 150);font-size:14px;text-align:right" data-action="fulltime-delete" data-id="${esc(f.id)}" title="Delete">✕</button>
          </div>`).join('')}
        ${ctx.ftMonthRows.length === 0 ? `<div style="padding:20px;color:oklch(0.55 0.015 150);font-size:13px">No income entries for ${esc(ctx.financeMonthLabel)}.</div>` : ''}
      </div>`;

    const combinedRows = [
      ...ctx.ftMonthRows.map(f => ({ date: f.date, dateLabel: f.dateLabel, source: 'Full Time', label: f.source || 'Full Time Income', amountLabel: f.amountLabel })),
      ...ctx.monthShoots.flatMap(s => {
        const ps = shootPaymentsOf(s).filter(p => (p.date || '').slice(0, 7) === ctx.financeMonthKey);
        if (ps.length) return ps.map(p => ({ date: p.date, dateLabel: fmtDate(p.date), source: 'Raket', label: (s.client || 'Shoot') + (p.label ? ' · ' + p.label : ''), amountLabel: fmtMoney(p.amount) }));
        if (shootPaymentsOf(s).length === 0 && ((s.paidDate || s.date) || '').slice(0, 7) === ctx.financeMonthKey && (Number(s.paid) || 0) > 0) { const pd = s.paidDate || s.date; return [{ date: pd, dateLabel: fmtDate(pd), source: 'Raket', label: s.client || 'Shoot', amountLabel: fmtMoney(s.paid) }]; }
        return [];
      }),
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const combined = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:24px">
        <div class="card" style="padding:20px;cursor:pointer" data-action="finance-breakdown" data-key="fulltime" title="Tap to see breakdown"><div style="color:oklch(0.45 0.015 150);font-size:12.5px;font-weight:600;text-transform:uppercase">Full Time ›</div><div class="sg" style="font-size:24px;font-weight:700;margin-top:8px">${fmtMoney(ctx.ftMonthTotal)}</div></div>
        <div class="card" style="padding:20px;cursor:pointer" data-action="finance-breakdown" data-key="sidehustle" title="Tap to see breakdown"><div style="color:oklch(0.45 0.015 150);font-size:12.5px;font-weight:600;text-transform:uppercase">Raket Collected ›</div><div class="sg" style="font-size:24px;font-weight:700;margin-top:8px">${fmtMoney(ctx.monthSideHustleCollected)}</div></div>
        <div class="card" style="padding:20px;cursor:pointer" data-action="finance-breakdown" data-key="combined" title="Tap to see breakdown"><div style="color:oklch(0.45 0.015 150);font-size:12.5px;font-weight:600;text-transform:uppercase">Combined Income ›</div><div class="sg" style="font-size:24px;font-weight:700;margin-top:8px;color:oklch(0.55 0.12 175)">${fmtMoney(ctx.monthCombinedTotal)}</div></div>
        <div class="card" style="padding:20px;cursor:pointer" data-action="finance-breakdown" data-key="remaining" title="Tap to see breakdown"><div style="color:oklch(0.45 0.015 150);font-size:12.5px;font-weight:600;text-transform:uppercase">Remaining Balance ›</div><div class="sg" style="font-size:24px;font-weight:700;margin-top:8px;color:oklch(0.62 0.17 45)">${fmtMoney(ctx.monthOutstanding)}</div></div>
      </div>
      <div class="card" style="margin-bottom:24px">
        <div class="card-title">Income Split</div>
        <div style="height:14px;border-radius:8px;overflow:hidden;display:flex;background:oklch(0.91 0.012 150)">
          <div style="width:${ctx.monthFullTimeSharePercent}%;background:oklch(0.55 0.12 175)"></div>
          <div style="width:${ctx.monthSideHustleSharePercent}%;background:oklch(0.55 0.14 150)"></div>
        </div>
        <div style="display:flex;gap:20px;margin-top:12px;font-size:12.5px">
          <div style="display:flex;align-items:center;gap:6px;color:oklch(0.42 0.015 150)"><span style="width:9px;height:9px;border-radius:50%;background:oklch(0.55 0.12 175)"></span>Full Time (${ctx.monthFullTimeSharePercent}%)</div>
          <div style="display:flex;align-items:center;gap:6px;color:oklch(0.42 0.015 150)"><span style="width:9px;height:9px;border-radius:50%;background:oklch(0.55 0.14 150)"></span>Raket (${ctx.monthSideHustleSharePercent}%)</div>
        </div>
      </div>
      <div class="table-wrap">
        <div class="t-head" style="grid-template-columns:1fr 1.4fr 2fr 1fr"><div>Date</div><div>Source</div><div>Details</div><div>Amount</div></div>
        ${combinedRows.map(r => `
          <div class="t-row" style="grid-template-columns:1fr 1.4fr 2fr 1fr">
            <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">${r.dateLabel}</div>
            <div><span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;padding:3px 9px;border-radius:20px;background:${r.source === 'Full Time' ? 'oklch(0.92 0.05 175)' : 'oklch(0.92 0.06 150)'};color:${r.source === 'Full Time' ? 'oklch(0.4 0.1 175)' : 'oklch(0.4 0.13 150)'}">${r.source}</span></div>
            <div style="font-size:13.5px;font-weight:600">${esc(r.label)}</div>
            <div style="font-size:13.5px;font-weight:600">${r.amountLabel}</div>
          </div>`).join('')}
        ${combinedRows.length === 0 ? `<div style="padding:24px 20px;color:oklch(0.55 0.015 150);font-size:13.5px">No income recorded in ${esc(ctx.financeMonthLabel)}.</div>` : ''}
      </div>`;

    return `
    <div class="page-head">
      <div><div class="page-title sg">Payments</div><div class="page-sub">Sino na ang bayad at sino pa ang may balance</div></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${financeMonthPicker}
        <button type="button" class="btn-primary" style="padding:10px 16px" data-action="finance-export-open">↓ Export</button>
      </div>
    </div>
    <div class="tabbar" style="margin-bottom:24px">
      ${feat('salary') ? `${tab('sidehustle', 'Raket')}${tab('fulltime', 'Full time job')}${tab('combined', 'Combined')}` : ''}
    </div>
    ${!feat('salary') || state.financeTab === 'sidehustle' ? sideHustle : state.financeTab === 'fulltime' ? fullTime : combined}`;
  }

  /* ---------------- expenses ---------------- */

  function viewExpenses(ctx) {
    const searchClear = state.expensesSearch ? `<button type="button" class="search-clear" data-action="search-clear" data-field="expensesSearch">✕</button>` : '';
    const ebTab = state.expensesTab === 'breakdown' ? 'breakdown' : 'log';
    const expensesTabBar = `
      <div class="tabbar" style="margin-bottom:20px">
        ${[{ v: 'log', l: 'Log' }, { v: 'breakdown', l: 'Breakdown' }].map(t => { const on = ebTab === t.v; return `<button type="button" data-action="expenses-tab" data-tab="${t.v}" style="all:unset;cursor:pointer;padding:7px 15px;border-radius:8px;font-size:12px;font-weight:700;font-family:'Space Grotesk',sans-serif;color:${on ? 'oklch(0.3 0.02 150)' : 'oklch(0.5 0.015 150)'};background:${on ? 'var(--panel)' : 'transparent'};box-shadow:${on ? '0 1px 2px oklch(0 0 0 / 0.08)' : 'none'}">${t.l}</button>`; }).join('')}
      </div>`;

    const expensesMonthPicker = `
      <div style="display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--border);border-radius:12px;padding:10px 14px">
        <button type="button" data-action="expenses-month-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
        <div class="sg" style="font-weight:700;font-size:13.5px;min-width:120px;text-align:center">${ctx.expensesMonthLabel}</div>
        <button type="button" data-action="expenses-month-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
        ${ctx.expensesMonthKey !== THIS_MONTH_KEY ? `<button type="button" data-action="expenses-month-today" style="all:unset;cursor:pointer;margin-left:6px;padding:5px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:var(--card2);color:oklch(0.35 0.02 150)">This Month</button>` : ''}
      </div>`;

    // Instead of a popover date-picker, a permanent calendar (like the Shoots calendar view)
    // with a side panel — click any date to see exactly what was spent that day, plus its
    // total. Days with spending show a small peso total right on the cell.
    const expensesCalendarSection = `
      <div style="display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap;margin-bottom:24px">
        <div style="flex:1;min-width:320px;background:var(--panel2);border-radius:16px;padding:20px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <button type="button" class="btn-ghost" style="padding:6px 10px;border-radius:8px;font-size:15px" data-action="expenses-day-cal-prev">‹</button>
            <div class="sg" style="font-weight:700;font-size:15px">${ctx.expensesCalMonthLabel}</div>
            <button type="button" class="btn-ghost" style="padding:6px 10px;border-radius:8px;font-size:15px" data-action="expenses-day-cal-next">›</button>
          </div>
          <div class="cal-grid" style="margin-bottom:8px">
            ${WEEKDAY_LABELS.map(wd => `<div style="text-align:center;font-size:11px;color:oklch(0.55 0.015 150);font-weight:700;padding-bottom:4px">${wd}</div>`).join('')}
          </div>
          <div class="cal-grid">
            ${ctx.expensesCalCells.map(c => c.blank
              ? `<div></div>`
              : `<div class="cal-cell" style="background:${c.bg};border:1px solid ${c.border}" data-action="expenses-day-pick" data-date="${c.dateStr}">
                  <div style="font-size:12px;font-weight:600;color:${c.textColor}">${c.dayNum}</div>
                  ${c.hasExpense ? `<div style="font-size:9.5px;font-weight:700;color:oklch(0.58 0.19 25)">${c.dayTotalLabel}</div>` : ''}
                </div>`).join('')}
          </div>
        </div>
        <div style="width:280px;flex:none" class="card">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
            <div class="card-title" style="margin-bottom:0">${esc(ctx.expensesSelectedDayLabel)}</div>
            ${ctx.expensesSelectedDate !== TODAY_STR ? `<button type="button" data-action="expenses-day-today" style="all:unset;cursor:pointer;font-size:11px;font-weight:600;color:oklch(0.45 0.14 150)">Today</button>` : ''}
          </div>
          <div class="sg" style="font-size:22px;font-weight:700;margin-bottom:14px">${fmtMoney(ctx.expensesSelectedDayTotal)}</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            ${ctx.expensesSelectedDayRows.map(ex => `
              <div style="background:var(--card2);border-radius:10px;padding:11px">
                <div style="font-weight:600;font-size:13.5px;margin-bottom:3px">${esc(ex.description)}</div>
                <div style="color:oklch(0.48 0.015 150);font-size:12px">${ex.amountLabel}</div>
              </div>`).join('')}
            ${ctx.expensesSelectedDayRows.length === 0 ? `<div style="color:oklch(0.55 0.015 150);font-size:13px">No expenses this day.</div>` : ''}
          </div>
        </div>
      </div>`;

    return `
    <div class="page-head">
      <div><div class="page-title sg">Expenses</div><div class="page-sub">Lahat ng gastos mo sa raket, sa isang lugar</div></div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        ${expensesMonthPicker}
        <button type="button" class="btn-ghost" style="padding:9px 14px;border-radius:9px;background:var(--card2);font-size:13px;font-weight:600;color:oklch(0.35 0.02 150)" data-action="expense-export-open" title="Export your expenses as CSV or PDF for a date range">${icon('download', 16)} Export</button>
        <button type="button" class="btn-telegram" data-action="telegram-open">+ Add Expense</button>
      </div>
    </div>
    ${expensesTabBar}
    ${ebTab === 'log' ? expensesCalendarSection : ''}
    ${ebTab === 'breakdown' ? (ctx.expenseBreakdown.hasData ? (() => { const eb = ctx.expenseBreakdown; return `
    <div class="card" style="margin-top:24px">
      <div class="card-title" style="margin-bottom:4px;font-size:15px">Expense Breakdown · ${esc(ctx.expensesMonthLabel)}</div>
      <div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-bottom:16px">Automatic na naka sort from your descriptions, spending trend and where it went.</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px">
        <div style="background:var(--card2);border-radius:12px;padding:12px 14px"><div style="font-size:10.5px;font-weight:600;color:oklch(0.48 0.015 150);margin-bottom:4px">Total spent</div><div class="sg" style="font-size:16px;font-weight:700">${eb.stat.totalLabel}</div><div style="font-size:10.5px;color:oklch(0.55 0.015 150);margin-top:2px">${eb.stat.perDayLabel} / day</div></div>
        <div style="background:var(--card2);border-radius:12px;padding:12px 14px"><div style="font-size:10.5px;font-weight:600;color:oklch(0.48 0.015 150);margin-bottom:4px">Debt & cards</div><div class="sg" style="font-size:16px;font-weight:700;color:oklch(0.4 0.13 150)">${eb.stat.debtLabel}</div><div style="font-size:10.5px;color:oklch(0.55 0.015 150);margin-top:2px">${eb.stat.debtPct}% of month</div></div>
        <div style="background:var(--card2);border-radius:12px;padding:12px 14px"><div style="font-size:10.5px;font-weight:600;color:oklch(0.48 0.015 150);margin-bottom:4px">Living spend</div><div class="sg" style="font-size:16px;font-weight:700;color:oklch(0.55 0.14 150)">${eb.stat.livingLabel}</div><div style="font-size:10.5px;color:oklch(0.55 0.015 150);margin-top:2px">${eb.stat.livingPerDayLabel} / day</div></div>
        <div style="background:var(--card2);border-radius:12px;padding:12px 14px"><div style="font-size:10.5px;font-weight:600;color:oklch(0.48 0.015 150);margin-bottom:4px">Entries</div><div class="sg" style="font-size:16px;font-weight:700">${eb.stat.entries}</div></div>
      </div>
      <div class="sg" style="font-weight:700;font-size:12.5px;margin-bottom:7px">Where the month went</div>
      <div style="display:flex;height:38px;border-radius:9px;overflow:hidden;gap:2px;margin-bottom:4px">
        <div style="flex:${Math.max(eb.stat.debtPct, 7)};background:oklch(0.4 0.13 150);display:flex;flex-direction:column;align-items:center;justify-content:center;color:oklch(1 0 0);min-width:0"><span style="font-weight:700;font-size:11px">Debt · ${eb.stat.debtPct}%</span><span style="font-size:9.5px;opacity:0.9">${eb.stat.debtLabel}</span></div>
        <div style="flex:${Math.max(100 - eb.stat.debtPct, 7)};background:oklch(0.62 0.13 150);display:flex;flex-direction:column;align-items:center;justify-content:center;color:oklch(1 0 0);min-width:0"><span style="font-weight:700;font-size:11px">Living · ${100 - eb.stat.debtPct}%</span><span style="font-size:9.5px;opacity:0.9">${eb.stat.livingLabel}</span></div>
      </div>
      <div class="sg" style="font-weight:700;font-size:12.5px;margin:20px 0 5px">Daily Spending Trend</div>
      <div style="font-size:11px;color:oklch(0.55 0.015 150);margin-bottom:6px">Tap any day to see exactly what you spent.</div>
      <svg viewBox="0 0 ${eb.W} ${eb.H}" style="width:100%;height:auto;overflow:visible;font-family:'Inter',sans-serif">
        <defs><linearGradient id="ebGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="oklch(0.55 0.14 150)" stop-opacity="0.28"/><stop offset="100%" stop-color="oklch(0.55 0.14 150)" stop-opacity="0"/></linearGradient></defs>
        ${eb.grid.map(g => `<line x1="${eb.L}" y1="${g.y.toFixed(1)}" x2="${eb.W - eb.R}" y2="${g.y.toFixed(1)}" stroke="oklch(0 0 0 / 0.06)" stroke-width="1"/><text x="${eb.L - 8}" y="${(g.y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" fill="oklch(0.55 0.015 150)">${g.label}</text>`).join('')}
        ${eb.areaPath ? `<path d="${eb.areaPath}" fill="url(#ebGrad)"/>` : ''}
        ${eb.linePath ? `<path d="${eb.linePath}" fill="none" stroke="oklch(0.5 0.14 150)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : ''}
        ${eb.markers.filter(m => m.sel).map(m => `<line x1="${m.x.toFixed(1)}" y1="16" x2="${m.x.toFixed(1)}" y2="220" stroke="oklch(0.5 0.14 150)" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.5"/>`).join('')}
        ${eb.markers.map(m => `${(m.day % 2 === 1 || m.day === eb.markers.length) ? `<text x="${m.x.toFixed(1)}" y="${eb.H - 9}" text-anchor="middle" font-size="9" fill="${m.sel ? 'oklch(0.42 0.13 150)' : 'oklch(0.55 0.015 150)'}" font-weight="${m.sel ? '700' : '400'}">${m.day}</text>` : ''}<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.sel ? 5 : (m.isSpike ? 4 : 2.4)}" fill="${m.sel ? 'oklch(0.5 0.14 150)' : 'oklch(1 0 0)'}" stroke="oklch(0.5 0.14 150)" stroke-width="${m.sel ? 2.5 : (m.isSpike ? 2.4 : 1.6)}"/>${m.isSpike ? `<rect x="${(m.x - 32).toFixed(1)}" y="${m.annotRectY.toFixed(1)}" width="64" height="15" rx="5" fill="oklch(1 0 0)" stroke="oklch(0.45 0.14 150)" stroke-opacity="0.4"/><text x="${m.x.toFixed(1)}" y="${(m.annotTextY - 0.5).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="700" fill="oklch(0.42 0.13 150)">${esc(m.annot)}</text>` : ''}`).join('')}
        ${eb.markers.map(m => `<rect data-action="exp-day-select" data-day="${m.day}" x="${(m.x - (eb.W - eb.L - eb.R) / eb.markers.length / 2).toFixed(1)}" y="16" width="${((eb.W - eb.L - eb.R) / eb.markers.length).toFixed(1)}" height="204" fill="transparent" style="cursor:pointer"><title>${esc(m.tip)}</title></rect>`).join('')}
      </svg>
      ${eb.selDetail ? `
      <div style="background:var(--card2);border:1px solid var(--border3);border-radius:12px;padding:12px 14px;margin-top:10px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:${eb.selDetail.hasItems ? '8' : '0'}px">
          <div class="sg" style="font-weight:700;font-size:13px">${esc(eb.selDetail.label)}</div>
          <div class="sg" style="font-weight:700;font-size:15px;color:oklch(0.4 0.13 150)">${esc(eb.selDetail.amountLabel)}</div>
        </div>
        ${eb.selDetail.hasItems ? eb.selDetail.items.map(it => `<div style="display:flex;justify-content:space-between;gap:10px;padding:4px 0;font-size:12px"><span style="color:oklch(0.35 0.02 150);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.desc)}</span><span style="font-weight:600;flex:none">${esc(it.amountLabel)}</span></div>`).join('') : `<div style="font-size:12px;color:oklch(0.55 0.015 150)">No spending logged this day.</div>`}
      </div>` : `<div style="font-size:11.5px;color:oklch(0.55 0.015 150);margin-top:8px;text-align:center;padding:8px">Tap a point on the chart above to see that day's expenses.</div>`}
      <div class="sg" style="font-weight:700;font-size:12.5px;margin:20px 0 2px">By Category</div>
      <div style="font-size:10.5px;color:oklch(0.55 0.015 150);margin-bottom:8px">Tap a category to see its items, tap "Move" to fix any that landed in the wrong place. The app remembers your fix for next time.</div>
      ${eb.cats.map(c => `
        <div style="margin:9px 0">
          <div data-action="exp-cat-toggle" data-cat="${esc(c.name)}" style="cursor:pointer;display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:4px">
            <span style="font-weight:${c.open ? '700' : '400'}">${c.open ? '▾' : '▸'} ${esc(c.name)}</span>
            <span style="font-weight:700">${c.amountLabel} <span style="color:oklch(0.55 0.015 150);font-weight:600">${c.pct}%</span></span>
          </div>
          <div style="height:8px;background:oklch(0.91 0.012 150);border-radius:5px;overflow:hidden"><div style="height:100%;width:${Math.max(Math.round((c.amount / eb.catMax) * 100), 2)}%;background:${c.name === 'Debt & Card Payments' ? 'oklch(0.4 0.13 150)' : (c.name === 'Other' ? 'oklch(0.6 0.03 150)' : 'oklch(0.58 0.13 150)')};border-radius:5px"></div></div>
          <div style="font-size:10.5px;color:oklch(0.55 0.015 150);margin-top:3px">${c.count} ${c.count === 1 ? 'entry' : 'entries'}</div>
          ${c.open ? `<div style="margin:8px 0 14px;padding:6px 10px;background:var(--card2);border-radius:10px">
            ${c.items.map(it => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:11.5px;border-bottom:1px solid var(--border2)">
              <span style="width:44px;flex:none;color:oklch(0.55 0.015 150)">${esc(it.dateLabel)}</span>
              <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.desc)}</span>
              <span style="font-weight:600;flex:none">${esc(it.amountLabel)}</span>
              <button type="button" data-action="exp-item-reassign" data-id="${esc(it.id)}" style="all:unset;cursor:pointer;flex:none;font-size:10px;font-weight:700;color:oklch(0.45 0.14 150);padding:3px 8px;border-radius:6px;background:oklch(0.92 0.05 150)">Move</button>
            </div>`).join('')}
          </div>` : ''}
        </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:10px;font-size:15px">Biggest Expenses · ${esc(ctx.expensesMonthLabel)}</div>
        ${eb.top.map(t => `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border2)"><div style="font-size:10.5px;color:oklch(0.55 0.015 150);width:44px;flex:none">${esc(t.dateLabel)}</div><div style="flex:1;min-width:0;font-size:12px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(t.desc)}${t.isDebt ? ` <span style="font-size:8.5px;font-weight:700;padding:1px 5px;border-radius:5px;background:oklch(0.92 0.05 150);color:oklch(0.4 0.13 150)">debt</span>` : ''}</div><div style="font-size:12px;font-weight:700;flex:none">${esc(t.amountLabel)}</div></div>`).join('')}
      </div>
    </div>` })() : `<div class="card" style="margin-top:24px"><div style="text-align:center;padding:34px 20px;color:oklch(0.55 0.015 150);font-size:12.5px">No expenses logged for ${esc(ctx.expensesMonthLabel)} yet.</div></div>`) : ''}
    ${ebTab === 'log' ? `
    <div class="card" style="margin-top:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div class="card-title" style="margin-bottom:0">Monthly Report</div>
        <div style="display:flex;align-items:center;gap:8px;background:var(--card2);border-radius:10px;padding:6px 10px">
          <button type="button" style="all:unset;cursor:pointer;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px" data-action="expenses-report-year-prev">‹</button>
          <div class="sg" style="font-weight:700;font-size:12.5px;min-width:34px;text-align:center">${ctx.expensesReportYear}</div>
          <button type="button" style="all:unset;cursor:pointer;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px" data-action="expenses-report-year-next">›</button>
        </div>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:6px;height:150px;padding:0 2px">
        ${ctx.expensesReportMonths.map(m => `
          <button type="button" data-action="expenses-report-month-pick" data-month="${m.monthKey}" title="${esc(m.monthLabel)} ${ctx.expensesReportYear}: ${m.totalLabel}" style="all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;height:100%;justify-content:flex-end;position:relative;cursor:pointer">
            ${m.isSelected ? `<div style="position:absolute;top:-4px;transform:translateY(-100%);background:oklch(0.5 0.18 25);color:oklch(1 0 0);font-size:10px;font-weight:700;padding:3px 7px;border-radius:20px;white-space:nowrap">${m.totalLabel}</div>` : ''}
            <div style="width:60%;height:${m.heightPx}px;border-radius:6px 6px 0 0;background:${m.fill};flex:none"></div>
            <div style="font-size:11px;font-weight:600;color:${m.isSelected ? 'oklch(0.5 0.18 25)' : (m.isCurrentMonth ? 'oklch(0.4 0.13 150)' : 'oklch(0.5 0.015 150)')}">${m.shortLabel}</div>
          </button>`).join('')}
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:16px;padding-top:14px;border-top:1px solid var(--border2)">
        <div style="font-size:13px;font-weight:700;color:oklch(0.35 0.02 150)">Total for ${ctx.expensesReportYear}</div>
        <div class="sg" style="font-size:15px;font-weight:700">${fmtMoney(ctx.expensesReportYearTotal)}</div>
      </div>
    </div>
    <button type="button" data-action="expenses-list-toggle" style="all:unset;cursor:pointer;display:flex;align-items:center;justify-content:space-between;width:100%;box-sizing:border-box;background:var(--panel2);border-radius:12px;padding:12px 16px;margin-top:24px;margin-bottom:${state.expensesListOpen ? '16' : '0'}px">
      <span style="font-size:13px;font-weight:700;color:oklch(0.3 0.02 150)">${state.expensesListOpen ? '▾' : '▸'} Full list · ${esc(ctx.expensesMonthLabel)} (${ctx.filteredExpenseRows.length})</span>
      <span style="font-size:13px;font-weight:700;color:oklch(0.4 0.02 150)">${fmtMoney(ctx.monthExpensesTotal)}</span>
    </button>
    ${state.expensesListOpen ? `
    <div class="search-wrap">
      <input type="text" value="${esc(state.expensesSearch)}" data-bind="expensesSearch" placeholder="Search expenses..."/>
      ${searchClear}
    </div>
    <div class="table-wrap">
      <div class="t-head" style="grid-template-columns:2fr 1fr 1fr 32px"><div>Description</div><div>Date</div><div>Amount</div><div></div></div>
      ${ctx.filteredExpenseRows.map(ex => `
        <div class="t-row" style="grid-template-columns:2fr 1fr 1fr 32px">
          <div style="font-weight:600;font-size:14px">${esc(ex.description)}</div>
          <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">${ex.dateLabel}</div>
          <div style="font-size:13.5px;font-weight:600">${ex.amountLabel}</div>
          <button type="button" style="all:unset;cursor:pointer;color:oklch(0.48 0.015 150);font-size:14px;text-align:right" data-action="expense-delete" data-id="${esc(ex.id)}" title="Delete">✕</button>
        </div>`).join('')}
      ${ctx.filteredExpenseRows.length === 0 ? `<div style="padding:24px 20px;color:oklch(0.55 0.015 150);font-size:13.5px">No expenses in ${esc(ctx.expensesMonthLabel)}.</div>` : ''}
    </div>` : ''}` : ''}`;
  }

  /* ---------------- loans ---------------- */

  function viewLoans(ctx) {
    const filtered = ctx.loanCards.filter(l => l.lender.toLowerCase().includes(state.loansSearch.toLowerCase()));
    const searchClear = state.loansSearch ? `<button type="button" class="search-clear" data-action="search-clear" data-field="loansSearch">✕</button>` : '';
    return `
    <div class="page-head">
      <div><div class="page-title sg">Loans</div><div class="page-sub">Track balances and monthly dues</div></div>
      <button type="button" class="btn-primary" data-action="loan-add-open">+ Add Loan</button>
    </div>
    <div class="search-wrap">
      <input type="text" value="${esc(state.loansSearch)}" data-bind="loansSearch" placeholder="Search loans by lender..."/>
      ${searchClear}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
      ${filtered.map(l => `
        <div style="background:oklch(1 0 0);border:1px solid oklch(0 0 0 / 0.06);border-radius:20px;padding:24px;cursor:pointer;box-shadow:0 1px 3px oklch(0 0 0 / 0.04)" data-action="loan-edit" data-id="${esc(l.id)}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div style="font-weight:800;font-size:17px;letter-spacing:-0.01em">${esc(l.lender)}</div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;padding:5px 12px;border-radius:20px;background:${l.statusBg};color:${l.statusColor};flex:none">${l.statusLabel}</div>
          </div>
          <div style="color:oklch(0.5 0.015 150);font-size:13.5px;margin-bottom:18px">${esc(l.dueLabel)}</div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
            <span style="font-size:15px;font-weight:700">${l.remainingLabel} <span style="font-weight:500;color:oklch(0.5 0.015 150);font-size:12.5px">left</span></span>
            <span style="font-size:13px;color:oklch(0.5 0.015 150)">${l.amountLabel} total</span>
          </div>
          <div style="height:8px;background:oklch(0.91 0.012 150);border-radius:5px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;width:${l.paidPercent}%;background:linear-gradient(90deg, oklch(0.5 0.13 165), oklch(0.42 0.12 155));border-radius:5px"></div>
          </div>
          ${l.monthsLeftLabel ? `<div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-bottom:${l.showMonthPay ? '10px' : '18px'}">${l.monthsLeftLabel}</div>` : `<div style="margin-bottom:${l.showMonthPay ? '4px' : '18px'}"></div>`}
          ${l.isUpcoming ? `<div style="margin-bottom:16px"><span style="display:inline-flex;align-items:center;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:20px;background:oklch(0.68 0.11 245 / 0.16);color:oklch(0.45 0.14 245)">${esc(l.startBadgeLabel)}</span></div>` : (l.showMonthPay ? `<div style="margin-bottom:16px"><span style="display:inline-flex;align-items:center;font-size:11.5px;font-weight:700;padding:5px 11px;border-radius:20px;background:${l.monthPayBg};color:${l.monthPayColor}">${l.monthPayLabel}${l.monthPayShowDue && l.showDueBadge ? ` · ${l.dueBadgeLabel}` : ''}</span></div>` : '')}
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font-size:13.5px;color:oklch(0.45 0.015 150)">Monthly due: <span style="color:oklch(0.2 0.02 150);font-weight:700">${l.monthlyDueLabel}</span></div>
            ${l.showDueBadge ? `<div style="font-size:12px;font-weight:700;color:${l.dueBadgeColor}">${l.dueBadgeLabel}</div>` : ''}
          </div>
          ${l.isUpcoming ? `<div style="text-align:center;margin-top:14px;padding:8px;border-radius:8px;background:oklch(0.95 0.01 150);color:oklch(0.5 0.015 150);font-size:12.5px;font-weight:600">Not started yet</div>` : (l.remainingBalance > 0 ? `<button type="button" data-action="loan-payment-open" data-id="${esc(l.id)}" style="all:unset;cursor:pointer;display:block;width:100%;box-sizing:border-box;text-align:center;margin-top:14px;padding:8px;border-radius:8px;background:oklch(0.92 0.06 150);color:oklch(0.45 0.14 150);font-size:12.5px;font-weight:700">Log Payment</button>` : '')}
        </div>`).join('')}
    </div>`;
  }

  /* ---------------- clients ---------------- */

  function viewClients(ctx) {
    const searchClear = state.clientsSearch ? `<button type="button" class="search-clear" data-action="search-clear" data-field="clientsSearch">✕</button>` : '';
    return `
    <div class="page-head">
      <div><div class="page-title sg">Clients</div><div class="page-sub">Leads, contacts, and follow ups</div></div>
      <button type="button" class="btn-primary" data-action="client-add-open">+ Add Client</button>
    </div>
    <div class="search-wrap">
      <input type="text" value="${esc(state.clientsSearch)}" data-bind="clientsSearch" placeholder="Search clients..."/>
      ${searchClear}
    </div>
    <div class="table-wrap">
      <div class="t-head" style="grid-template-columns:1.8fr 1.4fr 1fr"><div>Name</div><div>Contact</div><div>Status</div></div>
      ${ctx.clientRows.map(c => `
        <div class="t-row" style="grid-template-columns:1.8fr 1.4fr 1fr;cursor:pointer" data-action="client-edit" data-id="${esc(c.id)}">
          <div style="font-weight:600;font-size:14px">${esc(c.name)}</div>
          <div>
            <div style="font-size:12.5px;color:oklch(0.4 0.015 150)">${esc(c.phone)}</div>
            <div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:1px">${esc(c.email)}</div>
          </div>
          <div>${badge(leadStatusLabel(c.leadStatus), c.statusColor, c.statusBg)}</div>
        </div>`).join('')}
      ${ctx.clientRows.length === 0 ? `<div style="padding:24px 20px;color:oklch(0.55 0.015 150);font-size:13.5px">No clients match your search.</div>` : ''}
    </div>`;
  }

  /* ---------------- documents ---------------- */

  function viewDocs(ctx) {
    const d = state.docDraft;
    const docType = state.docType;
    const meta = DOC_TYPE_META[docType];
    const isInvoice = docType === 'invoice';
    // The billing document is explicitly either an Invoice or a Statement of Account —
    // chosen by a toggle (docDraft.billingKind), independent of currency. Title, reference
    // label, number prefix and PDF filename all follow that choice.
    const billingKind = d.billingKind || 'soa';
    const isInv = isInvoice && billingKind === 'invoice';
    const docTitle = isInvoice ? (isInv ? 'Invoice' : 'Statement of Account') : meta.title;
    const docRefLabel = isInvoice ? (isInv ? 'Invoice No.' : 'SOA No.') : 'Reference No.';
    const docNumberFieldLabel = isInv ? 'Invoice Number' : 'Statement (SOA) Number';
    const paymentStatusColor = d.paymentStatus === 'Paid' ? 'oklch(0.45 0.13 150)' : d.paymentStatus === 'Partial' ? 'oklch(0.55 0.14 80)' : 'oklch(0.55 0.18 25)';
    const paymentStatusBg = d.paymentStatus === 'Paid' ? 'oklch(0.92 0.06 150)' : d.paymentStatus === 'Partial' ? 'oklch(0.93 0.07 80)' : 'oklch(0.92 0.08 25)';
    const tab = (key, label) => `<button type="button" class="tab-btn" style="color:${docType === key ? 'oklch(0.22 0.02 150)' : 'oklch(0.48 0.015 150)'};background:${docType === key ? 'oklch(0.92 0.06 150)' : 'transparent'}" data-action="doc-type" data-doctype="${key}">${label}</button>`;

    const docDateLabel = d.date ? fmtDate(d.date) : 'Select date';
    const docDateMonthLabel = new Date(state.docDateCalYear, state.docDateCalMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const docDateCells = buildCalendarCells(state.docDateCalYear, state.docDateCalMonth, [], d.date);
    const docDatePicker = `
      <div class="field" style="position:relative">
        <label>Date</label>
        <button type="button" data-action="doc-date-toggle" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:10px 12px;color:inherit;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between">
          <span>${docDateLabel}</span>
        </button>
        ${state.docDatePickerOpen ? `
        <div data-picker-popover style="position:absolute;left:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:16px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:260px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div class="sg" style="font-weight:700;font-size:15px">${docDateMonthLabel}</div>
            <div style="display:flex;gap:6px">
              <button type="button" data-action="doc-date-cal-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
              <button type="button" data-action="doc-date-cal-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
            ${WEEKDAY_LABELS.map(w => `<div style="text-align:center;font-size:10.5px;font-weight:700;color:oklch(0.55 0.015 150)">${w}</div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
            ${docDateCells.map(c => c.blank ? `<div></div>` : `
              <div data-action="doc-date-pick" data-date="${c.dateStr}" style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12.5px;font-weight:600;background:${c.bg};border:1px solid ${c.border};color:${c.textColor}">${c.dayNum}</div>`).join('')}
          </div>
        </div>` : ''}
      </div>`;

    const docDueLabel = d.dueDate ? fmtDate(d.dueDate) : (docType === 'quotation' ? 'No expiry' : 'Select date');
    const docDueMonthLabel = new Date(state.docDueCalYear, state.docDueCalMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const docDueCells = buildCalendarCells(state.docDueCalYear, state.docDueCalMonth, [], d.dueDate);
    const docDuePicker = `
      <div class="field" style="position:relative">
        <label>${docType === 'quotation' ? 'Valid Until' : 'Due Date'}</label>
        <button type="button" data-action="doc-due-toggle" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:10px 12px;color:inherit;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between">
          <span>${docDueLabel}</span>
        </button>
        ${state.docDuePickerOpen ? `
        <div data-picker-popover style="position:absolute;right:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:16px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:260px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
            <div class="sg" style="font-weight:700;font-size:15px">${docDueMonthLabel}</div>
            <div style="display:flex;gap:6px">
              <button type="button" data-action="doc-due-cal-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
              <button type="button" data-action="doc-due-cal-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
            ${WEEKDAY_LABELS.map(w => `<div style="text-align:center;font-size:10.5px;font-weight:700;color:oklch(0.55 0.015 150)">${w}</div>`).join('')}
          </div>
          <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
            ${docDueCells.map(c => c.blank ? `<div></div>` : `
              <div data-action="doc-due-pick" data-date="${c.dateStr}" style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12.5px;font-weight:600;background:${c.bg};border:1px solid ${c.border};color:${c.textColor}">${c.dayNum}</div>`).join('')}
          </div>
          <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:10px">${docType === 'quotation' ? 'Automatic to 30 days after the issue date, click a date here to override.' : 'Automatic to 10 days after the invoice date, click a date here to override.'}</div>
          ${docType === 'quotation' ? `<button type="button" data-action="doc-due-clear" style="all:unset;cursor:pointer;color:oklch(0.55 0.18 25);font-size:11.5px;font-weight:700;margin-top:8px;display:inline-block">✕ No expiry (clear date)</button>` : ''}
        </div>` : ''}
      </div>`;

    // Quotation preview (redesigned): numbered Inclusions, Valid Until, Next Step, clean totals.
    const qItemsRaw = parseLineItems(d.lineItems);
    const qItems = qItemsRaw.length ? qItemsRaw
      : (d.amount ? [{ label: d.description || 'Professional service', amount: Number(d.amount) }]
                  : [{ label: 'No inclusions listed yet', amount: null }]);
    const qHasAmounts = qItems.some(it => it.amount != null);
    const qSubtotal = qItems.reduce((a, it) => a + (it.amount != null ? Number(it.amount) : 0), 0);
    const quotationPreview = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px">
        ${bizMark(46)}
        <div style="text-align:right">
          <div class="sg" style="font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.04em">Quotation</div>
          <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:3px">${esc(bizName())}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid oklch(0 0 0 / 0.08)">
        <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Issue Date</div><div style="font-size:12.5px;font-weight:700">${fmtDateShortYear(d.date)}</div></div>
        <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Valid Until</div><div style="font-size:12.5px;font-weight:700;color:oklch(0.4 0.13 150)">${d.dueDate ? fmtDateShortYear(d.dueDate) : 'No expiry'}</div></div>
        <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Project</div><div style="font-size:12.5px;font-weight:700">${esc(d.description) || ''}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid oklch(0 0 0 / 0.08)">
        <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;margin-bottom:6px">Prepared By</div><div style="font-weight:700;font-size:13.5px;margin-bottom:2px">${esc(ownerName() || bizName())}</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150)">${esc(S().tagline || '')}${S().contactLine ? '<br>' + esc(S().contactLine) : ''}</div></div>
        <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;margin-bottom:6px">Prepared For</div><div style="font-weight:700;font-size:13.5px;margin-bottom:2px">${esc(d.clientName) || '[Client Name]'}</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150)">${esc(d.clientContact) || 'No contact details provided'}</div></div>
      </div>
      <div style="font-size:12.5px;line-height:1.7;color:oklch(0.35 0.02 150);margin-bottom:20px">${esc(meta.body(d))}</div>
      <div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">Inclusions</div>
      <div style="border:1px solid oklch(0 0 0 / 0.06);border-radius:12px;overflow:hidden;margin-bottom:18px">
        ${qItems.map((it, i) => `
        <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;${i > 0 ? 'border-top:1px solid oklch(0 0 0 / 0.06);' : ''}font-size:12.5px">
          <div style="width:22px;height:22px;border-radius:7px;background:oklch(0.95 0.03 150);color:oklch(0.4 0.13 150);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none">${i + 1}</div>
          <div style="flex:1;min-width:0;font-weight:600">${esc(it.label)}</div>
          ${it.amount != null ? `<div style="font-weight:700;flex:none">${fmtMoney(it.amount)}</div>` : ''}
        </div>`).join('')}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-bottom:20px">
        <div style="min-width:250px">
          <div style="background:oklch(0.97 0.015 150);border-radius:12px;padding:14px 18px;margin-top:8px">
            <div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:7px">Total Proposed Rate</div>
            <div class="sg" style="font-size:23px;font-weight:700;line-height:1">${fmtMoney(d.amount)}</div>
          </div>
        </div>
      </div>
      <div style="background:oklch(0.95 0.03 150);border-left:4px solid oklch(0.4 0.13 150);border-radius:10px;padding:13px 16px;margin-bottom:20px">
        <div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Next Step</div>
        <div style="font-size:12px;color:oklch(0.3 0.03 150);line-height:1.6;white-space:pre-line">${esc(S().quoteNextStep || '')}</div>
      </div>
      <div style="border-top:1px solid oklch(0 0 0 / 0.08);padding-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px">Payment Terms</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150);line-height:1.6;white-space:pre-line">${esc(S().quoteTerms || '')}</div></div>
        ${d.notes ? `<div><div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px">Notes</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150);line-height:1.6;white-space:pre-line">${esc(d.notes)}</div></div>` : ''}
      </div>
    `;

    const sortedDocs = [...state.documents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const docsHistorySection = state.docsHistoryOpen ? `
      <div class="card" style="margin-bottom:20px">
        <div class="card-title" style="margin-bottom:4px">History (${sortedDocs.length})</div>
        ${sortedDocs.length === 0 ? `<div style="color:oklch(0.5 0.015 150);font-size:13px">No documents generated yet.</div>` : `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          ${sortedDocs.map(r => {
            const rd = r.draft;
            const rMeta = DOC_TYPE_META[r.type];
            const rIsInvoice = r.type === 'invoice';
            const rTitle = rIsInvoice ? ((rd.billingKind || 'soa') === 'invoice' ? 'Invoice' : 'Statement of Account') : rMeta.title;
            return `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:var(--card);border-radius:11px;border:1px solid oklch(0 0 0 / 0.06);flex-wrap:wrap">
            <div style="min-width:0;flex:1">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span class="badge" style="background:oklch(0.92 0.06 150);color:oklch(0.4 0.13 150)">${esc(rTitle)}</span>
                <span style="font-weight:700;font-size:13.5px">${esc(rd.clientName || 'Untitled')}</span>
                ${rIsInvoice ? `<span style="font-size:12px;color:oklch(0.5 0.015 150)">#${esc(rd.invoiceNumber)}</span>` : ''}
              </div>
              <div style="font-size:12px;color:oklch(0.5 0.015 150);margin-top:3px">${esc(rd.description || '')} · ${fmtDate(rd.date)} · ${fmtMoney(rd.amount)}${rIsInvoice ? ' · ' + esc(rd.paymentStatus) : ''}</div>
            </div>
            <div style="display:flex;gap:8px;flex:none">
              ${r.type === 'quotation' ? `<button type="button" data-action="doc-book-shoot" data-id="${esc(r.id)}" title="Client pushed through, create a booked shoot from this quotation" style="all:unset;cursor:pointer;padding:8px 12px;border-radius:8px;background:oklch(0.45 0.14 150);color:#fff;font-size:12.5px;font-weight:700">✓ Book</button>` : ''}
              <button type="button" data-action="doc-history-edit" data-id="${esc(r.id)}" style="all:unset;cursor:pointer;padding:8px 12px;border-radius:8px;background:oklch(0.93 0.03 250);color:oklch(0.45 0.13 260);font-size:12.5px;font-weight:700">Edit</button>
              <button type="button" data-action="doc-history-download" data-id="${esc(r.id)}" style="all:unset;cursor:pointer;padding:8px 12px;border-radius:8px;background:oklch(0.92 0.06 150);color:oklch(0.4 0.13 150);font-size:12.5px;font-weight:700">Download</button>
              <button type="button" data-action="doc-history-delete" data-id="${esc(r.id)}" style="all:unset;cursor:pointer;padding:8px 12px;border-radius:8px;background:oklch(0.92 0.08 25);color:oklch(0.5 0.19 25);font-size:12.5px;font-weight:700">Delete</button>
            </div>
          </div>`;
          }).join('')}
        </div>`}
      </div>` : '';

    return `
    <div class="page-head">
      <div><div class="page-title sg">Documents</div><div class="page-sub">Gumawa ng contract, quotation at SOA para sa client</div></div>
      <button type="button" class="btn-ghost" style="font-weight:600;font-size:13px;display:flex;align-items:center;gap:6px" data-action="doc-history-toggle">${state.docsHistoryOpen ? 'Hide History' : `View History (${state.documents.length})`}</button>
    </div>
    <div class="tabbar" style="margin-bottom:24px">${tab('contract', 'Contract')}${tab('quotation', 'Quotation')}${tab('invoice', 'Invoice / SOA')}</div>
    ${docsHistorySection}
    <div class="docs-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:20px;align-items:start">
      <div class="card" style="display:flex;flex-direction:column;gap:14px">
        <div class="field"><label>Select Existing Client (optional)</label>
          <select data-action-change="doc-client-pick">
            <option value="">Pumili sa Clients</option>
            ${state.clients.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Client Name</label><input type="text" value="${esc(d.clientName)}" data-bind="docDraft.clientName" placeholder="e.g. Nadine Reyes"/></div>
        <div class="field"><label>Client Address / Contact</label><input type="text" value="${esc(d.clientContact)}" data-bind="docDraft.clientContact" placeholder="Address, phone, or email"/></div>
        <div class="field"><label>Project / Service</label><input type="text" value="${esc(d.description)}" data-bind="docDraft.description" placeholder="e.g. Vlog Collab sa Tagaytay"/></div>
        <div class="row-2">
          <div class="field"><label>Amount (${isInvoice && d.currency === 'USD' ? '$' : '₱'})</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.amount))}" data-bind="docDraft.amount" data-fmt="money"/></div>
          ${docDatePicker}
        </div>
        <div class="field"><label>Terms / Notes</label><input type="text" value="${esc(d.notes)}" data-bind="docDraft.notes" placeholder="e.g. Balance due on delivery"/></div>
        ${isInvoice ? `
        <div style="border-top:1px solid oklch(0 0 0 / 0.07);margin-top:4px;padding-top:14px;display:flex;flex-direction:column;gap:14px">
          <div class="field"><label>Document Type</label>
            <div style="display:flex;gap:8px">
              <button type="button" data-action="doc-billing-kind" data-kind="soa" style="all:unset;cursor:pointer;flex:1;text-align:center;box-sizing:border-box;padding:10px;border-radius:9px;font-size:13px;font-weight:700;border:1.5px solid ${!isInv ? 'oklch(0.5 0.13 150)' : 'var(--border3)'};background:${!isInv ? 'oklch(0.94 0.04 150)' : 'transparent'};color:${!isInv ? 'oklch(0.34 0.13 150)' : 'oklch(0.5 0.015 150)'}">Statement of Account</button>
              <button type="button" data-action="doc-billing-kind" data-kind="invoice" style="all:unset;cursor:pointer;flex:1;text-align:center;box-sizing:border-box;padding:10px;border-radius:9px;font-size:13px;font-weight:700;border:1.5px solid ${isInv ? 'oklch(0.5 0.13 150)' : 'var(--border3)'};background:${isInv ? 'oklch(0.94 0.04 150)' : 'transparent'};color:${isInv ? 'oklch(0.34 0.13 150)' : 'oklch(0.5 0.015 150)'}">Invoice</button>
            </div>
            <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">This becomes the PDF title and file name (${isInv ? 'INVOICE' : 'STATEMENT OF ACCOUNT'}).</div>
          </div>
          <div class="field"><label>Currency</label>
            <div style="display:flex;gap:8px">
              <button type="button" data-action="doc-currency" data-cur="PHP" style="all:unset;cursor:pointer;flex:1;text-align:center;box-sizing:border-box;padding:9px;border-radius:9px;font-size:13px;font-weight:700;border:1.5px solid ${d.currency !== 'USD' ? 'oklch(0.5 0.13 150)' : 'var(--border3)'};background:${d.currency !== 'USD' ? 'oklch(0.94 0.04 150)' : 'transparent'};color:${d.currency !== 'USD' ? 'oklch(0.34 0.13 150)' : 'oklch(0.5 0.015 150)'}">₱ PHP <span style="font-weight:500;font-size:11px"> local</span></button>
              <button type="button" data-action="doc-currency" data-cur="USD" style="all:unset;cursor:pointer;flex:1;text-align:center;box-sizing:border-box;padding:9px;border-radius:9px;font-size:13px;font-weight:700;border:1.5px solid ${d.currency === 'USD' ? 'oklch(0.5 0.13 150)' : 'var(--border3)'};background:${d.currency === 'USD' ? 'oklch(0.94 0.04 150)' : 'transparent'};color:${d.currency === 'USD' ? 'oklch(0.34 0.13 150)' : 'oklch(0.5 0.015 150)'}">$ USD <span style="font-weight:500;font-size:11px"> foreign</span></button>
            </div>
          </div>
          <div class="row-2">
            <div class="field"><label>${docNumberFieldLabel}</label><input type="text" value="${esc(d.invoiceNumber)}" data-bind="docDraft.invoiceNumber" placeholder="${isInv ? 'e.g. INV 2026 014' : 'e.g. SOA 2026 014'}"/><div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">Suggested, increments each time you generate one.</div></div>
            ${docDuePicker}
          </div>
          <div class="field"><label>Line Items Breakdown</label><textarea rows="3" data-bind="docDraft.lineItems" placeholder="One item per line, e.g.&#10;Package fee: ₱10,000&#10;Transport: ₱1,000">${esc(d.lineItems)}</textarea><div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">Press Enter for a new item, each line becomes its own row in the invoice table.</div></div>
          <div class="field"><label>Payment Details</label><input type="text" value="${esc(d.paymentDetails)}" data-bind="docDraft.paymentDetails" placeholder="e.g. GCash 09XX XXX XXXX · Your Name"/></div>
          <div class="field"><label>Payment Status</label>
            <select data-bind="docDraft.paymentStatus">
              <option value="Unpaid" ${d.paymentStatus === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
              <option value="Partial" ${d.paymentStatus === 'Partial' ? 'selected' : ''}>Partial</option>
              <option value="Paid" ${d.paymentStatus === 'Paid' ? 'selected' : ''}>Paid</option>
            </select>
          </div>
          <div class="field"><label>Payment QR <span style="font-weight:500;color:oklch(0.5 0.015 150)">(GCash, Maya o bank QR, optional)</span></label>
            ${S().paymentQr ? `
            <div style="display:flex;align-items:center;gap:12px;background:var(--card2);border:1px solid var(--border3);border-radius:10px;padding:10px 12px">
              <img src="${S().paymentQr}" alt="Payment QR" style="width:52px;height:52px;object-fit:contain;border-radius:6px;background:#fff;flex:none"/>
              <div style="flex:1;min-width:0">
                <div style="font-size:12.5px;font-weight:700;color:oklch(0.34 0.13 150)">QR saved on this device</div>
                <button type="button" data-action="doc-qr-include" style="all:unset;cursor:pointer;font-size:11.5px;color:${d.includeQr !== false ? 'oklch(0.4 0.13 150)' : 'oklch(0.5 0.015 150)'};margin-top:3px">${d.includeQr !== false ? '☑' : '☐'} Show on this invoice's PDF</button>
              </div>
              <div style="display:flex;flex-direction:column;gap:6px;flex:none">
                <button type="button" data-action="doc-qr-upload" style="all:unset;cursor:pointer;font-size:11.5px;font-weight:700;color:oklch(0.4 0.13 150)">Replace</button>
                <button type="button" data-action="doc-qr-remove" style="all:unset;cursor:pointer;font-size:11.5px;color:oklch(0.5 0.18 25)">Remove</button>
              </div>
            </div>` : `
            <button type="button" data-action="doc-qr-upload" style="all:unset;cursor:pointer;display:block;text-align:center;box-sizing:border-box;width:100%;padding:11px;border-radius:10px;border:1.5px dashed var(--border3);background:var(--card2);color:oklch(0.4 0.13 150);font-size:12.5px;font-weight:700">＋ Upload payment QR image</button>
            <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">Upload once, it's saved on this device and can appear on every invoice you generate here. Client scans it to pay.</div>`}
          </div>
        </div>` : ''}
        ${docType === 'quotation' ? `
        <div style="border-top:1px solid oklch(0 0 0 / 0.07);margin-top:4px;padding-top:14px;display:flex;flex-direction:column;gap:14px">
          ${docDuePicker}
          <div class="field"><label>Inclusions</label><textarea rows="4" data-bind="docDraft.lineItems" placeholder="One per line, e.g.&#10;Whole day video shoot: ₱10,000&#10;Drone coverage: ₱3,000&#10;Editing and color grading: ₱2,000">${esc(d.lineItems)}</textarea><div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">One item per line. Add ": ₱amount" at the end to show a price. Each line becomes a numbered inclusion.</div></div>
        </div>` : ''}
        ${state.editingDocId ? `
        <div style="font-size:12px;color:oklch(0.45 0.13 260);background:oklch(0.96 0.03 260);border:1px solid oklch(0.86 0.05 260);padding:8px 11px;border-radius:9px;margin-top:4px">✎ Editing this ${docTitle.toLowerCase()}${isInvoice ? ` (#${esc(d.invoiceNumber)})` : ''}, “Update” saves it back to the same record (no new copy).</div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button type="button" class="btn-primary" style="flex:1;text-align:center" data-action="doc-generate">Update ${docTitle}</button>
          <button type="button" class="btn-ghost" style="text-align:center;background:var(--card2);padding:0 16px" data-action="doc-cancel-edit">Cancel</button>
        </div>
        ` : `
        <button type="button" class="btn-primary" style="text-align:center;margin-top:4px" data-action="doc-generate">Generate ${docTitle}</button>
        `}
      </div>
      <div id="doc-preview-panel" style="background:#fff;color:oklch(0.22 0.02 150);border-radius:16px;padding:32px;min-height:360px;border:1px solid oklch(0 0 0 / 0.06)">
        ${docType === 'quotation' ? quotationPreview : `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:22px">
          ${bizMark(46)}
          <div style="text-align:right">
            <div class="sg" style="font-weight:700;font-size:14px;text-transform:uppercase;letter-spacing:0.02em">${esc(docTitle)}</div>
            <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:3px">${esc(bizName())}</div>
            ${isInvoice ? `<div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:2px">${docRefLabel} ${esc(d.invoiceNumber)}</div>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid oklch(0 0 0 / 0.08)">
          ${isInvoice ? `
            <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Issue Date</div><div style="font-size:12.5px;font-weight:700">${fmtDateShortYear(d.date)}</div></div>
            <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Due Date</div><div style="font-size:12.5px;font-weight:700">${fmtDateShortYear(d.dueDate)}</div></div>
            <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Payment Status</div><div style="font-size:12.5px;font-weight:700;color:${paymentStatusColor}">${esc((d.paymentStatus || 'Unpaid').toUpperCase())}</div></div>
          ` : `
            <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Issue Date</div><div style="font-size:12.5px;font-weight:700">${fmtDateShortYear(d.date)}</div></div>
            <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Project / Service</div><div style="font-size:12.5px;font-weight:700">${esc(d.description) || ''}</div></div>
            <div><div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:3px">Document Type</div><div style="font-size:12.5px;font-weight:700">${docType === 'quotation' ? 'Quotation' : 'Contract'}</div></div>
          `}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid oklch(0 0 0 / 0.08)">
          <div>
            <div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;margin-bottom:6px">Billed By</div>
            <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">${esc(ownerName() || bizName())}</div>
            <div style="font-size:11.5px;color:oklch(0.5 0.015 150)">${esc(S().tagline || '')}${S().contactLine ? '<br>' + esc(S().contactLine) : ''}</div>
          </div>
          <div>
            <div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;margin-bottom:6px">Billed To</div>
            <div style="font-weight:700;font-size:13.5px;margin-bottom:2px">${esc(d.clientName) || '[Client Name]'}</div>
            <div style="font-size:11.5px;color:oklch(0.5 0.015 150)">${esc(d.clientContact) || 'No contact details provided'}</div>
          </div>
        </div>
        ${isInvoice ? `
        <div style="margin-bottom:18px;border-radius:8px;overflow:hidden;border:1px solid oklch(0 0 0 / 0.06)">
          <div style="display:flex;justify-content:space-between;padding:9px 12px;background:oklch(0.97 0.015 150);font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase">
            <span>Item</span><span>Amount</span>
          </div>
          ${(parseLineItems(d.lineItems).length ? parseLineItems(d.lineItems) : [{ label: 'No items listed', amount: null }]).map(it => `
          <div style="display:flex;justify-content:space-between;gap:12px;padding:10px 12px;border-top:1px solid oklch(0 0 0 / 0.06);font-size:12.5px">
            <span>${esc(it.label)}</span><span style="font-weight:600;flex:none">${it.amount != null ? fmtMoneyCur(it.amount, d.currency) : ''}</span>
          </div>`).join('')}
        </div>` : `
        <div style="font-size:13px;line-height:1.7;margin-bottom:18px">${esc(meta.body(d))}</div>`}
        ${isInvoice && d.packageTotal ? `
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;width:230px;font-size:12px;color:oklch(0.5 0.015 150)"><span>Total Package</span><span>${fmtMoneyCur(d.packageTotal, d.currency)}</span></div>
          ${Number(d.paidToDate) > 0 ? `<div style="display:flex;justify-content:space-between;width:230px;font-size:12px;color:oklch(0.5 0.015 150)"><span>Less: Paid to Date</span><span>− ${fmtMoneyCur(d.paidToDate, d.currency)}</span></div>` : ''}
          <div style="width:230px;border-top:1px solid oklch(0 0 0 / 0.1);margin-top:2px"></div>
        </div>` : ''}
        <div style="display:flex;${isInvoice ? 'justify-content:space-between;align-items:flex-start' : 'justify-content:flex-end'};gap:20px;margin-bottom:18px">
          ${isInvoice && d.paymentDetails ? `
          <div style="flex:1;min-width:0">
            <div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;margin-bottom:6px">Payment Details</div>
            <div style="font-size:12px;color:oklch(0.35 0.02 150);white-space:pre-line">${esc(d.paymentDetails)}</div>
          </div>` : (isInvoice ? '<div style="flex:1"></div>' : '')}
          <div style="background:oklch(0.97 0.015 150);border-radius:10px;padding:14px 16px;min-width:190px">
            <div style="font-size:9.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:6px">${isInvoice ? 'Total Amount Due' : (docType === 'quotation' ? 'Proposed Rate' : 'Total Contract Value')}</div>
            ${isInvoice && d.milestoneLabel ? `<div style="font-size:10.5px;color:oklch(0.5 0.015 150);margin-bottom:4px">${esc(d.milestoneLabel)}</div>` : ''}
            <div class="sg" style="font-size:20px;font-weight:700">${fmtMoneyCur(d.amount, d.currency)}</div>
          </div>
        </div>
        ${isInvoice && d.includeQr !== false && S().paymentQr ? `
        <div style="display:flex;align-items:center;gap:14px;padding:14px 0;border-top:1px solid oklch(0 0 0 / 0.08);margin-bottom:4px">
          <img src="${S().paymentQr}" alt="Payment QR" style="width:78px;height:78px;object-fit:contain;background:#fff;border-radius:8px;flex:none"/>
          <div>
            <div style="font-size:9.5px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;margin-bottom:4px">Scan to Pay</div>
            <div style="font-size:12px;color:oklch(0.35 0.02 150)">I scan ang QR gamit ang GCash, Maya o banking app para mabayaran ang amount sa itaas.</div>
          </div>
        </div>` : ''}
        ${d.notes ? `<div style="padding-top:14px;border-top:1px solid oklch(0 0 0 / 0.08);font-size:12px;color:oklch(0.5 0.015 150);white-space:pre-line"><div style="font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;font-size:9.5px;margin-bottom:6px">Notes</div>${esc(d.notes)}</div>` : ''}
        `}
      </div>
    </div>
    `;
  }

  /* ---------------- first run ---------------- */
  /* ---------------- license (one time purchase) ---------------- */
  const LICENSE_API = { url: 'https://edngzvnyajxudvbzmalg.supabase.co', key: 'sb_publishable_N3xc7VenyA933795z5Jsdw_Ud9pXhdf' };
  const LICENSE_LS = 'eksakto_license';
  const LICENSE_REQUIRED = location.protocol.startsWith('http') && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && !location.pathname.startsWith('/beta');
  function readLicense() { try { return JSON.parse(localStorage.getItem(LICENSE_LS) || 'null'); } catch (e) { return null; } }
  function hasLicense() { const l = readLicense(); return !!(l && l.key && l.ok); }
  let licenseState = { busy: false, error: '' };
  function modalLicense() {
    if (!LICENSE_REQUIRED || hasLicense()) return '';
    return `
    <div class="modal-backdrop" style="z-index:3100">
      <form class="modal-box" data-action="activate-license" style="background:var(--panel);display:flex;flex-direction:column;gap:16px;max-width:420px">
        <div style="font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:22px;letter-spacing:-0.5px">eksakto<span style="color:var(--accent1)">.</span></div>
        <div>
          <div class="modal-title" style="font-size:20px">Ilagay ang license key mo</div>
          <div style="font-size:13.5px;color:var(--text-dim);margin-top:6px;line-height:1.5">Nasa email na pinadala namin pagkatapos mong magbayad. Isang beses mo lang itong gagawin sa bawat device.</div>
        </div>
        <div class="field"><label>License key</label><input type="text" id="lic-key" value="${esc(licenseState.key || '')}" placeholder="EKS-XXXX-XXXX" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:1px" required/></div>
        ${licenseState.error ? `<div style="font-size:13px;font-weight:600;color:var(--danger)">${esc(licenseState.error)}</div>` : ''}
        <button type="submit" class="btn-primary" style="justify-content:center;padding:13px 16px;font-size:14px" ${licenseState.busy ? 'disabled' : ''}>${licenseState.busy ? 'Chine check...' : 'I activate'}</button>
        <div style="font-size:12.5px;color:var(--text-dim);text-align:center">Wala pang key? <a href="/bili" style="color:var(--accent1);font-weight:600">Bilhin ang Eksakto</a></div>
      </form>
    </div>`;
  }
  function activateLicense(key) {
    key = String(key || '').trim().toUpperCase();
    if (!/^EKS-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) { licenseState = { key, busy: false, error: 'Mukhang mali ang format. Ganito dapat: EKS-XXXX-XXXX' }; render(); return; }
    licenseState = { key, busy: true, error: '' }; render();
    fetch(LICENSE_API.url + '/rest/v1/rpc/activate_license', { method: 'POST', headers: { apikey: LICENSE_API.key, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_key: key }) })
      .then(r => r.json())
      .then(r => {
        if (r && r.ok) {
          try { localStorage.setItem(LICENSE_LS, JSON.stringify({ key, ok: true, name: r.name || '', at: new Date().toISOString() })); } catch (e) { /* storage blocked */ }
          licenseState = { busy: false, error: '' };
          if (r.name && !S().ownerName) setSettings({ ownerName: r.name }); else render();
        } else {
          licenseState = { key, busy: false, error: 'Hindi valid ang key na yan. Pakicheck, o mag email sa hello@eksakto.app.' }; render();
        }
      })
      .catch(() => { licenseState = { key, busy: false, error: 'Kailangan ng internet para ma activate. Subukan ulit.' }; render(); });
  }

  /* ---------------- guided setup (first run) ---------------- */
  const SETUP_FEATURES = [
    { key: 'clients', label: 'Clients', hint: 'Listahan ng clients, inquiries at follow ups', icon: 'clients' },
    { key: 'expenses', label: 'Expenses', hint: 'Gastos sa shoot, gear at subscriptions', icon: 'receipt' },
    { key: 'docs', label: 'Documents', hint: 'Quotation, contract at SOA na may logo mo', icon: 'docs' },
    { key: 'insights', label: 'Insights', hint: 'Kita kada buwan at monthly report', icon: 'money' },
    { key: 'gear', label: 'Gear ROI', hint: 'Bawi na ba ang camera at lens mo?', icon: 'camera' },
  ];
  const SETUP_SPLITS = {
    half: { label: '50 / 50', hint: 'Kalahati bilang down payment, kalahati pag deliver', ms: [{ label: 'Down Payment', pct: 50 }, { label: 'Final Payment', pct: 50 }] },
    thirty: { label: '30 / 70', hint: '30% para ma lock ang date, 70% pag deliver', ms: [{ label: 'Reservation', pct: 30 }, { label: 'Final Payment', pct: 70 }] },
    full: { label: 'Full payment', hint: 'Isang bayaran lang', ms: [{ label: 'Full Payment', pct: 100 }] },
  };
  function setupDraft() {
    if (!state.setup) {
      const st = S();
      state.setup = { step: 0, role: '', businessName: st.businessName || '', ownerName: st.ownerName || '', contactLine: st.contactLine || '', logo: st.logo || '', split: 'half',
        features: { clients: true, expenses: true, docs: true, insights: true, gear: false }, error: '' };
    }
    return state.setup;
  }
  function modalOnboarding() {
    if (S().onboarded || (LICENSE_REQUIRED && !hasLicense())) return '';
    const d = setupDraft();
    const steps = 5;
    const dots = `<div class="su-dots">${Array.from({ length: steps }, (_, i) => `<span class="${i <= d.step ? 'on' : ''}"></span>`).join('')}</div>`;
    const back = d.step > 0 ? `<button type="button" class="su-back" data-action="setup-back">${'‹'} Back</button>` : '<span></span>';
    const choice = (action, key, on, title, hint, ic) => `<button type="button" class="su-choice${on ? ' on' : ''}" data-action="${action}" data-key="${key}">${ic ? icon(ic, 22) : ''}<span><b>${title}</b><small>${hint}</small></span><i class="su-check">${on ? icon('check', 14) : ''}</i></button>`;
    let body = '', next = '';
    if (d.step === 0) {
      body = `<div class="su-hero"><span class="su-logo-word">eksakto<span>.</span></span></div>
        <h2 class="su-title">Buuin natin ang tracker mo.</h2>
        <p class="su-sub">Ilang tanong lang, mga isang minuto. Base sa sagot mo, ilalagay namin ang mga kailangan mo at itatago ang hindi.</p>`;
      next = `<button type="button" class="btn-primary su-next" data-action="setup-next">Simulan</button>`;
    } else if (d.step === 1) {
      body = `<h2 class="su-title">Ano ang raket mo?</h2><p class="su-sub">Lalagyan namin ng sample na packages at klase ng project. Pwede mong palitan lahat mamaya.</p>
        <div class="su-list">
          ${choice('setup-role', 'video', d.role === 'video', 'Videographer', 'Weddings, events, corporate, music videos', 'video')}
          ${choice('setup-role', 'photo', d.role === 'photo', 'Photographer', 'Portraits, prenups, products, events', 'camera')}
          ${choice('setup-role', 'both', d.role === 'both', 'Pareho', 'Video at photo', 'shoots')}
        </div>`;
      next = `<button type="button" class="btn-primary su-next" data-action="setup-next" ${d.role ? '' : 'disabled'}>Next</button>`;
    } else if (d.step === 2) {
      body = `<h2 class="su-title">Ang business mo</h2><p class="su-sub">Lalabas ito sa quotation, contract at SOA na ipapadala mo.</p>
        <div class="su-logo">${d.logo ? `<img src="${d.logo}" alt=""/>` : `<span>${icon('camera', 20)}</span>`}<button type="button" class="btn-link" data-action="setup-logo">${d.logo ? 'Palitan ang logo' : 'Mag upload ng logo (optional)'}</button></div>
        <div class="field"><label>Pangalan ng business</label><input type="text" id="su-biz" value="${esc(d.businessName)}" placeholder="e.g. Reyes Films" autocomplete="organization"/></div>
        <div class="field"><label>Pangalan mo</label><input type="text" id="su-owner" value="${esc(d.ownerName)}" placeholder="e.g. Juan Reyes" autocomplete="name"/></div>
        <div class="field"><label>Contact (optional)</label><input type="text" id="su-contact" value="${esc(d.contactLine)}" placeholder="e.g. 0917 123 4567 · hello@reyesfilms.ph"/></div>
        ${d.error ? `<div class="su-err">${esc(d.error)}</div>` : ''}`;
      next = `<button type="button" class="btn-primary su-next" data-action="setup-next">Next</button>`;
    } else if (d.step === 3) {
      body = `<h2 class="su-title">Paano ka nagpapabayad?</h2><p class="su-sub">Ito ang gagamitin sa singilan at SOA. Pwedeng baguhin sa Settings.</p>
        <div class="su-list">${Object.keys(SETUP_SPLITS).map(k => choice('setup-split', k, d.split === k, SETUP_SPLITS[k].label, SETUP_SPLITS[k].hint, 'payments')).join('')}</div>`;
      next = `<button type="button" class="btn-primary su-next" data-action="setup-next">Next</button>`;
    } else if (d.step === 4) {
      body = `<h2 class="su-title">Ano ang gusto mong gamitin?</h2><p class="su-sub">Kasama na lagi ang Shoots, Calendar at Payments. Piliin ang iba na kailangan mo.</p>
        <div class="su-list">${SETUP_FEATURES.map(f => choice('setup-feature', f.key, !!d.features[f.key], f.label, f.hint, f.icon)).join('')}</div>`;
      next = `<button type="button" class="btn-primary su-next" data-action="setup-next">Next</button>`;
    } else {
      const picked = ['Shoots at Calendar', 'Payments'].concat(SETUP_FEATURES.filter(f => d.features[f.key]).map(f => f.label));
      body = `<div class="su-hero"><span class="su-done">${icon('check', 28)}</span></div>
        <h2 class="su-title">Ready na ang tracker mo!</h2>
        <p class="su-sub">Ito ang kasama sa Eksakto mo. Pwede mong dagdagan o bawasan anytime sa Settings.</p>
        <div class="su-tags">${picked.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
      next = `<div class="su-final"><button type="button" class="btn-primary su-next" data-action="setup-finish" data-sample="0">Simulan na</button>
        <button type="button" class="btn-ghost su-next" data-action="setup-finish" data-sample="1">Subukan muna gamit ang sample data</button></div>`;
    }
    return `
    <div class="modal-backdrop su-backdrop" style="z-index:3000">
      <div class="modal-box su-box" role="dialog" aria-label="Setup">
        <div class="su-top">${back}${dots}<span class="su-step">${Math.min(d.step + 1, 6)}/6</span></div>
        <div class="su-body">${body}</div>
        ${next}
      </div>
    </div>`;
  }
  function setupReadInputs() {
    const d = setupDraft();
    const v = id => { const el = document.getElementById(id); return el ? el.value : null; };
    if (v('su-biz') !== null) d.businessName = v('su-biz');
    if (v('su-owner') !== null) d.ownerName = v('su-owner');
    if (v('su-contact') !== null) d.contactLine = v('su-contact');
  }
  function sampleData() {
    const day = n => addDays(TODAY_STR, n);
    const tiers = packageTiers();
    const t = i => tiers[Math.min(i, tiers.length - 2)] || { value: 'custom', price: 15000 };
    const pt = projectTypes();
    return {
      shoots: [
        { id: 'sample_1', sample: true, client: 'Santos Wedding', location: 'Tagaytay', date: day(5), time: '14:00', status: 'idea', shootType: 'Real Estate', serviceType: 'shoot', packageTier: t(2).value, package: t(2).price, paid: Math.round(t(2).price / 2), payments: [{ id: 'sp_s1', amount: Math.round(t(2).price / 2), date: TODAY_STR, label: 'Down Payment' }], addons: {}, projectType: pt[0] || '' },
        { id: 'sample_2', sample: true, client: 'Kopi Co. brand shoot', location: 'BGC', date: day(12), time: '09:00', status: 'tentative', shootType: 'Real Estate', serviceType: 'shoot', packageTier: t(0).value, package: t(0).price, paid: 0, payments: [], addons: {}, projectType: pt[3] || '' },
        { id: 'sample_3', sample: true, client: 'Dela Cruz Prenup', location: 'Batangas', date: TODAY_STR, time: '06:00', status: 'shot', shootType: 'Real Estate', serviceType: 'shoot', packageTier: t(1).value, package: t(1).price, paid: t(1).price, payments: [{ id: 'sp_s3', amount: t(1).price, date: TODAY_STR, label: 'Full Payment' }], addons: {}, projectType: pt[1] || '' },
      ],
      clients: [
        { id: 'sample_c1', sample: true, name: 'Santos Wedding', phone: '', email: '', leadStatus: 'Booked', followUpDate: '', notes: '' },
        { id: 'sample_c2', sample: true, name: 'Kopi Co. brand shoot', phone: '', email: '', leadStatus: 'Proposal Sent', followUpDate: day(2), notes: '' },
        { id: 'sample_c3', sample: true, name: 'Dela Cruz Prenup', phone: '', email: '', leadStatus: 'Booked', followUpDate: '', notes: '' },
      ],
      expenses: [
        { id: 'sample_e1', sample: true, description: 'Lens rental', amount: 2500, date: TODAY_STR, category: (expenseCategories()[1] || 'Other') },
        { id: 'sample_e2', sample: true, description: 'Grab papunta sa shoot', amount: 380, date: TODAY_STR, category: (expenseCategories()[2] || 'Other') },
      ],
    };
  }
  function hasSampleData() { return state.shoots.some(x => x.sample) || state.clients.some(x => x.sample) || state.expenses.some(x => x.sample); }
  function finishSetup(withSample) {
    const d = setupDraft();
    const role = d.role || 'video';
    const base = role === 'photo' ? STARTER_PRESETS.photo : STARTER_PRESETS.video;
    const types = role === 'both' ? Array.from(new Set(STARTER_PRESETS.video.projectTypes.concat(STARTER_PRESETS.photo.projectTypes).filter(x => x !== 'Others'))).concat(['Others']) : base.projectTypes.slice();
    const settings = { ...state.settings,
      businessName: d.businessName.trim(), ownerName: d.ownerName.trim(), contactLine: d.contactLine.trim(), logo: d.logo || state.settings.logo || '',
      tagline: role === 'both' ? 'Video & Photo Production' : base.tagline,
      packages: base.packages.map(x => ({ ...x })), addons: base.addons.map(x => ({ ...x })), projectTypes: types,
      milestones: SETUP_SPLITS[d.split].ms.map(x => ({ ...x })),
      features: { ...(state.settings.features || {}), ...d.features }, onboarded: true, checklistHidden: false };
    state = { ...state, settings, setup: null };
    const patch = { view: 'dashboard', settings };
    if (withSample) {
      const sd = sampleData();
      Object.assign(patch, { shoots: sd.shoots.concat(state.shoots), clients: sd.clients.concat(state.clients), expenses: sd.expenses.concat(state.expenses) });
    }
    setState(patch);
  }

  // "Simulan dito" checklist on Home until the basics are done (or hidden).
  function homeChecklist() {
    if (S().checklistHidden) return '';
    const real = state.shoots.filter(x => !x.sample);
    const items = [
      { done: real.length > 0, label: 'Mag add ng unang shoot mo', action: 'shoot-add-open' },
      { done: real.some(x => (Number(x.paid) || 0) > 0), label: 'Mag log ng bayad ng client', action: 'dock', key: 'payments' },
    ];
    if (feat('docs')) items.push({ done: (state.documents || []).length > 0, label: 'Gumawa ng quotation o SOA', action: 'dock', key: 'docs' });
    items.push({ done: !!localStorage.getItem('shoottracker_last_backup'), label: 'Mag backup sa Google Drive', action: 'backup-drive' });
    const doneCount = items.filter(i => i.done).length;
    if (doneCount === items.length && !hasSampleData()) return '';
    return `
    <section class="chk">
      <div class="chk-head"><div><h2>Simulan dito</h2><small>${doneCount} sa ${items.length} tapos na</small></div><button type="button" class="btn-link" data-action="checklist-hide">Itago</button></div>
      <div class="chk-bar"><i style="width:${Math.round(doneCount / items.length * 100)}%"></i></div>
      ${items.map(i => `<button type="button" class="chk-item${i.done ? ' done' : ''}" data-action="${i.action}" ${i.key ? `data-key="${i.key}"` : ''} ${i.done ? 'disabled' : ''}><i>${i.done ? icon('check', 13) : ''}</i><span>${esc(i.label)}</span></button>`).join('')}
      ${hasSampleData() ? `<div class="chk-sample">Sample data ang nakikita mo ngayon. <button type="button" class="btn-link" data-action="sample-clear">Burahin ang sample data</button></div>` : ''}
    </section>`;
  }

  /* ---------------- settings ---------------- */
  function viewSettings() {
    const st = S();
    const money = (path, val) => `<input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(val))}" data-bind="${path}" data-fmt="money"/>`;
    const text = (path, val, ph) => `<input type="text" value="${esc(val || '')}" data-bind="${path}" placeholder="${esc(ph || '')}"/>`;
    const area = (path, val, ph, rows) => `<textarea rows="${rows || 3}" data-bind="${path}" placeholder="${esc(ph || '')}" style="width:100%;resize:vertical">${esc(val || '')}</textarea>`;
    const delBtn = (action, i) => `<button type="button" class="set-del" data-action="${action}" data-idx="${i}" title="Tanggalin" aria-label="Tanggalin">${icon('trash', 18)}</button>`;
    const pctTotal = (st.milestones || []).reduce((a, m) => a + (Number(m.pct) || 0), 0);
    const featRow = (key, label, hint) => {
      const on = !!(st.features || {})[key];
      return `<button type="button" class="set-toggle" data-action="settings-feature" data-feat="${key}" aria-pressed="${on}">
        <span><b>${label}</b><small>${hint}</small></span><span class="sw${on ? ' on' : ''}" aria-hidden="true"><span></span></span></button>`;
    };
    const lastBackup = (() => { try { return localStorage.getItem('shoottracker_last_backup') || ''; } catch (e) { return ''; } })();
    return `
    <div class="page-head"><div><h1 class="page-title">Settings</h1><div class="page-sub">Ang business mo, presyo mo, at ang data mo.</div></div></div>
    <div class="set-grid">
      <section class="card set-wide set-starter">
        <div><div class="card-title">Simulan sa template</div>
        <div class="set-sub" style="margin:0">Pumili kung ano ang raket mo. Lalagyan namin ng sample na packages, add ons at klase ng project na pwede mong palitan.</div></div>
        ${state.presetConfirm ? `<div class="set-confirm"><span>Papalitan nito ang packages, add ons at klase ng project mo ng ${esc(STARTER_PRESETS[state.presetConfirm].label)} template. Ituloy?</span>
          <div style="display:flex;gap:8px"><button type="button" class="btn-primary" data-action="settings-preset-apply" data-preset="${state.presetConfirm}">Oo, gamitin</button><button type="button" class="btn-ghost" data-action="settings-preset-cancel">Wag muna</button></div></div>`
        : `<div class="set-presets">${Object.keys(STARTER_PRESETS).map(k => `<button type="button" class="set-preset" data-action="settings-preset" data-preset="${k}">${icon(k === 'video' ? 'video' : 'camera', 20)}<span><b>${STARTER_PRESETS[k].label}</b><small>${STARTER_PRESETS[k].projectTypes.slice(0, 3).join(', ')} at iba pa</small></span></button>`).join('')}</div>`}
      </section>
      <section class="card">
        <div class="card-title">Business profile</div>
        <div class="set-sub">Lalabas ito sa quotation, contract at SOA na ipapadala mo sa client.</div>
        <div class="set-logo">
          ${bizMark(64)}
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn-primary" data-action="settings-logo-upload">${st.logo ? 'Palitan ang logo' : 'Mag upload ng logo'}</button>
            ${st.logo ? `<button type="button" class="btn-ghost" data-action="settings-logo-remove">Tanggalin</button>` : ''}
          </div>
        </div>
        <div class="field"><label>Pangalan ng business</label>${text('settings.businessName', st.businessName, 'e.g. Reyes Films')}</div>
        <div class="field"><label>Pangalan mo</label>${text('settings.ownerName', st.ownerName, 'e.g. Juan Reyes')}</div>
        <div class="field"><label>Tagline</label>${text('settings.tagline', st.tagline, 'e.g. Wedding & Event Videography')}</div>
        <div class="field"><label>Contact (lalabas sa documents)</label>${text('settings.contactLine', st.contactLine, 'e.g. 0917 123 4567 · hello@reyesfilms.ph')}</div>
      </section>

      <section class="card">
        <div class="card-title">Packages</div>
        <div class="set-sub">Mga presyo mo. Ang mga shoot na naka book na ay hindi magbabago ang presyo.</div>
        <div class="set-rows">
          ${(st.packages || []).map((p, i) => `
          <div class="set-row"><div class="field"><label>Pangalan</label>${text(`settings.packages.${i}.name`, p.name, 'e.g. Basic')}</div><div class="field"><label>Presyo (₱)</label>${money(`settings.packages.${i}.price`, p.price)}</div>${delBtn('settings-del-package', i)}</div>`).join('')}
        </div>
        <button type="button" class="btn-ghost" data-action="settings-add-package">${icon('plus', 16)} Dagdag na package</button>
      </section>

      <section class="card">
        <div class="card-title">Add ons</div>
        <div class="set-sub">Extra na pwedeng idagdag sa package, gaya ng raw footage o extra na video.</div>
        <div class="set-rows">
          ${(st.addons || []).map((a, i) => `
          <div class="set-row"><div class="field"><label>Pangalan</label>${text(`settings.addons.${i}.label`, a.label, 'e.g. Raw Footage')}</div><div class="field"><label>Presyo (₱)</label>${money(`settings.addons.${i}.price`, a.price)}</div>
          <button type="button" class="set-chip" data-action="settings-addon-flat" data-idx="${i}" title="Palitan">${a.flat ? 'Flat' : 'Bawat isa'}</button>${delBtn('settings-del-addon', i)}</div>`).join('')}
        </div>
        <button type="button" class="btn-ghost" data-action="settings-add-addon">${icon('plus', 16)} Dagdag na add on</button>
      </section>

      <section class="card">
        <div class="card-title">Hatian ng bayad</div>
        <div class="set-sub">Paano hinahati ang bayad ng client. Ito ang gagamitin sa singilan at SOA.</div>
        <div class="set-rows">
          ${(st.milestones || []).map((m, i) => `
          <div class="set-row"><div class="field"><label>Pangalan</label>${text(`settings.milestones.${i}.label`, m.label, 'e.g. Down Payment')}</div><div class="field" style="max-width:110px"><label>Percent</label><input type="text" inputmode="numeric" value="${esc(m.pct)}" data-bind="settings.milestones.${i}.pct" data-fmt="money"/></div>${delBtn('settings-del-milestone', i)}</div>`).join('')}
        </div>
        <div class="set-sub" style="margin:0;color:${pctTotal === 100 ? 'var(--text-dim)' : 'var(--danger)'}">Kabuuan: ${pctTotal}%${pctTotal === 100 ? '' : ' (dapat 100%)'}</div>
        <button type="button" class="btn-ghost" data-action="settings-add-milestone">${icon('plus', 16)} Dagdag na hati</button>
      </section>

      <section class="card">
        <div class="card-title">Bayad at documents</div>
        <div class="field"><label>Payment details (lalabas sa SOA)</label>${area('settings.paymentDetails', st.paymentDetails, 'e.g. GCash 0917 123 4567 · Juan Reyes', 3)}</div>
        <div class="field"><label>Payment QR</label>
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            ${st.paymentQr ? `<img src="${st.paymentQr}" alt="Payment QR" style="width:64px;height:64px;object-fit:contain;background:#fff;border-radius:8px;border:1px solid var(--border)"/>` : ''}
            <button type="button" class="btn-ghost" data-action="doc-qr-upload">${st.paymentQr ? 'Palitan ang QR' : 'Mag upload ng QR'}</button>
            ${st.paymentQr ? `<button type="button" class="btn-ghost" data-action="doc-qr-remove">Tanggalin</button>` : ''}
          </div>
        </div>
        <div class="field"><label>Quotation: next step</label>${area('settings.quoteNextStep', st.quoteNextStep, '', 3)}</div>
        <div class="field"><label>Quotation: payment terms</label>${area('settings.quoteTerms', st.quoteTerms, '', 3)}</div>
        <div class="field"><label>Contract: dagdag na terms (optional)</label>${area('settings.contractTerms', st.contractTerms, 'e.g. Ang final video ay ma deliver within 30 days pagkatapos ng event.', 4)}</div>
      </section>

      <section class="card">
        <div class="card-title">Klase ng project</div>
        <div class="set-sub">Pipiliin mo ito tuwing mag aadd ng shoot, para kita mo kung saan galing ang kita mo.</div>
        <div class="set-rows">
          ${(st.projectTypes || []).map((t, i) => `<div class="set-row"><div class="field" style="flex:1;margin:0">${text(`settings.projectTypes.${i}`, t, 'e.g. Wedding')}</div>${delBtn('settings-list-del" data-list="projectTypes', i)}</div>`).join('')}
        </div>
        <button type="button" class="btn-ghost" data-action="settings-list-add" data-list="projectTypes">${icon('plus', 16)} Dagdag na klase</button>
      </section>

      <section class="card">
        <div class="card-title">Categories ng gastos</div>
        <div class="set-sub">Para sa Money page. Laging may "Other" sa dulo.</div>
        <div class="set-rows">
          ${(st.expenseCategories || []).map((t, i) => `<div class="set-row"><div class="field" style="flex:1;margin:0">${text(`settings.expenseCategories.${i}`, t, 'e.g. Gear Rental')}</div>${delBtn('settings-list-del" data-list="expenseCategories', i)}</div>`).join('')}
        </div>
        <button type="button" class="btn-ghost" data-action="settings-list-add" data-list="expenseCategories">${icon('plus', 16)} Dagdag na category</button>
      </section>

      <section class="card">
        <div class="card-title">Mga stage ng shoot</div>
        <div class="set-sub">Ang tawag mo sa bawat column sa Shoots board.</div>
        <div class="set-pairs">
          ${STATUS_META.map(m => `<div class="field"><label>${esc(m.base || m.label)}</label>${text(`settings.statusLabels.${m.value}`, (st.statusLabels || {})[m.value], m.base || m.label)}</div>`).join('')}
        </div>
      </section>

      <section class="card">
        <div class="card-title">Mga stage ng client</div>
        <div class="set-sub">Ang tawag mo sa status ng bawat client sa Clients page.</div>
        <div class="set-pairs">
          ${LEAD_STATUSES.map(v => `<div class="field"><label>${esc(LEAD_STATUS_LABELS[v] || v)}</label>${text(`settings.leadLabels.${v}`, (st.leadLabels || {})[v], LEAD_STATUS_LABELS[v] || v)}</div>`).join('')}
        </div>
      </section>

      <section class="card set-wide">
        <div class="card-title">Wording ng documents</div>
        <div class="set-sub">Ito ang unang talata ng quotation, contract at SOA. Ilagay ang mga blanko na ito at kami na ang magpupuno:</div>
        <div class="set-blanks">${['client', 'project', 'date', 'amount', 'business', 'owner'].map(b => `<code>{${b}}</code>`).join('')}</div>
        <div class="set-docs">
          <div class="field"><label>Quotation</label>${area('settings.tplQuotation', st.tplQuotation, '', 4)}</div>
          <div class="field"><label>Contract</label>${area('settings.tplContract', st.tplContract, '', 4)}</div>
          <div class="field"><label>SOA / Invoice</label>${area('settings.tplInvoice', st.tplInvoice, '', 4)}</div>
        </div>
        <button type="button" class="btn-link" data-action="settings-doc-reset">Ibalik sa default na wording</button>
      </section>

      <section class="card">
        <div class="card-title">Features</div>
        <div class="set-sub">Buksan lang ang kailangan mo. Ang naka off ay hindi lalabas sa tabs at sa Home.</div>
        <div class="set-toggles">
          ${SETUP_FEATURES.map(f => featRow(f.key, f.label, f.hint)).join('')}
        </div>
        <div class="field" style="margin-top:14px"><label>Yearly income goal (₱, optional)</label>${money('settings.yearlyGoal', st.yearlyGoal)}</div>
      </section>

      <section class="card set-wide">
        <div class="card-title">Data mo</div>
        <div class="set-sub">Nasa device na ito lang naka save ang data mo, wala sa server. Mag backup ka sa Google Drive linggo linggo para may kopya ka kung mawala, masira, o mapalitan ang phone o laptop mo. Pag nagpalit ka ng device, i download mo lang yung file sa Drive at pindutin ang Restore.</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button type="button" class="btn-primary" data-action="backup-drive">${icon('cloud', 16)} I backup sa Google Drive</button>
          <button type="button" class="btn-ghost" data-action="backup-download">${icon('download', 16)} Download lang</button>
          <button type="button" class="btn-ghost" data-action="backup-restore">${icon('upload', 16)} Restore mula sa backup</button>
          <span style="font-size:12.5px;color:var(--text-dim)">${lastBackup ? 'Huling backup: ' + esc(fmtDate(lastBackup.slice(0, 10))) : 'Wala ka pang backup.'}</span>
        </div>
      </section>
    </div>`;
  }

  /* ---------------- insights ---------------- */

  function viewInsights(ctx) {
    return `
    <div class="page-head">
      <div><div class="page-title sg">Insights</div><div class="page-sub">Buod ng kita at gastos ng business mo</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn-primary" data-action="monthly-report" title="Generate a clean PDF summary of this month (shoots, revenue, expenses, net)">${icon('docs', 16)} Monthly report</button>
        <button type="button" class="btn-telegram" data-action="export-data-csv" title="Download separate CSV files for Shoots, Expenses, Income, Clients, Loans, and Goals">${icon('download', 16)} Export data</button>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px">
        <div class="card-title" style="margin-bottom:0">Kita kada buwan</div>
        <div style="display:flex;align-items:center;gap:8px;background:var(--card2);border-radius:10px;padding:6px 10px">
          <button type="button" data-action="insights-chart-year-prev" style="all:unset;cursor:pointer;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px">‹</button>
          <div class="sg" style="font-weight:700;font-size:12.5px;min-width:34px;text-align:center">${ctx.overviewYear}</div>
          <button type="button" data-action="insights-chart-year-next" style="all:unset;cursor:pointer;width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px">›</button>
        </div>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:6px;height:150px;padding:0 2px">
        ${ctx.overviewBars.map(b => `
          <button type="button" data-action="insights-chart-month-select" data-month="${b.monthKey}" title="${esc(b.label)} ${ctx.overviewYear}: ${b.totalLabel}" style="all:unset;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;gap:8px;flex:1;height:100%;justify-content:flex-end;position:relative;cursor:pointer">
            ${b.isSelected ? `<div style="position:absolute;top:-4px;transform:translateY(-100%);background:oklch(0.4 0.13 150);color:oklch(1 0 0);font-size:10px;font-weight:700;padding:3px 7px;border-radius:20px;white-space:nowrap">${b.totalLabel}</div>` : ''}
            <div style="width:60%;height:${b.heightPx}px;border-radius:6px 6px 0 0;background:${b.fill};flex:none"></div>
            <div style="font-size:11px;font-weight:600;color:${b.isSelected ? 'oklch(0.4 0.13 150)' : 'oklch(0.5 0.015 150)'}">${b.label}</div>
          </button>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:14px">Kita vs gastos · ${esc(ctx.selMonthLabel)}</div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span style="color:oklch(0.42 0.015 150)">Revenue</span><span style="font-weight:700">${fmtMoney(ctx.selMonthRevenue)}</span></div>
          <div style="height:10px;background:oklch(0.91 0.012 150);border-radius:5px;overflow:hidden"><div style="height:100%;width:${Math.round((ctx.selMonthRevenue / ctx.selMonthChartMax) * 100)}%;background:oklch(0.55 0.12 175);border-radius:5px"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span style="color:oklch(0.42 0.015 150)">Expenses</span><span style="font-weight:700">${fmtMoney(ctx.selMonthExpenses)}</span></div>
          <div style="height:10px;background:oklch(0.91 0.012 150);border-radius:5px;overflow:hidden"><div style="height:100%;width:${Math.round((ctx.selMonthExpenses / ctx.selMonthChartMax) * 100)}%;background:oklch(0.62 0.17 45);border-radius:5px"></div></div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:14px;border-top:1px solid oklch(0 0 0 / 0.06)">
        <span style="font-size:12.5px;font-weight:600;color:oklch(0.42 0.015 150)">Net Profit</span>
        <span style="font-size:16px;font-weight:700;color:${ctx.selMonthNetProfit > 0 ? 'oklch(0.45 0.14 150)' : 'oklch(0.58 0.19 25)'}">${fmtMoney(ctx.selMonthNetProfit)}</span>
      </div>
      ${ctx.selMonthOutstanding > 0 ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px"><span style="color:oklch(0.5 0.015 150)">Outstanding (still to collect)</span><span style="font-weight:700;color:oklch(0.62 0.17 45)">${fmtMoney(ctx.selMonthOutstanding)}</span></div>` : ''}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:16px">
      <div class="card">
        <div class="card-title" style="margin-bottom:14px">Top clients · ${esc(ctx.selMonthLabel)}</div>
        ${ctx.topClients.length === 0 ? `<div style="font-size:13px;color:oklch(0.55 0.015 150)">No payments collected this month.</div>` : `
        <div style="display:flex;flex-direction:column;gap:12px">
          ${ctx.topClients.map((c, i) => `
            <div style="display:flex;align-items:center;gap:12px">
              <div style="width:22px;height:22px;border-radius:50%;background:oklch(0.92 0.06 150);color:oklch(0.4 0.13 150);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex:none">${i + 1}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.name)}</div>
                <div style="font-size:11.5px;color:oklch(0.5 0.015 150)">${c.shootsLabel}</div>
              </div>
              <div style="font-size:13.5px;font-weight:700;flex:none">${c.totalLabel}</div>

            </div>`).join('')}
        </div>`}
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px">
      ${ctx.insightCards.map(ic => {
        const inner = ic.bars ? `
          <div style="display:flex;flex-direction:column;gap:14px">
            ${ic.bars.map(b => `
              <div>
                <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px"><span style="color:oklch(0.42 0.015 150)">${esc(b.label)}</span><span style="font-weight:700">${b.percent}%</span></div>
                <div style="height:10px;background:oklch(0.91 0.012 150);border-radius:5px;overflow:hidden"><div style="height:100%;width:${Math.min(100, b.percent)}%;background:oklch(0.55 0.14 150);border-radius:5px"></div></div>
                <div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:4px">${esc(b.sub)}</div>
              </div>`).join('')}
          </div>` : `<div style="font-size:13.5px;line-height:1.6;color:oklch(0.32 0.015 150)">${esc(ic.text)}</div>`;
        const header = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px"><div class="sg" style="font-weight:700;font-size:15px">${esc(ic.title)}</div></div>`;
        return ic.clickKey
          ? `<button type="button" data-action="chip-open" data-key="${ic.clickKey}" style="all:unset;cursor:pointer;box-sizing:border-box;display:block;width:100%;text-align:left;background:var(--panel);border:1px solid var(--border);border-radius:16px;padding:22px">${header}${inner}</button>`
          : `<div class="card">${header}${inner}</div>`;
      }).join('')}
    </div>`;
  }

  /* ---------------- goals ---------------- */

  function viewGoals(ctx) {
    const filtered = ctx.goalCards.filter(g => g.name.toLowerCase().includes(state.goalsSearch.toLowerCase()));
    const searchClear = state.goalsSearch ? `<button type="button" class="search-clear" data-action="search-clear" data-field="goalsSearch">✕</button>` : '';
    return `
    <div class="page-head">
      <div><div class="page-title sg">Goals</div><div class="page-sub">Savings and investment targets</div></div>
      <button type="button" class="btn-primary" data-action="goal-add-open">+ Add Goal</button>
    </div>
    <div class="search-wrap">
      <input type="text" value="${esc(state.goalsSearch)}" data-bind="goalsSearch" placeholder="Search goals..."/>
      ${searchClear}
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">
      ${filtered.map(g => `
        <div class="card" style="padding:20px;cursor:pointer" data-action="goal-edit" data-id="${esc(g.id)}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:34px;height:34px;border-radius:10px;background:oklch(0.92 0.06 150);display:flex;align-items:center;justify-content:center;font-size:16px;flex:none">${g.icon}</div>
              <div style="font-weight:700;font-size:14.5px">${esc(g.name)}</div>
            </div>
            <div style="font-size:12px;font-weight:700;color:oklch(0.55 0.12 175)">${g.percent}%</div>
          </div>
          ${progressBar(g.percent)}
          <div style="display:flex;justify-content:space-between;font-size:12.5px;color:oklch(0.45 0.015 150);margin-top:10px"><span>${g.currentLabel} saved</span><span>${g.targetLabel} goal</span></div>
          <button type="button" data-action="goal-fund-open" data-id="${esc(g.id)}" style="all:unset;cursor:pointer;display:block;width:100%;box-sizing:border-box;text-align:center;margin-top:12px;padding:8px;border-radius:8px;background:oklch(0.92 0.06 150);color:oklch(0.45 0.14 150);font-size:12.5px;font-weight:700">+ Add / Withdraw Fund</button>
        </div>`).join('')}
    </div>`;
  }

  /* ---------------- modals ---------------- */

  function modalShoot() {
    if (!state.modal) return '';
    const d = state.draft;
    const isEdit = state.modal.mode === 'edit';
    const isRealEstate = d.shootType === 'Real Estate';
    const isGeneral = !isRealEstate;
    const isForeign = isGeneral && (d.currency === 'USD');
    const showLoc = isRealEstate || state.shootLocOpen || (isGeneral && !!(d.location || '').trim());
    // For "Edit only" General Projects (usually several reels/edits for one client), the venue
    // makes no sense — instead we list the individual projects/deliverables, which become the
    // invoice line items when billing.
    const isEditOnly = isGeneral && (d.serviceType === 'edit');
    const projectItems = Array.isArray(d.projectItems) ? d.projectItems : [];
    const liveTiers = getLiveTiers();
    const isCustomPackage = isRealEstate && (d.packageTier || 'custom') === 'custom';
    const isScriptedShootType = isRealEstate && d.packageTier !== 'basic' && d.packageTier !== 'standard';
    const draftPackageAmount = (!isRealEstate || (d.packageTier || 'custom') === 'custom')
      ? (Number(d.package) || 0)
      : ((liveTiers.find(t => t.value === d.packageTier) || {}).price || 0);
    const draftAddons = d.addons || {};
    const addonsTotal = addonDefs().reduce((sum, ad) => sum + (draftAddons[ad.key] || 0) * ad.price, 0);
    const draftGrandTotal = draftPackageAmount + addonsTotal;
    const hasAddons = addonsTotal > 0;
    const draftPaidAmount = Number(d.paid) || 0;
    const draftUsdCharged = Number(d.usdCharged) || 0;
    const usdRateIsLive = !!(state.usdRate && state.usdRate > 0);
    const liveUsdRate = usdRateIsLive ? state.usdRate : USD_TO_PHP;
    const draftForeignEstPhp = Math.round(draftUsdCharged * liveUsdRate);
    const showPaymentTerms = isRealEstate && draftGrandTotal > 0;
    const showSimpleTotal = !isRealEstate && draftGrandTotal > 0;
    const draftGrandTotalLabel = fmtMoney(draftGrandTotal);
    const draftBalanceLabel = fmtMoney(Math.max(draftGrandTotal - draftPaidAmount, 0));

    const msDefs = milestoneDefs().map(m => ({ ...m, portion: draftGrandTotal * (m.weight / 100), target: draftGrandTotal * m.cumulative }));
    const paymentMilestones = msDefs.map(m => {
      const covered = draftPaidAmount >= m.target;
      return {
        ...m,
        mark: covered ? '✓' : '',
        barColor: covered ? 'oklch(0.45 0.14 150)' : 'oklch(0.88 0.012 150)',
        labelColor: covered ? 'oklch(0.45 0.14 150)' : 'oklch(0.55 0.015 150)',
        chipBg: covered ? 'oklch(0.92 0.06 150)' : 'oklch(1 0 0)',
        chipBorder: covered ? 'oklch(0.45 0.14 150 / 0.3)' : 'oklch(0 0 0 / 0.08)',
        amountLabel: fmtMoney(m.portion),
      };
    });

    const shootTypePills = [
      { value: 'Real Estate', label: 'Package', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/></svg>' },
      { value: 'General Project', label: 'Custom Project', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:3px"><rect x="2.5" y="6" width="13.5" height="12" rx="2"/><path d="M16 10l5.5-3v10L16 14z"/></svg>' },
    ].map(tp => {
      const active = d.shootType === tp.value;
      const accent = tp.value === 'Real Estate' ? { color: 'oklch(0.5 0.16 235)', bg: 'oklch(0.55 0.15 240 / 0.16)' } : { color: 'oklch(0.45 0.14 150)', bg: 'oklch(0.5 0.13 150 / 0.14)' };
      return { ...tp, bg: active ? accent.bg : 'oklch(0.97 0.006 150)', color: active ? accent.color : 'oklch(0.5 0.015 150)', border: active ? accent.color : 'oklch(0 0 0 / 0.08)' };
    });

    // Edit-only projects start straight at editing; Shoot+Edit projects have a shoot to do
    // first, so they get a pre-shoot stage ("To Shoot", plus Tentative if not yet confirmed).
    const GP_STATUS_LABELS = isEditOnly
      ? { idea: 'To Edit', shot: 'Editing', approval: 'For Approval', posted: 'Completed' }
      : { tentative: 'Tentative', idea: 'To Shoot', shot: 'Editing', approval: 'For Approval', posted: 'Completed' };
    const GP_STATUS_VALUES = isEditOnly ? ['idea','shot','approval','posted'] : ['tentative','idea','shot','approval','posted'];
    const statusOptions = isGeneral
      ? STATUS_META.filter(sm => GP_STATUS_VALUES.includes(sm.value)).map(sm => ({ ...sm, label: GP_STATUS_LABELS[sm.value] || sm.label }))
      : (isEdit ? STATUS_META : STATUS_META.filter(sm => sm.value === 'tentative' || sm.value === 'idea'));

    const shootDateDisplayLabel = d.date ? new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Select date';
    const pickerMonthLabel = new Date(state.shootDateCalYear, state.shootDateCalMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const pickerCells = buildCalendarCells(state.shootDateCalYear, state.shootDateCalMonth, state.shoots, d.date);
    const deadlineDisplayLabel = d.deadline ? new Date(d.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No deadline set';
    const deadlinePickerMonthLabel = new Date(state.shootDeadlineCalYear, state.shootDeadlineCalMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const deadlinePickerCells = buildCalendarCells(state.shootDeadlineCalYear, state.shootDeadlineCalMonth, [], d.deadline);
    const timeDisplayLabel = fmtTime(d.time || '09:00');
    const [curHH, curMM] = (d.time || '09:00').split(':').map(Number);
    const curHour12 = curHH % 12 === 0 ? 12 : curHH % 12;
    const curMeridiem = curHH >= 12 ? 'PM' : 'AM';

    return `
    <div class="modal-backdrop" data-action="modal-backdrop-close" data-which="shoot">
      <form class="modal-box" style="width:460px" data-stop data-action="save-shoot">
        <div class="modal-head"><div class="modal-title">${isEdit ? 'Edit Shoot' : 'New Shoot'}</div><button type="button" class="modal-close" data-action="modal-close" data-which="shoot">✕</button></div>
        <div style="display:flex;gap:8px;margin-bottom:16px">
          ${shootTypePills.map(tp => `<button type="button" data-action="shoot-type-pick" data-type="${esc(tp.value)}" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:10px 8px;border-radius:10px;font-weight:700;font-size:13px;background:${tp.bg};color:${tp.color};border:1px solid ${tp.border}">${tp.icon} ${esc(tp.label)}</button>`).join('')}
        </div>
        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:oklch(0.5 0.015 150);margin-bottom:6px;padding-left:2px">Service</div>
          <div style="display:flex;gap:8px">
            ${[{v:'shoot',l:'Shoot + Edit'},{v:'edit',l:'Edit only'}].map(sv => { const active=(d.serviceType||'shoot')===sv.v; const ac = sv.v==='edit' ? {c:'#33503c',bg:'#e6ece8',br:'#41644A'} : {c:'oklch(0.45 0.14 150)',bg:'oklch(0.5 0.13 150 / 0.14)',br:'oklch(0.45 0.14 150)'}; return `<button type="button" data-action="shoot-service-pick" data-service="${sv.v}" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:9px 8px;border-radius:10px;font-weight:700;font-size:13px;background:${active?ac.bg:'oklch(0.97 0.006 150)'};color:${active?ac.c:'oklch(0.5 0.015 150)'};border:1px solid ${active?ac.br:'oklch(0 0 0 / 0.08)'}">${sv.l}</button>`; }).join('')}
          </div>
        </div>
        ${isGeneral ? `
        <div style="margin-bottom:16px">
          <div style="font-size:11px;font-weight:700;color:oklch(0.5 0.015 150);margin-bottom:6px;padding-left:2px">Client</div>
          <div style="display:flex;gap:8px">
            ${[{v:'PHP',l:'₱ Local'},{v:'USD',l:'$ Foreign'}].map(cu => { const active=(d.currency||'PHP')===cu.v; return `<button type="button" data-action="shoot-currency-pick" data-currency="${cu.v}" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:9px 8px;border-radius:10px;font-weight:700;font-size:13px;background:${active?'oklch(0.5 0.13 150 / 0.14)':'oklch(0.97 0.006 150)'};color:${active?'oklch(0.45 0.14 150)':'oklch(0.5 0.015 150)'};border:1px solid ${active?'oklch(0.45 0.14 150)':'oklch(0 0 0 / 0.08)'}">${cu.l}</button>`; }).join('')}
          </div>
        </div>` : ''}
        <div class="modal-fields">
          <div class="field"><label>Client / Project</label><input type="text" value="${esc(d.client)}" data-bind="draft.client" data-fmt="autocomplete" placeholder="e.g. Globe Telecom Anthem" required autocomplete="off"/>
          </div>
          ${projectTypes().length ? `<div class="field"><label>Klase ng project</label><select data-bind="draft.projectType"><option value="">Pumili</option>${projectTypes().concat(d.projectType && !projectTypes().includes(d.projectType) ? [d.projectType] : []).map(t => `<option value="${esc(t)}" ${d.projectType === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>` : ''}
          ${isEditOnly ? `
          <div class="field"><label>Projects / Deliverables</label>
            ${projectItems.length ? projectItems.map((p, i) => `
            <div style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
              <input type="text" value="${esc(p)}" data-proj-idx="${i}" placeholder="e.g. Reel #${i + 1}" style="flex:1"/>
              <button type="button" data-action="shoot-project-remove" data-idx="${i}" style="all:unset;cursor:pointer;flex:none;width:34px;height:34px;border-radius:8px;background:oklch(0.95 0.02 25);color:oklch(0.5 0.18 25);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">✕</button>
            </div>`).join('') : `<div style="font-size:12px;color:oklch(0.5 0.015 150);margin-bottom:8px">No projects yet, add one below. These become the invoice line items.</div>`}
            <button type="button" data-action="shoot-project-add" style="all:unset;cursor:pointer;display:block;text-align:center;box-sizing:border-box;width:100%;padding:9px;border-radius:9px;border:1.5px dashed oklch(0.5 0.13 150);background:oklch(0.97 0.02 150);color:oklch(0.4 0.13 150);font-size:12.5px;font-weight:700">＋ Add project</button>
          </div>` : (showLoc ? `<div class="field"><label>Location / Venue</label><input type="text" value="${esc(d.location)}" data-bind="draft.location" placeholder="e.g. BGC Studio"/></div>` : `<div class="field" style="margin-bottom:4px"><span data-action="shoot-loc-toggle" style="cursor:pointer;font-size:12.5px;font-weight:600;color:oklch(0.45 0.14 150);text-decoration:underline">+ Add location</span></div>`)}
          ${isEditOnly ? `<div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-bottom:2px">Date: <b style="color:oklch(0.32 0.02 150)">${shootDateDisplayLabel}</b>, set to the day you created this (no need to pick).</div>` : ''}
          <div class="row-2"${isEditOnly ? ' style="display:none"' : ''}>
            <div class="field" style="position:relative">
              <label>Date</label>
              ${state.draftDateLocked ? `
              <div style="width:100%;box-sizing:border-box;background:var(--card2);border:1px solid var(--border2);border-radius:9px;padding:10px 12px;color:oklch(0.4 0.02 150);font-size:14px;display:flex;align-items:center;justify-content:space-between">
                <span>${shootDateDisplayLabel}</span>
                <span data-action="shoot-date-unlock" style="cursor:pointer;font-size:11px;font-weight:600;color:oklch(0.45 0.14 150);text-decoration:underline">Change</span>
              </div>` : `
              <button type="button" data-action="date-picker-toggle" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:10px 12px;color:inherit;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between">
                <span>${shootDateDisplayLabel}</span>
              </button>`}
              ${!state.draftDateLocked && state.shootDatePickerOpen ? `
              <div data-picker-popover style="position:absolute;left:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:16px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:260px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                  <div class="sg" style="font-weight:700;font-size:15px">${pickerMonthLabel}</div>
                  <div style="display:flex;gap:6px">
                    <button type="button" data-action="shoot-date-cal-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
                    <button type="button" data-action="shoot-date-cal-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
                  </div>
                </div>
                <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
                  ${WEEKDAY_LABELS.map(w => `<div style="text-align:center;font-size:10.5px;font-weight:700;color:oklch(0.55 0.015 150)">${w}</div>`).join('')}
                </div>
                <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
                  ${pickerCells.map(c => c.blank ? `<div></div>` : `
                    <div data-action="date-picker-pick" data-date="${c.dateStr}" style="aspect-ratio:1;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;cursor:pointer;font-size:12.5px;font-weight:600;background:${c.bg};border:1px solid ${c.border};color:${c.textColor}">
                      <span>${c.dayNum}</span>
                      <span style="display:flex;gap:2px">${c.dots.map(color => `<span style="width:4px;height:4px;border-radius:50%;background:${color}"></span>`).join('')}</span>
                    </div>`).join('')}
                </div>
              </div>` : ''}
            </div>
            <div class="field" style="position:relative">
              <label>Time</label>
              <button type="button" data-action="time-picker-toggle" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:10px 12px;color:inherit;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between">
                <span>${timeDisplayLabel}</span>
              </button>
              ${state.timePickerOpen ? `
              <div data-picker-popover style="position:absolute;left:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:10px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:190px;display:flex;gap:6px">
                <div style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;flex:1">
                  ${Array.from({ length: 12 }, (_, i) => i + 1).map(h => `<button type="button" data-action="time-part-pick" data-part="hour" data-value="${h}" style="all:unset;cursor:pointer;text-align:center;padding:7px 0;border-radius:8px;font-weight:700;font-size:13px;background:${h === curHour12 ? 'oklch(0.45 0.14 150)' : 'transparent'};color:${h === curHour12 ? 'oklch(1 0 0)' : 'oklch(0.25 0.02 150)'}">${String(h).padStart(2, '0')}</button>`).join('')}
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;flex:1">
                  ${[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => `<button type="button" data-action="time-part-pick" data-part="minute" data-value="${m}" style="all:unset;cursor:pointer;text-align:center;padding:7px 0;border-radius:8px;font-weight:700;font-size:13px;background:${m === curMM ? 'oklch(0.45 0.14 150)' : 'transparent'};color:${m === curMM ? 'oklch(1 0 0)' : 'oklch(0.25 0.02 150)'}">${String(m).padStart(2, '0')}</button>`).join('')}
                </div>
                <div style="display:flex;flex-direction:column;gap:4px;flex:0.8">
                  ${['AM', 'PM'].map(mo => `<button type="button" data-action="time-part-pick" data-part="meridiem" data-value="${mo}" style="all:unset;cursor:pointer;text-align:center;padding:7px 0;border-radius:8px;font-weight:700;font-size:13px;background:${mo === curMeridiem ? 'oklch(0.45 0.14 150)' : 'transparent'};color:${mo === curMeridiem ? 'oklch(1 0 0)' : 'oklch(0.25 0.02 150)'}">${mo}</button>`).join('')}
                </div>
              </div>` : ''}
            </div>
          </div>
          <div class="field"><label>Status</label>
            <select data-bind="draft.status" data-special="shootStatus">${statusOptions.map(sm => `<option value="${sm.value}" ${d.status === sm.value ? 'selected' : ''}>${sm.label}</option>`).join('')}</select>
          </div>
          <div class="field" style="position:relative">
            <label>Deadline (edit / delivery)</label>
            <button type="button" data-action="deadline-picker-toggle" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid oklch(0.58 0.19 25 / 0.45);border-radius:9px;padding:10px 12px;color:inherit;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between">
              <span>${deadlineDisplayLabel}</span>
            </button>
            <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">Optional. Kapag may deadline, ito ang basehan ng "overdue" imbes na ang shoot date. ${d.deadline ? `<span data-action="deadline-clear" style="cursor:pointer;color:oklch(0.55 0.14 150);text-decoration:underline">Clear</span>` : ''}</div>
            ${state.shootDeadlinePickerOpen ? `
            <div data-picker-popover style="position:absolute;left:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:16px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:260px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
                <div class="sg" style="font-weight:700;font-size:15px">${deadlinePickerMonthLabel}</div>
                <div style="display:flex;gap:6px">
                  <button type="button" data-action="shoot-deadline-cal-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
                  <button type="button" data-action="shoot-deadline-cal-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px">
                ${WEEKDAY_LABELS.map(w => `<div style="text-align:center;font-size:10.5px;font-weight:700;color:oklch(0.55 0.015 150)">${w}</div>`).join('')}
              </div>
              <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
                ${deadlinePickerCells.map(c => c.blank ? `<div></div>` : `
                  <div data-action="deadline-picker-pick" data-date="${c.dateStr}" style="aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12.5px;font-weight:600;background:${c.bg};border:1px solid ${c.border};color:${c.textColor}">${c.dayNum}</div>`).join('')}
              </div>
            </div>` : ''}
          </div>
          <div class="row-2">
            ${isRealEstate ? `
            <div class="field"><label>Package</label>
              <select data-bind="draft.packageTier" data-special="packageTier">${liveTiers.map(t => `<option value="${t.value}" ${d.packageTier === t.value ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select>
            </div>` : isForeign ? `
            <div class="field"><label>Amount Charged ($)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.usdCharged))}" data-bind="draft.usdCharged" data-fmt="money" placeholder="0"/></div>` : `
            <div class="field"><label>Project Amount (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.package))}" data-bind="draft.package" data-fmt="money" placeholder="0"/></div>`}
            <div class="field"><label>${isForeign ? '₱ Received (actual)' : 'Amount Received (₱)'}</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.paid))}" data-bind="draft.paid" data-fmt="money" placeholder="0"/></div>
          </div>
          ${draftPaidAmount > 0 ? `
          <div style="margin-top:2px">
            ${dpField('Received on', 'draft.paidDate', d.paidDate || '', { align: 'left', placeholder: 'Same as shoot date' })}
            <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">When you received this payment, so it counts toward the right month's income. If left blank, the shoot date is used.</div>
          </div>` : ''}
          ${!isForeign && draftGrandTotal > 0 ? `
          <div style="margin:-2px 0 2px">
            ${draftGrandTotal - draftPaidAmount > 0
              ? `<button type="button" data-action="shoot-milestone-pick" data-amount="${Math.round(draftGrandTotal)}" style="all:unset;cursor:pointer;display:block;text-align:center;box-sizing:border-box;width:100%;padding:9px;border-radius:9px;border:1.5px solid oklch(0.5 0.13 150);background:oklch(0.95 0.03 150);color:oklch(0.32 0.13 150);font-size:12.5px;font-weight:700">✓ Mark as fully paid, sets received to ${draftGrandTotalLabel}</button>`
              : `<div style="display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;width:100%;padding:9px;border-radius:9px;background:oklch(0.92 0.06 150);color:oklch(0.34 0.13 150);font-size:12.5px;font-weight:700">✓ Fully paid, no balance <button type="button" data-action="shoot-milestone-pick" data-amount="0" style="all:unset;cursor:pointer;font-size:11px;font-weight:600;color:oklch(0.5 0.015 150);text-decoration:underline">undo</button></div>`}
          </div>` : ''}
          ${isForeign && draftUsdCharged > 0 ? `
          <div style="margin:-2px 0 2px">
            ${draftPaidAmount >= draftForeignEstPhp && draftForeignEstPhp > 0
              ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;width:100%;padding:9px;border-radius:9px;background:oklch(0.92 0.06 150);color:oklch(0.34 0.13 150);font-size:12.5px;font-weight:700">✓ Marked as received <button type="button" data-action="shoot-milestone-pick" data-amount="0" style="all:unset;cursor:pointer;font-size:11px;font-weight:600;color:oklch(0.5 0.015 150);text-decoration:underline">undo</button></div>`
              : `<button type="button" data-action="shoot-milestone-pick" data-amount="${draftForeignEstPhp}" style="all:unset;cursor:pointer;display:block;text-align:center;box-sizing:border-box;width:100%;padding:9px;border-radius:9px;border:1.5px solid oklch(0.5 0.13 150);background:oklch(0.95 0.03 150);color:oklch(0.32 0.13 150);font-size:12.5px;font-weight:700">✓ Fill ₱ Received ≈ ${fmtMoney(draftForeignEstPhp)} (from $${draftUsdCharged.toLocaleString('en-US')}), edit to actual</button>`}
          </div>
          <div style="font-size:11px;color:oklch(0.5 0.015 150);margin:-1px 0 4px 2px;line-height:1.4">${usdRateIsLive ? `Live mid market ₱${liveUsdRate.toFixed(2)}/$1${state.usdRateDate ? ` · ${state.usdRateDate}` : ''}` : `Est. ₱${USD_TO_PHP}/$1 (offline)`}, estimate only, replace with the exact amount you received.</div>` : ''}
          ${isForeign ? `<div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin:-4px 0 4px 2px;line-height:1.45">In Finances, your <b style="color:oklch(0.3 0.02 150)">₱ Received</b> counts toward the totals. The <b style="color:oklch(0.3 0.02 150)">$</b> is kept as a record only.</div>` : ''}
          ${isCustomPackage ? `<div class="field"><label>Custom Package Amount (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.package))}" data-bind="draft.package" data-fmt="money" placeholder="0"/></div>` : ''}
          ${isRealEstate ? `
          <div style="background:var(--card2);border:1px solid var(--border3);border-radius:12px;padding:14px 16px">
            <button type="button" data-action="shoot-addons-toggle" style="all:unset;cursor:pointer;display:flex;align-items:center;justify-content:space-between;width:100%">
              <span style="font-size:12.5px;font-weight:700;color:oklch(0.25 0.02 150)">Add ons ${(!state.shootAddonsOpen && hasAddons) ? `· ${addonsTotal.toLocaleString('en-US')} added` : '(optional)'}</span>
              <span style="font-size:12px;color:oklch(0.5 0.015 150)">${state.shootAddonsOpen ? '▾' : '▸'}</span>
            </button>
            ${state.shootAddonsOpen ? `
            <div style="display:flex;flex-direction:column;gap:10px;margin-top:12px">
              ${addonDefs().map(ad => {
                const qty = draftAddons[ad.key] || 0;
                const subtotalLabel = qty > 0 ? fmtMoney(qty * ad.price) : '';
                const subtotalColor = qty > 0 ? 'oklch(0.4 0.13 150)' : 'oklch(0.6 0.015 150)';
                const counterControls = ad.flat ? `
                  <button type="button" data-action="shoot-addon-toggle" data-key="${ad.key}" style="all:unset;cursor:pointer;padding:6px 14px;border-radius:7px;font-weight:700;font-size:12.5px;background:${qty > 0 ? 'oklch(0.92 0.06 150)' : 'oklch(0.91 0.012 150)'};color:${qty > 0 ? 'oklch(0.4 0.13 150)' : 'oklch(0.4 0.02 150)'}">${qty > 0 ? 'Added ✓' : 'Add'}</button>
                ` : `
                  <button type="button" data-action="shoot-addon-dec" data-key="${ad.key}" style="all:unset;cursor:pointer;width:26px;height:26px;border-radius:7px;background:oklch(0.91 0.012 150);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:oklch(0.35 0.02 150)">−</button>
                  <div style="width:22px;text-align:center;font-weight:700;font-size:13.5px">${qty}</div>
                  <button type="button" data-action="shoot-addon-inc" data-key="${ad.key}" style="all:unset;cursor:pointer;width:26px;height:26px;border-radius:7px;background:oklch(0.92 0.06 150);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:oklch(0.4 0.13 150)">+</button>
                `;
                return `
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:600;color:oklch(0.25 0.02 150)">${esc(ad.label)}</div>
                    <div style="font-size:11.5px;color:oklch(0.5 0.015 150)">₱${ad.price.toLocaleString('en-US')} ${esc(ad.unitLabel)}</div>
                  </div>
                  ${counterControls}
                  <div style="width:70px;text-align:right;font-size:13px;font-weight:700;color:${subtotalColor}">${subtotalLabel}</div>
                </div>`;
              }).join('')}
            </div>
            ${hasAddons ? `
            <div style="display:flex;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px solid var(--border3)">
              <div style="font-size:12.5px;color:oklch(0.5 0.015 150)">Add ons Subtotal</div>
              <div style="font-size:13px;font-weight:700;color:oklch(0.4 0.13 150)">${fmtMoney(addonsTotal)}</div>
            </div>` : ''}
            ` : ''}
          </div>` : ''}
          ${showPaymentTerms ? `
          <div style="background:var(--card2);border:1px solid var(--border3);border-radius:12px;padding:16px">
            <div style="font-size:12.5px;font-weight:700;color:oklch(0.25 0.02 150);margin-bottom:12px">Payment Terms</div>
            <div style="display:flex;gap:3px;height:8px;border-radius:5px;overflow:hidden;margin-bottom:12px">
              ${paymentMilestones.map(pm => `<div style="flex:${pm.weight};background:${pm.barColor};border-radius:5px"></div>`).join('')}
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
              ${paymentMilestones.map(pm => `
              <div data-action="shoot-milestone-pick" data-amount="${Math.round(pm.target)}" style="text-align:center;cursor:pointer;background:${pm.chipBg};border:1px solid ${pm.chipBorder};border-radius:9px;padding:8px 4px">
                <div style="font-size:10.5px;font-weight:700;color:${pm.labelColor};margin-bottom:2px">${pm.shortLabel} ${pm.mark}</div>
                <div style="font-size:12.5px;font-weight:700;color:oklch(0.25 0.02 150)">${pm.amountLabel}</div>
              </div>`).join('')}
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--border3)">
              <div style="font-size:12.5px;color:oklch(0.5 0.015 150)">Total (${draftGrandTotalLabel}) · Remaining Balance</div>
              <div style="font-size:15px;font-weight:800;color:oklch(0.62 0.17 45)">${draftBalanceLabel}</div>
            </div>
          </div>` : ''}
          ${showSimpleTotal ? `
          <div style="background:var(--card2);border:1px solid var(--border3);border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-size:11.5px;color:oklch(0.5 0.015 150)">Total Project Amount</div>
              <div style="font-size:15px;font-weight:800;color:oklch(0.25 0.02 150)">${draftGrandTotalLabel}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11.5px;color:oklch(0.5 0.015 150)">Remaining Balance</div>
              <div style="font-size:15px;font-weight:800;color:oklch(0.62 0.17 45)">${draftBalanceLabel}</div>
            </div>
          </div>` : ''}
          ${isRealEstate && isScriptedShootType ? `
          <div class="field"><label>Script Status</label>
            <select data-bind="draft.scriptStatus">${Object.keys(SCRIPT_STATUS_META).map(v => `<option value="${v}" ${d.scriptStatus === v ? 'selected' : ''}>${v}</option>`).join('')}</select>
          </div>` : ''}
          ${isRealEstate && !isScriptedShootType ? `<div style="background:oklch(0.92 0.06 150 / 0.4);border-radius:9px;padding:10px 12px;font-size:12.5px;color:oklch(0.4 0.13 150)">Script is provided by the client for this package tier.</div>` : ''}
          <div class="field"><input type="text" value="${esc(d.notes)}" data-bind="draft.notes" placeholder="Notes (optional)"/></div>
          ${isEdit ? `
          <div style="border-top:1px solid var(--border3);margin-top:6px;padding-top:14px">
            <button type="button" data-action="shoot-create-billing" style="all:unset;cursor:pointer;display:block;text-align:center;box-sizing:border-box;width:100%;padding:11px;border-radius:10px;border:1.5px solid oklch(0.5 0.13 150);background:oklch(0.95 0.03 150);color:oklch(0.32 0.13 150);font-size:13px;font-weight:700">Create ${isForeign ? 'Invoice' : 'Statement of Account'} from this shoot</button>
            <div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:5px;text-align:center;line-height:1.45">Pulls in the client and details, add the due date and QR in Documents.</div>
          </div>` : ''}
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn-danger" data-action="shoot-delete">Delete</button>` : ''}
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">${isEdit ? 'Save Changes' : 'Add Shoot'}</button>
        </div>
      </form>
    </div>`;
  }

  function modalShootConfirmClose() {
    if (!state.shootConfirmCloseOpen) return '';
    return `
    <div class="modal-backdrop chip" style="z-index:70">
      <div class="modal-box" style="width:340px;padding:24px">
        <div class="modal-title" style="margin-bottom:8px">Discard this shoot?</div>
        <div style="font-size:13.5px;color:oklch(0.48 0.015 150);margin-bottom:20px;line-height:1.5">Are you sure you want to close this? Any details you've entered will be lost.</div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" style="all:unset;cursor:pointer;padding:9px 16px;border-radius:9px;background:var(--card2);color:oklch(0.35 0.02 150);font-weight:600;font-size:13px" data-action="shoot-confirm-close-cancel">Cancel</button>
          <button type="button" style="all:unset;cursor:pointer;padding:9px 16px;border-radius:9px;background:oklch(0.58 0.19 25);color:oklch(1 0 0);font-weight:700;font-size:13px" data-action="shoot-confirm-close-confirm">Yes, close</button>
        </div>
      </div>
    </div>`;
  }

  function modalFinanceBreakdown() {
    const key = state.financeBreakdown;
    if (!key) return '';
    const mKey = state.financeMonthKey || THIS_MONTH_KEY;
    const mLabel = new Date(mKey + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthShoots = state.shoots.filter(s => s.date && s.date.slice(0, 7) === mKey);
    const ftMonth = state.fullTimeIncome.filter(f => f.date && f.date.slice(0, 7) === mKey);
    let title = '', rows = [], totalLabel = '';
    if (key === 'remaining') {
      title = 'Remaining Balance · ' + mLabel; totalLabel = 'Total remaining';
      rows = monthShoots.filter(s => s.status !== 'tentative').map(s => ({ label: s.client || 'Untitled', sub: s.location || '', amount: Math.max((Number(s.package) || 0) - shootPaidTotal(s), 0) })).filter(x => x.amount > 0);
    } else if (key === 'sidehustle') {
      title = 'Raket Collected · ' + mLabel; totalLabel = 'Total collected';
      const rowsSH = [];
      state.shoots.forEach(s => {
        const ps = shootPaymentsOf(s).filter(p => (p.date || '').slice(0, 7) === mKey);
        if (ps.length) ps.forEach(p => rowsSH.push({ label: (s.client || 'Untitled') + (p.label ? ' · ' + p.label : ''), sub: fmtDate(p.date), amount: Number(p.amount) || 0 }));
        else if (shootPaymentsOf(s).length === 0 && ((s.paidDate || s.date) || '').slice(0, 7) === mKey && (Number(s.paid) || 0) > 0) rowsSH.push({ label: s.client || 'Untitled', sub: fmtDate(s.paidDate || s.date), amount: Number(s.paid) || 0 });
      });
      rows = rowsSH;
    } else if (key === 'package') {
      title = 'Total Package Value · ' + mLabel; totalLabel = 'Total package value';
      rows = monthShoots.map(s => ({ label: s.client || 'Untitled', sub: fmtDate(s.date), amount: Number(s.package) || 0 })).filter(x => x.amount > 0);
    } else if (key === 'fulltime') {
      title = 'Full Time Income · ' + mLabel; totalLabel = 'Total full time';
      rows = ftMonth.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(f => ({ label: f.source || 'Full Time', sub: fmtDate(f.date), amount: Number(f.amount) || 0 }));
    } else if (key === 'fulltime-all') {
      title = 'All Full Time Income'; totalLabel = 'Total (all time)';
      rows = state.fullTimeIncome.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(f => ({ label: f.source || 'Full Time', sub: fmtDate(f.date), amount: Number(f.amount) || 0 }));
    } else if (key === 'combined') {
      title = 'Combined Income · ' + mLabel; totalLabel = 'Combined total';
      const ft = ftMonth.map(f => ({ label: f.source || 'Full Time', sub: 'Full Time · ' + fmtDate(f.date), amount: Number(f.amount) || 0, date: f.date }));
      const sh = [];
      state.shoots.forEach(s => {
        const ps = shootPaymentsOf(s).filter(p => (p.date || '').slice(0, 7) === mKey);
        if (ps.length) ps.forEach(p => sh.push({ label: (s.client || 'Shoot') + (p.label ? ' · ' + p.label : ''), sub: 'Raket · ' + fmtDate(p.date), amount: Number(p.amount) || 0, date: p.date }));
        else if (shootPaymentsOf(s).length === 0 && ((s.paidDate || s.date) || '').slice(0, 7) === mKey && (Number(s.paid) || 0) > 0) { const pd = s.paidDate || s.date; sh.push({ label: s.client || 'Shoot', sub: 'Raket · ' + fmtDate(pd), amount: Number(s.paid) || 0, date: pd }); }
      });
      rows = [...ft, ...sh].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }
    const total = rows.reduce((a, b) => a + b.amount, 0);
    const body = rows.length ? rows.map(r => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border2)">
        <div style="min-width:0"><div style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.label)}</div>${r.sub ? `<div style="color:oklch(0.5 0.015 150);font-size:11.5px;margin-top:2px">${esc(r.sub)}</div>` : ''}</div>
        <div style="font-weight:700;font-size:13.5px;white-space:nowrap">${fmtMoney(r.amount)}</div>
      </div>`).join('') : `<div style="padding:18px 0;color:oklch(0.55 0.015 150);font-size:13px">Nothing to show here.</div>`;
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="financebreakdown">
      <div class="modal-box" style="width:420px" data-stop>
        <div class="modal-head"><div class="modal-title">${esc(title)}</div><button type="button" class="modal-close" data-action="modal-close" data-which="financebreakdown">✕</button></div>
        <div style="max-height:52vh;overflow-y:auto">${body}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:14px;border-top:2px solid var(--border3)"><div style="font-weight:700;font-size:13px;color:oklch(0.45 0.015 150)">${esc(totalLabel)}</div><div class="sg" style="font-weight:700;font-size:18px">${fmtMoney(total)}</div></div>
      </div>
    </div>`;
  }

  /* ---------------- shared export range (used by income + expenses) ---------------- */

  function pad2(n) { return String(n).padStart(2, '0'); }
  function fmtDateStr(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  // Default custom window: start of the current month to today.
  function defaultCustomFrom() { return new Date(TODAY.getFullYear(), TODAY.getMonth(), 1).toISOString().slice(0, 7) + '-01'; }

  // Turn a range key into concrete start/end date strings + a human label. Shared so Income
  // and Expenses behave identically. Rolling presets end today; This/Last Year and Custom
  // use real calendar boundaries.
  function resolveExportRange(rangeKey) {
    const Y = TODAY.getFullYear();
    if (rangeKey === 'custom') {
      const c = state.exportCustom || {};
      let s = c.from || defaultCustomFrom();
      let e = c.to || TODAY_STR;
      if (s > e) { const t = s; s = e; e = t; }
      return { startStr: s, endStr: e, rangeLabel: 'Custom (' + s + ' to ' + e + ')' };
    }
    if (rangeKey === 'thisyear') return { startStr: Y + '-01-01', endStr: TODAY_STR, rangeLabel: 'This Year' };
    if (rangeKey === 'lastyear') return { startStr: (Y - 1) + '-01-01', endStr: (Y - 1) + '-12-31', rangeLabel: 'Last Year' };
    const months = { '1m': 1, '3m': 3, '6m': 6, '1y': 12 }[rangeKey] || 3;
    // Anchor to the 1st of the month N months back so a 29-31 "today" can't overflow
    // a shorter month (e.g. Feb) and drift the start boundary a few days.
    const start = new Date(Y, TODAY.getMonth() - months, 1);
    const rangeLabel = { '1m': 'Last Month', '3m': 'Last 3 Months', '6m': 'Last 6 Months', '1y': 'Last 1 Year' }[rangeKey] || 'Last 3 Months';
    return { startStr: fmtDateStr(start), endStr: TODAY_STR, rangeLabel };
  }

  // The range-picker grid + custom From/To fields, shared by both export modals.
  // prefix is 'finance' or 'expense' so the range buttons fire the right action.
  function exportRangeControls(rk, prefix) {
    const ranges = [['1m', 'Last Month'], ['3m', 'Last 3 Months'], ['6m', 'Last 6 Months'], ['1y', 'Last 1 Year'], ['thisyear', 'This Year'], ['lastyear', 'Last Year']];
    const btn = (k, l, wide) => { const a = rk === k; return `<button type="button" data-action="${prefix}-export-range" data-range="${k}" style="all:unset;cursor:pointer;text-align:center;padding:10px 6px;border-radius:10px;font-weight:700;font-size:12px;${wide ? 'grid-column:span 3;' : ''}background:${a ? 'oklch(0.5 0.13 150 / 0.14)' : 'oklch(0.97 0.006 150)'};color:${a ? 'oklch(0.42 0.13 150)' : 'oklch(0.5 0.015 150)'};border:1px solid ${a ? 'oklch(0.45 0.14 150)' : 'oklch(0 0 0 / 0.08)'}">${l}</button>`; };
    let html = `<div style="font-size:12px;color:oklch(0.48 0.015 150);font-weight:600;margin-bottom:8px">Time range</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:${rk === 'custom' ? '12px' : '18px'}">
        ${ranges.map(([k, l]) => btn(k, l, false)).join('')}
        ${btn('custom', 'Custom range', true)}
      </div>`;
    if (rk === 'custom') {
      const c = state.exportCustom || {};
      html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">
        ${dpField('From', 'exportCustom.from', c.from || '', { align: 'left' })}
        ${dpField('To', 'exportCustom.to', c.to || '', { align: 'right' })}
      </div>`;
    }
    return html;
  }

  /* ---------------- income export (CSV / PDF) ---------------- */

  function financeExportData(rangeKey) {
    const { startStr, endStr, rangeLabel } = resolveExportRange(rangeKey);
    const inRange = ds => ds && ds >= startStr && ds <= endStr;
    const ft = state.fullTimeIncome.filter(f => inRange(f.date)).map(f => ({ date: f.date, type: 'Full Time', label: f.source || 'Full Time Income', amount: Number(f.amount) || 0 }));
    const sh = state.shoots.flatMap(s => {
      const ps = shootPaymentsOf(s).filter(p => inRange(p.date));
      if (ps.length) return ps.map(p => ({ date: p.date, type: 'Raket', label: (s.client || 'Shoot') + (p.label ? ' · ' + p.label : ''), amount: Number(p.amount) || 0 }));
      if (shootPaymentsOf(s).length === 0 && (Number(s.paid) || 0) > 0) { const pd = s.paidDate || s.date; if (inRange(pd)) return [{ date: pd, type: 'Raket', label: s.client || 'Shoot', amount: Number(s.paid) || 0 }]; }
      return [];
    });
    const rows = [...ft, ...sh].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const total = rows.reduce((a, b) => a + b.amount, 0);
    return { rows, total, rangeLabel, startStr, endStr };
  }

  function buildBackupFile() {
    const data = {};
    PERSIST_KEYS.forEach(k => { data[k] = state[k]; });
    const payload = { app: 'eksakto', version: 1, exportedAt: new Date().toISOString(), data };
    const name = `eksakto_backup_${fileSlug()}_${TODAY_STR}.json`;
    try { return new File([JSON.stringify(payload, null, 2)], name, { type: 'application/json' }); }
    catch (e) { const b = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); b.name = name; return b; }
  }
  function showToast(msg) {
    let el = document.getElementById('eks-toast');
    if (!el) { el = document.createElement('div'); el.id = 'eks-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.className = 'eks-toast show';
    clearTimeout(showToast._t); showToast._t = setTimeout(() => { el.className = 'eks-toast'; }, 4200);
  }
  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportIncomeCSV() {
    const { rows, total, rangeLabel, startStr, endStr } = financeExportData(state.financeExportRange);
    const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [];
    lines.push(bizName() + ' - Income Report');
    lines.push('Range,' + cell(rangeLabel + ' (' + startStr + ' to ' + endStr + ')'));
    lines.push('');
    lines.push(['Date', 'Type', 'Client / Source', 'Amount (PHP)'].join(','));
    rows.forEach(r => lines.push([cell(r.date), cell(r.type), cell(r.label), r.amount].join(',')));
    lines.push('');
    lines.push(['', '', 'Total', total].join(','));
    triggerDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), fileSlug() + '_income_' + state.financeExportRange + '-' + endStr + '.csv');
    setState({ financeExportOpen: false });
  }

  function exportIncomePDF() {
    const jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) { alert('PDF tool is still loading. Please try again in a moment.'); return; }
    const { jsPDF } = jspdf;
    const { rows, total, rangeLabel, startStr, endStr } = financeExportData(state.financeExportRange);
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const PAGE_W = 612, PAGE_H = 792, marginX = 56, rightX = PAGE_W - marginX;
    const money = n => 'PHP ' + (Number(n) || 0).toLocaleString('en-PH');
    let y = 64;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(31, 107, 64);
    doc.text('Income Report', marginX, y);
    y += 20; doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(110, 115, 110);
    doc.text(rangeLabel + ' · ' + startStr + ' to ' + endStr, marginX, y);
    y += 10; doc.setDrawColor(222, 228, 222); doc.line(marginX, y, rightX, y); y += 22;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(110, 115, 110);
    doc.text('DATE', marginX, y); doc.text('TYPE', marginX + 92, y); doc.text('CLIENT / SOURCE', marginX + 188, y); doc.text('AMOUNT', rightX, y, { align: 'right' });
    y += 6; doc.line(marginX, y, rightX, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 32, 30);
    if (!rows.length) { doc.setTextColor(150, 150, 150); doc.text('No income in this range.', marginX, y); y += 16; }
    rows.forEach(r => {
      if (y > PAGE_H - 90) { doc.addPage(); y = 64; }
      doc.setTextColor(30, 32, 30);
      doc.text(String(r.date || ''), marginX, y);
      doc.text(r.type, marginX + 92, y);
      const label = (doc.splitTextToSize(String(r.label || '').replace(/₱/g, 'PHP '), 175)[0]) || '';
      doc.text(label, marginX + 188, y);
      doc.text(money(r.amount), rightX, y, { align: 'right' });
      y += 16;
    });
    y += 6; doc.setDrawColor(222, 228, 222); doc.line(marginX, y, rightX, y); y += 22;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 32, 30);
    doc.text('Total Income', marginX, y); doc.text(money(total), rightX, y, { align: 'right' });
    doc.save(fileSlug() + '_income_' + state.financeExportRange + '-' + endStr + '.pdf');
    setState({ financeExportOpen: false });
  }

  function modalFinanceExport() {
    if (!state.financeExportOpen) return '';
    const rk = state.financeExportRange || '3m';
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="financeexport">
      <div class="modal-box" style="width:400px" data-stop>
        <div class="modal-head"><div class="modal-title">Export Income</div><button type="button" class="modal-close" data-action="modal-close" data-which="financeexport">✕</button></div>
        ${exportRangeControls(rk, 'finance')}
        <div style="display:flex;gap:10px">
          <button type="button" class="btn-primary" style="flex:1;justify-content:center;text-align:center" data-action="finance-export-csv">Download CSV</button>
          <button type="button" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:10px 16px;border-radius:9px;background:oklch(0.55 0.14 235 / 0.14);color:oklch(0.42 0.13 235);font-weight:700;font-size:13px;display:inline-flex;align-items:center;justify-content:center" data-action="finance-export-pdf">Download PDF</button>
        </div>
        <div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:12px;line-height:1.5">Income only (Full Time + Raket collected) for the selected range. Separate from expenses.</div>
      </div>
    </div>`;
  }

  /* ---------------- expenses export (CSV / PDF) ---------------- */

  function expenseExportData(rangeKey) {
    const { startStr, endStr, rangeLabel } = resolveExportRange(rangeKey);
    const inRange = ds => ds && ds >= startStr && ds <= endStr;
    const items = state.expenses.filter(e => inRange(e.date)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const total = items.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    return { items, total, rangeLabel, startStr, endStr };
  }

  function exportExpenseCSV() {
    const { items, total, rangeLabel, startStr, endStr } = expenseExportData(state.expenseExportRange);
    const cell = v => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const lines = [];
    lines.push(bizName() + ' - Expense Report');
    lines.push('Range,' + cell(rangeLabel + ' (' + startStr + ' to ' + endStr + ')'));
    lines.push('');
    lines.push(['Month', 'Date', 'Description', 'Amount (PHP)'].join(','));
    // Group by month with a subtotal after each, so the file is easy to scan.
    let curMonth = null, monthTotal = 0;
    const flush = () => { if (curMonth !== null) { lines.push(['', '', curMonth + ' Subtotal', monthTotal].join(',')); lines.push(''); } };
    items.forEach(e => {
      const mk = (e.date || '').slice(0, 7);
      const monthName = mk ? new Date(mk + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
      if (mk !== curMonth) { flush(); curMonth = mk; monthTotal = 0; }
      const amt = Number(e.amount) || 0; monthTotal += amt;
      lines.push([cell(monthName), cell(e.date), cell(e.description || ''), amt].join(','));
    });
    flush();
    lines.push(['', '', 'Total', total].join(','));
    triggerDownload(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }), fileSlug() + '_expenses_' + state.expenseExportRange + '-' + endStr + '.csv');
    setState({ expenseExportOpen: false });
  }

  function exportExpensePDF() {
    const jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) { alert('PDF tool is still loading. Please try again in a moment.'); return; }
    const { jsPDF } = jspdf;
    const { items, total, rangeLabel, startStr, endStr } = expenseExportData(state.expenseExportRange);
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const PAGE_W = 612, PAGE_H = 792, marginX = 56, rightX = PAGE_W - marginX;
    const money = n => 'PHP ' + (Number(n) || 0).toLocaleString('en-PH');
    let y = 64;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(31, 107, 64);
    doc.text('Expense Report', marginX, y);
    y += 20; doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(110, 115, 110);
    doc.text(rangeLabel + ' · ' + startStr + ' to ' + endStr, marginX, y);
    y += 10; doc.setDrawColor(222, 228, 222); doc.line(marginX, y, rightX, y); y += 22;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(110, 115, 110);
    doc.text('DATE', marginX, y); doc.text('DESCRIPTION', marginX + 92, y); doc.text('AMOUNT', rightX, y, { align: 'right' });
    y += 6; doc.line(marginX, y, rightX, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 32, 30);
    if (!items.length) { doc.setTextColor(150, 150, 150); doc.text('No expenses in this range.', marginX, y); y += 16; }
    let curMonth = null, monthTotal = 0;
    const flushMonth = () => {
      if (curMonth !== null) {
        if (y > PAGE_H - 90) { doc.addPage(); y = 64; }
        const mName = new Date(curMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        doc.setFont('helvetica', 'bold'); doc.setTextColor(90, 95, 90);
        doc.text(mName + ' subtotal', marginX + 92, y); doc.text(money(monthTotal), rightX, y, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 32, 30);
        y += 18;
      }
    };
    items.forEach(e => {
      const mk = (e.date || '').slice(0, 7);
      if (mk !== curMonth) { flushMonth(); curMonth = mk; monthTotal = 0; }
      if (y > PAGE_H - 90) { doc.addPage(); y = 64; }
      monthTotal += Number(e.amount) || 0;
      doc.setTextColor(30, 32, 30);
      doc.text(String(e.date || ''), marginX, y);
      const label = (doc.splitTextToSize(String(e.description || '').replace(/₱/g, 'PHP '), 280)[0]) || '';
      doc.text(label, marginX + 92, y);
      doc.text(money(e.amount), rightX, y, { align: 'right' });
      y += 16;
    });
    flushMonth();
    y += 6; doc.setDrawColor(222, 228, 222); doc.line(marginX, y, rightX, y); y += 22;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(30, 32, 30);
    doc.text('Total Expenses', marginX, y); doc.text(money(total), rightX, y, { align: 'right' });
    doc.save(fileSlug() + '_expenses_' + state.expenseExportRange + '-' + endStr + '.pdf');
    setState({ expenseExportOpen: false });
  }

  function modalExpenseExport() {
    if (!state.expenseExportOpen) return '';
    const rk = state.expenseExportRange || '3m';
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="expenseexport">
      <div class="modal-box" style="width:400px" data-stop>
        <div class="modal-head"><div class="modal-title">Export Expenses</div><button type="button" class="modal-close" data-action="modal-close" data-which="expenseexport">✕</button></div>
        ${exportRangeControls(rk, 'expense')}
        <div style="display:flex;gap:10px">
          <button type="button" class="btn-primary" style="flex:1;justify-content:center;text-align:center" data-action="expense-export-csv">Download CSV</button>
          <button type="button" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:10px 16px;border-radius:9px;background:oklch(0.55 0.14 235 / 0.14);color:oklch(0.42 0.13 235);font-weight:700;font-size:13px;display:inline-flex;align-items:center;justify-content:center" data-action="expense-export-pdf">Download PDF</button>
        </div>
        <div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:12px;line-height:1.5">Expenses only, itemized with a subtotal per month, for the selected range. Separate from income.</div>
      </div>
    </div>`;
  }

  function modalReschedule() {
    const d = state.rescheduleDraft;
    if (!d) return '';
    const fmt = ds => ds ? new Date(ds + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return `
    <div class="modal-backdrop chip" style="z-index:70">
      <div class="modal-box" style="width:360px;padding:24px">
        <div class="modal-title" style="margin-bottom:8px">Reschedule shoot?</div>
        <div style="font-size:13.5px;color:oklch(0.48 0.015 150);margin-bottom:20px;line-height:1.6">Move <b>${esc(d.client)}</b><br>from ${fmt(d.from)}<br>to <b>${fmt(d.to)}</b>?</div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button type="button" style="all:unset;cursor:pointer;padding:9px 16px;border-radius:9px;background:var(--card2);color:oklch(0.35 0.02 150);font-weight:600;font-size:13px" data-action="reschedule-cancel">Cancel</button>
          <button type="button" style="all:unset;cursor:pointer;padding:9px 16px;border-radius:9px;background:linear-gradient(135deg, var(--accent1), var(--accent2));color:#fff;font-weight:700;font-size:13px" data-action="reschedule-confirm">Yes, reschedule</button>
        </div>
      </div>
    </div>`;
  }

  function modalShootPayment() {
    if (!state.shootPaymentModal) return '';
    const s = state.shoots.find(x => x.id === state.shootPaymentModal.id);
    if (!s) return '';
    const d = state.shootPaymentDraft || { amount: '', date: TODAY_STR, label: 'Payment' };
    const pkg = Number(s.package) || 0;
    const paidT = shootPaidTotal(s);
    const remaining = Math.max(0, pkg - paidT);
    const amt = Number(d.amount) || 0;
    const previewRemaining = Math.max(0, remaining - amt);
    const history = shootPaymentsOf(s).slice().sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.id || '').localeCompare(a.id || ''));
    const quick = [
      { label: 'DP 20%', amount: Math.round(pkg * 0.2) },
      { label: 'After Shoot 30%', amount: Math.round(pkg * 0.3) },
      { label: 'Final 50%', amount: Math.round(pkg * 0.5) },
    ];
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="shootpayment">
      <form class="modal-box" style="width:380px" data-stop data-action="save-shoot-payment">
        <div class="modal-head"><div class="modal-title">${esc(s.client || 'Shoot')}</div><button type="button" class="modal-close" data-action="modal-close" data-which="shootpayment">✕</button></div>
        <div class="modal-fields">
          <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">${s.location ? esc(s.location) + ' · ' : ''}Package ${fmtMoney(pkg)} · Remaining <b>${fmtMoney(remaining)}</b></div>
          <div class="field"><label>Payment Type</label>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${shootPayLabels().map(lb => { const a = (d.label || 'Payment') === lb; return `<button type="button" data-action="shoot-payment-label" data-label="${esc(lb)}" style="all:unset;cursor:pointer;padding:6px 11px;border-radius:20px;font-size:11.5px;font-weight:700;background:${a ? 'oklch(0.9 0.06 150)' : 'oklch(1 0 0)'};color:${a ? 'oklch(0.42 0.12 155)' : 'oklch(0.5 0.015 150)'};border:1px solid ${a ? 'oklch(0.45 0.14 150 / 0.4)' : 'oklch(0 0 0 / 0.08)'}">${esc(lb)}</button>`; }).join('')}
            </div>
          </div>
          <div class="field"><label>Payment Amount (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.amount))}" data-bind="shootPaymentDraft.amount" data-fmt="money" placeholder="0" autofocus required/></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${quick.map(q => `<button type="button" data-action="shoot-payment-quick" data-amount="${q.amount}" data-label="${esc(q.label)}" style="all:unset;cursor:pointer;padding:5px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:var(--card2);color:oklch(0.35 0.02 150)">${esc(q.label)} (${fmtMoney(q.amount)})</button>`).join('')}
            ${remaining > 0 ? `<button type="button" data-action="shoot-payment-quick" data-amount="${remaining}" data-label="Payment" style="all:unset;cursor:pointer;padding:5px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:var(--card2);color:oklch(0.35 0.02 150)">Pay remaining (${fmtMoney(remaining)})</button>` : ''}
          </div>
          ${dpField('Date paid', 'shootPaymentDraft.date', d.date || TODAY_STR, { align: 'left' })}
          <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">New remaining: <strong>${fmtMoney(previewRemaining)}</strong>${previewRemaining === 0 && amt > 0 ? ', Paid up ✓' : ''}</div>
          ${history.length > 0 ? `
          <div style="border-top:1px solid var(--border2);padding-top:12px">
            <div style="font-size:11.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:8px">Payment History</div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:170px;overflow-y:auto">
              ${history.map(h => `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--card2);border-radius:8px;padding:7px 10px">
                  <div style="display:flex;align-items:center;gap:8px;min-width:0"><span style="font-size:9.5px;font-weight:700;text-transform:uppercase;padding:2px 6px;border-radius:5px;background:oklch(0.9 0.06 150);color:oklch(0.42 0.12 155);white-space:nowrap">${esc(h.label || 'Payment')}</span><span style="font-size:12px;color:oklch(0.45 0.015 150)">${fmtDate(h.date)}</span></div>
                  <div style="display:flex;align-items:center;gap:8px"><span style="font-size:12.5px;font-weight:700">${fmtMoney(h.amount)}</span><button type="button" data-action="shoot-payment-history-delete" data-hist-id="${esc(h.id)}" style="all:unset;cursor:pointer;color:oklch(0.5 0.015 150);font-size:12px;padding:2px 4px" title="Remove this payment">✕</button></div>
                </div>`).join('')}
            </div>
          </div>` : ''}
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">Log Payment</button>
        </div>
      </form>
    </div>`;
  }

  function modalTelegram(ctx) {
    if (!state.telegramModalOpen) return '';
    const d = state.expenseDraft;
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="telegram">
      <div class="modal-box" style="width:420px" data-stop>
        <div class="modal-head"><div class="modal-title">Add Expense</div><button type="button" class="modal-close" data-action="modal-close" data-which="telegram">✕</button></div>
        <form data-action="save-telegram-expense" style="display:flex;flex-direction:column;gap:12px">
          <div class="field"><label>What did you spend on?</label><input type="text" value="${esc(d.description)}" data-bind="expenseDraft.description" placeholder="e.g. Grab papunta sa shoot" required/></div>
          <div class="row-2">
            <div class="field"><label>Amount (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.amount))}" data-bind="expenseDraft.amount" data-fmt="money" placeholder="0" required/></div>
            ${dpField('Date', 'expenseDraft.date', d.date || '', { align: 'right' })}
          </div>
          <button type="submit" class="btn-primary" style="text-align:center;margin-top:4px">Add Expense</button>
        </form>
      </div>
    </div>`;
  }

  function modalLoanPayment() {
    if (!state.loanPaymentModal) return '';
    const l = state.loans.find(x => x.id === state.loanPaymentModal.id);
    if (!l) return '';
    const d = state.loanPaymentDraft;
    const remaining = Number(l.remainingBalance) || 0;
    const amt = Number(d.amount) || 0;
    const previewRemaining = Math.max(0, remaining - amt);
    const history = (l.paymentHistory || []).slice().sort((a, b) => b.id.localeCompare(a.id));
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="loanpayment">
      <form class="modal-box" style="width:360px" data-stop data-action="save-loan-payment">
        <div class="modal-head"><div class="modal-title">${esc(l.lender)}</div><button type="button" class="modal-close" data-action="modal-close" data-which="loanpayment">✕</button></div>
        <div class="modal-fields">
          <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">Remaining balance: <strong>${fmtMoney(remaining)}</strong></div>
          <div class="field"><label>Payment Amount (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.amount))}" data-bind="loanPaymentDraft.amount" data-fmt="money" placeholder="0" autofocus required/></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" data-action="loan-payment-quick" data-amount="${l.monthlyDue}" style="all:unset;cursor:pointer;padding:5px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:var(--card2);color:oklch(0.35 0.02 150)">Monthly Due (${fmtMoney(l.monthlyDue)})</button>
            <button type="button" data-action="loan-payment-quick" data-amount="${remaining}" style="all:unset;cursor:pointer;padding:5px 10px;border-radius:20px;font-size:11.5px;font-weight:600;background:var(--card2);color:oklch(0.35 0.02 150)">Pay Off Full (${fmtMoney(remaining)})</button>
          </div>
          <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">New balance: <strong>${fmtMoney(previewRemaining)}</strong>${previewRemaining === 0 && amt > 0 ? ', will be marked Paid Off ✓' : ''}</div>
          ${history.length > 0 ? `
          <div style="border-top:1px solid var(--border2);padding-top:12px">
            <div style="font-size:11.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:8px">Payment History</div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto">
              ${history.map(h => `
                <div style="display:flex;align-items:center;justify-content:space-between;background:var(--card2);border-radius:8px;padding:7px 10px">
                  <div style="font-size:12px;color:oklch(0.45 0.015 150)">${fmtDate(h.date)}</div>
                  <div style="font-size:12.5px;font-weight:600">${fmtMoney(h.amount)}</div>
                  <button type="button" data-action="loan-payment-history-delete" data-hist-id="${esc(h.id)}" style="all:unset;cursor:pointer;color:oklch(0.5 0.015 150);font-size:12px;padding:2px 4px" title="Remove this payment">✕</button>
                </div>`).join('')}
            </div>
          </div>` : ''}
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">Log Payment</button>
        </div>
      </form>
    </div>`;
  }

  function modalLoan() {
    if (!state.loanModal) return '';
    const d = state.loanDraft;
    const isEdit = state.loanModal.mode === 'edit';
    const loanTermNum = Number(d.termMonths) || 0;
    const loanMonthlyNum = Number(d.monthlyDue) || 0;
    let loanEndLabel = '';
    if (loanTermNum > 0 && d.startMonth) {
      const _sd = new Date(d.startMonth + '-01T00:00:00');
      loanEndLabel = new Date(_sd.getFullYear(), _sd.getMonth() + loanTermNum - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    const loanStartLabel = d.startMonth ? new Date(d.startMonth + '-01T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Select month';
    const loanStartYear = state.loanStartCalYear || (d.startMonth ? Number(d.startMonth.slice(0, 4)) : TODAY.getFullYear());
    const LOAN_MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="loan">
      <form class="modal-box" style="width:420px" data-stop data-action="save-loan">
        <div class="modal-head"><div class="modal-title">${isEdit ? 'Edit Loan' : 'Add Loan'}</div><button type="button" class="modal-close" data-action="modal-close" data-which="loan">✕</button></div>
        <div class="modal-fields">
          <div class="field"><label>Lender / Source</label><input type="text" value="${esc(d.lender)}" data-bind="loanDraft.lender" placeholder="e.g. BPI Personal Loan" required/></div>
          <div class="row-2">
            <div class="field"><label>Monthly Due (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.monthlyDue))}" data-bind="loanDraft.monthlyDue" data-fmt="money" required/></div>
            <div class="field"><label>Due Day of Month</label><input type="number" min="1" max="31" value="${esc(d.dueDay)}" data-bind="loanDraft.dueDay" placeholder="e.g. 23"/></div>
          </div>
          <div class="row-2">
            <div class="field"><label>Term (months)</label><input type="number" min="1" value="${esc(d.termMonths)}" data-bind="loanDraft.termMonths" placeholder="e.g. 60"/></div>
            <div class="field" style="position:relative"><label>First due (start)</label>
              <button type="button" data-action="loan-start-toggle" style="all:unset;cursor:pointer;width:100%;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:10px 12px;color:inherit;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:space-between"><span>${loanStartLabel}</span></button>
              ${state.loanStartPickerOpen ? `
              <div data-picker-popover style="position:absolute;right:0;top:calc(100% + 6px);background:var(--panel);border:1px solid var(--border3);border-radius:14px;padding:16px;box-shadow:0 12px 28px oklch(0 0 0 / 0.14);z-index:80;min-width:240px;max-width:min(280px,86vw)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                  <button type="button" data-action="loan-start-year-prev" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">‹</button>
                  <div class="sg" style="font-weight:700;font-size:15px">${loanStartYear}</div>
                  <button type="button" data-action="loan-start-year-next" style="all:unset;cursor:pointer;width:24px;height:24px;border-radius:7px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:12px">›</button>
                </div>
                <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
                  ${LOAN_MONTH_ABBR.map((m, i) => { const mk = loanStartYear + '-' + String(i + 1).padStart(2, '0'); const sel = d.startMonth === mk; return `<div data-action="loan-start-pick" data-month="${mk}" style="text-align:center;padding:9px 0;border-radius:9px;cursor:pointer;font-size:12.5px;font-weight:600;background:${sel ? 'oklch(0.45 0.14 150)' : 'var(--card2)'};color:${sel ? 'oklch(1 0 0)' : 'oklch(0.3 0.02 150)'}">${m}</div>`; }).join('')}
                </div>
              </div>` : ''}
            </div>
          </div>
          <div class="field"><label>Balance left (₱), optional</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.remainingBalance))}" data-bind="loanDraft.remainingBalance" data-fmt="money" placeholder="Leave blank if nothing paid yet"/></div>
          ${(loanMonthlyNum > 0 && loanTermNum > 0) ? `<div style="background:oklch(0.5 0.13 150 / 0.08);border:1px solid oklch(0.5 0.13 150 / 0.2);border-radius:10px;padding:12px 14px"><div style="font-size:11px;font-weight:700;color:oklch(0.4 0.13 150);text-transform:uppercase;letter-spacing:0.03em;margin-bottom:4px">Auto computed</div><div style="font-size:14px"><b>Total loan: ${fmtMoney(loanMonthlyNum * loanTermNum)}</b> <span style="color:oklch(0.5 0.015 150)">(${formatMoneyLiveDisplay(String(d.monthlyDue))} &times; ${loanTermNum})</span></div>${loanEndLabel ? `<div style="font-size:12.5px;color:oklch(0.5 0.015 150);margin-top:2px">Ends ~${loanEndLabel}</div>` : ''}</div>` : ''}
          <div class="field"><label>Status</label>
            <select data-bind="loanDraft.status">
              <option value="ongoing" ${d.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
              <option value="paid" ${d.status === 'paid' ? 'selected' : ''}>Paid Off</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn-danger" data-action="loan-delete">Delete</button>` : ''}
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">${isEdit ? 'Save Changes' : 'Add Loan'}</button>
        </div>
      </form>
    </div>`;
  }

  /* ---------------- gear ROI ---------------- */

  function viewGear(ctx) {
    const reached = ctx.gearRoiReached;
    const surplus = ctx.gearRoiIncome - ctx.gearNetInvestment;
    return `
    <div class="page-head">
      <div>
        <div class="page-title">Gear ROI</div>
        <div class="page-sub">How much of your gear investment you have earned back from your side hustle income</div>
      </div>
      <button type="button" class="btn-primary" data-action="gear-add-open">+ Add Item</button>
    </div>

    <div class="card" style="margin-bottom:16px;background:linear-gradient(160deg, oklch(0.42 0.14 150), oklch(0.28 0.1 155));color:oklch(1 0 0);border:none">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
        <div>
          <div style="font-size:12.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:oklch(0.9 0.05 150)">${reached ? 'Status' : 'ROI Progress'}</div>
          <div class="sg" style="font-size:34px;font-weight:700;margin-top:4px">${reached ? 'Fully recovered ✓' : ctx.gearRoiPercent + '% recovered'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11.5px;color:oklch(0.85 0.06 150);text-transform:uppercase;letter-spacing:0.04em">Side hustle income</div>
          <div class="sg" style="font-size:24px;font-weight:700;margin-top:2px">${fmtMoney(ctx.gearRoiIncome)}</div>
        </div>
      </div>
      <div style="height:12px;background:oklch(1 0 0 / 0.2);border-radius:8px;overflow:hidden;margin-top:16px">
        <div style="height:100%;width:${ctx.gearRoiPercent}%;background:oklch(0.85 0.14 150);border-radius:8px"></div>
      </div>
      <div style="display:flex;gap:30px;margin-top:14px;flex-wrap:wrap;font-size:12.5px">
        <div><div style="color:oklch(0.85 0.06 150);text-transform:uppercase;font-size:11px;letter-spacing:0.04em">Net to recover</div><div style="font-weight:700;margin-top:2px">${fmtMoney(ctx.gearNetInvestment)}</div></div>
        <div><div style="color:oklch(0.85 0.06 150);text-transform:uppercase;font-size:11px;letter-spacing:0.04em">${reached ? 'Surplus' : 'Remaining'}</div><div style="font-weight:700;margin-top:2px">${fmtMoney(reached ? surplus : ctx.gearRoiRemaining)}</div></div>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:16px;margin-bottom:24px">
      <div class="card" style="padding:18px"><div style="color:oklch(0.45 0.015 150);font-size:12px;font-weight:600;text-transform:uppercase">Total Invested</div><div class="sg" style="font-size:22px;font-weight:700;margin-top:6px">${fmtMoney(ctx.gearTotalCost)}</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:2px">${ctx.gearItems.length} item${ctx.gearItems.length === 1 ? '' : 's'}</div></div>
      <div class="card" style="padding:18px"><div style="color:oklch(0.45 0.015 150);font-size:12px;font-weight:600;text-transform:uppercase">Recovered from Sales</div><div class="sg" style="font-size:22px;font-weight:700;margin-top:6px;color:oklch(0.5 0.15 150)">${fmtMoney(ctx.gearSoldProceeds)}</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:2px">${ctx.gearSoldCount} sold</div></div>
      <div class="card" style="padding:18px"><div style="color:oklch(0.45 0.015 150);font-size:12px;font-weight:600;text-transform:uppercase">Net to Recover</div><div class="sg" style="font-size:22px;font-weight:700;margin-top:6px">${fmtMoney(ctx.gearNetInvestment)}</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:2px">after sales</div></div>
      <div class="card" style="padding:18px"><div style="color:oklch(0.45 0.015 150);font-size:12px;font-weight:600;text-transform:uppercase">${reached ? 'Surplus' : 'Still to Recover'}</div><div class="sg" style="font-size:22px;font-weight:700;margin-top:6px;color:${reached ? 'oklch(0.5 0.15 150)' : 'oklch(0.62 0.17 45)'}">${fmtMoney(reached ? surplus : ctx.gearRoiRemaining)}</div><div style="font-size:11.5px;color:oklch(0.5 0.015 150);margin-top:2px">via side hustle</div></div>
    </div>

    <div class="search-wrap">
      <input type="text" value="${esc(state.gearSearch)}" data-bind="gearSearch" placeholder="Search gear..."/>
      ${state.gearSearch ? `<button type="button" class="search-clear" data-action="gear-search-clear">✕</button>` : ''}
    </div>

    <div class="table-wrap">
      <div class="t-head" style="grid-template-columns:2fr 1fr 1fr 1.3fr 96px"><div>Item</div><div>Purchased</div><div>Cost</div><div>Status</div><div></div></div>
      ${ctx.gearRows.map(g => `
        <div class="t-row" style="grid-template-columns:2fr 1fr 1fr 1.3fr 96px;align-items:center">
          <div style="font-weight:600;font-size:13.5px">${esc(g.name)}</div>
          <div style="font-size:12.5px;color:oklch(0.5 0.015 150)">${g.dateLabel}</div>
          <div style="font-size:13.5px;font-weight:600">${g.costLabel}</div>
          <div>${g.sold
            ? `<span class="badge" style="background:oklch(0.92 0.06 25);color:oklch(0.5 0.19 25)">Sold ${g.soldForLabel}</span>${g.soldName || g.soldDateLabel ? `<div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:3px">${esc(g.soldName || '')}${g.soldName && g.soldDateLabel ? ' · ' : ''}${g.soldDateLabel}</div>` : ''}`
            : `<span class="badge" style="background:oklch(0.9 0.05 150);color:oklch(0.42 0.13 150)">Owned</span>`}</div>
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button type="button" data-action="gear-edit" data-id="${esc(g.id)}" title="Edit" style="all:unset;cursor:pointer;color:oklch(0.45 0.14 150);font-size:18px;padding:8px 9px;border-radius:9px">✎</button>
            <button type="button" data-action="gear-delete" data-id="${esc(g.id)}" title="Delete" style="all:unset;cursor:pointer;color:oklch(0.58 0.19 25);font-size:18px;padding:8px 9px;border-radius:9px">✕</button>
          </div>
        </div>`).join('')}
      ${ctx.gearRows.length === 0 ? `<div style="padding:20px;color:oklch(0.55 0.015 150);font-size:13px">${ctx.gearItems.length ? 'No gear matches your search.' : 'No items yet. Tap "+ Add Item" to start.'}</div>` : ''}
    </div>`;
  }

  function modalGear() {
    if (!state.gearModal) return '';
    const d = state.gearDraft || {};
    const isEdit = state.gearModal.mode === 'edit';
    const isSold = d.status === 'sold';
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="gear">
      <form class="modal-box" style="width:420px" data-stop data-action="save-gear">
        <div class="modal-head"><div class="modal-title">${isEdit ? 'Edit Item' : 'Add Item'}</div><button type="button" class="modal-close" data-action="modal-close" data-which="gear">✕</button></div>
        <div class="modal-fields">
          <div class="field"><label>Item Name</label><input type="text" value="${esc(d.name)}" data-bind="gearDraft.name" placeholder="e.g. A7V with 35 GM" required/></div>
          <div class="row-2">
            ${dpField('Date of Purchase', 'gearDraft.date', d.date || '', { align: 'left', future: true })}
            <div class="field"><label>Cost (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.cost))}" data-bind="gearDraft.cost" data-fmt="money" placeholder="0"/></div>
          </div>
          <div class="field"><label>Status</label>
            <select data-bind="gearDraft.status">
              <option value="owned" ${!isSold ? 'selected' : ''}>Owned</option>
              <option value="sold" ${isSold ? 'selected' : ''}>Sold</option>
            </select>
          </div>
          ${isSold ? `
          <div style="border-top:1px solid var(--border2);padding-top:12px;display:flex;flex-direction:column;gap:12px">
            <div class="field"><label>Sold As / Note</label><input type="text" value="${esc(d.soldName)}" data-bind="gearDraft.soldName" placeholder="e.g. Gimbal RS4 18K"/></div>
            <div class="row-2">
              <div class="field"><label>Sold For (₱)</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.soldFor))}" data-bind="gearDraft.soldFor" data-fmt="money" placeholder="0"/></div>
              ${dpField('Date Sold', 'gearDraft.soldDate', d.soldDate || '', { align: 'right', future: true })}
            </div>
            <div style="font-size:11.5px;color:oklch(0.5 0.015 150)">Money from the sale is subtracted from the amount you need to recover.</div>
          </div>` : ''}
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn-danger" data-action="gear-delete" data-id="${esc(d.id)}">Delete</button>` : ''}
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">${isEdit ? 'Save Changes' : 'Add Gear'}</button>
        </div>
      </form>
    </div>`;
  }

  function modalGoal() {
    if (!state.goalModal) return '';
    const d = state.goalDraft;
    const isEdit = state.goalModal.mode === 'edit';
    const isUSD = d.currency === 'USD';
    const currencySymbol = isUSD ? '$' : '₱';
    const targetPhpPreview = fmtMoney((Number(d.target) || 0) * USD_TO_PHP);
    const currentPhpPreview = fmtMoney((Number(d.current) || 0) * USD_TO_PHP);
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="goal">
      <form class="modal-box" style="width:400px" data-stop data-action="save-goal">
        <div class="modal-head"><div class="modal-title">${isEdit ? 'Edit Goal' : 'Add Goal'}</div><button type="button" class="modal-close" data-action="modal-close" data-which="goal">✕</button></div>
        <div class="modal-fields">
          <div class="field"><label>Goal Name</label><input type="text" value="${esc(d.name)}" data-bind="goalDraft.name" placeholder="e.g. Car Fund" required/></div>
          <div style="display:flex;gap:8px">
            <button type="button" data-action="goal-currency-pick" data-currency="PHP" style="all:unset;cursor:pointer;padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:700;background:${!isUSD ? 'oklch(0.45 0.14 150)' : 'oklch(0.91 0.012 150)'};color:${!isUSD ? 'oklch(1 0 0)' : 'oklch(0.4 0.02 150)'}">₱ PHP</button>
            <button type="button" data-action="goal-currency-pick" data-currency="USD" style="all:unset;cursor:pointer;padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:700;background:${isUSD ? 'oklch(0.45 0.14 150)' : 'oklch(0.91 0.012 150)'};color:${isUSD ? 'oklch(1 0 0)' : 'oklch(0.4 0.02 150)'}">$ USD</button>
          </div>
          <div class="row-2">
            <div class="field"><label>Target Amount (${currencySymbol})</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.target))}" data-bind="goalDraft.target" data-fmt="money"/>
              ${isUSD ? `<div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">≈ ${targetPhpPreview}</div>` : ''}
            </div>
            <div class="field"><label>Current Amount (${currencySymbol})</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.current))}" data-bind="goalDraft.current" data-fmt="money"/>
              ${isUSD ? `<div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:4px">≈ ${currentPhpPreview}</div>` : ''}
            </div>
          </div>
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn-danger" data-action="goal-delete">Delete</button>` : ''}
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">${isEdit ? 'Save Changes' : 'Add Goal'}</button>
        </div>
      </form>
    </div>`;
  }

  function modalGoalFund() {
    if (!state.goalFundModal) return '';
    const g = state.goals.find(x => x.id === state.goalFundModal.id);
    if (!g) return '';
    const d = state.goalFundDraft;
    const isUSD = g.currency === 'USD';
    const currencySymbol = isUSD ? '$' : '₱';
    const mode = d.mode || 'deposit';
    const amt = Number(d.amount) || 0;
    const displayCurrent = isUSD ? (Number(g.current) || 0) / USD_TO_PHP : (Number(g.current) || 0);
    const previewCurrent = mode === 'deposit' ? displayCurrent + amt : Math.max(0, displayCurrent - amt);
    const history = (g.fundHistory || []).slice().sort((a, b) => b.id.localeCompare(a.id));
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="goalfund">
      <form class="modal-box" style="width:360px" data-stop data-action="save-goal-fund">
        <div class="modal-head"><div class="modal-title">${esc(g.name)}</div><button type="button" class="modal-close" data-action="modal-close" data-which="goalfund">✕</button></div>
        <div class="modal-fields">
          <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">Currently saved: <strong>${currencySymbol}${displayCurrent.toLocaleString('en-US')}</strong></div>
          <div style="display:flex;gap:8px">
            <button type="button" data-action="goal-fund-mode" data-mode="deposit" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:8px;border-radius:8px;font-size:12.5px;font-weight:700;background:${mode === 'deposit' ? 'oklch(0.45 0.14 150)' : 'oklch(0.91 0.012 150)'};color:${mode === 'deposit' ? 'oklch(1 0 0)' : 'oklch(0.4 0.02 150)'}">Deposit</button>
            <button type="button" data-action="goal-fund-mode" data-mode="withdraw" style="all:unset;cursor:pointer;flex:1;text-align:center;padding:8px;border-radius:8px;font-size:12.5px;font-weight:700;background:${mode === 'withdraw' ? 'oklch(0.58 0.19 25)' : 'oklch(0.91 0.012 150)'};color:${mode === 'withdraw' ? 'oklch(1 0 0)' : 'oklch(0.4 0.02 150)'}">Withdraw</button>
          </div>
          <div class="field"><label>Amount (${currencySymbol})</label><input type="text" inputmode="decimal" value="${esc(formatMoneyLiveDisplay(d.amount))}" data-bind="goalFundDraft.amount" data-fmt="money" placeholder="0" autofocus required/></div>
          ${mode === 'withdraw' ? `<div class="field"><label>Reason for Withdrawal</label><input type="text" value="${esc(d.reason)}" data-bind="goalFundDraft.reason" placeholder="e.g. Emergency repair, bills, etc." required/></div>` : ''}
          <div style="font-size:12.5px;color:oklch(0.45 0.015 150)">New total: <strong>${currencySymbol}${previewCurrent.toLocaleString('en-US')}</strong></div>
          ${history.length > 0 ? `
          <div style="border-top:1px solid var(--border2);padding-top:12px">
            <div style="font-size:11.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:8px">Contribution History</div>
            <div style="display:flex;flex-direction:column;gap:6px;max-height:160px;overflow-y:auto">
              ${history.map(h => `
                <div style="background:var(--card2);border-radius:8px;padding:7px 10px">
                  <div style="display:flex;align-items:center;justify-content:space-between">
                    <div style="font-size:12px;color:oklch(0.45 0.015 150)">${fmtDate(h.date)}</div>
                    <div style="display:flex;align-items:center;gap:8px">
                      <div style="font-size:12.5px;font-weight:600;color:${h.mode === 'withdraw' ? 'oklch(0.58 0.19 25)' : 'inherit'}">${h.mode === 'withdraw' ? '−' : '+'}${currencySymbol}${(Number(h.amount) || 0).toLocaleString('en-US')}</div>
                      <button type="button" data-action="goal-fund-history-delete" data-hist-id="${esc(h.id)}" style="all:unset;cursor:pointer;color:oklch(0.5 0.015 150);font-size:12px;padding:2px 4px" title="Remove this entry">✕</button>
                    </div>
                  </div>
                  ${h.mode === 'withdraw' && h.reason ? `<div style="font-size:11px;color:oklch(0.5 0.015 150);margin-top:2px">${esc(h.reason)}</div>` : ''}
                </div>`).join('')}
            </div>
          </div>` : ''}
        </div>
        <div class="modal-actions">
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">${mode === 'deposit' ? 'Add Fund' : 'Withdraw Fund'}</button>
        </div>
      </form>
    </div>`;
  }

  function modalClient() {
    if (!state.clientModal) return '';
    const d = state.clientDraft;
    const isEdit = state.clientModal.mode === 'edit';
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="client">
      <form class="modal-box" style="width:420px" data-stop data-action="save-client">
        <div class="modal-head"><div class="modal-title">${isEdit ? 'Edit Client' : 'Add Client'}</div><button type="button" class="modal-close" data-action="modal-close" data-which="client">✕</button></div>
        <div class="modal-fields">
          <div class="field"><label>Name</label><input type="text" value="${esc(d.name)}" data-bind="clientDraft.name" placeholder="e.g. Nadine Reyes" required/></div>
          <div class="row-2">
            <div class="field"><label>Phone</label><input type="text" value="${esc(d.phone)}" data-bind="clientDraft.phone" placeholder="09XX XXX XXXX"/></div>
            <div class="field"><label>Email</label><input type="text" value="${esc(d.email)}" data-bind="clientDraft.email" placeholder="email@example.com"/></div>
          </div>
          <div class="row-2">
            <div class="field"><label>Lead Status</label>
              <select data-bind="clientDraft.leadStatus">${LEAD_STATUSES.map(v => `<option value="${v}" ${d.leadStatus === v ? 'selected' : ''}>${leadStatusLabel(v)}</option>`).join('')}</select>
            </div>
            ${dpField('Follow up Date', 'clientDraft.followUpDate', d.followUpDate || '', { align: 'right', future: true })}
          </div>
          <div class="field"><label>Notes</label><input type="text" value="${esc(d.notes)}" data-bind="clientDraft.notes" placeholder="Optional notes"/></div>
        </div>
        <div class="modal-actions">
          ${isEdit ? `<button type="button" class="btn-danger" data-action="client-delete">Delete</button>` : ''}
          <button type="submit" class="btn-primary" style="flex:1;text-align:center">${isEdit ? 'Save Changes' : 'Add Client'}</button>
        </div>
      </form>
    </div>`;
  }

  function modalChip(ctx) {
    if (!ctx.chipModalKey) return '';
    const data = ctx.chipModalData;
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="chip">
      <div class="modal-box" style="width:380px" data-stop>
        <div class="modal-head"><div class="modal-title">${esc(data ? data.title : '')}</div><button type="button" class="modal-close" data-action="modal-close" data-which="chip">✕</button></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${(data ? data.items : []).map(it => `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid oklch(0 0 0 / 0.06)">
              <span style="font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(it.primary)}</span>
              <span style="font-size:12px;color:oklch(0.48 0.015 150);flex:none">${esc(it.secondary)}</span>
            </div>`).join('')}
          ${(!data || data.items.length === 0) ? `<div style="color:oklch(0.55 0.015 150);font-size:13px;padding:6px 4px">Nothing here yet.</div>` : ''}
        </div>
      </div>
    </div>`;
  }

  /* ---------------- root render ---------------- */

  let ctxGlobal = null;

  function render() {
    const active = document.activeElement;
    const activeBind = active && active.dataset ? active.dataset.bind : null;
    const selStart = active && 'selectionStart' in active ? active.selectionStart : null;
    const selEnd = active && 'selectionEnd' in active ? active.selectionEnd : null;
    const scrollTop = document.querySelector('.main') ? document.querySelector('.main').scrollTop : 0;
    const modalBoxScrollTop = document.querySelector('.modal-box') ? document.querySelector('.modal-box').scrollTop : null;

    applyLabelSettings();
    const ctx = buildCtx();
    ctxGlobal = ctx;

    const pageMap = {
      dashboard: viewDashboard, shoots: viewShoots, finances: viewFinances,
      expenses: viewExpenses, loans: viewLoans, clients: viewClients,
      docs: viewDocs, insights: viewInsights, goals: viewGoals, gear: viewGear, settings: viewSettings,
    };
    const pageFn = pageMap[state.view] || viewDashboard;

    const html = `
      <div class="app-shell">
        ${renderChrome()}
        <main class="main">${['expenses','insights','gear','loans','goals'].includes(state.view) ? moneyTabs() : ''}${pageFn(ctx)}</main>
      </div>
      ${modalChip(ctx)}
      ${modalShoot()}
      ${modalShootConfirmClose()}
      ${modalTelegram(ctx)}
      ${modalLoan()}
      ${modalLoanPayment()}
      ${modalShootPayment()}
      ${modalGoal()}
      ${modalGoalFund()}
      ${modalClient()}
      ${modalGear()}
      ${modalReschedule()}
      ${modalFinanceBreakdown()}
      ${modalFinanceExport()}
      ${modalExpenseExport()}
      ${modalExpenseCategory()}
      ${modalShootStatus()}
      ${modalLicense()}
      ${modalOnboarding()}
    `;

    const app = document.getElementById('app');
    app.innerHTML = html;

    if (state.view === 'dashboard') {
      if (!dashboardCountUpDone || dashboardCountUpMonthKey !== ctx.dashMonthKey) {
        dashboardCountUpDone = true;
        dashboardCountUpMonthKey = ctx.dashMonthKey;
        animateCountUps(app);
      }
    } else {
      dashboardCountUpDone = false;
    }

    const mainEl = app.querySelector('.main');
    if (mainEl) mainEl.scrollTop = scrollTop;
    const modalBoxEl = app.querySelector('.modal-box');
    if (modalBoxEl && modalBoxScrollTop != null) modalBoxEl.scrollTop = modalBoxScrollTop;

    if (activeBind) {
      const el = app.querySelector(`[data-bind="${activeBind}"]`);
      if (el) {
        el.focus();
        if (selStart != null && el.setSelectionRange) {
          try { el.setSelectionRange(selStart, selEnd); } catch (e) { /* not a text-like input */ }
        }
      }
    }
  }

  /* ---------------- actions ---------------- */

  // Client pushed through on a quotation → open a pre-filled New Shoot (status "Booked").
  // The quoted client, project (into notes), and rate (as a custom package) carry over;
  // the user just picks the actual shoot/booking date and saves.
  function openBookShootFromDoc(docId) {
    const rec = state.documents.find(r => r.id === docId);
    if (!rec) return;
    const rd = rec.draft || {};
    const initialDate = TODAY_STR;
    const calBase = new Date(initialDate + 'T00:00:00');
    setState({
      view: 'shoots',
      modal: { mode: 'add' }, shootAddonsOpen: false, shootDatePickerOpen: false, timePickerOpen: false, shootDeadlinePickerOpen: false,
      shootDateCalYear: calBase.getFullYear(), shootDateCalMonth: calBase.getMonth(),
      shootDeadlineCalYear: calBase.getFullYear(), shootDeadlineCalMonth: calBase.getMonth(),
      draftDateLocked: false,
      draft: {
        id: null, client: rd.clientName || '', location: '', date: initialDate, deadline: '', time: '09:00',
        status: 'idea', scriptStatus: 'Not Started', shootType: 'Real Estate', serviceType: 'shoot',
        notes: rd.description ? `From quotation: ${rd.description}` : '',
        packageTier: 'custom', package: String(rd.amount || ''), paid: '', paidDate: TODAY_STR, addons: {},
      },
    });
  }

  function openAddShoot(presetDate, lockDate) {
    const initialDate = presetDate || TODAY_STR;
    const calBase = new Date(initialDate + 'T00:00:00');
    setState({
      modal: { mode: 'add' }, shootAddonsOpen: false, shootDatePickerOpen: false, timePickerOpen: false, shootDeadlinePickerOpen: false,
      shootDateCalYear: calBase.getFullYear(), shootDateCalMonth: calBase.getMonth(),
      shootDeadlineCalYear: calBase.getFullYear(), shootDeadlineCalMonth: calBase.getMonth(),
      draftDateLocked: !!lockDate, shootLocOpen: false,
      draft: { id: null, client: '', location: '', date: initialDate, deadline: '', time: '09:00', status: 'idea', scriptStatus: 'Not Started', shootType: 'Real Estate', serviceType: 'shoot', currency: 'PHP', notes: '', packageTier: 'basic', package: '', paid: '', paidDate: TODAY_STR, addons: {} },
    });
  }
  function openEditShoot(id) {
    const sh = state.shoots.find(s => s.id === id);
    if (!sh) return;
    const calBase = new Date((sh.date || TODAY_STR) + 'T00:00:00');
    const deadlineCalBase = new Date((sh.deadline || sh.date || TODAY_STR) + 'T00:00:00');
    // The stored "package" on a Real-Estate/Custom shoot is the GRAND TOTAL — base custom
    // amount plus add-ons already baked in (save-shoot always does packageAmount + addonsTotal).
    // But the "Custom Package Amount" field is meant to hold just the base amount — pre-filling
    // it with the full total would double-count the add-ons the next time this shoot is saved.
    const isCustomRealEstate = sh.shootType === 'Real Estate' && (sh.packageTier || 'custom') === 'custom';
    let basePackage = sh.package;
    if (isCustomRealEstate) {
      const shAddons = sh.addons || {};
      const shAddonsTotal = addonDefs().reduce((sum, ad) => sum + (shAddons[ad.key] || 0) * ad.price, 0);
      basePackage = Math.max(0, (Number(sh.package) || 0) - shAddonsTotal);
    }
    setState({
      modal: { mode: 'edit', id }, shootAddonsOpen: false, shootDatePickerOpen: false, timePickerOpen: false, shootDeadlinePickerOpen: false,
      shootDateCalYear: calBase.getFullYear(), shootDateCalMonth: calBase.getMonth(),
      shootDeadlineCalYear: deadlineCalBase.getFullYear(), shootDeadlineCalMonth: deadlineCalBase.getMonth(),
      draftDateLocked: false, shootLocOpen: false,
      draft: { packageTier: 'custom', shootType: 'General Project', serviceType: 'shoot', addons: {}, ...sh, package: basePackage },
    });
  }
  function openEditLoan(id) {
    const l = state.loans.find(x => x.id === id);
    if (!l) return;
    // Older records may only have a one-time dueDate rather than a recurring dueDay —
    // derive dueDay from it so the edit form still pre-fills correctly.
    const dueDay = l.dueDay || (l.dueDate ? new Date(l.dueDate + 'T00:00:00').getDate() : '');
    setState({ loanModal: { mode: 'edit', id }, loanStartPickerOpen: false, loanDraft: { ...l, dueDay } });
  }
  function openEditGoal(id) {
    const g = state.goals.find(x => x.id === id);
    if (!g) return;
    const currency = g.currency || 'PHP';
    const target = currency === 'USD' ? (g.target ? +(Number(g.target) / USD_TO_PHP).toFixed(2) : '') : g.target;
    const current = currency === 'USD' ? (g.current ? +(Number(g.current) / USD_TO_PHP).toFixed(2) : '') : g.current;
    setState({ goalModal: { mode: 'edit', id }, goalDraft: { ...g, currency, target, current } });
  }
  function openEditClient(id) {
    const c = state.clients.find(x => x.id === id);
    if (!c) return;
    setState({ clientModal: { mode: 'edit', id }, clientDraft: { ...c } });
  }

  function handleAction(action, el, ev) {
    const id = el.dataset.id;
    switch (action) {
      case 'nav':
        try { localStorage.setItem('shoottracker_last_view', el.dataset.view); } catch (e) { /* storage unavailable */ }
        setState({ view: el.dataset.view, mobileNavOpen: false });
        break;
      case 'mobile-nav-toggle': setState(s => ({ mobileNavOpen: !s.mobileNavOpen })); break;
      case 'mobile-nav-close': setState({ mobileNavOpen: false }); break;
      case 'sidebar-toggle': setState(s => {
        const next = !s.sidebarCollapsed;
        try { localStorage.setItem('shoottracker_sidebar_collapsed', next ? '1' : '0'); } catch (e) { /* storage unavailable */ }
        return { sidebarCollapsed: next };
      }); break;
      case 'chip-open': setState({ chipModal: el.dataset.key }); break;
      case 'telegram-open': setState({ telegramModalOpen: true, expenseDraft: { description: '', amount: '', date: TODAY_STR } }); break;
      case 'search-clear': setState({ [el.dataset.field]: '' }); break;

      case 'dock': {
        const k = el.dataset.key;
        const map = { home: 'dashboard', shoots: 'shoots', calendar: 'shoots', clients: 'clients', payments: 'finances', money: moneyHomeView(), docs: 'docs' };
        const patch = { view: map[k] || 'dashboard', quickAddOpen: false, globalSearch: '', moreOpen: false, mSearchOpen: false };
        if (k === 'calendar') patch.shootsMode = 'calendar';
        if (k === 'shoots') patch.shootsMode = 'board';
        try { localStorage.setItem('shoottracker_last_view', patch.view); } catch (e2) { /* ignore */ }
        setState(patch);
        const m = document.querySelector('.main'); if (m) m.scrollTop = 0; window.scrollTo(0, 0);
        break;
      }
      case 'quick-add-toggle': setState(s => ({ quickAddOpen: !s.quickAddOpen, moreOpen: false })); break;
      case 'more-open': setState({ moreOpen: true, quickAddOpen: false }); break;
      case 'more-close': setState({ moreOpen: false }); break;
      case 'dock-settings': setState({ view: 'settings', moreOpen: false }); window.scrollTo(0, 0); break;
      case 'sheet-nav': setState({ view: el.dataset.view, moreOpen: false }); window.scrollTo(0, 0); break;
      case 'm-search-toggle': setState(s => ({ mSearchOpen: !s.mSearchOpen, globalSearch: '' })); setTimeout(() => { const i = document.getElementById('global-search'); if (i && state.mSearchOpen) i.focus(); }, 30); break;
      case 'qa-shoot': state = { ...state, quickAddOpen: false }; openAddShoot(); break;
      case 'qa-expense': setState({ quickAddOpen: false, telegramModalOpen: true, expenseDraft: { description: '', amount: '', date: TODAY_STR } }); break;
      case 'qa-client': setState({ quickAddOpen: false, clientModal: { mode: 'add' }, clientDraft: { id: null, name: '', phone: '', email: '', leadStatus: 'New Lead', followUpDate: '', notes: '' } }); break;
      case 'qa-payment': setState({ quickAddOpen: false, view: 'finances' }); alertSoft('Piliin ang project, tapos pindutin ang "+ Log payment".'); break;
      case 'shoot-add-open': openAddShoot(); break;
      case 'shoot-add-open-for-date': openAddShoot(state.selectedDate, true); break;
      case 'shoot-edit': openEditShoot(id); break;
      case 'shoot-status-open': setState({ shootStatusModal: el.dataset.id }); break;
      case 'shoot-status-set': { const sid = el.dataset.id, status = el.dataset.status; setState(s => { const shoots = s.shoots.map(sh => sh.id === sid ? { ...sh, status } : sh); const clients = status === 'posted' ? promoteClientToCompleted(s.clients, (s.shoots.find(sh => sh.id === sid) || {}).client) : s.clients; return { shoots, shootStatusModal: null, ...(clients !== s.clients ? { clients } : {}) }; }); break; }
      case 'shoot-create-billing': {
        // Jump from a shoot straight into a prefilled billing document (this is the single
        // "bill from a shoot" path — the old Documents dropdown was removed).
        //   Foreign General Project → Invoice (USD, amount = $ charged)
        //   Real Estate            → Statement of Account (₱, next 20/30/50 milestone due)
        //   Local General Project  → Statement of Account (₱, full remaining balance)
        // The user then adds the due date and QR in Documents before generating.
        const dr = state.draft || {};
        const isRealEstate = dr.shootType === 'Real Estate';
        const foreign = !isRealEstate && dr.currency === 'USD';
        const cl = state.clients.find(c => c.name && dr.client && c.name.trim().toLowerCase() === (dr.client || '').trim().toLowerCase());
        const contact = cl ? [cl.phone, cl.email].filter(Boolean).join(' · ') : '';
        const desc = `${shootTypeLabel(dr.shootType)}${dr.location ? ' at ' + dr.location : ''}`;
        const kind = foreign ? 'invoice' : 'soa';
        // Edit-only projects carry a list of deliverables — use those as the line items.
        const items = (Array.isArray(dr.projectItems) ? dr.projectItems : []).map(x => String(x || '').trim()).filter(Boolean);
        let extra;
        if (foreign) {
          const usd = Number(dr.usdCharged) || 0;
          extra = { currency: 'USD', billingKind: 'invoice', amount: String(usd), lineItems: items.length ? items.join('\n') : `${desc} - $${usd.toLocaleString('en-US')}`, packageTotal: '', paidToDate: '', milestoneLabel: '', paymentStatus: 'Unpaid' };
        } else if (isRealEstate) {
          const dec = decorate(dr);
          const grandTotal = Number(dr.package) || 0, paid = Number(dr.paid) || 0;
          const addons = dr.addons || {};
          const addonsTotal = addonDefs().reduce((sum, ad) => sum + (addons[ad.key] || 0) * ad.price, 0);
          const baseAmt = grandTotal - addonsTotal;
          const baseLabel = (dec.packageTierLabel.split(' - ')[1] || dec.packageTierLabel).split(' (')[0];
          const addonLines = addonDefs().filter(ad => (addons[ad.key] || 0) > 0).map(ad => `${ad.label}${ad.flat ? '' : ' x' + addons[ad.key]} - ${fmtMoney(ad.price * addons[ad.key])}`);
          const lineItems = [`${baseLabel} - ${fmtMoney(baseAmt)}`, ...addonLines].join('\n');
          const { next, due } = nextMilestoneDue(grandTotal, paid);
          extra = { currency: 'PHP', billingKind: 'soa', amount: String(due), lineItems, packageTotal: String(grandTotal), paidToDate: String(paid), milestoneLabel: next ? next.label : 'Fully Paid', paymentStatus: due > 0 ? 'Unpaid' : 'Paid' };
        } else {
          const pkg = Number(dr.package) || 0, paid = Number(dr.paid) || 0;
          const remaining = Math.max(pkg - paid, 0);
          extra = { currency: 'PHP', billingKind: 'soa', amount: String(remaining || pkg), lineItems: items.length ? items.join('\n') : `${desc} - ${fmtMoney(pkg)}`, packageTotal: String(pkg), paidToDate: String(paid), milestoneLabel: '', paymentStatus: remaining > 0 ? 'Unpaid' : 'Paid' };
        }
        setState(s => ({
          view: 'docs', docType: 'invoice', modal: null, draft: null, docsHistoryOpen: false,
          docDraft: { ...s.docDraft, clientName: dr.client || '', clientContact: contact || s.docDraft.clientContact, description: desc, date: TODAY_STR, dueDate: addDays(TODAY_STR, 10), invoiceNumber: nextInvoiceNumber(s, kind), notes: s.docDraft.notes || '', ...extra },
        }));
        try { localStorage.setItem('shoottracker_last_view', 'docs'); } catch (e) { /* ignore */ }
        break;
      }
      case 'shoot-delete':
        if (!confirm(`Are you sure you want to delete the shoot "${state.draft.client || 'this shoot'}"? This cannot be undone.`)) break;
        setState(s => ({ shoots: s.shoots.filter(sh => sh.id !== s.draft.id), modal: null, draft: null }));
        break;
      case 'shoot-type-pick': setState(s => { const st = el.dataset.type; const draft = { ...s.draft, shootType: st }; if (st === 'General Project' && (draft.status === 'tentative' || draft.status === 'resched')) draft.status = 'idea'; return { draft }; }); break;
      case 'shoot-service-pick': setState(s => ({ draft: { ...s.draft, serviceType: el.dataset.service } })); break;
      case 'shoot-project-add': setState(s => ({ draft: { ...s.draft, projectItems: [...(Array.isArray(s.draft.projectItems) ? s.draft.projectItems : []), ''] } })); break;
      case 'shoot-project-remove': setState(s => { const arr = (Array.isArray(s.draft.projectItems) ? s.draft.projectItems : []).slice(); arr.splice(Number(el.dataset.idx), 1); return { draft: { ...s.draft, projectItems: arr } }; }); break;
      case 'shoot-currency-pick': setState(s => ({ draft: { ...s.draft, currency: el.dataset.currency } })); break;
      case 'shoot-loc-toggle': setState(s => ({ shootLocOpen: true })); break;
      case 'shoot-addons-toggle': setState(s => ({ shootAddonsOpen: !s.shootAddonsOpen })); break;
      case 'shoot-addon-inc': setState(s => ({ draft: { ...s.draft, addons: { ...s.draft.addons, [el.dataset.key]: ((s.draft.addons && s.draft.addons[el.dataset.key]) || 0) + 1 } } })); break;
      case 'shoot-addon-dec': setState(s => ({ draft: { ...s.draft, addons: { ...s.draft.addons, [el.dataset.key]: Math.max(0, ((s.draft.addons && s.draft.addons[el.dataset.key]) || 0) - 1) } } })); break;
      case 'shoot-addon-toggle': setState(s => ({ draft: { ...s.draft, addons: { ...s.draft.addons, [el.dataset.key]: ((s.draft.addons && s.draft.addons[el.dataset.key]) || 0) > 0 ? 0 : 1 } } })); break;
      case 'shoot-milestone-pick': setState(s => ({ draft: { ...s.draft, paid: Number(el.dataset.amount) || 0 } })); break;
      case 'date-picker-toggle': setState(s => ({ shootDatePickerOpen: !s.shootDatePickerOpen, timePickerOpen: false })); break;
      case 'loan-start-toggle': setState(s => ({ loanStartPickerOpen: !s.loanStartPickerOpen, loanStartCalYear: (s.loanDraft && s.loanDraft.startMonth) ? Number(s.loanDraft.startMonth.slice(0, 4)) : TODAY.getFullYear() })); break;
      case 'loan-start-year-prev': setState(s => ({ loanStartCalYear: (s.loanStartCalYear || TODAY.getFullYear()) - 1 })); break;
      case 'loan-start-year-next': setState(s => ({ loanStartCalYear: (s.loanStartCalYear || TODAY.getFullYear()) + 1 })); break;
      case 'loan-start-pick': setState(s => ({ loanDraft: { ...s.loanDraft, startMonth: el.dataset.month }, loanStartPickerOpen: false })); break;
      case 'shoot-date-unlock': setState({ draftDateLocked: false }); break;
      case 'time-picker-toggle': setState(s => ({ timePickerOpen: !s.timePickerOpen, shootDatePickerOpen: false })); break;
      case 'shoot-date-cal-prev': setState(s => { let m = s.shootDateCalMonth - 1, y = s.shootDateCalYear; if (m < 0) { m = 11; y--; } return { shootDateCalMonth: m, shootDateCalYear: y }; }); break;
      case 'shoot-date-cal-next': setState(s => { let m = s.shootDateCalMonth + 1, y = s.shootDateCalYear; if (m > 11) { m = 0; y++; } return { shootDateCalMonth: m, shootDateCalYear: y }; }); break;
      case 'date-picker-pick': setState(s => ({ draft: { ...s.draft, date: el.dataset.date }, shootDatePickerOpen: false })); break;
      case 'dp-toggle': { const bind = el.dataset.bind; const val = el.dataset.value; const base = val ? new Date(val + 'T00:00:00') : TODAY; setState(s => ({ dpKey: s.dpKey === bind ? null : bind, dpYear: base.getFullYear(), dpMonth: base.getMonth() })); break; }
      case 'dp-prev': setState(s => { let m = s.dpMonth - 1, y = s.dpYear; if (m < 0) { m = 11; y--; } return { dpMonth: m, dpYear: y }; }); break;
      case 'dp-next': setState(s => { let m = s.dpMonth + 1, y = s.dpYear; if (m > 11) { m = 0; y++; } return { dpMonth: m, dpYear: y }; }); break;
      case 'dp-pick': { const parts = el.dataset.bind.split('.'); const obj = parts[0], key = parts[1]; const date = el.dataset.date; setState(s => ({ [obj]: { ...s[obj], [key]: date }, dpKey: null })); break; }
      case 'deadline-picker-toggle': setState(s => ({ shootDeadlinePickerOpen: !s.shootDeadlinePickerOpen, shootDatePickerOpen: false, timePickerOpen: false })); break;
      case 'shoot-deadline-cal-prev': setState(s => { let m = s.shootDeadlineCalMonth - 1, y = s.shootDeadlineCalYear; if (m < 0) { m = 11; y--; } return { shootDeadlineCalMonth: m, shootDeadlineCalYear: y }; }); break;
      case 'shoot-deadline-cal-next': setState(s => { let m = s.shootDeadlineCalMonth + 1, y = s.shootDeadlineCalYear; if (m > 11) { m = 0; y++; } return { shootDeadlineCalMonth: m, shootDeadlineCalYear: y }; }); break;
      case 'deadline-picker-pick': setState(s => ({ draft: { ...s.draft, deadline: el.dataset.date }, shootDeadlinePickerOpen: false })); break;
      case 'deadline-clear': setState(s => ({ draft: { ...s.draft, deadline: '' } })); break;
      case 'time-part-pick': {
        const part = el.dataset.part;
        const value = part === 'meridiem' ? el.dataset.value : Number(el.dataset.value);
        setState(s => ({ draft: { ...s.draft, time: setTimePart(s.draft.time, part, value) } }));
        break;
      }
      case 'shoots-mode': setState({ shootsMode: el.dataset.mode }); break;
      case 'cal-prev': setState(s => { let m = s.calendarMonth - 1, y = s.calendarYear; if (m < 0) { m = 11; y--; } return { calendarMonth: m, calendarYear: y }; }); break;
      case 'cal-next': setState(s => { let m = s.calendarMonth + 1, y = s.calendarYear; if (m > 11) { m = 0; y++; } return { calendarMonth: m, calendarYear: y }; }); break;
      case 'cal-select': setState({ selectedDate: el.dataset.date }); break;

      case 'finance-tab': setState({ financeTab: el.dataset.tab }); break;
      case 'fulltime-delete': {
        const rec = state.fullTimeIncome.find(f => f.id === id);
        if (!confirm(`Are you sure you want to delete "${rec ? rec.source : 'this income entry'}"? This cannot be undone.`)) break;
        setState(s => ({ fullTimeIncome: s.fullTimeIncome.filter(f => f.id !== id) }));
        break;
      }
      case 'ft-month-prev': setState(s => {
        const [y, m] = (s.financeMonthKey || THIS_MONTH_KEY).split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        return { financeMonthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
      }); break;
      case 'ft-month-next': setState(s => {
        const [y, m] = (s.financeMonthKey || THIS_MONTH_KEY).split('-').map(Number);
        const d = new Date(y, m, 1);
        return { financeMonthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
      }); break;
      case 'ft-month-today': setState({ financeMonthKey: THIS_MONTH_KEY }); break;
      case 'dash-month-prev': setState(s => {
        const [y, m] = (s.dashMonthKey || THIS_MONTH_KEY).split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        return { dashMonthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
      }); break;
      case 'dash-month-next': setState(s => {
        const [y, m] = (s.dashMonthKey || THIS_MONTH_KEY).split('-').map(Number);
        const d = new Date(y, m, 1);
        return { dashMonthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` };
      }); break;
      case 'dash-month-today': setState({ dashMonthKey: THIS_MONTH_KEY }); break;
      case 'expense-delete': {
        const rec = state.expenses.find(e => e.id === id);
        if (!confirm(`Are you sure you want to delete "${rec ? rec.description : 'this expense'}"? This cannot be undone.`)) break;
        setState(s => ({ expenses: s.expenses.filter(e => e.id !== id) }));
        break;
      }

      // The top month picker, the big calendar below it, and the Monthly Report chart used to
      // track three separate month/year values — switching one didn't move the others, so the
      // calendar could silently be showing a totally different month than the picker said.
      // They now all move together through this one helper.
      case 'expenses-month-prev': setState(s => {
        const [y, m] = (s.expensesMonthKey || THIS_MONTH_KEY).split('-').map(Number);
        const d = new Date(y, m - 2, 1);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { expensesMonthKey: mk, expensesDayCalYear: d.getFullYear(), expensesDayCalMonth: d.getMonth(), expensesReportSelectedMonth: mk };
      }); break;
      case 'expenses-month-next': setState(s => {
        const [y, m] = (s.expensesMonthKey || THIS_MONTH_KEY).split('-').map(Number);
        const d = new Date(y, m, 1);
        const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { expensesMonthKey: mk, expensesDayCalYear: d.getFullYear(), expensesDayCalMonth: d.getMonth(), expensesReportSelectedMonth: mk };
      }); break;
      case 'expenses-month-today': setState({ expensesMonthKey: THIS_MONTH_KEY, expensesDayCalYear: TODAY.getFullYear(), expensesDayCalMonth: TODAY.getMonth(), expensesReportSelectedMonth: THIS_MONTH_KEY }); break;

      case 'expenses-day-today': setState({ expensesSelectedDate: TODAY_STR }); break;
      case 'expenses-list-toggle': setState(s => ({ expensesListOpen: !s.expensesListOpen })); break;
      case 'expenses-tab': setState({ expensesTab: el.dataset.tab }); break;
      case 'exp-day-select': setState({ expChartDay: Number(el.dataset.day) }); break;
      case 'exp-cat-toggle': setState(s => ({ expCatOpen: s.expCatOpen === el.dataset.cat ? null : el.dataset.cat })); break;
      case 'exp-item-reassign': setState({ expReassignId: el.dataset.id, expNewCatDraft: '' }); break;
      case 'exp-cat-set': { const id = el.dataset.id, cat = el.dataset.cat; setState(s => ({ expenses: s.expenses.map(x => x.id === id ? { ...x, category: cat } : x), expReassignId: null, expNewCatDraft: '' })); break; }
      case 'exp-cat-set-new': { const id = el.dataset.id; const name = (state.expNewCatDraft || '').trim(); if (!name) break; setState(s => ({ expenses: s.expenses.map(x => x.id === id ? { ...x, category: name } : x), expReassignId: null, expNewCatDraft: '' })); break; }
      case 'exp-cat-clear': { const id = el.dataset.id; setState(s => ({ expenses: s.expenses.map(x => { if (x.id !== id) return x; const c = { ...x }; delete c.category; return c; }), expReassignId: null })); break; }
      case 'expenses-day-cal-prev': setState(s => {
        let m = s.expensesDayCalMonth - 1, y = s.expensesDayCalYear; if (m < 0) { m = 11; y--; }
        const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
        return { expensesDayCalMonth: m, expensesDayCalYear: y, expensesMonthKey: mk, expensesReportSelectedMonth: mk };
      }); break;
      case 'expenses-day-cal-next': setState(s => {
        let m = s.expensesDayCalMonth + 1, y = s.expensesDayCalYear; if (m > 11) { m = 0; y++; }
        const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
        return { expensesDayCalMonth: m, expensesDayCalYear: y, expensesMonthKey: mk, expensesReportSelectedMonth: mk };
      }); break;
      case 'expenses-report-year-prev': setState(s => ({ expensesReportYear: (s.expensesReportYear || TODAY.getFullYear()) - 1 })); break;
      case 'expenses-report-year-next': setState(s => ({ expensesReportYear: (s.expensesReportYear || TODAY.getFullYear()) + 1 })); break;
      case 'expenses-report-month-pick': {
        const [y, m] = el.dataset.month.split('-').map(Number);
        setState({ expensesMonthKey: el.dataset.month, expensesReportSelectedMonth: el.dataset.month, expensesDayCalYear: y, expensesDayCalMonth: m - 1 });
        break;
      }
      case 'expenses-report-export': {
        // One row per actual expense (not just per-month totals) so the file shows exactly
        // what was spent that month, with a subtotal after each month for quick scanning.
        const year = state.expensesReportYear || TODAY.getFullYear();
        const rows = [['Month', 'Date', 'Description', 'Amount (PHP)']];
        let yearTotal = 0;
        for (let i = 0; i < 12; i++) {
          const mk = `${year}-${String(i + 1).padStart(2, '0')}`;
          const monthName = MONTH_SHORT_LABELS[i] + ' ' + year;
          const monthRows = state.expenses.filter(e => e.date && e.date.slice(0, 7) === mk).sort((a, b) => a.date.localeCompare(b.date));
          if (monthRows.length === 0) continue;
          let monthTotal = 0;
          monthRows.forEach(e => {
            const amt = Number(e.amount) || 0;
            monthTotal += amt;
            rows.push([monthName, e.date, e.description || '', amt]);
          });
          rows.push(['', '', monthName + ' Subtotal', monthTotal]);
          rows.push(['', '', '', '']);
          yearTotal += monthTotal;
        }
        rows.push(['', '', `${year} Total`, yearTotal]);
        downloadCSV(`${fileSlug()}_expense_report_${year}.csv`, rows.map(r => r.map(csvCell)));
        break;
      }
      case 'expenses-day-pick': setState({ expensesSelectedDate: el.dataset.date }); break;

      case 'export-data-csv': {
        // One clean, single-table CSV per data type — easier to open in Excel/Sheets than
        // one file with several stacked tables of different shapes.
        const shootRows = [['Client', 'Location', 'Date', 'Status', 'Package Total', 'Paid', 'Balance', 'Deadline']];
        state.shoots.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(sh => {
          const pkg = Number(sh.package) || 0, paid = Number(sh.paid) || 0;
          shootRows.push([sh.client || '', sh.location || '', sh.date || '', normalizeShootStatus(sh.status), pkg, paid, pkg - paid, sh.deadline || '']);
        });

        const expenseRows = [['Description', 'Date', 'Amount']];
        state.expenses.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(ex => {
          expenseRows.push([ex.description || '', ex.date || '', Number(ex.amount) || 0]);
        });

        const incomeRows = [['Source', 'Date', 'Amount']];
        state.fullTimeIncome.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(f => {
          incomeRows.push([f.source || '', f.date || '', Number(f.amount) || 0]);
        });

        const clientRows = [['Name', 'Phone', 'Email', 'Lead Status', 'Follow up Date', 'Notes']];
        state.clients.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(c => {
          clientRows.push([c.name || '', c.phone || '', c.email || '', c.leadStatus || '', c.followUpDate || '', c.notes || '']);
        });

        const loanRows = [['Lender', 'Total Amount', 'Monthly Due', 'Remaining Balance', 'Due Day of Month', 'Status']];
        state.loans.slice().sort((a, b) => (a.lender || '').localeCompare(b.lender || '')).forEach(l => {
          loanRows.push([l.lender || '', Number(l.amount) || 0, Number(l.monthlyDue) || 0, Number(l.remainingBalance) || 0, l.dueDay || (l.dueDate ? new Date(l.dueDate + 'T00:00:00').getDate() : ''), l.status || '']);
        });

        const goalRows = [['Name', 'Target', 'Current', 'Currency']];
        state.goals.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(g => {
          goalRows.push([g.name || '', Number(g.target) || 0, Number(g.current) || 0, g.currency || 'PHP']);
        });

        const files = [
          ['shoots', shootRows], ['expenses', expenseRows], ['income', incomeRows],
          ['clients', clientRows], ['loans', loanRows], ['goals', goalRows],
        ];
        files.forEach(([name, rows], i) => {
          setTimeout(() => downloadCSV(`${fileSlug()}_${name}_${TODAY_STR}.csv`, rows), i * 150);
        });
        break;
      }

      case 'settings-logo-upload': pickImage(512, null, (dataUrl) => setSettings({ logo: dataUrl })); break;
      case 'settings-logo-remove': setSettings({ logo: '' }); break;
      case 'settings-add-package': setState(s => ({ settings: { ...s.settings, packages: [...(s.settings.packages || []), { value: 'pk' + Date.now(), name: '', price: 0 }] } })); break;
      case 'settings-del-package': setState(s => ({ settings: { ...s.settings, packages: (s.settings.packages || []).filter((_, i) => i !== Number(el.dataset.idx)) } })); break;
      case 'settings-add-addon': setState(s => ({ settings: { ...s.settings, addons: [...(s.settings.addons || []), { key: 'ad' + Date.now(), label: '', price: 0, flat: false }] } })); break;
      case 'settings-del-addon': setState(s => ({ settings: { ...s.settings, addons: (s.settings.addons || []).filter((_, i) => i !== Number(el.dataset.idx)) } })); break;
      case 'settings-addon-flat': setState(s => ({ settings: { ...s.settings, addons: (s.settings.addons || []).map((a, i) => i === Number(el.dataset.idx) ? { ...a, flat: !a.flat } : a) } })); break;
      case 'settings-add-milestone': setState(s => ({ settings: { ...s.settings, milestones: [...(s.settings.milestones || []), { label: '', pct: 0 }] } })); break;
      case 'settings-del-milestone': setState(s => ({ settings: { ...s.settings, milestones: (s.settings.milestones || []).filter((_, i) => i !== Number(el.dataset.idx)) } })); break;
      case 'setup-next': {
        setupReadInputs(); const d = setupDraft();
        if (d.step === 2 && !d.businessName.trim()) { d.error = 'Ilagay muna ang pangalan ng business mo.'; render(); break; }
        d.error = ''; d.step = Math.min(d.step + 1, 5); render(); break;
      }
      case 'setup-back': { setupReadInputs(); const d = setupDraft(); d.error = ''; d.step = Math.max(d.step - 1, 0); render(); break; }
      case 'setup-role': { const d = setupDraft(); d.role = el.dataset.key; render(); break; }
      case 'setup-split': { const d = setupDraft(); d.split = el.dataset.key; render(); break; }
      case 'setup-feature': { const d = setupDraft(); d.features = { ...d.features, [el.dataset.key]: !d.features[el.dataset.key] }; render(); break; }
      case 'setup-logo': { setupReadInputs(); pickImage(512, null, (dataUrl) => { setupDraft().logo = dataUrl; render(); }); break; }
      case 'setup-finish': finishSetup(el.dataset.sample === '1'); break;
      case 'checklist-hide': setSettings({ checklistHidden: true }); break;
      case 'sample-clear': setState(s => ({ shoots: s.shoots.filter(x => !x.sample), clients: s.clients.filter(x => !x.sample), expenses: s.expenses.filter(x => !x.sample) })); break;
      case 'settings-list-add': { const k = el.dataset.list; setState(s => ({ settings: { ...s.settings, [k]: [...(s.settings[k] || []), ''] } })); break; }
      case 'settings-list-del': { const k = el.dataset.list; setState(s => ({ settings: { ...s.settings, [k]: (s.settings[k] || []).filter((_, i) => i !== Number(el.dataset.idx)) } })); break; }
      case 'settings-preset': setState({ presetConfirm: el.dataset.preset }); break;
      case 'settings-preset-cancel': setState({ presetConfirm: null }); break;
      case 'settings-preset-apply': {
        const pr = STARTER_PRESETS[el.dataset.preset]; if (!pr) break;
        setState(s => ({ presetConfirm: null, settings: { ...s.settings, packages: pr.packages.map(x => ({ ...x })), addons: pr.addons.map(x => ({ ...x })), projectTypes: pr.projectTypes.slice(), tagline: (!s.settings.tagline || s.settings.tagline === defaultSettings().tagline) ? pr.tagline : s.settings.tagline } }));
        break;
      }
      case 'settings-doc-reset': { const d0 = defaultSettings(); setSettings({ tplContract: d0.tplContract, tplQuotation: d0.tplQuotation, tplInvoice: d0.tplInvoice }); break; }
      case 'settings-feature': setState(s => ({ settings: { ...s.settings, features: { ...(s.settings.features || {}), [el.dataset.feat]: !((s.settings.features || {})[el.dataset.feat]) } } })); break;
      case 'backup-download': {
        // One JSON file holding every data collection, a true backup you can restore from.
        const file = buildBackupFile();
        triggerDownload(file, file.name);
        markBackupDone();
        backupReminderDismissed = true;
        render();
        showToast('Na download na ang backup mo. Itago mo sa Google Drive o sa email mo.');
        break;
      }
      case 'backup-drive': {
        const file = buildBackupFile();
        const done = (msg) => { markBackupDone(); backupReminderDismissed = true; render(); showToast(msg); };
        let canShareFile = false;
        try { canShareFile = !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { canShareFile = false; }
        if (canShareFile && navigator.share) {
          // Phones: the share sheet lists Google Drive, so the file lands in their Drive in one tap.
          navigator.share({ files: [file], title: 'Eksakto backup', text: 'Eksakto backup ' + TODAY_STR })
            .then(() => done('Tapos na ang backup! Kung Drive ang pinili mo, nandoon na ang file.'))
            .catch(err => { if (err && err.name === 'AbortError') return; triggerDownload(file, file.name); done('Na download na ang backup mo. I upload mo lang sa Google Drive mo.'); });
        } else {
          // Laptops: download the file, then open their Drive in a new tab so they can drop it in.
          triggerDownload(file, file.name);
          try { window.open('https://drive.google.com/drive/my-drive', '_blank', 'noopener'); } catch (e) { /* popup blocked */ }
          done('Na download na ang backup. Nagbukas ang Google Drive mo sa bagong tab, i drag mo lang doon ang file.');
        }
        break;
      }
      case 'backup-remind-later': { backupReminderDismissed = true; render(); break; }
      case 'install-app': {
        if (deferredInstallPrompt) {
          const p = deferredInstallPrompt;
          deferredInstallPrompt = null;
          installReady = false;
          render();
          p.prompt();
        }
        break;
      }
      case 'monthly-report': { generateMonthlyReportPdf(); break; }
      case 'backup-restore': {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json,.json';
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            let parsed;
            try { parsed = JSON.parse(reader.result); }
            catch (err) { alert("Hindi mabasa ang file na ito. Siguraduhin mong Eksakto backup file ang pinili mo."); return; }
            const data = (parsed && parsed.data) ? parsed.data : parsed;
            const keysPresent = PERSIST_KEYS.filter(k => data && (k in data));
            if (!keysPresent.length) { alert("Hindi ito mukhang Eksakto backup file."); return; }
            if (!confirm('I restore ang backup na ito? Papalitan nito ang lahat ng data mo ngayon sa device na ito, at hindi na ito maibabalik.')) return;
            const patch = {};
            keysPresent.forEach(k => { patch[k] = data[k]; });
            setState(patch);
            showToast('Na restore na ang backup mo.');
          };
          reader.readAsText(file);
        });
        input.click();
        break;
      }

      case 'loan-add-open': setState({ loanModal: { mode: 'add' }, loanStartPickerOpen: false, loanDraft: { id: null, lender: '', amount: '', monthlyDue: '', termMonths: '', startMonth: THIS_MONTH_KEY, remainingBalance: '', dueDay: '', endDate: '', status: 'ongoing' } }); break;
      case 'loan-edit': openEditLoan(id); break;
      case 'loan-delete':
        if (!confirm(`Are you sure you want to delete the loan "${state.loanDraft.lender || 'this loan'}"? This cannot be undone.`)) break;
        setState(s => ({ loans: s.loans.filter(l => l.id !== s.loanDraft.id), loanModal: null, loanDraft: null }));
        break;
      case 'loan-payment-open': setState({ loanPaymentModal: { id }, loanPaymentDraft: { amount: '' } }); break;
      case 'loan-payment-quick': setState(s => ({ loanPaymentDraft: { ...s.loanPaymentDraft, amount: el.dataset.amount } })); break;
      case 'shoot-payment-open': setState({ shootPaymentModal: { id }, shootPaymentDraft: { amount: '', date: TODAY_STR, label: 'Payment' } }); break;
      case 'shoot-payment-quick': setState(s => ({ shootPaymentDraft: { ...s.shootPaymentDraft, amount: el.dataset.amount, label: el.dataset.label || (s.shootPaymentDraft && s.shootPaymentDraft.label) || 'Payment' } })); break;
      case 'shoot-payment-label': setState(s => ({ shootPaymentDraft: { ...s.shootPaymentDraft, label: el.dataset.label } })); break;
      case 'shoot-payment-history-delete': {
        if (!confirm('Remove this logged payment?')) break;
        const targetId = state.shootPaymentModal && state.shootPaymentModal.id;
        const histId = el.dataset.histId;
        setState(s => ({
          shoots: s.shoots.map(sh => {
            if (sh.id !== targetId) return sh;
            const payments = (Array.isArray(sh.payments) ? sh.payments : []).filter(h => h.id !== histId);
            const paid = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
            return { ...sh, payments, paid };
          }),
        }));
        break;
      }
      case 'loan-payment-history-delete': {
        if (!confirm('Remove this logged payment? The amount will be added back to the remaining balance.')) break;
        const targetId = state.loanPaymentModal && state.loanPaymentModal.id;
        const histId = el.dataset.histId;
        setState(s => ({
          loans: s.loans.map(l => {
            if (l.id !== targetId) return l;
            const entry = (l.paymentHistory || []).find(h => h.id === histId);
            if (!entry) return l;
            const newRemaining = (Number(l.remainingBalance) || 0) + (Number(entry.amount) || 0);
            return {
              ...l,
              remainingBalance: newRemaining,
              status: newRemaining > 0 && l.status === 'paid' ? 'ongoing' : l.status,
              paymentHistory: (l.paymentHistory || []).filter(h => h.id !== histId),
            };
          }),
        }));
        break;
      }

      case 'goal-add-open': setState({ goalModal: { mode: 'add' }, goalDraft: { id: null, name: '', target: '', current: '', currency: 'PHP' } }); break;
      case 'goal-currency-pick': setState(s => {
        const newCurrency = el.dataset.currency;
        if (newCurrency === (s.goalDraft.currency || 'PHP')) return {};
        const factor = newCurrency === 'USD' ? (1 / USD_TO_PHP) : USD_TO_PHP;
        const target = s.goalDraft.target ? +(Number(s.goalDraft.target) * factor).toFixed(2) : '';
        const current = s.goalDraft.current ? +(Number(s.goalDraft.current) * factor).toFixed(2) : '';
        return { goalDraft: { ...s.goalDraft, currency: newCurrency, target, current } };
      }); break;
      case 'goal-edit': openEditGoal(id); break;
      case 'goal-delete':
        if (!confirm(`Are you sure you want to delete the goal "${state.goalDraft.name || 'this goal'}"? This cannot be undone.`)) break;
        setState(s => ({ goals: s.goals.filter(g => g.id !== s.goalDraft.id), goalModal: null, goalDraft: null }));
        break;
      case 'goal-fund-open': setState({ goalFundModal: { id }, goalFundDraft: { mode: 'deposit', amount: '', reason: '' } }); break;
      case 'goal-fund-mode': setState(s => ({ goalFundDraft: { ...s.goalFundDraft, mode: el.dataset.mode } })); break;
      case 'goal-fund-history-delete': {
        if (!confirm('Remove this logged entry? Its effect on the saved total will be reversed.')) break;
        const targetId = state.goalFundModal && state.goalFundModal.id;
        const histId = el.dataset.histId;
        setState(s => ({
          goals: s.goals.map(g => {
            if (g.id !== targetId) return g;
            const entry = (g.fundHistory || []).find(h => h.id === histId);
            if (!entry) return g;
            const reverseDelta = entry.mode === 'withdraw' ? (Number(entry.phpAmount) || 0) : -(Number(entry.phpAmount) || 0);
            const newCurrent = Math.max(0, (Number(g.current) || 0) + reverseDelta);
            return { ...g, current: newCurrent, fundHistory: (g.fundHistory || []).filter(h => h.id !== histId) };
          }),
        }));
        break;
      }

      case 'client-add-open': setState({ clientModal: { mode: 'add' }, clientDraft: { id: null, name: '', phone: '', email: '', leadStatus: 'New Lead', followUpDate: '', notes: '' } }); break;
      case 'client-edit': openEditClient(id); break;
      case 'client-delete':
        if (!confirm(`Are you sure you want to delete the client "${state.clientDraft.name || 'this client'}"? This cannot be undone.`)) break;
        setState(s => ({ clients: s.clients.filter(c => c.id !== s.clientDraft.id), clientModal: null, clientDraft: null }));
        break;
      case 'client-view-shoots': ev.stopPropagation(); setState({ chipModal: 'clientshoots:' + id }); break;

      case 'gear-add-open': setState({ gearModal: { mode: 'add' }, gearDraft: { id: null, name: '', date: TODAY_STR, cost: '', status: 'owned', soldName: '', soldFor: '', soldDate: TODAY_STR } }); break;
      case 'gear-edit': {
        const g = state.gearItems.find(x => x.id === id);
        if (g) setState({ gearModal: { mode: 'edit', id: g.id }, gearDraft: { id: g.id, name: g.name || '', date: g.date || '', cost: (g.cost != null && g.cost !== 0) ? String(g.cost) : '', status: g.sold ? 'sold' : 'owned', soldName: g.soldName || '', soldFor: (g.soldFor != null && g.soldFor !== 0) ? String(g.soldFor) : '', soldDate: g.soldDate || TODAY_STR } });
        break;
      }
      case 'gear-delete':
        if (!confirm('Delete this gear item? This cannot be undone.')) break;
        setState(s => ({ gearItems: s.gearItems.filter(g => g.id !== id), gearModal: null, gearDraft: null }));
        break;
      case 'gear-search-clear': setState({ gearSearch: '' }); break;

      case 'doc-type': setState(s => {
        const doctype = el.dataset.doctype;
        if (doctype === 'invoice') {
          const kind = s.docDraft.billingKind || 'soa';
          return { docType: doctype, docDraft: { ...s.docDraft, billingKind: kind, invoiceNumber: nextInvoiceNumber(s, kind) } };
        }
        if (doctype === 'quotation') {
          return { docType: doctype, docDraft: { ...s.docDraft, dueDate: addDays(s.docDraft.date || TODAY_STR, 30) } };
        }
        return { docType: doctype };
      }); break;
      case 'doc-currency': setState(s => ({ docDraft: { ...s.docDraft, currency: el.dataset.cur } })); break;
      case 'doc-billing-kind': setState(s => {
        const kind = el.dataset.kind === 'invoice' ? 'invoice' : 'soa';
        const prefix = kind === 'invoice' ? 'INV' : 'SOA';
        const swapped = (s.docDraft.invoiceNumber || '').replace(/^(SOA|INV)-/, prefix + '-');
        return { docDraft: { ...s.docDraft, billingKind: kind, invoiceNumber: swapped || nextInvoiceNumber(s, kind) } };
      }); break;
      case 'doc-qr-include': setState(s => ({ docDraft: { ...s.docDraft, includeQr: s.docDraft.includeQr === false } })); break;
      case 'doc-qr-remove': setSettings({ paymentQr: '' }); break;
      case 'doc-qr-upload':
        pickImage(480, '#fff', (dataUrl) => setState(s => ({ settings: { ...s.settings, paymentQr: dataUrl }, docDraft: { ...s.docDraft, includeQr: true } })));
        break;
      case 'doc-generate':
        if (!(state.docDraft.clientName || '').trim()) { alert('Please enter a client name before generating.'); break; }
        generateDocPdf();
        if (state.editingDocId) {
          // Editing an existing document — update it in place. Same id and reference
          // number, no duplicate, and the invoice counter is NOT advanced.
          const editId = state.editingDocId;
          setState(s => ({
            documents: s.documents.map(r => r.id === editId
              ? { ...r, type: s.docType, draft: { ...s.docDraft }, updatedAt: new Date().toISOString() }
              : r),
            editingDocId: null,
            docsHistoryOpen: true,
          }));
        } else {
          setState(s => ({
            documents: [...s.documents, { id: 'doc' + Date.now(), type: s.docType, createdAt: new Date().toISOString(), draft: { ...s.docDraft } }],
          }));
          if (state.docType === 'invoice') {
            setState(s => {
              const nextCounter = Math.max(s.invoiceCounter + 1, deriveInvoiceCounter(s.documents));
              localStorage.setItem('shoottracker_invoice_counter', String(nextCounter));
              return { invoiceCounter: nextCounter, docDraft: { ...s.docDraft, invoiceNumber: formatInvoiceNumber(nextCounter, s.docDraft.billingKind || 'soa') } };
            });
          }
        }
        break;
      case 'doc-history-edit': {
        const rec = state.documents.find(r => r.id === id);
        if (rec) setState({ docType: rec.type, docDraft: { ...rec.draft }, editingDocId: rec.id, docsHistoryOpen: false });
        break;
      }
      case 'doc-book-shoot': openBookShootFromDoc(id); break;
      case 'doc-cancel-edit':
        setState(s => ({
          editingDocId: null,
          docDraft: blankDocDraft(nextInvoiceNumber(s, 'soa')),
        }));
        break;
      case 'doc-history-toggle': setState(s => ({ docsHistoryOpen: !s.docsHistoryOpen })); break;
      case 'doc-history-download': {
        const rec = state.documents.find(r => r.id === id);
        if (rec) generateDocPdf(rec.type, rec.draft);
        break;
      }
      case 'doc-history-delete': {
        const rec = state.documents.find(r => r.id === id);
        const recLabel = rec ? `${DOC_TYPE_META[rec.type] ? DOC_TYPE_META[rec.type].title : 'document'} for ${rec.draft.clientName || 'this client'}` : 'this document';
        if (!confirm(`Are you sure you want to delete the ${recLabel}? This cannot be undone.`)) break;
        setState(s => ({ documents: s.documents.filter(r => r.id !== id) }));
        break;
      }
      case 'doc-date-toggle': setState(s => ({ docDatePickerOpen: !s.docDatePickerOpen, docDuePickerOpen: false })); break;
      case 'doc-date-cal-prev': setState(s => { let m = s.docDateCalMonth - 1, y = s.docDateCalYear; if (m < 0) { m = 11; y--; } return { docDateCalMonth: m, docDateCalYear: y }; }); break;
      case 'doc-date-cal-next': setState(s => { let m = s.docDateCalMonth + 1, y = s.docDateCalYear; if (m > 11) { m = 0; y++; } return { docDateCalMonth: m, docDateCalYear: y }; }); break;
      case 'doc-date-pick': setState(s => ({
        docDraft: { ...s.docDraft, date: el.dataset.date, dueDate: addDays(el.dataset.date, s.docType === 'quotation' ? 30 : 10) },
        docDatePickerOpen: false,
      })); break;
      case 'doc-due-toggle': setState(s => ({ docDuePickerOpen: !s.docDuePickerOpen, docDatePickerOpen: false })); break;
      case 'doc-due-cal-prev': setState(s => { let m = s.docDueCalMonth - 1, y = s.docDueCalYear; if (m < 0) { m = 11; y--; } return { docDueCalMonth: m, docDueCalYear: y }; }); break;
      case 'doc-due-cal-next': setState(s => { let m = s.docDueCalMonth + 1, y = s.docDueCalYear; if (m > 11) { m = 0; y++; } return { docDueCalMonth: m, docDueCalYear: y }; }); break;
      case 'doc-due-pick': setState(s => ({ docDraft: { ...s.docDraft, dueDate: el.dataset.date }, docDuePickerOpen: false })); break;
      case 'doc-due-clear': setState(s => ({ docDraft: { ...s.docDraft, dueDate: '' }, docDuePickerOpen: false })); break;

      case 'ftdraft-date-toggle': setState(s => ({ ftDraftDatePickerOpen: !s.ftDraftDatePickerOpen })); break;
      case 'ftdraft-date-cal-prev': setState(s => { let m = s.ftDraftDateCalMonth - 1, y = s.ftDraftDateCalYear; if (m < 0) { m = 11; y--; } return { ftDraftDateCalMonth: m, ftDraftDateCalYear: y }; }); break;
      case 'ftdraft-date-cal-next': setState(s => { let m = s.ftDraftDateCalMonth + 1, y = s.ftDraftDateCalYear; if (m > 11) { m = 0; y++; } return { ftDraftDateCalMonth: m, ftDraftDateCalYear: y }; }); break;
      case 'ftdraft-date-pick': setState(s => ({ ftDraft: { ...s.ftDraft, date: el.dataset.date }, ftDraftDatePickerOpen: false })); break;

      case 'insights-chart-year-prev': setState(s => ({ insightsChartYear: (s.insightsChartYear || TODAY.getFullYear()) - 1 })); break;
      case 'insights-chart-year-next': setState(s => ({ insightsChartYear: (s.insightsChartYear || TODAY.getFullYear()) + 1 })); break;
      case 'insights-chart-month-select': setState({ insightsChartSelectedMonth: el.dataset.month }); break;

      case 'modal-close':
        if (el.dataset.which === 'shoot') { setState({ shootConfirmCloseOpen: true }); break; }
        closeModalOf(el.dataset.which);
        break;
      case 'modal-backdrop-close':
        if (el.dataset.which === 'shoot') { setState({ shootConfirmCloseOpen: true }); break; }
        // For data-entry modals, ignore clicks on the backdrop (outside the box) so an
        // accidental click doesn't discard whatever is being typed. Close with the ✕ button.
        if (['gear', 'loan', 'loanpayment', 'shootpayment', 'goal', 'goalfund', 'client'].includes(el.dataset.which)) break;
        closeModalOf(el.dataset.which);
        break;
      case 'finance-breakdown': setState({ financeBreakdown: el.dataset.key }); break;
      case 'finance-export-open': setState({ financeExportOpen: true, dpKey: null, exportCustom: { from: defaultCustomFrom(), to: TODAY_STR } }); break;
      case 'finance-export-range': setState({ financeExportRange: el.dataset.range, dpKey: null }); break;
      case 'finance-export-csv': exportIncomeCSV(); break;
      case 'finance-export-pdf': exportIncomePDF(); break;
      case 'expense-export-open': setState({ expenseExportOpen: true, dpKey: null, exportCustom: { from: defaultCustomFrom(), to: TODAY_STR } }); break;
      case 'expense-export-range': setState({ expenseExportRange: el.dataset.range, dpKey: null }); break;
      case 'expense-export-csv': exportExpenseCSV(); break;
      case 'expense-export-pdf': exportExpensePDF(); break;
      case 'reschedule-cancel': setState({ rescheduleDraft: null }); break;
      case 'reschedule-confirm': setState(s => { const d = s.rescheduleDraft; if (!d) return { rescheduleDraft: null }; return { shoots: s.shoots.map(sh => sh.id === d.id ? { ...sh, date: d.to } : sh), rescheduleDraft: null, selectedDate: d.to }; }); break;
      case 'shoot-confirm-close-cancel': setState({ shootConfirmCloseOpen: false }); break;
      case 'shoot-confirm-close-confirm': setState({ modal: null, draft: null, shootConfirmCloseOpen: false }); break;
      default: break;
    }
  }

  function closeModalOf(which) {
    if (state.dpKey) setState({ dpKey: null });
    if (which === 'shoot') setState({ modal: null, draft: null, shootConfirmCloseOpen: false });
    else if (which === 'telegram') setState({ telegramModalOpen: false });
    else if (which === 'loan') setState({ loanModal: null, loanDraft: null, loanStartPickerOpen: false });
    else if (which === 'loanpayment') setState({ loanPaymentModal: null, loanPaymentDraft: null });
    else if (which === 'shootpayment') setState({ shootPaymentModal: null, shootPaymentDraft: null });
    else if (which === 'goal') setState({ goalModal: null, goalDraft: null });
    else if (which === 'goalfund') setState({ goalFundModal: null, goalFundDraft: null });
    else if (which === 'client') setState({ clientModal: null, clientDraft: null });
    else if (which === 'gear') setState({ gearModal: null, gearDraft: null });
    else if (which === 'financebreakdown') setState({ financeBreakdown: null });
    else if (which === 'financeexport') setState({ financeExportOpen: false });
    else if (which === 'expenseexport') setState({ expenseExportOpen: false });
    else if (which === 'chip') setState({ chipModal: null });
    else if (which === 'expcat') setState({ expReassignId: null, expNewCatDraft: '' });
    else if (which === 'shootstatus') setState({ shootStatusModal: null });
  }

  function modalExpenseCategory() {
    if (!state.expReassignId) return '';
    const e = (state.expenses || []).find(x => x.id === state.expReassignId);
    if (!e) return '';
    const current = categoryOfExpense(e, buildCategoryRules(state.expenses));
    const customCats = [...new Set((state.expenses || []).map(x => x.category).filter(c => c && !expenseCategories().includes(c)))];
    const allCats = [...expenseCategories().filter(c => c !== 'Other'), ...customCats, 'Other'];
    return `
    <div class="modal-backdrop chip" data-action="modal-backdrop-close" data-which="expcat">
      <form class="modal-box" style="width:340px" data-stop>
        <div class="modal-head"><div class="modal-title">Move to…</div><button type="button" class="modal-close" data-action="modal-close" data-which="expcat">✕</button></div>
        <div style="font-size:12.5px;color:oklch(0.45 0.015 150);margin-bottom:4px">${esc(e.description || 'Untitled')} · <strong>${fmtMoney(e.amount)}</strong></div>
        <div style="font-size:11px;color:oklch(0.55 0.015 150);margin-bottom:14px">The app will remember this for future "${esc(expenseRuleKey(e.description || ''))}" entries.</div>
        <div style="display:flex;flex-direction:column;gap:6px;max-height:46vh;overflow-y:auto">
          ${allCats.map(cat => { const on = cat === current; const isCustom = !expenseCategories().includes(cat); return `<button type="button" data-action="exp-cat-set" data-id="${esc(e.id)}" data-cat="${esc(cat)}" style="all:unset;cursor:pointer;box-sizing:border-box;width:100%;padding:11px 14px;border-radius:10px;font-size:13px;font-weight:${on ? '700' : '500'};background:${on ? 'oklch(0.92 0.05 150)' : 'var(--card2)'};color:${on ? 'oklch(0.4 0.13 150)' : 'oklch(0.3 0.02 150)'};border:1px solid ${on ? 'oklch(0.45 0.14 150)' : 'transparent'}">${esc(cat)}${isCustom ? ' <span style="font-size:9px;color:oklch(0.55 0.015 150);font-weight:600">custom</span>' : ''}${on ? ' ✓' : ''}</button>`; }).join('')}
        </div>
        <div style="margin-top:12px;border-top:1px solid var(--border2);padding-top:12px">
          <div style="font-size:10.5px;font-weight:700;color:oklch(0.5 0.015 150);text-transform:uppercase;margin-bottom:6px">Or create a new one</div>
          <div style="display:flex;gap:8px">
            <input type="text" value="${esc(state.expNewCatDraft || '')}" data-bind="expNewCatDraft" placeholder="e.g. Talent Fees" style="flex:1;min-width:0;box-sizing:border-box;background:var(--card);border:1px solid var(--border3);border-radius:9px;padding:9px 11px;color:inherit;font-size:13px;font-family:inherit"/>
            <button type="button" data-action="exp-cat-set-new" data-id="${esc(e.id)}" style="all:unset;cursor:pointer;flex:none;padding:9px 15px;border-radius:9px;font-size:12.5px;font-weight:700;background:oklch(0.45 0.14 150);color:oklch(1 0 0)">Add</button>
          </div>
        </div>
        ${e.category ? `<button type="button" data-action="exp-cat-clear" data-id="${esc(e.id)}" style="all:unset;cursor:pointer;display:block;text-align:center;width:100%;box-sizing:border-box;margin-top:12px;padding:9px;font-size:12px;font-weight:600;color:oklch(0.55 0.015 150)">↺ Reset to automatic</button>` : ''}
      </form>
    </div>`;
  }

  // One-click "boss-ready" PDF: a full summary of the current month —
  // shoots by status, revenue (booked vs collected), outstanding, expenses, and net.
  // Status label that matches what the board shows for each project kind: Real Estate uses
  // the base labels; General Project Shoot+Edit uses To Shoot/Editing/…, Edit-only uses To Edit/….
  function shootStatusLabel(s) {
    const st = normalizeShootStatus(s.status);
    const isGeneral = normalizeShootType(s.shootType) !== 'Real Estate';
    if (!isGeneral) return statusMeta(st).label;
    const map = (s.serviceType === 'edit')
      ? { idea: 'To Edit', shot: 'Editing', approval: 'For Approval', posted: 'Completed' }
      : { tentative: 'Tentative', idea: 'To Shoot', shot: 'Editing', approval: 'For Approval', posted: 'Completed' };
    return map[st] || statusMeta(st).label;
  }
  function generateMonthlyReportPdf() {
    const jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) { window.print(); return; }
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const PAGE_W = 612, PAGE_H = 792;
    const marginX = 56, rightX = PAGE_W - marginX;
    const BRAND = [31, 107, 64], INK = [30, 32, 30], GRAY = [110, 115, 110], LINE = [222, 228, 222];
    let y = 0;
    const ensureSpace = (needed) => { if (y + needed > PAGE_H - 56) { doc.addPage(); y = 56; } };
    // Helvetica has no ₱ glyph — use a plain "PHP " prefix so widths measure correctly.
    const money = (n) => 'PHP ' + (Number(n) || 0).toLocaleString('en-PH');

    const monthKey = THIS_MONTH_KEY;
    const monthLabel = new Date(monthKey + '-01T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const monthShoots = state.shoots.filter(s => s.date && s.date.slice(0, 7) === monthKey);
    const statusCounts = {};
    monthShoots.forEach(s => { const lbl = shootStatusLabel(s); statusCounts[lbl] = (statusCounts[lbl] || 0) + 1; });
    const booked = monthShoots.reduce((a, s) => a + (Number(s.package) || 0), 0);
    // Collected = money actually received IN this month (by payment date / paidDate),
    // so the report agrees with the Dashboard and Finances instead of the shoot-date total.
    const collected = state.shoots.reduce((a, s) => a + shootCollectedInMonth(s, monthKey), 0);
    const outstanding = monthShoots.filter(s => s.status !== 'tentative').reduce((a, s) => a + Math.max((Number(s.package) || 0) - shootPaidTotal(s), 0), 0);
    const expenses = state.expenses.filter(e => e.date && e.date.slice(0, 7) === monthKey).reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const net = collected - expenses;

    // Header
    y = 56;
    doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(20);
    doc.text('Monthly Summary', marginX, y);
    y += 20;
    doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]); doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(`${monthLabel}  ·  ${bizName()}`, marginX, y);
    y += 14;
    doc.setFontSize(9);
    doc.text('Generated ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), marginX, y);
    y += 12;
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(marginX, y, rightX, y);
    y += 26;

    const sectionTitle = (t) => { ensureSpace(30); doc.setTextColor(INK[0], INK[1], INK[2]); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(t, marginX, y); y += 17; };
    const kv = (label, value, opts) => {
      opts = opts || {};
      ensureSpace(18);
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal'); doc.setFontSize(opts.bold ? 12 : 11);
      const col = opts.brand ? BRAND : INK;
      doc.setTextColor(col[0], col[1], col[2]);
      doc.text(String(label), marginX, y);
      doc.text(String(value), rightX, y, { align: 'right' });
      y += opts.bold ? 20 : 16;
    };

    // Financial overview
    sectionTitle('Financial Overview');
    kv('Revenue booked', money(booked));
    kv('Collected (paid)', money(collected));
    kv('Outstanding balance', money(outstanding));
    kv('Expenses', money(expenses));
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(marginX, y - 2, rightX, y - 2); y += 12;
    kv('Net (collected − expenses)', money(net), { bold: true, brand: true });
    y += 14;

    // Shoots by status
    sectionTitle('Shoots this month · ' + monthShoots.length + ' total');
    if (!monthShoots.length) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
      doc.text('No dated shoots this month.', marginX, y); y += 16;
    } else {
      const STATUS_LABEL_ORDER = ['Tentative', 'Booked', 'To Shoot', 'To Edit', 'Resched', 'Editing', 'For Approval', 'Completed'];
      STATUS_LABEL_ORDER.forEach(lbl => { if (statusCounts[lbl]) kv(lbl, String(statusCounts[lbl])); });
      Object.keys(statusCounts).forEach(lbl => { if (STATUS_LABEL_ORDER.indexOf(lbl) < 0) kv(lbl, String(statusCounts[lbl])); });
    }
    y += 12;

    // Shoot details table
    if (monthShoots.length) {
      sectionTitle('Shoot Details');
      const cName = marginX, cStatus = marginX + 205, cPkg = 404, cPaid = 480, cBal = rightX;
      ensureSpace(20);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
      doc.text('CLIENT / PROJECT', cName, y);
      doc.text('STATUS', cStatus, y);
      doc.text('PACKAGE', cPkg, y, { align: 'right' });
      doc.text('PAID', cPaid, y, { align: 'right' });
      doc.text('BALANCE', cBal, y, { align: 'right' });
      y += 10; doc.setDrawColor(LINE[0], LINE[1], LINE[2]); doc.line(marginX, y, rightX, y); y += 14;
      monthShoots.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).forEach(s => {
        ensureSpace(16);
        const bal = Math.max((Number(s.package) || 0) - (Number(s.paid) || 0), 0);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(INK[0], INK[1], INK[2]);
        const name = String(s.client || 'Untitled');
        doc.text(name.length > 30 ? name.slice(0, 29) + '…' : name, cName, y);
        doc.setFontSize(9); doc.setTextColor(GRAY[0], GRAY[1], GRAY[2]);
        doc.text(shootStatusLabel(s), cStatus, y);
        doc.setFontSize(10); doc.setTextColor(INK[0], INK[1], INK[2]);
        doc.text(money(s.package || 0), cPkg, y, { align: 'right' });
        doc.text(money(s.paid || 0), cPaid, y, { align: 'right' });
        doc.text(money(bal), cBal, y, { align: 'right' });
        y += 15;
      });
    }

    doc.save(`${fileSlug()}_monthly_summary_${monthKey}.pdf`);
  }

  function generateDocPdf(overrideType, overrideDraft) {
    const jspdf = window.jspdf;
    if (!jspdf || !jspdf.jsPDF) { window.print(); return; }
    const { jsPDF } = jspdf;
    const d = overrideDraft || state.docDraft;
    const docType = overrideType || state.docType;
    const isInvoice = docType === 'invoice';
    const meta = DOC_TYPE_META[docType];
    // Billing doc is explicitly an Invoice or a Statement of Account (docDraft.billingKind).
    const isInvDoc = isInvoice && (d.billingKind || 'soa') === 'invoice';
    const pdfDocTitle = isInvoice ? (isInvDoc ? 'Invoice' : 'Statement of Account') : meta.title;
    const pdfRefLabel = isInvoice ? (isInvDoc ? 'Invoice No.' : 'SOA No.') : 'Reference No.';
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });

    const PAGE_W = 612, PAGE_H = 792;
    const marginX = 56, contentW = PAGE_W - marginX * 2, rightX = PAGE_W - marginX;
    const BRAND = [31, 107, 64];
    const INK = [30, 32, 30];
    const GRAY = [110, 115, 110];
    const LINE = [222, 228, 222];
    let y = 0;

    const ensureSpace = (needed) => {
      if (y + needed > PAGE_H - 70) { doc.addPage(); y = 56; }
    };
    // The standard PDF fonts (Helvetica etc.) don't include the ₱ glyph — jsPDF silently
    // truncates it to the wrong character and mis-measures the string width, causing both
    // a garbled symbol and text overflow. For amounts embedded in flowing sentences we use
    // a plain "PHP" prefix (safe, correctly measured). For standalone amount displays we
    // hand-draw an actual peso sign (a bold "P" with two strike bars) so it still reads as ₱.
    // Invoices can be billed in USD for foreign clients. The "$" glyph exists in the standard
    // PDF fonts, so USD amounts render directly; PHP still needs the "PHP" prefix / hand-drawn ₱.
    const isUSD = isInvoice && d.currency === 'USD';
    const pdfFmtMoney = (n) => (isUSD ? '$' : 'PHP ') + (Number(n) || 0).toLocaleString(isUSD ? 'en-US' : 'en-PH');
    // Any free-text field (line items, payment details, notes) can contain a real ₱ character
    // typed by the user or embedded by the app's own fmtMoney() helper — same font problem as
    // above, so strip it before it ever reaches doc.text()/splitTextToSize().
    const sanitizePeso = (s) => String(s || '').replace(/₱/g, 'PHP ');
    // splitTextToSize doesn't respect embedded "\n" as real line breaks — it treats the whole
    // string as one paragraph and only wraps at the given width, collapsing intentional line
    // breaks (e.g. between breakdown items) into a single run-on line. Split on "\n" ourselves
    // first, then wrap each resulting line individually so breaks are preserved.
    const wrapMultiline = (str, maxWidth) => {
      const lines = sanitizePeso(str).split('\n').map(s => s.trim()).filter(Boolean);
      let out = [];
      lines.forEach(line => { out = out.concat(doc.splitTextToSize(line, maxWidth)); });
      return out;
    };
    const drawPeso = (amount, x, yPos, fontSize, color, bold) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      doc.text('P', x, yPos);
      const pW = doc.getTextWidth('P');
      doc.setDrawColor(...color);
      doc.setLineWidth(Math.max(0.6, fontSize * 0.05));
      const barX0 = x - fontSize * 0.10, barX1 = x + pW * 0.60;
      doc.line(barX0, yPos - fontSize * 0.52, barX1, yPos - fontSize * 0.52);
      doc.line(barX0, yPos - fontSize * 0.37, barX1, yPos - fontSize * 0.37);
      const amtStr = (Number(amount) || 0).toLocaleString('en-PH');
      doc.text(amtStr, x + pW + fontSize * 0.1, yPos);
      return x + pW + fontSize * 0.1 + doc.getTextWidth(amtStr);
    };
    // Measures a drawPeso() call's total width without drawing it, so a prominent amount can
    // be right-aligned against a fixed edge (draw at rightEdge - measurePeso(...)).
    const measurePeso = (amount, fontSize, bold) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      const pW = doc.getTextWidth('P');
      const amtStr = (Number(amount) || 0).toLocaleString('en-PH');
      return pW + fontSize * 0.1 + doc.getTextWidth(amtStr);
    };
    // Currency-aware wrappers for prominent standalone amounts: USD draws a normal "$1,234"
    // (the glyph exists), PHP falls back to the hand-drawn peso sign.
    const drawMoney = (amount, x, yPos, fontSize, color, bold) => {
      if (!isUSD) return drawPeso(amount, x, yPos, fontSize, color, bold);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      const str = '$' + (Number(amount) || 0).toLocaleString('en-US');
      doc.text(str, x, yPos);
      return x + doc.getTextWidth(str);
    };
    const measureMoney = (amount, fontSize, bold) => {
      if (!isUSD) return measurePeso(amount, fontSize, bold);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      return doc.getTextWidth('$' + (Number(amount) || 0).toLocaleString('en-US'));
    };

    // Hand-drawn "pol." mark (ring-style p/o, solid l, dot, red rec-dot) — recreated as
    // vector shapes so it doesn't depend on any external logo image file. bgColor is the
    // color drawn "through" the ring letters' holes, so it must match whatever this sits on.
    const drawPolMark = (x, yTop, H, markColor, bgColor) => {
      const xTop = yTop + H * 0.30;
      const baseline = yTop + H * 0.82;
      const descBottom = yTop + H * 1.05;
      const bowlR = (baseline - xTop) / 2;
      const ringT = bowlR * 0.55;
      const stemW = ringT * 0.95;

      doc.setFillColor(...markColor);
      doc.rect(x, xTop, stemW, descBottom - xTop, 'F');
      const pCx = x + stemW + bowlR - ringT * 0.15, pCy = xTop + bowlR;
      doc.circle(pCx, pCy, bowlR, 'F');
      doc.setFillColor(...bgColor);
      doc.circle(pCx, pCy, bowlR - ringT, 'F');

      doc.setFillColor(...markColor);
      const oCx = pCx + bowlR * 2 + ringT * 0.3 - ringT * 0.15;
      doc.circle(oCx, pCy, bowlR, 'F');
      doc.setFillColor(...bgColor);
      doc.circle(oCx, pCy, bowlR - ringT, 'F');

      doc.setFillColor(...markColor);
      const lX = oCx + bowlR + ringT * 0.5;
      doc.rect(lX, yTop, stemW, baseline - yTop, 'F');

      const dotR = stemW * 0.65;
      const dotX = lX + stemW + ringT * 0.7 + dotR;
      doc.circle(dotX, baseline - dotR, dotR, 'F');

      const recCx = dotX + dotR + bowlR * 0.95;
      const recCy = yTop + H * 0.5;
      const recOuterR = bowlR * 0.62;
      doc.setDrawColor(200, 40, 35);
      doc.setLineWidth(recOuterR * 0.3);
      doc.circle(recCx, recCy, recOuterR, 'S');
      doc.setFillColor(200, 40, 35);
      doc.circle(recCx, recCy, recOuterR * 0.48, 'F');

      return recCx + recOuterR;
    };

    const DARK = [22, 23, 22];
    const BRAND_PALE = [243, 247, 244];
    const colW = contentW / 2 - 16;
    const col2X = marginX + contentW / 2 + 16;
    const truncate = (str, maxW) => {
      const lines = doc.splitTextToSize(str, maxW);
      return lines[0] + (lines.length > 1 ? '…' : '');
    };

    // ---- top row: small logo badge + doc title ----
    const badgeSize = 46, badgeY = 42;
    // Buyer's logo if set, otherwise a dark badge with their initials.
    let logoDrawn = false;
    if (S().logo) {
      try {
        const props = doc.getImageProperties(S().logo);
        const r = Math.min(badgeSize / props.width, badgeSize / props.height);
        doc.addImage(S().logo, 'PNG', marginX, badgeY + (badgeSize - props.height * r) / 2, props.width * r, props.height * r);
        logoDrawn = true;
      } catch (e) { logoDrawn = false; }
    }
    if (!logoDrawn) {
      doc.setFillColor(...DARK);
      doc.roundedRect(marginX, badgeY, badgeSize, badgeSize, 10, 10, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(255, 255, 255);
      doc.text(bizInitials(), marginX + badgeSize / 2, badgeY + 29, { align: 'center' });
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...INK);
    doc.text(pdfDocTitle.toUpperCase(), rightX, badgeY + 16, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
    doc.text(sanitizePeso(bizName()), rightX, badgeY + 30, { align: 'right' });
    if (isInvoice) doc.text(`${pdfRefLabel} ${d.invoiceNumber || ''}`, rightX, badgeY + 43, { align: 'right' });

    y = badgeY + badgeSize + 28;

    // ---- meta row: issue date / due date / status (invoice) or project / type (others) ----
    const metaColW = contentW / 3;
    const metaField = (label, value, xOff, color) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      doc.text(label, marginX + xOff, y);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...(color || INK));
      doc.text(value, marginX + xOff, y + 16);
    };
    if (isInvoice) {
      const statusColor = d.paymentStatus === 'Paid' ? BRAND : d.paymentStatus === 'Partial' ? [180, 130, 20] : [180, 45, 40];
      metaField('ISSUE DATE', fmtDateShortYear(d.date), 0);
      metaField('DUE DATE', fmtDateShortYear(d.dueDate), metaColW);
      metaField('PAYMENT STATUS', (d.paymentStatus || 'Unpaid').toUpperCase(), metaColW * 2, statusColor);
    } else if (docType === 'quotation') {
      metaField('ISSUE DATE', fmtDateShortYear(d.date), 0);
      metaField('VALID UNTIL', d.dueDate ? fmtDateShortYear(d.dueDate) : 'No expiry', metaColW, BRAND);
      metaField('PROJECT', truncate(sanitizePeso(d.description) || '', metaColW - 16), metaColW * 2);
    } else {
      metaField('ISSUE DATE', fmtDateShortYear(d.date), 0);
      metaField('PROJECT / SERVICE', truncate(sanitizePeso(d.description) || '', metaColW - 16), metaColW);
      metaField('DOCUMENT TYPE', 'Contract', metaColW * 2);
    }
    y += 42;
    doc.setDrawColor(...LINE); doc.setLineWidth(1);
    doc.line(marginX, y, rightX, y);
    y += 26;

    // ---- billed by / billed to ----
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
    doc.text(docType === 'quotation' ? 'PREPARED BY' : 'BILLED BY', marginX, y);
    doc.text(docType === 'quotation' ? 'PREPARED FOR' : 'BILLED TO', col2X, y);
    y += 16;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...INK);
    doc.text(sanitizePeso(ownerName() || bizName()), marginX, y);
    doc.text(sanitizePeso(d.clientName) || '[Client Name]', col2X, y);
    y += 15;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRAY);
    const byLines = [S().tagline, S().contactLine].filter(Boolean).map(t => sanitizePeso(t));
    byLines.forEach((line, i) => doc.text(truncate(line, colW), marginX, y + i * 12));
    const contactLines = wrapMultiline(d.clientContact || 'No contact details provided', colW);
    contactLines.forEach((line, i) => doc.text(line, col2X, y + i * 12));
    y += Math.max(contactLines.length, byLines.length, 1) * 12 + 24;

    doc.setDrawColor(...LINE); doc.setLineWidth(1);
    doc.line(marginX, y, rightX, y);
    y += 24;

    // ---- main content: itemized table (invoice) or descriptive paragraph (contract/quotation) ----
    if (isInvoice) {
      ensureSpace(60);
      doc.setFillColor(...BRAND_PALE);
      doc.rect(marginX, y, contentW, 24, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
      doc.text('ITEM', marginX + 12, y + 16);
      doc.text('AMOUNT', rightX - 12, y + 16, { align: 'right' });
      y += 24;
      const items = parseLineItems(d.lineItems);
      const rows = items.length ? items : [{ label: 'No items listed', amount: null }];
      rows.forEach(it => {
        const labelLines = doc.splitTextToSize(sanitizePeso(it.label), contentW - 150);
        const rowH = Math.max(labelLines.length, 1) * 14 + 12;
        ensureSpace(rowH);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...INK);
        labelLines.forEach((ln, i) => doc.text(ln, marginX + 12, y + 17 + i * 14));
        doc.text(it.amount != null ? pdfFmtMoney(it.amount) : '', rightX - 12, y + 17, { align: 'right' });
        y += rowH;
        doc.setDrawColor(...LINE); doc.setLineWidth(0.75);
        doc.line(marginX, y, rightX, y);
      });
      y += 20;
    } else if (docType === 'quotation') {
      // intro paragraph
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...INK);
      const introLines = doc.splitTextToSize(sanitizePeso(meta.body(d, pdfFmtMoney)), contentW);
      ensureSpace(introLines.length * 15 + 24);
      introLines.forEach(line => { doc.text(line, marginX, y); y += 15; });
      y += 14;
      // inclusions — numbered badges inside a bordered container (mirrors the on-screen preview)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
      doc.text('INCLUSIONS', marginX, y); y += 12;
      const qitems = parseLineItems(d.lineItems);
      const qrows = qitems.length ? qitems
        : [{ label: sanitizePeso(d.description) || 'Professional service', amount: (Number(d.amount) || 0) ? Number(d.amount) : null }];
      const qPadX = 14, qBadge = 16, qGap = 10, qLabelX = marginX + qPadX + qBadge + qGap, qLabelW = contentW - qPadX * 2 - qBadge - qGap - 92;
      const qLayout = qrows.map(it => {
        const lines = doc.splitTextToSize(sanitizePeso(it.label), qLabelW);
        return { it, lines, h: Math.max(lines.length, 1) * 13 + 16 };
      });
      const qBoxH = qLayout.reduce((a, r) => a + r.h, 0);
      ensureSpace(qBoxH + 8);
      doc.setDrawColor(...LINE); doc.setLineWidth(1);
      doc.roundedRect(marginX, y, contentW, qBoxH, 10, 10, 'D');
      let qry = y;
      qLayout.forEach((r, i) => {
        if (i > 0) { doc.setDrawColor(...LINE); doc.setLineWidth(0.75); doc.line(marginX, qry, marginX + contentW, qry); }
        const textY = qry + 17;
        doc.setFillColor(...BRAND_PALE);
        doc.roundedRect(marginX + qPadX, qry + 9, qBadge, qBadge, 5, 5, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BRAND);
        doc.text(String(i + 1), marginX + qPadX + qBadge / 2, qry + 9 + qBadge / 2 + 3.2, { align: 'center' });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...INK);
        r.lines.forEach((ln, j) => doc.text(ln, qLabelX, textY + j * 13));
        if (r.it.amount != null) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
          doc.text(pdfFmtMoney(r.it.amount), marginX + contentW - qPadX, textY, { align: 'right' });
        }
        qry += r.h;
      });
      y += qBoxH + 20;
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(...INK);
      const bodyLines = doc.splitTextToSize(sanitizePeso(meta.body(d, pdfFmtMoney)), contentW);
      ensureSpace(bodyLines.length * 15 + 10);
      bodyLines.forEach(line => { doc.text(line, marginX, y); y += 15; });
      y += 16;
    }

    // ---- invoice: package summary (total package minus what's already paid) ----
    // Only shown when the invoice was auto-filled from a shoot, so a milestone payment
    // (e.g. "50% Final Delivery") doesn't look like an unexplained item in the table above —
    // it's clearly a running total, not another charge.
    if (isInvoice && d.packageTotal) {
      ensureSpace(50);
      const sumW = 230, sumX = rightX - sumW;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRAY);
      doc.text('Total Package', sumX, y);
      doc.text(pdfFmtMoney(d.packageTotal), rightX, y, { align: 'right' });
      y += 15;
      if (Number(d.paidToDate) > 0) {
        doc.text('Less: Paid to Date', sumX, y);
        doc.text('- ' + pdfFmtMoney(d.paidToDate), rightX, y, { align: 'right' });
        y += 15;
      }
      doc.setDrawColor(...LINE); doc.setLineWidth(0.75);
      doc.line(sumX, y + 2, rightX, y + 2);
      y += 22;
    }

    // ---- bottom: payment details + total (invoice) or total only (contract/quotation) ----
    if (isInvoice) {
      ensureSpace(90);
      const leftW = contentW * 0.52, boxW = contentW - leftW - 20, boxX = marginX + leftW + 20, startY = y;
      let ly = startY;
      if (d.paymentDetails) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
        doc.text('PAYMENT DETAILS', marginX, ly);
        ly += 14;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
        const payLines = wrapMultiline(d.paymentDetails, leftW);
        payLines.forEach(line => { doc.text(line, marginX, ly); ly += 13; });
      }
      const hasMilestone = !!d.milestoneLabel;
      const boxH = hasMilestone ? 70 : 58;
      doc.setDrawColor(...LINE); doc.setFillColor(...BRAND_PALE);
      doc.roundedRect(boxX, startY - 8, boxW, boxH, 8, 8, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
      doc.text('TOTAL AMOUNT DUE', boxX + 14, startY + 10);
      let pesoY = startY + 38;
      if (hasMilestone) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
        doc.text(sanitizePeso(d.milestoneLabel), boxX + 14, startY + 22);
        pesoY = startY + 50;
      }
      const totW = measureMoney(d.amount, 18, true);
      drawMoney(d.amount, boxX + boxW - 14 - totW, pesoY, 18, INK, true);
      y = Math.max(ly, startY - 8 + boxH) + 26;

      // Optional payment QR (GCash/Maya/bank) — embedded under the payment area so the client can scan.
      // Reusable image stored on the device; shown only when the invoice opts in and a QR exists.
      let _qr = '';
      _qr = (d.includeQr !== false) ? (S().paymentQr || '') : '';
      if (_qr) {
        const qrSize = 96;
        ensureSpace(qrSize + 24);
        try { doc.addImage(_qr, 'PNG', marginX, y, qrSize, qrSize); } catch (err) { _qr = ''; }
        if (_qr) {
          const qtx = marginX + qrSize + 16;
          doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...BRAND);
          doc.text('SCAN TO PAY', qtx, y + 16);
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRAY);
          doc.splitTextToSize('Scan this QR with GCash, Maya or your banking app to settle the amount due above.', contentW - qrSize - 30)
            .forEach((ln, i) => doc.text(ln, qtx, y + 32 + i * 13));
          y += qrSize + 20;
        }
      }
    } else if (docType === 'quotation') {
      // Prominent Total Proposed Rate box (mirrors preview). No separate "Subtotal" row —
      // per-item prices already appear in the inclusions list, and a subtotal that didn't
      // match the headline rate read as a contradiction on the client-facing quote.
      ensureSpace(90);
      const boxW = 250, boxX = rightX - boxW;
      doc.setDrawColor(...LINE); doc.setFillColor(...BRAND_PALE);
      doc.roundedRect(boxX, y, boxW, 56, 10, 10, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
      doc.text('TOTAL PROPOSED RATE', boxX + 16, y + 20);
      drawPeso(d.amount, boxX + 16, y + 44, 20, INK, true);
      y += 56 + 24;
      // Next Step — green-tinted box with a left accent bar
      const nsLines = doc.splitTextToSize(sanitizePeso(S().quoteNextStep || ''), contentW - 32);
      const nsH = nsLines.length * 13 + 32;
      ensureSpace(nsH + 10);
      doc.setFillColor(230, 241, 233); doc.roundedRect(marginX, y, contentW, nsH, 8, 8, 'F');
      doc.setFillColor(...BRAND); doc.rect(marginX, y, 4, nsH, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
      doc.text('NEXT STEP', marginX + 16, y + 17);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...INK);
      nsLines.forEach((line, i) => doc.text(line, marginX + 16, y + 32 + i * 13));
      y += nsH + 22;
      // Payment Terms
      ensureSpace(44);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
      doc.text('PAYMENT TERMS', marginX, y); y += 14;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRAY);
      doc.splitTextToSize(sanitizePeso(S().quoteTerms || ''), contentW).forEach(line => { doc.text(line, marginX, y); y += 13; });
      y += 10;
    } else {
      ensureSpace(70);
      const boxW = 230, boxX = rightX - boxW;
      doc.setDrawColor(...LINE); doc.setFillColor(...BRAND_PALE);
      doc.roundedRect(boxX, y, boxW, 54, 8, 8, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
      doc.text('TOTAL CONTRACT VALUE', boxX + 14, y + 17);
      const totW2 = measurePeso(d.amount, 17, true);
      drawPeso(d.amount, boxX + boxW - 14 - totW2, y + 41, 17, INK, true);
      y += 54 + 26;
    }

    // ---- notes ----
    if (d.notes) {
      ensureSpace(40);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...BRAND);
      doc.text('NOTES', marginX, y);
      y += 14;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRAY);
      const noteLines = wrapMultiline(d.notes, contentW);
      noteLines.forEach(line => { doc.text(line, marginX, y); y += 13; });
      y += 10;
    }

    // ---- signature block (contract only) ----
    if (docType === 'contract') {
      ensureSpace(90);
      y += 20;
      const sigW = colW;
      doc.setDrawColor(...INK); doc.setLineWidth(0.75);
      doc.line(marginX, y, marginX + sigW, y);
      doc.line(marginX + sigW + 24, y, marginX + sigW + 24 + sigW, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
      doc.text('Client Signature', marginX, y + 14);
      doc.text(sanitizePeso(bizName()), marginX + sigW + 24, y + 14);
      doc.text(`Printed Name: ${d.clientName || '_______________'}`, marginX, y + 28);
      doc.text(`Printed Name: ${sanitizePeso(ownerName()) || '_______________'}`, marginX + sigW + 24, y + 28);
      y += 44;
    }

    // ---- footer ----
    doc.setDrawColor(...LINE); doc.setLineWidth(0.75);
    doc.line(marginX, PAGE_H - 50, rightX, PAGE_H - 50);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
    doc.text(sanitizePeso(bizName()) + ' · Made with Eksakto', marginX, PAGE_H - 36);
    doc.text(fmtDateLong(TODAY_STR), rightX, PAGE_H - 36, { align: 'right' });

    const filePrefix = isInvoice ? (isInvDoc ? 'Invoice' : 'Statement-of-Account') : docType;
    doc.save(`${filePrefix}-${(d.clientName || 'document').replace(/\s+/g, '-')}.pdf`);
  }

  /* ---------------- generic bind handling ---------------- */

  function applyBind(path, value) {
    state = setPath(state, path, value);
    if (PERSIST_KEYS.includes(path.split('.')[0])) persist();
  }

  function applySpecialSideEffect(special, value) {
    if (special === 'packageTier') {
      const meta = getLiveTiers().find(t => t.value === value);
      state = setPath(state, 'draft.packageTier', value);
      if (meta && meta.price !== null) state = setPath(state, 'draft.package', meta.price);
    } else if (special === 'shootStatus') {
      state = setPath(state, 'draft.status', value);
      if (value === 'tentative') state = setPath(state, 'draft.date', '');
    }
  }

  /* ---------------- event wiring ---------------- */

  let listenersWired = false;

  function wireListeners() {
    if (listenersWired) return;
    listenersWired = true;
    const app = document.getElementById('app');

    app.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if ((state.shootDatePickerOpen || state.timePickerOpen || state.shootDeadlinePickerOpen || state.docDatePickerOpen || state.docDuePickerOpen || state.ftDraftDatePickerOpen || state.loanStartPickerOpen || state.dpKey) && !e.target.closest('[data-picker-popover]')) {
        const action = actionEl ? actionEl.dataset.action : null;
        if (action !== 'date-picker-toggle' && action !== 'time-picker-toggle' && action !== 'deadline-picker-toggle' && action !== 'doc-date-toggle' && action !== 'doc-due-toggle' && action !== 'ftdraft-date-toggle' && action !== 'loan-start-toggle' && action !== 'dp-toggle') {
          setState({ shootDatePickerOpen: false, timePickerOpen: false, shootDeadlinePickerOpen: false, docDatePickerOpen: false, docDuePickerOpen: false, ftDraftDatePickerOpen: false, loanStartPickerOpen: false, dpKey: null });
        }
      }
      if (!actionEl) return;
      const stopEl = e.target.closest('[data-stop]');
      if (stopEl && !stopEl.contains(actionEl)) return;
      handleAction(actionEl.dataset.action, actionEl, e);
    });

    app.addEventListener('dragstart', (e) => {
      const card = e.target.closest('[draggable="true"]');
      if (card) draggingId = card.dataset.id;
    });

    app.addEventListener('dblclick', (e) => {
      const cell = e.target.closest('[data-action="cal-select"]');
      if (!cell) return;
      const date = cell.dataset.date;
      const dayShoots = state.shoots.filter(s => s.date === date);
      if (dayShoots.length === 1) openEditShoot(dayShoots[0].id);
    });

    app.addEventListener('dragover', (e) => {
      const zone = e.target.closest('[data-dropzone]') || e.target.closest('[data-action="cal-select"]');
      if (zone) e.preventDefault();
    });
    app.addEventListener('drop', (e) => {
      // Calendar reschedule: drop a shoot chip onto another date -> confirm, then move it.
      const calCell = e.target.closest('[data-action="cal-select"]');
      if (calCell && !e.target.closest('[data-dropzone]') && draggingId) {
        e.preventDefault();
        const toDate = calCell.dataset.date;
        const sh = state.shoots.find(x => x.id === draggingId);
        if (sh && sh.date !== toDate) {
          setState({ rescheduleDraft: { id: draggingId, client: sh.client || 'this shoot', from: sh.date, to: toDate } });
        }
        draggingId = null;
        return;
      }
      const zone = e.target.closest('[data-dropzone]');
      if (!zone) return;
      e.preventDefault();
      const status = zone.dataset.status;
      if (draggingId) {
        setState(s => {
          const shoots = s.shoots.map(sh => sh.id === draggingId ? { ...sh, status } : sh);
          const clients = status === 'posted'
            ? promoteClientToCompleted(s.clients, (s.shoots.find(sh => sh.id === draggingId) || {}).client)
            : s.clients;
          return clients !== s.clients ? { shoots, clients } : { shoots };
        });
        draggingId = null;
      }
    });

    app.addEventListener('input', (e) => {
      // <select> elements fire both 'input' and 'change' on the same user action. Handling
      // 'input' here would re-render (replacing the DOM) before 'change' has a chance to
      // bubble, silently dropping any data-special side effect wired to 'change'. Selects
      // are atomic choices anyway, so let 'change' alone handle them.
      if (e.target.tagName === 'SELECT') return;
      const el = e.target;
      // Project/deliverable rows (Edit-only General Projects): update the array element in place
      // WITHOUT re-rendering, so the caret doesn't jump mid-typing. State stays in sync for save.
      if (el.dataset.projIdx != null) {
        const idx = Number(el.dataset.projIdx);
        const arr = (Array.isArray(state.draft && state.draft.projectItems) ? state.draft.projectItems : []).slice();
        arr[idx] = el.value;
        state = { ...state, draft: { ...state.draft, projectItems: arr } };
        return;
      }
      const bind = el.dataset.bind;
      if (!bind) return;
      if (el.dataset.fmt === 'money') {
        const oldCursor = el.selectionStart == null ? el.value.length : el.selectionStart;
        const rawCharsBeforeCursor = el.value.slice(0, oldCursor).replace(/[^\d.]/g, '').length;
        applyBind(bind, sanitizeMoneyInput(el.value));
        render();
        const newEl = app.querySelector(`[data-bind="${bind}"]`);
        if (newEl) {
          const pos = moneyCursorAfterFormat(newEl.value, rawCharsBeforeCursor);
          newEl.focus();
          try { newEl.setSelectionRange(pos, pos); } catch (err) { /* not applicable for this input type */ }
        }
        return;
      }
      if (el.dataset.fmt === 'autocomplete') {
        // Spreadsheet-style inline autocomplete: as the user types, if what they've typed is
        // the start of an existing client/project name, silently fill in the rest and select
        // (highlight) that suggested tail — typing more overwrites it, and it's otherwise
        // just part of the value if they leave it. No dropdown list involved.
        const typed = el.value;
        const isDeleting = !!(e.inputType && e.inputType.indexOf('delete') === 0);
        let finalValue = typed;
        let match = null;
        if (!isDeleting && typed.trim()) {
          const candidates = state.clients.map(c => c.name)
            .filter(n => n.length > typed.length && n.toLowerCase().startsWith(typed.toLowerCase()))
            .sort((a, b) => a.length - b.length);
          match = candidates[0] || null;
          if (match) finalValue = typed + match.slice(typed.length);
        }
        applyBind(bind, finalValue);
        render();
        const newEl = app.querySelector(`[data-bind="${bind}"]`);
        if (newEl) {
          newEl.focus();
          try {
            if (match) newEl.setSelectionRange(typed.length, finalValue.length);
            else newEl.setSelectionRange(finalValue.length, finalValue.length);
          } catch (err) { /* not applicable for this input type */ }
        }
        return;
      }
      applyBind(bind, el.value);
      // Number inputs don't support setSelectionRange, so a mid-typing re-render drops the
      // caret to the start and reverses digits (36 becomes 63). Store the value only; the
      // view refreshes on blur via the change handler below.
      if (el.type === 'number') return;
      render();
    });

    app.addEventListener('change', (e) => {
      const el = e.target;
      if (el.dataset.actionChange === 'doc-client-pick') {
        const id = el.value;
        if (id) {
          const c = state.clients.find(cl => cl.id === id);
          if (c) {
            const contact = [c.phone, c.email].filter(Boolean).join(' · ');
            state = setPath(state, 'docDraft.clientName', c.name);
            state = setPath(state, 'docDraft.clientContact', contact);
            render();
          }
        }
        return;
      }
      const special = el.dataset.special;
      if (special) { applySpecialSideEffect(special, el.value); render(); return; }
      // Text inputs with data-fmt (money, autocomplete) are already kept fully in sync by the
      // 'input' listener above on every keystroke, including sanitizing money values (stripping
      // commas) before storing them. If we also re-apply here on 'change' (which fires on blur —
      // e.g. the instant "Save Changes" is clicked), we'd overwrite that clean value with the
      // raw, comma-formatted display text, turning "11,000" into NaN/0 right before submit.
      if (el.dataset.fmt) return;
      const bind = el.dataset.bind;
      if (bind) { applyBind(bind, el.value); render(); }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (state.shootConfirmCloseOpen) {
        e.preventDefault(); e.stopPropagation();
        setState({ shootConfirmCloseOpen: false });
      } else if (state.shootDatePickerOpen || state.timePickerOpen || state.shootDeadlinePickerOpen || state.docDatePickerOpen || state.docDuePickerOpen || state.ftDraftDatePickerOpen || state.loanStartPickerOpen || state.dpKey) {
        e.preventDefault(); e.stopPropagation();
        setState({ shootDatePickerOpen: false, timePickerOpen: false, shootDeadlinePickerOpen: false, docDatePickerOpen: false, docDuePickerOpen: false, ftDraftDatePickerOpen: false, loanStartPickerOpen: false, dpKey: null });
      } else if (state.modal) {
        e.preventDefault(); e.stopPropagation();
        setState({ shootConfirmCloseOpen: true });
      } else if (state.loanModal || state.loanPaymentModal || state.shootPaymentModal || state.goalModal || state.goalFundModal || state.clientModal || state.telegramModalOpen || state.chipModal) {
        e.preventDefault(); e.stopPropagation();
        closeModalOf(state.loanModal ? 'loan' : state.loanPaymentModal ? 'loanpayment' : state.shootPaymentModal ? 'shootpayment' : state.goalModal ? 'goal' : state.goalFundModal ? 'goalfund' : state.clientModal ? 'client' : state.telegramModalOpen ? 'telegram' : 'chip');
      }
    });

    app.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-action]');
      if (!form) return;
      e.preventDefault();
      const action = form.dataset.action;
      if (action === 'activate-license') { activateLicense((document.getElementById('lic-key') || {}).value); return; }
      if (action === 'save-shoot') {
        const d = state.draft;
        if (!(d.client || '').trim()) { alert('Please enter a client / project name.'); return; }
        const isRealEstate = d.shootType === 'Real Estate';
        const liveTiers = getLiveTiers();
        const packageAmount = (!isRealEstate || (d.packageTier || 'custom') === 'custom')
          ? (Number(d.package) || 0)
          : ((liveTiers.find(t => t.value === d.packageTier) || {}).price || 0);
        const addons = d.addons || {};
        const addonsTotal = addonDefs().reduce((sum, ad) => sum + (addons[ad.key] || 0) * ad.price, 0);
        const isForeignGP = !isRealEstate && d.currency === 'USD';
        // Reconcile the "Amount Received" field / milestone taps with the payment log.
        // If the shoot has a log and the edited paid total differs from the log sum, record
        // the difference as a dated entry (today) so the edit is kept AND the log stays
        // consistent - instead of silently discarding the edit. No log means paid is the source.
        let paidAmount;
        let reconciledPayments = null;
        if (Array.isArray(d.payments) && d.payments.length) {
          const logSum = d.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
          const editedPaid = Number(d.paid) || 0;
          const diff = editedPaid - logSum;
          if (Math.abs(diff) >= 0.005) {
            reconciledPayments = [...d.payments, { id: 'sp' + Date.now() + 'adj', amount: diff, date: TODAY_STR, label: diff > 0 ? 'Balance received' : 'Adjustment' }];
            paidAmount = editedPaid;
          } else {
            paidAmount = logSum;
          }
        } else {
          paidAmount = Number(d.paid) || 0;
        }
        // Edit-only General Projects have no shoot date — a NEW one is stamped with today (the
        // day it was created), and its date field is hidden in the form.
        const isEditOnlyGP = !isRealEstate && d.serviceType === 'edit';
        const isAddMode = !!(state.modal && state.modal.mode === 'add');
        // Foreign General Project: totals stay in PHP (= the PHP actually received); the $ charged is stored as a note only.
        const cleaned = { ...d, package: isForeignGP ? paidAmount : (packageAmount + addonsTotal), paid: paidAmount, usdCharged: Number(d.usdCharged) || 0, ...(reconciledPayments ? { payments: reconciledPayments } : {}), ...(isEditOnlyGP && isAddMode ? { date: TODAY_STR } : {}) };
        setState(s => {
          const name = (cleaned.client || '').trim();
          const hasClient = name && s.clients.some(c => c.name.trim().toLowerCase() === name.toLowerCase());
          let clients = (name && !hasClient)
            ? [...s.clients, { id: 'c' + Date.now(), name, phone: '', email: '', leadStatus: 'Booked', followUpDate: '', notes: '' }]
            : s.clients;
          if (cleaned.status === 'posted') clients = promoteClientToCompleted(clients, name);
          const shoots = s.modal.mode === 'add'
            ? [...s.shoots, { ...cleaned, id: 'sh' + Date.now() }]
            : s.shoots.map(sh => sh.id === cleaned.id ? cleaned : sh);
          return { shoots, modal: null, draft: null, shootConfirmCloseOpen: false, ...(clients !== s.clients ? { clients } : {}) };
        });
      } else if (action === 'save-telegram-expense') {
        const d = state.expenseDraft;
        if (!(d.description || '').trim() || !d.amount) { alert('Please fill in what you spent on and the amount.'); return; }
        if (d.date && d.date > TODAY_STR) { alert('Expense date cannot be in the future.'); return; }
        const entry = { id: 'ex' + Date.now(), description: d.description, amount: Number(d.amount) || 0, date: d.date || TODAY_STR };
        setState(s => ({ expenses: [...s.expenses, entry], telegramModalOpen: false }));
      } else if (action === 'save-fulltime') {
        const d = state.ftDraft;
        const source = d.sourceType === '1st' ? 'Salary - 1st Cutoff'
          : d.sourceType === '2nd' ? 'Salary - 2nd Cutoff'
          : (d.sourceOther || '').trim();
        if (!source || !d.amount) { alert('Please fill in the source and amount.'); return; }
        if (d.date && d.date > TODAY_STR) { alert('Income date cannot be in the future.'); return; }
        const entryDate = d.date || TODAY_STR;
        const entry = { id: 'ft' + Date.now(), source, amount: Number(d.amount) || 0, date: entryDate };
        setState(s => ({ fullTimeIncome: [...s.fullTimeIncome, entry], ftDraft: { sourceType: '1st', sourceOther: '', amount: '', date: TODAY_STR }, financeMonthKey: entryDate.slice(0, 7) }));
      } else if (action === 'save-loan') {
        const d = state.loanDraft;
        const monthlyNum = Number(d.monthlyDue) || 0;
        const termNum = Number(d.termMonths) || 0;
        if (!(d.lender || '').trim() || monthlyNum <= 0) { alert('Please enter a lender / source name and a monthly due.'); return; }
        // Total is derived from monthly x term when a term is set; older loans keep their amount.
        const loanAmountNum = termNum > 0 ? monthlyNum * termNum : (Number(d.amount) || 0);
        const remainingBalanceNum = (d.remainingBalance === '' || d.remainingBalance === null || d.remainingBalance === undefined) ? loanAmountNum : (Number(d.remainingBalance) || 0);
        const cleaned = { ...d, amount: loanAmountNum, monthlyDue: monthlyNum, termMonths: termNum || null, startMonth: d.startMonth || null, remainingBalance: remainingBalanceNum, dueDay: d.dueDay ? Number(d.dueDay) : null, endDate: d.endDate || null };
        delete cleaned.dueDate;
        setState(s => s.loanModal.mode === 'add'
          ? { loans: [...s.loans, { ...cleaned, id: 'ln' + Date.now() }], loanModal: null, loanDraft: null }
          : { loans: s.loans.map(l => l.id === cleaned.id ? cleaned : l), loanModal: null, loanDraft: null });
      } else if (action === 'save-loan-payment') {
        const pd = state.loanPaymentDraft;
        const amt = Number(pd.amount) || 0;
        if (amt <= 0) { alert('Please enter a payment amount.'); return; }
        if (state.loanPaymentModal) {
          const targetId = state.loanPaymentModal.id;
          setState(s => ({
            loans: s.loans.map(l => {
              if (l.id !== targetId) return l;
              const newRemaining = Math.max(0, (Number(l.remainingBalance) || 0) - amt);
              const historyEntry = { id: 'lp' + Date.now(), date: TODAY_STR, amount: amt };
              return { ...l, remainingBalance: newRemaining, status: newRemaining === 0 ? 'paid' : l.status, paymentHistory: [...(l.paymentHistory || []), historyEntry] };
            }),
            loanPaymentModal: null, loanPaymentDraft: null,
          }));
        }
      } else if (action === 'save-shoot-payment') {
        const pd = state.shootPaymentDraft || {};
        const amt = Number(pd.amount) || 0;
        if (amt <= 0) { alert('Please enter a payment amount.'); return; }
        const payDate = pd.date || TODAY_STR;
        if (payDate > TODAY_STR) { alert('Payment date cannot be in the future.'); return; }
        const payLabel = pd.label || 'Payment';
        if (state.shootPaymentModal) {
          const targetId = state.shootPaymentModal.id;
          setState(s => ({
            shoots: s.shoots.map(sh => {
              if (sh.id !== targetId) return sh;
              let payments = Array.isArray(sh.payments) ? sh.payments.slice() : [];
              // First time logging on a shoot that already had a plain "Amount Received":
              // migrate that legacy total into a dated entry so no money is lost.
              if (payments.length === 0 && (Number(sh.paid) || 0) > 0) {
                payments.push({ id: 'sp' + Date.now() + 'm', amount: Number(sh.paid) || 0, date: sh.paidDate || sh.date || payDate, label: 'Earlier payment' });
              }
              payments.push({ id: 'sp' + Date.now(), amount: amt, date: payDate, label: payLabel });
              const paid = payments.reduce((a, p) => a + (Number(p.amount) || 0), 0);
              return { ...sh, payments, paid };
            }),
            shootPaymentModal: null, shootPaymentDraft: null,
          }));
        }
      } else if (action === 'save-goal') {
        const d = state.goalDraft;
        if (!(d.name || '').trim()) { alert('Please enter a goal name.'); return; }
        const isUSD = d.currency === 'USD';
        const target = isUSD ? Math.round((Number(d.target) || 0) * USD_TO_PHP) : (Number(d.target) || 0);
        const current = isUSD ? Math.round((Number(d.current) || 0) * USD_TO_PHP) : (Number(d.current) || 0);
        const cleaned = { ...d, target, current };
        setState(s => s.goalModal.mode === 'add'
          ? { goals: [...s.goals, { ...cleaned, id: 'g' + Date.now() }], goalModal: null, goalDraft: null }
          : { goals: s.goals.map(g => g.id === cleaned.id ? cleaned : g), goalModal: null, goalDraft: null });
      } else if (action === 'save-goal-fund') {
        const fd = state.goalFundDraft;
        const amt = Number(fd.amount) || 0;
        if (amt <= 0) { alert('Please enter an amount.'); return; }
        if (fd.mode === 'withdraw' && !(fd.reason || '').trim()) { alert('Please enter a reason for this withdrawal.'); return; }
        if (state.goalFundModal) {
          const targetId = state.goalFundModal.id;
          setState(s => {
            const g = s.goals.find(x => x.id === targetId);
            if (!g) return { goalFundModal: null, goalFundDraft: null };
            const phpAmt = g.currency === 'USD' ? amt * USD_TO_PHP : amt;
            const delta = fd.mode === 'withdraw' ? -phpAmt : phpAmt;
            const newCurrent = Math.max(0, (Number(g.current) || 0) + delta);
            const historyEntry = { id: 'gf' + Date.now(), date: TODAY_STR, amount: amt, phpAmount: phpAmt, mode: fd.mode || 'deposit', reason: fd.mode === 'withdraw' ? (fd.reason || '').trim() : '' };
            return {
              goals: s.goals.map(x => x.id === targetId ? { ...x, current: newCurrent, fundHistory: [...(x.fundHistory || []), historyEntry] } : x),
              goalFundModal: null, goalFundDraft: null,
            };
          });
        }
      } else if (action === 'save-client') {
        const d = state.clientDraft;
        if (!(d.name || '').trim()) { alert('Please enter a client name.'); return; }
        setState(s => s.clientModal.mode === 'add'
          ? { clients: [...s.clients, { ...d, id: 'c' + Date.now() }], clientModal: null, clientDraft: null }
          : { clients: s.clients.map(c => c.id === d.id ? d : c), clientModal: null, clientDraft: null });
      } else if (action === 'save-gear') {
        const d = state.gearDraft;
        if (!(d.name || '').trim()) { alert('Please enter the gear name.'); return; }
        const sold = d.status === 'sold';
        const cleaned = {
          id: d.id || ('gr' + Date.now()),
          name: d.name.trim(),
          date: d.date || '',
          cost: Number(d.cost) || 0,
          sold,
          soldName: sold ? (d.soldName || '').trim() : '',
          soldFor: sold ? (Number(d.soldFor) || 0) : 0,
          soldDate: sold ? (d.soldDate || '') : '',
        };
        setState(s => s.gearModal.mode === 'add'
          ? { gearItems: [...s.gearItems, cleaned], gearModal: null, gearDraft: null }
          : { gearItems: s.gearItems.map(g => g.id === cleaned.id ? cleaned : g), gearModal: null, gearDraft: null });
      }
    });

  }

  let clockIntervalStarted = false;
  function startClockInterval() {
    if (clockIntervalStarted) return;
    clockIntervalStarted = true;
    setInterval(() => render(), 30000);
  }

  function init() {
    wireListeners();
    startClockInterval();
    const saved = readLocalData();
    if (saved) {
      applyPersistedData(saved);
      // Self-heal: clients whose linked shoot(s) are already Completed but who are
      // still stuck in an earlier leads-pipeline status get bumped to "Client" once.
      if (state.shoots.length && state.clients.length) {
        const completedClientNames = new Set(
          state.shoots.filter(sh => sh.status === 'posted').map(sh => (sh.client || '').trim().toLowerCase())
        );
        let clientsChanged = false;
        const correctedClients = state.clients.map(c => {
          if (completedClientNames.has((c.name || '').trim().toLowerCase()) && c.leadStatus !== 'Client' && c.leadStatus !== 'Lost') {
            clientsChanged = true;
            return { ...c, leadStatus: 'Client' };
          }
          return c;
        });
        if (clientsChanged) { state = { ...state, clients: correctedClients }; persist(); }
      }
    }

    // Restore last-viewed page (per-device) so a refresh doesn't bounce you back to Dashboard.
    try {
      const savedView = localStorage.getItem('shoottracker_last_view');
      if (savedView && VALID_VIEWS.includes(savedView)) {
        state = { ...state, view: savedView };
      }
    } catch (e) { /* storage unavailable */ }

    render();
    refreshUsdRate(); // fire-and-forget: fetch live USD→PHP for the Foreign estimate
  }

  // Fetches the current mid-market USD→PHP rate (keyless, free) once every ~12h and caches it
  // per-device. Used ONLY for the Foreign shoot "Fill ₱ Received" estimate — Goals keep the
  // fixed USD_TO_PHP. Fails silently (offline / blocked): the app falls back to the last cached
  // rate, then to USD_TO_PHP, so nothing breaks without a network.
  async function refreshUsdRate() {
    try {
      const ts = Number(localStorage.getItem('pol_usd_rate_ts') || 0);
      if (state.usdRate > 0 && (Date.now() - ts) < 12 * 3600 * 1000) return; // still fresh
    } catch (e) { /* ignore */ }
    const sources = [
      { url: 'https://open.er-api.com/v6/latest/USD', pick: j => ({ rate: j && j.rates && j.rates.PHP, date: j && j.time_last_update_utc ? new Date(j.time_last_update_utc).toISOString().slice(0, 10) : '' }) },
      { url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', pick: j => ({ rate: j && j.usd && j.usd.php, date: (j && j.date) || '' }) },
    ];
    for (const s of sources) {
      try {
        const r = await fetch(s.url, { cache: 'no-store' });
        if (!r.ok) continue;
        const { rate, date } = s.pick(await r.json());
        if (rate && rate > 0) {
          const d = date || new Date().toISOString().slice(0, 10);
          try {
            localStorage.setItem('pol_usd_rate', String(rate));
            localStorage.setItem('pol_usd_rate_date', d);
            localStorage.setItem('pol_usd_rate_ts', String(Date.now()));
          } catch (e) { /* storage full/unavailable */ }
          setState({ usdRate: rate, usdRateDate: d });
          return;
        }
      } catch (e) { /* try next source */ }
    }
  }

  document.addEventListener('DOMContentLoaded', () => { init(); });
})();

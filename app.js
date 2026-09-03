/* ============================================================
   Dallas & Las Vegas Trip App
   ------------------------------------------------------------
   Design rule that governs this whole file: the app must stay
   useful with no network and no Supabase.

   Everything the family *researched* (itinerary, food, weather,
   packing lists) is plain HTML in index.html and renders with
   zero JavaScript. Supabase is layered on top to add the three
   things HTML can't do — a shared photo album, a synced packing
   checklist, and an editable itinerary. If Supabase is missing,
   misconfigured, or unreachable, each of those degrades to a
   local-only version rather than breaking the page.
   ============================================================ */

(function () {
  'use strict';

  // ----------------------------------------------------------
  //  Config & client
  // ----------------------------------------------------------
  var cfg = window.TRIP_CONFIG || {};
  var BUCKET = cfg.photoBucket || 'trip-photos';
  var db = null;

  function looksConfigured() {
    var u = cfg.supabaseUrl, k = cfg.supabaseAnonKey;
    return typeof u === 'string' && typeof k === 'string' &&
           u.indexOf('http') === 0 && u.indexOf('YOUR_') === -1 &&
           k.length > 20 && k.indexOf('YOUR_') === -1;
  }

  if (looksConfigured() && window.supabase && window.supabase.createClient) {
    try {
      db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    } catch (err) {
      console.error('Could not create Supabase client:', err);
    }
  }

  // ----------------------------------------------------------
  //  Sync status pill
  //  Only ever shown when something is *not* normal — a working
  //  synced app should feel like it has no status indicator.
  // ----------------------------------------------------------
  var statusEl = document.getElementById('syncStatus');

  // Hold the message as a translation KEY rather than finished text, so the
  // banner re-renders in the new language when someone flips the switch.
  var statusState = null;

  function setStatus(kind, key) {
    statusState = kind ? { kind: kind, key: key } : null;
    renderStatus();
  }

  function renderStatus() {
    if (!statusEl) return;
    if (!statusState) { statusEl.hidden = true; return; }
    statusEl.hidden = false;
    statusEl.className = 'sync-status sync-' + statusState.kind;
    statusEl.textContent = tr(statusState.key);
  }

  function reportOffline(err) {
    if (err) console.error('Supabase request failed:', err);
    setStatus('warn', 'offline');
  }

  // ----------------------------------------------------------
  //  Small helpers
  // ----------------------------------------------------------
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;   // textContent, never innerHTML:
    return n;                                  // anyone with the link can write.
  }

  function localGet(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }

  function localSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }

  function debounce(fn, ms) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }


  // ==========================================================
  //  LANGUAGE
  //  Page copy is translated in place via data-ko attributes on
  //  the HTML. Strings this file builds at runtime live here.
  //  Database rows carry their own *_ko columns; see stopField().
  // ==========================================================
  var STRINGS = {
    en: {
      addStop: "+ Add a stop",
      editStop: "Edit stop",
      addStopTitle: "Add a stop",
      edit: "Edit",
      delete: "Delete",
      save: "Save",
      cancel: "Cancel",
      timePh: "Time — e.g. Morning, 2:30 PM",
      titlePh: "What is it?",
      descPh: "Details (optional)",
      notesTitle: "Notes for this day",
      notesPh: "Confirmation numbers, who’s driving, what to book…",
      saving: "Saving…",
      saved: "Saved",
      notSaved: "Not saved",
      emptyDay: "Nothing planned for this day yet.",
      noPhotos: "No photos added yet.",
      photoLoadFail: "Couldn’t load the album — check your connection.",
      uploading: "Uploading photos…",
      uploadFail: "Upload failed — check your connection and that the storage bucket exists.",
      confirmDelStop: "Remove this stop from the plan?",
      confirmDelPhoto: "Delete this photo for everyone?",
      offline: "Can’t reach the trip database — showing the built-in plan. Changes won’t save.",
      notConfigured: "Not connected to Supabase yet — see README.md. Photos and checkboxes stay on this device only.",
      libMissing: "Photo sync is unavailable (the Supabase library didn’t load). Everything else works.",
      removePhoto: "Remove photo",
      tripPhoto: "Trip photo",
    },
    ko: {
      addStop: "+ 일정 추가",
      editStop: "일정 수정",
      addStopTitle: "일정 추가",
      edit: "수정",
      delete: "삭제",
      save: "저장",
      cancel: "취소",
      timePh: "시간 — 예: 오전, 오후 2:30",
      titlePh: "무엇인가요?",
      descPh: "설명 (선택)",
      notesTitle: "이 날의 메모",
      notesPh: "예약 번호, 운전할 사람, 예매할 것…",
      saving: "저장 중…",
      saved: "저장됨",
      notSaved: "저장 안 됨",
      emptyDay: "아직 이 날의 일정이 없어요.",
      noPhotos: "아직 올라온 사진이 없어요.",
      photoLoadFail: "앨범을 불러오지 못했어요 — 연결을 확인해 주세요.",
      uploading: "사진 올리는 중…",
      uploadFail: "업로드에 실패했어요 — 연결 상태와 저장소 버킷을 확인해 주세요.",
      confirmDelStop: "이 일정을 삭제할까요?",
      confirmDelPhoto: "모두에게서 이 사진을 삭제할까요?",
      offline: "여행 데이터베이스에 연결할 수 없어요 — 기본 일정을 표시합니다. 변경 사항은 저장되지 않아요.",
      notConfigured: "아직 Supabase에 연결되지 않았어요. 사진과 체크 항목이 이 기기에만 저장됩니다.",
      libMissing: "사진 동기화를 쓸 수 없어요 (Supabase 라이브러리 로드 실패). 나머지 기능은 정상입니다.",
      removePhoto: "사진 삭제",
      tripPhoto: "여행 사진",
    }
  };

  var LANG_KEY = 'trip.lang';
  var currentLang = 'en';

  function detectLang() {
    var saved = localGet(LANG_KEY, null);
    if (saved === 'en' || saved === 'ko') return saved;
    // Default to Korean for a Korean-language device, so family
    // arriving from Korea get their language without hunting for
    // the switch.
    return /^ko\b/i.test(navigator.language || '') ? 'ko' : 'en';
  }

  function tr(key) {
    var pack = STRINGS[currentLang] || STRINGS.en;
    return pack[key] != null ? pack[key] : (STRINGS.en[key] != null ? STRINGS.en[key] : key);
  }

  // Prefer a row's Korean column when it has one, fall back to English.
  // A stop added by the family in one language shows that language in
  // both modes rather than showing nothing.
  function stopField(stop, field) {
    if (currentLang === 'ko' && stop[field + '_ko']) return stop[field + '_ko'];
    return stop[field] || '';
  }

  function swapAttr(selector, dataKey, prop, lang) {
    document.querySelectorAll(selector).forEach(function (node) {
      var enKey = 'en' + dataKey.charAt(0).toUpperCase() + dataKey.slice(1);
      if (node.dataset[enKey] == null) node.dataset[enKey] = node[prop] || '';
      node[prop] = (lang === 'ko') ? node.dataset[dataKey] : node.dataset[enKey];
    });
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localSet(LANG_KEY, lang);
    document.documentElement.lang = lang;

    // Static page copy
    document.querySelectorAll('[data-ko]').forEach(function (node) {
      if (node.dataset.en == null) node.dataset.en = node.textContent;
      node.textContent = (lang === 'ko') ? node.dataset.ko : node.dataset.en;
    });
    swapAttr('[data-ko-placeholder]', 'koPlaceholder', 'placeholder', lang);
    swapAttr('[data-ko-alt]', 'koAlt', 'alt', lang);

    document.querySelectorAll('.lang-btn').forEach(function (b) {
      var on = b.dataset.lang === lang;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });

    relabelControls();
    renderStatus();
    refreshAll();
  }

  // Controls this file builds, which have no data-ko to swap.
  function relabelControls() {
    document.querySelectorAll('.add-stop-btn').forEach(function (b) { b.textContent = tr('addStop'); });
    document.querySelectorAll('.day-note-title').forEach(function (h) { h.textContent = tr('notesTitle'); });
    document.querySelectorAll('.day-note').forEach(function (n) { n.placeholder = tr('notesPh'); });
    document.querySelectorAll('.stop-form').forEach(function (f) {
      f.querySelector('[name=time_label]').placeholder = tr('timePh');
      f.querySelector('[name=title]').placeholder      = tr('titlePh');
      f.querySelector('[name=description]').placeholder = tr('descPh');
      f.querySelector('.btn-primary').textContent = tr('save');
      f.querySelector('.form-row .link-btn').textContent = tr('cancel');
      if (f.hidden) f.querySelector('.stop-form-title').textContent = tr('addStopTitle');
    });
  }

  function refreshAll() {
    if (!db) return;
    loadStops();
    loadPhotos('texas');
    loadPhotos('vegas');
  }

  document.querySelectorAll('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { applyLanguage(btn.dataset.lang); });
  });

  // ==========================================================
  //  NAVIGATION  (unchanged behaviour from the original app)
  // ==========================================================
  var currentCity = 'texas';
  var currentTab  = 'weather';

  function render() {
    var heroTexas = document.getElementById('heroFeatureTexas');
    var heroVegas = document.getElementById('heroFeatureVegas');
    var showHero  = currentTab === 'weather';

    if (heroTexas) heroTexas.style.display = (showHero && currentCity === 'texas') ? 'block' : 'none';
    if (heroVegas) heroVegas.style.display = (showHero && currentCity === 'vegas') ? 'block' : 'none';

    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('active', p.dataset.city === currentCity && p.dataset.tab === currentTab);
    });
  }

  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentTab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      render();
      refreshVisible();
    });
  });

  document.querySelectorAll('.city-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      currentCity = btn.dataset.city;
      document.querySelectorAll('.city-btn').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      render();
      refreshVisible();
    });
  });

  document.querySelectorAll('.day-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var group = btn.dataset.group;
      document.querySelectorAll('.day-btn[data-group="' + group + '"]').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.day-panel[data-group="' + group + '"]').forEach(function (p) { p.classList.remove('active'); });
      btn.classList.add('active');
      var target = document.getElementById('day-' + btn.dataset.day);
      if (target) target.classList.add('active');
    });
  });

  // ==========================================================
  //  PACKING CHECKLIST
  //  Item text lives in index.html. Only the ticked state is
  //  stored, keyed by the li's data-key.
  // ==========================================================
  var PACK_LOCAL_KEY = 'trip.packing';

  function setupPacking() {
    var items = document.querySelectorAll('.pack-list li[data-key]');
    if (!items.length) return;

    items.forEach(function (li) {
      var key = li.dataset.key;
      var label = el('label', 'pack-check');

      var box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset.key = key;

      var span = el('span', 'pack-text', li.textContent.trim());
      // Hand the translation to the span: the <li> now holds a checkbox, and
      // swapping its textContent would destroy it.
      if (li.dataset.ko) {
        span.dataset.ko = li.dataset.ko;
        delete li.dataset.ko;
      }

      label.appendChild(box);
      label.appendChild(span);
      li.textContent = '';
      li.appendChild(label);

      box.addEventListener('change', function () {
        li.classList.toggle('checked', box.checked);
        savePacking(key, box.checked);
      });
    });

    loadPacking();
  }

  function applyPacking(map) {
    document.querySelectorAll('.pack-list input[type="checkbox"][data-key]').forEach(function (box) {
      var on = !!map[box.dataset.key];
      box.checked = on;
      box.closest('li').classList.toggle('checked', on);
    });
  }

  function loadPacking() {
    if (!db) { applyPacking(localGet(PACK_LOCAL_KEY, {})); return; }

    db.from('packing_state').select('item_key,checked').then(function (res) {
      if (res.error) { reportOffline(res.error); applyPacking(localGet(PACK_LOCAL_KEY, {})); return; }
      var map = {};
      (res.data || []).forEach(function (row) { map[row.item_key] = row.checked; });
      applyPacking(map);
      localSet(PACK_LOCAL_KEY, map);   // keep a local mirror for offline loads
    });
  }

  function savePacking(key, checked) {
    var mirror = localGet(PACK_LOCAL_KEY, {});
    mirror[key] = checked;
    localSet(PACK_LOCAL_KEY, mirror);

    if (!db) return;
    db.from('packing_state')
      .upsert({ item_key: key, checked: checked, updated_at: new Date().toISOString() },
              { onConflict: 'item_key' })
      .then(function (res) { if (res.error) reportOffline(res.error); });
  }

  // ==========================================================
  //  ITINERARY  (stops + per-day notes)
  //  The static .stop markup in index.html is the offline
  //  fallback; when the DB answers, it replaces that markup.
  // ==========================================================
  function dayPanels() {
    return Array.prototype.slice.call(document.querySelectorAll('.day-panel[data-day-key]'));
  }

  function buildStopNode(stop) {
    var wrap = el('div', 'stop');
    wrap.appendChild(el('div', 'stop-time', stopField(stop, 'time_label')));

    var body = el('div', 'stop-body');
    body.appendChild(el('h3', null, stopField(stop, 'title')));
    var desc = stopField(stop, 'description');
    if (desc) body.appendChild(el('p', null, desc));

    var actions = el('div', 'stop-actions');
    var edit = el('button', 'link-btn', tr('edit'));
    edit.type = 'button';
    edit.addEventListener('click', function () { openStopForm(wrap.closest('.day-panel'), stop); });

    var del = el('button', 'link-btn danger', tr('delete'));
    del.type = 'button';
    del.addEventListener('click', function () { deleteStop(stop); });

    actions.appendChild(edit);
    actions.appendChild(del);
    body.appendChild(actions);

    wrap.appendChild(body);
    return wrap;
  }

  function renderStops(panel, stops) {
    var list = panel.querySelector('.stop-list');
    if (!list) return;
    list.textContent = '';
    if (!stops.length) {
      list.appendChild(el('p', 'photo-empty', tr('emptyDay')));
      return;
    }
    stops.forEach(function (s) { list.appendChild(buildStopNode(s)); });
  }

  function loadStops() {
    if (!db) return;
    db.from('stops').select('*').order('sort_order', { ascending: true }).then(function (res) {
      if (res.error) { reportOffline(res.error); return; }
      var rows = res.data || [];
      // An empty stops table means seed.sql was never run — in that
      // case keep the static HTML rather than blanking the itinerary.
      if (!rows.length) return;

      dayPanels().forEach(function (panel) {
        var mine = rows.filter(function (r) {
          return r.city === panel.dataset.city && r.day_key === panel.dataset.dayKey;
        });
        renderStops(panel, mine);
      });
    });
  }

  function openStopForm(panel, stop) {
    if (!panel) return;
    var form = panel.querySelector('.stop-form');
    if (!form) return;
    form.hidden = false;
    form.dataset.stopId = stop ? stop.id : '';
    form.querySelector('[name=time_label]').value  = stop ? stopField(stop, 'time_label') : '';
    form.querySelector('[name=title]').value       = stop ? stopField(stop, 'title') : '';
    form.querySelector('[name=description]').value = stop ? stopField(stop, 'description') : '';
    form.querySelector('.stop-form-title').textContent = tr(stop ? 'editStop' : 'addStopTitle');
    var addBtn = panel.querySelector('.add-stop-btn');
    if (addBtn) addBtn.hidden = true;
    form.querySelector('[name=title]').focus();
  }

  function closeStopForm(panel) {
    var form = panel.querySelector('.stop-form');
    if (form) { form.hidden = true; form.reset(); form.dataset.stopId = ''; }
    var addBtn = panel.querySelector('.add-stop-btn');
    if (addBtn) addBtn.hidden = false;
  }

  function saveStop(panel, form) {
    var id = form.dataset.stopId;
    var time  = form.querySelector('[name=time_label]').value.trim() || null;
    var title = form.querySelector('[name=title]').value.trim();
    var desc  = form.querySelector('[name=description]').value.trim() || null;
    if (!title) return;

    var payload = { city: panel.dataset.city, day_key: panel.dataset.dayKey };

    // Editing in Korean updates only the Korean columns, so a translation
    // never overwrites the English original (and vice versa).
    if (currentLang === 'ko') {
      payload.time_label_ko = time;
      payload.title_ko = title;
      payload.description_ko = desc;
    } else {
      payload.time_label = time;
      payload.title = title;
      payload.description = desc;
    }

    var req;
    if (id) {
      req = db.from('stops').update(payload).eq('id', id);
    } else {
      // title is NOT NULL, so a stop added in Korean fills both columns.
      // English readers then see the Korean text rather than a blank row.
      if (currentLang === 'ko') {
        payload.time_label = time;
        payload.title = title;
        payload.description = desc;
      }
      // Put new stops at the end of the day.
      var last = panel.querySelectorAll('.stop-list .stop').length;
      payload.sort_order = (last + 1) * 10 + 1000;
      req = db.from('stops').insert(payload);
    }

    req.then(function (res) {
      if (res.error) { reportOffline(res.error); return; }
      closeStopForm(panel);
      loadStops();
    });
  }

  function deleteStop(stop) {
    if (!window.confirm(tr('confirmDelStop'))) return;
    db.from('stops').delete().eq('id', stop.id).then(function (res) {
      if (res.error) { reportOffline(res.error); return; }
      loadStops();
    });
  }

  function setupItineraryTools() {
    if (!db) return;   // Without a database these controls would do nothing.

    dayPanels().forEach(function (panel) {
      var tools = el('div', 'day-tools');

      // --- add / edit form ---
      var addBtn = el('button', 'add-stop-btn', tr('addStop'));
      addBtn.type = 'button';
      addBtn.addEventListener('click', function () { openStopForm(panel, null); });

      var form = document.createElement('form');
      form.className = 'stop-form';
      form.hidden = true;
      form.appendChild(el('h4', 'stop-form-title', tr('addStopTitle')));

      var timeIn = document.createElement('input');
      timeIn.name = 'time_label';
      timeIn.placeholder = tr('timePh');
      timeIn.maxLength = 40;

      var titleIn = document.createElement('input');
      titleIn.name = 'title';
      titleIn.placeholder = tr('titlePh');
      titleIn.required = true;
      titleIn.maxLength = 120;

      var descIn = document.createElement('textarea');
      descIn.name = 'description';
      descIn.placeholder = tr('descPh');
      descIn.rows = 3;

      var row = el('div', 'form-row');
      var save = el('button', 'btn-primary', tr('save'));
      save.type = 'submit';
      var cancel = el('button', 'link-btn', tr('cancel'));
      cancel.type = 'button';
      cancel.addEventListener('click', function () { closeStopForm(panel); });
      row.appendChild(save);
      row.appendChild(cancel);

      form.appendChild(timeIn);
      form.appendChild(titleIn);
      form.appendChild(descIn);
      form.appendChild(row);
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        saveStop(panel, form);
      });

      // --- per-day notes ---
      var noteWrap = el('div', 'day-note-wrap');
      noteWrap.appendChild(el('h4', 'stop-form-title day-note-title', tr('notesTitle')));
      var note = document.createElement('textarea');
      note.className = 'day-note';
      note.rows = 3;
      note.placeholder = tr('notesPh');
      var noteStatus = el('span', 'note-status', '');
      note.addEventListener('input', debounce(function () {
        noteStatus.textContent = tr('saving');
        db.from('day_notes').upsert({
          city: panel.dataset.city,
          day_key: panel.dataset.dayKey,
          body: note.value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'city,day_key' }).then(function (res) {
          noteStatus.textContent = tr(res.error ? 'notSaved' : 'saved');
          if (res.error) reportOffline(res.error);
          else setTimeout(function () { noteStatus.textContent = ''; }, 2000);
        });
      }, 800));

      noteWrap.appendChild(note);
      noteWrap.appendChild(noteStatus);

      tools.appendChild(addBtn);
      tools.appendChild(form);
      tools.appendChild(noteWrap);
      panel.appendChild(tools);
    });

    loadNotes();
  }

  function loadNotes() {
    if (!db) return;
    db.from('day_notes').select('city,day_key,body').then(function (res) {
      if (res.error) { reportOffline(res.error); return; }
      var rows = res.data || [];
      dayPanels().forEach(function (panel) {
        var note = panel.querySelector('.day-note');
        if (!note || note === document.activeElement) return;  // don't clobber typing
        var match = rows.filter(function (r) {
          return r.city === panel.dataset.city && r.day_key === panel.dataset.dayKey;
        })[0];
        note.value = match ? match.body : '';
      });
    });
  }

  // ==========================================================
  //  PHOTOS
  // ==========================================================
  var GRIDS = {
    texas: { grid: 'photoGridTexas', input: 'photoUploadTexas', name: 'uploaderNameTexas' },
    vegas: { grid: 'photoGridVegas', input: 'photoUploadVegas', name: 'uploaderNameVegas' }
  };
  var NAME_KEY = 'trip.uploaderName';

  function publicUrl(path) {
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  function emptyMessage(grid, text) {
    grid.textContent = '';
    grid.appendChild(el('p', 'photo-empty', text));
  }

  function renderPhotos(city, rows) {
    var grid = document.getElementById(GRIDS[city].grid);
    if (!grid) return;

    if (!rows.length) { emptyMessage(grid, tr('noPhotos')); return; }

    grid.textContent = '';
    rows.forEach(function (row) {
      var item = el('div', 'photo-item');

      var img = document.createElement('img');
      img.src = publicUrl(row.storage_path);
      img.alt = row.caption || (tr('tripPhoto') + (row.added_by ? ' — ' + row.added_by : ''));
      img.loading = 'lazy';

      var remove = el('button', 'photo-remove-btn', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', tr('removePhoto'));
      remove.addEventListener('click', function () { deletePhoto(city, row); });

      item.appendChild(img);
      item.appendChild(remove);
      if (row.added_by) item.appendChild(el('span', 'photo-by', row.added_by));
      grid.appendChild(item);
    });
  }

  function loadPhotos(city) {
    var grid = document.getElementById(GRIDS[city].grid);
    if (!grid || !db) return;

    db.from('photos').select('*').eq('city', city)
      .order('created_at', { ascending: false })
      .then(function (res) {
        if (res.error) {
          reportOffline(res.error);
          emptyMessage(grid, tr('photoLoadFail'));
          return;
        }
        renderPhotos(city, res.data || []);
      });
  }

  /* Shrink before upload. Phone photos are 3–8 MB each; at 1600px
     they land around 300 KB, which keeps the album quick to load
     on hotel wifi and cheap on Supabase's free storage tier. */
  function downscale(file) {
    var MAX = 1600, QUALITY = 0.82;

    if (!window.createImageBitmap || !window.HTMLCanvasElement) {
      return Promise.resolve(file);
    }

    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .then(function (bmp) {
        var scale = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
        if (scale === 1 && file.size < 900 * 1024) { bmp.close(); return file; }

        var canvas = document.createElement('canvas');
        canvas.width  = Math.round(bmp.width  * scale);
        canvas.height = Math.round(bmp.height * scale);
        canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close();

        return new Promise(function (resolve) {
          canvas.toBlob(function (blob) { resolve(blob || file); }, 'image/jpeg', QUALITY);
        });
      })
      .catch(function () { return file; });   // unreadable/HEIC edge cases: send as-is
  }

  function uploadPhotos(city, files) {
    var grid = document.getElementById(GRIDS[city].grid);
    var nameEl = document.getElementById(GRIDS[city].name);
    var addedBy = nameEl && nameEl.value.trim() ? nameEl.value.trim() : null;
    if (addedBy) localSet(NAME_KEY, addedBy);

    setStatus('info', 'uploading');

    var jobs = files.map(function (file) {
      return downscale(file).then(function (blob) {
        var path = city + '/' + Date.now() + '-' +
                   Math.random().toString(36).slice(2, 8) + '.jpg';

        return db.storage.from(BUCKET)
          .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600' })
          .then(function (up) {
            if (up.error) throw up.error;
            return db.from('photos').insert({
              city: city, storage_path: path, added_by: addedBy
            }).then(function (ins) {
              if (ins.error) throw ins.error;
            });
          });
      });
    });

    Promise.all(jobs)
      .then(function () {
        setStatus(null);
        loadPhotos(city);
      })
      .catch(function (err) {
        console.error('Upload failed:', err);
        setStatus('warn', 'uploadFail');
        loadPhotos(city);
      });
  }

  function deletePhoto(city, row) {
    if (!window.confirm(tr('confirmDelPhoto'))) return;

    db.storage.from(BUCKET).remove([row.storage_path]).then(function () {
      return db.from('photos').delete().eq('id', row.id);
    }).then(function (res) {
      if (res && res.error) reportOffline(res.error);
      loadPhotos(city);
    }).catch(function (err) {
      reportOffline(err);
    });
  }

  /* Original in-memory behaviour, used only when there's no
     database. Photos vanish on reload and aren't shared — but
     the button still does something rather than nothing. */
  function setupLocalUpload(city) {
    var conf = GRIDS[city];
    var input = document.getElementById(conf.input);
    var grid  = document.getElementById(conf.grid);
    if (!input || !grid) return;

    input.addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files);
      if (!files.length) return;

      var empty = grid.querySelector('.photo-empty');
      if (empty) empty.remove();

      files.forEach(function (file) {
        var reader = new FileReader();
        reader.onload = function (ev) {
          var item = el('div', 'photo-item');
          var img = document.createElement('img');
          img.src = ev.target.result;
          img.alt = tr('tripPhoto');

          var remove = el('button', 'photo-remove-btn', '×');
          remove.type = 'button';
          remove.setAttribute('aria-label', 'Remove photo');
          remove.addEventListener('click', function () {
            item.remove();
            if (!grid.querySelector('.photo-item')) emptyMessage(grid, tr('noPhotos'));
          });

          item.appendChild(img);
          item.appendChild(remove);
          grid.appendChild(item);
        };
        reader.readAsDataURL(file);
      });
      input.value = '';
    });
  }

  function setupPhotos() {
    Object.keys(GRIDS).forEach(function (city) {
      var conf = GRIDS[city];
      var nameEl = document.getElementById(conf.name);
      if (nameEl) nameEl.value = localGet(NAME_KEY, '') || '';

      if (!db) { setupLocalUpload(city); return; }

      var input = document.getElementById(conf.input);
      if (!input) return;
      input.addEventListener('change', function (e) {
        var files = Array.prototype.slice.call(e.target.files);
        if (files.length) uploadPhotos(city, files);
        input.value = '';
      });
    });
  }

  // ==========================================================
  //  Refresh
  //  Other people are editing the same data from their phones,
  //  so re-read whatever is on screen when the user comes back
  //  to the page or moves between sections.
  // ==========================================================
  function refreshVisible() {
    if (!db) return;
    if (currentTab === 'pictures') loadPhotos(currentCity);
    if (currentTab === 'wear')     loadPacking();
    if (currentTab === 'places')   { loadStops(); loadNotes(); }
  }

  window.addEventListener('focus', refreshVisible);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refreshVisible();
  });

  // ==========================================================
  //  Boot
  // ==========================================================
  setupPacking();
  setupItineraryTools();
  setupPhotos();
  applyLanguage(detectLang());   // also performs the first data load
  if (!db) setStatus('warn', looksConfigured() ? 'libMissing' : 'notConfigured');
  render();
})();

// BNI Galaxy ST — Admin Backend
const API = '/api';
let currentPage = 'overview';
let members = [], guests = [], observers = [], meetings = [];
let currentMeeting = null;
let meetingAttendance = [];
let searchText = '';

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.sb-link').forEach(link => {
    link.addEventListener('click', () => switchPage(link.dataset.page));
  });
  switchPage('overview');
});

function switchPage(page) {
  currentPage = page;
  document.querySelectorAll('.sb-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  document.getElementById('topbar').textContent = {
    overview: '總覽', meetings: '會議管理', members: '會員管理',
    guests: '來賓管理', observers: '觀察員管理', checkin: '簽到操作', settings: '文字設定'
  }[page] || '';
  loadPage(page);
}

async function loadPage(page) {
  const pc = document.getElementById('page-content');
  switch (page) {
    case 'overview': await renderOverview(pc); break;
    case 'meetings': await renderMeetings(pc); break;
    case 'members': await renderTablePage(pc, 'member', '會員'); break;
    case 'guests': await renderTablePage(pc, 'guest', '來賓'); break;
    case 'observers': await renderTablePage(pc, 'observer', '觀察員'); break;
    case 'checkin': await renderCheckinOp(pc); break;
    case 'settings': await renderSettingsPage(pc); break;
  }
}

// ── Overview ──────────────────────────────────────
async function renderOverview(pc) {
  const stats = await api('/stats');
  const mts = await api('/meetings');
  pc.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="n">${stats.total_meetings||0}</div><div class="l">總會議次數</div></div>
      <div class="stat-card"><div class="n">${stats.member_count||0}</div><div class="l">會員人數</div></div>
      <div class="stat-card"><div class="n">${stats.total_attendance||0}</div><div class="l">總出席記錄</div></div>
      <div class="stat-card"><div class="n">${stats.paid_count||0}</div><div class="l">已付款次數</div></div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>最近會議</h2><button class="btn btn-primary btn-sm" onclick="switchPage('meetings')">查看全部</button></div>
      <div class="panel-body">
        <table class="data-table">
          <thead><tr><th>日期</th><th>類型</th><th>收款人</th><th>來賓費</th></tr></thead>
          <tbody>${mts.slice(0,10).map(m => `<tr>
            <td><strong>${m.date}</strong></td>
            <td>${m.type==='regular'?'例會':'特別會議'}</td>
            <td>${esc(m.collector||'-')}</td>
            <td>${m.guest_fee||0}</td>
          </tr>`).join('')}</tbody>
        </table>
        ${mts.length===0 ? '<div class="empty">暫無會議</div>' : ''}
      </div>
    </div>`;
}

// ── Meetings ──────────────────────────────────────
async function renderMeetings(pc) {
  meetings = await api('/meetings');
  pc.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>會議列表 (${meetings.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="showMeetingForm()">+ 新增會議</button>
      </div>
      <div class="panel-body">
        <table class="data-table">
          <thead><tr><th></th><th>日期</th><th>類型</th><th>收款人</th><th>來賓費</th><th></th></tr></thead>
          <tbody>${meetings.map(m => `<tr class="expand-tr" data-mid="${m.id}" onclick="toggleMeetingRow(${m.id})">
            <td><span class="arrow">▶</span></td>
            <td><strong>${m.date}</strong></td>
            <td>${m.type==='regular'?'例會':'特別會議'}</td>
            <td>${esc(m.collector||'-')}</td>
            <td>${m.guest_fee||0}</td>
            <td class="btns">
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();editMeeting(${m.id})">編輯</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteMeeting(${m.id})">刪除</button>
            </td>
          </tr>
          <tr class="detail-row" id="att-${m.id}"><td colspan="6"></td></tr>`).join('')}</tbody>
        </table>
        ${meetings.length===0 ? '<div class="empty">暫無會議記錄</div>' : ''}
      </div>
    </div>`;
}

async function toggleMeetingRow(mid) {
  const row = document.querySelector(`tr[data-mid="${mid}"]`);
  const detail = document.getElementById('att-' + mid);
  if (detail.classList.contains('show')) {
    detail.classList.remove('show');
    row.classList.remove('open');
    return;
  }
  document.querySelectorAll('.detail-row.show').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.expand-tr.open').forEach(r => r.classList.remove('open'));
  row.classList.add('open');

  if (detail.dataset.loaded) { detail.classList.add('show'); return; }
  detail.dataset.loaded = '1';

  const m = await api(`/meetings?id=${mid}`);
  const att = m.attendance || [];
  const allMembers = await api('/members');
  const allGuests = await api('/guests');
  const allObservers = await api('/observers');
  const getName = (type, id) => ({ member: allMembers, guest: allGuests, observer: allObservers }[type]||[]).find(p => p.id === id)?.name || '?';
  const typeLabel = { member: '會員', guest: '來賓', observer: '觀察員' };

  detail.firstElementChild.innerHTML = att.length === 0 ? '<div class="empty">無出席記錄</div>' :
    att.map(a => `<div class="att-mini">
      <span style="font-size:11px;color:var(--text2);min-width:44px">${typeLabel[a.person_type]||a.person_type}</span>
      <span style="flex:1;font-weight:500">${esc(getName(a.person_type,a.person_id))}</span>
      ${a.substitute ? `<span style="font-size:11px;color:var(--text2)">代:${esc(a.substitute)}</span>` : ''}
      ${a.arrival_time ? `<span style="color:var(--primary);font-weight:500">${a.arrival_time}</span>` : '<span style="color:var(--text2)">-</span>'}
      <span class="badge ${a.payment&&a.payment!=='unpaid'?'badge-paid':'badge-unpaid'}">${a.payment&&a.payment!=='unpaid'?'已付':'未付'}</span>
      ${a.payment_method ? `<span style="font-size:11px">${a.payment_method}</span>` : ''}
      ${a.remark ? `<span style="font-size:11px;color:var(--text2)">${esc(a.remark)}</span>` : ''}
    </div>`).join('');
  detail.classList.add('show');
}

function showMeetingForm(editId) {
  let m = {};
  if (editId) m = meetings.find(x => x.id === editId) || {};
  const today = new Date().toISOString().split('T')[0];
  showModal(editId ? '編輯會議' : '新增會議', `
    <label>日期 *</label><input type="date" id="mt-date" value="${m.date||today}">
    <label>類型</label><select id="mt-type">
      <option value="regular" ${(m.type||'regular')==='regular'?'selected':''}>例會</option>
      <option value="special" ${m.type==='special'?'selected':''}>特別會議</option>
    </select>
    <label>收款人</label><input type="text" id="mt-collector" value="${esc(m.collector||'')}" placeholder="收款人名稱">
    <label>來賓費</label><input type="number" id="mt-fee" value="${m.guest_fee||0}" placeholder="0">
    <button class="btn btn-primary" style="width:100%" id="save-mt">${editId?'儲存':'新增會議'}</button>
  `);
  document.getElementById('save-mt').onclick = async () => {
    const body = {
      date: document.getElementById('mt-date').value,
      type: document.getElementById('mt-type').value,
      collector: document.getElementById('mt-collector').value,
      guest_fee: parseInt(document.getElementById('mt-fee').value) || 0
    };
    if (editId) {
      body.id = editId;
      // Update via PUT-like approach — we need to handle this
      // For now, delete and re-create, or just update fields
      await api(`/meetings?id=${editId}`, { method: 'DELETE' });
    }
    await api('/meetings', { method: 'POST', body: JSON.stringify(body) });
    hideModal();
    toast(editId ? '會議已更新' : '會議已建立');
    switchPage('meetings');
  };
}

function editMeeting(id) { showMeetingForm(id); }

async function deleteMeeting(id) {
  if (!confirm('確定要刪除此會議及所有出席記錄嗎？')) return;
  await api(`/meetings?id=${id}`, { method: 'DELETE' });
  toast('已刪除');
  switchPage('meetings');
}

// ── Members / Guests / Observers Table Page ───────
async function renderTablePage(pc, type, title) {
  await loadAllData();
  const list = { member: members, guest: guests, observer: observers }[type];
  const cols = {
    member: ['名稱','電話'],
    guest: ['名稱','專業','電話','邀請人'],
    observer: ['名稱','專業','Chapter','邀請人']
  }[type];

  pc.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>${title}管理 (${list.length})</h2>
        <button class="btn btn-primary btn-sm" onclick="showPersonForm('${type}')">+ 新增${title}</button>
      </div>
      <div class="search-wrap"><input type="text" id="tbl-search" placeholder="搜尋..." oninput="doSearch('${type}', this.value)"></div>
      <div class="panel-body">
        <div id="tbl-body"></div>
      </div>
    </div>`;
  renderTableBody(type, list);
}

function renderTableBody(type, list) {
  const el = document.getElementById('tbl-body');
  const filtered = searchText ? list.filter(p => JSON.stringify(p).toLowerCase().includes(searchText.toLowerCase())) : list;
  const cols = { member: ['name','tel'], guest: ['name','professional','tel','invited_by'], observer: ['name','professional','chapter','invited_by'] }[type];

  el.innerHTML = `<table class="data-table">
    <thead><tr>${cols.map(c => `<th>${c==='name'?'名稱':c==='tel'?'電話':c==='professional'?'專業':c==='chapter'?'Chapter':c==='invited_by'?'邀請人':''}</th>`).join('')}<th style="width:80px"></th></tr></thead>
    <tbody>${filtered.map(p => `<tr>
      ${cols.map(c => `<td>${c==='name'?`<strong>${esc(p[c]||'')}</strong>`:esc(p[c]||'-')}</td>`).join('')}
      <td class="btns">
        <button class="btn btn-outline btn-sm" onclick="showPersonForm('${type}',${p.id})">編輯</button>
        <button class="btn btn-danger btn-sm" onclick="deletePerson('${type}',${p.id},'${esc(p.name)}')">刪除</button>
      </td>
    </tr>`).join('')}</tbody></table>
    ${filtered.length===0?'<div class="empty">無匹配結果</div>':''}`;
}

function doSearch(type, val) {
  searchText = val;
  const list = { member: members, guest: guests, observer: observers }[type];
  renderTableBody(type, list);
}

function showPersonForm(type, editId) {
  const labels = { member: '會員', guest: '來賓', observer: '觀察員' };
  const list = { member: members, guest: guests, observer: observers }[type];
  const p = editId ? list.find(x => x.id === editId) || {} : {};

  let extra = '';
  if (type === 'guest' || type === 'observer') {
    extra += `<label>專業</label><input type="text" id="pf-prof" value="${esc(p.professional||'')}" placeholder="專業/行業">`;
  }
  if (type === 'observer') {
    extra += `<label>Chapter</label><input type="text" id="pf-chapter" value="${esc(p.chapter||'')}" placeholder="Chapter名稱">`;
  }
  if (type === 'guest' || type === 'observer') {
    extra += `<label>邀請人</label><input type="text" id="pf-invited" value="${esc(p.invited_by||'')}" placeholder="邀請人名稱">`;
  }

  showModal((editId?'編輯':'新增')+labels[type], `
    <label>名稱 *</label><input type="text" id="pf-name" value="${esc(p.name||'')}" placeholder="名稱">
    <label>電話</label><input type="tel" id="pf-tel" value="${esc(p.tel||'')}" placeholder="電話號碼">
    ${extra}
    <button class="btn btn-primary" style="width:100%;margin-top:8px" id="save-pf">${editId?'儲存':'新增'}</button>
  `);
  document.getElementById('save-pf').onclick = async () => {
    const name = document.getElementById('pf-name').value.trim();
    if (!name) return toast('請輸入名稱');
    const body = { name, tel: document.getElementById('pf-tel')?.value || '' };
    if (type === 'guest' || type === 'observer') body.professional = document.getElementById('pf-prof')?.value || '';
    if (type === 'observer') body.chapter = document.getElementById('pf-chapter')?.value || '';
    if (type === 'guest' || type === 'observer') body.invited_by = document.getElementById('pf-invited')?.value || '';

    if (editId) {
      await api(`/${type}s?id=${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await api(`/${type}s`, { method: 'POST', body: JSON.stringify(body) });
    }
    hideModal(); toast(editId ? '已更新' : '已新增');
    await loadAllData();
    const el = document.getElementById('tbl-body');
    if (el) renderTableBody(type, { member: members, guest: guests, observer: observers }[type]);
  };
}

async function deletePerson(type, id, name) {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return;
  await api(`/${type}s?id=${id}`, { method: 'DELETE' });
  toast('已刪除');
  await loadAllData();
  const el = document.getElementById('tbl-body');
  if (el) renderTableBody(type, { member: members, guest: guests, observer: observers }[type]);
}

// ── Check-in Operation Page ───────────────────────
async function renderCheckinOp(pc) {
  await loadAllData();
  const mts = await api('/meetings');
  const today = new Date().toISOString().split('T')[0];
  const recentMt = mts.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 1);
  pc.innerHTML = `
    <div class="panel checkin-members">
      <div class="panel-header"><h2>簽到操作</h2></div>
      <div class="panel-body" style="padding:16px">
        <div style="display:flex;gap:10px;align-items:end;margin-bottom:16px;flex-wrap:wrap">
          <div style="flex:1;min-width:140px"><label>會議</label><select id="ci-meeting">${mts.map(m => `<option value="${m.id}" ${m.date===today?'selected':''}>${m.date} ${m.type==='regular'?'例會':'特別會議'}</option>`).join('')}</select></div>
          <div><button class="btn btn-primary" onclick="startCheckinOp()">開始簽到</button></div>
        </div>
        <div id="ci-area"></div>
      </div>
    </div>`;
}

async function startCheckinOp() {
  const mtId = parseInt(document.getElementById('ci-meeting').value);
  const m = await api(`/meetings?id=${mtId}`);
  if (!m || m.error) return toast('找不到會議');
  currentMeeting = m;
  meetingAttendance = m.attendance || [];
  await loadAllData();
  renderCheckinOpList();
}

function renderCheckinOpList() {
  const area = document.getElementById('ci-area');
  const attMap = {};
  meetingAttendance.forEach(a => { attMap[`${a.person_type}_${a.person_id}`] = a; });

  let html = `<div style="margin-bottom:12px"><strong>${currentMeeting.date}</strong> ${currentMeeting.type==='regular'?'例會':'特別會議'} · 收款人: ${esc(currentMeeting.collector||'')}</div>`;

  const sections = [
    { key: 'member', label: '會員', list: members },
    { key: 'guest', label: '來賓', list: guests },
    { key: 'observer', label: '觀察員', list: observers },
  ];
  sections.forEach(sec => {
    html += `<div style="font-weight:700;font-size:13px;color:var(--text2);padding:10px 0 4px">${sec.label} (${sec.list.length})</div>`;
    sec.list.forEach(p => {
      const att = attMap[`${sec.key}_${p.id}`];
      const paid = att && att.payment && att.payment !== '' && att.payment !== 'unpaid';
      html += `<div class="person-row">
        <span class="name">${esc(p.name)}</span>
        <span style="font-size:13px;color:var(--primary)">${att?.arrival_time||''}</span>
        <span class="badge ${paid?'badge-paid':'badge-unpaid'}" style="cursor:pointer" onclick="togglePayOp('${sec.key}',${p.id})">${paid?'已付':'未付'}</span>
        <button class="btn btn-outline btn-sm" onclick="setTimeOp('${sec.key}',${p.id})">時間</button>
      </div>`;
    });
  });
  html += `<div style="margin-top:12px"><button class="btn btn-primary" onclick="saveCheckinOp()">💾 儲存簽到記錄</button></div>`;
  area.innerHTML = html;
}

function getOrCreateOpAtt(type, pid) {
  let att = meetingAttendance.find(a => a.person_type === type && a.person_id === pid);
  if (!att) { att = { person_type: type, person_id: pid, substitute: '', payment: '', payment_method: '', arrival_time: '', remark: '' }; meetingAttendance.push(att); }
  return att;
}
function togglePayOp(type, pid) {
  const att = getOrCreateOpAtt(type, pid);
  att.payment = (att.payment === 'paid') ? '' : 'paid';
  renderCheckinOpList();
}
function setTimeOp(type, pid) {
  const att = getOrCreateOpAtt(type, pid);
  const now = new Date();
  const hh=String(now.getHours()).padStart(2,'0'), mm=String(now.getMinutes()).padStart(2,'0');
  showModal('設定時間', `<input type="time" id="op-time" value="${att.arrival_time||`${hh}:${mm}`}"><button class="btn btn-primary" style="width:100%;margin-top:8px" id="save-op-time">確認</button>`);
  document.getElementById('save-op-time').onclick = () => {
    att.arrival_time = document.getElementById('op-time').value;
    hideModal(); renderCheckinOpList();
  };
}
async function saveCheckinOp() {
  if (!currentMeeting) return toast('請先選擇會議');
  for (const att of meetingAttendance) {
    await api('/attendance', { method: 'POST', body: JSON.stringify({ meeting_id: currentMeeting.id, ...att }) });
  }
  toast('簽到記錄已儲存！');
}

// ── Settings Page ─────────────────────────────────
async function renderSettingsPage(pc) {
  const settings = await api('/settings');
  const fields = [
    { key: 'title', label: '頁面標題' },
    { key: 'loading', label: '載入中文字' },
    { key: 'checkin', label: '簽到標題' },
    { key: 'noMeeting', label: '無會議提示' },
    { key: 'noMeetingHint', label: '無會議說明' },
    { key: 'allPeople', label: '名單標題' },
    { key: 'confirmTitle', label: '確認對話標題' },
    { key: 'cancel', label: '取消按鈕' },
    { key: 'confirm', label: '確認按鈕' },
    { key: 'paid', label: '已繳費標籤' },
    { key: 'unpaid', label: '未繳費標籤' },
    { key: 'paidTri', label: '結果頁-已繳費(三語)' },
    { key: 'unpaidTri', label: '結果頁-未繳費(三語)' },
    { key: 'checkedInTri', label: '結果頁-已簽到(三語)' },
    { key: 'memberLabel', label: '會員標籤' },
    { key: 'guestLabel', label: '來賓標籤' },
    { key: 'observerLabel', label: '觀察員標籤' },
    { key: 'regular', label: '例會標籤' },
    { key: 'special', label: '特別會議標籤' },
    { key: 'lunchFee', label: '午餐費(HK$)' },
    { key: 'tableNumber', label: '枱號' },
    { key: 'schedule', label: '節目時間表 (每行一個)' },
    { key: 'chairmanMsg', label: '主席感謝話 (可多行)' },
    { key: 'paymeLink', label: 'PayMe 付款連結' },
    { key: 'wcLink', label: 'WeChat Pay 付款連結' },
    { key: 'aliLink', label: 'Alipay HK 付款連結' },
    { key: 'wcQrImg', label: 'WeChat Pay QR 圖 (已上傳)' },
    { key: 'aliQrImg', label: 'Alipay HK QR 圖 (已上傳)' },
  ];

  pc.innerHTML = `<div class="panel">
    <div class="panel-header"><h2>文字設定</h2><button class="btn btn-primary btn-sm" onclick="saveSettings()">💾 儲存全部</button></div>
    <div class="panel-body" style="padding:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px" id="settings-grid">
        ${fields.map(f => {
          if (f.key === 'schedule' || f.key === 'chairmanMsg') {
            return '<div style="grid-column:1/-1"><label style="font-size:12px;font-weight:600;margin-bottom:2px">'+f.label+'</label><textarea id="set-'+f.key+'" style="width:100%;height:160px;padding:10px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;font-family:inherit;line-height:1.6" placeholder="12:30 報到&#10;12:45 例會開始&#10;...">'+esc(settings[f.key]||'')+'</textarea></div>';
          }
          return '<div><label style="font-size:12px;font-weight:600;margin-bottom:2px">'+f.label+'</label><input type="text" id="set-'+f.key+'" value="'+esc(settings[f.key]||'')+'" style="width:100%"></div>';
        }).join('')}
      </div>
      <div style="margin-top:20px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div>
          <label style="font-size:13px;font-weight:700;margin-bottom:6px">💚 WeChat Pay QR 圖</label>
          <input type="file" id="wc-file" accept="image/*" style="font-size:13px;margin-bottom:6px">
          <div id="wc-preview" style="margin-top:6px">${settings.wcQrImg ? '<img src="/api/image?name=qr-wechatpay" style="max-width:200px;border:1px solid #e2e8f0;border-radius:8px">' : '<span style="color:#94a3b8;font-size:12px">未上傳</span>'}</div>
          <button class="btn btn-sm btn-outline" style="margin-top:6px" onclick="uploadQR(\'wechatpay\')">上傳 WeChat QR</button>
        </div>
        <div>
          <label style="font-size:13px;font-weight:700;margin-bottom:6px">💙 Alipay HK QR 圖</label>
          <input type="file" id="ali-file" accept="image/*" style="font-size:13px;margin-bottom:6px">
          <div id="ali-preview" style="margin-top:6px">${settings.aliQrImg ? '<img src="/api/image?name=qr-alipay" style="max-width:200px;border:1px solid #e2e8f0;border-radius:8px">' : '<span style="color:#94a3b8;font-size:12px">未上傳</span>'}</div>
          <button class="btn btn-sm btn-outline" style="margin-top:6px" onclick="uploadQR(\'alipay\')">上傳 Alipay QR</button>
        </div>
      </div>
    </div>
  </div>`;

  window._settingsFields = fields;
  window._settings = settings;
}

async function uploadQR(type) {
  var fileInput = document.getElementById(type === 'wechatpay' ? 'wc-file' : 'ali-file');
  var file = fileInput.files[0];
  if (!file) return toast('請選擇圖片');
  var reader = new FileReader();
  reader.onload = async function() {
    var result = await api('/upload-qr', { method: 'POST', body: JSON.stringify({ name: type, data: reader.result }) });
    if (result && result.ok) {
      toast('QR 圖已上傳！');
      // Save to settings too
      await api('/settings', { method: 'PUT', body: JSON.stringify({ [type==='wechatpay'?'wcQrImg':'aliQrImg']: '/api/image?name=qr-'+type }) });
      // Refresh preview
      var preview = document.getElementById(type==='wechatpay'?'wc-preview':'ali-preview');
      preview.innerHTML = '<img src="/api/image?name=qr-'+type+'" style="max-width:200px;border:1px solid #e2e8f0;border-radius:8px">';
    } else {
      toast('上傳失敗');
    }
  };
  reader.readAsDataURL(file);
}

async function saveSettings() {
  var data = {};
  window._settingsFields.forEach(function(f) {
    var el = document.getElementById('set-'+f.key);
    if (el) data[f.key] = el.value;
  });
  await api('/settings', { method: 'PUT', body: JSON.stringify(data) });
  toast('文字設定已儲存！');
}

// ── Helpers ───────────────────────────────────────
async function loadAllData() {
  const [m, g, o] = await Promise.all([api('/members'), api('/guests'), api('/observers')]);
  members = m; guests = g; observers = o;
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    ...opts,
  });
  return res.json();
}

function showModal(title, body) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-dialog').innerHTML = `<h3>${title}</h3>${body}`;
  overlay.style.display = 'flex';
}
function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

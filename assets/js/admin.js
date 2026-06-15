// BNI Galaxy ST — Admin Backend
const API = '/api';
let currentPage = 'overview';
let members = [], guests = [], meetings = [];
let currentMeeting = null;
let meetingAttendance = [];
let searchText = '';
let ciViewMode = 'card';
let mgmtViewMode = 'card';
let ciPollTimer = null;
let ciLastHash = '';

async function doLogin() {
  const pwd = document.getElementById('login-pwd').value;
  const err = document.getElementById('login-err');
  try {
    const res = await fetch(API + '/auth?action=login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pwd }) });
    const data = await res.json();
    if (data.ok) {
      document.getElementById('login-overlay').style.display = 'none';
      switchPage('overview');
      initSessions();
    } else {
      err.textContent = data.error || '密碼錯誤';
      err.style.display = 'block';
    }
  } catch (e) {
    err.textContent = '連線失敗';
    err.style.display = 'block';
  }
}

// ── Init ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Always set up nav event listeners regardless of auth
  document.querySelectorAll('.sb-link').forEach(link => {
    link.addEventListener('click', () => {
      switchPage(link.dataset.page);
      if (window.innerWidth <= 1024) closeSidebar();
    });
  });

  // Auth check
  try {
    const check = await api('/auth?action=check');
    if (!check.ok) {
      document.getElementById('login-overlay').style.display = 'flex';
      return;
    }
  } catch (e) {
    document.getElementById('login-overlay').style.display = 'flex';
    return;
  }
  switchPage('overview');
  initSessions();
});

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const isOpen = sidebar.classList.toggle('show');
  overlay.classList.toggle('show', isOpen);
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('show');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

function switchPage(page) {
  currentPage = page;
  document.querySelectorAll('.sb-link').forEach(l => l.classList.toggle('active', l.dataset.page === page));
  document.getElementById('topbar-title').textContent = {
    overview: '總覽', meetings: '會議管理', members: '會員管理',
    guests: '來賓管理', checkin: '簽到操作', settings: '系統設定', qatraining: 'Q&A 訓練', skill: '火炭會 Skill'
  }[page] || '';
  if (page !== 'checkin') { clearInterval(ciPollTimer); ciPollTimer = null; }
  loadPage(page).catch(function(e) {
    document.getElementById('page-content').innerHTML = '<div class="empty">頁面載入失敗：'+esc(e.message)+'<br><small>請檢查網絡連接後重新整理</small></div>';
  });
}

async function loadPage(page) {
  const pc = document.getElementById('page-content');
  switch (page) {
    case 'overview': await renderOverview(pc); break;
    case 'meetings': await renderMeetings(pc); break;
    case 'members': await renderTablePage(pc, 'member', '會員'); break;
    case 'guests': await renderTablePage(pc, 'guest', '來賓'); break;
    case 'checkin': await renderCheckinOp(pc); break;
    case 'settings': await renderSettingsPage(pc); break;
    case 'qatraining': await renderQATraining(pc); break;
    case 'docs': renderDocsPage(pc); break;
    case 'skill': await renderSkillPage(pc); break;
  }
}

// ── Overview ──────────────────────────────────────
async function renderOverview(pc) {
  try {
    const stats = await api('/stats');
    const mts = await api('/meetings');
    pc.innerHTML = `
    <div class="stat-grid">
      <div class="stat-card"><div class="n">${stats.total_meetings||0}</div><div class="l">總會議次數</div></div>
      <div class="stat-card"><div class="n">${stats.member_count||0}</div><div class="l">會員人數</div></div>
      <div class="stat-card"><div class="n">${stats.total_attendance||0}</div><div class="l">總出席記錄</div></div>
      <div class="stat-card"><div class="n">${stats.paid_count||0}</div><div class="l">已付款次數</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div class="panel">
        <div class="panel-header"><h2>📈 出席趨勢</h2></div>
        <div class="panel-body" style="position:relative;height:260px"><canvas id="chart-trend"></canvas></div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2>💰 付款分佈</h2></div>
        <div class="panel-body" style="position:relative;height:260px"><canvas id="chart-payment"></canvas></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header">
        <h2>最近會議</h2>
        <div style="display:flex;gap:8px;align-items:center">
          <select id="ov-filter" onchange="filterOverview()" style="padding:5px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:12px;background:#fff">
            <option value="all">📋 所有記錄</option>
            <option value="unpaid">💰 未收費</option>
            <option value="paid">✅ 已收費</option>
          </select>
          <button class="btn btn-sm btn-outline" onclick="exportOverviewCSV()" style="font-size:11px">📥 摘要</button>
          <button class="btn btn-sm btn-outline" onclick="exportDetailCSV()" style="font-size:11px">📋 詳細</button>
          <button class="btn btn-primary btn-sm" onclick="switchPage('meetings')">查看全部</button>
        </div>
      </div>
      <div class="panel-body">
        <table class="data-table">
          <thead><tr><th></th><th>日期</th><th>類型</th><th>收款人</th><th>來賓費</th></tr></thead>
          <tbody>${mts.slice(0,20).map(m => `<tr class="expand-tr" onclick="toggleOverviewMeeting(${m.id})">
            <td><span class="arrow">▶</span></td>
            <td><strong>${m.date}</strong></td>
            <td>${mLblText(m.type)}</td>
            <td>${esc(m.collector||'-')}</td>
            <td>${m.guest_fee||0}</td>
          </tr>
          <tr class="detail-row" id="ov-att-${m.id}"><td colspan="5"></td></tr>`).join('')}</tbody>
        </table>
        ${mts.length===0 ? '<div class="empty">暫無會議</div>' : ''}
      </div>
    </div>`;
    renderOverviewCharts(mts);
  } catch(e) {
    pc.innerHTML = '<div class="empty">載入失敗：'+esc(e.message)+'</div>';
  }
}

async function renderOverviewCharts(mts) {
  // Attendance trend - last 12 meetings in chronological order
  const recent = [...mts].filter(m => m.date).sort((a,b) => a.date.localeCompare(b.date)).slice(-12);
  const labels = recent.map(m => m.date);
  const attCounts = [];
  const paidCounts = [];
  for (const m of recent) {
    const detail = await api('/meetings?id='+m.id);
    const att = detail.attendance || [];
    attCounts.push(att.filter(a => a.arrival_time && a.arrival_time !== 'absent').length);
    paidCounts.push(att.filter(a => a.payment && a.payment !== 'unpaid' && a.payment !== '').length);
  }

  const ctx1 = document.getElementById('chart-trend');
  if (ctx1) {
    Chart.getChart(ctx1)?.destroy();
    new Chart(ctx1, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '出席人數', data: attCounts, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.3, pointRadius: 4 },
          { label: '已付款', data: paidCounts, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { size: 11 } } } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 5 } },
          x: { ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  // Payment breakdown - aggregate across all meetings
  const allAtt = [];
  for (const m of mts.slice(0, 20)) {
    const detail = await api('/meetings?id='+m.id);
    (detail.attendance || []).forEach(a => allAtt.push(a));
  }
  const paid = allAtt.filter(a => a.payment && a.payment !== 'unpaid' && a.payment !== '').length;
  const unpaid = allAtt.filter(a => a.arrival_time && a.arrival_time !== 'absent' && (!a.payment || a.payment === 'unpaid' || a.payment === '')).length;
  const absent = allAtt.filter(a => a.arrival_time === 'absent').length;

  const ctx2 = document.getElementById('chart-payment');
  if (ctx2) {
    Chart.getChart(ctx2)?.destroy();
    new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['已付款', '未付款', '缺席'],
        datasets: [{ data: [paid, unpaid, absent], backgroundColor: ['#10b981', '#f59e0b', '#94a3b8'], borderWidth: 0 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 16, font: { size: 11 } } } }
      }
    });
  }
}

async function toggleOverviewMeeting(mid) {
  const row = document.querySelector('#ov-att-'+mid);
  const tr = row?.previousElementSibling;
  if (row.classList.contains('show')) { row.classList.remove('show'); tr?.classList.remove('open'); return; }
  document.querySelectorAll('.detail-row.show').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.expand-tr.open').forEach(r => r.classList.remove('open'));

  tr?.classList.add('open');

  const m = await api('/meetings?id='+mid);
  const att = m.attendance || [];
  if (att.length === 0) { row.firstElementChild.innerHTML = '<div class="empty">暫無出席記錄</div>'; row.classList.add('show'); return; }

  await loadAllData();
  const getName = (type, id) => ({member:members, guest:guests}[type]||[]).find(p => p.id===id);
  var html = '<div style="padding:12px 0;display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">'+
    att.map(a => {
      const p = getName(a.person_type, a.person_id);
      const name = p?p.name:'?';
      const paid = a.payment && a.payment!=='unpaid' && a.payment!=='';
      const absent = a.arrival_time === 'absent';
      var safeName = esc(name).replace(/'/g,"\\'");
      return '<div class="ov-person-card" style="cursor:pointer" onclick="event.stopPropagation();showOverviewPayOps(\''+a.person_type+'\','+a.person_id+','+a.id+',\''+safeName+'\','+paid+')">'+
        '<div class="pc-av '+a.person_type+'" style="width:32px;height:32px;font-size:13px">'+esc(name.charAt(0))+'</div>'+
        '<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">'+esc(name)+'</div>'+
        '<div style="font-size:11px;color:var(--text2)">'+(absent?'缺席':esc(a.arrival_time||'—'))+'</div></div>'+
        '<span class="badge '+payClass(a.payment)+'" style="font-size:10px">'+payLabel(a.payment)+'</span>'+
      '</div>';
    }).join('')+
  '</div>';
  row.firstElementChild.innerHTML = html;
  row.classList.add('show');
}

function filterOverview() {
  const filter = document.getElementById('ov-filter')?.value || 'all';
  document.querySelectorAll('.ov-person-card').forEach(card => {
    const isPaid = card.querySelector('.badge-paid');
    const isUnpaid = card.querySelector('.badge-unpaid');
    if (filter === 'all') card.style.display = '';
    else if (filter === 'paid') card.style.display = isPaid ? '' : 'none';
    else if (filter === 'unpaid') card.style.display = isUnpaid ? '' : 'none';
  });
}

async function exportOverviewCSV() {
  const mts = await api('/meetings');
  let csv = '日期,類型,收款人,來賓費,簽到人數,已付款,未付款\n';
  for (const m of mts.slice(0, 20)) {
    const detail = await api('/meetings?id='+m.id);
    const att = detail.attendance || [];
    const paid = att.filter(a => a.payment === 'paid').length;
    const unpaid = att.filter(a => a.payment !== 'paid' && a.arrival_time !== 'absent').length;
    csv += [m.date, mLblText(m.type), m.collector||'', m.guest_fee||0, att.length, paid, unpaid].join(',') + '\n';
  }
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '火炭會會議紀錄.csv';
  a.click();
  toast('CSV 已下載');
}

async function exportDetailCSV() {
  const mts = await api('/meetings');
  await loadAllData();
  let csv = '會議日期,會議類型,收款人,類別,姓名,電話,到達時間,付款狀態,付款方式,備註\n';
  for (const m of mts.slice(0, 20)) {
    const detail = await api('/meetings?id='+m.id);
    const att = detail.attendance || [];
    if (att.length === 0) {
      csv += [m.date, mLblText(m.type), m.collector||'', '', '', '', '', '', '', ''].join(',') + '\n';
    } else {
      att.forEach(a => {
        const p = (a.person_type==='member'?members:a.person_type==='guest'?guests:[]).find(x => x.id===a.person_id);
        const name = p ? p.name : '?';
        const tel = p ? (p.tel||'') : '';
        const paid = a.payment && a.payment!=='unpaid' && a.payment!=='';
        csv += [m.date, mLblText(m.type), m.collector||'', a.person_type==='member'?'會員':'來賓', name, tel, a.arrival_time||'', payLabel(a.payment), a.payment_method||'', (a.remark||'').replace(/,/g,';')].join(',') + '\n';
      });
    }
  }
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '火炭會詳細出席紀錄.csv';
  a.click();
  toast('詳細 CSV 已下載');
}

async function showOverviewPayOps(type, pid, attId, name, paid) {
  var typeLabel = type==='member'?'會員':type==='guest'?'來賓':'';
  var isFree = paid === 'free';
  var payStatus = paid ? (isFree ? '🆓 免費' : '✅ 已付款') : '❌ 未付款';
  // Load receipts — only show if they actually exist
  var receiptImgs = '';
  var imgTags = [];
  // Checkin receipt (only if uploaded via receipt upload flow)
  try {
    var attRecord = await api('/attendance?meeting_id='+(meetings[0]?.id||10));
    var thisAtt = Array.isArray(attRecord) ? attRecord.find(function(a){return a.id===attId}) : null;
    if (thisAtt && thisAtt.payment_method === 'receipt_uploaded') {
      var checkinUrl = '/api/image?name=receipt-att-'+attId;
      imgTags.push('<a href="'+checkinUrl+'" target="_blank"><img src="'+checkinUrl+'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"></a>');
    }
  } catch(e) {}
  // Member receipts from member_receipts table
  if (type === 'member') {
    try {
      var receipts = await loadReceipts(pid);
      receipts.forEach(function(r) {
        imgTags.push('<a href="/api/receipts?id='+r.id+'" target="_blank"><img src="/api/receipts?id='+r.id+'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"></a>');
      });
    } catch(e) {}
  }
  if (imgTags.length > 0) {
    receiptImgs = '<div style="margin:8px 0"><div style="font-size:11px;color:var(--text2);margin-bottom:4px">📄 已上傳憑證</div><div style="display:flex;gap:4px;flex-wrap:wrap">'+imgTags.join('')+'</div></div>';
  }
  var paySection = '<div style="text-align:center;padding:8px 0"><span style="font-size:14px;font-weight:700;color:'+(isFree?'#3b82f6':(paid?'#10b981':'#f59e0b'))+'">'+payStatus+'</span></div>';
  paySection += receiptImgs;
  if (!paid) {
    paySection += '<div style="text-align:center;font-size:24px;font-weight:800;margin-bottom:12px">HK$388</div>';
    // 1. 憑證付費
    paySection += '<div style="background:#f0fdf4;border:1.5px solid #10b981;border-radius:10px;padding:12px;margin-bottom:8px"><div style="font-weight:700;font-size:13px;color:#10b981;margin-bottom:8px">📤 憑證付費</div>';
    paySection += '<input type="file" id="ov-receipt" accept="image/*" style="width:100%;font-size:12px;margin-bottom:6px">';
    paySection += '<button class="btn btn-sm" style="width:100%;background:#10b981;color:#fff" onclick="uploadOverviewReceipt('+pid+','+attId+')">確認上傳憑證</button></div>';
    // 2. 免費
    paySection += '<div style="background:#eff6ff;border:1.5px solid #3b82f6;border-radius:10px;padding:12px;margin-bottom:8px"><div style="font-weight:700;font-size:13px;color:#3b82f6;margin-bottom:8px">🆓 免費嘉賓</div>';
    paySection += '<button class="btn btn-sm" style="width:100%;background:#3b82f6;color:#fff" onclick="markPaymentType('+attId+',\'free\')">標記為免費</button></div>';
    // 3. 現金
    paySection += '<div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:10px;padding:12px;margin-bottom:8px"><div style="font-weight:700;font-size:13px;color:#f59e0b;margin-bottom:8px">💵 現金付款</div>';
    paySection += '<button class="btn btn-sm" style="width:100%;background:#f59e0b;color:#fff" onclick="markPaymentType('+attId+',\'paid\')">標記現金已付</button></div>';
  }
  showModal('👤 '+esc(name)+' · '+typeLabel, `
    ${paySection}
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <button class="btn btn-danger-fill btn-sm" style="width:100%" onclick="if(confirm('確定要移除 '+esc('${name}')+' 的出席記錄嗎？')){deleteAttendee(${attId})}">🗑️ 移除此出席記錄</button>
    </div>
  `);
}
async function markPaymentType(attId, paymentType) {
  await api('/attendance', {method:'PUT',body:JSON.stringify({id:attId,payment:paymentType})});
  toast(paymentType==='free'?'已標記為免費':'已標記現金付款');
  hideModal();
}
async function deleteAttendee(attId) {
  await api('/attendance', {method:'DELETE',body:JSON.stringify({id:attId})});
  toast('已刪除出席記錄');
  hideModal();
}
async function uploadOverviewReceipt(memberId, attId) {
  const file = document.getElementById('ov-receipt')?.files[0];
  if (!file) { toast('請選擇憑證圖片'); return; }
  const reader = new FileReader();
  reader.onload = async () => {
    await api('/checkin-upload', {method:'POST',body:JSON.stringify({attendance_id:attId,data:reader.result})});
    toast('憑證已上傳，已標記付款');
    hideModal();
  };
  reader.readAsDataURL(file);
}
async function markOverviewPaid(attId) {
  await api('/attendance', {method:'PUT',body:JSON.stringify({id:attId,payment:'paid'})});
  toast('已標記付款');
  hideModal();
}

async function showPersonReceipts(type, pid, name) {
  if (type !== 'member') { toast(name+' 是來賓，無收據記錄'); return; }
  const receipts = await loadReceipts(pid);
  if (receipts.length === 0) { toast(name+' 暫無上傳收據'); return; }
  showModal('📄 '+esc(name)+' 的付款憑證', `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-top:8px">
      ${receipts.map(r => `
        <a href="/api/receipts?id=${r.id}" target="_blank" style="display:block;border-radius:10px;overflow:hidden;border:2px solid #e2e8f0">
          <img src="/api/receipts?id=${r.id}" style="width:100%;height:120px;object-fit:cover;display:block" alt="${esc(r.filename)}">
        </a>
      `).join('')}
    </div>
    <p style="font-size:11px;color:var(--text2);margin-top:8px;text-align:center">${receipts.length} 張憑證 · 點擊圖片放大</p>
  `);
}

// ── Meetings ──────────────────────────────────────
let mtgViewMode = 'list';
async function renderMeetings(pc) {
  meetings = await api('/meetings');
  const calHTML = mtgViewMode==='calendar' ? renderCalendarView() : '';
  pc.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>會議列表 (${meetings.length})</h2>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-sm ${mtgViewMode==='list'?'btn-primary':'btn-outline'}" onclick="mtgViewMode='list';switchPage('meetings')" style="font-size:11px">📋 列表</button>
          <button class="btn btn-sm ${mtgViewMode==='calendar'?'btn-primary':'btn-outline'}" onclick="mtgViewMode='calendar';switchPage('meetings')" style="font-size:11px">📅 日曆</button>
          <button class="btn btn-primary btn-sm" onclick="showMeetingForm()">+ 新增會議</button>
        </div>
      </div>
      ${calHTML}
      <div class="panel-body"${mtgViewMode==='calendar'?' style="display:none"':''}>
        <table class="data-table">
          <thead><tr><th></th><th>日期</th><th>類型</th><th>會員</th><th>來賓</th><th>已收</th><th>未收</th><th></th></tr></thead>
          <tbody>${meetings.map(m => { var s=m.stats||{}; return `<tr class="expand-tr" data-mid="${m.id}" onclick="toggleMeetingRow(${m.id})">
            <td><span class="arrow">▶</span></td>
            <td><strong>${m.date}</strong></td>
            <td>${m.type==='regular'?'例會':m.type==='anniversary'?'週年聚餐':'特別會議'}</td>
            <td>${s.members||0}</td>
            <td>${s.guests||0}</td>
            <td style="color:#10b981;font-weight:600">${s.paid||0}</td>
            <td style="color:#ef4444;font-weight:600">${s.unpaid||0}</td>
            <td class="btns">
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();editMeeting(${m.id})">編輯</button>
              <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deleteMeeting(${m.id})">刪除</button>
            </td>
          </tr>
          <tr class="detail-row" id="att-${m.id}"><td colspan="9"></td></tr>`; }).join('')}</tbody>
        </table>
        ${meetings.length===0 ? '<div class="empty">暫無會議記錄</div>' : ''}
      </div>
    </div>`;
}

function renderCalendarView() {
  const now = new Date();
  let y = now.getFullYear(), m = now.getMonth();
  if (window._calYear !== undefined) { y = window._calYear; m = window._calMonth; }
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const meetingMap = {};
  meetings.forEach(mt => { meetingMap[mt.date] = mt; });

  const dayNames = ['日','一','二','三','四','五','六'];
  let html = '<div class="panel-body"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">'+
    '<button class="btn btn-sm btn-outline" onclick="window._calYear='+(m===0?y-1:y)+';window._calMonth='+(m===0?11:m-1)+';switchPage(\'meetings\')">◀ 上月</button>'+
    '<strong style="font-size:16px">'+y+'年 '+(m+1)+'月</strong>'+
    '<button class="btn btn-sm btn-outline" onclick="window._calYear='+(m===11?y+1:y)+';window._calMonth='+(m===11?0:m+1)+';switchPage(\'meetings\')">下月 ▶</button>'+
  '</div>';

  html += '<table style="width:100%;border-collapse:collapse;table-layout:fixed">'+
    '<thead><tr>'+dayNames.map(d => '<th style="padding:8px;text-align:center;font-size:12px;font-weight:600;color:var(--text2);background:#f8fafc">'+d+'</th>').join('')+'</tr></thead><tbody>';

  let d = 1;
  for (let w = 0; w < 6 && d <= daysInMonth; w++) {
    html += '<tr>';
    for (let dow = 0; dow < 7; dow++) {
      if ((w === 0 && dow < firstDay) || d > daysInMonth) {
        html += '<td style="padding:4px;background:#fafafa"></td>';
      } else {
        var dateStr = y + '-' + String(m+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        var mt2 = meetingMap[dateStr];
        var isToday2 = dateStr === new Date().toISOString().split('T')[0];
        var tdStyle = 'padding:4px;text-align:center;vertical-align:top;border:1px solid #e2e8f0;height:70px;cursor:pointer';
        if (isToday2) tdStyle += ';background:#eff6ff';
        if (mt2) tdStyle += ';background:#f0fdf4';
        var tdAttr = '';
        if (mt2) tdAttr = ' onclick="selectMeetingCard(' + mt2.id + ');switchPage(\'checkin\')" title="' + esc(mLblText(mt2.type)) + '"';
        html += '<td style="' + tdStyle + '"' + tdAttr + '>' +
          '<span style="font-size:12px;font-weight:' + (isToday2?'700':'400') + ';color:' + (isToday2?'var(--primary)':'var(--text)') + '">' + d + '</span>' +
          (mt2 ? '<div style="margin-top:2px;font-size:9px;line-height:1.2;color:#10b981;font-weight:600">' + mLblText(mt2.type) + '</div>' : '') +
        '</td>';
        d++;
      }
    }
    html += '</tr>';
  }
  html += '</tbody></table></div>';
  return html;
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

  const m = await api(`/meetings?id=${mid}`);
  const att = m.attendance || [];
  const allMembers = await api('/members?all=1');
  const allGuests = await api('/guests');
  const getName = (type, id) => ({ member: allMembers, guest: allGuests }[type]||[]).find(p => p.id == id)?.name || '?';
  const typeLabel = { member: '會員', guest: '來賓' };

  var sortedAtt = [];
  ['member','guest'].forEach(function(t){
    att.filter(function(a){return a.person_type===t}).forEach(function(a){sortedAtt.push(a)});
  });
  sortedAtt.sort(function(a,b){ return (getName(a.person_type,a.person_id)).localeCompare(getName(b.person_type,b.person_id),'zh-Hant'); });

  var filterHtml = '<div style="margin-bottom:6px;display:flex;gap:8px;align-items:center"><select onchange="filterAttendees('+mid+',this.value)" style="padding:4px 10px;border:1.5px solid var(--border);border-radius:6px;font-size:11px;background:#fff"><option value="all">📋 全部</option><option value="paid">✅ 已繳費</option><option value="free">🆓 免費</option><option value="unpaid">❌ 未繳費</option><option value="absent">✕ 缺席</option></select><span style="font-size:10px;color:var(--text2)" id="att-count-'+mid+'">共 '+att.length+' 人</span></div>';

  detail.firstElementChild.innerHTML = att.length === 0 ? '<div class="empty">無出席記錄</div>' :
    filterHtml + '<div id="att-list-'+mid+'" style="padding:8px 0">'+
    sortedAtt.map(function(a){
      var ptype = a.person_type;
      var pname = esc(getName(ptype, a.person_id));
      var paid = a.payment==='paid'||a.payment==='free';
      var absent = a.arrival_time === 'absent';
      var payCls = absent ? 'absent' : (a.payment==='free'?'free':(paid?'paid':'unpaid'));
      var safeName = pname.replace(/'/g,"\\'");
      return '<div class="att-mini att-'+payCls+'" style="cursor:pointer" onclick="event.stopPropagation();showOverviewPayOps(\''+ptype+'\','+a.person_id+','+a.id+',\''+safeName+'\','+paid+')">'+
        '<span style="font-size:11px;color:var(--text2);min-width:44px">'+ (typeLabel[ptype]||ptype) +'</span>'+
        '<span style="flex:1;font-weight:500">'+pname+'</span>'+
        (a.substitute ? '<span style="font-size:11px;color:var(--text2)">代:'+esc(a.substitute)+'</span>' : '')+
        '<span style="color:'+(absent?'#94a3b8':'var(--primary)')+';font-weight:500">'+(absent?'缺席':a.arrival_time||'—')+'</span>'+
        '<span class="badge '+payClass(a.payment)+'">'+payLabel(a.payment)+'</span>'+
        (a.payment_method ? '<span style="font-size:11px">'+a.payment_method+'</span>' : '')+
      '</div>';
    }).join('')+
    '</div></div>';
  detail.classList.add('show');
}

function filterAttendees(mid, filter) {
  var items = document.querySelectorAll('#att-list-'+mid+' .att-mini');
  var count = 0;
  items.forEach(function(el) {
    var show = filter==='all' || el.classList.contains('att-'+filter);
    el.style.display = show ? '' : 'none';
    if (show) count++;
  });
  var cntEl = document.getElementById('att-count-'+mid);
  if (cntEl) cntEl.textContent = '共 '+count+' 人';
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
      <option value="anniversary" ${m.type==='anniversary'?'selected':''}>週年聚餐</option>
    </select>
    <label>收款人</label><input type="text" id="mt-collector" value="${esc(m.collector||'')}" placeholder="收款人名稱">
    <label>來賓費</label><input type="number" id="mt-fee" value="${m.guest_fee||0}" placeholder="0">
    ${editId ? '' : '<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer"><input type="checkbox" id="mt-add-members" checked style="width:18px;height:18px"> 複製上次會議的與會會員</label>'}
    <button class="btn btn-primary" style="width:100%" id="save-mt">${editId?'儲存':'新增會議'}</button>
  `);
  document.getElementById('save-mt').onclick = async () => {
    const body = {
      date: document.getElementById('mt-date').value,
      type: document.getElementById('mt-type').value,
      collector: document.getElementById('mt-collector').value,
      guest_fee: parseInt(document.getElementById('mt-fee').value) || 0,
      table_number: ''
    };
    const addMembers = !editId && document.getElementById('mt-add-members')?.checked;
    let meetingId = editId;
    if (editId) {
      await api(`/meetings?id=${editId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      const result = await api('/meetings', { method: 'POST', body: JSON.stringify(body) });
      meetingId = result.id;
    }
    if (addMembers && meetingId) {
      // Copy member attendance from the last meeting
      var lastMtg = meetings.length > 0 ? meetings[0] : null;
      if (lastMtg) {
        var lastAtt = await api('/attendance?meeting_id=' + lastMtg.id);
        var memberIds = [...new Set(lastAtt.filter(a => a.person_type === 'member').map(a => a.person_id))];
        for (var mid2 of memberIds) {
          await api('/attendance', { method: 'POST', body: JSON.stringify({ meeting_id: meetingId, person_type: 'member', person_id: mid2 }) });
        }
        toast('會議已建立，已複製 ' + memberIds.length + ' 位上次與會會員');
        hideModal();
        switchPage('meetings');
        return;
      }
    }
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
  const list = { member: members, guest: guests,  }[type];
  const showMeetingFilter = type === 'guest';
  let meetingFilterHtml = '';
  if (showMeetingFilter) {
    meetings = await api('/meetings');
    meetings.sort((a,b) => b.date.localeCompare(a.date));
    meetingFilterHtml = '<div class="search-wrap" style="display:flex;gap:8px;align-items:center"><select id="meeting-filter" onchange="filterByMeeting(&quot;'+type+'&quot;)" style="flex:1;max-width:260px;padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;background:#fff;outline:none"><option value="">📋 全部聚會</option>'+meetings.map(m => '<option value="'+m.id+'">'+m.date+' '+mLblText(m.type)+'</option>').join('')+'</select></div>';
  }
  pc.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <h2>${title}管理 (${list.length})</h2>
        <div style="display:flex;gap:6px;align-items:center">
          ${type==='member'||type==='guest'?`
          <span style="display:flex;gap:4px">
            <button class="btn btn-sm `+(mgmtViewMode==='card'?'btn-primary':'btn-outline')+`" onclick="mgmtViewMode='card';renderTableBody('${type}',{member:members,guest:guests}['${type}'])" style="font-size:11px;padding:4px 10px">📇 卡片</button>
            <button class="btn btn-sm `+(mgmtViewMode==='table'?'btn-primary':'btn-outline')+`" onclick="mgmtViewMode='table';renderTableBody('${type}',{member:members,guest:guests}['${type}'])" style="font-size:11px;padding:4px 10px">📋 表格</button>
          </span>`:''}
          <button class="btn btn-primary btn-sm" onclick="showPersonForm('${type}')">+ 新增${title}</button>
        </div>
      </div>
      ${meetingFilterHtml}
      <div class="search-wrap"><input type="text" id="tbl-search" placeholder="搜尋..." oninput="doSearch('${type}', this.value)"></div>
      <div class="panel-body">
        <div id="tbl-body"></div>
      </div>
    </div>`;
  renderTableBody(type, list);
}

async function filterByMeeting(type) {
  const mid = document.getElementById('meeting-filter').value;
  const list = { member: members, guest: guests,  }[type];
  if (!mid) { renderTableBody(type, list); return; }
  const att = await api('/attendance?meeting_id='+mid);
  const attIds = new Set(att.filter(a => a.person_type === type).map(a => a.person_id));
  let filtered = list.filter(p => attIds.has(p.id));
  if (searchText) filtered = filtered.filter(p => JSON.stringify(p).toLowerCase().includes(searchText.toLowerCase()));
  renderTableBody(type, filtered);
}

async function renderTableBody(type, list) {
  const el = document.getElementById('tbl-body');
  const filtered = searchText ? list.filter(p => JSON.stringify(p).toLowerCase().includes(searchText.toLowerCase())) : list;
  const showExpand = type === 'guest' || type === 'member';

  // Load payment map for guest table view
  let payMap = {};
  if (type === 'guest') {
    try {
      const att = await api('/attendance?meeting_id='+(meetings[0]?.id||10));
      att.forEach(a => { if (a.person_type==='guest') payMap[a.person_id] = a.payment; });
    } catch(e) {}
  }

  if ((type === 'member' || type === 'guest') && mgmtViewMode === 'card') {
    el.innerHTML = `<div class="mgmt-card-grid">${filtered.map(p => {
      const icon = `<div class="mgmt-av ${type}">${esc((p.name||'?').charAt(0))}</div>`;
      let meta = '';
      if (type==='guest') {
        if (p.professional) meta += '<div class="mgmt-meta">💼 '+esc(p.professional)+'</div>';
        if (p.invited_by) meta += '<div class="mgmt-meta">👤 邀請人: '+esc(p.invited_by)+'</div>';
        meta += '<div class="mgmt-meta" id="ghist-'+p.id+'" style="font-size:10px">📋 載入中...</div>';
      }
      if (type==='member' && p.role && p.role!=='會員') meta += '<div class="mgmt-meta">🏅 '+esc(p.role)+'</div>';
      if (type==='member' && p.professional) meta += '<div class="mgmt-meta">💼 '+esc(p.professional)+'</div>';
      if (type==='member' && p.email) meta += '<div class="mgmt-meta">📧 '+esc(p.email)+'</div>';
      if (type==='member' && p.fee_paid_date) meta += '<div class="mgmt-meta">📅 會費: '+esc(p.fee_paid_date)+'</div>';
      let tel = p.tel ? '<div class="mgmt-meta">📱 '+esc(p.tel)+'</div>' : '';

      return `<div class="mgmt-card" onclick="showPersonForm('${type}',${p.id})" data-ptype="${type}" data-pid="${p.id}">
        <div class="mgmt-card-top">
          ${icon}
          <div class="mgmt-info">
            <div class="mgmt-name">${esc(p.name)}</div>
            ${tel}${meta}
          </div>
        </div>
        <div class="mgmt-card-btns" onclick="event.stopPropagation()">
          <button class="btn btn-outline btn-sm" onclick="showPersonForm('${type}',${p.id})">✏️ 編輯</button>
          <button class="btn btn-danger btn-sm" onclick="deletePerson('${type}',${p.id},'${esc(p.name)}')">🗑️</button>
        </div>
        ${showExpand?'<div class="detail-row mgmt-detail" id="hist-'+type+'-'+p.id+'"><div></div></div>':''}
      </div>`;
    }).join('')}</div>
    ${filtered.length===0?'<div class="empty">無匹配結果</div>':''}`;
    if (type === 'guest') loadGuestHistories(filtered);
    return;
  }

  async function loadGuestHistories(guestList) {
    for (const p of guestList) {
      try {
        const att = await api('/attendance?person_type=guest&person_id='+p.id);
        const el = document.getElementById('ghist-'+p.id);
        if (!el) continue;
        if (att.length === 0) {
          el.innerHTML = '📋 暫無出席記錄';
        } else {
          const sorted = att.sort((a,b) => b.date.localeCompare(a.date));
          const items = sorted.map(a => {
            var payIcon = a.payment==='paid'?'💰':(a.payment==='free'?'🆓':'❌💰');
            var payColor = a.payment==='paid'||a.payment==='free'?'#10b981':'#f59e0b';
            var arrived = a.arrival_time && a.arrival_time!=='absent';
            var absent = a.arrival_time==='absent';
            var arrIcon = arrived?'✅':(absent?'✕':'');
            return '<span style="color:'+payColor+'">'+a.date+' '+payIcon+'</span>'+(arrIcon?' <span>'+arrIcon+'</span>':'');
          }).join(' · ');
          el.innerHTML = '📋 ' + items;
        }
      } catch(e) {
        var el2 = document.getElementById('ghist-'+p.id);
        if (el2) el2.innerHTML = '';
      }
    }
  }

  // table view
  const cols = { member: ['name','professional','tel','email','fee_paid_date'], guest: ['name','professional','tel','invited_by','meeting_id','payment'] }[type];

  el.innerHTML = `<table class="data-table">
    <thead><tr>${cols.map(c => `<th>${c==='name'?'名稱':c==='tel'?'電話':c==='email'?'電郵':c==='fee_paid_date'?'會費付費日':c==='professional'?'專業':c==='chapter'?'Chapter':c==='invited_by'?'邀請人':c==='meeting_id'?'所屬聚會':c==='payment'?'付款狀態':''}</th>`).join('')}<th style="width:80px"></th></tr></thead>
    <tbody>${filtered.map(p => `<tr style="cursor:pointer" onclick="showPersonForm('${type}',${p.id})">
      ${cols.map(c => {
        if (c==='name') return '<td><strong>'+esc(p[c]||'')+'</strong></td>';
        if (c==='meeting_id') {
          var gm2 = p.meeting_id ? meetings.find(m => m.id===p.meeting_id) : null;
          return '<td>'+esc(gm2?gm2.date+' '+mLblText(gm2.type):'-')+'</td>';
        }
        if (c==='payment') {
          var pmt = payMap[p.id] || '';
          return '<td><span class="badge '+(pmt==='paid'?'badge-paid':pmt==='free'?'badge-free':'badge-unpaid')+'">'+(pmt==='paid'?'💰 已付':pmt==='free'?'🆓 免費':'❌💰 未付')+'</span></td>';
        }
        return '<td>'+esc(p[c]||'-')+'</td>';
      }).join('')}
      <td class="btns">
        <button class="btn btn-outline btn-sm" onclick="showPersonForm('${type}',${p.id})">編輯</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deletePerson('${type}',${p.id},'${esc(p.name)}')">刪除</button>
      </td>
    </tr>`).join('')}</tbody></table>
    ${filtered.length===0?'<div class="empty">無匹配結果</div>':''}`;
}

function doSearch(type, val) {
  searchText = val;
  const meetingFilter = document.getElementById('meeting-filter');
  if (meetingFilter && meetingFilter.value) {
    filterByMeeting(type);
    return;
  }
  const list = { member: members, guest: guests,  }[type];
  renderTableBody(type, list);
}

async function togglePersonHistory(type, pid) {
  const row = document.querySelector(`[data-ptype="${type}"][data-pid="${pid}"]`);
  const detail = document.getElementById(`hist-${type}-${pid}`);
  if (!detail) return;
  if (detail.classList.contains('show')) {
    detail.classList.remove('show');
    row?.classList.remove('open');
    return;
  }
  document.querySelectorAll('.detail-row.show').forEach(d => d.classList.remove('show'));
  document.querySelectorAll('.mgmt-card.open').forEach(r => r.classList.remove('open'));
  row?.classList.add('open');



  const records = await api(`/attendance?person_type=${type}&person_id=${pid}`);
  detail.firstElementChild.innerHTML = records.length === 0
    ? '<div class="empty">暫無出席記錄</div>'
    : records.map(r => `<div class="att-mini">
      <span style="min-width:90px;font-weight:600">${r.date}</span>
      <span style="font-size:11px;color:var(--primary);min-width:60px;font-weight:600">${r.meeting_type==='regular'?'例會':r.meeting_type==='anniversary'?'週年聚餐':'特別會議'}</span>
      <span style="color:var(--primary);font-weight:500">${r.arrival_time||'—'}</span>
      <span class="badge ${payClass(r.payment)}">${payLabel(r.payment)}</span>
      ${r.payment_method?`<span style="font-size:11px;color:var(--text2)">${esc(r.payment_method)}</span>`:''}
      ${r.remark?`<span style="font-size:11px;color:var(--text2)">${esc(r.remark)}</span>`:''}
    </div>`).join('');
  detail.classList.add('show');
}

// ── Receipt helpers ─────────────────────────────
async function loadReceipts(memberId) {
  const data = await api(`/receipts?member_id=${memberId}`);
  return Array.isArray(data) ? data : [];
}

async function uploadReceipt(memberId, file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const result = await api('/receipts', {
        method: 'POST',
        body: JSON.stringify({ member_id: memberId, filename: file.name, data: reader.result })
      });
      resolve(result);
    };
    reader.readAsDataURL(file);
  });
}

async function deleteReceipt(receiptId) {
  if (!confirm('確定要刪除此憑證嗎？')) return false;
  await api(`/receipts?id=${receiptId}`, { method: 'DELETE' });
  return true;
}

function renderReceiptsHtml(receipts) {
  if (!receipts.length) return '<div style="font-size:13px;color:var(--text2);padding:8px 0">尚無付款憑證</div>';
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${receipts.map(r => `
    <div style="position:relative;width:80px;height:80px;border-radius:8px;overflow:hidden;border:1px solid var(--border);flex-shrink:0">
      <a href="/api/receipts?id=${r.id}" target="_blank">
        <img src="/api/receipts?id=${r.id}" style="width:100%;height:100%;object-fit:cover" alt="${esc(r.filename)}" onerror="this.parentElement.parentElement.remove()">
      </a>
      <button onclick="event.preventDefault();deleteReceipt(${r.id}).then(ok=>{if(ok)refreshReceipts()})" style="position:absolute;top:2px;right:2px;background:rgba(239,68,68,0.9);color:#fff;border:none;border-radius:50%;width:20px;height:20px;font-size:12px;line-height:20px;text-align:center;cursor:pointer;padding:0">&times;</button>
    </div>
  `).join('')}</div>`;
}

async function refreshReceipts() {
  const mid = window.__editMemberId;
  if (!mid) return;
  const receipts = await loadReceipts(mid);
  const el = document.getElementById('receipts-area');
  if (el) el.innerHTML = renderReceiptsHtml(receipts);
}

async function handleReceiptUpload(input) {
  const mid = window.__editMemberId;
  if (!mid || !input.files.length) return;
  for (const file of input.files) {
    await uploadReceipt(mid, file);
  }
  input.value = '';
  refreshReceipts();
}

async function showPersonForm(type, editId) {
  const labels = { member: '會員', guest: '來賓',  };
  const list = { member: members, guest: guests,  }[type];
  const p = editId ? list.find(x => x.id === editId) || {} : {};
  if (type === 'guest' && !meetings.length) meetings = await api('/meetings');

  let extra = '';
  if (type === 'member') {
    extra += `<label>委員／會員</label><select id="pf-role"><option value="會員" ${(p.role||'會員')==='會員'?'selected':''}>會員</option><option value="委員" ${p.role==='委員'?'selected':''}>委員</option><option value="主席" ${p.role==='主席'?'selected':''}>主席</option><option value="副主席" ${p.role==='副主席'?'selected':''}>副主席</option><option value="財務" ${p.role==='財務'?'selected':''}>財務</option><option value="秘書" ${p.role==='秘書'?'selected':''}>秘書</option></select>`;
    extra += `<label>專業領域</label><input type="text" id="pf-prof" value="${esc(p.professional||'')}" placeholder="專業/行業">`;
    extra += `<label>電郵</label><input type="email" id="pf-email" value="${esc(p.email||'')}" placeholder="email@example.com">`;
    extra += `<label>會費付費日</label><input type="date" id="pf-fee-date" value="${esc(p.fee_paid_date||'')}">`;
  }
  if (type === 'guest') {
    extra += `<label>專業</label><input type="text" id="pf-prof" value="${esc(p.professional||'')}" placeholder="專業/行業">`;
  }
  if (type === 'observer') {
    extra += `<label>Chapter</label><input type="text" id="pf-chapter" value="${esc(p.chapter||'')}" placeholder="Chapter名稱">`;
  }
  if (type === 'guest') {
    extra += '<label>邀請人</label><input type="text" id="pf-invited" value="'+esc(p.invited_by||'')+'" placeholder="邀請人名稱">';
  }
  if (type === 'guest') {
    extra += '<label>所屬聚會</label><select id="pf-meeting"><option value="">— 未指定 —</option>'+meetings.map(m => '<option value="'+m.id+'" '+(p.meeting_id==m.id?'selected':'')+'>'+m.date+' '+mLblText(m.type)+'</option>').join('')+'</select>';
  }

  const receiptSection = type === 'member' ? `
    <hr style="margin:16px 0;border:none;border-top:1px solid var(--border)">
    <label style="font-size:14px;font-weight:700;margin-bottom:8px">付款憑證</label>
    <div id="receipts-area" style="min-height:20px">${editId ? '載入中...' : '儲存後即可上傳'}</div>
    <div style="margin-top:10px">
      <input type="file" id="receipt-file" accept="image/*" multiple style="font-size:13px" onchange="handleReceiptUpload(this)">
    </div>
  ` : '';

  showModal((editId?'編輯':'新增')+labels[type], `
    <label>名稱 *</label><input type="text" id="pf-name" value="${esc(p.name||'')}" placeholder="名稱">
    <label>電話</label><input type="tel" id="pf-tel" value="${esc(p.tel||'')}" placeholder="電話號碼">
    ${extra}
    ${receiptSection}
    <button class="btn btn-primary" style="width:100%;margin-top:12px" id="save-pf">${editId?'儲存':'新增'}</button>
  `);
  if (type === 'member' && editId) {
    window.__editMemberId = editId;
    refreshReceipts();
  } else {
    window.__editMemberId = null;
  }
  let _savedId = editId || 0;
  document.getElementById('save-pf').onclick = async () => {
    const name = document.getElementById('pf-name').value.trim();
    if (!name) return toast('請輸入名稱');
    const body = { name, tel: document.getElementById('pf-tel')?.value || '' };
    if (type === 'member') {
      body.email = document.getElementById('pf-email')?.value || '';
      body.fee_paid_date = document.getElementById('pf-fee-date')?.value || '';
      body.professional = document.getElementById('pf-prof')?.value || '';
      body.role = document.getElementById('pf-role')?.value || '會員';
      body.bio = document.getElementById('pf-bio')?.value || '';
    }
    if (type === 'guest') body.professional = document.getElementById('pf-prof')?.value || '';
    if (type === 'observer') body.chapter = document.getElementById('pf-chapter')?.value || '';
    if (type === 'guest') body.invited_by = document.getElementById('pf-invited')?.value || '';
    if (type === 'guest') { body.meeting_id = document.getElementById('pf-meeting')?.value || null; }

    let result;
    if (_savedId) {
      await api(`/${type}s?id=${_savedId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      result = await api(`/${type}s`, { method: 'POST', body: JSON.stringify(body) });
    }
    if (type === 'member' && !_savedId && result && result.id) {
      window.__editMemberId = result.id;
      _savedId = result.id;
      document.getElementById('receipts-area').innerHTML = '已建立會員 #'+result.id+'，可上傳憑證';
      toast('會員已建立，可上傳付款憑證');
      document.getElementById('save-pf').textContent = '儲存';
      return;
    }
    hideModal(); toast(_savedId ? '已更新' : '已新增');
    await loadAllData();
    const el = document.getElementById('tbl-body');
    if (el) renderTableBody(type, { member: members, guest: guests,  }[type]);
  };
}

async function deletePerson(type, id, name) {
  if (!confirm(`確定要刪除「${name}」嗎？`)) return;
  await api(`/${type}s?id=${id}`, { method: 'DELETE' });
  toast('已刪除');
  await loadAllData();
  const el = document.getElementById('tbl-body');
  if (el) renderTableBody(type, { member: members, guest: guests,  }[type]);
}

// ── Check-in Operation Page ───────────────────────
async function renderCheckinOp(pc) {
  currentMeeting = null;
  meetingAttendance = [];
  await loadAllData();
  const mts = await api('/meetings');
  const today = new Date().toISOString().split('T')[0];
  mts.sort((a,b) => b.date.localeCompare(a.date));

  clearInterval(ciPollTimer);
  ciPollTimer = null;
  pc.innerHTML = `
    <h2 style="font-size:20px;font-weight:700;margin-bottom:16px">✅ 簽到操作</h2>
    <div class="panel" style="margin-bottom:16px">
      <div class="panel-body" style="padding:16px;display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
        <div style="flex:1;min-width:200px">
          <label style="font-size:12px;font-weight:600;color:var(--text2);display:block;margin-bottom:4px">📋 選擇聚會</label>
          <select id="ci-meeting" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:15px;background:#fff;outline:none">
            ${mts.map(m => {
              const sel = m.date===today?' selected':'';
              return '<option value="'+m.id+'"'+sel+'>'+m.date+' — '+mLblText(m.type)+' · 收款人: '+esc(m.collector||'-')+' · 來賓費: $'+(m.guest_fee||0)+'</option>';
            }).join('')}
          </select>
        </div>
        <button class="btn btn-primary" style="height:42px" onclick="startCheckinOp()">開始簽到</button>
      </div>
    </div>
    <div id="ci-area">
      <div style="text-align:center;padding:80px 20px;color:#94a3b8">
        <div style="font-size:40px;margin-bottom:8px">👆</div>
        <div>請選擇聚會後按「開始簽到」</div>
      </div>
    </div>`;
}

async function selectMeetingCard(mid) {
  currentMeeting = null;
  const m = await api('/meetings?id='+mid);
  if (!m || m.error) return toast('找不到會議');
  currentMeeting = m;
  meetingAttendance = m.attendance || [];
  await loadAllData();
  renderCheckinOpList();
}

async function startCheckinOp() {
  const mtId = parseInt(document.getElementById('ci-meeting').value);
  if (!mtId) return toast('請選擇聚會');
  await selectMeetingCard(mtId);
}

function renderCheckinOpList() {
  const area = document.getElementById('ci-area');
  if (!currentMeeting) return;
  const attMap = {};
  meetingAttendance.forEach(a => { attMap[`${a.person_type}_${a.person_id}`] = a; });

  let html = '<div style="background:#f0fdfa;border-radius:10px;padding:12px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<span style="font-size:13px;color:var(--text)"><strong>'+currentMeeting.date+'</strong> — '+mLblText(currentMeeting.type)+' · 收款人: '+esc(currentMeeting.collector||'-')+' · 來賓費: $'+(currentMeeting.guest_fee||0)+'</span>'+
    '<span style="display:flex;gap:4px">'+
      '<button class="btn btn-sm '+(ciViewMode==='card'?'btn-primary':'btn-outline')+'" onclick="ciViewMode=\'card\';renderCheckinOpList()" style="font-size:11px;padding:4px 10px">📇 卡片</button>'+
      '<button class="btn btn-sm '+(ciViewMode==='table'?'btn-primary':'btn-outline')+'" onclick="ciViewMode=\'table\';renderCheckinOpList()" style="font-size:11px;padding:4px 10px">📋 表格</button>'+
      '<button class="btn btn-sm btn-warning" onclick="showWhatsAppReminders()" style="font-size:11px;padding:4px 10px;background:#25D366;color:#fff;border:none">💬 催款</button>'+
    '</span>'+
  '</div>';

  const sections = [
    { key: 'member', label: '會員', list: members },
    { key: 'guest', label: '來賓', list: guests },
  ];

  if (ciViewMode === 'table') {
    html += '<div class="panel-body" style="overflow-x:auto">';
    html += '<table class="data-table" style="font-size:12px"><thead><tr>';
    html += '<th style="width:24px"></th><th>名稱</th><th>電話</th><th style="width:50px">時間</th><th style="width:60px">付款</th><th style="width:100px">操作</th></tr></thead><tbody>';
    sections.forEach(sec => {
      html += '<tr style="background:#f8fafc"><td colspan="6" style="padding:6px 12px;font-weight:700;font-size:11px;color:var(--text2)">'+sec.label+' ('+sec.list.length+')</td></tr>';
      sec.list.forEach(p => {
        const att = attMap[`${sec.key}_${p.id}`];
        const paid = att && att.payment && att.payment !== '' && att.payment !== 'unpaid';
        const absent = att && att.arrival_time === 'absent';
        html += '<tr style="cursor:pointer;background:'+(absent?'#f8fafc':'')+'" onclick="showCheckinPersonOps(\''+sec.key+'\','+p.id+',\''+esc(p.name)+'\')">';
        html += '<td style="padding:6px 8px"><div class="pc-av '+sec.key+'" style="width:22px;height:22px;font-size:10px;display:inline-flex">'+esc(p.name.charAt(0))+'</div></td>';
        html += '<td style="padding:6px 8px;font-weight:600;font-size:12px">'+esc(p.name)+'</td>';
        html += '<td style="padding:6px 8px;font-size:11px;color:var(--text2)">'+esc(p.tel||'—')+'</td>';
        html += '<td style="padding:6px 8px;font-size:11px;font-weight:600;color:var(--primary)">'+(absent?'✕':att?.arrival_time||'—')+'</td>';
        if (absent) {
          html += '<td style="padding:6px 8px"><span style="font-size:10px;color:#94a3b8">缺席</span></td>';
          html += '<td style="padding:6px 8px"><button class="btn btn-outline btn-sm" onclick="markAbsent(\''+sec.key+'\','+p.id+',false)" style="font-size:10px;padding:2px 6px">↩ 取消</button></td>';
        } else {
          html += '<td style="padding:6px 8px"><span class="badge '+payClass(att?att.payment:'')+'" style="cursor:pointer;font-size:10px;padding:3px 6px" onclick="togglePayOp(\''+sec.key+'\','+p.id+')">'+payLabel(att?att.payment:'')+'</span></td>';
          html += '<td style="padding:6px 8px"><div style="display:flex;gap:3px">';
          html += '<button class="btn btn-outline btn-sm" onclick="setTimeOp(\''+sec.key+'\','+p.id+')" style="font-size:10px;padding:2px 6px">🕐</button>';
          html += '<button class="btn btn-outline btn-sm" onclick="markAbsent(\''+sec.key+'\','+p.id+',true)" style="font-size:10px;padding:2px 5px;color:#94a3b8">✕</button>';
          html += '</div></td>';
        }
        html += '</tr>';
      });
    });
    html += '</tbody></table></div>';
  } else {
    sections.forEach(sec => {
      html += '<div class="checkin-section-label"><span>'+sec.label+'</span><span class="count">'+sec.list.length+'</span></div>';
      html += '<div class="ci-card-grid">';
      sec.list.forEach(p => {
        const att = attMap[`${sec.key}_${p.id}`];
        const paid = att && att.payment && att.payment !== '' && att.payment !== 'unpaid';
        const absent = att && att.arrival_time === 'absent';
        html += '<div class="person-card'+(att?(absent?' absent':(paid?' has-att paid':' has-att unpaid')):'')+'" onclick="showCheckinPersonOps(\''+sec.key+'\','+p.id+',\''+esc(p.name)+'\')" style="cursor:pointer">';
        html += '<div class="pc-av '+sec.key+'">'+esc(p.name.charAt(0))+'</div>';
        html += '<div class="pc-name">'+esc(p.name)+'</div>';
        if (p.tel) html += '<div class="pc-meta">📱 '+esc(p.tel)+'</div>';
        if (absent) {
          html += '<div class="pc-row"><span style="font-size:12px;color:#94a3b8;font-weight:600">✕ 缺席</span>';
          html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();markAbsent(\''+sec.key+'\','+p.id+',false)" style="padding:2px 6px;font-size:10px">↩</button></div>';
        } else {
          html += '<div class="pc-row">';
          html += '<span class="pc-time">'+(att?.arrival_time||'—')+'</span>';
          html += '<span class="badge '+payClass(att?att.payment:'')+'" style="cursor:pointer;font-size:11px;padding:4px 8px" onclick="event.stopPropagation();togglePayOp(\''+sec.key+'\','+p.id+')">'+payLabel(att?att.payment:'')+'</span>';
          html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();setTimeOp(\''+sec.key+'\','+p.id+')" style="padding:3px 8px;font-size:11px">🕐</button>';
          html += '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();markAbsent(\''+sec.key+'\','+p.id+',true)" style="padding:3px 6px;font-size:11px;color:#94a3b8">✕</button>';
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div>';
    });
  }
  html += '<button class="btn btn-primary" style="width:100%;padding:14px;font-size:16px;margin-top:16px" id="ci-save-btn" onclick="saveCheckinOp()">💾 儲存簽到記錄</button>';
  area.innerHTML = html;

  // Start auto-polling
  clearInterval(ciPollTimer);
  ciLastHash = JSON.stringify(meetingAttendance);
  ciPollTimer = setInterval(async () => {
    if (!currentMeeting) { clearInterval(ciPollTimer); return; }
    try {
      const m = await api('/meetings?id='+currentMeeting.id);
      if (!m || m.error) return;
      const newHash = JSON.stringify(m.attendance || []);
      if (newHash !== ciLastHash) {
        ciLastHash = newHash;
        meetingAttendance = m.attendance || [];
        renderCheckinOpList();
      }
    } catch(e) {}
  }, 5000);
}

function getOrCreateOpAtt(type, pid) {
  let att = meetingAttendance.find(a => a.person_type === type && a.person_id === pid);
  if (!att) { att = { person_type: type, person_id: pid, substitute: '', payment: '', payment_method: '', arrival_time: '', remark: '' }; meetingAttendance.push(att); }
  return att;
}
function payLabel(p) { return p==='free'?'免費':p==='paid'?'已付':'未付'; }
function payClass(p) { return p==='free'?'badge-free':p==='paid'?'badge-paid':'badge-unpaid'; }
function isPaidOrFree(p) { return p==='paid'||p==='free'; }

function togglePayOp(type, pid) {
  const att = getOrCreateOpAtt(type, pid);
  // Cycle: unpaid → paid → free → unpaid
  if (!att.payment || att.payment === 'unpaid' || att.payment === '') att.payment = 'paid';
  else if (att.payment === 'paid') att.payment = 'free';
  else att.payment = '';
  renderCheckinOpList();
}
function markAbsent(type, pid, absent) {
  if (absent) {
    const att = getOrCreateOpAtt(type, pid);
    att.arrival_time = 'absent';
    att.payment = '';
  } else {
    const att = getOrCreateOpAtt(type, pid);
    att.arrival_time = '';
  }
  renderCheckinOpList();
}
async function showCheckinPersonOps(type, pid, name) {
  const att = meetingAttendance.find(a => a.person_type === type && a.person_id === pid);
  const paid = att && att.payment && att.payment !== '' && att.payment !== 'unpaid';
  const absent = att && att.arrival_time === 'absent';
  let receiptHtml = '';
  if (type === 'member') {
    const receipts = await loadReceipts(pid);
    if (receipts.length > 0) {
      receiptHtml = '<div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">'+receipts.map(r => '<a href="/api/receipts?id='+r.id+'" target="_blank"><img src="/api/receipts?id='+r.id+'" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"></a>').join('')+'</div>';
    }
    receiptHtml += '<div style="margin-top:6px"><input type="file" id="ci-receipt" accept="image/*" style="width:100%;font-size:12px;margin-bottom:4px"><button class="btn btn-sm btn-primary" style="width:100%" onclick="uploadCheckinReceipt('+pid+',\''+type+'\')">上傳憑證</button></div>';
  }
  var isFree = att && att.payment === 'free';
  var curTbl = att ? esc(att.table_number||'') : '';
  var payStatus = absent ? '✕ 缺席' : (isFree ? '🆓 免費' : (paid ? '✅ 已付' : '❌ 未付'));
  var payColor = absent ? '#94a3b8' : (isFree ? '#3b82f6' : (paid ? '#10b981' : '#f59e0b'));
  var payHtml = '';
  if (!paid && !absent) {
    payHtml = '<div style="margin:8px 0">'+
      '<div style="background:#f0fdf4;border:1.5px solid #10b981;border-radius:8px;padding:10px;margin-bottom:6px">'+
        '<div style="font-weight:700;font-size:12px;color:#10b981;margin-bottom:6px">📤 憑證付費</div>'+
        '<input type="file" id="ci-receipt" accept="image/*" style="width:100%;font-size:11px;margin-bottom:4px">'+
        '<button class="btn btn-sm" style="width:100%;background:#10b981;color:#fff" onclick="uploadCheckinReceipt('+pid+',\''+type+'\')">確認上傳憑證</button></div>'+
      '<div style="display:flex;gap:6px;margin-bottom:6px">'+
        '<button class="btn btn-sm" style="flex:1;background:#3b82f6;color:#fff" onclick="markCheckinPayment('+attId+',\'free\');hideModal()">🆓 免費</button>'+
        '<button class="btn btn-sm" style="flex:1;background:#f59e0b;color:#fff" onclick="markCheckinPayment('+attId+',\'paid\');hideModal()">💵 現金</button>'+
      '</div></div>';
  }
  showModal('👤 '+esc(name), `
    <div style="font-size:13px;color:var(--text2);margin-bottom:8px">${absent?'✕ 缺席':(att?'簽到時間: '+esc(att.arrival_time||'—'):'尚未簽到')} · <span style="color:${payColor};font-weight:700">${payStatus}</span></div>
    <div style="margin-bottom:8px"><label style="font-size:11px;color:var(--text2)">枱號</label><input type="text" id="ci-table" value="${curTbl}" placeholder="枱號" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:6px;font-size:13px"></div>
    <button class="btn btn-sm btn-primary" style="width:100%;margin-bottom:6px" onclick="saveCheckinOps('${type}',${pid},${att?att.id:0})">💾 儲存枱號</button>
    ${payHtml}
    <button class="btn btn-sm btn-outline" style="width:100%;margin-bottom:4px;color:#94a3b8" onclick="markAbsent('${type}',${pid},${absent?'false':'true'});hideModal()">${absent?'↩ 取消缺席':'✕ 標記缺席'}</button>
  `);
}
async function saveCheckinOps(type, pid, attId) {
  var tbl = document.getElementById('ci-table')?.value || '';
  if (attId) {
    await api('/attendance', {method:'PUT',body:JSON.stringify({id:attId,table_number:tbl})});
    var att = meetingAttendance.find(a => a.id === attId);
    if (att) att.table_number = tbl;
    toast('已儲存');
    hideModal();
    renderCheckinOpList();
  }
}

async function markCheckinPayment(attId, paymentType) {
  if (!attId) return;
  await api('/attendance', {method:'PUT',body:JSON.stringify({id:attId,payment:paymentType})});
  var att = meetingAttendance.find(a => a.id === attId);
  if (att) att.payment = paymentType;
  toast(paymentType==='free'?'已標記為免費':'已標記現金付款');
  renderCheckinOpList();
}

async function uploadCheckinReceipt(memberId, type) {
  const file = document.getElementById('ci-receipt')?.files[0];
  if (!file) { toast('請選擇檔案'); return; }
  const att = meetingAttendance.find(a => a.person_type === type && a.person_id === memberId);
  const reader = new FileReader();
  reader.onload = async () => {
    if (att) {
      await api('/checkin-upload', {method:'POST',body:JSON.stringify({attendance_id:att.id||0,data:reader.result})});
    } else {
      await api('/receipts', {method:'POST',body:JSON.stringify({member_id:memberId,filename:file.name,data:reader.result})});
    }
    toast('已上傳'); hideModal();
  };
  reader.readAsDataURL(file);
}
function setTimeOp(type, pid) {
  const att = getOrCreateOpAtt(type, pid);
  const now = new Date();
  const hh=String(now.getHours()).padStart(2,'0'), mm=String(now.getMinutes()).padStart(2,'0');
  showModal('設定時間', `<input type="time" id="op-time" value="${att.arrival_time||`${hh}:${mm}`}"><div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-outline" style="flex:1" onclick="hideModal()">取消</button><button class="btn btn-primary" style="flex:1" id="save-op-time">確認</button></div>`);
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

  const sections = [
    {
      icon: '⚙️', title: '基本設定',
      fields: [
        { key: 'title', label: '頁面標題', placeholder: 'BNI Galaxy ST' },
        { key: 'loading', label: '載入中文字', placeholder: '載入中...' },
      ]
    },
    {
      icon: '✏️', title: '簽到流程文字',
      fields: [
        { key: 'checkin', label: '簽到標題', placeholder: '簽到' },
        { key: 'noMeeting', label: '無會議提示', placeholder: '今日未有會議' },
        { key: 'noMeetingHint', label: '無會議說明', placeholder: '請到後台建立今日會議' },
        { key: 'allPeople', label: '名單標題', placeholder: '全部名單' },
        { key: 'confirmTitle', label: '確認對話標題', placeholder: '確認簽到？' },
        { key: 'cancel', label: '取消按鈕文字', placeholder: '取消' },
        { key: 'confirm', label: '確認按鈕文字', placeholder: '✓ 確認' },
        { key: 'skipCheckin', label: '「跳過，直接簽到」按鈕', type: 'select', options: [{v:'1',l:'使用按鈕'},{v:'0',l:'不使用按鈕'}] },
      ]
    },
    {
      icon: '🏷️', title: '狀態標籤',
      fields: [
        { key: 'paid', label: '已繳費標籤', placeholder: '已繳費' },
        { key: 'unpaid', label: '未繳費標籤', placeholder: '還未繳費' },
        { key: 'paidTri', label: '結果頁 — 已繳費（三語）', placeholder: '已繳費 / 已缴费 / Paid' },
        { key: 'unpaidTri', label: '結果頁 — 未繳費（三語）', placeholder: '還未繳費 / 还未缴费 / Unpaid' },
        { key: 'checkedInTri', label: '結果頁 — 已簽到（三語）', placeholder: '已簽到 / 已签到 / Checked In' },
        { key: 'memberLabel', label: '會員標籤', placeholder: '會員' },
        { key: 'guestLabel', label: '來賓標籤', placeholder: '來賓' },
        { key: 'regular', label: '例會標籤', placeholder: '例會' },
        { key: 'special', label: '特別會議標籤', placeholder: '特別會議' },
      ]
    },
    {
      icon: '🍽️', title: '午餐與節目',
      fields: [
        { key: 'lunchFee', label: '午餐費 (HK$)', placeholder: '388' },
        { key: 'tableNumber', label: '枱號', placeholder: '8' },
      ],
      textareas: [
        { key: 'schedule', label: '節目時間表', placeholder: '12:30 報到及交流\n12:45 例會正式開始\n...', rows: 6 },
        { key: 'chairmanMsg', label: '主席感謝話', placeholder: '感謝您今天蒞臨火炭會聚會！\n期待每個月也可以見面！', rows: 4 },
      ]
    },
    {
      icon: '🏅', title: '委員介紹 & 火炭會介紹 & 申請入會',
      fields: [
        { key: 'joinLink', label: '申請入會連結', placeholder: 'https://forms.gle/xxx' },
      ],
      textareas: [
        { key: 'productIntro', label: '委員介紹（主頁顯示）', placeholder: '主席：xxx\n副主席：xxx\n...', rows: 5 },
        { key: 'aboutUs', label: '火炭會介紹（主頁顯示）', placeholder: '火炭會聚會成立於...', rows: 5 },
      ]
    },
    {
      icon: '💳', title: '付款連結與 QR 碼',
      fields: [
        { key: 'paymeLink', label: 'PayMe 付款連結', placeholder: 'https://payme.hsbc/fotan' },
        { key: 'wcLink', label: 'WeChat Pay 付款連結', placeholder: 'https://pay.weixin.qq.com/' },
        { key: 'aliLink', label: 'Alipay HK 付款連結', placeholder: 'https://www.alipayhk.com/' },
        { key: 'fpsPhone', label: 'FPS 轉數快電話', placeholder: '97188675' },
      ],
      qrUploads: true
    }
  ];

  let allFields = [];
  let html = '';

  sections.forEach(sec => {
    html += '<div class="settings-section">';
    html += '<div class="settings-section-hdr"><span class="settings-section-icon">'+sec.icon+'</span> '+sec.title+'</div>';
    html += '<div class="settings-section-body">';

    if (sec.fields) {
      html += '<div class="settings-grid">';
      sec.fields.forEach(f => {
        allFields.push(f);
        html += '<div class="settings-field">';
        html += '<label class="settings-label">'+f.label+'</label>';
        if (f.type === 'select' && f.options) {
          html += '<select class="settings-input" id="set-'+f.key+'" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:#fff;outline:none">';
          f.options.forEach(o => {
            html += '<option value="'+o.v+'"'+(settings[f.key]===o.v?' selected':'')+'>'+o.l+'</option>';
          });
          html += '</select>';
        } else {
          html += '<input type="text" class="settings-input" id="set-'+f.key+'" value="'+esc(settings[f.key]||'')+'" placeholder="'+esc(f.placeholder||'')+'">';
        }
        html += '</div>';
      });
      html += '</div>';
    }

    if (sec.textareas) {
      sec.textareas.forEach(f => {
        allFields.push(f);
        html += '<div class="settings-field settings-field-full">';
        html += '<label class="settings-label">'+f.label+'</label>';
        html += '<textarea class="settings-textarea" id="set-'+f.key+'" placeholder="'+esc(f.placeholder||'')+'" rows="'+(f.rows||5)+'">'+esc(settings[f.key]||'')+'</textarea>';
        html += '</div>';
      });
    }

    if (sec.qrUploads) {
      html += '<div class="settings-qr-row">';
      html += renderQrBlock('💚', 'WeChat Pay', 'wechatpay', settings.wcQrImg);
      html += renderQrBlock('💙', 'Alipay HK', 'alipay', settings.aliQrImg);
      html += renderQrBlock('🏦', 'FPS 轉數快', 'fps', settings.fpsQrImg);
      html += '</div>';
    }

    html += '</div></div>';
  });

  pc.innerHTML = '<div style="margin-bottom:16px;display:flex;align-items:center;justify-content:space-between"><h2 style="font-size:20px;font-weight:700">⚙️ 系統設定</h2><button class="btn btn-primary" onclick="saveSettings()">💾 儲存全部設定</button></div>' + html +
    '<div class="settings-section"><div class="settings-section-hdr"><span class="settings-section-icon">🤖</span> Telegram Bot 設定</div><div class="settings-section-body" style="padding:16px;text-align:center"><p style="font-size:13px;color:var(--text2);margin-bottom:8px">Bot: @fotanbot · 收發訊息 + R2 檔案上傳</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn btn-sm btn-outline" onclick="fetch(\'/api/telegram?action=setup\').then(r=>r.json()).then(d=>toast(d.ok?\'Webhook 已設定！\':\'失敗：\'+d.description))">🔗 設定 Webhook</button><button class="btn btn-sm btn-outline" onclick="fetch(\'/api/telegram?action=info\').then(r=>r.json()).then(d=>toast(JSON.stringify(d.result||d)))">ℹ️ Webhook 狀態</button><button class="btn btn-sm btn-outline" onclick="fetch(\'/api/telegram?action=delete\').then(r=>r.json()).then(d=>toast(d.ok?\'Webhook 已刪除\':\'失敗\'))">🗑️ 刪除 Webhook</button></div><p style="font-size:11px;color:var(--text2);margin-top:8px">Webhook URL: https://fotan.techforliving.net/api/telegram</p></div></div>'+
    '<div class="settings-section"><div class="settings-section-hdr"><span class="settings-section-icon">🔐</span> 修改管理密碼</div><div class="settings-section-body" style="padding:16px"><div style="display:flex;gap:8px;align-items:flex-end"><input type="password" id="set-old-pwd" placeholder="舊密碼" style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none"><input type="password" id="set-new-pwd" placeholder="新密碼" style="flex:1;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px;outline:none"><button class="btn btn-primary" onclick="changePassword()">確認修改</button></div><p id="pwd-msg" style="font-size:11px;margin-top:6px;display:none"></p></div></div>'+
    '<div class="settings-section"><div class="settings-section-hdr"><span class="settings-section-icon">💿</span> 資料庫備份</div><div class="settings-section-body" style="padding:16px;text-align:center"><p style="font-size:13px;color:var(--text2);margin-bottom:12px">下載所有資料表（members, guests, meetings, attendance, settings, receipts）為 JSON 檔案</p><button class="btn btn-primary" onclick="window.open(\'/api/backup\')">📥 下載備份 JSON</button></div></div>';

  window._settingsFields = allFields;
  window._settings = settings;
}

function renderQrBlock(icon, title, type, hasImg) {
  return '<div class="qr-block">' +
    '<div class="qr-block-label">'+icon+' '+title+' QR 碼</div>' +
    '<div class="qr-preview" id="'+type+'-preview">' +
      (hasImg ? '<img src="/api/image?name=qr-'+type+'" style="width:120px;height:120px;object-fit:contain;border:2px solid #e2e8f0;border-radius:10px;background:#fff">' : '<div class="qr-placeholder"><span>📷</span><span>尚未上傳</span></div>') +
    '</div>' +
    '<div style="margin-top:8px;display:flex;gap:6px;align-items:center">' +
      '<input type="file" id="'+type+'-file" accept="image/*" style="flex:1;font-size:12px">' +
      '<button class="btn btn-sm btn-outline" onclick="uploadQR(\''+type+'\')">上傳</button>' +
    '</div>' +
  '</div>';
}

async function uploadQR(type) {
  var fileMap = { wechatpay: 'wc-file', alipay: 'ali-file', fps: 'fps-file' };
  var keyMap = { wechatpay: 'wcQrImg', alipay: 'aliQrImg', fps: 'fpsQrImg' };
  var prevMap = { wechatpay: 'wc-preview', alipay: 'ali-preview', fps: 'fps-preview' };
  var fileInput = document.getElementById(fileMap[type] || fileMap['alipay']);
  var file = fileInput.files[0];
  if (!file) return toast('請選擇圖片');
  var reader = new FileReader();
  reader.onload = async function() {
    var result = await api('/upload-qr', { method: 'POST', body: JSON.stringify({ name: type, data: reader.result }) });
    if (result && result.ok) {
      toast('QR 圖已上傳！');
      await api('/settings', { method: 'PUT', body: JSON.stringify({ [keyMap[type]]: '/api/image?name=qr-'+type }) });
      var preview = document.getElementById(prevMap[type]);
      if (preview) preview.innerHTML = '<img src="/api/image?name=qr-'+type+'" style="max-width:200px;border:1px solid #e2e8f0;border-radius:8px">';
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
  toast('系統設定已儲存！');
}

// ── Helpers ───────────────────────────────────────
async function loadAllData() {
  const [m, g] = await Promise.all([api('/members'), api('/guests')]);
  members = m; guests = g;
}

async function api(path, opts = {}) {
  var sep = path.includes('?') ? '&' : '?';
  var url = API + path + sep + '_t=' + Date.now();
  const res = await fetch(url, {
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    ...opts,
  });
  return res.json();
}

function showModal(title, body) {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-dialog').innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h3 style="margin:0">${title}</h3><button onclick="hideModal()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;padding:0 4px;line-height:1" title="關閉">&times;</button></div>${body}`;
  overlay.style.display = 'flex';
}
function hideModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}
function mLblText(t) { return t==='regular'?'例會':t==='anniversary'?'週年聚餐':'特別會議'; }

// ── Q&A Training Page ────────────────────────────
async function renderQATraining(pc) {
  pc.innerHTML = '<div style="text-align:center;padding:40px">載入中...</div>';
  try {
    const resp = await fetch('/chatbot_training.jsonl');
    const text = await resp.text();
    const lines = text.trim().split('\n');
    const qas = lines.map(l => { try { return JSON.parse(l); } catch(e) { return null; } }).filter(Boolean);

    let html = '<h2 style="font-size:20px;font-weight:700;margin-bottom:4px">📚 Q&A 訓練數據</h2>';
    html += '<p style="color:var(--text2);margin-bottom:16px">共 '+qas.length+' 條問答配對 · 用於訓練聊天機械人 · <button class="btn btn-sm btn-outline" onclick="navigator.clipboard.writeText(JSON.stringify(window._qaData))" style="font-size:11px">📋 複製 JSON</button></p>';
    html += '<div style="display:flex;gap:8px;margin-bottom:16px"><input type="text" id="qa-search" placeholder="搜尋問答..." oninput="filterQA()" style="flex:1;padding:8px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:13px"></div>';
    html += '<div id="qa-list" style="display:flex;flex-direction:column;gap:6px"></div>';

    window._qaData = qas;
    pc.innerHTML = html;
    renderQAList(qas);
  } catch(e) {
    pc.innerHTML = '<div class="empty">載入失敗：'+esc(e.message)+'</div>';
  }
}

function renderQAList(qas) {
  const el = document.getElementById('qa-list');
  if (!el) return;
  el.innerHTML = qas.map((qa, i) => {
    const user = qa.messages.find(m => m.role === 'user');
    const assistant = qa.messages.find(m => m.role === 'assistant');
    return '<div class="qa-item" onclick="showQADetail('+i+')" style="background:#fff;border:1px solid var(--border);border-radius:10px;padding:10px 14px;cursor:pointer;transition:all 0.15s" onmouseover="this.style.borderColor=\'var(--primary)\'" onmouseout="this.style.borderColor=\'\'">'+
      '<div style="font-size:12px;color:var(--text2);margin-bottom:4px">#'+(i+1)+'</div>'+
      '<div style="font-weight:600;font-size:13px;margin-bottom:4px">❓ '+esc(user?.content||'')+'</div>'+
      '<div style="font-size:12px;color:var(--text2)">💬 '+esc((assistant?.content||'').substring(0,80))+'...</div>'+
    '</div>';
  }).join('');
  if (qas.length === 0) el.innerHTML = '<div class="empty">無匹配結果</div>';
}

function filterQA() {
  const q = document.getElementById('qa-search')?.value?.toLowerCase() || '';
  const filtered = q ? window._qaData.filter(qa => {
    const text = qa.messages.map(m => m.content).join(' ').toLowerCase();
    return text.includes(q);
  }) : window._qaData;
  renderQAList(filtered);
}

function showQADetail(idx) {
  const qa = window._qaData[idx];
  if (!qa) return;
  const user = qa.messages.find(m => m.role === 'user');
  const assistant = qa.messages.find(m => m.role === 'assistant');
  showModal('📚 Q&A #'+(idx+1), `
    <div style="background:#f0fdfa;border-radius:8px;padding:12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--primary);margin-bottom:4px">❓ 用戶提問</div>
      <div style="font-size:14px">${esc(user?.content||'')}</div>
    </div>
    <div style="background:#eff6ff;border-radius:8px;padding:12px">
      <div style="font-size:11px;font-weight:700;color:#2563eb;margin-bottom:4px">💬 AI 回答</div>
      <div style="font-size:14px;line-height:1.8;white-space:pre-wrap">${esc(assistant?.content||'')}</div>
    </div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="btn btn-outline btn-sm" style="flex:1" onclick="navigator.clipboard.writeText(${JSON.stringify(JSON.stringify(qa))});toast('已複製')">📋 複製 JSON</button>
      ${idx>0?'<button class="btn btn-outline btn-sm" onclick="showQADetail('+(idx-1)+')">◀ 上一條</button>':''}
      ${idx<window._qaData.length-1?'<button class="btn btn-outline btn-sm" onclick="showQADetail('+(idx+1)+')">下一條 ▶</button>':''}
    </div>
  `);
}

// ── Chatbot ───────────────────────────────────────
function getSessions() {
  try { return JSON.parse(localStorage.getItem('fotan_sessions') || '[]'); } catch(e) { return []; }
}
function saveSessions(sessions) {
  localStorage.setItem('fotan_sessions', JSON.stringify(sessions));
}
function getActiveSessionId() {
  return localStorage.getItem('fotan_active_session') || '';
}
function setActiveSessionId(id) {
  localStorage.setItem('fotan_active_session', id);
}

function initSessions() {
  let sessions = getSessions();
  if (sessions.length === 0) {
    sessions = [{ id: 's1', name: '預設對話', history: [] }];
    saveSessions(sessions);
    setActiveSessionId('s1');
  }
  const activeId = getActiveSessionId();
  if (!sessions.find(s => s.id === activeId)) {
    setActiveSessionId(sessions[0].id);
  }
  refreshSessionUI();
}

function getActiveSession() {
  const sessions = getSessions();
  const id = getActiveSessionId();
  return sessions.find(s => s.id === id) || sessions[0];
}

function createSession() {
  const sessions = getSessions();
  const id = 's' + Date.now();
  const name = '新對話 ' + (sessions.length + 1);
  sessions.push({ id, name, history: [] });
  saveSessions(sessions);
  setActiveSessionId(id);
  refreshSessionUI();
  document.getElementById('chat-msgs').innerHTML = '<div class="chat-msg system">👋 你好！新對話已建立</div>';
}

function switchSession(id) {
  setActiveSessionId(id);
  const s = getActiveSession();
  if (!s) return;
  refreshSessionUI();
  const msgs = document.getElementById('chat-msgs');
  msgs.innerHTML = s.history.length === 0
    ? '<div class="chat-msg system">👋 你好！輸入問題查詢會議、會員、出席等</div>'
    : s.history.map(h => '<div class="chat-msg '+h.role+'">'+h.content+'</div>').join('');
  msgs.scrollTop = msgs.scrollHeight;
}

function renameSession(id) {
  const sessions = getSessions();
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  const name = prompt('修改對話名稱：', s.name);
  if (name && name.trim()) {
    s.name = name.trim();
    saveSessions(sessions);
    refreshSessionUI();
  }
}

function deleteSession(id) {
  let sessions = getSessions();
  if (sessions.length <= 1) return toast('最少保留一個對話');
  sessions = sessions.filter(s => s.id !== id);
  saveSessions(sessions);
  if (getActiveSessionId() === id) {
    setActiveSessionId(sessions[0].id);
    switchSession(sessions[0].id);
  }
  refreshSessionUI();
}

function toggleSessionList() {
  const el = document.getElementById('session-list');
  el.style.display = el.style.display === 'none' ? 'block' : 'none';
  if (el.style.display === 'block') refreshSessionUI();
}

function refreshSessionUI() {
  const sessions = getSessions();
  const activeId = getActiveSessionId();
  const active = sessions.find(s => s.id === activeId);
  document.getElementById('chat-session-label').textContent = '🤖 ' + (active ? active.name : '聚會助理') + ' ▾';
  const el = document.getElementById('session-list');
  el.innerHTML = sessions.map(s =>
    '<div style="display:flex;align-items:center;padding:6px 12px;cursor:pointer;border-bottom:1px solid #e2e8f0'+(s.id===activeId?';background:#e0f2fe':'')+'" onclick="event.stopPropagation()">'+
      '<span style="flex:1;font-size:12px" onclick="switchSession(\''+s.id+'\')">' + esc(s.name) + '</span>'+
      '<button style="background:none;border:none;font-size:12px;cursor:pointer;color:#94a3b8;padding:0 4px" onclick="renameSession(\''+s.id+'\')" title="改名">✏️</button>'+
      '<button style="background:none;border:none;font-size:12px;cursor:pointer;color:#ef4444;padding:0 4px" onclick="deleteSession(\''+s.id+'\')" title="刪除">✕</button>'+
    '</div>'
  ).join('');
}

function toggleChatPanel() {
  const panel = document.getElementById('chat-panel');
  const btn = document.getElementById('chat-collapse');
  panel.classList.toggle('collapsed');
  if (panel.classList.contains('collapsed')) {
    btn.textContent = '▲';
  } else {
    btn.textContent = '▼';
    document.getElementById('chat-input').focus();
  }
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  appendChatMsg('user', msg);
  appendChatMsg('assistant', '<i>思考中...</i>');
  const session = getActiveSession();
  try {
    const history = (session.history || []).concat([{role:'user',content:msg}]);
    const resp = await fetch('/api/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({messages: history}) });
    const data = await resp.json();
    document.querySelector('#chat-msgs .chat-msg:last-child').remove();
    if (data.error) {
      appendChatMsg('system', '錯誤：'+esc(data.error));
      return;
    }
    appendChatMsg('assistant', data.reply);
    session.history = session.history || [];
    session.history.push({role:'user',content:msg});
    session.history.push({role:'assistant',content:data.reply});
    if (session.history.length > 30) session.history = session.history.slice(-30);
    const sessions = getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) { sessions[idx] = session; saveSessions(sessions); }
  } catch(e) {
    document.querySelector('#chat-msgs .chat-msg:last-child').remove();
    appendChatMsg('system', '連線失敗：'+esc(e.message));
  }
}

function appendChatMsg(role, text) {
  const div = document.createElement('div');
  div.className = 'chat-msg '+role;
  // Strip markdown code fences, convert newlines to <br>
  var t = text.replace(/```/g, '');
  t = t.replace(/\n/g, '<br>');
  div.innerHTML = t;
  document.getElementById('chat-msgs').appendChild(div);
  document.getElementById('chat-msgs').scrollTop = document.getElementById('chat-msgs').scrollHeight;
}

// ── Person Ops Modal (table mode click) ────────────
async function showPersonOps(type, pid) {
  const list = {member:members, guest:guests}[type]||[];
  const p = list.find(x => x.id === pid);
  if (!p) return;
  const att = meetingAttendance.find(a => a.person_type === type && a.person_id === pid);
  const paid = att && att.payment && att.payment !== '' && att.payment !== 'unpaid';
  const absent = att && att.arrival_time === 'absent';

  let receiptHtml = '';
  if (type === 'member') {
    const receipts = await loadReceipts(pid);
    if (receipts.length > 0) {
      receiptHtml = '<div style="margin-top:12px"><label style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:4px">📄 已上傳憑證 ('+receipts.length+')</label><div style="display:flex;gap:6px;flex-wrap:wrap">';
      receipts.forEach(r => {
        receiptHtml += '<a href="/api/receipts?id='+r.id+'" target="_blank"><img src="/api/receipts?id='+r.id+'" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0"></a>';
      });
      receiptHtml += '</div></div>';
    }
    receiptHtml += '<div style="margin-top:6px"><input type="file" id="ops-receipt" accept="image/*" multiple style="font-size:12px"><button class="btn btn-sm btn-outline" style="margin-top:4px" onclick="uploadOpsReceipt('+pid+')">上傳</button></div>';
  }

  let actionsHtml = '';
  if (absent) {
    actionsHtml = '<div style="background:#fef2f2;border-radius:8px;padding:10px;margin-bottom:8px;font-size:13px;color:#991b1b">✕ 已標記為缺席</div>';
    actionsHtml += '<button class="btn btn-outline btn-sm" style="width:100%;margin-bottom:6px" onclick="markAbsent(\''+type+'\','+pid+',false);hideModal();renderCheckinOpList()">↩ 取消缺席標記</button>';
  } else {
    actionsHtml += '<div style="display:flex;gap:8px;margin-bottom:8px">';
    actionsHtml += '<button class="btn btn-sm" style="flex:1;font-size:12px;background:'+(paid?'#10b981':'#f59e0b')+';color:#fff" onclick="togglePayOp(\''+type+'\','+pid+');hideModal();renderCheckinOpList()">'+(paid?'✅ 已付款':'💰 標記已付款')+'</button>';
    actionsHtml += '<button class="btn btn-outline btn-sm" style="flex:1;font-size:12px" onclick="setTimeOp(\''+type+'\','+pid+');hideModal()">🕐 設定時間</button>';
    actionsHtml += '</div>';
    actionsHtml += '<button class="btn btn-outline btn-sm" style="width:100%;font-size:12px;color:#94a3b8" onclick="markAbsent(\''+type+'\','+pid+',true);hideModal();renderCheckinOpList()">✕ 標記缺席</button>';
  }

  showModal('👤 '+esc(p.name), `
    <div style="font-size:13px;color:var(--text2);margin-bottom:12px">
      ${type==='member'?'會員':'來賓'} · ${p.tel?'📱 '+esc(p.tel):''} ${p.email?'· 📧 '+esc(p.email):''}
    </div>
    ${att?'<div style="background:#f0fdfa;border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:12px">簽到時間: <strong>'+(absent?'缺席':esc(att.arrival_time||'—'))+'</strong> · 付款: <strong>'+payLabel(att?att.payment:'')+'</strong></div>':''}
    ${actionsHtml}
    ${receiptHtml}
  `);
}
async function uploadOpsReceipt(memberId) {
  const input = document.getElementById('ops-receipt');
  if (!input.files.length) return;
  for (const file of input.files) {
    const reader = new FileReader();
    reader.onload = async () => {
      await api('/receipts', {method:'POST',body:JSON.stringify({member_id:memberId,filename:file.name,data:reader.result})});
    };
    reader.readAsDataURL(file);
  }
  setTimeout(() => showPersonOps('member', memberId), 500);
  toast('憑證已上傳');
}

function showWhatsAppReminders() {
  if (!currentMeeting) return toast('請先選擇聚會');
  const attMap = {};
  meetingAttendance.forEach(a => { attMap[`${a.person_type}_${a.person_id}`] = a; });

  const unpaid = [];
  members.forEach(p => {
    const att = attMap['member_' + p.id];
    if (att && att.arrival_time !== 'absent' && (!att.payment || att.payment === 'unpaid' || att.payment === '')) {
      unpaid.push({ name: p.name, tel: p.tel, attId: att.id });
    }
  });
  guests.forEach(p => {
    const att = attMap['guest_' + p.id];
    if (att && att.arrival_time !== 'absent' && (!att.payment || att.payment === 'unpaid' || att.payment === '')) {
      unpaid.push({ name: p.name, tel: p.tel, attId: att.id });
    }
  });

  if (!unpaid.length) return toast('所有出席者已付款');

  const msg = encodeURIComponent('您好，火炭會聚會溫馨提醒：您已出席 '+currentMeeting.date+' 的聚會但尚未付款 (HK$388)。請盡快安排，謝謝！🙏');
  const links = unpaid.map(p => {
    const cleanTel = (p.tel || '').replace(/[^0-9]/g, '');
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);gap:8px">'+
      '<span style="font-weight:600;font-size:13px">'+esc(p.name)+'</span>'+
      '<span style="font-size:11px;color:var(--text2)">📱 '+esc(p.tel||'—')+'</span>'+
      (cleanTel ? '<a href="https://wa.me/852'+cleanTel+'?text='+msg+'" target="_blank" class="btn btn-sm" style="font-size:11px;padding:6px 12px;background:#25D366;color:#fff;text-decoration:none;border-radius:6px;flex-shrink:0;height:26px;line-height:14px">💬 發送</a>' : '<span style="font-size:11px;color:#94a3b8">無電話</span>')+
    '</div>';
  }).join('');

  var bulkUnpaid = unpaid.filter(p => (p.tel||'').replace(/[^0-9]/g,''));
  window._bulkLinks = bulkUnpaid.map(p => 'https://wa.me/852'+(p.tel||'').replace(/[^0-9]/g,'')+'?text='+msg).join('\n');
  window._bulkCount = bulkUnpaid.length;

  showModal('💬 WhatsApp 催款通知',
    '<div style="margin-bottom:8px;font-size:13px;color:var(--text2)">共 <strong>' + unpaid.length + '</strong> 位未付款出席者</div>' +
    '<div style="max-height:400px;overflow-y:auto;margin-bottom:12px">' + links + '</div>' +
    (bulkUnpaid.length>0 ? '<div style="margin-top:12px"><button class="btn btn-outline btn-sm" style="width:100%" onclick="navigator.clipboard.writeText(window._bulkLinks);toast(\'已複製 \'+window._bulkCount+\' 條連結\')">📋 一鍵複製全部連結</button></div>' : '')
  );
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

async function changePassword() {
  const pwd = document.getElementById('set-new-pwd').value.trim();
  const msg = document.getElementById('pwd-msg');
  const oldPwd = document.getElementById('set-old-pwd').value;
  if (!pwd || pwd.length < 4) { msg.textContent = '新密碼至少4位'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
  if (!oldPwd) { msg.textContent = '請輸入舊密碼'; msg.style.color = '#ef4444'; msg.style.display = 'block'; return; }
  try {
    const res = await fetch(API + '/auth?action=change_pwd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, password: pwd })
    });
    const data = await res.json();
    if (data.ok) {
      msg.textContent = '密碼已更新';
      msg.style.color = '#10b981';
      document.getElementById('set-old-pwd').value = '';
      document.getElementById('set-new-pwd').value = '';
    } else {
      msg.textContent = data.error || '修改失敗';
      msg.style.color = '#ef4444';
    }
  } catch(e) { msg.textContent = '連線失敗'; msg.style.color = '#ef4444'; }
  msg.style.display = 'block';
}

// ── Chat File Upload ──────────────────────────────
async function uploadChatFile(input) {
  const file = input.files[0];
  if (!file) return;
  const isImg = file.type.startsWith('image/');
  const isPdf = file.type === 'application/pdf';
  var fname = file.name.toLowerCase();
  const isExcel = file.type.includes('spreadsheet') || file.type.includes('excel') || fname.endsWith('.xls') || fname.endsWith('.xlsx') || fname.endsWith('.csv');
  const icon = isImg ? '🖼️' : isPdf ? '📄' : isExcel ? '📊' : '📁';

  if (isExcel) {
    if (typeof XLSX === 'undefined') {
      appendChatMsg('system', 'Excel 組件載入中，請稍後再試');
      input.value = '';
      return;
    }
    // Parse Excel and import data
    appendChatMsg('user', '📊 解析中：' + esc(file.name));
    appendChatMsg('assistant', '<i>讀取 Excel 資料...</i>');
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        var wb = XLSX.read(e.target.result, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length < 2) { document.querySelector('#chat-msgs .chat-msg:last-child').remove(); appendChatMsg('system', 'Excel 無數據'); return; }

        const headers = rows[0];
        const nameIdx = headers.findIndex(h => h && (String(h).includes('名') || String(h).toLowerCase().includes('name')));
        const telIdx = headers.findIndex(h => h && (String(h).includes('電') || String(h).includes('tel') || String(h).includes('phone')));
        const profIdx = headers.findIndex(h => h && (String(h).includes('專業') || String(h).includes('行業')));
        const emailIdx = headers.findIndex(h => h && (String(h).includes('mail') || String(h).includes('電郵')));

        if (nameIdx < 0) { document.querySelector('#chat-msgs .chat-msg:last-child').remove(); appendChatMsg('system', '找不到名稱欄位'); return; }

        const data = rows.slice(1).filter(r => r[nameIdx]).map(r => ({
          name: String(r[nameIdx] || '').trim(),
          tel: telIdx >= 0 ? String(r[telIdx] || '').trim() : '',
          professional: profIdx >= 0 ? String(r[profIdx] || '').trim() : '',
          email: emailIdx >= 0 ? String(r[emailIdx] || '').trim() : ''
        }));

        document.querySelector('#chat-msgs .chat-msg:last-child').remove();
        appendChatMsg('assistant', '📊 找到 <b>' + data.length + '</b> 筆資料。匯入中...');

        let imported = 0;
        for (const p of data) {
          try {
            const resp = await fetch('/api/members', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(p)
            });
            const respData = await resp.json();
            if (!respData.error) imported++;
          } catch (e) { /* skip */ }
        }

        document.querySelector('#chat-msgs .chat-msg:last-child').remove();
        appendChatMsg('assistant', '✅ 成功匯入 <b>' + imported + '</b> / ' + data.length + ' 筆資料！<br><small>類型：會員 · 可到會員管理查看</small>');
      } catch (e) {
        document.querySelector('#chat-msgs .chat-msg:last-child').remove();
        appendChatMsg('system', 'Excel 解析失敗：' + esc(e.message));
      }
    };
    reader.readAsArrayBuffer(file);
    input.value = '';
    return;
  }

  // Non-Excel files: upload to R2
  appendChatMsg('user', icon + ' 上傳中：' + esc(file.name) + ' (' + formatFileSize(file.size) + ')');
  appendChatMsg('assistant', '<i>處理中...</i>');

  const reader = new FileReader();
  reader.onload = async () => {
    document.querySelector('#chat-msgs .chat-msg:last-child').remove();
    try {
      const resp = await fetch('/api/chat-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, data: reader.result, content_type: file.type })
      });
      const data = await resp.json();
      if (data.ok) {
        appendChatMsg('assistant', icon + ' 檔案已儲存！<br><small>R2: ' + esc(data.key) + ' · ' + formatFileSize(data.size) + '</small><br><a href="' + data.url + '" target="_blank" style="color:var(--primary)">🔗 開啟檔案</a>');
        // For images, also try AI understanding
        if (isImg && typeof window._analyzeImage === 'function') {
          appendChatMsg('assistant', '<i>🔍 AI 分析中...</i>');
          var analysis = await window._analyzeImage(reader.result);
          if (analysis) {
            document.querySelector('#chat-msgs .chat-msg:last-child').remove();
            appendChatMsg('assistant', '🔍 <b>AI 分析：</b><br>' + analysis);
          } else {
            document.querySelector('#chat-msgs .chat-msg:last-child').remove();
          }
        }
      } else {
        appendChatMsg('system', '上傳失敗：' + esc(data.error));
      }
    } catch (e) {
      document.querySelector('#chat-msgs .chat-msg:last-child').remove();
      appendChatMsg('system', '上傳失敗');
    }
  };
  reader.readAsDataURL(file);
  input.value = '';
}

window._analyzeImage = async function(dataUrl) {
  try {
    var resp = await fetch('/api/image-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl })
    });
    var data = await resp.json();
    return data.reply || null;
  } catch(e) { return null; }
};

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ── Docs Page ────────────────────────────────────
function renderDocsPage(pc) {
  pc.innerHTML = '<iframe src="/docs/" style="width:100%;height:calc(100vh - 100px);border:none;border-radius:8px"></iframe>';
}

// ── Skill Page ────────────────────────────────────
async function renderSkillPage(pc) {
  pc.innerHTML = `
    <h2 style="font-size:20px;font-weight:700;margin-bottom:16px">🦞 火炭會 Skill</h2>
    <div class="panel">
      <div class="panel-header"><h2>📥 下載文件</h2></div>
      <div class="panel-body" style="padding:16px;text-align:center;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
        <button class="btn btn-primary" onclick="downloadSkill()">🦞 下載 Skill 檔</button>
        <button class="btn btn-outline" onclick="downloadAPIManual()">📋 下載 API 手冊</button>
        <button class="btn btn-outline" onclick="window.open('/docs/')">📖 使用手冊</button>
      </div>
      <div style="padding:0 16px 16px;font-size:11px;color:var(--text2);text-align:center">
        Skill 檔放 OpenClaw / Claude Code skills 目錄即可使用
      </div>
      </div>
    </div>
    <div class="panel" style="margin-top:16px">
      <div class="panel-header"><h2>🔑 Token 管理</h2><button class="btn btn-primary btn-sm" onclick="createSkillToken()">+ 新增 Token</button></div>
      <div class="panel-body" style="padding:0">
        <table class="data-table">
          <thead><tr><th>名稱</th><th>Token</th><th>建立日期</th><th>到期日</th><th>狀態</th><th></th></tr></thead>
          <tbody id="skill-token-list"><tr><td colspan="6">載入中...</td></tr></tbody>
        </table>
      </div>
    </div>`;
  loadSkillTokens();
}

async function loadSkillTokens() {
  try {
    const tokens = await fetch('/api/skill-tokens').then(r => r.json());
    const el = document.getElementById('skill-token-list');
    if (!tokens.length) { el.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text2)">暫無 Token</td></tr>'; return; }
    el.innerHTML = tokens.map(t => {
      var isExpired = t.expires_at < new Date().toISOString().split('T')[0];
      var isActive = t.active && !isExpired;
      return '<tr><td>'+esc(t.name||'—')+'</td><td><code style="font-size:11px;background:#f1f5f9;padding:2px 6px;border-radius:4px">'+esc(t.token)+'</code></td><td>'+esc((t.created_at||'').substring(0,10))+'</td><td>'+(isExpired?'<span style="color:#ef4444">'+esc(t.expires_at)+'</span>':esc(t.expires_at))+'</td><td><span class="badge '+(isActive?'badge-paid':'badge-unpaid')+'">'+(isActive?'有效':'已過期')+'</span></td><td><button class="btn btn-danger btn-sm" onclick="deleteSkillToken('+t.id+')" style="font-size:10px;padding:2px 6px">刪除</button></td></tr>';
    }).join('');
  } catch(e) { document.getElementById('skill-token-list').innerHTML = '<tr><td colspan="6">載入失敗</td></tr>'; }
}

async function createSkillToken() {
  var name = prompt('Token 用途／使用人名稱：');
  if (!name) return;
  try {
    var resp = await fetch('/api/skill-tokens', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
    var data = await resp.json();
    if (data.ok) {
      var curlExample = `curl -s -X POST "https://fotan.techforliving.net/api/skill" \\
  -H "Content-Type: application/json" \\
  -d '{
    "token": "${data.token}",
    "action": "import_guests",
    "guests": [
      {"name": "陳大文", "professional": "律師", "payment": "paid"},
      {"name": "李小華", "professional": "會計師", "payment": "unpaid"}
    ]
  }'`;
      showModal('🔑 Token 已建立 — ' + esc(name), `
        <div style="margin-bottom:12px">
          <div style="font-size:12px;color:var(--text2);margin-bottom:4px">Token（請妥善保存）</div>
          <code style="display:block;background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:12px;word-break:break-all;user-select:all">${esc(data.token)}</code>
          <div style="font-size:11px;color:var(--text2);margin-top:4px">到期日：${esc(data.expires_at)}</div>
        </div>
        <div>
          <div style="font-size:12px;color:var(--text2);margin-bottom:4px">📋 匯入嘉賓 curl 範例</div>
          <pre style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;white-space:pre-wrap;user-select:all">${esc(curlExample)}</pre>
        </div>
        <p style="font-size:11px;color:var(--text2);margin-top:8px">🦞 支援 9 種操作：import_guests、update_payment、update_table、mark_arrival、search、meeting_stats、list_meetings、payment_summary、list_attendance</p>
      `);
      loadSkillTokens();
    }
  } catch(e) { toast('建立失敗'); }
}

async function deleteSkillToken(id) {
  if (!confirm('確定刪除此 Token？')) return;
  await fetch('/api/skill-tokens?id='+id, { method: 'DELETE' });
  toast('已刪除');
  loadSkillTokens();
}

function downloadSkill() {
  var content = '---\nname: fotan-skill\ndescription: 火炭會聚會簽到系統完整 Skill — 查詢、匯入、付款、會議、統計、枱號\n---\n\n# 火炭會 Skill\n\n## Token 驗證\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "list_meetings"}\'\n```\n\n所有請求格式：`POST https://fotan.techforliving.net/api/skill` + JSON body，必須帶 `token` 同 `action`。\n\n---\n\n## 🌟 嘉賓名單匯入\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{\n    "token": "YOUR_TOKEN",\n    "action": "import_guests",\n    "guests": [\n      {"name": "陳大文", "professional": "律師", "payment": "paid"},\n      {"name": "李小華", "professional": "會計師", "payment": "unpaid"},\n      {"name": "張三", "professional": "工程師", "payment": "free"}\n    ]\n  }\'\n```\n\n| 欄位 | 說明 |\n|------|------|\n| `name` | 姓名（必填） |\n| `professional` | 專業（可選） |\n| `payment` | `paid` / `unpaid` / `free` |\n| `tel` | 電話（可選） |\n| `invited_by` | 邀請人（可選） |\n\n**規則：** 自動用最新會議、跳過會員/來賓重複、如係會員會更新其 attendance 付款狀態。\n\n---\n\n## 💰 更新付款狀態\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "update_payment", "attendance_id": 123, "payment": "paid"}\'\n```\n\n`payment` 值：`paid` / `free` / `unpaid`\n\n---\n\n## 🍽️ 更新枱號\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "update_table", "meeting_id": 10, "person_type": "member", "person_id": 26, "table_number": "5"}\'\n```\n\n---\n\n## ✅ 標記出席\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "mark_arrival", "attendance_id": 123, "arrival_time": "12:30"}\'\n```\n\n`arrival_time` 值：`HH:MM` 或 `absent`（缺席）\n\n---\n\n## 🔍 搜尋\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "search", "q": "陳"}\'\n```\n\n---\n\n## 📊 會議統計\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "meeting_stats"}\'\n```\n\n---\n\n## 💳 付款摘要\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "payment_summary"}\'\n```\n\n---\n\n## 📋 會議列表\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "list_meetings"}\'\n```\n\n---\n\n## 👥 出席名單\n\n```bash\ncurl -s -X POST "https://fotan.techforliving.net/api/skill" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"token": "YOUR_TOKEN", "action": "list_attendance"}\'\n```\n\n---\n\n## 🛠️ 手動 SQL（需要 Wrangler + Node.js）\n\n資料庫：D1 `fotan-db`\n```bash\nnpx wrangler d1 execute fotan-db --remote --command "<SQL>"\n```\n';
  var blob = new Blob([content], { type: 'text/markdown' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fotan-skill.md';
  a.click();
  toast('Skill 已下載');
}

function downloadAPIManual() {
  var content = '# API 手冊 — 火炭會聚會簽到系統\n\n'+
    '## Skill REST API（Token 保護）\n\n端點：`POST https://fotan.techforliving.net/api/skill`\n\n'+
    '| Action | 參數 | 說明 |\n|--------|------|------|\n'+
    '| import_guests | guests[] | 批次匯入來賓 |\n'+
    '| create_member | name, tel, email, professional, role | 新增會員 |\n'+
    '| update_member | member_id, +欄位 | 更新會員 |\n'+
    '| update_guest | guest_id, +欄位 | 更新來賓 |\n'+
    '| delete_person | person_type, person_id | 刪除人員 |\n'+
    '| search | q | 搜尋會員+來賓 |\n'+
    '| update_payment | attendance_id, payment | 更新付款 |\n'+
    '| update_table | meeting_id, person_type, person_id, table_number | 更新枱號 |\n'+
    '| mark_arrival | attendance_id, arrival_time | 標記出席 |\n'+
    '| list_meetings | — | 會議列表 |\n'+
    '| meeting_stats | meeting_id? | 會議統計 |\n'+
    '| payment_summary | meeting_id? | 付款摘要 |\n'+
    '| list_attendance | meeting_id? | 出席名單 |\n'+
    '| get_settings | — | 系統設定 |\n'+
    '| export_stats | — | 綜合統計 |\n\n'+
    '## 後台 API（Cookie 驗證）\n\n'+
    '全部在 /api/ 路徑：members, guests, meetings, attendance, auth, chat, telegram, skill-tokens, skill, settings, stats, receipts, checkin-upload, backup, image\n\n'+
    '## Chatbot Tools（19 個）\n'+
    'get_meetings, get_attendance, get_member_stats, search_people, get_member_detail, get_guest_list, get_payment_summary, get_industry_list, add_guest, bulk_add_guests, add_meeting, update_payment, update_table, mark_arrival, get_settings, delete_attendance, get_receipts, create_member, update_member\n';
  var blob = new Blob([content], { type: 'text/markdown' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fotan-api-manual.md';
  a.click();
  toast('API 手冊已下載');
}

// ── Telegram Log Viewer ──────────────────────────
let tgCurrentChat = '';

async function loadTelegramChats() {
  document.getElementById('chat-msgs').style.display = 'none';
  const log = document.getElementById('tg-log');
  log.style.display = 'block';
  log.innerHTML = '<div class="chat-msg system">載入中...</div>';
  try {
    const chats = await fetch('/api/telegram?action=chats').then(r => r.json());
    if (!chats.length) { log.innerHTML = '<div class="chat-msg system">暫無 Telegram 對話</div>'; return; }
    let html = '<div style="font-weight:700;margin-bottom:8px;color:var(--text)">📱 Telegram 對話 ('+chats.length+')</div>';
    chats.forEach(c => {
      html += '<div style="padding:8px;margin:4px 0;background:'+(tgCurrentChat===c.chat_id?'#e0f2fe':'#fff')+';border:1px solid var(--border);border-radius:8px;cursor:pointer" onclick="loadTelegramMessages(\''+c.chat_id+'\')">'+
        '<div style="font-weight:600;font-size:12px">'+esc(c.first_name||c.username||c.chat_id)+' <span style="color:var(--text2);font-weight:400">@'+esc(c.username||'—')+'</span></div>'+
        '<div style="font-size:10px;color:var(--text2)">'+esc(c.msg_count)+' 訊息 · 最後: '+esc((c.last_msg||'').substring(0,19))+'</div>'+
      '</div>';
    });
    html += '<div style="margin-top:8px;font-size:10px;color:var(--text2)">點擊對話查看內容</div>';
    log.innerHTML = html;
  } catch(e) { log.innerHTML = '<div class="chat-msg system">載入失敗</div>'; }
}

async function loadTelegramMessages(chatId) {
  tgCurrentChat = chatId;
  const log = document.getElementById('tg-log');
  log.innerHTML = '<div class="chat-msg system">載入中...</div>';
  try {
    const msgs = await fetch('/api/telegram?action=messages&chat_id='+chatId+'&limit=100').then(r => r.json());
    let html = '<div style="margin-bottom:8px"><button class="btn btn-sm btn-outline" onclick="loadTelegramChats()" style="font-size:10px;padding:2px 8px">◀ 返回</button></div>';
    msgs.forEach(m => {
      const isUser = m.role === 'user';
      html += '<div style="margin:4px 0;padding:6px 10px;background:'+(isUser?'#e0f2fe':'#f0fdf4')+';border-radius:8px;font-size:11px">'+
        '<div style="font-weight:600;color:'+(isUser?'#2563eb':'#10b981')+';margin-bottom:2px">'+(isUser?'👤 '+esc(m.first_name||'用戶'):'🤖 Bot')+' <span style="font-size:9px;color:var(--text3)">'+esc((m.created_at||'').substring(11,19))+'</span></div>'+
        '<div style="white-space:pre-wrap;word-break:break-word">'+esc(m.content||'')+'</div>'+
      '</div>';
    });
    if (!msgs.length) html += '<div class="chat-msg system">暫無訊息</div>';
    log.innerHTML = html;
    log.scrollTop = log.scrollHeight;
  } catch(e) { log.innerHTML = '<div class="chat-msg system">載入失敗</div>'; }
}

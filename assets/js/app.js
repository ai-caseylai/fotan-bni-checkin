// BNI Galaxy ST v0.14
var API = '/api';
var todayMeeting = null;
var members = [], guests = [], observers = [];
var checkedIn = [];
var locked = false;
var lastResult = null;

// Default labels — overridden by server settings
var L = {
  title: '火炭會聚會',
  loading: '載入中...',
  checkin: '簽到',
  noMeeting: '今日未有會議',
  noMeetingHint: '請到後台建立今日會議',
  allPeople: '全部名單',
  confirmTitle: '確認簽到？',
  cancel: '取消',
  confirm: '✓ 確認',
  paid: '已繳費',
  unpaid: '還未繳費',
  paidTri: '已繳費 / 已缴费 / Paid',
  unpaidTri: '還未繳費 / 还未缴费 / Unpaid',
  checkedInTri: '已簽到 / 已签到 / Checked In',
  memberLabel: '會員',
  guestLabel: '來賓',
  observerLabel: '觀察員',
  regular: '例會',
  special: '特別會議',
  lunchFee: '388',
  paymeLink: 'https://payme.hsbc/fotan',
  wcLink: 'https://pay.weixin.qq.com/',
  aliLink: 'https://www.alipayhk.com/',
  wcQrImg: '',
  aliQrImg: '',
  tableNumber: '8',
  schedule: '12:30 報到及交流\n12:45 例會正式開始\n13:00 會員介紹 (30秒每位)\n13:20 專題分享\n13:40 來賓介紹\n14:00 商業引薦\n14:30 午宴及自由交流\n15:00 活動結束',
  chairmanMsg: '感謝您今天蒞臨火炭會聚會！\n期待每個月也可以見面！'
};

document.addEventListener('DOMContentLoaded', function() {
  init();
});

async function init() {
  var c = document.getElementById('content');
  c.innerHTML = '<div class="loading">'+L.loading+'</div>';

  try {
    var s = await api('/settings');
    if (s && !s.error) { for (var k in s) { if (L.hasOwnProperty(k)) L[k] = s[k]; } }
    document.title = L.title + ' — ' + L.checkin;
    document.getElementById('bottom-msg').textContent = '✅ payme='+(L.paymeLink?'OK':'NO')+' wc='+(L.wcLink?'OK':'NO')+' ali='+(L.aliLink?'OK':'NO');
    console.log('SETTINGS LOADED', JSON.stringify({paymeLink:L.paymeLink,wcLink:L.wcLink,aliLink:L.aliLink,chairmanMsg:!!L.chairmanMsg,schedule:!!L.schedule}));
  } catch(e) {
    document.getElementById('bottom-msg').textContent = '⚠️ 離線模式';
    console.error('SETTINGS FAILED', e);
  }

  var meetings = await api('/meetings');
  var today = new Date().toISOString().split('T')[0];
  todayMeeting = meetings.find(function(m) { return m.date === today; });

  if (!todayMeeting) {
    document.getElementById('top-bar').innerHTML = '<h1>'+esc(L.title)+'</h1><div class="date">'+L.checkin+'</div>';
    c.innerHTML = '<div class="no-meeting"><div class="icon">📋</div><h3>'+L.noMeeting+'</h3><p style="margin-top:4px;font-size:13px">'+L.noMeetingHint+'</p></div>';
    document.getElementById('bottom-msg').textContent = L.noMeeting;
    return;
  }

  var mtType = todayMeeting.type==='regular' ? L.regular : L.special;
  document.getElementById('top-bar').innerHTML = '<h1>'+esc(L.title)+'</h1><div class="date">📅 '+todayMeeting.date+' '+mtType+'</div>';

  Promise.all([api('/members'), api('/guests'), api('/observers'), api('/attendance?meeting_id='+todayMeeting.id)])
    .then(function(results) {
      members = results[0]; guests = results[1]; observers = results[2]; checkedIn = results[3];
      locked = false;
      renderAllPeople();
    });
}

function getAllPeople() {
  var attMap = {};
  checkedIn.forEach(function(a) { attMap[a.person_type+'_'+a.person_id] = a; });
  var all = [];
  members.forEach(function(p) { all.push(Object.assign({}, p, {type:'member', label: L.memberLabel, att: attMap['member_'+p.id]||null})); });
  guests.forEach(function(p) { all.push(Object.assign({}, p, {type:'guest', label: L.guestLabel, att: attMap['guest_'+p.id]||null})); });
  observers.forEach(function(p) { all.push(Object.assign({}, p, {type:'observer', label: L.observerLabel, att: attMap['observer_'+p.id]||null})); });
  return all;
}

function renderAllPeople() {
  var all = getAllPeople();
  var checkedCount = all.filter(function(p) { return !!p.att; }).length;
  var total = all.length;
  var c = document.getElementById('content');

  if (locked) {
    var dbg = document.createElement('div');
    dbg.id = 'dbg'; dbg.style.cssText = 'position:fixed;bottom:54px;left:0;right:0;background:#0f172a;color:#22d3ee;font-size:10px;font-family:monospace;padding:6px;z-index:999;line-height:1.4;max-height:120px;overflow-y:auto';
    dbg.innerHTML = '🐛 payme=['+String(L.paymeLink).slice(0,30)+'] wc=['+String(L.wcLink).slice(0,30)+'] ali=['+String(L.aliLink).slice(0,30)+']<br>chair=['+String(L.chairmanMsg).slice(0,30)+'] sched=['+String(L.schedule).slice(0,30)+']<br>tbl='+L.tableNumber+' fee='+L.lunchFee;
    document.body.appendChild(dbg);
    if (lastResult) {
      var paid = lastResult.payment && lastResult.payment !== 'unpaid' && lastResult.payment !== '';
      dbg.innerHTML += '<br>result='+(paid?'PAID':'UNPAID');
      if (paid) {
        // PAID page — show table number
        c.innerHTML = '<div style="padding:40px 20px 120px;text-align:center;background:#fff;min-height:100vh">'+
          '<div style="font-size:56px;margin-bottom:12px">✅</div>'+
          '<div style="font-size:24px;font-weight:700;color:#1e293b;margin-bottom:4px">'+esc(lastResult.name)+'</div>'+
          '<div style="font-size:16px;color:#0d9488;font-weight:600;margin-bottom:20px">'+esc(lastResult.time)+'</div>'+
          '<div style="display:inline-block;padding:10px 28px;border-radius:12px;font-size:18px;font-weight:700;background:#d1fae5;color:#065f46;margin-bottom:24px">'+L.paidTri+'</div>'+
          '<div style="background:#f0fdfa;border-radius:16px;padding:24px;margin:0 12px">'+
            '<div style="font-size:15px;color:#0d9488;font-weight:700;margin-bottom:8px">🍽 '+esc(L.tableNumber)+' 號枱 · 午宴資訊</div>'+
            (L.schedule ? '<div style="text-align:left;font-size:13px;color:#0f766e;line-height:1.8;margin-top:8px;white-space:pre-line">'+esc(L.schedule)+'</div>' : '')+
          '</div>'+
          (L.chairmanMsg ? '<div style="margin-top:16px;padding:16px;background:#fff;border-radius:12px;text-align:center;font-size:14px;color:#475569;line-height:1.8;white-space:pre-line">💬 '+esc(L.chairmanMsg)+'</div>' : '')+
          '</div>';
      } else {
        // UNPAID page — show lunch fee + payment buttons
        console.log('RENDERING UNPAID PAGE. L.paymeLink='+L.paymeLink+' L.wcLink='+L.wcLink+' L.aliLink='+L.aliLink);
        var fee = esc(L.lunchFee);
        var btns = '';
        // PayMe button
        if (L.paymeLink) {
          btns += '<a href="'+esc(L.paymeLink)+'" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 0;padding:16px;border-radius:14px;background:#e31b5f;color:#fff;text-decoration:none;font-size:17px;font-weight:700;letter-spacing:0.5px">💳 PayMe · 點擊付款 HK$'+fee+'</a>';
        }
        // WeChat Pay button
        if (L.wcLink) {
          btns += '<a href="'+esc(L.wcLink)+'" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 0;padding:16px;border-radius:14px;background:#00b533;color:#fff;text-decoration:none;font-size:17px;font-weight:700;letter-spacing:0.5px">💚 WeChat Pay · 點擊付款 HK$'+fee+'</a>';
        }
        // Alipay HK button
        if (L.aliLink) {
          btns += '<a href="'+esc(L.aliLink)+'" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;margin:8px 0;padding:16px;border-radius:14px;background:#1677ff;color:#fff;text-decoration:none;font-size:17px;font-weight:700;letter-spacing:0.5px">💙 Alipay HK · 點擊付款 HK$'+fee+'</a>';
        }
        // QR images as fallback
        var qrSection = '';
        if (L.wcQrImg || L.aliQrImg) {
          qrSection += '<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #fed7aa"><div style="font-size:12px;color:#94a3b8;margin-bottom:8px">或掃描 QR 碼付款</div><div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">';
          if (L.wcQrImg) qrSection += '<div><img src="'+esc(L.wcQrImg)+'" style="width:110px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.08)" alt="WeChat QR"><div style="font-size:10px;color:#64748b;margin-top:3px">WeChat</div></div>';
          if (L.aliQrImg) qrSection += '<div><img src="'+esc(L.aliQrImg)+'" style="width:110px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,0.08)" alt="Alipay QR"><div style="font-size:10px;color:#64748b;margin-top:3px">Alipay</div></div>';
          qrSection += '</div></div>';
        }
        if (!btns && !qrSection) {
          btns = '<div style="color:#94a3b8;font-size:13px;padding:12px">請在後台設定付款連結<br><small>後台 → 文字設定</small></div>';
        }

        c.innerHTML = '<div style="padding:40px 20px 120px;text-align:center;background:#fff;min-height:100vh">'+
          '<div style="font-size:56px;margin-bottom:12px">✅</div>'+
          '<div style="font-size:24px;font-weight:700;color:#1e293b;margin-bottom:4px">'+esc(lastResult.name)+'</div>'+
          '<div style="font-size:16px;color:#0d9488;font-weight:600;margin-bottom:20px">'+esc(lastResult.time)+'</div>'+
          '<div style="display:inline-block;padding:10px 28px;border-radius:12px;font-size:18px;font-weight:700;background:#fee2e2;color:#991b1b;margin-bottom:24px">'+L.unpaidTri+'</div>'+
          '<div style="background:#fff7ed;border-radius:16px;padding:24px;margin:0 12px">'+
            '<div style="font-size:15px;color:#c2410c;font-weight:700;margin-bottom:8px">🍽 午餐費用</div>'+
            '<div style="font-size:40px;font-weight:800;color:#ea580c">HK$'+esc(L.lunchFee)+'</div>'+
            '<div style="font-size:13px;color:#64748b;margin-top:4px;margin-bottom:8px">點擊以下按鈕直接付款</div>'+
            btns+
            '<div style="margin-top:16px;padding-top:12px;border-top:1px solid #fed7aa">'+
              '<div style="font-size:12px;color:#64748b;margin-bottom:8px">付款完成後請按：</div>'+
              '<button onclick="markAsPaid('+lastResult.attId+')" style="width:100%;padding:14px;border-radius:12px;background:#10b981;color:#fff;border:none;font-size:17px;font-weight:700;cursor:pointer;letter-spacing:0.5px">✅ 我已付款</button>'+
              '<div style="margin-top:12px;font-size:12px;color:#64748b;line-height:1.6">'+
                '📱 請把付款截圖 WhatsApp 至 <a href="https://wa.me/85297188675" style="color:#25d366;font-weight:700">97188675</a><br>'+
                '或展示給前台大使。謝謝！<br>'+
                '<span style="font-size:11px;color:#94a3b8">祝你有愉快的一天 ✨</span>'+
              '</div>'+
            '</div>'+
            qrSection+
          '</div>'+
          (L.schedule ? '<div style="background:#f0fdfa;border-radius:16px;padding:20px;margin:12px 12px 0;text-align:left;font-size:13px;color:#0f766e;line-height:1.8;white-space:pre-line">📋 今日節目表\n'+esc(L.schedule)+'</div>' : '')+
          (L.chairmanMsg ? '<div style="margin:16px 12px 0;padding:16px;background:#fff;border-radius:12px;text-align:center;font-size:14px;color:#475569;line-height:1.8;white-space:pre-line">💬 '+esc(L.chairmanMsg)+'</div>' : '')+
          '</div>';
      }
    } else {
      c.innerHTML = '<div style="padding:60px 20px;text-align:center;background:#fff;min-height:100vh"><div style="font-size:56px">✅</div><div style="font-size:18px;font-weight:700;color:#1e293b;margin-top:12px">'+L.checkedInTri+'</div></div>';
    }
    document.getElementById('bottom-msg').textContent = L.checkedInTri;
    return;
  }

  document.getElementById('bottom-msg').textContent = L.title + ' — ' + L.checkin;
  c.innerHTML = '<div class="sec-header"><span>'+L.allPeople+'</span><span class="count">'+checkedCount+' / '+total+'</span></div>' +
    all.map(function(p) { return renderRow(p); }).join('');

  c.querySelectorAll('.person-row').forEach(function(row) {
    row.addEventListener('click', function() {
      if (locked) return;
      showConfirm(row.dataset.type, parseInt(row.dataset.id), row.dataset.name, row.dataset.label);
    });
  });
}

function renderRow(p) {
  var hasAtt = !!p.att;
  var paid = hasAtt && p.att.payment && p.att.payment !== 'unpaid' && p.att.payment !== '';
  var meta = [p.professional, p.chapter].filter(Boolean).join(' · ') || p.label;
  var right = hasAtt ? '<div class="pbadge"><span class="time">'+esc(p.att.arrival_time||'')+'</span><span class="pay '+(paid?'pay-paid':'pay-unpaid')+'">'+(paid?L.paid:L.unpaid)+'</span></div>' : '';
  return '<div class="person-row" data-type="'+p.type+'" data-id="'+p.id+'" data-name="'+esc(p.name)+'" data-label="'+p.label+'"><div class="avatar '+p.type+'">'+(p.name||'?').charAt(0)+'</div><div class="info"><div class="pname">'+esc(p.name)+'</div><div class="pmeta">'+esc(meta)+'</div></div>'+right+'</div>';
}

function showConfirm(type, id, name, label) {
  document.getElementById('content').classList.add('dimmed');
  document.getElementById('top-bar').classList.add('dimmed');

  var overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = '<div class="dialog-box"><div class="dname">'+esc(name)+'</div><div class="dmeta">'+esc(label)+'</div><div class="dconfirm">'+L.confirmTitle+'</div><div class="dialog-btns"><button class="btn-no" id="btn-no">'+L.cancel+'</button><button class="btn-yes" id="btn-yes">'+L.confirm+'</button></div></div>';
  document.body.appendChild(overlay);

  var cleanup = function() {
    if (overlay.parentNode) document.body.removeChild(overlay);
    document.getElementById('content').classList.remove('dimmed');
    document.getElementById('top-bar').classList.remove('dimmed');
  };

  document.getElementById('btn-no').onclick = function() { cleanup(); };
  document.getElementById('btn-yes').onclick = function() {
    document.getElementById('btn-yes').disabled = true;
    document.getElementById('btn-no').disabled = true;
    doCheckin(type, id, name).then(function(result) {
      locked = true;
      lastResult = result;
      cleanup();
      renderAllPeople();
    }).catch(function(e) {
      locked = true;
      cleanup();
      renderAllPeople();
    });
  };
  overlay.addEventListener('click', function(e) { if (e.target === overlay) cleanup(); });
}

async function doCheckin(type, id, name) {
  var existing = checkedIn.find(function(a) { return a.person_type === type && a.person_id === id; });
  if (existing) return;
  var now = new Date();
  var time = String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  var payment = (type === 'guest') ? '' : 'paid';
  var row = document.querySelector('.person-row[data-type="'+type+'"][data-id="'+id+'"]');
  if (row) {
    var paid = payment && payment !== 'unpaid' && payment !== '';
    row.querySelector('.info').insertAdjacentHTML('afterend', '<div class="pbadge"><span class="time">'+time+'</span><span class="pay '+(paid?'pay-paid':'pay-unpaid')+'">'+(paid?L.paid:L.unpaid)+'</span></div>');
  }
  var result = await api('/attendance', { method: 'POST',
    body: JSON.stringify({ meeting_id: todayMeeting.id, person_type: type, person_id: id, arrival_time: time, payment: payment })
  });
  return { name: name, time: time, payment: payment, attId: result.id };
}

async function markAsPaid(attId) {
  await api('/attendance', { method: 'PUT',
    body: JSON.stringify({ id: attId, payment: 'paid' })
  });
  // Refresh the page to show paid status
  var c = document.getElementById('content');
  c.innerHTML = '<div style="padding:60px 20px;text-align:center;background:#fff;min-height:100vh">'+
    '<div style="font-size:56px;margin-bottom:8px">🎉</div>'+
    '<div style="font-size:20px;font-weight:700;color:#065f46;margin-bottom:4px">付款已確認！</div>'+
    '<div style="font-size:14px;color:#64748b">Payment Confirmed!</div>'+
    '<button onclick="location.reload()" style="margin-top:24px;padding:12px 32px;border-radius:10px;background:#0d9488;color:#fff;border:none;font-size:16px;font-weight:700;cursor:pointer">🔄 重新整理</button>'+
    '</div>';
  document.getElementById('bottom-msg').textContent = '已付款 ✓';
}

function api(path, opts) {
  return fetch(API+path, Object.assign({}, opts||{}, { headers: (opts&&opts.body)?{'Content-Type':'application/json'}:{} })).then(function(r) { return r.json(); });
}
function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

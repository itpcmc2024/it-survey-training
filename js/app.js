const state = {
  profile: null,
  bootstrap: null,
  myResponse: null,
  charts: [],
  device: navigator.userAgent,
  ip: ''
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  bindTabs();
  bindFormEvents();
  setLoading(true, 'กำลังเปิดระบบ...');

  try {
    validateConfig();
    await initializeIdentity();
    await loadPublicIp();
    await loadBootstrap();
    renderProfile();
    renderMasters();
    renderTopics();
    await loadMyResponse();
    updateProgress();
  } catch (error) {
    showNotice(error.message || String(error), 'danger');
  } finally {
    setLoading(false);
  }
}

function validateConfig() {
  if (!APP_CONFIG.GAS_WEB_APP_URL || APP_CONFIG.GAS_WEB_APP_URL.includes('PASTE_')) {
    throw new Error('กรุณาใส่ GAS Web App URL ในไฟล์ js/config.js ก่อนใช้งาน');
  }
}

async function initializeIdentity() {
  if (!APP_CONFIG.REQUIRE_LIFF) {
    state.profile = {
      userId: localStorage.getItem('survey-demo-user') || createDemoUserId(),
      displayName: 'ผู้ตอบแบบสอบถาม'
    };
    return;
  }

  await liff.init({ liffId: APP_CONFIG.LIFF_ID });

  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    throw new Error('กำลังเข้าสู่ระบบ LINE');
  }

  const profile = await liff.getProfile();
  state.profile = {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl || ''
  };
}

function createDemoUserId() {
  const id = 'WEB-' + Date.now();
  localStorage.setItem('survey-demo-user', id);
  return id;
}

async function loadPublicIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    state.ip = data.ip || '';
  } catch (ignore) {
    state.ip = '';
  }
}

async function apiGet(action, params = {}) {
  const url = new URL(APP_CONFIG.GAS_WEB_APP_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set('_', Date.now());

  const response = await fetch(url.toString(), { redirect: 'follow' });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์');
  return result.data;
}

async function apiPost(payload) {
  const response = await fetch(APP_CONFIG.GAS_WEB_APP_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!result.success) throw new Error(result.message || 'บันทึกข้อมูลไม่สำเร็จ');
  return result.data;
}

async function loadBootstrap() {
  state.bootstrap = await apiGet('bootstrap');
  const isOpen = String(state.bootstrap.settings.SURVEY_OPEN).toUpperCase() === 'TRUE';
  if (!isOpen) {
    document.getElementById('surveyClosed').classList.remove('hidden');
    document.getElementById('surveyForm').classList.add('hidden');
  }
}

async function loadMyResponse() {
  state.myResponse = await apiGet('myResponse', { lineUserId: state.profile.userId });
  if (!state.myResponse) return;

  const h = state.myResponse.header;
  setValue('department', h.department);
  toggleOtherField('department');
  setValue('departmentOther', h.departmentOther);
  setValue('position', h.position);
  toggleOtherField('position');
  setValue('positionOther', h.positionOther);
  setValue('workExperience', h.workExperience);
  setRadio('computerSkill', h.computerSkill);
  setRadio('trainingMode', h.trainingMode);
  setValue('comment', h.comment);

  state.myResponse.answers.forEach(answer => {
    const input = document.querySelector(
      `input[name="score_${cssEscape(answer.subTopicId)}"][value="${answer.score}"]`
    );
    if (input) input.checked = true;
  });

  document.getElementById('editNotice').classList.remove('hidden');
  document.getElementById('submitText').textContent = 'บันทึกการแก้ไข';
}

function renderProfile() {
  document.getElementById('displayName').textContent = state.profile.displayName;
  document.getElementById('respondentName').value = state.profile.displayName;
}

function renderMasters() {
  fillSelect('department', state.bootstrap.departments, 'Department');
  fillSelect('position', state.bootstrap.positions, 'Position');
}

function fillSelect(id, rows, labelKey) {
  const select = document.getElementById(id);
  select.innerHTML = '<option value="">— กรุณาเลือก —</option>';
  rows.forEach(row => {
    const option = document.createElement('option');
    option.value = row[labelKey];
    option.textContent = row[labelKey];
    select.appendChild(option);
  });
}

function renderTopics() {
  const container = document.getElementById('topicsContainer');
  const grouped = {};

  state.bootstrap.subTopics.forEach(sub => {
    if (!grouped[sub.TopicID]) grouped[sub.TopicID] = [];
    grouped[sub.TopicID].push(sub);
  });

  container.innerHTML = state.bootstrap.topics.map((topic, topicIndex) => {
    const questions = (grouped[topic.TopicID] || []).map((sub, subIndex) => `
      <div class="question" data-subtopic="${escapeHtml(sub.SubTopicID)}">
        <div class="question-text">${topicIndex + 1}.${subIndex + 1} ${escapeHtml(sub.SubTopic)}</div>
        <div class="score-row">
          ${[1,2,3,4,5].map(score => `
            <div class="score-option">
              <input type="radio"
                id="${escapeHtml(sub.SubTopicID)}_${score}"
                name="score_${escapeHtml(sub.SubTopicID)}"
                value="${score}"
                data-topic-id="${escapeHtml(topic.TopicID)}"
                data-subtopic-id="${escapeHtml(sub.SubTopicID)}">
              <label for="${escapeHtml(sub.SubTopicID)}_${score}">${score}</label>
            </div>
          `).join('')}
        </div>
        <div class="legend"><span>ไม่ต้องการ</span><span>ต้องการมากที่สุด</span></div>
      </div>
    `).join('');

    return `
      <section class="card topic-card">
        <div class="topic-heading">
          <div class="topic-icon">${escapeHtml(topic.Icon || '📘')}</div>
          <div>
            <h3 class="topic-name">${topicIndex + 1}. ${escapeHtml(topic.TopicName)}</h3>
            <p class="topic-description">${escapeHtml(topic.Description)}</p>
          </div>
        </div>
        ${questions}
      </section>
    `;
  }).join('');

  container.querySelectorAll('input[type="radio"]').forEach(input => {
    input.addEventListener('change', updateProgress);
  });
}

function bindTabs() {
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', async () => {
      document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.add('active');

      if (button.dataset.tab === 'dashboardPanel') {
        await loadDashboard();
      }
    });
  });
}

function bindFormEvents() {
  document.getElementById('surveyForm').addEventListener('submit', submitSurvey);
  document.getElementById('department').addEventListener('change', () => toggleOtherField('department'));
  document.getElementById('position').addEventListener('change', () => toggleOtherField('position'));
  document.getElementById('refreshDashboard').addEventListener('click', loadDashboard);

  ['department','position','workExperience','departmentOther','positionOther'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateProgress);
    document.getElementById(id).addEventListener('input', updateProgress);
  });
  document.querySelectorAll('input[name="computerSkill"], input[name="trainingMode"]').forEach(el => {
    el.addEventListener('change', updateProgress);
  });
}

function toggleOtherField(type) {
  const select = document.getElementById(type);
  const field = document.getElementById(type + 'OtherGroup');
  field.classList.toggle('hidden', select.value !== 'อื่นๆ');
  document.getElementById(type + 'Other').required = select.value === 'อื่นๆ';
}

async function submitSurvey(event) {
  event.preventDefault();
  clearNotice();

  const answers = [...document.querySelectorAll('input[type="radio"][name^="score_"]:checked')]
    .map(input => ({
      topicId: input.dataset.topicId,
      subTopicId: input.dataset.subtopicId,
      score: Number(input.value)
    }));

  const expected = state.bootstrap.subTopics.length;
  if (answers.length !== expected) {
    showNotice(`กรุณาให้คะแนนให้ครบ ${expected} ข้อ ขณะนี้ตอบแล้ว ${answers.length} ข้อ`, 'danger');
    focusFirstUnanswered();
    return;
  }

  const payload = {
    action: 'saveResponse',
    lineUserId: state.profile.userId,
    displayName: state.profile.displayName,
    department: valueOf('department'),
    departmentOther: valueOf('departmentOther'),
    position: valueOf('position'),
    positionOther: valueOf('positionOther'),
    workExperience: valueOf('workExperience'),
    computerSkill: checkedValue('computerSkill'),
    trainingMode: checkedValue('trainingMode'),
    comment: valueOf('comment'),
    ip: state.ip,
    device: state.device,
    answers
  };

  setLoading(true, 'กำลังบันทึกคำตอบ...');
  document.getElementById('submitButton').disabled = true;

  try {
    const result = await apiPost(payload);
    state.myResponse = { header: payload, answers };
    document.getElementById('submitText').textContent = 'บันทึกการแก้ไข';
    document.getElementById('editNotice').classList.remove('hidden');
    showNotice(
      result.action === 'CREATE'
        ? 'ส่งแบบสอบถามเรียบร้อยแล้ว ขอบคุณสำหรับข้อมูลค่ะ'
        : 'บันทึกการแก้ไขเรียบร้อยแล้ว',
      'success'
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    showNotice(error.message || String(error), 'danger');
  } finally {
    setLoading(false);
    document.getElementById('submitButton').disabled = false;
  }
}

function updateProgress() {
  if (!state.bootstrap) return;
  let completed = 0;
  let total = 5 + state.bootstrap.subTopics.length;

  if (valueOf('department') && (valueOf('department') !== 'อื่นๆ' || valueOf('departmentOther'))) completed++;
  if (valueOf('position') && (valueOf('position') !== 'อื่นๆ' || valueOf('positionOther'))) completed++;
  if (valueOf('workExperience')) completed++;
  if (checkedValue('computerSkill')) completed++;
  if (checkedValue('trainingMode')) completed++;
  completed += document.querySelectorAll('input[type="radio"][name^="score_"]:checked').length;

  const percent = Math.round((completed / total) * 100);
  document.getElementById('progressBar').style.width = percent + '%';
  document.getElementById('progressText').textContent = `ตอบแล้ว ${completed}/${total} รายการ (${percent}%)`;
}

async function loadDashboard() {
  setLoading(true, 'กำลังประมวลผลสถิติ...');
  try {
    const data = await apiGet('dashboard');
    renderDashboard(data);
  } catch (error) {
    showNotice(error.message || String(error), 'danger', 'dashboardNotice');
  } finally {
    setLoading(false);
  }
}

function renderDashboard(data) {
  document.getElementById('totalRespondents').textContent = formatNumber(data.totalRespondents);
  document.getElementById('totalDepartments').textContent = formatNumber(Object.keys(data.departmentCounts).length);
  document.getElementById('topTopic').textContent =
    data.topicStats.slice().sort((a,b) => b.average - a.average)[0]?.average.toFixed(2) || '0.00';
  document.getElementById('dashboardUpdated').textContent = data.generatedAt;

  destroyCharts();
  state.charts.push(new Chart(document.getElementById('topicChart'), {
    type: 'bar',
    data: {
      labels: data.topicStats.map(t => wrapChartLabel(t.name, 24)),
      datasets: [{ label: 'คะแนนเฉลี่ย', data: data.topicStats.map(t => t.average) }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: { x: { min: 0, max: 5 } },
      plugins: { legend: { display: false } }
    }
  }));

  state.charts.push(new Chart(document.getElementById('trainingModeChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(data.trainingModeCounts),
      datasets: [{ data: Object.values(data.trainingModeCounts) }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  }));

  const top10 = data.subTopicStats.slice(0, 10);
  document.getElementById('rankingList').innerHTML = top10.map((item, index) => `
    <div class="ranking-item">
      <div class="rank-number">${index + 1}</div>
      <div class="rank-title">${escapeHtml(item.name)}</div>
      <div class="rank-score">${Number(item.average).toFixed(2)}</div>
    </div>
  `).join('') || '<p class="muted">ยังไม่มีข้อมูล</p>';

  renderHeatmap(data);
}

function renderHeatmap(data) {
  const head = `<tr><th>หมวดความรู้</th>${data.departments.map(d => `<th>${escapeHtml(d)}</th>`).join('')}</tr>`;
  const body = data.heatmapRows.map(row => `
    <tr>
      <td class="heatmap-topic-name">${escapeHtml(row.name)}</td>
      ${row.values.map(cell => {
        const opacity = cell.average ? Math.max(.12, cell.average / 5) : .04;
        return `<td><span class="heat" style="background:rgba(15,110,168,${opacity});color:${cell.average >= 3.5 ? '#fff' : '#17324d'}">${cell.average ? cell.average.toFixed(2) : '-'}</span></td>`;
      }).join('')}
    </tr>
  `).join('');
  document.getElementById('heatmapTable').innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
}

function destroyCharts() {
  state.charts.forEach(chart => chart.destroy());
  state.charts = [];
}

function focusFirstUnanswered() {
  const questions = document.querySelectorAll('.question');
  for (const question of questions) {
    if (!question.querySelector('input:checked')) {
      question.scrollIntoView({ behavior: 'smooth', block: 'center' });
      question.style.outline = '2px solid #c2414b';
      setTimeout(() => question.style.outline = '', 1800);
      break;
    }
  }
}

function setLoading(show, text = 'กำลังดำเนินการ...') {
  document.getElementById('loadingText').textContent = text;
  document.getElementById('loadingOverlay').classList.toggle('show', show);
}

function showNotice(message, type = 'info', targetId = 'mainNotice') {
  const target = document.getElementById(targetId);
  target.textContent = message;
  target.className = `notice notice-${type}`;
  target.classList.remove('hidden');
}

function clearNotice() {
  document.getElementById('mainNotice').classList.add('hidden');
}

function setValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value ?? '';
}
function valueOf(id) { return String(document.getElementById(id)?.value || '').trim(); }
function checkedValue(name) { return document.querySelector(`input[name="${name}"]:checked`)?.value || ''; }
function setRadio(name, value) {
  const input = document.querySelector(`input[name="${name}"][value="${cssEscape(String(value))}"]`);
  if (input) input.checked = true;
}
function formatNumber(value) { return new Intl.NumberFormat('th-TH').format(value || 0); }
function shortText(text, max) {
  const value = String(text || '');
  return value.length > max ? value.slice(0, max - 1) + '…' : value;
}
function cssEscape(value) {
  return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
}
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[char]));
}

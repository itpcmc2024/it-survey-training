const state = {
  profile: null,
  accessMode: 'WEB',
  identityKey: '',
  bootstrap: null,
  myResponse: null,
  charts: [],
  device: navigator.userAgent,
  ip: '',
  idToken: '',
  isAdmin: false,
  adminSessionToken: localStorage.getItem('itSurveyAdminSessionV312') || '',
  adminDisplayName: '',
  noticeTimers: {}
};

document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
  bindTabs();
  bindFormEvents();
  setLoading(true, 'กำลังเปิดระบบ...');

  try {
    validateConfig();
    await initializeIdentity();

    const initialData = await apiPost({
      action: 'initialData',
      identityKey: state.identityKey,
      sessionToken: state.adminSessionToken
    });

    state.bootstrap = initialData.bootstrap;
    state.myResponse = initialData.myResponse;

    applyPublicSettingsV313_(state.bootstrap.settings || {});
    applySurveyOpenStateV314_(state.bootstrap.settings || {});

    renderProfile();
    renderMasters();
    renderTopics();
    applyMyResponseV314_(state.myResponse);

    if (initialData.admin && initialData.admin.isAdmin) {
      setAdminUi(true, initialData.admin.displayName);
    } else {
      if (state.adminSessionToken) {
        localStorage.removeItem('itSurveyAdminSessionV312');
        state.adminSessionToken = '';
      }
      setAdminUi(false);
    }

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
  const canUseLiff = typeof liff !== 'undefined' && APP_CONFIG.LIFF_ID;

  if (canUseLiff) {
    try {
      await liff.init({ liffId: APP_CONFIG.LIFF_ID });

      if (liff.isInClient()) {
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          throw new Error('กำลังเข้าสู่ระบบ LINE');
        }

        const profile = await liff.getProfile();

        state.accessMode = 'LIFF';
        state.profile = {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl || ''
        };
        state.identityKey = profile.userId;
        state.idToken = liff.getIDToken() || '';

        applyIdentityModeV320_();
        return;
      }
    } catch (error) {
      if (String(error.message || '').includes('กำลังเข้าสู่ระบบ LINE')) {
        throw error;
      }
    }
  }

  if (APP_CONFIG.ENABLE_WEB_ACCESS === false) {
    throw new Error('กรุณาเปิดระบบผ่าน LINE LIFF');
  }

  state.accessMode = 'WEB';
  state.profile = {
    userId: '',
    displayName: 'ผู้ตอบผ่านเว็บไซต์',
    pictureUrl: ''
  };
  state.identityKey = '';

  applyIdentityModeV320_();
}

function applyIdentityModeV320_() {
  const isWeb = state.accessMode === 'WEB';

  document.getElementById('liffIdentityGroup').classList.toggle('hidden', isWeb);
  document.getElementById('webEmailGroup').classList.toggle('hidden', !isWeb);
  document.getElementById('webFullNameGroup').classList.toggle('hidden', !isWeb);
  document.getElementById('webCheckGroup').classList.toggle('hidden', !isWeb);

  document.getElementById('accessModeBadge').textContent =
    isWeb ? '🌐 ลิงก์ปกติ' : '💬 LINE LIFF';

  if (isWeb) {
    document.getElementById('displayName').textContent = 'ผู้ตอบผ่านเว็บไซต์';
  }
}

function createDemoUserId() {
  const id = 'WEB-' + Date.now();
  localStorage.setItem('survey-demo-user', id);
  return id;
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
  applyPublicSettingsV313_(state.bootstrap.settings || {});
  applySurveyOpenStateV314_(state.bootstrap.settings || {});
}

async function loadMyResponse() {
  state.myResponse = await apiGet('myResponse', {
    lineUserId: state.profile.userId
  });
  applyMyResponseV314_(state.myResponse);
}

function applySurveyOpenStateV314_(settings) {
  const isOpen =
    String(settings.SURVEY_OPEN).toUpperCase() === 'TRUE';

  document.getElementById('surveyClosed')
    .classList.toggle('hidden', isOpen);

  document.getElementById('surveyForm')
    .classList.toggle('hidden', !isOpen);
}

function applyMyResponseV314_(response) {
  if (!response) return;

  const h = response.header;

  if (state.accessMode === 'WEB') {
    setValue('respondentEmail', h.email || '');
    setValue('respondentFullName', h.fullName || h.displayName || '');
    state.identityKey = h.lineUserId || '';
    state.profile.displayName = h.fullName || h.displayName || 'ผู้ตอบผ่านเว็บไซต์';
    document.getElementById('displayName').textContent = state.profile.displayName;
  }

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

  response.answers.forEach(answer => {
    const input = document.querySelector(
      `input[name="score_${cssEscape(answer.subTopicId)}"][value="${answer.score}"]`
    );
    if (input) input.checked = true;
  });

  applyEditPermissionV3142_();
}


function isResponseLockedV3142_() {
  if (!state.myResponse || !state.bootstrap) return false;

  return String(
    state.bootstrap.settings.ALLOW_EDIT
  ).toUpperCase() !== 'TRUE';
}

function applyEditPermissionV3142_() {
  const hasResponse = !!state.myResponse;
  const locked = isResponseLockedV3142_();

  const editNotice = document.getElementById('editNotice');
  const completedNotice = document.getElementById('completedNotice');
  const submitButton = document.getElementById('submitButton');
  const submitText = document.getElementById('submitText');

  editNotice.classList.toggle(
    'hidden',
    !hasResponse || locked
  );

  completedNotice.classList.toggle(
    'hidden',
    !hasResponse || !locked
  );

  submitButton.classList.toggle(
    'hidden',
    hasResponse && locked
  );

  if (hasResponse && !locked) {
    submitText.textContent = 'บันทึกการแก้ไข';
  } else if (!hasResponse) {
    submitText.textContent = 'ส่งแบบสอบถาม';
  }

  setSurveyControlsLockedV3142_(hasResponse && locked);
}

function setSurveyControlsLockedV3142_(locked) {
  const form = document.getElementById('surveyForm');
  if (!form) return;

  form.querySelectorAll(
    'select, textarea, input[type="text"], input[type="radio"], input[type="checkbox"]'
  ).forEach(element => {
    if (element.id === 'respondentName') return;

    element.disabled = locked;
  });

  const checkEmailButton = document.getElementById('checkEmailButton');
  if (checkEmailButton) checkEmailButton.disabled = locked;

  form.classList.toggle('survey-readonly', locked);
}

function renderProfile() {
  document.getElementById('displayName').textContent = state.profile.displayName;

  if (state.accessMode === 'LIFF') {
    document.getElementById('respondentName').value = state.profile.displayName;
  }
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
      clearAllNotices();
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
  document.getElementById('checkEmailButton').addEventListener('click', checkWebEmailV320_);
  document.getElementById('respondentEmail').addEventListener('input', handleWebEmailChangedV320_);
  document.getElementById('department').addEventListener('change', () => toggleOtherField('department'));
  document.getElementById('position').addEventListener('change', () => toggleOtherField('position'));
  document.getElementById('refreshDashboard').addEventListener('click', loadDashboard);
  document.getElementById('exportCsvButton').addEventListener('click', exportCsv);
  document.getElementById('adminLoginOpenButton').addEventListener('click', openAdminLoginModal);
  document.getElementById('adminLoginCloseButton').addEventListener('click', closeAdminLoginModal);
  document.getElementById('adminLoginSubmitButton').addEventListener('click', adminLogin);
  document.getElementById('adminLogoutButton').addEventListener('click', adminLogout);
  document.getElementById('adminSettingsButton').addEventListener('click', openAdminSettingsV313_);
  document.getElementById('adminSettingsCloseButton').addEventListener('click', closeAdminSettingsV313_);
  document.getElementById('adminSettingsCancelButton').addEventListener('click', closeAdminSettingsV313_);
  document.getElementById('adminSettingsSaveButton').addEventListener('click', saveAdminSettingsV313_);
  document.getElementById('adminSettingsModal').addEventListener('click', event => {
    if (event.target.id === 'adminSettingsModal') {
      closeAdminSettingsV313_();
    }
  });
  document.getElementById('adminPassword').addEventListener('keydown', event => {
    if (event.key === 'Enter') adminLogin();
  });
  document.getElementById('adminLoginModal').addEventListener('click', event => {
    if (event.target.id === 'adminLoginModal') closeAdminLoginModal();
  });

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

  if (isResponseLockedV3142_()) {
    showNotice(
      'user นี้ได้ทำแบบสอบถามแล้วค่ะ',
      'info'
    );
    applyEditPermissionV3142_();
    return;
  }

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
    accessMode: state.accessMode,
    lineUserId: state.accessMode === 'LIFF' ? state.profile.userId : '',
    displayName: state.accessMode === 'LIFF'
      ? state.profile.displayName
      : valueOf('respondentFullName'),
    email: state.accessMode === 'WEB' ? valueOf('respondentEmail') : '',
    fullName: state.accessMode === 'WEB' ? valueOf('respondentFullName') : '',
    department: valueOf('department'),
    departmentOther: valueOf('departmentOther'),
    position: valueOf('position'),
    positionOther: valueOf('positionOther'),
    workExperience: valueOf('workExperience'),
    computerSkill: checkedValue('computerSkill'),
    trainingMode: checkedValue('trainingMode'),
    comment: valueOf('comment'),
    ip: '',
    device: state.device,
    answers
  };

  setLoading(true, 'กำลังบันทึกคำตอบ...');
  document.getElementById('submitButton').disabled = true;

  try {
    const result = await apiPost(payload);
    if (state.accessMode === 'WEB') {
      state.identityKey = 'EMAIL:' + valueOf('respondentEmail').toLowerCase();
      payload.lineUserId = state.identityKey;
      payload.displayName = valueOf('respondentFullName');
      payload.email = valueOf('respondentEmail').toLowerCase();
      payload.fullName = valueOf('respondentFullName');
      document.getElementById('displayName').textContent = payload.fullName;
    }

    state.myResponse = { header: payload, answers };
    applyEditPermissionV3142_();
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
  let total = 5 + state.bootstrap.subTopics.length +
    (state.accessMode === 'WEB' ? 2 : 0);

  if (state.accessMode === 'WEB') {
    if (isValidEmailV320_(valueOf('respondentEmail'))) completed++;
    if (valueOf('respondentFullName')) completed++;
  }

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


async function checkWebEmailV320_() {
  if (state.accessMode !== 'WEB') return;

  const email = valueOf('respondentEmail').toLowerCase();

  if (!isValidEmailV320_(email)) {
    showNotice('กรุณากรอกอีเมลให้ถูกต้องก่อนตรวจสอบ', 'danger');
    return;
  }

  setLoading(true, 'กำลังตรวจสอบคำตอบเดิม...');

  try {
    const response = await apiPost({
      action: 'findWebResponse',
      email
    });

    if (!response) {
      state.identityKey = 'EMAIL:' + email;
      state.myResponse = null;
      document.getElementById('editNotice').classList.add('hidden');
      document.getElementById('completedNotice').classList.add('hidden');
      document.getElementById('submitButton').classList.remove('hidden');
      setSurveyControlsLockedV3142_(false);
      showNotice('ยังไม่พบคำตอบเดิม สามารถเริ่มตอบแบบสอบถามได้ค่ะ', 'info');
      return;
    }

    state.identityKey = response.header.lineUserId;
    state.myResponse = response;
    applyMyResponseV314_(response);
    updateProgress();

    showNotice(
      isResponseLockedV3142_()
        ? 'user นี้ได้ทำแบบสอบถามแล้วค่ะ'
        : 'โหลดคำตอบเดิมเรียบร้อยแล้ว',
      'info'
    );
  } catch (error) {
    showNotice(error.message || String(error), 'danger');
  } finally {
    setLoading(false);
  }
}

function handleWebEmailChangedV320_() {
  if (state.accessMode !== 'WEB') return;

  const currentEmail = valueOf('respondentEmail').toLowerCase();
  const currentIdentity = currentEmail ? 'EMAIL:' + currentEmail : '';

  if (
    state.myResponse &&
    state.myResponse.header &&
    state.myResponse.header.lineUserId !== currentIdentity
  ) {
    state.myResponse = null;
    state.identityKey = '';
    document.getElementById('editNotice').classList.add('hidden');
    document.getElementById('completedNotice').classList.add('hidden');
    document.getElementById('submitButton').classList.remove('hidden');
    document.getElementById('submitText').textContent = 'ส่งแบบสอบถาม';
    setSurveyControlsLockedV3142_(false);
  }

  updateProgress();
}

function isValidEmailV320_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
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
  const topicChartBox = document.getElementById('topicChart').parentElement;
  topicChartBox.style.height = Math.max(390, data.topicStats.length * 105) + 'px';
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



function setAdminUi(isAdmin, displayName = '') {
  state.isAdmin = !!isAdmin;
  state.adminDisplayName = displayName || '';

  document.getElementById('exportCsvButton')
    .classList.toggle('hidden', !state.isAdmin);

  document.getElementById('adminSettingsButton')
    .classList.toggle('hidden', !state.isAdmin);

  document.getElementById('adminBadge')
    .classList.toggle('hidden', !state.isAdmin);

  document.getElementById('adminLogoutButton')
    .classList.toggle('hidden', !state.isAdmin);

  document.getElementById('adminLoginOpenButton')
    .classList.toggle('hidden', state.isAdmin);

  document.getElementById('adminDisplayName').textContent =
    state.isAdmin
      ? state.adminDisplayName || 'ADMIN'
      : 'ADMIN';
}

async function restoreAdminSession() {
  if (!state.adminSessionToken) {
    setAdminUi(false);
    return;
  }

  try {
    const result = await apiPost({
      action: 'adminSession',
      sessionToken: state.adminSessionToken
    });

    setAdminUi(true, result.displayName);
  } catch (ignore) {
    localStorage.removeItem('itSurveyAdminSessionV312');
    state.adminSessionToken = '';
    setAdminUi(false);
  }
}

function openAdminLoginModal() {
  document.getElementById('adminLoginNotice').classList.add('hidden');
  document.getElementById('adminPassword').value = '';
  document.getElementById('adminLoginModal').classList.remove('hidden');

  setTimeout(() => {
    document.getElementById('adminUsername').focus();
  }, 50);
}

function closeAdminLoginModal() {
  document.getElementById('adminLoginModal').classList.add('hidden');
}

async function adminLogin() {
  const username = valueOf('adminUsername');
  const password = valueOf('adminPassword');

  if (!username || !password) {
    showNotice(
      'กรุณากรอก Username และ Password',
      'danger',
      'adminLoginNotice'
    );
    return;
  }

  setLoading(true, 'กำลังเข้าสู่ระบบ Admin...');

  try {
    const result = await apiPost({
      action: 'adminLogin',
      username,
      password
    });

    state.adminSessionToken = result.sessionToken;

    localStorage.setItem(
      'itSurveyAdminSessionV312',
      state.adminSessionToken
    );

    setAdminUi(true, result.displayName);
    closeAdminLoginModal();

    showNotice(
      'เข้าสู่ระบบ Admin เรียบร้อยแล้ว',
      'success',
      'dashboardNotice'
    );
  } catch (error) {
    showNotice(
      error.message || String(error),
      'danger',
      'adminLoginNotice'
    );
  } finally {
    setLoading(false);
  }
}

async function adminLogout() {
  try {
    if (state.adminSessionToken) {
      await apiPost({
        action: 'adminLogout',
        sessionToken: state.adminSessionToken
      });
    }
  } catch (ignore) {
  } finally {
    localStorage.removeItem('itSurveyAdminSessionV312');
    state.adminSessionToken = '';
    setAdminUi(false);

    showNotice(
      'ออกจากระบบ Admin เรียบร้อยแล้ว',
      'success'
    );
  }
}

async function exportCsv() {
  if (!state.isAdmin || !state.adminSessionToken) {
    openAdminLoginModal();
    return;
  }

  setLoading(true, 'กำลังสร้างไฟล์ CSV...');

  try {
    const result = await apiPost({
      action: 'exportCsv',
      sessionToken: state.adminSessionToken
    });

    const binary = atob(result.base64);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }

    const blob = new Blob(
      [bytes],
      { type: 'text/csv;charset=utf-8' }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = result.filename;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);

    showNotice(
      'Export CSV เรียบร้อยแล้ว',
      'success',
      'dashboardNotice'
    );
  } catch (error) {
    if (
      String(error.message || '')
        .includes('Session หมดอายุ')
    ) {
      localStorage.removeItem('itSurveyAdminSessionV312');
      state.adminSessionToken = '';
      setAdminUi(false);
      openAdminLoginModal();
    }

    showNotice(
      error.message || String(error),
      'danger',
      'dashboardNotice'
    );
  } finally {
    setLoading(false);
  }
}


function wrapChartLabel(text, maxLength = 24) {
  const value = String(text || '');
  const lines = [];
  for (let i=0; i<value.length; i += maxLength) lines.push(value.slice(i, i + maxLength));
  return lines;
}


function applyPublicSettingsV313_(settings) {
  const appTitle = String(
    settings.APP_TITLE ||
    'แบบสำรวจความต้องการพัฒนาทักษะด้านเทคโนโลยีดิจิทัล'
  ).trim();

  document.getElementById('appTitle').textContent = appTitle;
  document.title = appTitle;

  const dashboardOpen =
    String(settings.DASHBOARD_PUBLIC).toUpperCase() === 'TRUE';

  const dashboardTab = document.querySelector(
    '.tab-button[data-tab="dashboardPanel"]'
  );

  if (dashboardTab) {
    dashboardTab.classList.toggle('hidden', !dashboardOpen);
  }
}

async function openAdminSettingsV313_() {
  if (!state.isAdmin || !state.adminSessionToken) {
    openAdminLoginModal();
    return;
  }

  setLoading(true, 'กำลังโหลดการตั้งค่า...');

  try {
    const settings = await apiPost({
      action: 'adminGetSettings',
      sessionToken: state.adminSessionToken
    });

    setValue('settingAppTitle', settings.APP_TITLE);
    setValue('settingSurveyOpen', settings.SURVEY_OPEN || 'TRUE');
    setValue('settingAllowEdit', settings.ALLOW_EDIT || 'TRUE');
    setValue(
      'settingDashboardPublic',
      settings.DASHBOARD_PUBLIC || 'TRUE'
    );
    setValue('settingAdminExport', settings.ADMIN_EXPORT || 'TRUE');

    document.getElementById('adminSettingsNotice')
      .classList.add('hidden');

    document.getElementById('adminSettingsModal')
      .classList.remove('hidden');
  } catch (error) {
    handleAdminSessionErrorV313_(error);
    showNotice(
      error.message || String(error),
      'danger',
      'dashboardNotice'
    );
  } finally {
    setLoading(false);
  }
}

function closeAdminSettingsV313_() {
  document.getElementById('adminSettingsModal')
    .classList.add('hidden');
}

async function saveAdminSettingsV313_() {
  const appTitle = valueOf('settingAppTitle');

  if (!appTitle) {
    showNotice(
      'กรุณาระบุชื่อแบบสอบถาม',
      'danger',
      'adminSettingsNotice'
    );
    return;
  }

  const settings = {
    APP_TITLE: appTitle,
    SURVEY_OPEN: valueOf('settingSurveyOpen'),
    ALLOW_EDIT: valueOf('settingAllowEdit'),
    DASHBOARD_PUBLIC: valueOf('settingDashboardPublic'),
    ADMIN_EXPORT: valueOf('settingAdminExport')
  };

  setLoading(true, 'กำลังบันทึกการตั้งค่า...');

  try {
    const saved = await apiPost({
      action: 'adminSaveSettings',
      sessionToken: state.adminSessionToken,
      settings
    });

    state.bootstrap.settings = {
      ...state.bootstrap.settings,
      ...saved
    };

    applyPublicSettingsV313_(state.bootstrap.settings);
    applyEditPermissionV3142_();

    const isSurveyOpen =
      String(saved.SURVEY_OPEN).toUpperCase() === 'TRUE';

    document.getElementById('surveyClosed')
      .classList.toggle('hidden', isSurveyOpen);

    document.getElementById('surveyForm')
      .classList.toggle('hidden', !isSurveyOpen);

    const exportEnabled =
      String(saved.ADMIN_EXPORT).toUpperCase() === 'TRUE';

    document.getElementById('exportCsvButton')
      .classList.toggle(
        'hidden',
        !state.isAdmin || !exportEnabled
      );

    showNotice(
      'บันทึกการตั้งค่าเรียบร้อยแล้ว',
      'success',
      'adminSettingsNotice'
    );

    setTimeout(() => {
      closeAdminSettingsV313_();
      showNotice(
        'อัปเดตการตั้งค่าเรียบร้อยแล้ว',
        'success',
        'dashboardNotice'
      );
    }, 600);
  } catch (error) {
    handleAdminSessionErrorV313_(error);
    showNotice(
      error.message || String(error),
      'danger',
      'adminSettingsNotice'
    );
  } finally {
    setLoading(false);
  }
}

function handleAdminSessionErrorV313_(error) {
  const message = String(
    error && error.message
      ? error.message
      : error || ''
  );

  if (
    message.includes('Session หมดอายุ') ||
    message.includes('กรุณาเข้าสู่ระบบ Admin')
  ) {
    localStorage.removeItem('itSurveyAdminSessionV312');
    state.adminSessionToken = '';
    setAdminUi(false);
    closeAdminSettingsV313_();
    openAdminLoginModal();
  }
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

function clearAllNotices() {
  const noticeIds = [
    'mainNotice',
    'dashboardNotice',
    'adminLoginNotice',
    'adminSettingsNotice'
  ];

  noticeIds.forEach(targetId => {
    const target = document.getElementById(targetId);

    if (state.noticeTimers[targetId]) {
      clearTimeout(state.noticeTimers[targetId]);
      delete state.noticeTimers[targetId];
    }

    if (target) {
      target.classList.add('hidden');
      target.textContent = '';
    }
  });
}

function showNotice(
  message,
  type = 'info',
  targetId = 'mainNotice',
  durationMs = 5000
) {
  // แสดงเฉพาะข้อความล่าสุด ไม่ให้หลายกล่องซ้อนกัน
  clearAllNotices();

  const target = document.getElementById(targetId);
  if (!target) return;

  target.textContent = message;
  target.className = `notice notice-${type}`;
  target.classList.remove('hidden');

  // บังคับซ่อนหลังเวลาที่กำหนด แม้มี Action ก่อนหน้าค้างอยู่
  state.noticeTimers[targetId] = window.setTimeout(() => {
    target.classList.add('hidden');
    target.textContent = '';
    delete state.noticeTimers[targetId];
  }, Math.max(1000, Number(durationMs) || 5000));
}

function clearNotice(targetId = 'mainNotice') {
  const target = document.getElementById(targetId);
  if (!target) return;

  if (state.noticeTimers[targetId]) {
    clearTimeout(state.noticeTimers[targetId]);
    delete state.noticeTimers[targetId];
  }

  target.classList.add('hidden');
  target.textContent = '';
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

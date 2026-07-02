/**
 * UI rendering service.
 */

const UI = {
  state: {
    master: null,
    existing: null,
    dashboard: null
  },

  showApp() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  },

  setProfile(profile) {
    const name = profile?.displayName || 'ผู้ใช้งาน LINE';
    const userId = profile?.userId || '-';

    document.getElementById('displayName').textContent = name;
    document.getElementById('lineUserId').textContent = 'Line User ID: ' + userId;
    document.getElementById('avatarText').textContent = name.charAt(0).toUpperCase();

    if (profile?.pictureUrl) {
      const picture = document.getElementById('pictureUrl');
      picture.src = profile.pictureUrl;
      picture.classList.remove('hidden');
      document.getElementById('avatarText').classList.add('hidden');
    }
  },

  renderOptions(selectId, items) {
    const select = document.getElementById(selectId);

    items.forEach(item => {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;
      select.appendChild(option);
    });
  },

  renderTopics(config) {
    const container = document.getElementById('topicContainer');
    container.innerHTML = '';

    const grouped = {};

    config.forEach(item => {
      if (!grouped[item.TopicID]) {
        grouped[item.TopicID] = {
          topic: item.Topic,
          items: []
        };
      }

      grouped[item.TopicID].items.push(item);
    });

    Object.keys(grouped).forEach(topicId => {
      const group = grouped[topicId];

      const box = document.createElement('div');
      box.className = 'topic-group';

      const title = document.createElement('div');
      title.className = 'topic-title';
      title.textContent = topicId + '. ' + group.topic;
      box.appendChild(title);

      group.items.forEach(sub => {
        const label = document.createElement('label');
        label.className = 'checkbox-item';

        label.innerHTML = `
          <input
            type="checkbox"
            class="subtopic"
            data-topic-id="${sub.TopicID}"
            data-sub-id="${sub.SubID}"
          >
          <span>${sub.SubTopic}</span>
        `;

        box.appendChild(label);
      });

      container.appendChild(box);
    });
  },

  fillExisting(existing) {
    if (!existing) {
      return;
    }

    this.state.existing = existing;

    document.getElementById('editBadge').classList.remove('hidden');

    document.getElementById('department').value = existing.Department || '';
    document.getElementById('departmentOther').value = existing['Department Other'] || '';
    document.getElementById('position').value = existing.Position || '';
    document.getElementById('positionOther').value = existing['Position Other'] || '';
    document.getElementById('remark').value = existing.Remark || '';

    this.toggleOther('department', 'departmentOther');
    this.toggleOther('position', 'positionOther');

    (existing.details || []).forEach(detail => {
      const checkbox = document.querySelector(
        `.subtopic[data-topic-id="${detail.topicId}"][data-sub-id="${detail.subTopicId}"]`
      );

      if (checkbox) {
        checkbox.checked = true;
      }
    });

    document.getElementById('submitBtn').textContent = 'บันทึกการแก้ไขคำตอบ';
    this.updateProgress();
  },

  updateProgress() {
    const department = document.getElementById('department').value;
    const position = document.getElementById('position').value;
    const checkedCount = document.querySelectorAll('.subtopic:checked').length;

    let score = 0;

    if (department) score += 30;
    if (position) score += 30;
    if (checkedCount > 0) score += 40;

    document.getElementById('progressBar').style.width = score + '%';
    document.getElementById('progressText').textContent = score + '%';
  },

  showResult(type, message) {
    const box = document.getElementById('resultBox');

    box.className = 'result ' + type;
    box.textContent = message;
    box.classList.remove('hidden');
    box.scrollIntoView({
      behavior: 'smooth'
    });
  },

  toggleOther(selectId, inputId) {
    const select = document.getElementById(selectId);
    const input = document.getElementById(inputId);

    if (select.value === 'อื่นๆ') {
      input.classList.remove('hidden');
      input.required = true;
      return;
    }

    input.classList.add('hidden');
    input.required = false;
    input.value = '';
  },

  renderSettings(setting) {
    const container = document.getElementById('settingBox');

    const editableKeys = [
      'SURVEY_OPEN',
      'START_DATE',
      'END_DATE',
      'THANKYOU_MESSAGE',
      'PRIMARY_COLOR',
      'SECONDARY_COLOR',
      'MAX_TOPIC_SELECT'
    ];

    container.innerHTML = '';

    editableKeys.forEach(key => {
      const row = document.createElement('div');
      row.className = 'setting-row';

      row.innerHTML = `
        <label>${key}</label>
        <input data-setting="${key}" value="${setting[key] ?? ''}">
      `;

      container.appendChild(row);
    });
  },

  collectSettings() {
    const result = {};

    document.querySelectorAll('[data-setting]').forEach(input => {
      result[input.dataset.setting] = input.value;
    });

    return result;
  },

  renderDashboard(data) {
    document.getElementById('totalResponses').textContent = data.total || 0;

    this.renderChart('deptChart', data.byDepartment || []);
    this.renderChart('positionChart', data.byPosition || []);
    this.renderChart('subTopicChart', data.bySubTopic || []);
    this.renderLatest(data.latest || []);
  },

  renderChart(elementId, rows) {
    const container = document.getElementById(elementId);
    container.innerHTML = '';

    const max = Math.max(...rows.map(row => row.value), 1);

    rows.forEach(row => {
      const div = document.createElement('div');
      div.className = 'chart-row';

      div.innerHTML = `
        <div class="chart-label">
          <span>${row.label}</span>
          <span>${row.value}</span>
        </div>
        <div class="chart-bar">
          <div class="chart-fill" style="width:${(row.value / max) * 100}%"></div>
        </div>
      `;

      container.appendChild(div);
    });
  },

  renderLatest(rows) {
    const tbody = document.getElementById('latestTable');
    tbody.innerHTML = '';

    rows.forEach(row => {
      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td>${row['Display Name'] || '-'}</td>
        <td>${row.Department || '-'}</td>
        <td>${row.Position || '-'}</td>
        <td>${row.UpdatedAt || row.Timestamp || '-'}</td>
        <td>${row['Edit Count'] || 0}</td>
      `;

      tbody.appendChild(tr);
    });
  }
};

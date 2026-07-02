/**
 * Main frontend controller.
 */

const App = {
  profile: null,
  master: null,

  async init() {
    this.bindTabs();
    this.bindEvents();

    this.profile = await LiffService.init();

    if (!this.profile) {
      return;
    }

    UI.setProfile(this.profile);

    try {
      await this.loadMaster();
      UI.showApp();

      // Load existing answer after showing page to reduce perceived loading time.
      this.loadExistingAnswer();

    } catch (err) {
      UI.showApp();
      UI.showResult('error', 'โหลดข้อมูลระบบไม่สำเร็จ: ' + err.message);
    }
  },

  async loadMaster() {
    const response = await API.getMaster();

    if (!response.success) {
      throw new Error(response.message || 'โหลดข้อมูลไม่สำเร็จ');
    }

    this.master = response;
    UI.state.master = response;

    UI.renderOptions('department', response.departments || []);
    UI.renderOptions('position', response.positions || []);
    UI.renderTopics(response.config || []);
    UI.renderSettings(response.setting || {});
  },

  async loadExistingAnswer() {
    try {
      const response = await API.checkExisting(this.profile.userId);

      if (response.success && response.existing) {
        UI.fillExisting(response.existing);
      }
    } catch (err) {
      console.warn('Check existing failed:', err);
    }
  },

  bindTabs() {
    document.querySelectorAll('.tab').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));

        button.classList.add('active');
        document.getElementById(button.dataset.page).classList.add('active');
      });
    });
  },

  bindEvents() {
    document.addEventListener('change', event => {
      if (event.target.id === 'department') {
        UI.toggleOther('department', 'departmentOther');
      }

      if (event.target.id === 'position') {
        UI.toggleOther('position', 'positionOther');
      }

      UI.updateProgress();
    });

    document.getElementById('surveyForm').addEventListener('submit', event => {
      this.submitSurvey(event);
    });

    document.getElementById('adminLoginBtn').addEventListener('click', () => {
      this.adminLogin();
    });

    document.getElementById('saveSettingBtn').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('exportCsvBtn').addEventListener('click', () => {
      this.exportCsv();
    });
  },

  collectPayload() {
    const selectedSubTopics = Array
      .from(document.querySelectorAll('.subtopic:checked'))
      .map(checkbox => ({
        topicId: checkbox.dataset.topicId,
        subTopicId: checkbox.dataset.subId
      }));

    return {
      lineUserId: this.profile.userId,
      displayName: this.profile.displayName,
      pictureUrl: this.profile.pictureUrl || '',
      ip: '',
      device: navigator.userAgent,

      department: document.getElementById('department').value,
      departmentOther: document.getElementById('departmentOther').value,

      position: document.getElementById('position').value,
      positionOther: document.getElementById('positionOther').value,

      remark: document.getElementById('remark').value,

      selectedSubTopics
    };
  },

  async submitSurvey(event) {
    event.preventDefault();

    const payload = this.collectPayload();

    if (!payload.department || !payload.position || payload.selectedSubTopics.length === 0) {
      UI.showResult(
        'error',
        'กรุณากรอกข้อมูลทั่วไป และเลือกหัวข้ออบรมอย่างน้อย 1 รายการ'
      );
      return;
    }

    const button = document.getElementById('submitBtn');
    button.disabled = true;
    button.textContent = 'กำลังบันทึก...';

    try {
      await API.saveResponse(payload);

      UI.showResult(
        'success',
        'บันทึกข้อมูลแล้ว หากเป็นคำตอบเดิม ระบบจะเก็บประวัติการแก้ไขใน Response_History'
      );

      button.disabled = false;
      button.textContent = 'บันทึกการแก้ไขคำตอบ';

      this.loadExistingAnswer();

    } catch (err) {
      UI.showResult('error', 'บันทึกไม่สำเร็จ: ' + err.message);
      button.disabled = false;
      button.textContent = 'ส่งแบบสำรวจ';
    }
  },

  async adminLogin() {
    const pin = document.getElementById('adminPin').value;

    if (pin !== CONFIG.ADMIN_PIN) {
      alert('รหัสผู้ดูแลไม่ถูกต้อง');
      return;
    }

    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('dashboardContent').classList.remove('hidden');

    const response = await API.getDashboard();

    if (response.success) {
      UI.state.dashboard = response.dashboard;
      UI.renderDashboard(response.dashboard);
    }
  },

  async saveSettings() {
    await API.saveSettings(UI.collectSettings());
    alert('ส่งคำสั่งบันทึก Setting แล้ว กรุณาตรวจในชีต Setting');
  },

  exportCsv() {
    const rows = UI.state.dashboard?.latest || [];
    const headers = ['Display Name', 'Department', 'Position', 'UpdatedAt', 'Edit Count'];
    const lines = [headers.join(',')];

    rows.forEach(row => {
      const values = headers.map(header => {
        return `"${String(row[header] || '').replace(/"/g, '""')}"`;
      });

      lines.push(values.join(','));
    });

    const blob = new Blob(['\ufeff' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'it-survey-latest.csv';
    link.click();

    URL.revokeObjectURL(url);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

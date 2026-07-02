const App = {
  profile: null,
  master: null,

  async init() {
    this.bindTabs();
    this.bindEvents();

    this.profile = await LiffService.init();
    UI.setProfile(this.profile);

    try {
      const masterRes = await API.getMaster();
      if (!masterRes.success) throw new Error(masterRes.message || "โหลด Master ไม่สำเร็จ");

      this.master = masterRes;
      UI.renderOptions("department", masterRes.departments || []);
      UI.renderOptions("position", masterRes.positions || []);
      UI.renderTopics(masterRes.config || []);

      const checkRes = await API.checkExisting(this.profile.userId);
      if (checkRes.success && checkRes.existing) {
        UI.fillExisting(checkRes.existing);
      }

    } catch (err) {
      UI.showResult("error", "โหลดข้อมูลระบบไม่สำเร็จ: " + err.message);
    }

    UI.showApp();
  },

  bindTabs() {
    document.querySelectorAll(".tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.page).classList.add("active");
      });
    });
  },

  bindEvents() {
    document.addEventListener("change", e => {
      if (e.target.id === "department") UI.toggleOther("department", "departmentOther");
      if (e.target.id === "position") UI.toggleOther("position", "positionOther");
      UI.updateProgress();
    });

    document.getElementById("surveyForm").addEventListener("submit", e => this.submit(e));

    document.getElementById("adminLoginBtn").addEventListener("click", () => this.adminLogin());
    document.getElementById("exportCsvBtn").addEventListener("click", () => this.exportCsv());
  },

  collectPayload() {
    const selectedSubTopics = Array.from(document.querySelectorAll(".subtopic:checked")).map(cb => ({
      topicId: cb.dataset.topicId,
      subTopicId: cb.dataset.subId
    }));

    return {
      lineUserId: this.profile.userId,
      displayName: this.profile.displayName,
      pictureUrl: this.profile.pictureUrl || "",
      ip: "",
      device: navigator.userAgent,
      department: document.getElementById("department").value,
      departmentOther: document.getElementById("departmentOther").value,
      position: document.getElementById("position").value,
      positionOther: document.getElementById("positionOther").value,
      remark: document.getElementById("remark").value,
      selectedSubTopics
    };
  },

  async submit(e) {
    e.preventDefault();

    const payload = this.collectPayload();

    if (!payload.department || !payload.position || payload.selectedSubTopics.length === 0) {
      UI.showResult("error", "กรุณากรอกข้อมูลทั่วไป และเลือกหัวข้ออบรมอย่างน้อย 1 รายการ");
      return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.textContent = "กำลังบันทึก...";

    try {
      await API.saveResponse(payload);
      UI.showResult("success", "บันทึกข้อมูลเรียบร้อยแล้ว หากเคยตอบแล้วระบบจะบันทึกเป็นการแก้ไข");
      btn.textContent = "บันทึกเรียบร้อยแล้ว";
    } catch (err) {
      UI.showResult("error", "บันทึกไม่สำเร็จ: " + err.message);
      btn.disabled = false;
      btn.textContent = "ส่งแบบสำรวจ";
    }
  },

  async adminLogin() {
    const pin = document.getElementById("adminPin").value;
    if (pin !== CONFIG.ADMIN_PIN) {
      alert("รหัสผู้ดูแลไม่ถูกต้อง");
      return;
    }

    document.getElementById("adminLogin").classList.add("hidden");
    document.getElementById("dashboardContent").classList.remove("hidden");

    const res = await API.getDashboard();
    if (res.success) {
      UI.state.dashboard = res.dashboard;
      UI.renderDashboard(res.dashboard);
    }
  },

  exportCsv() {
    const latest = UI.state.dashboard?.latest || [];
    const headers = ["Display Name", "Department", "Position", "UpdatedAt", "Edit Count"];
    const lines = [headers.join(",")];

    latest.forEach(r => {
      lines.push(headers.map(h => `"${String(r[h] || "").replace(/"/g, '""')}"`).join(","));
    });

    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "it-survey-latest.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());

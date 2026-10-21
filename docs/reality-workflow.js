(() => {
  const API = window.location.hostname.endsWith("chatgpt.site")
    ? "/api/ai/workflows"
    : "https://hewai-youtube-workbench.hewai-social.workers.dev/api/ai/workflows";
  const $ = (selector) => document.querySelector(selector);
  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const nodes = {
    location: $("#realityLocation"), period: $("#realityPeriod"), people: $("#realityPeople"),
    architecture: $("#realityArchitecture"), evidence: $("#realityEvidence"), forbidden: $("#realityForbidden"),
    status: $("#realityStatus"), board: $("#realityBoard"), video: $("#realityVideo"),
    gateTitle: $("#realityGateTitle"), gateText: $("#realityGateText"),
  };
  if (!nodes.board) return;

  let workflow = null;
  let demoMode = false;
  const demoShots = [
    { id: "shot-1", title: "工作现场建立镜头", visual: "在客户确认的具体城市，用远景交代真实街区、建筑材料和供电环境；人物服饰和交通工具按参考照片还原。", narration: "可靠的能源，从理解每一个真实现场开始。", evidence: "待补：客户现场照片、拍摄年份与城市位置。", negativePrompt: "泛非洲刻板印象、东亚农村红砖墙、凭空出现的农作物", review: "pending" },
    { id: "shot-2", title: "旧设备与维修细节", visual: "特写一台有合理磨损、灰尘和维修痕迹的在用发电设备，由当地技术人员按真实流程检查。", narration: "设备不是刚从展厅搬来，它每天都在真实负载和环境里工作。", evidence: "待补：设备型号、使用年限、当地维修流程。", negativePrompt: "崭新发电机、错误接线、危险操作、虚构品牌文字", review: "pending" },
    { id: "shot-3", title: "品牌价值收束", visual: "从工作中的人与设备切到稳定供电带来的真实结果，保持纪录片观察视角，不摆拍苦难。", narration: "技术的价值，不是制造想象，而是让真实的工作持续发生。", evidence: "待补：客户可公开的使用结果与授权范围。", negativePrompt: "摆拍贫困、夸张救助叙事、未经证实的效果宣称", review: "pending" },
  ];

  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message; toast.hidden = false;
    clearTimeout(window.realityToastTimer);
    window.realityToastTimer = setTimeout(() => { toast.hidden = true; }, 2600);
  }

  function brief() {
    return {
      location: nodes.location.value.trim(), period: nodes.period.value.trim(), people: nodes.people.value.trim(),
      architecture: nodes.architecture.value.trim(), evidence: nodes.evidence.value.split("\n").map((value) => value.trim()).filter(Boolean),
      forbidden: nodes.forbidden.value.trim(), brand: "Holdwell", concept: "Working Song",
    };
  }

  async function request(path = "", options = {}) {
    const response = await fetch(`${API}${path}`, { headers: { "Content-Type": "application/json" }, ...options });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) throw new Error(data.error || data.raw || `HTTP ${response.status}`);
    return data;
  }

  const stepFor = (state) => ({ fact_review: 1, storyboard_ready: 2, keyframes_review: 3, video_ready: 4, video_generating: 4, video_review: 5, complete: 5 })[state] || 1;
  function placeholder(shot) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540"><defs><linearGradient id="g"><stop stop-color="#26332d"/><stop offset="1" stop-color="#b98b54"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="48%" text-anchor="middle" fill="white" font-size="26" font-family="sans-serif">关键帧占位演示</text><text x="50%" y="56%" text-anchor="middle" fill="#ddd" font-size="16" font-family="sans-serif">${escapeHtml(shot.title)}</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function render() {
    if (!workflow) return;
    const step = stepFor(workflow.state);
    document.querySelectorAll("#realitySteps button").forEach((button, index) => {
      button.classList.toggle("is-current", index + 1 === step);
      button.classList.toggle("is-done", index + 1 < step);
    });
    nodes.status.textContent = ({ fact_review: "事实约束", storyboard_ready: "分镜待确认", keyframes_review: "关键帧待审核", video_ready: "可生成视频", video_generating: "视频生成中", video_review: "成片待复核", complete: "已完成" })[workflow.state] || workflow.state;
    nodes.board.innerHTML = workflow.shots.length ? workflow.shots.map((shot, index) => `<article class="reality-shot"><div class="reality-shot-index">0${index + 1}</div><div class="reality-shot-copy"><h4>${escapeHtml(shot.title)}</h4><p>${escapeHtml(shot.visual)}</p><p><b>旁白：</b>${escapeHtml(shot.narration)}</p><small>依据：${escapeHtml(shot.evidence)}</small></div><div class="reality-shot-review"><div class="keyframe">${shot.keyframeUrl ? `<img src="${escapeHtml(shot.keyframeUrl)}" alt="${escapeHtml(shot.title)}关键帧">` : "等待生成关键帧"}</div><div class="reality-shot-actions"><button data-keyframe="${shot.id}">${shot.keyframeUrl ? "重新生成" : "生成关键帧"}</button><button class="approve" data-review="approved" data-shot="${shot.id}" ${shot.keyframeUrl ? "" : "disabled"}>✓ 通过</button><button class="reject" data-review="rejected" data-shot="${shot.id}" ${shot.keyframeUrl ? "" : "disabled"}>× 退回</button></div></div></article>`).join("") : '<div class="reality-empty"><b>任务已建立</b><span>下一步生成脚本分镜；不确定的事实会保留为待核验项。</span></div>';
    const ready = workflow.state === "video_ready";
    nodes.video.disabled = !ready;
    nodes.gateTitle.textContent = ready ? "视频生成已解锁" : "视频生成已锁定";
    nodes.gateText.textContent = ready ? "所有关键帧均已通过，可由后端提交图生视频任务。" : "还有关键帧未生成或未通过人工审核。";
    nodes.board.querySelectorAll("[data-keyframe]").forEach((button) => { button.onclick = () => generateKeyframe(button.dataset.keyframe); });
    nodes.board.querySelectorAll("[data-review]").forEach((button) => { button.onclick = () => reviewShot(button.dataset.shot, button.dataset.review); });
  }

  function loadDemo() {
    demoMode = true;
    workflow = { id: "demo-africa-working-song", title: "Working Song · 真实性演示", state: "storyboard_ready", brief: brief(), shots: demoShots.map((shot) => ({ ...shot })), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    render(); notify("已加载真实性工作流演示");
  }

  async function createWorkflow() {
    if (!nodes.location.value.trim() || nodes.location.value.includes("请填写")) throw new Error("先填写具体国家与城市，不能只写“非洲”");
    const data = await request("", { method: "POST", body: JSON.stringify({ title: "Working Song · 非洲真实场景", brief: brief() }) });
    demoMode = false; workflow = data.workflow; render(); notify("真实性任务已创建");
  }

  async function storyboard() {
    if (!workflow) await createWorkflow();
    if (demoMode) { workflow.shots = demoShots.map((shot) => ({ ...shot })); workflow.state = "storyboard_ready"; render(); return; }
    const data = await request(`/${workflow.id}/storyboard`, { method: "POST", body: "{}" });
    workflow = data.workflow; render(); notify("脚本分镜已生成，等待确认");
  }

  async function generateKeyframe(shotId) {
    const shot = workflow.shots.find((item) => item.id === shotId);
    if (demoMode) { shot.keyframeUrl = placeholder(shot); shot.review = "pending"; workflow.state = "keyframes_review"; render(); return; }
    const data = await request(`/${workflow.id}/keyframe`, { method: "POST", body: JSON.stringify({ shotId }) });
    workflow = data.workflow; render(); notify("关键帧已生成，等待人工审核");
  }

  async function reviewShot(shotId, decision) {
    if (demoMode) {
      const shot = workflow.shots.find((item) => item.id === shotId); shot.review = decision;
      workflow.state = workflow.shots.every((item) => item.review === "approved" && item.keyframeUrl) ? "video_ready" : "keyframes_review";
      render(); return;
    }
    const data = await request(`/${workflow.id}/review`, { method: "POST", body: JSON.stringify({ shotId, decision, note: decision === "rejected" ? "场景真实性未通过，请按证据修订。" : "" }) });
    workflow = data.workflow; render();
  }

  async function generateVideo() {
    if (!workflow || workflow.state !== "video_ready") throw new Error("关键帧尚未全部通过");
    if (demoMode) { notify("演示模式不会消耗视频额度；配置 Worker 后可真实提交"); return; }
    const data = await request(`/${workflow.id}/video`, { method: "POST", body: "{}" });
    workflow = data.workflow; render(); notify("视频任务已由后端提交");
  }

  async function run(action) { try { await action(); } catch (error) { notify(error.message || "操作失败"); } }
  $("#realityCreate").onclick = () => run(createWorkflow);
  $("#realityStoryboard").onclick = () => run(storyboard);
  $("#realityDemo").onclick = loadDemo;
  nodes.video.onclick = () => run(generateVideo);
})();

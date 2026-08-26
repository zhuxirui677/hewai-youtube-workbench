"use client";

import { useMemo, useState } from "react";

type Tab = "总览" | "爆款工厂" | "内容" | "发布" | "数据";
type Status = "待审核" | "制作中" | "已排期" | "草稿";

const videos = [
  { title: "Contactor Selection Guide: 3 Specs That Matter", type: "产品科普", owner: "Lynn", status: "待审核" as Status, date: "8月27日 10:00", duration: "04:26" },
  { title: "Inside a DC Contactor: How Arc Control Works", type: "技术拆解", owner: "Eric", status: "制作中" as Status, date: "8月29日 10:00", duration: "06:10" },
  { title: "HIITIO at RE+ 2026 — What We’re Bringing", type: "品牌动态", owner: "Mia", status: "已排期" as Status, date: "9月1日 10:00", duration: "02:48" },
  { title: "EV Charging Safety: Common Installation Mistakes", type: "应用场景", owner: "Lynn", status: "草稿" as Status, date: "待排期", duration: "05:35" },
];

const weeklyBars = [38, 46, 42, 61, 58, 76, 69, 86];

const tabs: Tab[] = ["总览", "爆款工厂", "内容", "发布", "数据"];

function StatusPill({ status }: { status: Status }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

function MiniIcon({ children }: { children: React.ReactNode }) {
  return <span className="mini-icon" aria-hidden="true">{children}</span>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("总览");
  const [connected, setConnected] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("全部");
  const [approved, setApproved] = useState<string[]>([]);
  const [pipelineStep, setPipelineStep] = useState(1);
  const [category, setCategory] = useState("高压直流接触器");
  const filteredVideos = useMemo(() => filter === "全部" ? videos : videos.filter((video) => video.status === filter), [filter]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const approve = (title: string) => {
    setApproved((current) => [...current, title]);
    notify("已通过审核，并移入发布准备队列");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div><strong>和为社媒</strong><span>YouTube 工作台</span></div>
        </div>

        <nav className="side-nav" aria-label="主导航">
          {tabs.map((item, index) => (
            <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
              <MiniIcon>{["⌂", "✦", "▤", "▷", "⌁"][index]}</MiniIcon>{item}
              {item === "发布" && <span className="nav-count">2</span>}
            </button>
          ))}
        </nav>

        <div className="workspace-note">
          <span className="note-label">试运行版本</span>
          <p>当前仅覆盖 YouTube，真实账号与数据接口尚未接入。</p>
        </div>
        <div className="profile"><div className="avatar">ZR</div><div><strong>和为运营组</strong><span>管理员</span></div><button aria-label="更多账户选项">•••</button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">和为 YouTube</div>
          <div className={`connection ${connected ? "is-connected" : ""}`}>
            <span className="connection-dot" />
            {connected ? "演示账号已连接" : "YouTube 账号待接入"}
          </div>
          <div className="top-actions">
            <button className="icon-button" aria-label="通知">◌<span className="notification-dot" /></button>
            <button className="primary-button" onClick={() => setComposerOpen(true)}><span>＋</span> 新建视频任务</button>
          </div>
        </header>

        <div className="content-wrap">
          <div className="page-heading">
            <div><p className="date-line">2026年8月25日 · 周二</p><h1>{tab === "总览" ? "早上好，今天先推进这 3 件事" : tab}</h1></div>
            <button className="ghost-button" onClick={() => notify("演示数据已刷新")}>↻ 刷新</button>
          </div>

          {tab === "总览" && (
            <>
              <section className="connect-banner">
                <div className="youtube-badge"><span>▶</span></div>
                <div className="connect-copy"><strong>{connected ? "YouTube 演示连接已就绪" : "连接 YouTube 频道，开始同步真实数据"}</strong><p>{connected ? "当前为演示状态；正式 OAuth、频道权限和 Analytics API 仍待确认。" : "接入后可同步视频、评论、观看与订阅数据，并管理发布队列。"}</p></div>
                <button onClick={() => setConnected(!connected)}>{connected ? "断开演示" : "连接频道"}</button>
              </section>

              <section className="priority-grid">
                <article className="priority-card red"><div className="priority-top"><MiniIcon>✓</MiniIcon><span>内容审核</span><b>01</b></div><h2>1 条视频待审核</h2><p>产品选型指南已完成剪辑与字幕</p><button onClick={() => { setTab("内容"); setFilter("待审核"); }}>立即审核 <span>→</span></button></article>
                <article className="priority-card amber"><div className="priority-top"><MiniIcon>◷</MiniIcon><span>本周排期</span><b>02</b></div><h2>2 个档期未填充</h2><p>周四、周日仍缺少发布内容</p><button onClick={() => setTab("发布")}>安排内容 <span>→</span></button></article>
                <article className="priority-card ink"><div className="priority-top"><MiniIcon>!</MiniIcon><span>账号接入</span><b>03</b></div><h2>数据权限待确认</h2><p>需开通 YouTube Analytics 读取权限</p><button onClick={() => notify("接入清单已标记：OAuth、频道 ID、Analytics 权限")}>查看清单 <span>→</span></button></article>
              </section>

              <section className="metric-row">
                <div><span>本月已发布</span><strong>6</strong><small>演示数据</small></div>
                <div><span>总观看时长</span><strong>428.6<em>h</em></strong><small className="up">↑ 18.4%</small></div>
                <div><span>平均观看率</span><strong>42.8<em>%</em></strong><small className="up">↑ 4.1%</small></div>
                <div><span>新增订阅</span><strong>+186</strong><small className="up">↑ 12.7%</small></div>
              </section>

              <section className="dashboard-grid">
                <article className="panel schedule-panel">
                  <div className="panel-head"><div><h3>近期内容</h3><p>从策划到发布，一眼看清进度</p></div><button onClick={() => setTab("内容")}>查看全部</button></div>
                  <div className="video-list">
                    {videos.slice(0, 3).map((video, index) => (
                      <div className="video-row" key={video.title}>
                        <div className={`thumb thumb-${index + 1}`}><span>{video.duration}</span></div>
                        <div className="video-copy"><strong>{video.title}</strong><span>{video.type} · {video.owner}</span></div>
                        <div className="video-state"><StatusPill status={approved.includes(video.title) ? "已排期" : video.status} /><span>{video.date}</span></div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel trend-panel">
                  <div className="panel-head"><div><h3>观看趋势</h3><p>最近 8 周 · 演示数据</p></div><button onClick={() => setTab("数据")}>详情</button></div>
                  <div className="chart-area"><div className="chart-y"><span>8k</span><span>4k</span><span>0</span></div><div className="bars">{weeklyBars.map((height, i) => <div key={i} className="bar-wrap"><div className="bar" style={{ height: `${height}%` }} /><span>W{i + 1}</span></div>)}</div></div>
                  <div className="chart-summary"><div><span>本周期观看</span><strong>32,840</strong></div><div><span>较前周期</span><strong className="up">+16.2%</strong></div></div>
                </article>
              </section>
            </>
          )}

          {tab === "内容" && (
            <section className="panel content-panel">
              <div className="panel-head content-tools"><div><h3>内容任务</h3><p>管理脚本、剪辑、审核与成片状态</p></div><div className="filters">{["全部", "待审核", "制作中", "已排期", "草稿"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
              <div className="content-table">
                <div className="table-head"><span>视频</span><span>负责人</span><span>状态</span><span>计划时间</span><span>操作</span></div>
                {filteredVideos.map((video, index) => <div className="table-row" key={video.title}><div className="table-video"><div className={`thumb thumb-${index + 1}`}><span>{video.duration}</span></div><div><strong>{video.title}</strong><span>{video.type}</span></div></div><span>{video.owner}</span><StatusPill status={approved.includes(video.title) ? "已排期" : video.status} /><span>{video.date}</span><div className="row-actions">{video.status === "待审核" && !approved.includes(video.title) ? <button onClick={() => approve(video.title)}>通过</button> : <button onClick={() => notify("任务详情将在正式版接入")}>查看</button>}</div></div>)}
              </div>
            </section>
          )}

          {tab === "爆款工厂" && (
            <section className="factory-shell">
              <div className="factory-intro">
                <div><span className="factory-kicker">CONTENT INTELLIGENCE</span><h2>从产品类目到视频成片</h2><p>采集公开热门内容，按话题聚类并学习结构，生成原创脚本与视频任务。</p></div>
                <div className="factory-gate"><b>安全规则</b><span>只提炼结构和选题，不复制竞品素材、文案、Logo 或水印。</span></div>
              </div>
              <div className="pipeline-steps">
                {["输入类目","采集热门视频","话题与脚本学习","输出视频"].map((label,i)=><button key={label} className={pipelineStep===i+1?"current":pipelineStep>i+1?"done":""} onClick={()=>setPipelineStep(i+1)}><i>{pipelineStep>i+1?"✓":i+1}</i><span>{label}</span></button>)}
              </div>
              {pipelineStep===1 && <article className="factory-stage input-stage"><div><span className="stage-no">01 / DEFINE</span><h3>先告诉我，要研究哪个产品类目？</h3><p>系统将围绕产品、应用场景和采购问题扩展关键词。</p></div><div className="category-box"><label>产品类目<input value={category} onChange={e=>setCategory(e.target.value)} placeholder="例如：高压直流接触器" /></label><div className="quick-tags">{["储能熔断器","EV 充电接触器","HVAC 接触器","光伏直流开关"].map(t=><button key={t} onClick={()=>setCategory(t)}>{t}</button>)}</div><label>目标市场<select><option>北美 · 英语</option><option>欧洲 · 英语</option><option>全球 · 英语</option></select></label><button className="factory-primary" disabled={!category.trim()} onClick={()=>setPipelineStep(2)}>开始采集热门视频 →</button><small>YouTube Data API / 搜索源：待接入；当前展示流程演示数据。</small></div></article>}
              {pipelineStep===2 && <article className="factory-stage"><div className="stage-head"><div><span className="stage-no">02 / DISCOVER</span><h3>“{category}” 热门视频池</h3><p>依据观看量、互动率与增长速度筛选，不以主观判断代替指标。</p></div><button className="factory-primary" onClick={()=>setPipelineStep(3)}>完成分类 →</button></div><div className="source-grid">{[
                ["How DC Contactors Handle 1000V","Engineering Explained","482K","高增长"],
                ["3 Contactor Mistakes That Kill EV Chargers","EV Tech Lab","219K","高互动"],
                ["Inside a Hermetically Sealed Contactor","Power Systems Pro","164K","持续热门"],
                ["DC Contactor Selection in 5 Minutes","Electro Academy","97K","监测中"]
              ].map((v,i)=><div className="source-card" key={v[0]}><div className={`source-thumb thumb-${i+1}`}><span>0{4+i}:2{i}</span><b>演示样本</b></div><div><strong>{v[0]}</strong><span>{v[1]}</span><div><em>{v[2]} views</em><mark>{v[3]}</mark></div></div></div>)}</div><div className="source-note"><b>数据完整性</b><span>正式采集需记录视频 URL、频道、发布时间、采集时间和公开指标；登录后或私有数据不采集。</span></div></article>}
              {pipelineStep===3 && <article className="factory-stage"><div className="stage-head"><div><span className="stage-no">03 / LEARN</span><h3>3 个高潜话题簇</h3><p>学习的是开场、信息顺序和节奏；生成内容必须保持原创。</p></div><button className="factory-primary" onClick={()=>setPipelineStep(4)}>生成视频方案 →</button></div><div className="topic-grid">{[
                ["选型避坑","采购决策","数字警告开场","问题 → 后果 → 3项检查 → CTA","8 条参考"],
                ["内部结构拆解","工程教育","剖面悬念开场","疑问 → 拆解 → 原理 → 应用","6 条参考"],
                ["应用失效案例","维修诊断","故障现场开场","症状 → 原因 → 修复 → 预防","5 条参考"]
              ].map((t,i)=><div className="topic-card" key={t[0]}><div className="topic-index">0{i+1}</div><span>{t[1]}</span><h4>{t[0]}</h4><dl><div><dt>高频开场</dt><dd>{t[2]}</dd></div><div><dt>脚本结构</dt><dd>{t[3]}</dd></div></dl><small>{t[4]} · 置信度 {91-i*4}%</small><button onClick={()=>notify(`已选中“${t[0]}”作为生成方向`)}>选择话题</button></div>)}</div></article>}
              {pipelineStep===4 && <article className="factory-stage output-stage"><div className="output-main"><span className="stage-no">04 / PRODUCE</span><div className="output-status"><i>脚本草案</i><b>等待人工确认</b></div><h3>3 Specs That Decide Whether a DC Contactor Survives</h3><p className="script-lead">“A contactor rated for the voltage can still fail in weeks. Before you specify one, check these three numbers.”</p><div className="script-beats"><div><b>00:00—00:05</b><span>故障接触器特写，提出反直觉问题</span></div><div><b>00:05—00:25</b><span>解释额定电压与实际开断能力的区别</span></div><div><b>00:25—00:48</b><span>逐项讲解负载类型、短路能力、线圈控制</span></div><div><b>00:48—00:60</b><span>给出选型检查清单与保守 CTA</span></div></div></div><aside className="output-panel"><h4>视频输出设置</h4><label>画幅<select><option>YouTube 16:9 · 1920×1080</option><option>Shorts 9:16 · 1080×1920</option></select></label><label>语言<select><option>English · North America</option><option>中文</option></select></label><label>配音<span>MiniMax T2A v2 · 最终版</span></label><label>预计时长<span>60 秒</span></label><button className="factory-primary" onClick={()=>notify("已创建视频生成任务，等待人工确认")}>确认脚本并创建视频任务</button><button className="factory-secondary" onClick={()=>setPipelineStep(3)}>返回修改话题</button><small>生成前需预算审批；成片需通过清晰度、安全与人工终审，不能自动进入发布队列。</small></aside></article>}
            </section>
          )}

          {tab === "发布" && (
            <section className="publish-layout">
              <article className="panel calendar-panel"><div className="panel-head"><div><h3>9月发布排期</h3><p>海外账号默认 UTC+8 10:00</p></div><button onClick={() => notify("已导出当前排期草案")}>导出排期</button></div><div className="week-head">{["周一","周二","周三","周四","周五","周六","周日"].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-grid">{Array.from({length:14},(_,i)=><div key={i} className={i===3||i===6?"empty-slot":""}><span>{i+1}</span>{i===0&&<b>RE+ 展会预告</b>}{i===2&&<b>接触器拆解</b>}{i===3&&<button onClick={()=>setComposerOpen(true)}>＋ 待安排</button>}{i===6&&<button onClick={()=>setComposerOpen(true)}>＋ 待安排</button>}{i===8&&<b>安装误区</b>}</div>)}</div></article>
              <aside className="panel preflight"><h3>发布前检查</h3><p>正式发布必须全部通过</p>{["标题与描述已审核","缩略图尺寸符合要求","版权与产品声明已确认","人工最终确认","YouTube 回执已记录"].map((item,i)=><label key={item}><input type="checkbox" defaultChecked={i<2}/><span>{item}</span></label>)}<button onClick={()=>notify("尚有 3 项未完成，暂不能发布")}>运行预检</button><small>API 权限与幂等发布机制：待接入</small></aside>
            </section>
          )}

          {tab === "数据" && (
            <section className="analytics-layout">
              <div className="metric-row data-metrics"><div><span>频道观看</span><strong>32.8k</strong><small className="up">↑ 16.2%</small></div><div><span>展示点击率</span><strong>5.7<em>%</em></strong><small className="up">↑ 0.8%</small></div><div><span>平均观看时长</span><strong>3:42</strong><small>演示数据</small></div><div><span>订阅转化率</span><strong>1.9<em>%</em></strong><small className="up">↑ 0.3%</small></div></div>
              <article className="panel insight-panel"><div className="panel-head"><div><h3>内容表现排行</h3><p>最近 28 天 · 数据接入后自动更新</p></div><button onClick={()=>notify("已切换到最近 28 天")}>最近 28 天⌄</button></div>{videos.slice(0,3).map((v,i)=><div className="rank-row" key={v.title}><b>0{i+1}</b><div className={`thumb thumb-${i+1}`} /><div><strong>{v.title}</strong><span>{["12,486 次观看 · 48.2% 观看率","8,974 次观看 · 44.7% 观看率","6,325 次观看 · 39.1% 观看率"][i]}</span></div><em className="up">+{[24,18,11][i]}%</em></div>)}</article>
            </section>
          )}
        </div>
      </section>

      {composerOpen && <div className="modal-backdrop" onMouseDown={() => setComposerOpen(false)}><section className="composer" role="dialog" aria-modal="true" aria-label="新建视频任务" onMouseDown={(e)=>e.stopPropagation()}><div className="composer-head"><div><span>新建</span><h2>视频任务</h2></div><button onClick={()=>setComposerOpen(false)} aria-label="关闭">×</button></div><label>视频主题<input placeholder="例如：高压直流接触器如何选型" autoFocus /></label><div className="form-grid"><label>内容类型<select defaultValue="产品科普"><option>产品科普</option><option>技术拆解</option><option>应用场景</option><option>品牌动态</option></select></label><label>负责人<select defaultValue="Lynn"><option>Lynn</option><option>Eric</option><option>Mia</option></select></label></div><label>核心目标<textarea placeholder="这条视频希望观众看完后知道什么？" rows={4}/></label><div className="composer-actions"><button onClick={()=>setComposerOpen(false)}>取消</button><button onClick={()=>{setComposerOpen(false);notify("视频任务已保存为草稿")}}>保存草稿</button></div></section></div>}
      {toast && <div className="toast">{toast}</div>}
    </main>
  );
}

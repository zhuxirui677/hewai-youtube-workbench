"use client";

import { useMemo, useState } from "react";

type Tab = "总览" | "内容" | "发布" | "数据";
type Status = "待审核" | "制作中" | "已排期" | "草稿";

const videos = [
  { title: "Contactor Selection Guide: 3 Specs That Matter", type: "产品科普", owner: "Lynn", status: "待审核" as Status, date: "8月27日 10:00", duration: "04:26" },
  { title: "Inside a DC Contactor: How Arc Control Works", type: "技术拆解", owner: "Eric", status: "制作中" as Status, date: "8月29日 10:00", duration: "06:10" },
  { title: "HIITIO at RE+ 2026 — What We’re Bringing", type: "品牌动态", owner: "Mia", status: "已排期" as Status, date: "9月1日 10:00", duration: "02:48" },
  { title: "EV Charging Safety: Common Installation Mistakes", type: "应用场景", owner: "Lynn", status: "草稿" as Status, date: "待排期", duration: "05:35" },
];

const weeklyBars = [38, 46, 42, 61, 58, 76, 69, 86];

const tabs: Tab[] = ["总览", "内容", "发布", "数据"];

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
              <MiniIcon>{["⌂", "▤", "▷", "⌁"][index]}</MiniIcon>{item}
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

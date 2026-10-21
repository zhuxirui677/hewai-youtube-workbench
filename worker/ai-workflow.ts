export type WorkflowState =
  | "fact_review"
  | "storyboard_ready"
  | "keyframes_review"
  | "video_ready"
  | "video_generating"
  | "video_review"
  | "complete";

export type ShotReview = "pending" | "approved" | "rejected";

export interface WorkflowShot {
  id: string;
  title: string;
  visual: string;
  narration: string;
  evidence: string;
  negativePrompt: string;
  keyframeUrl?: string;
  keyframeTaskId?: string;
  review: ShotReview;
  reviewNote?: string;
}

export interface VideoWorkflow {
  id: string;
  title: string;
  state: WorkflowState;
  brief: Record<string, unknown>;
  shots: WorkflowShot[];
  videoTaskId?: string;
  videoTaskIds?: string[];
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export function nextStateForShots(shots: WorkflowShot[]): WorkflowState {
  if (!shots.length) return "storyboard_ready";
  return shots.every((shot) => shot.review === "approved" && shot.keyframeUrl) ? "video_ready" : "keyframes_review";
}

export function assertVideoReady(workflow: VideoWorkflow) {
  if (workflow.state !== "video_ready") throw new Error("所有分镜关键帧必须逐条通过人工审核后，才能生成视频。");
  if (!workflow.shots.length || workflow.shots.some((shot) => shot.review !== "approved" || !shot.keyframeUrl)) {
    throw new Error("关键帧审核记录不完整，视频生成已被后端阻止。");
  }
}

export function reviewShot(workflow: VideoWorkflow, shotId: string, decision: "approved" | "rejected", note = "") {
  const shot = workflow.shots.find((item) => item.id === shotId);
  if (!shot) throw new Error("分镜不存在。");
  if (!shot.keyframeUrl) throw new Error("该分镜还没有关键帧，不能审核。");
  shot.review = decision;
  shot.reviewNote = note.trim();
  workflow.state = nextStateForShots(workflow.shots);
  workflow.updatedAt = new Date().toISOString();
  return workflow;
}

export function buildRealityPrompt(brief: Record<string, unknown>) {
  return `你是品牌纪录片的事实核验编导。根据以下约束生成严格 JSON，不得把“非洲”当成单一场景，不确定的信息必须写入 evidence_needed：${JSON.stringify(brief)}。输出 {title,shots:[{title,visual,narration,evidence,negativePrompt}]}，3-6 个分镜。每个分镜必须说明国家/地区、年代、建筑材料、人物工作方式、设备新旧程度，并避免把未经证实的小麦种植、崭新发电机、东亚农村红砖墙或不符合当地使用习惯的缝纫机场景当作默认事实。`;
}

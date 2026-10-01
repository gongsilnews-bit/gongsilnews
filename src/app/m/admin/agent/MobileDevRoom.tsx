"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TASK_STATUSES, TASK_TYPES, type DevTask, type DevTaskStatus, type DevTaskType } from "@/devroom/types";
import { approveDevTask, createDevTask, deleteDevTask, listDevTasks, sendDevTaskMessage } from "@/devroom/actions";

/*
 * 모바일 AI 개발실 — PC 의 DevRoomBoard 와 화면은 따로, 데이터(서버 함수)는 같이 쓴다.
 * 그래서 PC 에서 등록한 작업이 여기 보이고, 여기서 보낸 메시지·승인도 PC Runner 가 똑같이 처리한다.
 */

const MAX_SHOTS = 5;

/** 서버 전송 한도(10MB) 안에 5장이 들어가도록 한 장당 1MB 안팎으로 줄인다. 압축 라이브러리는 사진을 올릴 때만 불러온다. */
async function shrink(f: File): Promise<File> {
  const { default: imageCompression } = await import("browser-image-compression");
  const small = await imageCompression(f, { maxSizeMB: 1, maxWidthOrHeight: 2000, useWebWorker: true });
  return new File([small], f.name || "image.png", { type: small.type });
}

const statusOf = (key: DevTaskStatus) => TASK_STATUSES.find((s) => s.key === key)!;
const typeOf = (key: DevTaskType) => TASK_TYPES.find((t) => t.key === key)!;

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", fontSize: 14, border: "1px solid #d1d5db", borderRadius: 8,
  outline: "none", fontFamily: "inherit", boxSizing: "border-box", background: "#fff", color: "#111827",
};
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 6, display: "block" };

export default function MobileDevRoom() {
  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<DevTaskStatus | "all">("all");
  const [openId, setOpenId] = useState<number | null>(null);

  // 작업 등록
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<DevTaskType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [shots, setShots] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 대화·승인 (펼친 작업 하나에만 쓴다)
  const [chatText, setChatText] = useState("");
  const [chatImages, setChatImages] = useState<File[]>([]);
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    const res = await listDevTasks();
    if (res.success) {
      setTasks(res.data);
      setLoadError("");
    } else {
      setLoadError(res.error || "목록을 불러오지 못했습니다.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 에이전트가 상태를 바꾸므로 주기적으로 새로 불러온다 (작업중·승인됨이면 5초, 아니면 30초).
  // 휴대폰 화면이 꺼져 있거나 다른 앱으로 가 있으면 부르지 않고, 돌아오면 바로 한 번 부른다.
  const busy = tasks.some((t) => t.status === "running" || t.status === "approved");
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden) load(); }, busy ? 5000 : 30000);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [load, busy]);

  const toggleOpen = (id: number) => {
    setOpenId((prev) => (prev === id ? null : id));
    setChatText("");
    setChatImages([]);
    setConfirmApprove(false);
    setActionError("");
  };

  const resetForm = () => {
    setType("bug");
    setTitle("");
    setDescription("");
    setPageUrl("");
    setShots([]);
    setFormError("");
  };

  const submit = async () => {
    if (!title.trim()) return setFormError("제목을 입력해 주세요.");
    if (!description.trim()) return setFormError("내용을 입력해 주세요.");
    setSaving(true);
    setFormError("");
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("title", title);
      fd.append("description", description);
      fd.append("page_url", pageUrl);
      fd.append("repro_steps", "");
      for (const f of shots) fd.append("screenshots", await shrink(f));
      const res = await createDevTask(fd);
      if (!res.success) {
        setFormError(res.error || "등록하지 못했습니다.");
        return;
      }
      resetForm();
      setFormOpen(false);
      await load();
    } catch (e) {
      setFormError("등록 중 오류: " + (e instanceof Error ? e.message : ""));
    } finally {
      setSaving(false);
    }
  };

  const act = async (run: () => Promise<{ success: boolean; error?: string }>) => {
    setActing(true);
    setActionError("");
    try {
      const res = await run();
      if (!res.success) {
        setActionError(res.error || "처리하지 못했습니다.");
        return;
      }
      setChatText("");
      setChatImages([]);
      setConfirmApprove(false);
      await load();
    } catch (e) {
      setActionError("처리 중 오류: " + (e instanceof Error ? e.message : ""));
    } finally {
      setActing(false);
    }
  };

  const sendChat = (taskId: number) => act(async () => {
    const fd = new FormData();
    fd.append("task_id", String(taskId));
    fd.append("body", chatText);
    for (const f of chatImages) fd.append("images", await shrink(f));
    return sendDevTaskMessage(fd);
  });

  const remove = async (task: DevTask) => {
    if (!confirm(`${task.task_no} 작업을 삭제할까요?`)) return;
    const res = await deleteDevTask(task.id);
    if (!res.success) {
      alert(res.error || "삭제하지 못했습니다.");
      return;
    }
    setOpenId(null);
    await load();
  };

  const counts = TASK_STATUSES.map((s) => ({ ...s, count: tasks.filter((t) => t.status === s.key).length }));
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <>
      {/* 등록 버튼 + 상태 필터 */}
      <div style={{ background: "#fff", padding: "12px 16px", borderBottom: "1px solid #e5e7eb" }}>
        <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "#6b7280", lineHeight: 1.6 }}>
          수정 요청을 등록하면 대표님 PC의 에이전트가 고쳐서 미리보기를 올립니다. 확인 후 [승인]하면 실서버에 반영돼요.
          <br />※ PC의 Runner가 켜져 있어야 작업이 진행됩니다.
        </p>
        <button
          onClick={() => { setFormOpen((v) => !v); setFormError(""); }}
          style={{
            width: "100%", padding: "12px 0", fontSize: 14.5, fontWeight: 800, color: "#fff",
            background: formOpen ? "#6b7280" : "#111827", border: "none", borderRadius: 8, cursor: "pointer",
          }}
        >
          {formOpen ? "닫기" : "＋ 작업 등록"}
        </button>

        {formOpen && (
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <span style={labelStyle}>종류</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {TASK_TYPES.map((t) => (
                  <button key={t.key} onClick={() => setType(t.key)} style={{
                    padding: "9px 0", fontSize: 13, fontWeight: 700, borderRadius: 8, cursor: "pointer",
                    border: type === t.key ? "1px solid #111827" : "1px solid #e5e7eb",
                    background: type === t.key ? "#111827" : "#fff",
                    color: type === t.key ? "#fff" : "#374151",
                  }}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <label>
              <span style={labelStyle}>제목 *</span>
              <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 모바일에서 AI 기사작성 버튼이 눌리지 않음" />
            </label>
            <label>
              <span style={labelStyle}>내용 *</span>
              <textarea
                style={{ ...inputStyle, minHeight: 110, resize: "vertical", lineHeight: 1.6 }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="무엇이 문제인지, 어떻게 바뀌었으면 하는지 적어 주세요."
              />
            </label>
            <label>
              <span style={labelStyle}>발생 주소 (선택)</span>
              <input style={inputStyle} value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="예: /m/study" />
            </label>
            <div>
              <span style={labelStyle}>스크린샷 (최대 {MAX_SHOTS}장)</span>
              <ImagePicker files={shots} onChange={setShots} size={72} />
            </div>
            {formError && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{formError}</div>}
            <button
              onClick={submit}
              disabled={saving}
              style={{
                width: "100%", padding: "12px 0", fontSize: 14.5, fontWeight: 800, color: "#fff",
                background: saving ? "#93c5fd" : "#2563eb", border: "none", borderRadius: 8, cursor: saving ? "wait" : "pointer",
              }}
            >
              {saving ? "등록 중..." : "등록"}
            </button>
          </div>
        )}

        <div style={{ display: "flex", gap: 6, marginTop: 12, overflowX: "auto", paddingBottom: 2 }}>
          <FilterChip active={filter === "all"} color="#111827" onClick={() => setFilter("all")}>전체 {tasks.length}</FilterChip>
          {counts.map((s) => (
            <FilterChip key={s.key} active={filter === s.key} color={s.color} onClick={() => setFilter(s.key)}>
              {s.label} {s.count}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* 작업 목록 */}
      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>불러오는 중...</div>
        ) : loadError ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#dc2626", fontSize: 14 }}>{loadError}</div>
        ) : visible.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
            {filter === "all" ? "아직 등록된 작업이 없습니다." : "해당 상태의 작업이 없습니다."}
          </div>
        ) : (
          visible.map((t) => {
            const st = statusOf(t.status);
            const tp = typeOf(t.type);
            const isOpen = openId === t.id;
            const canChat = t.status !== "approved";
            const canSend = !acting && (chatText.trim() || chatImages.length > 0);
            return (
              <div key={t.id} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${isOpen ? "#111827" : "#e5e7eb"}`, overflow: "hidden" }}>
                <button
                  onClick={() => toggleOpen(t.id)}
                  style={{ width: "100%", textAlign: "left", background: "none", border: "none", padding: "14px 16px", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 5, background: st.color, color: "#fff" }}>{st.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#6b7280" }}>{tp.icon} {tp.label}</span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>{formatDate(t.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.45 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                    {t.task_no}{t.attempt > 1 && ` · ${t.attempt}차 작업`}{(t.messages || []).length > 0 && ` · 대화 ${(t.messages || []).length}`}
                  </div>
                </button>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #f1f5f9", padding: "14px 16px", background: "#fafbfc", display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5, color: "#374151", lineHeight: 1.7 }}>
                    <div style={{ whiteSpace: "pre-wrap" }}>{t.description}</div>
                    {t.page_url && <div style={{ fontSize: 12.5, color: "#6b7280" }}>발생 주소: {t.page_url}</div>}
                    {t.attachment_urls && t.attachment_urls.length > 0 && <Thumbs urls={t.attachment_urls} />}

                    {/* 작업중: 실시간 진행 상황 */}
                    {t.status === "running" && (
                      <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontWeight: 800, color: "#1d4ed8", marginBottom: 4 }}>⏳ 실시간 진행 상황</div>
                        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0, fontFamily: "inherit", lineHeight: 1.7, color: "#4b5563" }}>
                          {t.log ? t.log.split("\n").slice(-8).join("\n") : "에이전트가 작업을 준비하고 있습니다..."}
                        </pre>
                      </div>
                    )}

                    {/* 처리 결과 */}
                    {t.status !== "running" && (t.result_summary || t.preview_url || t.pr_url) && (
                      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontWeight: 800, color: "#111827" }}>🤖 처리 결과</div>
                        {t.result_summary && <div style={{ whiteSpace: "pre-wrap" }}>{t.result_summary}</div>}
                        {t.preview_url && (
                          <a href={t.preview_url} target="_blank" rel="noreferrer" style={{
                            display: "block", textAlign: "center", padding: "11px 0", borderRadius: 8, background: "#eff6ff",
                            color: "#2563eb", fontWeight: 800, textDecoration: "none", border: "1px solid #bfdbfe",
                          }}>
                            🔗 미리보기 열기
                          </a>
                        )}
                        {t.pr_url && <a href={t.pr_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: "#6b7280" }}>GitHub PR 보기</a>}
                      </div>
                    )}

                    {/* 대화 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ fontWeight: 800, color: "#111827" }}>💬 대화</div>
                      {(t.messages || []).length === 0 && (
                        <div style={{ fontSize: 12.5, color: "#9ca3af" }}>아직 대화가 없습니다. 에이전트가 작업을 시작하면 여기에 소식을 남깁니다.</div>
                      )}
                      {(t.messages || []).map((m) => {
                        const mine = m.role === "admin";
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                            <div style={{
                              maxWidth: "85%", padding: "8px 12px", borderRadius: 12, whiteSpace: "pre-wrap", lineHeight: 1.6, wordBreak: "break-word",
                              background: mine ? "#111827" : "#fff", color: mine ? "#fff" : "#374151",
                              border: mine ? "none" : "1px solid #e5e7eb",
                            }}>
                              {!mine && <div style={{ fontSize: 11, fontWeight: 800, color: "#6b7280", marginBottom: 2 }}>🤖 에이전트</div>}
                              {m.body}
                              {m.attachment_urls && m.attachment_urls.length > 0 && <div style={{ marginTop: 6 }}><Thumbs urls={m.attachment_urls} size={72} /></div>}
                              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right" }}>{formatDate(m.created_at)}</div>
                            </div>
                          </div>
                        );
                      })}

                      {canChat && (
                        <>
                          <textarea
                            value={chatText}
                            onChange={(e) => setChatText(e.target.value)}
                            rows={3}
                            placeholder={
                              t.status === "review" ? "수정할 점이나 답변을 적으면 에이전트가 반영해 다시 작업합니다."
                                : t.status === "failed" ? "에이전트 질문에 답하거나 보충 설명을 적으면 다시 작업합니다."
                                : t.status === "merged" ? "추가로 고칠 점을 적으면 다시 작업합니다."
                                : "메모를 남기면 에이전트가 다음 작업 때 읽습니다."
                            }
                            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, marginTop: 4 }}
                          />
                          <ImagePicker files={chatImages} onChange={setChatImages} size={56} />
                          <button
                            disabled={!canSend}
                            onClick={() => sendChat(t.id)}
                            style={{
                              width: "100%", padding: "12px 0", fontSize: 14.5, fontWeight: 800, color: "#fff",
                              background: canSend ? "#111827" : "#cbd5e1", border: "none", borderRadius: 8,
                              cursor: canSend ? "pointer" : "not-allowed",
                            }}
                          >
                            {acting && !confirmApprove ? "보내는 중..." : "보내기"}
                          </button>
                        </>
                      )}

                      {t.status === "review" && (
                        confirmApprove ? (
                          <div style={{ background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 8, padding: "10px 12px" }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "#0f766e", marginBottom: 8 }}>승인하면 main 에 병합되어 실서버에 배포됩니다. 진행할까요?</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => { setConfirmApprove(false); setActionError(""); }} style={{ flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 700, borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", cursor: "pointer" }}>취소</button>
                              <button disabled={acting} onClick={() => act(() => approveDevTask(t.id))} style={{ flex: 1, padding: "10px 0", fontSize: 14, fontWeight: 800, borderRadius: 8, border: "none", background: "#0d9488", color: "#fff", cursor: "pointer" }}>
                                {acting ? "처리 중..." : "네, 승인"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setConfirmApprove(true); setActionError(""); }} style={{ width: "100%", padding: "12px 0", fontSize: 14.5, fontWeight: 800, color: "#fff", background: "#0d9488", border: "none", borderRadius: 8, cursor: "pointer" }}>
                            ✅ 승인 (실서버 반영)
                          </button>
                        )
                      )}
                      {actionError && <div style={{ color: "#dc2626", fontSize: 12.5, fontWeight: 600 }}>{actionError}</div>}
                    </div>

                    {t.status === "waiting" && (
                      <button onClick={() => remove(t)} style={{ alignSelf: "flex-end", padding: "6px 14px", borderRadius: 8, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        삭제
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function FilterChip({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, borderRadius: 16, cursor: "pointer",
      border: `1px solid ${active ? color : "#e5e7eb"}`,
      background: active ? color : "#fff",
      color: active ? "#fff" : "#6b7280",
    }}>
      {children}
    </button>
  );
}

function Thumbs({ urls, size = 84 }: { urls: string[]; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
        </a>
      ))}
    </div>
  );
}

/** 사진 고르기 (휴대폰 앨범·카메라). 고른 사진은 미리보기로 보여 주고 ✕ 로 뺄 수 있다. */
function ImagePicker({ files, onChange, size }: { files: File[]; onChange: (files: File[]) => void; size: number }) {
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      {previews.map((u, i) => (
        <div key={u} style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt="" style={{ width: size, height: size, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
          <button
            onClick={() => onChange(files.filter((_, j) => j !== i))}
            style={{ position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%", border: "none", background: "#111827", color: "#fff", fontSize: 11, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      ))}
      {files.length < MAX_SHOTS && (
        <label style={{
          width: size, height: size, borderRadius: 8, border: "1px dashed #cbd5e1", background: "#fff", display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#9ca3af", fontSize: 11, gap: 2,
        }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>📷</span>
          사진
          <input
            type="file" accept="image/*" multiple hidden
            onChange={(e) => {
              const picked = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
              onChange([...files, ...picked].slice(0, MAX_SHOTS));
              e.target.value = "";
            }}
          />
        </label>
      )}
    </div>
  );
}

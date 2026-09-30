"use client";

import React, { useCallback, useEffect, useState } from "react";
import imageCompression from "browser-image-compression";
import type { AdminTheme } from "@/components/admin/sections/types";
import { TASK_STATUSES, TASK_TYPES, type DevTask, type DevTaskStatus, type DevTaskType } from "./types";
import { approveDevTask, createDevTask, deleteDevTask, listDevTasks, sendDevTaskMessage } from "./actions";

interface Props {
  theme: AdminTheme;
}

const FLOW = ["작업 등록", "PC 에이전트가 가져감", "코드 수정·빌드", "브랜치 push·미리보기", "대표 승인", "실서버 반영"];
const MAX_SHOTS = 5;

const statusOf = (key: DevTaskStatus) => TASK_STATUSES.find((s) => s.key === key)!;
const typeOf = (key: DevTaskType) => TASK_TYPES.find((t) => t.key === key)!;

function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function DevRoomBoard({ theme }: Props) {
  const { cardBg, textPrimary, textSecondary, border, darkMode } = theme;
  const softBg = darkMode ? "#2c2d33" : "#f1f5f9";
  const inputBg = darkMode ? "#1a1b1e" : "#fff";

  const [tasks, setTasks] = useState<DevTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<DevTaskStatus | "all">("all");
  const [openId, setOpenId] = useState<number | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<DevTaskType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [reproSteps, setReproSteps] = useState("");
  const [shots, setShots] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // 승인·반려
  const [confirmApproveId, setConfirmApproveId] = useState<number | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [chatText, setChatText] = useState("");
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

  // 에이전트가 상태를 바꾸므로 주기적으로 새로 불러온다. 작업중·승인됨일 때는 진행 상황을 보려고 5초마다.
  const busy = tasks.some((t) => t.status === "running" || t.status === "approved");
  useEffect(() => {
    const timer = setInterval(load, busy ? 5000 : 30000);
    return () => clearInterval(timer);
  }, [load, busy]);

  const resetForm = () => {
    setType("bug");
    setTitle("");
    setDescription("");
    setPageUrl("");
    setReproSteps("");
    setShots([]);
    setFormError("");
  };

  const addShots = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setShots((prev) => [...prev, ...images].slice(0, MAX_SHOTS));
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
      fd.append("repro_steps", reproSteps);
      // 서버 전송 한도(10MB) 안에 5장이 들어가도록 한 장당 1MB 안팎으로 줄인다
      for (const f of shots) {
        const small = await imageCompression(f, { maxSizeMB: 1, maxWidthOrHeight: 2000, useWebWorker: true });
        fd.append("screenshots", new File([small], f.name, { type: small.type }));
      }
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

  const remove = async (task: DevTask) => {
    const res = await deleteDevTask(task.id);
    if (!res.success) {
      alert(res.error || "삭제하지 못했습니다.");
      return;
    }
    setOpenId(null);
    await load();
  };

  const act = async (run: () => Promise<{ success: boolean; error?: string }>) => {
    setActing(true);
    setActionError("");
    const res = await run();
    setActing(false);
    if (!res.success) {
      setActionError(res.error || "처리하지 못했습니다.");
      return;
    }
    setConfirmApproveId(null);
    setChatId(null);
    setChatText("");
    await load();
  };

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    borderRadius: 14,
    padding: "24px 28px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: `1px solid ${border}`,
  };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: textPrimary, marginBottom: 6, display: "block" };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${border}`,
    background: inputBg, color: textPrimary, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };

  const counts = TASK_STATUSES.map((s) => ({ ...s, count: tasks.filter((t) => t.status === s.key).length }));
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── 안내 + 흐름 ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>🛠️ AI 개발실</h3>
          <button
            onClick={() => { setFormOpen((v) => !v); setFormError(""); }}
            style={{
              padding: "8px 20px", borderRadius: 8, background: formOpen ? "#64748b" : "#2563eb", color: "#fff",
              border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {formOpen ? "닫기" : "＋ 작업 등록"}
          </button>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: textSecondary, lineHeight: 1.6 }}>
          오류·수정 요청을 한국어로 등록하면 대표님 PC의 로컬 에이전트가 가져가 코드를 고치고, 검증 후 GitHub 브랜치에 올려 승인을 기다립니다.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {FLOW.map((step, i) => (
            <React.Fragment key={step}>
              <span style={{ padding: "6px 12px", borderRadius: 16, fontSize: 12, fontWeight: 600, background: softBg, color: textPrimary }}>
                {i + 1}. {step}
              </span>
              {i < FLOW.length - 1 && <span style={{ color: textSecondary, fontSize: 12 }}>→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* ── 등록 폼 ── */}
        {formOpen && (
          <div style={{ marginTop: 22, paddingTop: 22, borderTop: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <span style={labelStyle}>종류</span>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {TASK_TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setType(t.key)}
                    style={{
                      padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      border: `1px solid ${type === t.key ? "#2563eb" : border}`,
                      background: type === t.key ? "#2563eb" : inputBg,
                      color: type === t.key ? "#fff" : textPrimary,
                    }}
                  >
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <label>
                <span style={labelStyle}>발생 URL</span>
                <input style={inputStyle} value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} placeholder="예: /gongsil/view/65023" />
              </label>
              <label>
                <span style={labelStyle}>재현 방법</span>
                <input style={inputStyle} value={reproSteps} onChange={(e) => setReproSteps(e.target.value)} placeholder="예: 모바일 → 상세페이지 → AI 기사작성 클릭" />
              </label>
            </div>
            <div>
              <span style={labelStyle}>스크린샷 (최대 {MAX_SHOTS}장)</span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {shots.map((f, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${border}` }} />
                    <button
                      onClick={() => setShots((prev) => prev.filter((_, j) => j !== i))}
                      style={{
                        position: "absolute", top: -6, right: -6, width: 22, height: 22, borderRadius: "50%",
                        border: "none", background: "#111827", color: "#fff", fontSize: 12, cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {shots.length < MAX_SHOTS && (
                  <label style={{
                    width: 80, height: 80, borderRadius: 8, border: `1px dashed ${border}`, display: "flex",
                    alignItems: "center", justifyContent: "center", cursor: "pointer", color: textSecondary, fontSize: 24,
                  }}>
                    ＋
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => { addShots(e.target.files); e.target.value = ""; }} />
                  </label>
                )}
              </div>
            </div>
            {formError && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{formError}</div>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => { resetForm(); setFormOpen(false); }}
                style={{ padding: "10px 18px", borderRadius: 8, border: `1px solid ${border}`, background: inputBg, color: textPrimary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
              >
                취소
              </button>
              <button
                onClick={submit}
                disabled={saving}
                style={{
                  padding: "10px 22px", borderRadius: 8, border: "none", background: saving ? "#93c5fd" : "#2563eb",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: saving ? "wait" : "pointer", fontFamily: "inherit",
                }}
              >
                {saving ? "등록 중..." : "등록"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 작업 목록 ── */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: textPrimary }}>📋 작업 목록</h3>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setFilter("all")}
              style={{
                padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                border: `1px solid ${textSecondary}`,
                background: filter === "all" ? textSecondary : "transparent",
                color: filter === "all" ? "#fff" : textSecondary,
              }}
            >
              전체 {tasks.length}
            </button>
            {counts.map((s) => (
              <button
                key={s.key}
                title={s.description}
                onClick={() => setFilter(s.key)}
                style={{
                  padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  border: `1px solid ${s.color}`,
                  background: filter === s.key ? s.color : "transparent",
                  color: filter === s.key ? "#fff" : s.color,
                }}
              >
                {s.label} {s.count}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: textSecondary, fontSize: 14 }}>불러오는 중...</div>
        ) : loadError ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#dc2626", fontSize: 14 }}>{loadError}</div>
        ) : visible.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: textSecondary }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🛠️</div>
            <div style={{ fontSize: 14 }}>{filter === "all" ? "아직 등록된 작업이 없습니다." : "해당 상태의 작업이 없습니다."}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {visible.map((t) => {
              const st = statusOf(t.status);
              const tp = typeOf(t.type);
              const open = openId === t.id;
              return (
                <div key={t.id} style={{ border: `1px solid ${open ? "#2563eb" : border}`, borderRadius: 10, overflow: "hidden" }}>
                  <button
                    onClick={() => setOpenId(open ? null : t.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", flexWrap: "wrap",
                      background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: textSecondary, minWidth: 110 }}>{t.task_no}</span>
                    <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 10, background: softBg, color: textPrimary }}>{tp.icon} {tp.label}</span>
                    <span style={{ flex: 1, minWidth: 160, fontSize: 14, fontWeight: 600, color: textPrimary }}>{t.title}</span>
                    <span style={{ fontSize: 12, color: textSecondary }}>{formatDate(t.created_at)}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 10, color: "#fff", background: st.color }}>{st.label}</span>
                  </button>

                  {open && (
                    <div style={{ padding: "4px 16px 16px", borderTop: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: textPrimary, lineHeight: 1.7 }}>
                      <Field label="내용" color={textSecondary}><div style={{ whiteSpace: "pre-wrap" }}>{t.description}</div></Field>
                      {t.page_url && <Field label="발생 URL" color={textSecondary}>{t.page_url}</Field>}
                      {t.repro_steps && <Field label="재현 방법" color={textSecondary}>{t.repro_steps}</Field>}
                      {t.attachment_urls && t.attachment_urls.length > 0 && (
                        <Field label="스크린샷" color={textSecondary}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {t.attachment_urls.map((u) => (
                              <a key={u} href={u} target="_blank" rel="noreferrer">
                                <img src={u} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${border}` }} />
                              </a>
                            ))}
                          </div>
                        </Field>
                      )}

                      {/* ── 작업중: 실시간 진행 상황 ── */}
                      {t.status === "running" && (
                        <div style={{ background: softBg, borderRadius: 8, padding: "12px 14px" }}>
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>⏳ 실시간 진행 상황 {t.attempt > 1 && `(${t.attempt}차 작업)`}</div>
                          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0, fontFamily: "inherit", lineHeight: 1.7, color: textSecondary }}>
                            {t.log ? t.log.split("\n").slice(-12).join("\n") : "에이전트가 작업을 준비하고 있습니다..."}
                          </pre>
                        </div>
                      )}

                      {t.status !== "running" && (t.result_summary || t.branch || t.log) && (
                        <div style={{ background: softBg, borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontWeight: 800 }}>🤖 처리 결과 {t.attempt > 1 && `(${t.attempt}차 작업)`}</div>
                          {t.result_summary && <div style={{ whiteSpace: "pre-wrap" }}>{t.result_summary}</div>}
                          {t.changed_files?.length > 0 && <Field label="수정 파일" color={textSecondary}>{t.changed_files.join(", ")}</Field>}
                          {t.branch && <Field label="브랜치" color={textSecondary}>{t.branch}{t.commit_sha && ` · ${t.commit_sha.slice(0, 8)}`}</Field>}
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            {t.preview_url && <a href={t.preview_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 700 }}>🔗 미리보기</a>}
                            {t.pr_url && <a href={t.pr_url} target="_blank" rel="noreferrer" style={{ color: "#2563eb", fontWeight: 700 }}>🔗 GitHub PR</a>}
                          </div>
                          {t.log && (
                            <details>
                              <summary style={{ cursor: "pointer", color: textSecondary }}>실행 로그</summary>
                              <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, maxHeight: 300, overflow: "auto", margin: "8px 0 0" }}>{t.log}</pre>
                            </details>
                          )}
                        </div>
                      )}
                      {/* ── 대화 ── */}
                      <div style={{ borderTop: `1px solid ${border}`, paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ fontWeight: 800 }}>💬 대화</div>
                        {(t.messages || []).length === 0 && (
                          <div style={{ fontSize: 12, color: textSecondary }}>아직 대화가 없습니다. 에이전트가 작업을 시작하면 여기에 소식을 남깁니다.</div>
                        )}
                        {(t.messages || []).map((m) => {
                          const mine = m.role === "admin";
                          return (
                            <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                              <div style={{
                                maxWidth: "80%", padding: "8px 12px", borderRadius: 12, whiteSpace: "pre-wrap", lineHeight: 1.6,
                                background: mine ? "#2563eb" : (darkMode ? "#2c2d33" : "#f1f5f9"),
                                color: mine ? "#fff" : textPrimary,
                              }}>
                                {!mine && <div style={{ fontSize: 11, fontWeight: 800, color: textSecondary, marginBottom: 2 }}>🤖 에이전트</div>}
                                {m.body}
                                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: "right" }}>{formatDate(m.created_at)}</div>
                              </div>
                            </div>
                          );
                        })}

                        {t.status !== "approved" && (
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 4 }}>
                            <textarea
                              style={{ ...inputStyle, minHeight: 44, resize: "vertical", lineHeight: 1.5, flex: 1 }}
                              value={chatId === t.id ? chatText : ""}
                              onFocus={() => { if (chatId !== t.id) { setChatId(t.id); setChatText(""); setActionError(""); } }}
                              onChange={(e) => { setChatId(t.id); setChatText(e.target.value); }}
                              placeholder={
                                t.status === "review" ? "수정할 점이나 답변을 적으면 에이전트가 반영해 다시 작업합니다."
                                  : t.status === "failed" ? "에이전트 질문에 답하거나 보충 설명을 적으면 다시 작업합니다."
                                  : t.status === "merged" ? "추가로 고칠 점을 적으면 다시 작업합니다."
                                  : "메모를 남기면 에이전트가 다음 작업 때 읽습니다."
                              }
                            />
                            <button
                              disabled={acting || chatId !== t.id || !chatText.trim()}
                              onClick={() => act(() => sendDevTaskMessage(t.id, chatText))}
                              style={{ ...smallBtn("#2563eb", "#2563eb", "#fff"), opacity: chatId === t.id && chatText.trim() ? 1 : 0.5 }}
                            >
                              {acting && chatId === t.id ? "보내는 중..." : "보내기"}
                            </button>
                          </div>
                        )}

                        {t.status === "review" && (
                          confirmApproveId === t.id ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#0d9488" }}>승인하면 main 에 병합되어 실서버에 배포됩니다. 진행할까요?</span>
                              <button onClick={() => { setConfirmApproveId(null); setActionError(""); }} style={smallBtn(border, inputBg, textPrimary)}>취소</button>
                              <button disabled={acting} onClick={() => act(() => approveDevTask(t.id))} style={smallBtn("#0d9488", "#0d9488", "#fff")}>
                                {acting ? "처리 중..." : "네, 승인"}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button onClick={() => { setConfirmApproveId(t.id); setActionError(""); }} style={smallBtn("#0d9488", "#0d9488", "#fff")}>
                                ✅ 승인 (실서버 반영)
                              </button>
                            </div>
                          )
                        )}
                        {actionError && (chatId === t.id || confirmApproveId === t.id) && (
                          <div style={{ color: "#dc2626", fontSize: 12, fontWeight: 600, textAlign: "right" }}>{actionError}</div>
                        )}
                      </div>

                      {t.status === "waiting" && (
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => remove(t)}
                            style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function smallBtn(borderColor: string, background: string, color: string): React.CSSProperties {
  return {
    padding: "7px 16px", borderRadius: 8, border: `1px solid ${borderColor}`, background, color,
    fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  };
}

function Field({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 2 }}>{label}</div>
      {children}
    </div>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { BOARD_META, BoardType, RECEIPT_NAMES, STAFF_NAMES } from "./board-config";
import { Attachment, DrawResult, PostModules } from "./post-modules";
import { PlatformHeader } from "./PlatformHeader";
import { DocumentLightbox, DocumentLightboxValue } from "./DocumentLightbox";
import { DrawLightbox } from "./DrawLightbox";
import { PostModuleEditor } from "./PostModuleEditor";
import { PostQr } from "./PostQr";

type Comment = { id: number; postId: number; name: string; message: string; createdAt: string; deletedAt?: string | null };
type Receipt = { id: number; postId: number; name: string; createdAt: string };
type PollVote = { id: number; postId: number; name: string; choice: string; createdAt: string; updatedAt: string };
type BoardPost = {
  id: number; board: BoardType; title: string; body: string; fileUrl: string; imageKey: string; imageName: string;
  attachments: Attachment[]; modules: PostModules; drawResult: DrawResult | null; pinned: number; sortOrder: number; archivedAt: string | null;
  createdAt: string; updatedAt: string; deletedAt?: string | null; comments: Comment[]; receipts: Receipt[]; votes: PollVote[];
};
type RecycledPost = Omit<BoardPost, "comments" | "receipts" | "votes"> & { deletedAt: string };
type RecycledComment = Comment & { postTitle: string; deletedAt: string };
type PendingConfirmation = { title: string; message: string; confirmLabel: string; action: () => Promise<void> };
type LightboxImage = { src: string; alt: string; title: string; name: string };
type ArchiveAction = { post: BoardPost; operation: "archive" | "restore-archive" };

const DOCUMENT_CHUNK_BYTES = 512 * 1024;
const blankModules: PostModules = {};

async function requestJson(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(options?.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "操作暫時無法完成。請稍後再試。");
  return body;
}

async function uploadDocument(file: File) {
  const start = await requestJson("/api/upload-chunks", { method: "POST", body: JSON.stringify({ action: "start", kind: "document", name: file.name, type: file.type, size: file.size }) });
  const partCount = Math.ceil(file.size / DOCUMENT_CHUNK_BYTES);
  for (let index = 0; index < partCount; index += 1) {
    const response = await fetch(`/api/upload-chunks?key=${encodeURIComponent(start.key)}&uploadId=${encodeURIComponent(start.uploadId)}&part=${index + 1}`, {
      method: "PUT", headers: { "content-type": "application/octet-stream" },
      body: file.slice(index * DOCUMENT_CHUNK_BYTES, Math.min(file.size, (index + 1) * DOCUMENT_CHUNK_BYTES)),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `文件第 ${index + 1} 段上傳失敗。`);
  }
  return requestJson("/api/upload-chunks", { method: "POST", body: JSON.stringify({ action: "complete", key: start.key, uploadId: start.uploadId, name: start.name, type: start.type, size: start.size, partCount }) });
}

function formatDate(value: string) { return new Intl.DateTimeFormat("zh-TW", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
function imageUrl(key: string) { return `/api/images/${key.split("/").map(encodeURIComponent).join("/")}`; }
function clickableLocationUrl(value: string) {
  if (!value) return "";
  try { const parsed = new URL(value); return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : ""; } catch { return ""; }
}

export function ProtectedBoardClient({ board }: { board: BoardType }) {
  const meta = BOARD_META[board];
  const [editor, setEditor] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(true);
  const [archivedView, setArchivedView] = useState(false);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [notice, setNotice] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [modules, setModules] = useState<PostModules>(blankModules);
  const [saving, setSaving] = useState(false);
  const [commentNames, setCommentNames] = useState<Record<number, string>>({});
  const [commentMessages, setCommentMessages] = useState<Record<number, string>>({});
  const [receiptOpen, setReceiptOpen] = useState<number | null>(null);
  const [receiptNames, setReceiptNames] = useState<Record<number, string>>({});
  const [pollNames, setPollNames] = useState<Record<number, string>>({});
  const [pollChoices, setPollChoices] = useState<Record<number, string>>({});
  const [postMenu, setPostMenu] = useState<number | null>(null);
  const [recycleOpen, setRecycleOpen] = useState(false);
  const [recycledPosts, setRecycledPosts] = useState<RecycledPost[]>([]);
  const [recycledComments, setRecycledComments] = useState<RecycledComment[]>([]);
  const [recycleLoading, setRecycleLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [editingPost, setEditingPost] = useState<BoardPost | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editFileUrl, setEditFileUrl] = useState("");
  const [editModules, setEditModules] = useState<PostModules>({});
  const [editPinned, setEditPinned] = useState(false);
  const [editSortOrder, setEditSortOrder] = useState(0);
  const [modifyCode, setModifyCode] = useState("");
  const [editError, setEditError] = useState("");
  const [modifying, setModifying] = useState(false);
  const [archiveAction, setArchiveAction] = useState<ArchiveAction | null>(null);
  const [archiveCode, setArchiveCode] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [lightbox, setLightbox] = useState<LightboxImage | null>(null);
  const [documentLightbox, setDocumentLightbox] = useState<DocumentLightboxValue | null>(null);
  const [drawLightbox, setDrawLightbox] = useState<DrawResult | null>(null);
  const [redrawPost, setRedrawPost] = useState<BoardPost | null>(null);
  const [redrawCode, setRedrawCode] = useState("");
  const [redrawError, setRedrawError] = useState("");
  const lightboxTrigger = useRef<HTMLButtonElement | null>(null);
  const closeLightbox = useCallback(() => { setLightbox(null); window.requestAnimationFrame(() => lightboxTrigger.current?.focus()); }, []);
  const closeDocumentLightbox = useCallback(() => { setDocumentLightbox(null); window.requestAnimationFrame(() => lightboxTrigger.current?.focus()); }, []);

  const loadPosts = useCallback(async (view: boolean) => {
    setLoading(true);
    try { const data = await requestJson(`/api/boards/${board}${view ? "?archived=1" : ""}`, { cache: "no-store" }); setPosts(data.posts); }
    catch (error) { setNotice(error instanceof Error ? error.message : "無法讀取貼文。"); }
    finally { setLoading(false); }
  }, [board]);

  useEffect(() => {
    const start = async () => {
      try { const session = await requestJson("/api/edit-session"); if (session.editor) { setEditor(true); await loadPosts(false); } else setLoading(false); }
      catch { setLoading(false); } finally { setChecking(false); }
    };
    void start();
  }, [loadPosts]);

  const modalOpen = composerOpen || recycleOpen || Boolean(confirmation) || Boolean(editingPost) || Boolean(archiveAction) || Boolean(lightbox) || Boolean(documentLightbox) || Boolean(drawLightbox) || Boolean(redrawPost);
  useEffect(() => {
    if (!modalOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (drawLightbox) setDrawLightbox(null); else if (documentLightbox) closeDocumentLightbox(); else if (lightbox) closeLightbox();
      else if (!saving && !modifying && !confirming) { setComposerOpen(false); setEditingPost(null); setArchiveAction(null); setRedrawPost(null); setRecycleOpen(false); setConfirmation(null); }
    };
    window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close);
  }, [closeDocumentLightbox, closeLightbox, confirming, documentLightbox, drawLightbox, lightbox, modalOpen, modifying, saving]);

  function resetComposer() { setTitle(""); setBody(""); setFileUrl(""); setImage(null); setDocumentFiles([]); setModules({}); }

  async function createPost(event: FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      let imageKey = "", imageName = "";
      if (image) {
        const upload = new FormData(); upload.append("image", image);
        const response = await fetch("/api/uploads", { method: "POST", body: upload }); const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "圖片上傳失敗。"); imageKey = result.key; imageName = result.name;
      }
      const attachments: Attachment[] = [];
      for (const file of documentFiles.slice(0, 3)) { const result = await uploadDocument(file); attachments.push({ key: result.key, name: result.name, type: result.type }); }
      await requestJson(`/api/boards/${board}`, { method: "POST", body: JSON.stringify({ title, body, fileUrl: fileUrl.trim(), imageKey, imageName, attachments, modules }) });
      resetComposer(); setComposerOpen(false); setNotice("貼文已發布。"); await loadPosts(archivedView);
    } catch (error) { setNotice(error instanceof Error ? error.message : "無法發布貼文。"); }
    finally { setSaving(false); }
  }

  async function addComment(event: FormEvent, post: BoardPost) {
    event.preventDefault();
    try {
      await requestJson(`/api/boards/${board}/${post.id}/comments`, { method: "POST", body: JSON.stringify({ name: commentNames[post.id] || "", message: commentMessages[post.id] || "" }) });
      setCommentMessages((current) => ({ ...current, [post.id]: "" })); setNotice(post.modules.relay ? "接龍內容已加入。" : "留言已送出。"); await loadPosts(archivedView);
    } catch (error) { setNotice(error instanceof Error ? error.message : "無法送出留言。"); }
  }

  async function confirmReceipt(event: FormEvent, post: BoardPost) {
    event.preventDefault();
    try {
      const data = await requestJson(`/api/boards/${board}/${post.id}/receipts`, { method: "POST", body: JSON.stringify({ name: receiptNames[post.id] || "" }) });
      setReceiptOpen(null); setNotice(data.duplicate ? "這位同仁已完成傳閱確認。" : "已登記傳閱確認。"); await loadPosts(archivedView);
    } catch (error) { setNotice(error instanceof Error ? error.message : "無法確認傳閱。"); }
  }

  async function submitVote(event: FormEvent, post: BoardPost) {
    event.preventDefault();
    try {
      await requestJson(`/api/boards/${board}/${post.id}/votes`, { method: "POST", body: JSON.stringify({ name: pollNames[post.id] || "", choice: pollChoices[post.id] || "" }) });
      setNotice("投票已送出；同一人再次送出會更新原選擇。"); await loadPosts(archivedView);
    } catch (error) { setNotice(error instanceof Error ? error.message : "無法送出投票。"); }
  }

  async function startDraw(post: BoardPost) {
    try {
      const data = await requestJson(`/api/boards/${board}/${post.id}/draws`, { method: "POST", body: JSON.stringify({ action: "start" }) });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, drawResult: data.drawResult } : item)); setDrawLightbox(data.drawResult);
    } catch (error) { setNotice(error instanceof Error ? error.message : "無法開始抽選。"); }
  }

  async function performRedraw(event: FormEvent) {
    event.preventDefault(); if (!redrawPost) return; setRedrawError("");
    try {
      const data = await requestJson(`/api/boards/${board}/${redrawPost.id}/draws`, { method: "POST", body: JSON.stringify({ action: "redraw", editCode: redrawCode }) });
      setPosts((current) => current.map((item) => item.id === redrawPost.id ? { ...item, drawResult: data.drawResult } : item)); setRedrawPost(null); setRedrawCode(""); setDrawLightbox(data.drawResult);
    } catch (error) { setRedrawCode(""); setRedrawError(error instanceof Error ? error.message : "無法重新抽選。"); }
  }

  function openLightbox(event: MouseEvent<HTMLButtonElement>, post: BoardPost) { lightboxTrigger.current = event.currentTarget; setLightbox({ src: imageUrl(post.imageKey), alt: post.imageName || `${post.title} 圖片`, title: post.title, name: post.imageName }); }
  function openDocumentLightbox(event: MouseEvent<HTMLButtonElement>, post: BoardPost, attachment: Attachment) { lightboxTrigger.current = event.currentTarget; setDocumentLightbox({ title: post.title, documentKey: attachment.key, documentName: attachment.name, documentType: attachment.type, previewKey: attachment.previewKey || "", previewName: attachment.previewName || "" }); }

  function openPostEditor(post: BoardPost) {
    setPostMenu(null); setEditingPost(post); setEditTitle(post.title); setEditBody(post.body); setEditFileUrl(post.fileUrl); setEditModules(structuredClone(post.modules)); setEditPinned(Boolean(post.pinned)); setEditSortOrder(post.sortOrder); setModifyCode(""); setEditError("");
  }

  async function updatePost(event: FormEvent) {
    event.preventDefault(); if (!editingPost) return; setEditError("");
    if (!editTitle.trim()) { setEditError("請輸入貼文標題。"); return; }
    if (modifyCode.length !== 3) { setEditError("請輸入 3 位數修改碼。"); return; }
    setModifying(true);
    try {
      const data = await requestJson(`/api/boards/${board}/${editingPost.id}`, { method: "PATCH", body: JSON.stringify({ title: editTitle, body: editBody, fileUrl: editFileUrl.trim(), modules: editModules, pinned: editPinned, sortOrder: editSortOrder, modifyCode }) });
      setEditingPost(null); setModifyCode(""); setNotice(`貼文已由${data.modifiedBy}完成修改。`); await loadPosts(archivedView);
    } catch (error) { setModifyCode(""); setEditError(error instanceof Error ? error.message : "無法修改貼文。"); }
    finally { setModifying(false); }
  }

  function requestArchive(post: BoardPost, operation: ArchiveAction["operation"]) { setPostMenu(null); setArchiveAction({ post, operation }); setArchiveCode(""); setArchiveError(""); }
  async function submitArchive(event: FormEvent) {
    event.preventDefault(); if (!archiveAction) return; setArchiveError("");
    try {
      const data = await requestJson(`/api/boards/${board}/${archiveAction.post.id}`, { method: "PATCH", body: JSON.stringify({ operation: archiveAction.operation, modifyCode: archiveCode }) });
      setArchiveAction(null); setArchiveCode(""); setNotice(`貼文已由${data.modifiedBy}${archiveAction.operation === "archive" ? "封存" : "還原到進行中"}。`); await loadPosts(archivedView);
    } catch (error) { setArchiveCode(""); setArchiveError(error instanceof Error ? error.message : "無法更新封存狀態。"); }
  }

  function removePost(post: BoardPost) { setPostMenu(null); setConfirmation({ title: `移除貼文「${post.title}」？`, message: "貼文、附件、功能資料、留言與紀錄都會一起隱藏，之後可從回收區完整還原。", confirmLabel: "確認移至回收區", action: async () => { await requestJson(`/api/boards/${board}/${post.id}`, { method: "DELETE" }); setNotice(`貼文「${post.title}」已移至回收區。`); await loadPosts(archivedView); } }); }
  function removeComment(post: BoardPost, comment: Comment) { const label = post.modules.relay ? "接龍內容" : "留言"; setConfirmation({ title: `移除 ${comment.name} 的${label}？`, message: `這筆內容屬於貼文「${post.title}」，移除後可從本頁回收區還原。`, confirmLabel: `確認移除${label}`, action: async () => { await requestJson(`/api/boards/${board}/${post.id}/comments/${comment.id}`, { method: "DELETE" }); setNotice(`${label}已移至回收區。`); await loadPosts(archivedView); } }); }
  async function runConfirmation() { if (!confirmation) return; setConfirming(true); try { await confirmation.action(); setConfirmation(null); } catch (error) { setNotice(error instanceof Error ? error.message : "無法完成移除操作。"); } finally { setConfirming(false); } }

  async function openRecycle() { setRecycleOpen(true); setRecycleLoading(true); try { const data = await requestJson(`/api/boards/${board}/recycle`); setRecycledPosts(data.posts); setRecycledComments(data.comments); } catch (error) { setNotice(error instanceof Error ? error.message : "無法讀取回收區。"); setRecycleOpen(false); } finally { setRecycleLoading(false); } }
  async function restorePost(post: RecycledPost) { try { await requestJson(`/api/boards/${board}/recycle/posts/${post.id}`, { method: "POST" }); setRecycledPosts((current) => current.filter((item) => item.id !== post.id)); setNotice(`貼文「${post.title}」已還原。`); await loadPosts(archivedView); } catch (error) { setNotice(error instanceof Error ? error.message : "無法還原貼文。"); } }
  async function restoreComment(comment: RecycledComment) { try { await requestJson(`/api/boards/${board}/recycle/comments/${comment.id}`, { method: "POST" }); setRecycledComments((current) => current.filter((item) => item.id !== comment.id)); setNotice("內容已還原。"); await loadPosts(archivedView); } catch (error) { setNotice(error instanceof Error ? error.message : "無法還原內容。"); } }

  if (checking) return <main className="app-shell"><PlatformHeader current={board} editor={false} /><div className="empty-state board-gate">正在確認編輯權限…</div></main>;
  if (!editor) return <main className="app-shell"><PlatformHeader current={board} editor={false} /><section className="locked-page"><span className="lock-symbol" aria-hidden="true">鎖</span><p className="eyebrow">內部工作頁面</p><h1>請先在首頁輸入共用編輯碼</h1><p>輸入編輯碼後才會顯示行政公告系統及各工作板塊。</p><Link className="button button-primary" href="/">回到常用網頁與 QR</Link></section></main>;

  return <main className="app-shell app-shell-wide">
    <PlatformHeader current={board} editor />
    <header className="board-hero"><div><p className="eyebrow">{meta.eyebrow}</p><h1>{meta.title}</h1><p>{meta.description}</p></div><div className="board-hero-actions"><span className="protected-badge">共用編輯模式</span><button className="button button-primary" type="button" onClick={() => setComposerOpen(true)}>＋ 新增貼文</button></div></header>
    {notice && <p className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="關閉提醒">×</button></p>}
    <div className="feed-heading board-feed-heading"><div><p className="eyebrow">頁面貼文</p><h2>{loading ? "正在讀取…" : `${posts.length} 則${archivedView ? "封存" : "進行中"}貼文`}</h2></div><div className="board-feed-actions"><div className="segmented"><button className={!archivedView ? "active" : ""} type="button" onClick={() => { setArchivedView(false); void loadPosts(false); }}>進行中</button><button className={archivedView ? "active" : ""} type="button" onClick={() => { setArchivedView(true); void loadPosts(true); }}>封存區</button></div><button className="button button-outline" type="button" onClick={() => void openRecycle()}>回收區</button></div></div>

    <section className="board-feed board-feed-full" aria-busy={loading}>
      {!loading && posts.length === 0 && <div className="empty-state"><strong>{archivedView ? "封存區目前沒有內容" : "目前還沒有貼文"}</strong><span>{archivedView ? "過期或已公告內容可從貼文選單移入。" : "點選右上方新增貼文，建立第一則內容。"}</span></div>}
      {posts.map((post) => {
        const audience = post.modules.receipt?.audience || [];
        const readNames = audience.filter((name) => post.receipts.some((receipt) => receipt.name === name));
        const unreadNames = audience.filter((name) => !readNames.includes(name));
        const locationHref = clickableLocationUrl(post.fileUrl);
        const relay = Boolean(post.modules.relay);
        return <article className={post.pinned ? "board-post pinned" : "board-post"} key={post.id}>
          <div className="post-top"><div><div className="post-tags">{post.pinned ? <span className="post-badge brand">置頂</span> : null}{post.attachments.length ? <span className="post-badge info">{post.attachments.length} 個附件／燈箱</span> : null}{Object.keys(post.modules).map((key) => <span className="post-badge" key={key}>{({ qr: "QR", receipt: "傳閱單", relay: "接龍", poll: "投票", draw: "選人／爬格子" } as Record<string, string>)[key]}</span>)}</div><h3>{post.title}</h3><div className="post-meta"><span>{formatDate(post.createdAt)}</span>{post.updatedAt !== post.createdAt && <span>更新：{formatDate(post.updatedAt)}</span>}</div></div><div className="post-menu-wrap"><button className="post-menu-button" type="button" aria-label={`開啟「${post.title}」管理選單`} aria-expanded={postMenu === post.id} onClick={() => setPostMenu(postMenu === post.id ? null : post.id)}>•••</button>{postMenu === post.id && <div className="post-menu"><button type="button" onClick={() => openPostEditor(post)}>編輯與功能設定</button><button type="button" onClick={() => requestArchive(post, archivedView ? "restore-archive" : "archive")}>{archivedView ? "還原到進行中" : "移至封存區"}</button><button className="danger-text" type="button" onClick={() => removePost(post)}>移至回收區</button></div>}</div></div>
          {post.body && <p className="post-body">{post.body}</p>}
          {post.imageKey && <button className="post-image-link" type="button" onClick={(event) => openLightbox(event, post)} aria-haspopup="dialog" aria-label={`放大查看 ${post.title} 的圖片`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl(post.imageKey)} alt={post.imageName || `${post.title} 圖片`} />
            <span>以燈箱放大圖片</span>
          </button>}
          {post.attachments.length > 0 && <div className="document-stack">{post.attachments.map((attachment) => <section className="document-card" key={attachment.key}><div className="document-card-icon" aria-hidden="true">{attachment.type === "application/pdf" ? "PDF" : "DOCX"}</div><div><strong>{attachment.name}</strong><span>{attachment.previewKey ? "含固定版面 PDF 預覽" : attachment.type === "application/pdf" ? "原始 PDF 預覽" : "網頁版 Word 預覽"}</span></div><button className="button button-primary" type="button" onClick={(event) => openDocumentLightbox(event, post, attachment)} aria-haspopup="dialog">燈箱閱讀</button></section>)}</div>}
          {post.fileUrl && <section className="cloud-location-panel" aria-label="雲端資料夾或檔案位置"><div className="cloud-location-copy"><strong>雲端資料夾／檔案位置</strong><span>{post.fileUrl}</span></div>{locationHref && <a className="button button-outline cloud-location-action" href={locationHref} target="_blank" rel="noreferrer">開啟位置</a>}</section>}
          {post.modules.qr && <PostQr value={post.modules.qr.value} label={post.modules.qr.label} />}
          {post.modules.receipt && <section className="receipt-panel"><div className="receipt-summary"><strong>已閱 {readNames.length}／{audience.length} 人</strong><span>未閱 {unreadNames.length} 人</span></div><div className="receipt-progress"><i style={{ width: `${audience.length ? readNames.length / audience.length * 100 : 0}%` }} /></div><div className="receipt-names"><span>已閱：</span>{readNames.length ? readNames.map((name) => <b key={name}>{name}</b>) : <em>尚無</em>}</div><details><summary>查看未閱名單</summary><p>{unreadNames.length ? unreadNames.join("、") : "所有需確認同仁皆已閱讀。"}</p></details>{!archivedView && <><button className="button button-outline" type="button" onClick={() => setReceiptOpen(receiptOpen === post.id ? null : post.id)}>確認閱讀</button>{receiptOpen === post.id && <form className="receipt-form" onSubmit={(event) => confirmReceipt(event, post)}><label>請選擇自己的姓名<select required value={receiptNames[post.id] || ""} onChange={(event) => setReceiptNames((current) => ({ ...current, [post.id]: event.target.value }))}><option value="">請選擇姓名</option>{unreadNames.map((name) => <option key={name}>{name}</option>)}</select></label><button className="button button-primary" type="submit">確認已閱</button></form>}</>}</section>}
          {post.modules.poll && <section className="poll-panel"><div className="receipt-summary"><strong>具名投票</strong><span>{post.votes.length} 人已投票</span></div><div className="poll-summary">{post.modules.poll.options.map((option) => { const count = post.votes.filter((vote) => vote.choice === option).length; return <div className="poll-row" key={option}><span>{option}</span><div><i style={{ width: `${post.votes.length ? count / post.votes.length * 100 : 0}%` }} /></div><b>{count} 票</b></div>; })}</div>{!archivedView && <form className="poll-form" onSubmit={(event) => submitVote(event, post)}><label>姓名<select required value={pollNames[post.id] || ""} onChange={(event) => { const name = event.target.value; setPollNames((current) => ({ ...current, [post.id]: name })); setPollChoices((current) => ({ ...current, [post.id]: post.votes.find((vote) => vote.name === name)?.choice || "" })); }}><option value="">請選擇姓名</option>{RECEIPT_NAMES.map((name) => <option key={name}>{name}</option>)}</select></label><label>選項<select required value={pollChoices[post.id] || ""} onChange={(event) => setPollChoices((current) => ({ ...current, [post.id]: event.target.value }))}><option value="">請選擇選項</option>{post.modules.poll.options.map((option) => <option key={option}>{option}</option>)}</select></label><button className="button button-primary" type="submit">送出／更新投票</button></form>}<details className="vote-audit" open><summary>查看誰投了什麼</summary><div>{post.votes.length ? post.votes.map((vote) => <p key={vote.id}><strong>{vote.name}</strong><span>{vote.choice}</span></p>) : <em>尚無投票紀錄</em>}</div></details></section>}
          {post.modules.draw && <section className="draw-panel"><div><strong>公平抽選</strong><span>{post.modules.draw.mode === "ladder" ? "爬格子" : "隨機翻牌"} · {post.modules.draw.pool.length} 人參與 · 抽出 {post.modules.draw.count} 人</span></div><div className="draw-panel-actions">{post.drawResult ? <><button className="button button-outline" type="button" onClick={() => setDrawLightbox(post.drawResult)}>重播動畫</button>{!archivedView && <button className="button button-outline" type="button" onClick={() => { setRedrawPost(post); setRedrawCode(""); setRedrawError(""); }}>再來一次</button>}</> : !archivedView && <button className="button button-primary" type="button" onClick={() => void startDraw(post)}>開始抽選</button>}</div>{post.drawResult && <p className="draw-locked"><span>🔒 結果已鎖定</span><strong>{post.drawResult.winners.join("、")}</strong><small>{post.drawResult.serial}</small></p>}</section>}
          <section className={relay ? "comments relay-comments" : "comments"}><h4>{relay ? `接龍彙整（${post.comments.length} 筆）` : `留言（${post.comments.length} 則）`}</h4>{post.comments.length ? <div className="comment-list">{post.comments.map((comment) => <div className="comment" key={comment.id}><div className="comment-content"><div><strong>{comment.name}{relay ? "：" : ""}</strong>{!relay && <time>{formatDate(comment.createdAt)}</time>}</div><p>{comment.message}</p></div>{!archivedView && <button className="text-button danger-text comment-remove" type="button" onClick={() => removeComment(post, comment)}>移除</button>}</div>)}</div> : <p className="comment-empty">{relay ? "尚無接龍內容。" : "尚無留言。"}</p>}{!archivedView && <form className="comment-form" onSubmit={(event) => addComment(event, post)}><label>{relay ? "姓名" : "留言者"}<select required value={commentNames[post.id] || ""} onChange={(event) => setCommentNames((current) => ({ ...current, [post.id]: event.target.value }))}><option value="">請選擇姓名</option>{STAFF_NAMES.map((name) => <option key={name}>{name}</option>)}</select></label><label>{relay ? post.modules.relay?.prompt : "留言內容"}<textarea required maxLength={1000} value={commentMessages[post.id] || ""} onChange={(event) => setCommentMessages((current) => ({ ...current, [post.id]: event.target.value }))} placeholder={relay ? "輸入接龍內容" : "輸入留言內容"} /></label><button className="button button-primary" type="submit">{relay ? "加入接龍" : "送出留言"}</button></form>}</section>
        </article>;
      })}
    </section>

    {composerOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (!saving && event.target === event.currentTarget) setComposerOpen(false); }}><section className="modal modal-composer" role="dialog" aria-modal="true" aria-labelledby="composer-title"><button className="modal-close" type="button" onClick={() => setComposerOpen(false)} aria-label="關閉新增貼文" disabled={saving}>×</button><p className="eyebrow">綜合新增內容</p><h2 id="composer-title">新增模組化貼文</h2><p className="base-note"><strong>固定基礎模板：</strong>文字、最多三個附件燈箱與留言；其他功能依需要啟用。</p><form onSubmit={createPost}><label>貼文標題<input autoFocus required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="請輸入清楚的主題" /></label><label>內容說明（可留白）<textarea maxLength={3000} value={body} onChange={(event) => setBody(event.target.value)} /></label><label>雲端資料夾／檔案位置（可留白）<input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} placeholder="可填網址、路徑、資料夾名稱或備註" /></label><div className="two-fields"><label>上傳圖片（可留白，最大 8 MB）<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setImage(event.target.files?.[0] || null)} /></label><label>上傳文件（最多 3 個）<input type="file" multiple accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx" onChange={(event) => { const files = Array.from(event.target.files || []).slice(0, 3); setDocumentFiles(files); if ((event.target.files?.length || 0) > 3) setNotice("單篇最多三個文件，已保留前 3 個。"); }} /><small className="field-help">已選擇 {documentFiles.length}／3 個；有文件就自動啟用燈箱。</small></label></div><PostModuleEditor value={modules} onChange={setModules} /><div className="edit-post-actions"><button className="button button-outline" type="button" onClick={() => setComposerOpen(false)} disabled={saving}>取消</button><button className="button button-primary" type="submit" disabled={saving}>{saving ? "正在上傳與發布…" : "發布貼文"}</button></div></form></section></div>}
    {lightbox && <div className="image-lightbox-backdrop" role="presentation" onClick={closeLightbox}><section className="image-lightbox" role="dialog" aria-modal="true" aria-labelledby="image-lightbox-title"><button className="image-lightbox-close" type="button" onClick={(event) => { event.stopPropagation(); closeLightbox(); }} aria-label="關閉放大圖片" autoFocus>×</button><figure>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lightbox.src} alt={lightbox.alt} onClick={(event) => event.stopPropagation()} />
      <figcaption id="image-lightbox-title" onClick={(event) => event.stopPropagation()}><strong>{lightbox.title}</strong>{lightbox.name && <span>{lightbox.name}</span>}<small>點圖片旁深色區域、右上角 ×，或按 Esc 關閉</small></figcaption></figure></section></div>}
    {documentLightbox && <DocumentLightbox value={documentLightbox} onClose={closeDocumentLightbox} />}
    {drawLightbox && <DrawLightbox result={drawLightbox} onClose={() => setDrawLightbox(null)} />}
    {editingPost && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (!modifying && event.target === event.currentTarget) setEditingPost(null); }}><section className="modal modal-composer edit-post-modal" role="dialog" aria-modal="true" aria-labelledby="edit-post-title"><button className="modal-close" type="button" onClick={() => setEditingPost(null)} aria-label="取消修改貼文" disabled={modifying}>×</button><p className="eyebrow">二次授權修改</p><h2 id="edit-post-title">編輯貼文與功能設定</h2><p>傳閱名單、投票選項與抽選設定只會出現在這個編輯視窗。</p><form onSubmit={updatePost} noValidate><label>貼文標題<input required maxLength={120} value={editTitle} onChange={(event) => setEditTitle(event.target.value)} autoFocus /></label><label>內容說明（可留白）<textarea maxLength={3000} value={editBody} onChange={(event) => setEditBody(event.target.value)} /></label><label>雲端資料夾／檔案位置（可留白）<input value={editFileUrl} onChange={(event) => { setEditFileUrl(event.target.value); setEditError(""); }} placeholder="可填網址、路徑、資料夾名稱或備註" /></label><PostModuleEditor value={editModules} onChange={setEditModules} /><fieldset className="module-fields"><legend>排序與顯示</legend><div className="two-fields"><label className="inline-check"><input type="checkbox" checked={editPinned} onChange={(event) => setEditPinned(event.target.checked)} />將此貼文置頂</label><label>排序數字<input type="number" min="0" max="99999" value={editSortOrder} onChange={(event) => setEditSortOrder(Number(event.target.value))} /><small className="field-help">數字越小越前面；置頂貼文永遠優先。</small></label></div></fieldset><label>修改碼<input required type="password" inputMode="numeric" pattern="[0-9]*" minLength={3} maxLength={3} value={modifyCode} onChange={(event) => { setModifyCode(event.target.value.replace(/\D/g, "").slice(0, 3)); setEditError(""); }} autoComplete="off" placeholder="請輸入 3 位數修改碼" /></label>{editError && <p className="edit-post-error" role="alert">{editError}</p>}<div className="edit-post-actions"><button className="button button-outline" type="button" onClick={() => setEditingPost(null)} disabled={modifying}>取消</button><button className="button button-primary" type="submit" disabled={modifying}>{modifying ? "正在儲存…" : "確認修改"}</button></div></form></section></div>}
    {archiveAction && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={submitArchive} role="dialog" aria-modal="true" aria-labelledby="archive-title"><button className="modal-close" type="button" onClick={() => setArchiveAction(null)} aria-label="取消">×</button><p className="eyebrow">貼文狀態變更</p><h2 id="archive-title">{archiveAction.operation === "archive" ? "移至本頁封存區" : "還原到進行中"}</h2><p>此操作不會刪除附件、留言或功能紀錄。</p><label>修改碼<input autoFocus required type="password" inputMode="numeric" maxLength={3} value={archiveCode} onChange={(event) => { setArchiveCode(event.target.value.replace(/\D/g, "").slice(0, 3)); setArchiveError(""); }} /></label>{archiveError && <p className="edit-post-error" role="alert">{archiveError}</p>}<button className="button button-primary" type="submit">確認變更</button></form></div>}
    {redrawPost && <div className="modal-backdrop" role="presentation"><form className="modal" onSubmit={performRedraw} role="dialog" aria-modal="true" aria-labelledby="redraw-title"><button className="modal-close" type="button" onClick={() => setRedrawPost(null)} aria-label="取消重新抽選">×</button><p className="eyebrow">建立全新結果</p><h2 id="redraw-title">再來一次</h2><p>重播不會改變結果；只有重新輸入共用編輯碼，才會產生新的抽選編號與人選。</p><label>共用編輯碼<input autoFocus required type="password" value={redrawCode} onChange={(event) => { setRedrawCode(event.target.value); setRedrawError(""); }} autoComplete="off" /></label>{redrawError && <p className="edit-post-error" role="alert">{redrawError}</p>}<button className="button button-primary" type="submit">驗證並重新抽選</button></form></div>}
    {recycleOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRecycleOpen(false); }}><section className="modal modal-wide board-recycle-modal" role="dialog" aria-modal="true" aria-labelledby="board-recycle-title"><button className="modal-close" type="button" onClick={() => setRecycleOpen(false)} aria-label="關閉回收區" autoFocus>×</button><p className="eyebrow">{meta.title}</p><h2 id="board-recycle-title">回收區</h2><p>回收區只放已刪除、不要的內容；過期或舊文件請放本頁封存區。</p>{recycleLoading ? <div className="empty-state"><strong>正在讀取回收內容…</strong></div> : <><section className="recycle-section"><h3>已移除貼文（{recycledPosts.length}）</h3>{recycledPosts.length ? <div className="recycle-list">{recycledPosts.map((post) => <div key={post.id}><div><strong>{post.title}</strong><span>移除時間：{formatDate(post.deletedAt)}</span></div><button className="button button-outline" type="button" onClick={() => void restorePost(post)}>還原貼文</button></div>)}</div> : <p className="recycle-empty">目前沒有已移除貼文。</p>}</section><section className="recycle-section"><h3>已移除留言／接龍（{recycledComments.length}）</h3>{recycledComments.length ? <div className="recycle-list">{recycledComments.map((comment) => <div key={comment.id}><div><strong>{comment.name}｜{comment.postTitle}</strong><span className="recycle-message">{comment.message}</span></div><button className="button button-outline" type="button" onClick={() => void restoreComment(comment)}>還原內容</button></div>)}</div> : <p className="recycle-empty">目前沒有已移除內容。</p>}</section></>}</section></div>}
    {confirmation && <div className="modal-backdrop" role="presentation"><section className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="remove-confirm-title"><button className="modal-close" type="button" onClick={() => setConfirmation(null)} aria-label="取消移除" disabled={confirming}>×</button><p className="eyebrow">移除前確認</p><h2 id="remove-confirm-title">{confirmation.title}</h2><p>{confirmation.message}</p><div className="confirm-actions"><button className="button button-outline" type="button" onClick={() => setConfirmation(null)} disabled={confirming}>取消</button><button className="button button-danger" type="button" onClick={() => void runConfirmation()} disabled={confirming}>{confirming ? "正在處理…" : confirmation.confirmLabel}</button></div></section></div>}
  </main>;
}

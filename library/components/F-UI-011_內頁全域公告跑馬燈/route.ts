import { and, desc, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { boardPosts } from "@/db/schema";
import { BOARD_META, isBoardType } from "@/app/board-config";
import { parseModules } from "@/app/post-modules";
import { editorRequired, ensureBoardsSchema, hasEditorSession } from "@/app/api/_shared";

const PRIORITY = { general: 1, important: 2, emergency: 3 } as const;
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1_000;
const LEGACY_TOLERANCE_MS = 15 * 60 * 1_000;

export async function GET(request: Request) {
  if (!(await hasEditorSession(request))) return editorRequired();
  await ensureBoardsSchema();
  const posts = await getDb().select({ id: boardPosts.id, board: boardPosts.board, title: boardPosts.title, modules: boardPosts.modules, createdAt: boardPosts.createdAt, updatedAt: boardPosts.updatedAt }).from(boardPosts)
    .where(and(isNull(boardPosts.deletedAt), isNull(boardPosts.archivedAt))).orderBy(desc(boardPosts.updatedAt), desc(boardPosts.id));
  const timestamp = Date.now();
  const items = posts.flatMap((post) => {
    const marquee = parseModules(post.modules).marquee;
    if (!marquee || !isBoardType(post.board)) return [];
    let start = marquee.startAt ? Date.parse(marquee.startAt) : 0;
    let end = marquee.endAt ? Date.parse(marquee.endAt) : Number.POSITIVE_INFINITY;
    // 版本 15 曾把台灣 datetime-local 誤當 UTC。只對「開始時間約等於建立／更新時間 + 8 小時」的舊資料做精準相容。
    const anchors = [post.createdAt, post.updatedAt].map((value) => Date.parse(value)).filter(Number.isFinite);
    const legacyTaipeiLocal = start > 0 && anchors.some((anchor) => Math.abs(start - anchor - TAIPEI_OFFSET_MS) <= LEGACY_TOLERANCE_MS);
    if (legacyTaipeiLocal) {
      start -= TAIPEI_OFFSET_MS;
      if (Number.isFinite(end)) end -= TAIPEI_OFFSET_MS;
    }
    if (start > timestamp || end <= timestamp) return [];
    return [{ id: post.id, message: marquee.message || post.title, level: marquee.level, speed: marquee.speed, href: `${BOARD_META[post.board].href}#post-${post.id}`, updatedAt: post.updatedAt }];
  }).sort((left, right) => PRIORITY[right.level] - PRIORITY[left.level] || right.updatedAt.localeCompare(left.updatedAt)).slice(0, 3)
    .map((item) => ({ id: item.id, message: item.message, level: item.level, speed: item.speed, href: item.href }));
  return Response.json({ items }, { headers: { "Cache-Control": "private, no-store" } });
}

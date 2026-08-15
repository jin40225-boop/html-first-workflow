import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { boardPosts } from "@/db/schema";
import { isBoardType } from "@/app/board-config";
import { DrawRung, DrawResult, parseDrawResult, parseModules } from "@/app/post-modules";
import { editorRequired, ensureBoardsSchema, hasEditorSession, now, verifyEditCode } from "@/app/api/_shared";

function randomIndex(max: number) {
  if (max <= 1) return 0;
  const range = 0x1_0000_0000;
  const limit = range - (range % max);
  const values = new Uint32Array(1);
  do { crypto.getRandomValues(values); } while (values[0] >= limit);
  return values[0] % max;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function makeRungs(count: number) {
  const rows = Math.max(5, Math.min(8, count - 1));
  const rungs: DrawRung[] = [];
  for (let row = 0; row < rows; row += 1) {
    const candidates = shuffle(Array.from({ length: Math.max(0, count - 1) }, (_, index) => index));
    const used = new Set<number>();
    let added = 0;
    for (const left of candidates) {
      if (used.has(left) || used.has(left + 1)) continue;
      if (randomIndex(100) < 48 || added === 0) {
        rungs.push({ row, left }); used.add(left); used.add(left + 1); added += 1;
        if (added >= Math.max(1, Math.floor(count / 3))) break;
      }
    }
  }
  return rungs.sort((left, right) => left.row - right.row || left.left - right.left);
}

export async function POST(request: Request, context: { params: Promise<{ board: string; id: string }> }) {
  if (!(await hasEditorSession(request))) return editorRequired();
  const { board, id: rawId } = await context.params;
  const postId = Number(rawId);
  if (!isBoardType(board) || !Number.isInteger(postId) || postId <= 0) return Response.json({ error: "貼文資料無效。" }, { status: 400 });
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const redraw = payload.action === "redraw";
  if (redraw && !verifyEditCode(payload.editCode)) return Response.json({ error: "編輯碼不正確，無法重新抽選。" }, { status: 403 });
  await ensureBoardsSchema();
  const [post] = await getDb().select().from(boardPosts)
    .where(and(eq(boardPosts.id, postId), eq(boardPosts.board, board), isNull(boardPosts.deletedAt))).limit(1);
  if (!post) return Response.json({ error: "找不到此貼文。" }, { status: 404 });
  const existing = parseDrawResult(post.drawResult);
  if (existing && !redraw) return Response.json({ drawResult: existing, reused: true });
  const config = parseModules(post.modules).draw;
  if (!config) return Response.json({ error: "這篇貼文沒有啟用抽選功能。" }, { status: 400 });
  const createdAt = now();
  const result: DrawResult = {
    serial: `DRAW-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`,
    mode: config.mode,
    pool: config.pool,
    winners: shuffle(config.pool).slice(0, config.count),
    rungs: config.mode === "ladder" ? makeRungs(config.pool.length) : [],
    createdAt,
  };
  await getDb().update(boardPosts).set({ drawResult: JSON.stringify(result), updatedAt: createdAt })
    .where(and(eq(boardPosts.id, postId), eq(boardPosts.board, board), isNull(boardPosts.deletedAt)));
  return Response.json({ drawResult: result });
}

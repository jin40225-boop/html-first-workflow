-- ============================================================================
-- 過期場次狀態歸位 ＋ 測試場次除役（2026-08-04 Phase 2）
--
-- 背景：活動軌跡區將從資料庫讀「已結束」場次公開展示（裁決 6：軌跡永久留存）。
--       上線前必須確保兩件事：
--         (a) 已過期的場次狀態確實是 done，否則軌跡查詢會漏掉它們；
--         (b) 測試資料永遠不會混進公開軌跡。
--
-- ⚠ 執行順序不可對調：
--       先把測試場次標成 cancelled，再掃描過期的 open／full 改為 done。
--       若順序相反，那筆已過期且 full 的測試場次會被掃成 done，
--       然後出現在公開的活動軌跡裡。
--
-- 不刪除任何資料：測試場次改標 cancelled 保留稽核軌跡，不做不可逆的刪除。
--
-- 冪等：可重複執行。
-- ============================================================================

-- 步驟 1：測試場次除役（必須先做）
update public.sessions s
set status = 'cancelled',
    admin_note = coalesce(s.admin_note || E'\n', '')
      || '2026-08-04 除役：驗收用測試場次，改標 cancelled 保留稽核，不進公開活動軌跡。'
from public.projects p
where p.id = s.project_id
  and p.is_public
  and s.title like '%測試%'
  and s.status <> 'cancelled';

-- 步驟 2：過期場次歸位為 done（cancelled 不受影響）
update public.sessions
set status = 'done'
where status in ('open', 'full')
  and ends_at < now();

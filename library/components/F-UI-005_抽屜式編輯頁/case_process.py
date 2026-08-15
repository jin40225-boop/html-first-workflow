"""
ds/routes/case_process.py

案件處理頁路由
─────────────────────────────────────────
對應 v4 章節：第六章 案件處理頁
對應 VBA 模組：Module71（執行匯入程序 V30 最終完美版）
─────────────────────────────────────────
"""

from flask import (
    Blueprint,
    Response,
    current_app,
    flash,
    redirect,
    render_template,
    request,
    url_for,
)

from ds.services.assignment_service import get_assignment_recommendation, grade_to_pool
from ds.services.case_processor import (
    CaseProcessError,
    PROCESS_MODES,
    complete_supplement,
    execute_save,
)
from ds.services.case_service import (
    check_access,
    check_view_access,
    ensure_schema_ready,
    find_same_person_cases,
    get_case_by_id,
    list_active_workers,
)
from ds.services.completeness_service import missing_required_fields
from ds.services.confirmation_service import get_pending_for_case
from ds.services.family_service import RELATION_TYPES, get_relations_for_case
from ds.services.history_service import get_recent_history
from ds.services.pdf_detector import (
    PdfImportError,
    complete_initial_edit,
    get_auto_filled_fields_for_case,
    rename_after_import,
)
from ds.core.db import fetch_one as _fetch_one, get_db
from ds.services.history_service import log_case_history

bp = Blueprint("case_process", __name__)


def _redirect_htmx_aware(url: str):
    """HTMX 請求回 HX-Redirect（整頁導向），一般請求回 302。

    drawer 內按鈕用 hx-post 打這些端點；若直接回 302，htmx 會把
    redirect 目標的整頁 HTML swap 進 drawer 造成頁中頁。
    """
    if request.headers.get("HX-Request"):
        response = Response("", status=204)
        response.headers["HX-Redirect"] = url
        return response
    return redirect(url)


@bp.route("/")
def index():
    return redirect(url_for("cases.list_view"))


@bp.get("/<int:case_id>")
def edit_view(case_id: int):
    """個案編輯入口 — 已於 2026-05 暖意版重構廢止。

    UX_Plan PAGE 03：drawer = 完整個案頁，廢止獨立編輯頁的二段跳。
    本路由保留 URL（舊書籤 / 外部 email 連結友善），但永久 redirect 到
    個案清單頁並用 query string 自動開 drawer。

    原 process.html template 已封存於 `_archive/`，render 邏輯與
    _field_groups 都改在 drawer 內呈現（見 cases.drawer_view / drawer_save）。
    """
    return redirect(
        url_for("cases.list_view", case=case_id),
        code=301,
    )


@bp.post("/<int:case_id>/save")
def save_existing(case_id: int):
    """保留作為相容入口（process.html 廢止後內部不再呼叫，但外部腳本或舊書籤可能 POST）。

    成功 → redirect 個案清單並開 drawer。
    失敗 → flash error 後同上（drawer 內可看到當前 case 狀態）。
    """
    user = current_app.config["CURRENT_USER"]
    case = get_case_by_id(case_id)
    if not case:
        return render_template("error.html", user=user, message="案件不存在"), 404
    if not check_access(case, user):
        return (
            render_template(
                "error.html",
                user=user,
                message="此非您負責案件，如需協作請聯繫管理組",
            ),
            403,
        )

    mode = request.form.get("mode") or "資料變更"
    try:
        result = execute_save(case_id, request.form.to_dict(), mode, user)
        flash(result["message"], "success")
        return redirect(url_for("cases.list_view", case=result["case_id"]))
    except CaseProcessError as exc:
        flash(str(exc), "error")
        return redirect(url_for("cases.list_view", case=case_id))


@bp.post("/<int:case_id>/save-initial-edit")
def save_initial_edit(case_id: int):
    user = current_app.config["CURRENT_USER"]
    case = get_case_by_id(case_id)
    if not case:
        return render_template("error.html", user=user, message="案件不存在"), 404
    if not check_access(case, user):
        return (
            render_template(
                "error.html",
                user=user,
                message="此非您負責案件，如需協作請聯繫管理組",
            ),
            403,
        )
    if not case.get("initial_edit_pending"):
        flash("此案件已不在待初次編輯狀態。", "success")
        return redirect(url_for("cases.list_view", case=case_id))

    try:
        result = execute_save(case_id, request.form.to_dict(), "資料變更", user)
        refreshed = get_case_by_id(case_id) or case
        missing = missing_required_fields(refreshed)
        if missing:
            labels = "、".join(item["label"] for item in missing)
            flash(f"完整率未達 100%，請補齊：{labels}", "warning")
            return redirect(url_for("cases.list_view", case=case_id))
        complete_initial_edit(case_id, user)
    except (CaseProcessError, PdfImportError) as exc:
        flash(str(exc), "error")
        return redirect(url_for("cases.list_view", case=case_id))

    flash(f"{result['message']}，已完成初次編輯。", "success")
    return redirect(url_for("cases.list_view", case=case_id))


@bp.post("/<int:case_id>/complete-initial-edit")
def complete_initial_edit_view(case_id: int):
    """把「待初次編輯」旗標正式關閉（完整率 100% 才放行）。

    這是 PDF 補入 / 匯入後提醒鏈的唯一閉環出口：首頁「待完成初次編輯」列
    與 drawer 的「完成初次編輯」鈕都打這裡。點開、儲存都不會讓提醒消失，
    只有走到這裡且通過完整率檢查才會解除。
    """
    user = current_app.config["CURRENT_USER"]
    case = get_case_by_id(case_id)
    if not case:
        flash("找不到案件", "error")
        return _redirect_htmx_aware(url_for("cases.list_view"))
    if not check_access(case, user):
        flash("此非您負責案件，如需協作請聯繫管理組", "error")
        return _redirect_htmx_aware(url_for("cases.list_view"))
    if not case.get("initial_edit_pending"):
        flash("此案件已不在待初次編輯狀態。", "success")
        return _redirect_htmx_aware(url_for("cases.list_view", case=case_id))

    missing = missing_required_fields(case)
    if missing:
        labels = "、".join(item["label"] for item in missing)
        flash(f"完整率未達 100%，請先補齊並儲存：{labels}", "warning")
        return _redirect_htmx_aware(url_for("cases.list_view", case=case_id))

    try:
        complete_initial_edit(case_id, user)
    except PdfImportError as exc:
        flash(str(exc), "error")
        return _redirect_htmx_aware(url_for("cases.list_view", case=case_id))

    flash("已完成初次編輯，提醒解除。", "success")
    return _redirect_htmx_aware(url_for("cases.list_view", case=case_id))


@bp.post("/<int:case_id>/confirm-intake")
def confirm_intake(case_id: int):
    """把 PDF 匯入產生的「待確認」個案，正式接受為「在案處遇中」。

    對應使用者場景：PDF 解析後 → 待確認 case → /process/<id> 編輯後按「確認接案送出」
    → 此 endpoint → status 變為 在案處遇中、寫軌跡、PDF 改名為已建檔。

    使用者亦可不編輯直接送出（首頁「直接確認接案」按鈕）。
    """
    user = current_app.config["CURRENT_USER"]
    case = get_case_by_id(case_id)
    if not case:
        flash("找不到案件", "error")
        return _redirect_htmx_aware(url_for("cases.list_view"))
    if not check_access(case, user):
        flash("此非您負責案件，如需協作請聯繫管理組", "error")
        return _redirect_htmx_aware(url_for("cases.list_view"))
    if case.get("case_status") != "待確認":
        flash("此案件並非待確認狀態，無需重複確認", "warning")
        return _redirect_htmx_aware(url_for("cases.list_view", case=case_id))

    db = get_db()
    db.execute(
        """
        UPDATE cases
        SET case_status = '在案處遇中',
            initial_edit_pending = 0,
            updated_at = CURRENT_TIMESTAMP,
            updated_by = ?
        WHERE case_id = ?
        """,
        [user["username"], case_id],
    )
    log_case_history(
        case_id=case_id,
        change_field="case_status",
        old_value="待確認",
        new_value="在案處遇中",
        status_desc=f"{user['display_name']} 確認接案送出",
        reporter=user["username"],
        change_type="intake_confirmed",
        is_critical=True,
    )
    db.commit()

    # 若有對應的 pdf_imports 紀錄，把實體 PDF 改名為「_已建檔_」標籤
    pdf_row = _fetch_one(
        "SELECT import_id FROM pdf_imports WHERE created_case_id = ?",
        [case_id],
    )
    if pdf_row:
        try:
            rename_after_import(
                pdf_row["import_id"],
                case.get("name") or "",
                user.get("display_name") or "",
            )
        except Exception:
            pass  # rename 失敗不阻擋確認流程

    flash("已確認接案，案件正式進入「在案處遇中」", "success")
    return _redirect_htmx_aware(url_for("cases.list_view"))


@bp.post("/<int:case_id>/complete-supplement")
def complete_supplement_view(case_id: int):
    """批量派案後「待補齊 → 完成補齊」路由。

    對應 v4 §6.4 狀態 4：completeness >= COMPLETENESS_THRESHOLD 才放行。
    """
    user = current_app.config["CURRENT_USER"]
    case = get_case_by_id(case_id)
    if not case:
        return render_template("error.html", user=user, message="案件不存在"), 404
    if not check_access(case, user):
        return (
            render_template(
                "error.html",
                user=user,
                message="此非您負責案件，如需協作請聯繫管理組",
            ),
            403,
        )
    try:
        result = complete_supplement(case_id, user)
    except CaseProcessError as exc:
        flash(str(exc), "error")
        return _redirect_htmx_aware(url_for("cases.list_view", case=case_id))

    flash(result["message"], "success")
    return _redirect_htmx_aware(url_for("cases.list_view", case=case_id))


def build_case_context(
    case: dict,
    user: dict,
    history: list[dict],
    error: str | None = None,
    selected_mode: str | None = None,
    is_new: bool = False,
    access_readonly: bool = False,
) -> dict:
    """準備個案編輯所需的完整 context（給 process.html 與 drawer 共用）。"""
    mode = selected_mode or case.get("process_mode") or "資料變更"
    if mode not in PROCESS_MODES and mode != "重啟案件":
        mode = "資料變更"

    process_modes = [item for item in PROCESS_MODES if item != "批量派案"]
    if user["role"] == "admin":
        process_modes = PROCESS_MODES

    status_readonly = case.get("case_status") in {"已結案", "退案", "轉外轄"}
    readonly = status_readonly or access_readonly
    # 可重啟：案件因狀態唯讀（非權限限制），且目前使用者是主責或管理員
    can_reopen = status_readonly and not access_readonly

    missing_fields = missing_required_fields(case)
    missing_field_names = {
        item["field"] for item in missing_fields if case.get("initial_edit_pending")
    }
    auto_filled_fields = get_auto_filled_fields_for_case(case.get("case_id"))
    grade_options = list(current_app.config.get("GRADE_RANK", {}).keys())
    if "教育轉銜" not in grade_options:
        grade_options.append("教育轉銜")

    is_initial_edit = bool(case.get("initial_edit_pending"))

    recommended_worker = None
    recommended_worker_label = None
    recommended_grade_blank = False
    if is_initial_edit and user["role"] == "admin":
        grade = case.get("service_grade") or case.get("original_grade")
        recommended_grade_blank = not grade
        pool = grade_to_pool(grade)
        top = get_assignment_recommendation(pool, count=1)["recommended"]
        if top:
            recommended_worker = top[0]["worker"]
            recommended_worker_label = top[0]["display_name"]

    pdf_raw_text = None
    if case.get("case_id"):
        pdf_rec = _fetch_one(
            "SELECT raw_text FROM pdf_imports WHERE created_case_id = ? AND raw_text IS NOT NULL ORDER BY import_id DESC LIMIT 1",
            [case["case_id"]],
        )
        if pdf_rec and pdf_rec["raw_text"]:
            pdf_raw_text = pdf_rec["raw_text"]

    def field_class(field: str) -> str:
        if field in auto_filled_fields:
            return "field-auto-filled"
        if field in missing_field_names:
            return "field-required-empty"
        if is_initial_edit and not readonly:
            return "field-needs-manual"
        return ""

    duplicate_cases = []
    if not is_new and case.get("case_id") and case.get("id_card"):
        duplicate_cases = find_same_person_cases(
            case["case_id"], case["id_card"]
        )

    return dict(
        user=user,
        case=case,
        history=history,
        readonly=readonly,
        can_reopen=can_reopen,
        is_initial_edit=is_initial_edit,
        recommended_worker=recommended_worker,
        recommended_worker_label=recommended_worker_label,
        recommended_grade_blank=recommended_grade_blank,
        process_modes=process_modes,
        selected_mode=mode,
        workers=list_active_workers(),
        missing_fields=missing_fields,
        auto_filled_fields=auto_filled_fields,
        field_class=field_class,
        pending_confirmation=(
            get_pending_for_case(case["case_id"]) if case.get("case_id") else None
        ),
        grade_options=grade_options,
        relations=(
            get_relations_for_case(case["case_id"]) if case.get("case_id") else []
        ),
        relation_types=RELATION_TYPES,
        pdf_raw_text=pdf_raw_text,
        duplicate_cases=duplicate_cases,
        error=error,
        is_new=is_new,
    )


def render_process(
    case: dict,
    user: dict,
    history: list[dict],
    error: str | None = None,
    selected_mode: str | None = None,
    is_new: bool = False,
    access_readonly: bool = False,
):
    """Render 手動新增個案頁（process.html 廢止後，唯一 caller 為 cases.new_case 的新建流程）。"""
    ctx = build_case_context(
        case=case,
        user=user,
        history=history,
        error=error,
        selected_mode=selected_mode,
        is_new=is_new,
        access_readonly=access_readonly,
    )
    return render_template("cases/new_case.html", **ctx)

import sys
from __future__ import annotations

import json
import math
import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
GEN = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / ".codex" / "generated_images"   # image_gen 產出資料夾；用法：python process_assets.py <資料夾>

PALETTE = {
    "coral": "#FF6B6B",
    "mint": "#1FBFA8",
    "sun": "#FFC24B",
    "sky": "#3DA5F5",
    "lavender": "#A77BEA",
}

GENERATED = [
    "ig_0f04c7d2a439f432016ac5c36c0fe087d0ac15b0c2673b0779.png",
    "ig_0f04c7d2a439f432016ac5c3d18b3c87d0861b6163789acc80.png",
    "ig_0f04c7d2a439f432016ac5c403099487d08668657458881161.png",
    "ig_0f04c7d2a439f432016ac5c42d1bc487d0b4d14952d6b792f0.png",
    "ig_0f04c7d2a439f432016ac5c476584087d08dbbc8d7e0818b00.png",
    "ig_0f04c7d2a439f432016ac5c4c3e3cc87d0b8bc281c6aa19961.png",
    "ig_0f04c7d2a439f432016ac5c50f757c87d084f222b870ec02a1.png",
    "ig_0f04c7d2a439f432016ac5c54aad2487d0a7efb4bb499d3029.png",
    "ig_0f04c7d2a439f432016ac5c59443dc87d0a5f1393ec6dca1da.png",
    "ig_0f04c7d2a439f432016ac5c5c6db7887d09b97b8445fea5b65.png",
    "ig_0f04c7d2a439f432016ac5c5f6fde887d0ab2df71119f7d980.png",
    "ig_0f04c7d2a439f432016ac5c622728087d0bd84321c81633aa0.png",
    "ig_0f04c7d2a439f432016ac5c6515d6487d0b77e3ed1be11272e.png",
    "ig_0f04c7d2a439f432016ac5c686c8a487d0b1e33e4677a28a35.png",
    "ig_0f04c7d2a439f432016ac5c6a4905487d0ad761bd0a6f06b83.png",
    "ig_0f04c7d2a439f432016ac5c6c46a6c87d0b8eb6af49d73178c.png",
    "ig_0f04c7d2a439f432016ac5c6e70ebc87d0bad3b916a0a35ead.png",
    "ig_0f04c7d2a439f432016ac5c71bbea487d08bab679f3a3948dc.png",
    "ig_0f04c7d2a439f432016ac5c740883087d099735bd7865ccc1a.png",
    "ig_0f04c7d2a439f432016ac5c762333487d0a6d62dfe06eafe18.png",
    "ig_0f04c7d2a439f432016ac5c7af363c87d0bf85169898e6aa11.png",
    "ig_0f04c7d2a439f432016ac5c7cffce487d0b2635626bdea5a6a.png",
    "ig_0f04c7d2a439f432016ac5c7f0b96487d0a24b6f778e420e9d.png",
    "ig_0f04c7d2a439f432016ac5c816690487d09b65241c6f803bb8.png",
    "ig_0f04c7d2a439f432016ac5c832936087d0bf2cac293258880c.png",
    "ig_0f04c7d2a439f432016ac5c859ac4087d0beee22aa962a2b00.png",
    "ig_0f04c7d2a439f432016ac5c881bea887d0a611195efbd92941.png",
    "ig_0f04c7d2a439f432016ac5c8b0abdc87d0be29db143a6da63b.png",
    "ig_0f04c7d2a439f432016ac5c8d9cfd087d0ab99432ccf0385de.png",
    "ig_0f04c7d2a439f432016ac5c921ad5c87d0a3f79a0ee02f9ea8.png",
    "ig_0f04c7d2a439f432016ac5c94e4ecc87d0af3014383e853a75.png",
    "ig_0f04c7d2a439f432016ac5c9d51d0087d080e5f892cb0b9be5.png",
]

ICON_GROUPS = [
    ("導覽與系統", "icons_01_navigation_system.png", [
        ("home", "首頁", "導覽首頁"),
        ("search", "搜尋", "查找資料"),
        ("settings", "設定齒輪", "系統設定"),
        ("menu", "選單", "展開導覽"),
        ("user", "使用者", "個人資料"),
        ("team", "團隊", "多人合作"),
        ("notification", "通知鈴", "提醒通知"),
        ("help", "說明問號", "協助說明"),
        ("info", "資訊", "補充資訊"),
        ("logout", "登出門", "登出"),
        ("lock", "鎖", "鎖定"),
        ("key", "鑰匙", "權限金鑰"),
        ("shield", "盾牌", "安全保護"),
        ("eye", "眼睛", "查看"),
        ("refresh", "重新整理", "重新載入"),
        ("filter", "篩選漏斗", "篩選資料"),
    ]),
    ("檔案與資料", "icons_02_files_data.png", [
        ("folder", "資料夾", "分類收納"),
        ("document", "文件", "文件檔案"),
        ("upload", "上傳", "上傳檔案"),
        ("download", "下載", "下載檔案"),
        ("print", "列印", "列印輸出"),
        ("export", "匯出", "匯出資料"),
        ("import", "匯入", "匯入資料"),
        ("spreadsheet", "試算表格子", "表格資料"),
        ("database", "資料庫", "資料儲存"),
        ("cloud", "雲端", "雲端同步"),
        ("link", "連結", "超連結"),
        ("paperclip", "迴紋針", "附件"),
        ("archive", "封存箱", "封存"),
        ("trash", "垃圾桶", "刪除"),
        ("copy", "複製", "複製項目"),
        ("clipboard", "剪貼簿", "貼上或檢核"),
    ]),
    ("動作與狀態", "icons_03_actions_status.png", [
        ("add", "新增加號", "新增"),
        ("edit", "編輯鉛筆", "編輯"),
        ("check", "勾勾完成", "完成"),
        ("close", "叉叉關閉", "關閉"),
        ("warning", "警告三角", "警示"),
        ("error", "錯誤驚嘆號", "錯誤"),
        ("save", "儲存磁片", "儲存"),
        ("temp_clock", "暫存時鐘", "暫存"),
        ("sync", "同步雙箭頭", "同步"),
        ("sort", "排序", "排序"),
        ("drag", "拖曳把手", "拖曳排序"),
        ("expand", "展開", "展開內容"),
        ("collapse", "收合", "收合內容"),
        ("star", "星星", "收藏"),
        ("heart", "愛心", "喜愛或關懷"),
        ("flag", "旗子", "標記"),
    ]),
    ("溝通與時間", "icons_04_communication_time.png", [
        ("chat", "對話氣泡", "留言"),
        ("chats", "雙對話氣泡", "討論串"),
        ("mail", "信封", "郵件"),
        ("phone", "電話", "電話聯繫"),
        ("video", "視訊", "視訊會議"),
        ("microphone", "麥克風", "語音"),
        ("megaphone", "公告大聲公", "公告"),
        ("calendar", "日曆", "日期"),
        ("clock", "時鐘", "時間"),
        ("alarm", "鬧鐘", "提醒時間"),
        ("hourglass", "沙漏", "等待"),
        ("calendar_check", "行事曆勾", "已安排"),
        ("pin", "地圖釘", "地點"),
        ("map", "地圖", "地圖資訊"),
        ("route", "路線", "動線"),
        ("car", "車子", "交通"),
    ]),
    ("人與服務", "icons_05_people_service.png", [
        ("family", "家庭", "家庭服務"),
        ("elder", "長者", "長者服務"),
        ("child", "兒童", "兒童服務"),
        ("wheelchair", "輪椅使用者", "無障礙服務"),
        ("holding_hands", "手牽手", "陪伴"),
        ("handshake", "握手", "合作"),
        ("heart_hands", "愛心手", "關懷"),
        ("house", "房子", "居住"),
        ("school", "學校", "學習"),
        ("medical_kit", "醫療箱", "健康支援"),
        ("pill", "藥丸", "用藥"),
        ("meal", "餐點", "餐食"),
        ("cane", "輔具拐杖", "輔具"),
        ("volunteer_vest", "志工背心", "志工"),
        ("medal", "勳章", "獎勵"),
        ("gift", "禮物", "物資或禮品"),
    ]),
    ("工作與分析", "icons_06_work_analysis.png", [
        ("bar_chart", "長條圖", "統計"),
        ("pie_chart", "圓餅圖", "比例"),
        ("line_chart", "折線圖", "趨勢"),
        ("table", "表格", "表格檢視"),
        ("list", "清單", "清單"),
        ("kanban", "看板欄", "看板"),
        ("target", "目標靶心", "目標"),
        ("trophy", "獎盃", "成果"),
        ("bulb", "燈泡", "想法"),
        ("rocket", "火箭", "啟動"),
        ("puzzle", "拼圖", "整合"),
        ("wrench", "扳手", "維修"),
        ("ai_sparkle", "AI 閃光", "AI 輔助"),
        ("robot", "機器人", "自動化"),
        ("survey", "問卷板", "問卷"),
        ("signature_pen", "簽名筆", "簽署"),
    ]),
]

CHARACTER_SHEETS = [
    ("characters_01_roles.png", [
        ("worker_tablet", "工作者拿平板", "工作者、服務人員"),
        ("supervisor_clipboard", "主管拿板夾", "督導或管理者"),
        ("elder_cane", "長者拄拐杖", "長者情境"),
        ("child", "孩子", "兒童情境"),
        ("wheelchair_user", "輪椅使用者", "無障礙情境"),
        ("caregiver_wheelchair", "照顧者推輪椅", "照顧支持"),
        ("parent_child", "家長牽孩子", "親子情境"),
        ("volunteer", "志工", "志願服務"),
    ]),
    ("characters_02_actions.png", [
        ("wave", "揮手打招呼", "歡迎或開場"),
        ("thumbs_up", "比讚", "肯定完成"),
        ("thinking", "思考", "待判斷"),
        ("celebrate", "慶祝", "成功完成"),
        ("laptop_work", "看筆電工作", "工作處理"),
        ("point_right", "指向右邊", "導引介紹"),
        ("confused", "困惑", "需要協助"),
        ("sleeping", "睡覺", "休息或暫停"),
    ]),
]

DECOR_SHEETS = [
    ("decor_01_basic.png", [
        ("dot_cluster", "圓點群", "背景點綴"),
        ("wave_line", "波浪線", "活潑分隔"),
        ("semicircle", "半圓", "幾何裝飾"),
        ("capsule", "膠囊", "幾何裝飾"),
        ("spark_three", "閃光三條線", "重點提示"),
        ("starburst", "星芒", "慶祝或強調"),
        ("confetti", "彩帶碎片", "完成或活動"),
        ("rounded_triangle", "圓角三角", "幾何裝飾"),
        ("arc", "弧線", "角落或導引"),
        ("ring", "小圓環", "背景點綴"),
        ("cloud", "雲朵", "柔和空白"),
        ("leaf", "葉子", "自然點綴"),
    ]),
    ("decor_02_shapes.png", [
        ("heart_bubbles", "愛心泡泡", "關懷或喜愛"),
        ("chat_shape", "對話框形狀", "留言背景"),
        ("arrow_doodle", "箭頭塗鴉", "導引"),
        ("stamp_frame", "圓形印章框", "徽章底"),
        ("blob_coral", "斑點 blob 珊瑚", "背景色塊"),
        ("blob_mint", "斑點 blob 薄荷", "背景色塊"),
        ("blob_sun", "斑點 blob 陽光", "背景色塊"),
        ("blob_sky", "斑點 blob 晴空", "背景色塊"),
        ("corner_lace_a", "角落花邊 A", "卡片角落"),
        ("corner_lace_b", "角落花邊 B", "卡片角落"),
        ("divider_dashed", "分隔線 A", "內容分隔"),
        ("divider_wavy", "分隔線 B", "內容分隔"),
    ]),
]

BADGES = [
    ("new", "新", "新增或新項目"),
    ("hot", "熱門", "熱門項目"),
    ("done", "完成", "完成狀態"),
    ("pending", "待處理", "待辦或等待"),
    ("important", "重要", "重要提醒"),
    ("locked", "鎖定", "鎖定狀態"),
    ("draft", "草稿", "草稿狀態"),
    ("pinned", "置頂", "固定置頂"),
    ("read", "已讀", "已讀狀態"),
]

SPOTS = [
    ("spot_empty.png", "空白", "還沒有資料"),
    ("spot_no_results.png", "找不到結果", "搜尋無結果"),
    ("spot_success.png", "成功完成", "完成流程"),
    ("spot_error.png", "出錯了", "錯誤提示"),
    ("spot_offline.png", "沒有網路", "離線或連線失敗"),
    ("spot_loading.png", "載入等待", "載入中"),
    ("spot_welcome.png", "歡迎第一次使用", "首次使用"),
    ("spot_not_found.png", "找不到頁面", "404 或迷路"),
    ("spot_no_permission.png", "沒有權限", "權限不足"),
    ("spot_all_done.png", "全部處理完", "收件匣清空"),
    ("spot_maintenance.png", "維護中", "系統維護"),
    ("spot_syncing.png", "資料同步中", "同步資料"),
]

BACKGROUNDS = [
    ("banner_blank_left.png", "橫幅左圖", "左側插畫右側留白", (1600, 240)),
    ("banner_blank_right.png", "橫幅右圖", "右側插畫左側留白", (1600, 240)),
    ("hero_blank_rejected.png", "重生前首頁大圖", "不採用", (1440, 600)),
    ("hero_blank.png", "首頁大圖底", "登入或首頁", (1440, 600)),
    ("pattern_tile.png", "淡色底紋", "可拼接背景", (512, 512)),
    ("card_corner_a.png", "卡片角落 A", "卡片左上裝飾", (256, 256)),
    ("card_corner_b.png", "卡片角落 B", "卡片右下裝飾", (256, 256)),
]


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def ensure_dirs() -> None:
    for folder in ["_sheets", "_sheets/rejected", "icons", "characters", "spots", "decor", "markers", "backgrounds", "_check"]:
        (ROOT / folder).mkdir(parents=True, exist_ok=True)


def save_png(im: Image.Image, path: Path) -> None:
    im = im.convert("RGBA")
    try:
        pal = im.quantize(colors=255, method=Image.Quantize.FASTOCTREE)
        pal.save(path, optimize=True)
    except Exception:
        im.save(path, optimize=True)


def color_distance(a, b) -> float:
    return math.sqrt(sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)))


def remove_bg(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    pix = rgba.load()
    samples = [pix[0, 0], pix[w - 1, 0], pix[0, h - 1], pix[w - 1, h - 1]]
    bg = tuple(round(sum(s[i] for s in samples) / len(samples)) for i in range(3))
    visited = bytearray(w * h)
    q = deque()
    for x in range(w):
        q.append((x, 0))
        q.append((x, h - 1))
    for y in range(h):
        q.append((0, y))
        q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        idx = y * w + x
        if visited[idx]:
            continue
        visited[idx] = 1
        r, g, b, a = pix[x, y]
        is_bg = a < 24 or color_distance((r, g, b), bg) < 38 or color_distance((r, g, b), (255, 249, 242)) < 34 or color_distance((r, g, b), (255, 255, 255)) < 20
        if not is_bg:
            continue
        pix[x, y] = (r, g, b, 0)
        if x > 0:
            q.append((x - 1, y))
        if x + 1 < w:
            q.append((x + 1, y))
        if y > 0:
            q.append((x, y - 1))
        if y + 1 < h:
            q.append((x, y + 1))
    return trim_alpha(clean_alpha_noise(rgba))


def clean_alpha_noise(im: Image.Image) -> Image.Image:
    rgba = im.convert("RGBA")
    w, h = rgba.size
    alpha = rgba.getchannel("A")
    seen = bytearray(w * h)
    pix = rgba.load()
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if seen[idx] or alpha.getpixel((x, y)) < 20:
                continue
            q = deque([(x, y)])
            seen[idx] = 1
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not seen[nidx] and alpha.getpixel((nx, ny)) >= 20:
                            seen[nidx] = 1
                            q.append((nx, ny))
            if len(pts) < 14:
                for px, py in pts:
                    r, g, b, _ = pix[px, py]
                    pix[px, py] = (r, g, b, 0)
    return rgba


def trim_alpha(im: Image.Image) -> Image.Image:
    bbox = im.getchannel("A").getbbox()
    if not bbox:
        return Image.new("RGBA", (1, 1), (255, 255, 255, 0))
    return im.crop(bbox)


def fit_canvas(im: Image.Image, size: tuple[int, int], pad_ratio: float = 0.12, bg=(255, 255, 255, 0)) -> Image.Image:
    im = im.convert("RGBA")
    max_w = max(1, int(size[0] * (1 - pad_ratio * 2)))
    max_h = max(1, int(size[1] * (1 - pad_ratio * 2)))
    scale = min(max_w / im.width, max_h / im.height)
    new_size = (max(1, int(im.width * scale)), max(1, int(im.height * scale)))
    resized = im.resize(new_size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, bg)
    out.alpha_composite(resized, ((size[0] - new_size[0]) // 2, (size[1] - new_size[1]) // 2))
    return out


def copy_sources() -> dict[str, Path]:
    names = {}
    sheet_names = [
        "icons_01_navigation_system.png",
        "icons_02_files_data.png",
        "icons_03_actions_status.png",
        "icons_04_communication_time.png",
        "icons_05_people_service.png",
        "icons_06_work_analysis.png",
        "characters_01_roles.png",
        "characters_02_actions.png",
        "decor_01_basic.png",
        "decor_02_rejected.png",
        "marker_coral_source.png",
        "badges_01_status.png",
    ]
    for i, name in enumerate(sheet_names):
        target = ROOT / ("_sheets/rejected" if name.endswith("_rejected.png") else "_sheets") / name
        shutil.copyfile(GEN / GENERATED[i], target)
        names[name] = target
    spot_start = 12
    for offset, (filename, _, _) in enumerate(SPOTS):
        target = ROOT / "_sheets" / f"source_{filename}"
        shutil.copyfile(GEN / GENERATED[spot_start + offset], target)
        names[filename] = target
    bg_start = 24
    for offset, (filename, _, _, _) in enumerate(BACKGROUNDS):
        folder = "_sheets/rejected" if "rejected" in filename else "_sheets"
        target = ROOT / folder / f"source_{filename}"
        shutil.copyfile(GEN / GENERATED[bg_start + offset], target)
        names[filename] = target
    decor2_target = ROOT / "_sheets" / "decor_02_shapes.png"
    shutil.copyfile(GEN / GENERATED[31], decor2_target)
    names["decor_02_shapes.png"] = decor2_target
    return names


def grid_cell(im: Image.Image, grid: int, index: int) -> Image.Image:
    w, h = im.size
    cell_w = w / grid
    cell_h = h / grid
    row, col = divmod(index, grid)
    x0 = round(col * cell_w)
    y0 = round(row * cell_h)
    x1 = round((col + 1) * cell_w)
    y1 = round((row + 1) * cell_h)
    return im.crop((x0, y0, x1, y1))


def add_manifest(entries, path: Path, group: str, name_zh: str, use_zh: str, keywords: list[str]) -> None:
    with Image.open(path) as im:
        size = f"{im.width}x{im.height}"
    entries.append({
        "file": rel(path),
        "group": group,
        "name_zh": name_zh,
        "use_zh": use_zh,
        "size": size,
        "keywords": keywords,
    })


def process_grid_sheet(entries, source: Path, out_dir: str, group: str, items, grid: int, size: tuple[int, int], count: int | None = None) -> None:
    im = Image.open(source).convert("RGBA")
    take = count if count is not None else len(items)
    for i, (slug, zh, use) in enumerate(items[:take]):
        cell = grid_cell(im, grid, i)
        cut = fit_canvas(remove_bg(cell), size)
        out = ROOT / out_dir / f"{slug}.png"
        save_png(cut, out)
        add_manifest(entries, out, group, zh, use, [slug, zh, use, group])


def process_spots(entries, sources: dict[str, Path]) -> None:
    for filename, zh, use in SPOTS:
        cut = fit_canvas(remove_bg(Image.open(sources[filename])), (800, 600), pad_ratio=0.08)
        out = ROOT / "spots" / filename
        save_png(cut, out)
        add_manifest(entries, out, "情境插畫", zh, use, [filename.replace(".png", ""), zh, use, "spot"])


def process_backgrounds(entries, sources: dict[str, Path]) -> None:
    for filename, zh, use, size in BACKGROUNDS:
        if "rejected" in filename:
            continue
        src = Image.open(sources[filename]).convert("RGBA")
        if filename.startswith("card_corner"):
            out_im = fit_canvas(remove_bg(src), size, pad_ratio=0.02)
        elif filename == "pattern_tile.png":
            crop_side = min(src.size)
            left = (src.width - crop_side) // 2
            top = (src.height - crop_side) // 2
            out_im = src.crop((left, top, left + crop_side, top + crop_side)).resize(size, Image.Resampling.LANCZOS)
        else:
            cream = Image.new("RGBA", src.size, (255, 249, 242, 255))
            cream.alpha_composite(src)
            out_im = cream.resize(size, Image.Resampling.LANCZOS)
        out = ROOT / "backgrounds" / filename
        save_png(out_im, out)
        add_manifest(entries, out, "背景", zh, use, [filename.replace(".png", ""), zh, use, "background"])


def process_markers(entries, source: Path) -> None:
    base = fit_canvas(remove_bg(Image.open(source)), (160, 120), pad_ratio=0.02)
    src = base.convert("RGBA")
    for slug, hex_color in PALETTE.items():
        target = tuple(int(hex_color[i:i + 2], 16) for i in (1, 3, 5))
        recolored = Image.new("RGBA", src.size, (0, 0, 0, 0))
        sp = src.load()
        rp = recolored.load()
        for y in range(src.height):
            for x in range(src.width):
                r, g, b, a = sp[x, y]
                if a == 0:
                    continue
                if r > 180 and g < 150 and b < 150:
                    rp[x, y] = (*target, a)
                else:
                    rp[x, y] = (r, g, b, a)
        out = ROOT / "markers" / f"marker_{slug}.png"
        save_png(recolored, out)
        add_manifest(entries, out, "標記", f"{slug} 小標籤", "卡片頂端特殊標記", [slug, "marker", "特殊標記"])


def make_icons_check() -> None:
    icons = sorted((ROOT / "icons").glob("*.png"))
    thumb = 32
    cols = 16
    rows = math.ceil(len(icons) / cols)
    out = Image.new("RGBA", (cols * 48, rows * 48), (255, 249, 242, 255))
    for i, path in enumerate(icons):
        im = Image.open(path).convert("RGBA").resize((thumb, thumb), Image.Resampling.LANCZOS)
        x = (i % cols) * 48 + 8
        y = (i // cols) * 48 + 8
        out.alpha_composite(im, (x, y))
    save_png(out, ROOT / "_check" / "icons_32.png")


def main() -> None:
    ensure_dirs()
    entries = []
    sources = copy_sources()
    for group, source_name, items in ICON_GROUPS:
        process_grid_sheet(entries, sources[source_name], "icons", group, items, 4, (256, 256))
    for source_name, items in CHARACTER_SHEETS:
        process_grid_sheet(entries, sources[source_name], "characters", "人物角色", items, 3, (512, 512), count=8)
    for source_name, items in DECOR_SHEETS:
        process_grid_sheet(entries, sources[source_name], "decor", "裝飾元素", items, 4, (256, 256), count=12)
    process_grid_sheet(entries, sources["badges_01_status.png"], "markers", "徽章", BADGES, 3, (256, 256), count=9)
    process_markers(entries, sources["marker_coral_source.png"])
    process_spots(entries, sources)
    process_backgrounds(entries, sources)
    make_icons_check()
    (ROOT / "manifest.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"manifest entries={len(entries)}")


if __name__ == "__main__":
    main()

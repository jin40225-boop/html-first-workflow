-- ============================================================================
-- 親職報名表改為 01_v3 定稿結構（2026-08-04 Phase 2）
--
-- 依據：重構審閱稿 01_前台_親職諮詢報名頁_v3.html、裁決 10。
-- 本次啟用表單引擎新增能力：
--   stage        多階段（階段一選時段、階段二填資料、確認頁由引擎提供）
--   group        孩子可增減多筆（subFields 為每位孩子的欄位）
--   visibleWhen  條件顯示（身份選「其他」才出現說明欄等）
--   radio        chip 樣式單選（出席方式、聯繫方式）
--
-- ⚠ 欄位結構變更說明：
--   原本的平面孩子欄位（childName／childGender／childAge／childGrade／childStatus／
--   childMedication／childOtherConditions）由 `children` 群組取代。既有 97 筆報名的
--   answers 仍保留舊 key，後台會在「其他欄位」區塊顯示，不會遺失資料。
--
-- 冪等：可重複執行。
-- ============================================================================

alter table public.form_schemas add column if not exists stages jsonb;
comment on column public.form_schemas.stages is
  '多階段表單的階段標題。每筆 {stage, title, intro}；空值代表單一階段。';

update public.form_schemas fs
set stages = '[
  {"stage":1,"title":"服務說明・選時段","intro":"每月限定 3 個名額，報名截止為各場次活動前一週 23:59。灰色時段＝已額滿或已截止，由系統自動判斷。先確認有合適時段，再開始填寫資料，不浪費您的時間。"},
  {"stage":2,"title":"家長與孩子狀況","intro":"🤝 珍惜公益資源：本服務名額有限，報名確認後請記得出席；若臨時有狀況，請提前來信請假或延後改約，把機會留給每一位需要的家長。"}
]'::jsonb,
    fields = '[
  {"key":"preferredSlots","label":"欲報名場次與時段","type":"multiselect","required":true,"stage":1,"options":[]},

  {"key":"parentName","label":"報名家長姓名","type":"text","required":true,"stage":2,"helpText":"真實姓名（僅工作團隊可見）"},
  {"key":"preferredName","label":"希望如何被稱呼","type":"text","required":true,"stage":2,"helpText":"例：小安媽媽"},
  {"key":"relationship","label":"與孩子的關係（身份）","type":"select","required":true,"stage":2,"options":["父","母","祖父","祖母","親戚","主要照顧者","其他"]},
  {"key":"relationshipOther","label":"請說明您與孩子的關係","type":"text","required":true,"stage":2,
   "visibleWhen":{"key":"relationship","equals":["其他"]},"helpText":"例：安親班老師、家庭朋友"},
  {"key":"familyType","label":"家庭型態","type":"text","required":true,"stage":2,"helpText":"請自行描述，例：雙親家庭／單親（媽媽）／隔代教養"},
  {"key":"familyDesc","label":"家中組成描述","type":"textarea","required":true,"stage":2,"helpText":"請簡要談談家中同住的有誰、孩子有幾個手足、排行第幾等等資訊"},
  {"key":"email","label":"電子信箱","type":"email","required":true,"stage":2,"helpText":"通知信將寄到這裡，請再三確認"},
  {"key":"phone","label":"聯繫手機號碼","type":"phone","required":true,"stage":2},

  {"key":"attendMode","label":"當天線上諮詢的出席方式","type":"radio","required":true,"stage":2,"options":["單獨出席","與他人一同出席"]},
  {"key":"attendWith","label":"與您一同出席的對象","type":"text","required":true,"stage":2,
   "visibleWhen":{"key":"attendMode","equals":["與他人一同出席"]},"helpText":"例：配偶、孩子本人、祖母"},
  {"key":"contactTimes","label":"方便聯繫時間（可複選）","type":"multiselect","required":true,"stage":2,"options":["早上","中午","下午","晚間","其他（自填）"]},
  {"key":"contactTimeNote","label":"方便聯繫時間（請自填）","type":"text","required":true,"stage":2,
   "visibleWhen":{"key":"contactTimes","equals":["其他（自填）"]},"helpText":"例：平日 12:00–13:00 午休時間"},
  {"key":"contactMethod","label":"方便聯繫方式","type":"radio","required":true,"stage":2,"options":["手機","電子信箱","官方 LINE","不拘"],
   "helpText":"📌 團隊以電子信箱為主要通知管道，官方 LINE 為宣導用。若家長有指定聯繫方式，我們才會更改通知形式。"},

  {"key":"children","label":"孩子的狀況","type":"group","required":true,"stage":2,
   "minItems":1,"maxItems":8,"itemLabel":"孩子","addLabel":"＋ 新增一位孩子",
   "helpText":"請逐一填寫每位孩子；按「＋ 新增一位孩子」即可增加欄位。以需要協助的孩子為主要諮詢對象。",
   "subFields":[
     {"key":"alias","label":"孩子代號","type":"text","required":true,"helpText":"暱稱即可，例：小恩"},
     {"key":"gender","label":"性別","type":"select","required":true,"options":["男","女","其他／不便透露"]},
     {"key":"age","label":"年齡","type":"text","required":true,"helpText":"例：8"},
     {"key":"grade","label":"年級／就學狀況","type":"text","required":false,"helpText":"幾年級／何種班級／IEP 或自學等等均可填寫"},
     {"key":"diagnosis","label":"診斷狀況","type":"select","required":true,"options":["已確診","未確診但懷疑","評估中","其他（於現況說明）"]},
     {"key":"medication","label":"是否服藥","type":"select","required":true,"options":["目前服藥中","曾服藥，現已停止","未曾服藥","不確定"]},
     {"key":"otherConditions","label":"有無其他疾病史","type":"text","required":false,"helpText":"無則免填。例：妥瑞、癲癇、氣喘"},
     {"key":"currentStatus","label":"目前現況","type":"textarea","required":true,"helpText":"例：目前小二，學業與人際皆有狀況…（描述越具體，我們越能提前準備）"}
   ]},

  {"key":"issueDesc","label":"如果這一小時的諮詢只能優先處理一件事，您最希望是什麼？","type":"textarea","required":true,"stage":2,"helpText":"請具體描述您最想解決的困擾或最想獲得的協助"},
  {"key":"consultTopics","label":"主要諮詢議題（可複選）","type":"multiselect","required":false,"stage":2,
   "options":["學校適應","家庭管教","藥物治療","情緒管理","專注力訓練","行為問題","社交技巧","其他"],
   "helpText":"選填，幫助我們媒合合適的夥伴。"},
  {"key":"note","label":"留言","type":"textarea","required":false,"stage":2}
]'::jsonb,
    updated_at = now()
from public.projects p
where p.slug = 'parent' and fs.project_id = p.id;

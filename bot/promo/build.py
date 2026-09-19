"""Генератор промо-картинок бота VOVCHOK ACADEMY (HTML → headless Chrome → PNG).

Запуск:  python /app/bot/promo/build.py
Результат: /app/bot/assets/{access,inside,modules,mentor}_{ru,uk,ar}.png
"""
import os
import subprocess
import tempfile
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "assets"
W, H = 1672, 941
CHROME = next((p for p in ("/root/bin/chromium", "/usr/bin/google-chrome", "/usr/bin/chromium") if os.path.exists(p)), "google-chrome")

CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{width:%(W)spx;height:%(H)spx;background:#03060e;color:#e9f3ff;overflow:hidden;position:relative;
  font-family:Montserrat,'Noto Sans Arabic',sans-serif;-webkit-font-smoothing:antialiased}
.bg,.bg i{position:absolute;inset:0}
.bg{background:
  radial-gradient(900px 600px at 12%% -10%%,rgba(37,110,255,.30),transparent 70%%),
  radial-gradient(900px 620px at 92%% 8%%,rgba(120,60,255,.22),transparent 70%%),
  radial-gradient(1200px 700px at 50%% 120%%,rgba(20,110,255,.20),transparent 70%%),
  linear-gradient(180deg,#040814,#02040b 60%%,#04070f)}
.bg i.grid{background-image:linear-gradient(rgba(90,160,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(90,160,255,.06) 1px,transparent 1px);
  background-size:84px 84px;mask-image:radial-gradient(1000px 600px at 50%% 40%%,#000 25%%,transparent 85%%)}
.bg i.rays{background:conic-gradient(from 200deg at 50%% -20%%,transparent 0 40%%,rgba(70,150,255,.10) 45%%,transparent 55%%)}
.wrap{position:relative;height:100%%;padding:46px 54px 40px;display:flex;flex-direction:column}
.head{text-align:center;margin-bottom:26px}
h1{font-size:%(h1)spx;font-weight:900;letter-spacing:2px;line-height:1;text-transform:uppercase;
  background:linear-gradient(180deg,#ffffff 12%%,#cfe6ff 46%%,#2f86ff 100%%);-webkit-background-clip:text;color:transparent;
  filter:drop-shadow(0 6px 30px rgba(47,134,255,.55))}
h1 b{background:linear-gradient(180deg,#eafaff,#7de0ff 55%%,#8a5cff);-webkit-background-clip:text;color:transparent;font-weight:900}
.sub{margin-top:16px;font-size:30px;font-weight:500;color:#a8ccf5}
.chips{margin:20px auto 0;display:inline-flex;gap:14px;padding:12px 22px;border:1px solid rgba(90,170,255,.35);border-radius:999px;
  background:rgba(8,18,38,.6);box-shadow:0 0 34px rgba(40,120,255,.25),inset 0 0 22px rgba(40,120,255,.12);font-size:22px;color:#bfe0ff;font-weight:600}
.chips span+span:before{content:'•';margin-inline-end:14px;color:#3f8fe0}
.row{display:flex;gap:22px;align-items:stretch;height:430px}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;flex:1}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px 20px;align-content:space-evenly;flex:1}
.mini{margin-top:auto;display:flex;align-items:flex-end;gap:7px;height:92px}
.mini i{flex:1;border-radius:3px;background:linear-gradient(180deg,#3ab2ff,#0b53c9);box-shadow:0 0 14px rgba(60,160,255,.55)}
.mini i.g{background:linear-gradient(180deg,#3dffa8,#0c8f57);box-shadow:0 0 14px rgba(60,255,168,.45)}
.mini i.d{background:linear-gradient(180deg,#8ab4e8,#2b4f8a);opacity:.55;box-shadow:none}
.band{margin-top:22px;padding:20px 30px;border-radius:24px;display:flex;align-items:center;justify-content:space-between;gap:18px;
  background:linear-gradient(90deg,rgba(10,22,48,.92),rgba(6,12,26,.75));border:1px solid rgba(86,166,255,.3);
  box-shadow:inset 0 0 34px rgba(30,100,220,.14),0 14px 40px rgba(0,0,0,.45)}
.band .it{display:flex;align-items:center;gap:12px;font-size:22px;font-weight:700;color:#cfe6ff}
.band .it em{font-size:32px;font-style:normal;filter:drop-shadow(0 0 14px rgba(80,170,255,.5))}
.card{position:relative;border-radius:26px;padding:26px 26px 24px;overflow:hidden;display:flex;flex-direction:column;
  background:linear-gradient(180deg,rgba(14,30,60,.86),rgba(5,11,24,.92));
  border:1px solid rgba(86,166,255,.34);
  box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 0 40px rgba(30,100,220,.16)}
.card:after{content:'';position:absolute;left:18px;right:18px;top:0;height:2px;border-radius:2px;
  background:linear-gradient(90deg,transparent,#57b4ff,transparent);opacity:.9;filter:blur(.3px)}
.num{width:74px;height:74px;border-radius:50%%;display:grid;place-items:center;font-size:38px;font-weight:800;color:#dff0ff;
  border:2px solid rgba(90,180,255,.85);background:radial-gradient(circle at 50%% 30%%,rgba(60,140,255,.45),rgba(8,20,45,.9));
  box-shadow:0 0 30px rgba(69,166,255,.55),inset 0 0 18px rgba(120,200,255,.35)}
.ttl{font-size:27px;font-weight:800;letter-spacing:.4px;color:#ffffff;text-transform:uppercase;line-height:1.15}
.desc{font-size:21px;line-height:1.45;color:#9db6d6;font-weight:500}
.emo{font-size:46px;line-height:1;filter:drop-shadow(0 0 16px rgba(80,170,255,.5))}
.top{display:flex;align-items:center;gap:18px;margin-bottom:16px}
.foot{margin-top:26px;display:flex;align-items:center;justify-content:center;gap:18px}
.quote{font-family:Caveat,Montserrat,'Noto Sans Arabic',cursive;font-size:44px;color:#a9d6ff;
  text-shadow:0 0 24px rgba(70,150,255,.45)}
.brand{font-size:20px;letter-spacing:5px;font-weight:800;color:#6fb2ff;text-transform:uppercase}
.mrow{display:flex;align-items:center;gap:16px}
.mnum{min-width:52px;height:52px;border-radius:14px;display:grid;place-items:center;font-size:24px;font-weight:800;color:#cfe8ff;
  border:1px solid rgba(90,180,255,.55);background:linear-gradient(180deg,rgba(32,76,150,.6),rgba(8,18,40,.8));box-shadow:0 0 18px rgba(60,150,255,.35)}
.mname{font-size:24px;font-weight:700;color:#e7f2ff;line-height:1.2}
.mcard{padding:18px 20px;border-radius:20px;background:linear-gradient(180deg,rgba(12,26,54,.8),rgba(5,11,24,.9));
  border:1px solid rgba(86,166,255,.28);box-shadow:inset 0 0 28px rgba(30,100,220,.14)}
.big .ttl{font-size:32px}
.big .emo{font-size:62px}
.tag{display:inline-block;margin-top:14px;font-size:19px;font-weight:700;color:#7ce0c0;border:1px solid rgba(80,230,180,.4);
  border-radius:999px;padding:6px 14px;background:rgba(10,40,34,.5)}
[dir=rtl] .chips span+span:before{margin-inline-end:0;margin-inline-start:14px}
""" % {"W": W, "H": H, "h1": 86}


def page(lang: str, body: str, h1_size: int | None = None) -> str:
    extra = f"h1{{font-size:{h1_size}px}}" if h1_size else ""
    rtl = ' dir="rtl"' if lang == "ar" else ""
    return f"""<!doctype html><html lang="{lang}"{rtl}><head><meta charset="utf-8"><style>{CSS}{extra}</style></head>
<body><div class="bg"><i class="grid"></i><i class="rays"></i></div><div class="wrap">{body}</div></body></html>"""


def head(title: str, sub: str, chips: list[str] | None = None) -> str:
    c = f'<div class="chips">{"".join(f"<span>{x}</span>" for x in chips)}</div>' if chips else ""
    return f'<div class="head"><h1>{title}</h1><div class="sub">{sub}</div>{c}</div>'


def foot(quote: str) -> str:
    return f'<div class="foot"><span class="brand">🐺 Vovchok Academy</span><span class="quote">{quote}</span></div>'


def mini(seed: int) -> str:
    hs = [34, 56, 44, 70, 50, 78, 60, 88, 72, 96]
    cls = ["", "g", "", "d", "g", ""]
    bars = "".join(f'<i class="{cls[(i + seed) % len(cls)]}" style="height:{hs[(i * 3 + seed) % len(hs)]}%"></i>' for i in range(10))
    return f'<div class="mini">{bars}</div>'


def band(items) -> str:
    return '<div class="band">' + "".join(f'<div class="it"><em>{e}</em>{t}</div>' for e, t in items) + "</div>"


TXT = {
    "ru": {
        "access_t": "Как получить <b>доступ</b>",
        "access_s": "4 простых шага — и вся академия в твоём Telegram",
        "steps": [
            ("🚀", "Запусти бота", "Нажми /start и выбери язык — Волчок дальше говорит на нём"),
            ("📣", "Подпишись на канал", "Единственное условие входа — подписка на главный канал академии"),
            ("🎓", "Открой академию", "Жми «Войти в академию» — мини-приложение открывается внутри Telegram"),
            ("🔥", "Пройди модуль 1", "Первые уроки, практика на графике и первые XP — уже сегодня"),
        ],
        "access_q": "Знания сегодня — свобода завтра",
        "band": [("📚", "12 модулей"), ("🎯", "Practice Lab"), ("🤖", "AI-наставник"), ("⭐", "XP и уровни")],
        "band2": [("⚠️", "Обучение, а не сигналы"), ("🌍", "3 языка"), ("☁️", "Прогресс в облаке")],
        "inside_t": "Что внутри <b>академии</b>",
        "inside_s": "Полноценное обучение трейдингу — прямо в Telegram, без сторонних сайтов",
        "inside_c": ["12 модулей", "50 уроков", "13 практик", "3 языка"],
        "tiles": [
            ("📚", "12 модулей", "От японских свечей и таймфреймов до психологии и входа в сделку"),
            ("🎯", "Practice Lab", "Живые сценарии графика: 4 варианта решения, проверка и разбор ошибки"),
            ("🤖", "Волчок-наставник", "ИИ отвечает на любой вопрос и объясняет, почему ответ неверный"),
            ("⭐", "XP, уровни, достижения", "5 уровней, 8 достижений, серия дней и слабые темы для повтора"),
            ("☁️", "Прогресс в облаке", "XP, серия и достижения хранятся на сервере — не теряются при смене устройства"),
            ("🌍", "3 языка", "Русский, Українська, العربية — включая правильную RTL-вёрстку"),
        ],
        "inside_q": "Всё обучение — в одном окне",
        "mod_t": "Программа <b>академии</b>",
        "mod_s": "12 модулей · 50 уроков · практика после каждого блока",
        "mod_q": "Шаг за шагом — от свечи до системы",
        "mentor_t": "Волчок — <b>наставник</b>",
        "mentor_s": "Искусственный интеллект внутри бота и практики. Без сигналов — только обучение",
        "mentor_c": ["Ответ на любой вопрос", "Разбор ошибок", "Цитата дня"],
        "mentor_cards": [
            ("💬", "Спроси в чате", "Напиши боту вопрос по трейдингу — Волчок ответит как наставник, коротко и по делу"),
            ("🧠", "Разбор ошибки", "В практике жми «Спросить Волчка, почему» — ИИ объяснит именно твой неверный выбор"),
            ("⏳", "Три решения", "Вверх, Вниз или Ждать. Волчок учит выбирать, а не угадывать"),
        ],
        "mentor_q": "Наставник рядом 24/7",
        "modules": ["Основы трейдинга", "Японские свечи", "Таймфреймы", "Тренд", "Уровни", "Развороты", "Индикаторы", "Сигналы и чеклист", "Психология", "Вход в сделку", "Живая практика", "Путь к свободе"],
    },
    "uk": {
        "access_t": "Як отримати <b>доступ</b>",
        "access_s": "4 простих кроки — і вся академія у твоєму Telegram",
        "steps": [
            ("🚀", "Запусти бота", "Натисни /start і обери мову — Вовчик далі говорить нею"),
            ("📣", "Підпишись на канал", "Єдина умова входу — підписка на головний канал академії"),
            ("🎓", "Відкрий академію", "Тисни «Увійти в академію» — міні-застосунок відкривається всередині Telegram"),
            ("🔥", "Пройди модуль 1", "Перші уроки, практика на графіку і перші XP — вже сьогодні"),
        ],
        "access_q": "Знання сьогодні — свобода завтра",
        "band": [("📚", "12 модулів"), ("🎯", "Practice Lab"), ("🤖", "AI-наставник"), ("⭐", "XP і рівні")],
        "band2": [("⚠️", "Навчання, а не сигнали"), ("🌍", "3 мови"), ("☁️", "Прогрес у хмарі")],
        "inside_t": "Що всередині <b>академії</b>",
        "inside_s": "Повноцінне навчання трейдингу — просто в Telegram, без сторонніх сайтів",
        "inside_c": ["12 модулів", "50 уроків", "13 практик", "3 мови"],
        "tiles": [
            ("📚", "12 модулів", "Від японських свічок і таймфреймів до психології та входу в угоду"),
            ("🎯", "Practice Lab", "Живі сценарії графіка: 4 варіанти рішення, перевірка і розбір помилки"),
            ("🤖", "Вовчик-наставник", "ШІ відповідає на будь-яке питання і пояснює, чому відповідь невірна"),
            ("⭐", "XP, рівні, досягнення", "5 рівнів, 8 досягнень, серія днів і слабкі теми для повторення"),
            ("☁️", "Прогрес у хмарі", "XP, серія і досягнення зберігаються на сервері — не втрачаються при зміні пристрою"),
            ("🌍", "3 мови", "Русский, Українська, العربية — включно з правильною RTL-версткою"),
        ],
        "inside_q": "Усе навчання — в одному вікні",
        "mod_t": "Програма <b>академії</b>",
        "mod_s": "12 модулів · 50 уроків · практика після кожного блоку",
        "mod_q": "Крок за кроком — від свічки до системи",
        "mentor_t": "Вовчик — <b>наставник</b>",
        "mentor_s": "Штучний інтелект у боті та практиці. Без сигналів — лише навчання",
        "mentor_c": ["Відповідь на будь-яке питання", "Розбір помилок", "Цитата дня"],
        "mentor_cards": [
            ("💬", "Запитай у чаті", "Напиши боту питання про трейдинг — Вовчик відповість як наставник, коротко і по суті"),
            ("🧠", "Розбір помилки", "У практиці тисни «Запитати Вовчика, чому» — ШІ пояснить саме твій невірний вибір"),
            ("⏳", "Три рішення", "Вгору, Вниз або Чекати. Вовчик вчить обирати, а не вгадувати"),
        ],
        "mentor_q": "Наставник поруч 24/7",
        "modules": ["Основи трейдингу", "Японські свічки", "Таймфрейми", "Тренд", "Рівні", "Розвороти", "Індикатори", "Сигнали та чекліст", "Психологія", "Вхід в угоду", "Жива практика", "Шлях до свободи"],
    },
    "ar": {
        "access_t": "كيف تحصل على <b>الوصول</b>",
        "access_s": "أربع خطوات بسيطة — والأكاديمية كاملة في تيليجرام",
        "steps": [
            ("🚀", "شغّل البوت", "اضغط /start واختر اللغة — وسيتابع فولتشوك بها"),
            ("📣", "اشترك في القناة", "شرط الدخول الوحيد — الاشتراك في القناة الرئيسية للأكاديمية"),
            ("🎓", "افتح الأكاديمية", "اضغط «الدخول إلى الأكاديمية» — التطبيق يفتح داخل تيليجرام"),
            ("🔥", "أنجز الوحدة الأولى", "أول الدروس، تدريب على الرسم البياني وأول نقاط XP — اليوم"),
        ],
        "access_q": "المعرفة اليوم — الحرية غداً",
        "band": [("📚", "12 وحدة"), ("🎯", "Practice Lab"), ("🤖", "مرشد بالذكاء الاصطناعي"), ("⭐", "XP ومستويات")],
        "band2": [("⚠️", "تعليم لا إشارات"), ("🌍", "3 لغات"), ("☁️", "التقدّم في السحابة")],
        "inside_t": "ماذا يوجد في <b>الأكاديمية</b>",
        "inside_s": "تعلّم تداول كامل — داخل تيليجرام، بدون مواقع خارجية",
        "inside_c": ["12 وحدة", "50 درساً", "13 تدريباً", "3 لغات"],
        "tiles": [
            ("📚", "12 وحدة", "من الشموع اليابانية والأطر الزمنية إلى علم النفس والدخول في الصفقة"),
            ("🎯", "Practice Lab", "سيناريوهات حقيقية: أربعة خيارات، تحقّق وتحليل للخطأ"),
            ("🤖", "فولتشوك المرشد", "الذكاء الاصطناعي يجيب على أي سؤال ويشرح سبب الخطأ"),
            ("⭐", "XP ومستويات وإنجازات", "5 مستويات، 8 إنجازات، سلسلة أيام ومواضيع ضعيفة للمراجعة"),
            ("☁️", "التقدّم في السحابة", "XP والسلسلة والإنجازات محفوظة على الخادم — لا تضيع عند تغيير الجهاز"),
            ("🌍", "3 لغات", "الروسية، الأوكرانية، العربية — مع تنسيق RTL صحيح"),
        ],
        "inside_q": "كل التعلّم في نافذة واحدة",
        "mod_t": "برنامج <b>الأكاديمية</b>",
        "mod_s": "12 وحدة · 50 درساً · تدريب بعد كل قسم",
        "mod_q": "خطوة بخطوة — من الشمعة إلى النظام",
        "mentor_t": "فولتشوك — <b>المرشد</b>",
        "mentor_s": "ذكاء اصطناعي داخل البوت والتدريب. بلا إشارات — تعليم فقط",
        "mentor_c": ["إجابة على أي سؤال", "تحليل الأخطاء", "اقتباس اليوم"],
        "mentor_cards": [
            ("💬", "اسأل في الدردشة", "أرسل سؤالك عن التداول — يجيب فولتشوك كمرشد، باختصار وبوضوح"),
            ("🧠", "تحليل الخطأ", "في التدريب اضغط «اسأل فولتشوك لماذا» — ويشرح خيارك الخاطئ تحديداً"),
            ("⏳", "ثلاثة قرارات", "صعود، هبوط أو انتظار. فولتشوك يعلّمك الاختيار لا التخمين"),
        ],
        "mentor_q": "المرشد معك 24/7",
        "modules": ["أساسيات التداول", "الشموع اليابانية", "الأطر الزمنية", "الاتجاه", "المستويات", "الانعكاسات", "المؤشرات", "الإشارات وقائمة التحقق", "علم النفس", "الدخول في الصفقة", "تدريب حيّ", "الطريق إلى الحرية"],
    },
}


def build_access(lang: str) -> str:
    d = TXT[lang]
    cards = "".join(
        f'<div class="card big"><div class="top"><span class="num">{i + 1}</span><span class="emo">{e}</span></div>'
        f'<div class="ttl">{t}</div><div class="desc" style="margin-top:12px">{s}</div>{mini(i)}</div>'
        for i, (e, t, s) in enumerate(d["steps"])
    )
    return page(lang, head(d["access_t"], d["access_s"]) + f'<div class="row">{cards}</div>' + band(d["band"]) + foot(d["access_q"]), 80)


def build_inside(lang: str) -> str:
    d = TXT[lang]
    tiles = "".join(
        f'<div class="card"><div class="top"><span class="emo">{e}</span><div class="ttl">{t}</div></div><div class="desc">{s}</div>{mini(i + 1)}</div>'
        for i, (e, t, s) in enumerate(d["tiles"])
    )
    return page(lang, head(d["inside_t"], d["inside_s"], d["inside_c"]) + f'<div class="grid3">{tiles}</div>' + foot(d["inside_q"]), 78)


def build_modules(lang: str) -> str:
    d = TXT[lang]
    items = "".join(
        f'<div class="mcard mrow"><span class="mnum">{i + 1}</span><span class="mname">{m}</span></div>'
        for i, m in enumerate(d["modules"])
    )
    return page(lang, head(d["mod_t"], d["mod_s"]) + f'<div class="grid4">{items}</div>' + band(d["band"]) + foot(d["mod_q"]), 78)


def build_mentor(lang: str) -> str:
    d = TXT[lang]
    cards = "".join(
        f'<div class="card big"><div class="top"><span class="emo">{e}</span></div><div class="ttl">{t}</div>'
        f'<div class="desc" style="margin-top:12px">{s}</div>{mini(i + 2)}</div>'
        for i, (e, t, s) in enumerate(d["mentor_cards"])
    )
    return page(lang, head(d["mentor_t"], d["mentor_s"], d["mentor_c"]) + f'<div class="row" style="height:392px">{cards}</div>' + band(d["band2"]) + foot(d["mentor_q"]), 78)


BUILDERS = {"access": build_access, "inside": build_inside, "modules": build_modules, "mentor": build_mentor}


def shoot(html: str, out: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        f = Path(tmp) / "p.html"
        f.write_text(html, encoding="utf-8")
        subprocess.run([
            CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
            f"--window-size={W},{H}", f"--screenshot={out}", f"--user-data-dir={tmp}/ud", f"file://{f}",
        ], check=True, capture_output=True, timeout=120)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("ru", "uk", "ar"):
        for name, fn in BUILDERS.items():
            out = OUT / f"{name}_{lang}.png"
            shoot(fn(lang), out)
            print(out, out.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()

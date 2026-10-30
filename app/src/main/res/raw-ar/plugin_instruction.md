بعد تفعيل الإضافة في مركز الإضافات استخدم الكائن العام `imgui` مباشرة (يتطلب AutoJs6 6.8.0 أو أحدث); لا حاجة إلى استدعاء `plugins.load`.

أنشئ مراجع قابلة للتغيير قبل فتح النافذة العائمة:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(window.width), ui.dp(window.height), ui.Cond.Always);
    ui.withWindow(
        "عناصر تحكم ImGui",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("مفعّل", enabled);
            ui.sliderFloat("المستوى", level, 0, 1, "%.2f");
            if (ui.button("إغلاق", 120, 0)) {
                window.close();
            }
        }
    );
}, {
    width: 360,
    height: 240,
    fontSize: 16,
    theme: imgui.Themes.ModernDark,
    appearance: imgui.Appearance.Rounded,
    fps: 60
});
```

أحجام النافذة ومواضعها (`width` و `height` و `x` و `y` وحقول الجلسة وأحداثها) و `fontSize` بوحدة dp; أما الإحداثيات داخل الإطار فبوحدة px, فحوّل بينهما باستخدام `ui.dp()` / `ui.px()`. تعمل دوال الأحداث والأزرار على خيط السكربت. يؤدي تركيز `inputText` إلى فتح IME النظام تلقائيًا مع دعم التركيب. اسحب مساحة فارغة لتحريك النافذة; يمرر السحب العمودي بإصبعين بالقصور الذاتي ويصدر الضغط المطول بإصبع واحد نقرة يمنى. مرر `movable: false` لتعطيل السحب. استخدم `fontPath` لتحميل ملف TTF أو OTF مقروء عندما لا يحتوي خط النظام على المحارف المطلوبة.

استخدم `Themes` / `setTheme` و`setStyleProperties` و`Appearance` للمظاهر الجاهزة. يحمّل `createWindow.fonts` خطوط assets أو الملفات لاستخدامها مع `pushFont` / `withFont`؛ ويُدمج احتياط CJK وأيقونات Material تلقائياً وتتاح عبر `Icons` / `icon(name)`.

يقبل `createTexture` مساراً أو بايتات مشفرة أو Android `Bitmap` أو AutoJs6 `Image` من `images.read` أو لقطة شاشة. استخدم `image` / `imageButton` لعرضها واستدعِ `dispose()` عند عدم الحاجة إليها؛ وتحرر الجلسة الأنسجة المتبقية تلقائياً. توفر `getWindowDrawList` و`getForegroundDrawList` و`getBackgroundDrawList` بدائيات الخطوط والأشكال والنصوص والصور بإحداثيات بكسلات Surface.

يستخدم التراكب `TouchMode.Auto` افتراضياً، فتبقى نوافذ ImGui تفاعلية وتمر لمسات المناطق الفارغة. تستطيع الجلسة تغيير اللمس والشفافية والأمان، والانطواء إلى فقاعة منخفضة الإطارات، وإنشاء `addButtonEx` مستقلة، وحفظ التخطيط عبر `iniPath` ونشر الأحداث. يستخدم `imgui.launch(...)` سطحاً بملء الشاشة في Activity ‏AutoJs6 الحالية بحالة resumed. يمكن لجلسة أصلية واحدة احتواء عدة جذور `begin` / `withWindow`؛ وتغلق الجلسة الجديدة السابقة.

يفعّل `setMoreTouch(true)` ميزة Android split-touch للنافذة الرئيسية والأزرار المستقلة. يختار `launchPrivileged(callback, {backend: "auto"})` وضع SurfaceFlinger الإنتاجي صراحةً ويعيد استخدام تفويض Shizuku/root الموجود في AutoJs6 من دون إذن التراكب؛ يراقب `/dev/input` فقط ولا يحتكر شاشة اللمس. يبلّغ `getBackendCapabilities()` عن حالة المضيف من دون رفع الصلاحيات.

يعيد `session.capture({region})` النافذة ككائن `Image` لاستخدامه مع `images.save`; وحدة region هي dp, ولا يمكن التقاط نافذة وضع الامتياز إلا بين إطارين. يتيح `createWindow({systemCjkFont: true})` للنظام رسم أحرف CJK غير الموجودة في الخط المضمن, ويتيح `pinchZoom: true` تغيير مقياس الخط بإصبعين (`session.fontScale`, `session.setFontScale`). في وضع الامتياز يفتح حقل النص مربع إدخال مؤقتا من AutoJs6 يتطلب إذن التراكب.

تتوفر الجداول والنوافذ المنبثقة السياقية والقوائم والتلميحات ومكدسات الأنماط وأكثر من 60 عنصر تحكم؛ تقرن `withTable` و `withPopupModal` و `withContextItem` و `withMenuBar` استدعاءات begin/end بأمان. راجع ملف README الخاص بالمشروع وخارطة الطريق للاطلاع على النظرة العامة الكاملة على API.

تقبل عناصر التحكم ذات الحالة أيضاً مراجع خفيفة من `imgui.ref(value)` أو كائنات `{ value: ... }` العادية؛ وتظل مساعدات `bool` و`float` و`int` و`string` ومصفوفات الألوان القديمة متوافقة. تُعرض مكونات `logWindow` و`toast` وحوارات Promise و`statsOverlay` و`dataTable` المدارة بواسطة الجلسة بعد رد نداء المستخدم وتُغلق تلقائياً مع جلستها.

شغّل أيًا من الأمثلة السبعة باستخدام `imgui.runExample("widget-overview")` أو `"parameter-panel"` أو `"log-hud"` أو `"data-table-demo"` أو `"theme-gallery"` أو `"error-handling"` أو `"background-task"`, واستكشفها عبر `listExamples` ومصدرها عبر `getExampleSource`. لا يعرض مركز إضافات AutoJs6 6.8 حتى الآن إجراء عاماً لتشغيل المثال بنقرة واحدة.

ينشر الإصدار 1.7 أيضًا تصريحات المحرر الكاملة في `types/imgui.d.ts`. تتوفر الحدود عبر `imgui.Limits` (نص 64 KiB و512 عنصر اختيار و2,048 حدث إدخال)؛ ويُرفض الإدخال المتجاوز بدل اقتطاعه بصمت.

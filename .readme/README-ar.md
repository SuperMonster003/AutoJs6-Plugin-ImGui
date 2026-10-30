<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>إنشاء واجهات عائمة باستخدام Dear ImGui</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
    <a href="https://github.com/ocornut/imgui"><img alt="Dear ImGui" src="https://img.shields.io/badge/Dear%20ImGui-1.92.9-3D6CB4"/></a>
    <br>
    <a href="https://developer.android.com/studio/archive"><img alt="Android Studio" src="https://img.shields.io/badge/Android%20Studio-2023.3+-B64FC8"/></a>
    <a href="https://www.jetbrains.com/idea/download/other.html"><img alt="IntelliJ IDEA" src="https://img.shields.io/badge/IntelliJ%20IDEA-2023.3+-EE4677"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/LICENSE"><img alt="GitHub License" src="https://img.shields.io/github/license/SuperMonster003/AutoJs6-Plugin-ImGui?color=534BAE&label=License"/></a>
  </p>
</div>

******

### اللغات (Languages)

******

يدعم ملف README.md الحالي اللغات التالية:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- [Français [fr]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-fr.md)
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- العربية [ar] # الحالية

******

### مقدمة

******

تجلب إضافة ImGui مكتبة [Dear ImGui](https://github.com/ocornut/imgui) ذات النمط الفوري إلى AutoJs6 حيث ترسم عناصر التحكم باستخدام OpenGL ES داخل نافذة عائمة شفافة. وهي خيار طبيعي للواجهات العائمة الخفيفة مثل لوحات التصحيح وأدوات ضبط المعلمات وشاشات HUD أثناء التشغيل; كما تجمع إنشاء النافذة وجدولة الإطارات والإدخال باللمس وتنظيف الموارد الأصلية في API واحدة موجزة.

بعد تفعيل الإضافة في مركز الإضافات تستخدم السكربتات الكائن العام `imgui` مباشرة (يسجله AutoJs6 ويحمّل الإضافة عند أول استدعاء لأحد أعضائه); لا حاجة إلى `plugins.load`. يتطلب ذلك AutoJs6 6.8.0 أو أحدث. عندما تكون الإضافة أحدث من AutoJs6 لا تظهر على `imgui` الأعضاء التي لم يسجلها AutoJs6 بعد إلا بعد تحميل الإضافة (عند أول استخدام لأي عضو من `imgui`); أما الوسيط `ui` في دوال الرسم فهو كامل دائمًا.

******

### الميزات

******

- جلسات تراكب متجاوبة وActivity بملء الشاشة مع تمرير اللمس التلقائي والطي/التوسيع وأزرار عائمة مستقلة والتحكم في الشفافية/الأمان وحفظ التخطيط وأحداث دورة الحياة.
- يوفر `launchPrivileged` وضع SurfaceFlinger إنتاجياً صريحاً عبر Shizuku/root المُدار من AutoJs6؛ ينقل Binder الموثّق الـ Surface ذات الامتياز إلى العارض الكامل الموجود، ويوفر `/dev/input` إدخال مؤشر بالمراقبة.
- يسجل AutoJs6 الإضافة مباشرة بوصفها الكائن العام `imgui`, فلا حاجة إلى خطوة تحميل بعد تفعيلها, كما في الإضافات الرسمية مثل pinyin / mediainfo.
- نوافذ عائمة شفافة بحجم وموضع ومعدل إطارات وخط قابلة للضبط; اسحب مساحة فارغة للتحريك واستخدم التمرير بالقصور الذاتي بإصبعين والضغط المطول بإصبع واحد للنقر بزر الفأرة الأيمن. بعد بضع ثوانٍ دون إدخال ينخفض معدل الإطارات لتوفير البطارية, ويتوقف الرسم عند إطفاء الشاشة.
- ترتبط عائلة `inputText` بالكامل بمحرر الإدخال (IME) في النظام، بما في ذلك النص قيد التركيب والإظهار التلقائي للوحة المفاتيح ومفاتيح التحرير الشائعة.
- نوافذ وعلامات تبويب وعقد شجرية وجداول ونوافذ منبثقة وقوائم وتلميحات وأكثر من 60 عنصر تحكم بنمط فوري بما في ذلك مفتاح `toggle` بأسلوب الأجهزة المحمولة.
- نظام مرئي وخطي يضم 11 قيمة `Themes` وأنماطاً دفعية ومظاهر مستديرة/محددة/مظللة ومكدس خطوط متعدد واحتياط CJK ومجموعة Material Icons فرعية.
- تقبل الأنسجة المُدارة مسارات الملفات والبايتات المشفرة وAndroid `Bitmap` وكائنات AutoJs6 `Image`؛ وتوفر `image` / `imageButton` وطبقات DrawList الثلاث عرض الصور والرسم المخصص.
- يعيد `session.capture()` النافذة ككائن `Image` من AutoJs6; مع `systemCjkFont: true` يرسم النظام أحرف CJK غير الموجودة في الخط المضمن, ومع `pinchZoom: true` يغير إصبعان مقياس الخط, وتتبع النوافذ تغييرات كثافة الشاشة وحجم خط النظام.
- تعمل مراجع `imgui.ref(value)` / `{value: x}` الخفيفة مع كل عناصر التحكم ذات الحالة، مع بقاء مساعدات مراجع مصفوفات Java القديمة متوافقة بالكامل.
- توفر مكونات الجلسة `logWindow` و`toast` المكدسة وحوارات Promise و`statsOverlay` الملوّن حسب العتبات و`dataTable` القابل للتحديد وCRUD واجهة تصحيح جاهزة.
- تتوفر أسماء PascalCase بديلة للواجهات البرمجية الشائعة وتعدادات الثوابت (مثلًا `ui.Button`) وهي تحافظ على أسلوب وسائط الإضافة; قائمة الأسماء البديلة والفروق عن توقيعات C++ الأصلية في [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md).
- يشمل الدعم الهندسي تصريحات TypeScript كاملة وتسعة أمثلة قابلة للتشغيل واختبارات رسم Android وطابور إدخال غير حاجب وأدوات تحديث upstream قابلة للتحقق وأتمتة إصدارات CI.
- توطين معلومات الإضافة وتعليمات الاستخدام و README و CHANGELOG بعشر لغات.

******

### التثبيت

******

- نزّل ملف APK المطابق لبنية جهازك من [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases); اختر حزمة `universal` عند عدم التأكد.
- ثبّت ملف APK ثم افتح AutoJs6 وتأكد في صفحة إدارة الإضافات من أن هذه الإضافة معروفة ومفعّلة.
- استدعِ `imgui.createWindow(...)` مباشرة في السكربت; امنح AutoJs6 إذن العرض فوق التطبيقات (النافذة العائمة) عند الاستخدام الأول.
- قبل `launchPrivileged` اضبط Root أو Shizuku وامنحه الإذن كالمعتاد داخل AutoJs6. تعيد الإضافة استخدام حالة المضيف هذه ولا يحتاج وضع الامتياز إلى إذن التراكب.

متطلبات المضيف: AutoJs6 برقم إصدار (versionCode) لا يقل عن 5935. تشحن الإضافة ثنائيات `arm64-v8a` و `armeabi-v7a` و `x86_64` و `x86` وتتطلب Android 7.0 (API 24) أو أحدث مع GPU/برنامج تشغيل يدعم OpenGL ES 3.0.

******

### البداية السريعة

******

بعد تثبيت الإضافة وتفعيلها أنشئ مراجع قابلة للتغيير وافتح نافذة عائمة:

```js
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(ui.dp(overlay.width), ui.dp(overlay.height), ui.Cond.Always);
    ui.withWindow(
        "ImGui Panel",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.toggle("Enabled", enabled);
            ui.sliderFloat("Volume", volume, 0, 1, "%.2f");
            ui.colorEdit3("Theme", themeColor);
            if (ui.button("Close", 120, 0)) {
                overlay.close();
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

تقبل عناصر التحكم القابلة للتغيير المراجع الخفيفة المنشأة عبر `imgui.ref(value)` أو كائنات `{ value: ... }` العادية; وتظل مساعدات `imgui.bool` و`imgui.int` و`imgui.float` و`imgui.string` و`imgui.floats` القديمة متوافقة. يؤدي تركيز `inputText` إلى فتح IME النظام تلقائيًا مع دعم التركيب; مرر `ime: false` لتعطيله. أحجام النافذة ومواضعها بوحدة dp: الخيارات `width` و `height` و `x` و `y` وحقول الجلسة وبيانات الأحداث, و `fontSize` بوحدة dp أيضًا. أما الإحداثيات داخل الإطار فبوحدة px, فحوّل بينهما باستخدام `ui.dp()` / `ui.px()`. تعمل دوال الأحداث والأزرار على خيط السكربت (راجع [THREADING.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/THREADING.md)), ويسرد [MIGRATION-1.12.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/MIGRATION-1.12.md) التغييرات مقارنة بالإصدارات السابقة. اسحب مساحة فارغة لتحريك النافذة (`movable: false` يثبتها); للتمرير العمودي بإصبعين قصور ذاتي قابل للضبط (`fling` و `flingFriction` و `flingMinVelocity` و `flingMaxVelocity`), ويصدر الضغط المطول بإصبع واحد نقرة يمنى (`longPressAsRightClick` و `longPressDuration` و `longPressSlop`). عندما لا يغطي خط النظام المحارف المطلوبة وجّه `fontPath` إلى ملف TTF أو OTF.

السمات والخطوط: يقبل `setTheme` قيم `Themes` الإحدى عشرة ويحدّث `setStyleProperties` عدة قيم `StyleVar` دفعة واحدة؛ كما يقبل `createWindow` الخيارات `theme` و`appearance` و`style` و`shadow`. تحمّل مصفوفة `fonts` خطوط assets (`asset://...`) أو الملفات لاستخدامها مع `pushFont` / `withFont`. يدمج احتياط CJK والأيقونات تلقائياً؛ استخدم `Icons` / `icon(name)` للحصول على رسوم الأيقونات.

الأنسجة والرسم المخصص: استدعِ `createTexture` بعد أن تصبح جلسة النافذة جاهزة فقط (عادةً مرة واحدة داخل callback العرض). يعرض الكائن الناتج `width` و`height` و`update(source)` (تستبدل البكسلات وتحافظ على المقبض, ويتبع `width` / `height` الحجم الجديد) والدالتين التكراريتين الآمنتين `dispose()` / `close()`; وتُحرر الأنسجة المتبقية تلقائياً عند إغلاق الجلسة. تعرض `image` / `imageButton` الأنسجة، بينما توفر `getWindowDrawList` و`getForegroundDrawList` و`getBackgroundDrawList` بدائيات الرسم الشائعة. تستخدم إحداثيات DrawList بكسلات Surface. يمكن تمرير قيم AutoJs6 `Image` من `images.read(...)` أو لقطات الشاشة مباشرةً, وكذلك `ArrayBuffer` أو مصفوفة typed تحتوي بيانات PNG أو JPEG.

جلسات النوافذ: يستخدم التراكب `TouchMode.Auto` افتراضياً، فتظل نوافذ ImGui الجذرية تفاعلية بينما تنتقل لمسات مناطق Surface الفارغة إلى التطبيق أسفلها؛ اختر `Touchable` أو `Passthrough` لسياسة ثابتة. تستطيع الجلسة تغيير الشفافية/الأمان/وضع اللمس، والانطواء إلى فقاعة منخفضة الإطارات، وإنشاء `addButtonEx` مستقلة، واتباع محتوى `AlwaysAutoResize`، وحفظ التخطيط عبر `iniPath`، ونشر الأحداث عبر `on` / `once` / `off` أو callbacks الخيارات. ينشئ `imgui.launch(...)` سطحاً بملء الشاشة في Activity ‏AutoJs6 الحالية بحالة resumed، بينما يختار `launchFloaty(...)` التراكب صراحةً. لكل محرك نصوص جلسة عرض أصلية واحدة، لكن يمكن لـ callback الخاص بها إنشاء أي عدد من جذور ImGui عبر `begin` / `withWindow`؛ وتغلق الجلسة الجديدة السابقة. عندما يرمي callback الرسم أو callback حدث استثناءً, يطبع `console.error` الخطأ مع مكدس الاستدعاء (مرة واحدة لسلسلة الخطأ نفسه) ويُطلق الحدث `error` (`error` / `phase` / `frame`); من دون مستمع `error` يغلق خطأ الرسم الجلسة (`closeReason` هو `render-error`), ومع وجود مستمع يُتخطى باقي الإطار ويستمر الرسم. يبلّغ الخيار `debug: true` عبر `console.warn` وlogcat عن أخطاء الاستخدام مثل `begin` دون `end`, ويعرض نافذتي Metrics وDebug Log. تعمل الأساليب العامة مثل `setTouchable` / `setGlobalAlpha` / `getComponent` على الجلسة الحالية وترمي `imgui.<name>: no active session` عند عدم وجود جلسة نشطة. في جلسة `imgui.launch` يغلق زر الرجوع الجلسة (قيمة `closeReason` هي `back`) ما لم يستدعِ مستمع `back` الدالة `event.preventDefault()`; وإذا كانت لوحة المفاتيح ظاهرة فإن زر الرجوع يخفيها أولًا. لا تتلقى النوافذ العائمة زر الرجوع إلا عندما يكون التركيز على إدخال نصي, وعندها يخفي لوحة المفاتيح فقط. ومع `debug: true` يطبع رد نداء الرسم الذي يتجاوز 250 ms أيضًا `console.warn` يقترح `threads.start` (مرة واحدة على الأكثر كل 10 ثوانٍ).

ترتبط المكونات عالية المستوى بالجلسة النشطة وتُرسم بعد callback المستخدم: يوفر `logWindow` مستويات ملوّنة ومسحاً وتصديراً وتمريراً تلقائياً; ويعرض `toast` إشعارات مؤقتة ذات موضع; وتُرجع `alert` / `confirm` / `singleChoice` / `multiChoice` كائنات Promise; ويرسم `statsOverlay` زمن الإطار ويعرض زمن عمل كل إطار; ويوفر `dataTable` التحديد وCRUD. يمكن اكتشاف الأمثلة التسعة (`widget-overview` و`parameter-panel` و`log-hud` و`data-table-demo` و`theme-gallery` و`error-handling` و`background-task` و`large-list` و`texture-refresh`) عبر `listExamples` / `getExampleSource` وتشغيلها بـ `runExample`. لا يستهلك مركز إضافات AutoJs6 6.8 بيانات الأمثلة العامة بعد, لذا شغّل الاستدعاء أدناه مباشرة حتى يضيف المضيف الدعم:

```js
imgui.runExample("widget-overview");
```

******

### نظرة عامة على API

******

تتوفر للواجهات الشائعة أسماء PascalCase بديلة (مثلًا `ui.Button` يكافئ `ui.button`). تحافظ الأسماء البديلة على أسلوب وسائط الإضافة (القيم القابلة للتغيير عبر `imgui.ref` مثلًا) ولا تطابق توقيعات C++ الأصلية واحدًا لواحد; القائمة والفروق في [ALIASES.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/ALIASES.md). تعكس أساليب lower camel case عمليات Dear ImGui التي تحمل الاسم نفسه, وهي مقسمة إلى المجموعات التالية:

- وقت تشغيل الجلسة: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode` و`setTouchable` / `setMoreTouch` / `setGlobalAlpha` / `setSecure` و`collapseWindow` / `expandWindow` و`addButtonEx` وتحويل الوحدات `density` / `dp` / `px` و`on` / `once` / `off` مع صيغها الخاصة بالجلسة, والحدث `error` للجلسة الذي يبلّغ عن أخطاء الدوال, والخيار `debug` الذي يفعّل وضع التصحيح, وتوفير الطاقة عبر `idleFps` / `idleDelay` و`setFps` / `setIdleFps` / `getFps` والحدثين `idle` / `active`.
- اكتشاف الواجهة الخلفية: تعرض `getBackendCapabilities` / `BackendStatus` مدى التوفر والجاهزية للإنتاج للنوافذ واللمس المقسم والعملية ذات الامتيازات والإدخال المباشر وDocking وMulti-Viewport, من دون رفع الامتيازات.
- الجلسة والنوافذ: `createWindow` و `closeWindow` و `withWindow` و `withChild` و `setNextWindowPos` و `setNextWindowSize` و `setNextWindowBgAlpha` إضافة إلى استعلامات حالة النافذة مثل `isWindowHovered`.
- النص وعناصر التحكم: `text` و `textColored` و `textWrapped` و `separatorText` و `bulletText` و `labelText` و `button` و `arrowButton` و `invisibleButton` و `checkbox` و `toggle` و `radioButton` و `sliderFloat` و `sliderInt` و `vSliderFloat` و `dragFloat` و `dragInt` و `inputText` و `inputInt` و `inputFloat` و `inputTextMultiline` و `colorEdit3` و `colorEdit4` و `colorPicker4` و `colorButton` و `progressBar` و `plotLines` و `plotHistogram` وغيرها. عناصر تحكم بقيمتين إلى أربع قيم: `dragFloat2/3/4` / `dragInt2/3/4` / `sliderFloat2/3/4` / `sliderInt2/3/4` / `inputFloat2/3/4` / `inputInt2/3/4` / `dragFloatRange2` / `dragIntRange2` / `sliderAngle`.
- الحاويات والتنقل: `withTabBar` و `withTabItem` و `withTreeNode` و `treeNodeEx` و `collapsingHeader` وعائلة الجداول `withTable` و `withListBox` و `withCombo` و `selectable`, إضافة إلى `listClipper` للقوائم الطويلة. فرز الجداول: `tableGetSortSpecs` / `SortDirection` و `dataTable` مع `sortable: true`.
- النوافذ المنبثقة والقوائم: `openPopup` و `withPopup` و `withPopupModal` و `beginPopupContextItem` و `beginPopupContextWindow` و `withContextItem` و `withContextWindow` و `closeCurrentPopup` و `withMenuBar` و `withMenu` و `menuItem` و `setTooltip` و `setItemTooltip` و `withItemTooltip`.
- الأنماط والتخطيط: `styleColorsDark` و `styleColorsLight` و `styleColorsClassic` و `pushStyleColor` و `pushStyleVar` و `setWindowFontScale` و `withGroup` و `withDisabled` و `withId` و `indent` و `sameLine` و `separator` و `spacing` إضافة إلى عائلتي المؤشر والتمرير.
- الأنسجة والرسم: `createTexture` و`texture.update` و`destroyTexture` و`image` و`imageButton` و`colorU32`، إضافة إلى `getWindowDrawList` و`getForegroundDrawList` و`getBackgroundDrawList` مع بدائيات الخط والمستطيل والدائرة والمثلث والنص والخط المتعدد ومنحنى Bézier والصورة. رسم المسارات: `pathLineTo` / `pathArcTo` / `pathArcToFast` / `pathBezierCubicCurveTo` / `pathBezierQuadraticCurveTo` / `pathRect` / `pathStroke` / `pathFillConvex` / `pathFillConcave`; و `pushClipRect` / `popClipRect` لقوائم الرسم والنوافذ; وأشكال إضافية: `addEllipse` / `addNgon` / `addQuad` / `addBezierQuadratic` / `addRectFilledMultiColor` / `addConvexPolyFilled` / `addConcavePolyFilled` / `addImageQuad` / `addImageRounded`.
- الاستعلامات والإدخال: استعلامات الحالة مثل `isItemClicked` و `isItemHovered` و `isItemActive` و `isItemEdited` و `isMouseDown` و `getMousePos` و `calcTextSize` و `framerate`، والتركيز النشط عبر `setKeyboardFocusHere`، وأوليات `addInputCharacters` و `sendKey` و `addMouseWheel` و `wantTextInput`. تُمرر كل قيم `InputTextFlags` المكشوفة حاليًا إلى Dear ImGui؛ أما العلامات المعتمدة على callbacks فغير مكشوفة و `WordWrap` للإدخال متعدد الأسطر فقط. استعلامات المفاتيح والاختصارات: `isKeyDown` / `isKeyPressed` / `isKeyReleased` / `getKeyPressedAmount` / `getKeyName` / `isKeyChordPressed` / `shortcut` / `setNextItemShortcut`, مع تركيبات مثل `ui.Mod.Ctrl | ui.Key.S`. الحافظة: `getClipboardText` / `setClipboardText`. حقن المؤشر للاختبار الآلي للواجهة: `addMousePosEvent` / `addMouseButtonEvent` (بكسلات الإطار, مثل `getMousePos`).
- السحب والإفلات: `withDragDropSource` / `withDragDropTarget`, `beginDragDropSource` / `setDragDropPayload` / `endDragDropSource` / `beginDragDropTarget` / `acceptDragDropPayload` / `endDragDropTarget` / `getDragDropPayload`, مع `DragDropFlags`; الحمولة سلسلة نصية أو رقم أو أي كائن يمكن تحويله إلى JSON.
- أدوات التصحيح: تعرض `showMetricsWindow` / `showDebugLogWindow` / `showIdStackToolWindow` / `showStyleEditor` / `showAboutWindow` / `showUserGuide` نوافذ الأدوات المدمجة في Dear ImGui; وتقبل كل منها مرجعًا منطقيًا قابلًا للتغيير اختياريًا يضبطه زر الإغلاق على false.
- المكونات عالية المستوى والأمثلة: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`، إضافة إلى `listExamples` / `getExampleSource` / `runExample`؛ وتتوفر المصانع نفسها في كل جلسة.
- المراجع القابلة للتغيير: `imgui.ref` الخفيف (أو كائن `{value: x}` عادي)، ومساعدات مصفوفات Java المتوافقة `imgui.bool` و `imgui.int` و `imgui.float` و `imgui.string` و `imgui.floats` و `imgui.ints` و `imgui.strings`.
- الثوابت: `BackendStatus` / `Cond` و `WindowFlags` و `ChildFlags` و `InputTextFlags` و `SliderFlags` و `TreeNodeFlags` و `SelectableFlags` و `TabBarFlags` و `TabItemFlags` و `ComboFlags` و `PopupFlags` و `HoveredFlags` و `FocusedFlags` و `ColorEditFlags` و `TableFlags` و `TableColumnFlags` و `TableRowFlags` و `TableBgTarget` و `SortDirection` و `Col` و `StyleVar` و `Themes` و `Appearance` و `Fonts` و `Icons` و `Dir` و `Key` و `Mod` و `InputFlags` و `DragDropFlags` و `MouseButton` و `ButtonFlags` و `TextureFlags` و `DrawListLayer` و `DrawFlags` و `LogLevel` و `ToastPosition` و `Limits` بما يطابق تعدادات Dear ImGui أو جداول الإضافة التي تحمل الأسماء نفسها.

******

### القيود المعروفة

******

- يدعم كل محرك نصوص جلسة عرض أصلية واحدة في كل مرة؛ أنشئ نوافذ ImGui جذرية متعددة داخلها عند الحاجة إلى لوحات متعددة. تغلق جلسة تراكب أو Activity جديدة الجلسة السابقة.
- يتطلب `imgui.launch` وجود Activity ‏AutoJs6 حالية بحالة resumed؛ استخدم `launchFloaty` إذا كان على النص متابعة العرض من دون Activity مضيفة في المقدمة.
- وضع الامتياز ثابت بملء الشاشة وللمؤشر فقط: تستخدم حقول النص مربع إدخال مؤقتا من AutoJs6 يتطلب إذن التراكب ويضيف النص عند المؤشر فقط, ولا يدعم المفاتيح أو شفافية/حماية طبقة المضيف أو الطي أو أزرار Android المساعدة أو إعادة البناء الحية عند الدوران. لا يستخدم الإدخال المباشر `EVIOCGRAB` وقد ترفض سياسات OEM SurfaceControl/SELinux التشغيل؛ ولا ينفذ فحص القدرات `su` أو يطلب إذن Shizuku.

******

### سجل الإصدارات

******

#### v1.16.0

###### 2026/10/31

* `ميزة` يلتقط session.capture(options) صورة للنافذة ويعيد صورة لوحدة images, مثل images.save(session.capture(), path). يحدد options.region جزءا من النافذة بوحدة dp. لا يمكن التقاط نافذة وضع الامتياز إلا بين إطارين, مثلا من setTimeout(fn, 0)
* `ميزة` يعرض createWindow({systemCjkFont: true}) جميع أحرف CJK الموجودة على الجهاز, بما فيها الأحرف النادرة مثل 龘 غير الموجودة في الخط المضمن. يرسم Android كل حرف عند أول استخدام, لذلك لا يحتاج تقريبا إلى ذاكرة إضافية; يوضح docs/LIMITS.md ما يغطيه الخط المضمن
* `ميزة` يتيح createWindow({pinchZoom: true}) تغيير حجم النص من 0.5 إلى 3 أضعاف بإصبعين; وتحريك الإصبعين معا يبقى تمريرا. اقرأ المقياس من session.fontScale واضبطه عبر session.setFontScale(scale) واستمع إلى الحدث الجديد fontScaleChanged. يعرض مثال widget-overview كل ذلك
* `ميزة` إدخال النص في وضع الامتياز: يفتح النقر على inputText الآن مربع إدخال صغيرا من AutoJs6 مع لوحة المفاتيح (يتطلب إذن التراكب لـ AutoJs6). يدخل زر OK أو مفتاح الإنهاء أو النقر في مكان آخر النص عند مؤشر الحقل; ولا يمكن تعديل النص الموجود في الحقل داخل المربع
* `تحسين` تتبع النوافذ الآن تغييرات حجم العرض (الكثافة) وحجم خط النظام أثناء التشغيل: يأخذ النص وعناصر التحكم الحجم الجديد وتحتفظ النافذة بحجمها بوحدة dp. أضيفت إلى configurationChanged الحقول density و oldDensity و fontScale و oldFontScale. تغلق نافذة ملء الشاشة من imgui.launch بدلا من ذلك (session.closeReason يساوي "configuration-changed") لأن Android يعيد إنشاء Activity الخاصة بها

#### v1.15.0

###### 2026/10/30

* `ميزة` استعلامات لوحة المفاتيح: isKeyDown / isKeyPressed / isKeyReleased / getKeyPressedAmount / getKeyName / isKeyChordPressed, واختصارات لوحة المفاتيح عبر shortcut و setNextItemShortcut. تكتب التركيبات هكذا: ui.Mod.Ctrl | ui.Key.S. تغطي ثوابت Key الآن لوحة المفاتيح كاملة: من A إلى Z, ومن Digit0 إلى Digit9, ومن F1 إلى F24, ولوحة الأرقام وغيرها
* `ميزة` الحافظة: يستخدم getClipboardText / setClipboardText حافظة Android نفسها التي يستخدمها getClip / setClip في المضيف, وكذلك Ctrl+C / Ctrl+V في حقول النص. منذ Android 10 لا يسمح النظام بقراءة الحافظة إلا للتطبيق الذي يملك تركيز الإدخال; يشرح docs/LIMITS.md تأثير ذلك على النوافذ العائمة
* `ميزة` السحب والإفلات: اسحب عنصرا إلى عنصر آخر باستخدام beginDragDropSource / setDragDropPayload / beginDragDropTarget / acceptDragDropPayload والدالتين المساعدتين withDragDropSource / withDragDropTarget (تضبط DragDropFlags الخيارات). يمكن أن تكون الحمولة سلسلة نصية أو رقما أو أي كائن يمكن تحويله إلى JSON, ويمكن سحب الألوان من عناصر الألوان; راجع القسم الجديد في المثال widget-overview
* `ميزة` الرسم المخصص: دوال المسارات (pathLineTo / pathArcTo / pathBezierCubicCurveTo / pathStroke / pathFillConvex وغيرها), و pushClipRect / popClipRect لقوائم الرسم والنوافذ, وأشكال جديدة: addEllipse و addNgon و addQuad ونسخها المعبأة, و addBezierQuadratic و addRectFilledMultiColor و addConvexPolyFilled و addConcavePolyFilled و addImageQuad و addImageRounded; راجع المثال widget-overview
* `ميزة` محاكاة اللمس: يتيح addMousePosEvent(x, y) و addMouseButtonEvent(button, down) للسكربت التصرف كإصبع على النافذة, مثلا لاختبار الواجهة آليا. الإحداثيات بكسلات الإطار مثل getMousePos, وليست dp الخاصة بـ createWindow; ولا تتأثر التطبيقات أسفل النافذة

#### v1.14.0

###### 2026/10/30

* `تلميح` تغيير في السلوك: في النافذة بملء الشاشة التي تُفتح بـ imgui.launch, يغلق زر الرجوع النافذة الآن (قيمة session.closeReason هي "back"). لإبقاء النافذة مفتوحة, استدعِ e.preventDefault() داخل session.on("back", e). أما النوافذ العائمة (launchFloaty) فلم تتغير
* `ميزة` نوافذ أدوات التصحيح: تعرض showMetricsWindow / showDebugLogWindow / showIdStackToolWindow / showStyleEditor / showAboutWindow / showUserGuide (الأسماء البديلة ShowMetricsWindow وغيرها) الأدوات المدمجة في Dear ImGui; ومع imgui.bool(true) يخفيها زر الإغلاق. يحتوي المثال widget-overview على قائمة Debug جديدة تفتحها
* `ميزة` فرز الجداول: في جدول يحمل العلامة Sortable, يغيّر لمس عنوان العمود ترتيب الفرز; وتعيد tableGetSortSpecs() أعمدة الفرز واتجاهاته (imgui.SortDirection), وتكون specsDirty مساوية لـ true في الإطار الذي يتغير فيه الفرز فقط. الوسيط الرابع لـ tableSetupColumn هو معرّف المستخدم للعمود. ترتب dataTable صفوفها مع sortable: true, وتحدد دالة compare في العمود ترتيبًا مخصصًا; راجع المثال data-table-demo
* `ميزة` عناصر تحكم بقيمتين إلى أربع قيم: dragFloat2 / 3 / 4 و dragInt2 / 3 / 4 و sliderFloat2 / 3 / 4 و sliderInt2 / 3 / 4 و inputFloat2 / 3 / 4 و inputInt2 / 3 / 4, إضافة إلى dragFloatRange2 / dragIntRange2 لنطاق من الحد الأدنى إلى الأقصى و sliderAngle لزاوية (تُخزَّن بالراديان وتُعرض بالدرجات). تُمرَّر القيم بصيغة {value: [x, y, z]} أو imgui.floats(...) أو imgui.ints(...) الجديدة; راجع القسم الجديد في المثال widget-overview
* `تحسين` مع createWindow({debug: true}), إذا استغرق رد نداء الرسم أكثر من 250 مللي ثانية تطبع console.warn المدة وتقترح نقل العمل البطيء (sleep والشبكة والملفات) إلى threads.start, مرة واحدة على الأكثر كل 10 ثوانٍ; ويشرح docs/THREADING.md الطريقة

##### لمزيد من سجل الإصدارات

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-ar.md)

******

### البناء

******

```powershell
.\gradlew.bat :app:assembleDebug
```

بناء Release بأسماء ملفات تتضمن ملخص CRC32:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

التحقق من جرد المصادر الأصلية وتطابق تصريحات JNI واختبارات الوحدة وسلامة تقسيم ABI:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

تأتي معلمات البناء من `version.properties`; الحد الأدنى الحالي لحزمة SDK هو 24 وحزمة SDK المستهدفة هي 37.

******

### بنية المشروع

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/assets/plugin/index.js
app/src/main/assets/examples/widget-overview.js
app/src/main/cpp/ImGuiBridge.cpp
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
Roadmap.md
```

`index.js` هو وحدة `imgui` في جانب محرك البرامج النصية و `ImGuiBridge.cpp` هو جسر JNI إلى Dear ImGui. يحتوي `strings.xml` على أوصاف الإضافة الموطنة ويحتوي `plugin_instruction.md` على تعليمات الاستخدام التي يعرضها المضيف. تُنشأ ملفات README و CHANGELOG من مصادر JSON بواسطة `.python/generate_markdown.py`; حرّر مصادر JSON بدلًا من الملفات المولدة.

******

### الروابط

******

- مشروع AutoJs6: https://github.com/SuperMonster003/AutoJs6
- مشروع Dear ImGui الرسمي: https://github.com/ocornut/imgui
- خارطة طريق توسيع القدرات (Roadmap): https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)

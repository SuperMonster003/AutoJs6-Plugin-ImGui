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

نقطة الدخول الأكثر توافقًا هي `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")`. يتيح AutoJs6 6.8 أو أحدث أيضًا التثبيت التلقائي الاختياري من إعدادات مركز الإضافات باسم الكائن `imgui`; ولا يمكن استخدام الكائن العام مباشرة إلا بعد تفعيل هذا الخيار.

******

### الميزات

******

- جلسات تراكب متجاوبة وActivity بملء الشاشة مع تمرير اللمس التلقائي والطي/التوسيع وأزرار عائمة مستقلة والتحكم في الشفافية/الأمان وحفظ التخطيط وأحداث دورة الحياة.
- يوفر `launchPrivileged` وضع SurfaceFlinger إنتاجياً صريحاً عبر Shizuku/root المُدار من AutoJs6؛ ينقل Binder الموثّق الـ Surface ذات الامتياز إلى العارض الكامل الموجود، ويوفر `/dev/input` إدخال مؤشر بالمراقبة.
- تعمل نقطة الدخول الثابتة `plugins.load` دون إعداد التثبيت لدى المضيف; ويعرض التثبيت التلقائي الاختياري في AutoJs6 الواجهة نفسها بوصفها الكائن العام `imgui`.
- نوافذ عائمة شفافة بحجم وموضع ومعدل إطارات وخط قابلة للضبط; اسحب مساحة فارغة للتحريك واستخدم التمرير بالقصور الذاتي بإصبعين والضغط المطول بإصبع واحد للنقر بزر الفأرة الأيمن.
- ترتبط عائلة `inputText` بالكامل بمحرر الإدخال (IME) في النظام، بما في ذلك النص قيد التركيب والإظهار التلقائي للوحة المفاتيح ومفاتيح التحرير الشائعة.
- نوافذ وعلامات تبويب وعقد شجرية وجداول ونوافذ منبثقة وقوائم وتلميحات وأكثر من 60 عنصر تحكم بنمط فوري بما في ذلك مفتاح `toggle` بأسلوب الأجهزة المحمولة.
- نظام مرئي وخطي يضم 11 قيمة `Themes` وأنماطاً دفعية ومظاهر مستديرة/محددة/مظللة ومكدس خطوط متعدد واحتياط CJK ومجموعة Material Icons فرعية.
- تقبل الأنسجة المُدارة مسارات الملفات والبايتات المشفرة وAndroid `Bitmap` وكائنات AutoJs6 `Image`؛ وتوفر `image` / `imageButton` وطبقات DrawList الثلاث عرض الصور والرسم المخصص.
- تعمل مراجع `imgui.ref(value)` / `{value: x}` الخفيفة مع كل عناصر التحكم ذات الحالة، مع بقاء مساعدات مراجع مصفوفات Java القديمة متوافقة بالكامل.
- توفر مكونات الجلسة `logWindow` و`toast` المكدسة وحوارات Promise و`statsOverlay` الملوّن حسب العتبات و`dataTable` القابل للتحديد وCRUD واجهة تصحيح جاهزة.
- تتبع تعدادات الثوابت وأسماء أساليب PascalCase البديلة التسمية الأصلية في Dear ImGui فلا يكلف نقل المعرفة الحالية شيئًا.
- يشمل الدعم الهندسي تصريحات TypeScript كاملة وخمسة أمثلة قابلة للتشغيل واختبارات رسم Android وطابور إدخال غير حاجب وأدوات تحديث upstream قابلة للتحقق وأتمتة إصدارات CI.
- توطين معلومات الإضافة وتعليمات الاستخدام و README و CHANGELOG بعشر لغات.

******

### التثبيت

******

- نزّل ملف APK المطابق لبنية جهازك من [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases); اختر حزمة `universal` عند عدم التأكد.
- ثبّت ملف APK ثم افتح AutoJs6 وتأكد في صفحة إدارة الإضافات من أن هذه الإضافة معروفة ومفعّلة.
- حمّل الإضافة عبر `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")` ثم استدعِ `imgui.createWindow(...)`; امنح AutoJs6 إذن العرض فوق التطبيقات (النافذة العائمة) عند الاستخدام الأول.
- قبل `launchPrivileged` اضبط Root أو Shizuku وامنحه الإذن كالمعتاد داخل AutoJs6. تعيد الإضافة استخدام حالة المضيف هذه ولا يحتاج وضع الامتياز إلى إذن التراكب.

متطلبات المضيف: AutoJs6 برقم إصدار (versionCode) لا يقل عن 3853. تشحن الإضافة ثنائيات `arm64-v8a` و `armeabi-v7a` و `x86_64` و `x86` وتتطلب Android 7.0 (API 24) أو أحدث مع GPU/برنامج تشغيل يدعم OpenGL ES 3.0.

******

### البداية السريعة

******

بعد تثبيت الإضافة وتفعيلها حمّل واجهتها ثم أنشئ مراجع قابلة للتغيير وافتح نافذة عائمة:

```js
var imgui = plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
var enabled = imgui.ref(true);
var volume = imgui.ref(0.5);
var themeColor = imgui.ref([0.25, 0.55, 0.90]);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
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

تقبل عناصر التحكم القابلة للتغيير المراجع الخفيفة المنشأة عبر `imgui.ref(value)` أو كائنات `{ value: ... }` العادية؛ وتظل مساعدات `imgui.bool` و`imgui.int` و`imgui.float` و`imgui.string` و`imgui.floats` القديمة متوافقة. يؤدي تركيز `inputText` إلى فتح IME النظام تلقائيًا مع دعم التركيب؛ مرر `ime: false` لتعطيله. تستخدم `width` و `height` و `fontSize` وحدات مستقلة عن الكثافة. اسحب مساحة فارغة لتحريك النافذة (`movable: false` يثبتها)؛ للتمرير العمودي بإصبعين قصور ذاتي قابل للضبط (`fling` و `flingFriction` و `flingMinVelocity` و `flingMaxVelocity`)، ويصدر الضغط المطول بإصبع واحد نقرة يمنى (`longPressAsRightClick` و `longPressDuration` و `longPressSlop`). عندما لا يغطي خط النظام المحارف المطلوبة وجّه `fontPath` إلى ملف TTF أو OTF.

السمات والخطوط: يقبل `setTheme` قيم `Themes` الإحدى عشرة ويحدّث `setStyleProperties` عدة قيم `StyleVar` دفعة واحدة؛ كما يقبل `createWindow` الخيارات `theme` و`appearance` و`style` و`shadow`. تحمّل مصفوفة `fonts` خطوط assets (`asset://...`) أو الملفات لاستخدامها مع `pushFont` / `withFont`. يدمج احتياط CJK والأيقونات تلقائياً؛ استخدم `Icons` / `icon(name)` للحصول على رسوم الأيقونات.

الأنسجة والرسم المخصص: استدعِ `createTexture` بعد أن تصبح جلسة النافذة جاهزة فقط (عادةً مرة واحدة داخل callback العرض). يعرض الكائن الناتج `width` و`height` والدالتين التكراريتين الآمنتين `dispose()` / `close()`؛ وتُحرر الأنسجة المتبقية تلقائياً عند إغلاق الجلسة. تعرض `image` / `imageButton` الأنسجة، بينما توفر `getWindowDrawList` و`getForegroundDrawList` و`getBackgroundDrawList` بدائيات الرسم الشائعة. تستخدم إحداثيات DrawList بكسلات Surface. يمكن تمرير قيم AutoJs6 `Image` من `images.read(...)` أو لقطات الشاشة مباشرةً.

جلسات النوافذ: يستخدم التراكب `TouchMode.Auto` افتراضياً، فتظل نوافذ ImGui الجذرية تفاعلية بينما تنتقل لمسات مناطق Surface الفارغة إلى التطبيق أسفلها؛ اختر `Touchable` أو `Passthrough` لسياسة ثابتة. تستطيع الجلسة تغيير الشفافية/الأمان/وضع اللمس، والانطواء إلى فقاعة منخفضة الإطارات، وإنشاء `addButtonEx` مستقلة، واتباع محتوى `AlwaysAutoResize`، وحفظ التخطيط عبر `iniPath`، ونشر الأحداث عبر `on` / `once` / `off` أو callbacks الخيارات. ينشئ `imgui.launch(...)` سطحاً بملء الشاشة في Activity ‏AutoJs6 الحالية بحالة resumed، بينما يختار `launchFloaty(...)` التراكب صراحةً. لكل محرك نصوص جلسة عرض أصلية واحدة، لكن يمكن لـ callback الخاص بها إنشاء أي عدد من جذور ImGui عبر `begin` / `withWindow`؛ وتغلق الجلسة الجديدة السابقة.

ترتبط المكونات عالية المستوى بالجلسة النشطة وتُرسم بعد callback المستخدم: يوفر `logWindow` مستويات ملوّنة ومسحاً وتصديراً وتمريراً تلقائياً؛ ويعرض `toast` إشعارات مؤقتة ذات موضع؛ وتُرجع `alert` / `confirm` / `singleChoice` / `multiChoice` كائنات Promise؛ ويرسم `statsOverlay` زمن الإطار؛ ويوفر `dataTable` التحديد وCRUD. يمكن اكتشاف الأمثلة الخمسة (`widget-overview` و`parameter-panel` و`log-hud` و`data-table-demo` و`theme-gallery`) عبر `listExamples` / `getExampleSource` وتشغيلها بـ `runExample`. لا يستهلك مركز إضافات AutoJs6 6.8 بيانات الأمثلة العامة بعد، لذا شغّل الاستدعاء أدناه مباشرة حتى يضيف المضيف الدعم:

```js
imgui.runExample("widget-overview");
```

******

### نظرة عامة على API

******

تعكس أساليب lower camel case عمليات Dear ImGui التي تحمل الاسم نفسه وتتوفر أسماء PascalCase البديلة للمستخدمين المعتادين على التسمية الأصلية (مثلًا `ui.Button` يكافئ `ui.button`):

- وقت تشغيل الجلسة: `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode` و`setTouchable` / `setGlobalAlpha` / `setSecure` و`collapseWindow` / `expandWindow` و`addButtonEx` و`on` / `once` / `off` مع صيغها الخاصة بالجلسة.
- الجلسة والنوافذ: `createWindow` و `closeWindow` و `withWindow` و `withChild` و `setNextWindowPos` و `setNextWindowSize` و `setNextWindowBgAlpha` إضافة إلى استعلامات حالة النافذة مثل `isWindowHovered`.
- النص وعناصر التحكم: `text` و `textColored` و `textWrapped` و `separatorText` و `bulletText` و `labelText` و `button` و `arrowButton` و `invisibleButton` و `checkbox` و `toggle` و `radioButton` و `sliderFloat` و `sliderInt` و `vSliderFloat` و `dragFloat` و `dragInt` و `inputText` و `inputInt` و `inputFloat` و `inputTextMultiline` و `colorEdit3` و `colorEdit4` و `colorPicker4` و `colorButton` و `progressBar` و `plotLines` و `plotHistogram` وغيرها.
- الحاويات والتنقل: `withTabBar` و `withTabItem` و `withTreeNode` و `treeNodeEx` و `collapsingHeader` وعائلة الجداول `withTable` و `withListBox` و `withCombo` و `selectable`.
- النوافذ المنبثقة والقوائم: `openPopup` و `withPopup` و `withPopupModal` و `beginPopupContextItem` و `beginPopupContextWindow` و `withContextItem` و `withContextWindow` و `closeCurrentPopup` و `withMenuBar` و `withMenu` و `menuItem` و `setTooltip` و `setItemTooltip` و `withItemTooltip`.
- الأنماط والتخطيط: `styleColorsDark` و `styleColorsLight` و `styleColorsClassic` و `pushStyleColor` و `pushStyleVar` و `setWindowFontScale` و `withGroup` و `withDisabled` و `withId` و `indent` و `sameLine` و `separator` و `spacing` إضافة إلى عائلتي المؤشر والتمرير.
- الأنسجة والرسم: `createTexture` و`destroyTexture` و`image` و`imageButton` و`colorU32`، إضافة إلى `getWindowDrawList` و`getForegroundDrawList` و`getBackgroundDrawList` مع بدائيات الخط والمستطيل والدائرة والمثلث والنص والخط المتعدد ومنحنى Bézier والصورة.
- الاستعلامات والإدخال: استعلامات الحالة مثل `isItemClicked` و `isItemHovered` و `isItemActive` و `isItemEdited` و `isMouseDown` و `getMousePos` و `calcTextSize` و `framerate`، والتركيز النشط عبر `setKeyboardFocusHere`، وأوليات `addInputCharacters` و `sendKey` و `addMouseWheel` و `wantTextInput`. تُمرر كل قيم `InputTextFlags` المكشوفة حاليًا إلى Dear ImGui؛ أما العلامات المعتمدة على callbacks فغير مكشوفة و `WordWrap` للإدخال متعدد الأسطر فقط.
- المكونات عالية المستوى والأمثلة: `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`، إضافة إلى `listExamples` / `getExampleSource` / `runExample`؛ وتتوفر المصانع نفسها في كل جلسة.
- المراجع القابلة للتغيير: `imgui.ref` الخفيف (أو كائن `{value: x}` عادي)، ومساعدات مصفوفات Java المتوافقة `imgui.bool` و `imgui.int` و `imgui.float` و `imgui.string` و `imgui.floats` و `imgui.strings`.
- الثوابت: `Cond` و `WindowFlags` و `ChildFlags` و `InputTextFlags` و `SliderFlags` و `TreeNodeFlags` و `SelectableFlags` و `TabBarFlags` و `TabItemFlags` و `ComboFlags` و `PopupFlags` و `HoveredFlags` و `FocusedFlags` و `ColorEditFlags` و `TableFlags` و `TableColumnFlags` و `TableRowFlags` و `TableBgTarget` و `Col` و `StyleVar` و `Themes` و `Appearance` و `Fonts` و `Icons` و `Dir` و `Key` و `MouseButton` و `ButtonFlags` و `TextureFlags` و `DrawListLayer` و `DrawFlags` و `LogLevel` و `ToastPosition` و `Limits` بما يطابق تعدادات Dear ImGui أو جداول الإضافة التي تحمل الأسماء نفسها.

******

### القيود المعروفة

******

- يدعم كل محرك نصوص جلسة عرض أصلية واحدة في كل مرة؛ أنشئ نوافذ ImGui جذرية متعددة داخلها عند الحاجة إلى لوحات متعددة. تغلق جلسة تراكب أو Activity جديدة الجلسة السابقة.
- يتطلب `imgui.launch` وجود Activity ‏AutoJs6 حالية بحالة resumed؛ استخدم `launchFloaty` إذا كان على النص متابعة العرض من دون Activity مضيفة في المقدمة.
- وضع الامتياز في v1.9 ثابت بملء الشاشة وللمؤشر فقط: لا يدعم IME/المفاتيح أو شفافية/حماية طبقة المضيف أو الطي أو أزرار Android المساعدة أو إعادة البناء الحية عند الدوران. لا يستخدم الإدخال المباشر `EVIOCGRAB` وقد ترفض سياسات OEM SurfaceControl/SELinux التشغيل؛ ولا ينفذ فحص القدرات `su` أو يطلب إذن Shizuku.

******

### سجل الإصدارات

******

#### v1.9.3

###### 2026/09/15

* `تحسين` رفع compileSdk و targetSdk إلى 37 (Android 17)؛ لا يعتمد سلوك المكون الإضافي على الهدف الجديد

#### v1.9.2

###### 2026/09/13

* `إصلاح` تطابق معلومات الإصدار وواجهات ABI في مركز الإضافات مع حزمة الإضافة المثبتة
* `إصلاح` تستخدم تواريخ الإصدارات تنسيقا إنجليزيا موحدا
* `تحسين` التحقق من إصدار حزم النشر وتوقيعها واكتمال متغيراتها قبل إنشاء ملفات التنزيل

#### v1.9.1

###### 2026/09/11

* `تحسين` التحقق أثناء البناء من محاذاة صفحات 16 KB للمكتبات الأصلية ذات 64 بت, مع فحص عقد manifest وتقارير JSON

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

تأتي معلمات البناء من `version.properties`; الحد الأدنى الحالي لحزمة SDK هو 24 وحزمة SDK المستهدفة هي 36.

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

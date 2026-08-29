<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>إنشاء واجهات عائمة باستخدام Dear ImGui</p>

  <p>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases"><img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/SuperMonster003/AutoJs6-Plugin-ImGui?label=Release"/></a>
    <a href="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues/SuperMonster003/AutoJs6-Plugin-ImGui?color=A24232&label=Issues"/></a>
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

تعرض إضافة ImGui مكتبة Dear ImGui بصفتها الكائن العام `imgui` في محركات البرامج النصية. ترسم عناصر التحكم ذات النمط الفوري في نافذة عائمة شفافة وتجمع إنشاء النافذة وجدولة الإطارات والإدخال باللمس وتنظيف الموارد الأصلية في API موجزة.

******

### الميزات

******

- تحميل الكائن العام `imgui` عبر التثبيت التلقائي أو `plugins.load(packageName)`.
- إنشاء نوافذ عائمة شفافة مع حجم وموضع ومعدل إطارات وخط وسحب من المساحات الفارغة قابلة للضبط.
- توفير النوافذ والمناطق الفرعية وعلامات التبويب والأشجار والنصوص والأزرار والمدخلات القابلة للتغيير والمحددات ومؤشرات التقدم وأدوات التخطيط والسمات ونافذة Dear ImGui التجريبية.
- توفير مراجع قابلة للتغيير للقيم المنطقية والصحيحة والعشرية والنصية واللونية لعناصر التحكم ذات الحالة.
- توطين معلومات الإضافة وتعليمات الاستخدام و README و CHANGELOG بعشر لغات.

******

### الاستخدام

******

فعّل التثبيت التلقائي في مركز الإضافات أو حمّل الإضافة صراحة ثم أنشئ نافذة عائمة:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");

var enabled = imgui.bool(true);
var value = imgui.float(0.5);

imgui.createWindow(function (ui, overlay) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(overlay.width, overlay.height, ui.Cond.Always);
    ui.withWindow(
        "ImGui controls",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Enabled", enabled);
            ui.sliderFloat("Value", value, 0, 1, "%.2f");
            if (ui.button("Close", 120, 0)) {
                overlay.close();
            }
        }
    );
}, {
    width: 360,
    height: 240,
    fontSize: 16,
    fps: 60
});
```

تحدّث عناصر التحكم القابلة للتغيير المراجع المنشأة عبر `imgui.bool` و `imgui.int` و `imgui.float` و `imgui.string` و `imgui.floats`. تستخدم `width` و `height` و `fontSize` وحدات مستقلة عن الكثافة. اسحب مساحة فارغة لتحريك النافذة أو مرر `movable: false` لتثبيتها.

******

### نظرة عامة على API

******

تقابل أساليب lower camel case عمليات Dear ImGui الشائعة وتتوفر أسماء PascalCase البديلة لاستدعاءات عناصر التحكم المألوفة:

- دورة الحياة: `createWindow` و `closeWindow` و `withWindow` و `withChild` و `withTabBar` و `withTabItem` و `withTreeNode`.
- عناصر التحكم: النصوص والأزرار ومربعات الاختيار وأزرار الراديو والمنزلقات والحقول القابلة للتحرير والألوان والتقدم والقوائم والعناصر القابلة للتحديد.
- التخطيط والحالة: أساليب المؤشر والعرض و `sameLine` و `separator` و `spacing` واستعلامات العناصر والالتقاط.
- الثوابت: `Cond` و `WindowFlags` و `InputTextFlags` و `SliderFlags` و `TreeNodeFlags` و `SelectableFlags` و `TabBarFlags` و `TabItemFlags` و `MouseButton`.

******

### سجل الإصدارات

******

# v1.0.0

###### 2026/08/29

* `ميزة` الكائن العام `imgui` مع التثبيت التلقائي والتحميل الصريح عبر `plugins.load`
* `ميزة` نوافذ عائمة شفافة ترسمها Dear ImGui 1.92.9 مع أبعاد ومعدل إطارات وخطوط وسحب من المساحات الفارغة قابلة للضبط
* `ميزة` API بنمط فوري للنوافذ والتخطيط والنص والإدخال والتحديد والألوان والتقدم والأشجار وعلامات التبويب والسمات والعرض التجريبي
* `ميزة` مراجع قابلة للتغيير للقيم المنطقية والصحيحة والعشرية والنصية واللونية لعناصر التحكم ذات الحالة
* `ميزة` توطين معلومات الإضافة وتعليمات الاستخدام و README و CHANGELOG بعشر لغات
* `تبعية` إضافة Common Plugin API لبيانات اكتشاف الإضافة
* `تبعية` إضافة مكتبة Kotlin القياسية وبيئة تشغيل Parcelize الإصدار 2.2.21
* `تبعية` إضافة Apache Commons Compress 1.28.0 و XZ for Java 1.10 لأدوات البناء
* `تبعية` إضافة JUnit الإصدار 4.13.2 لاختبارات عقد الإضافة

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

تأتي معلمات البناء من `version.properties`; الحد الأدنى الحالي لحزمة SDK هو 24 وحزمة SDK المستهدفة هي 36.

******

### بنية الموارد

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

يحتوي `strings.xml` على الأوصاف الموطنة ويحتوي `plugin_instruction.md` على تعليمات الاستخدام التي يعرضها المضيف. ينشئ `.python/generate_markdown.py` ملفات README و CHANGELOG من مصادر JSON.

******

### الروابط

******

- مشروع AutoJs6: https://github.com/SuperMonster003/AutoJs6
- مشروع Dear ImGui الرسمي: https://github.com/ocornut/imgui

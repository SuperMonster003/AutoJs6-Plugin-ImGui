فعّل التثبيت التلقائي في مركز الإضافات أو حمّل الإضافة صراحة:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

أنشئ مراجع قابلة للتغيير قبل فتح النافذة العائمة:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "عناصر تحكم ImGui",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("مفعّل", enabled);
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
    fps: 60
});
```

تستخدم `width` و `height` و `fontSize` وحدات مستقلة عن كثافة الشاشة. اسحب مساحة فارغة لتحريك النافذة. مرر `movable: false` لتعطيل السحب. استخدم `fontPath` لتحميل ملف TTF أو OTF عندما لا يحتوي خط النظام على المحارف المطلوبة.

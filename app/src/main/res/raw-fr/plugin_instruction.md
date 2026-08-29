Activez le montage automatique dans le Centre des plugins ou chargez explicitement le plugin:

```js
plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
```

Créez des références modifiables avant d'ouvrir la fenêtre flottante:

```js
var enabled = imgui.bool(true);
var level = imgui.float(0.5);

var overlay = imgui.createWindow(function (ui, window) {
    ui.setNextWindowPos(0, 0, ui.Cond.Always);
    ui.setNextWindowSize(window.width, window.height, ui.Cond.Always);
    ui.withWindow(
        "Contrôles ImGui",
        null,
        ui.WindowFlags.NoMove | ui.WindowFlags.NoResize | ui.WindowFlags.NoCollapse,
        function () {
            ui.text("Dear ImGui " + ui.version());
            ui.checkbox("Activé", enabled);
            ui.sliderFloat("Niveau", level, 0, 1, "%.2f");
            if (ui.button("Fermer", 120, 0)) {
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

`width`, `height` et `fontSize` utilisent des unités indépendantes de la densité. Faites glisser une zone vide pour déplacer la fenêtre. Utilisez `movable: false` pour désactiver le déplacement. Utilisez `fontPath` pour charger un fichier TTF ou OTF si la police système ne contient pas les caractères requis.

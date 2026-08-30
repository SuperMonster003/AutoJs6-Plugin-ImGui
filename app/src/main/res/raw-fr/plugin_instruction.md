Chargez explicitement le plugin afin que le script reste portable. AutoJs6 6.8 ou version ultérieure peut aussi le monter automatiquement comme objet global `imgui` depuis les réglages du Centre des plugins.

Créez des références modifiables avant d'ouvrir la fenêtre flottante:

```js
var imgui = plugins.load("io.github.supermonster003.autojs6.plugin.imgui");
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
            ui.toggle("Activé", enabled);
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
    theme: imgui.Themes.ModernDark,
    appearance: imgui.Appearance.Rounded,
    fps: 60
});
```

`width`, `height` et `fontSize` utilisent des unités indépendantes de la densité. Le focus sur `inputText` ouvre automatiquement l'IME système avec composition. Faites glisser une zone vide pour déplacer la fenêtre; le balayage vertical à deux doigts défile avec inertie et un appui long à un doigt émet un clic droit. Passez `movable: false` pour désactiver le déplacement. Utilisez `fontPath` pour charger un fichier TTF ou OTF lisible lorsque la police système ne couvre pas les caractères requis.

Utilisez `Themes` / `setTheme`, `setStyleProperties` et `Appearance` pour les préréglages visuels. `createWindow.fonts` précharge des polices assets ou fichiers pour `pushFont` / `withFont`; le secours CJK et les icônes Material sont fusionnés automatiquement et accessibles via `Icons` / `icon(name)`.

`createTexture` accepte un chemin, des octets encodés, un `Bitmap` Android ou une `Image` AutoJs6 issue de `images.read` ou d’une capture d’écran. Utilisez `image` / `imageButton` pour l’afficher et appelez `dispose()` lorsqu’elle n’est plus utile ; la session libère automatiquement les textures restantes. `getWindowDrawList`, `getForegroundDrawList` et `getBackgroundDrawList` fournissent des primitives de ligne, forme, texte et image en coordonnées de pixels du Surface.

Les superpositions utilisent `TouchMode.Auto` par défaut : les fenêtres ImGui restent interactives et les zones vides laissent passer les clics. La session peut modifier le toucher, l’opacité et la sécurité, se réduire en mini-bulle à faible FPS, créer des `addButtonEx`, mémoriser la disposition avec `iniPath` et publier des événements. `imgui.launch(...)` utilise un Surface plein écran dans l’Activity AutoJs6 actuellement reprise. Une session native peut contenir plusieurs racines `begin` / `withWindow` ; une nouvelle session ferme la précédente.

`setMoreTouch(true)` active le split-touch Android pour la fenêtre principale et les boutons indépendants. `launchPrivileged(callback, {backend: "auto"})` sélectionne explicitement le mode SurfaceFlinger de production, réutilise l'autorisation Shizuku/root d'AutoJs6 et ne demande pas l'autorisation de superposition; `/dev/input` reste en observation sans capturer l'écran tactile. `getBackendCapabilities()` décrit l'état hôte sans élévation.

Tableaux, popups contextuels, menus, infobulles, piles de styles et plus de 60 contrôles sont disponibles; `withTable`, `withPopupModal`, `withContextItem` et `withMenuBar` associent les appels begin/end en toute sécurité. Consultez le README et la Roadmap du projet pour un aperçu complet de l'API.

Les contrôles avec état acceptent aussi les références légères créées par `imgui.ref(value)` ou les objets simples `{ value: ... }` ; les anciens assistants `bool`, `float`, `int`, `string` et de tableaux de couleurs restent compatibles. Les composants `logWindow`, `toast`, dialogues Promise, `statsOverlay` et `dataTable`, gérés par la session, sont rendus après le callback utilisateur et se ferment automatiquement avec elle.

Lancez l’un des cinq exemples avec `imgui.runExample("widget-overview")`, `"parameter-panel"`, `"log-hud"`, `"data-table-demo"` ou `"theme-gallery"` ; découvrez-les avec `listExamples` et consultez leur source avec `getExampleSource`. Le Centre de plugins d’AutoJs6 6.8 ne propose pas encore d’action générique d’exécution en un clic.

La version 1.7 publie aussi les déclarations complètes pour l’éditeur dans `types/imgui.d.ts`. Les limites sont exposées par `imgui.Limits` (64 Kio de texte, 512 éléments de sélection et 2 048 événements en file) ; les entrées hors limite sont rejetées sans troncature silencieuse.

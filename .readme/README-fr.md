<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Créez des interfaces utilisateur flottantes avec Dear ImGui</p>

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

### Langues (Languages)

******

Le fichier README.md actuel prend en charge les langues suivantes:

- [简体中文 [zh-Hans]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hans.md)
- [繁體中文 (香港) [zh-Hant-HK]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-HK.md)
- [繁體中文 (台灣) [zh-Hant-TW]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-zh-Hant-TW.md)
- [English [en]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-en.md)
- Français [fr] # actuel
- [Español [es]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-es.md)
- [日本語 [ja]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ja.md)
- [한국어 [ko]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ko.md)
- [Русский [ru]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ru.md)
- [العربية [ar]](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/.readme/README-ar.md)

******

### Introduction

******

Le plugin ImGui apporte la bibliothèque d'interface graphique en mode immédiat [Dear ImGui](https://github.com/ocornut/imgui) à AutoJs6 et affiche les contrôles via OpenGL ES dans une fenêtre flottante transparente. Il convient naturellement aux interfaces flottantes légères telles que les panneaux de débogage, les outils de réglage de paramètres et les HUD d'exécution, et réunit la création de fenêtre, la cadence des images, les interactions tactiles et la libération des ressources natives dans une API compacte.

Le point d'entrée le plus compatible est `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")`. AutoJs6 6.8 ou version ultérieure peut aussi monter automatiquement le plugin depuis les réglages du Centre des plugins sous le nom d'objet `imgui`; l'objet global ne peut être utilisé directement que si cette option est activée.

******

### Fonctionnalités

******

- Sessions adaptatives en superposition ou Activity plein écran avec passage tactile automatique, réduction/déploiement, boutons flottants indépendants, opacité/sécurité, disposition persistante et événements de cycle de vie.
- `launchPrivileged` fournit un mode SurfaceFlinger de production explicite via Shizuku/root géré par AutoJs6; Binder authentifié transmet la Surface privilégiée au moteur complet existant et `/dev/input` fournit l'entrée pointeur observée.
- Le point d'entrée stable `plugins.load` fonctionne sans configuration de montage côté hôte; le montage automatique facultatif d'AutoJs6 expose la même API comme objet global `imgui`.
- Fenêtres flottantes transparentes avec taille, position, fréquence d'image et police configurables; faites glisser une zone vide pour déplacer la fenêtre, utilisez le défilement inertiel à deux doigts et un appui long à un doigt pour le clic droit.
- La famille `inputText` est entièrement reliée à l'IME du système, avec texte de composition, affichage automatique du clavier logiciel et touches d'édition courantes.
- Fenêtres, onglets, nœuds d'arbre, tableaux, popups, menus, infobulles et plus de 60 contrôles en mode immédiat, dont un interrupteur `toggle` de style mobile.
- Système visuel et typographique avec 11 `Themes`, styles groupés, apparences arrondies/bordées/ombrées, pile multi-police, secours CJK et sous-ensemble Material Icons.
- Les textures gérées acceptent chemins de fichiers, octets encodés, `Bitmap` Android et objets `Image` AutoJs6 ; `image` / `imageButton` et trois couches DrawList couvrent l’affichage d’images et le dessin personnalisé.
- Les références légères `imgui.ref(value)` / `{value: x}` fonctionnent avec tous les contrôles avec état, tandis que les assistants historiques à tableaux Java restent entièrement compatibles.
- Les composants de session `logWindow`, `toast` empilés, dialogues Promise, `statsOverlay` à seuils colorés et `dataTable` CRUD sélectionnable fournissent une interface de débogage prête à l'emploi.
- Les énumérations de constantes et les alias de méthodes PascalCase suivent le nommage natif de Dear ImGui, de sorte que la migration des connaissances existantes ne coûte rien.
- L'outillage comprend des déclarations TypeScript complètes, cinq exemples exécutables, des tests Android de rendu, une file d'entrée non bloquante, une mise à jour amont vérifiable et l'automatisation CI des versions.
- Métadonnées du plugin, instructions d'utilisation, README et CHANGELOG localisés dans dix langues.

******

### Installation

******

- Téléchargez depuis [Releases](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/releases) l'APK correspondant à l'architecture de votre appareil; en cas de doute, choisissez le paquet `universal`.
- Installez l'APK, ouvrez AutoJs6 et vérifiez sur la page de gestion des plugins que ce plugin est reconnu et activé.
- Chargez le plugin avec `plugins.load("io.github.supermonster003.autojs6.plugin.imgui")`, puis appelez `imgui.createWindow(...)`; à la première utilisation, accordez à AutoJs6 l'autorisation de superposition (fenêtre flottante).
- Avant `launchPrivileged`, configurez et autorisez Root ou Shizuku normalement dans AutoJs6. Le plugin réutilise cet état hôte et le mode privilégié ne nécessite pas l'autorisation de superposition.

Prérequis de l'hôte: AutoJs6 avec versionCode 3853 ou ultérieur. Le plugin fournit des binaires `arm64-v8a` / `armeabi-v7a` / `x86_64` / `x86` et requiert Android 7.0 (API 24) ou version ultérieure ainsi qu’un GPU/pilote compatible OpenGL ES 3.0.

******

### Démarrage rapide

******

Une fois le plugin installé et activé, chargez son API, créez des références modifiables et ouvrez une fenêtre flottante:

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

Les contrôles modifiables acceptent les références légères créées par `imgui.ref(value)` ou les objets simples `{ value: ... }` ; les anciens assistants `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` restent compatibles. La sélection d'un `inputText` ouvre automatiquement l'IME du système avec prise en charge de la composition; passez `ime: false` pour désactiver cette gestion. `width`, `height` et `fontSize` utilisent des unités indépendantes de la densité. Faites glisser une zone vide pour déplacer la fenêtre (`movable: false` la fixe); le balayage vertical à deux doigts possède une inertie configurable (`fling`, `flingFriction`, `flingMinVelocity`, `flingMaxVelocity`) et un appui long à un doigt émet un clic droit (`longPressAsRightClick`, `longPressDuration`, `longPressSlop`). Lorsque la police système ne couvre pas les caractères requis, faites pointer `fontPath` vers un fichier de police TTF ou OTF.

Thèmes et polices : `setTheme` accepte les 11 valeurs de `Themes` et `setStyleProperties` met plusieurs `StyleVar` à jour ; `createWindow` accepte aussi `theme`, `appearance`, `style` et `shadow`. Le tableau `fonts` précharge des polices assets (`asset://...`) ou fichiers pour `pushFont` / `withFont`. Le secours CJK et les icônes sont fusionnés automatiquement ; `Icons` / `icon(name)` fournit les glyphes d’icônes.

Textures et dessin personnalisé : appelez `createTexture` uniquement lorsque la session de fenêtre est prête (normalement lors du premier passage dans son rappel de rendu). L’objet renvoyé expose `width`, `height` et les méthodes idempotentes `dispose()` / `close()` ; toutes les textures restantes sont libérées automatiquement à la fermeture de la session. `image` / `imageButton` affichent les textures, tandis que `getWindowDrawList`, `getForegroundDrawList` et `getBackgroundDrawList` fournissent les primitives courantes. Les coordonnées DrawList sont exprimées en pixels du Surface. Les valeurs `Image` AutoJs6 de `images.read(...)` ou d’une capture d’écran peuvent être transmises directement.

Sessions de fenêtre : les superpositions utilisent `TouchMode.Auto` par défaut, ce qui conserve l’interaction des fenêtres racines ImGui tout en transmettant les zones Surface vides à l’application située dessous ; choisissez `Touchable` ou `Passthrough` pour une politique fixe. Une session peut modifier opacité/sécurité/mode tactile, se réduire en mini-bulle à faible FPS, créer des `addButtonEx` déplaçables, suivre le contenu `AlwaysAutoResize`, mémoriser la disposition avec `iniPath` et publier des événements via `on` / `once` / `off` ou les rappels d’options. `imgui.launch(...)` crée un Surface plein écran dans l’Activity AutoJs6 actuellement reprise et `launchFloaty(...)` sélectionne explicitement une superposition. Chaque moteur de script possède une seule session de rendu native, mais son rappel peut créer autant de racines ImGui `begin` / `withWindow` que nécessaire ; une nouvelle session ferme la précédente.

Les composants de haut niveau s'attachent à la session active et sont dessinés après le rappel utilisateur : `logWindow` fournit niveaux colorés, effacement, exportation et défilement automatique ; `toast` affiche des notifications temporisées ; `alert` / `confirm` / `singleChoice` / `multiChoice` résolvent des Promises ; `statsOverlay` trace le temps d'image ; et `dataTable` fournit sélection et CRUD. Les cinq exemples (`widget-overview`, `parameter-panel`, `log-hud`, `data-table-demo` et `theme-gallery`) sont accessibles avec `listExamples` / `getExampleSource` et lancés avec `runExample`. AutoJs6 6.8 ne consomme pas encore les métadonnées génériques d'exemple dans son centre de plugins ; en attendant la prise en charge de l'hôte, exécutez directement l'appel ci-dessous:

```js
imgui.runExample("widget-overview");
```

******

### Aperçu de l'API

******

Les méthodes lower camel case correspondent aux opérations Dear ImGui du même nom, et des alias PascalCase sont disponibles pour les utilisateurs familiers du nommage natif (p. ex. `ui.Button` équivaut à `ui.button`):

- Exécution de session : `launch` / `launchFloaty` / `launchPrivileged` / `TouchMode` / `WindowMode`, `setTouchable` / `setGlobalAlpha` / `setSecure`, `collapseWindow` / `expandWindow`, `addButtonEx`, et `on` / `once` / `off` avec leurs formes propres à la session.
- Session et fenêtres: `createWindow` / `closeWindow` / `withWindow` / `withChild` / `setNextWindowPos` / `setNextWindowSize` / `setNextWindowBgAlpha`, ainsi que des requêtes d'état de fenêtre comme `isWindowHovered`.
- Texte et contrôles: `text` / `textColored` / `textWrapped` / `separatorText` / `bulletText` / `labelText` / `button` / `arrowButton` / `invisibleButton` / `checkbox` / `toggle` / `radioButton` / `sliderFloat` / `sliderInt` / `vSliderFloat` / `dragFloat` / `dragInt` / `inputText` / `inputInt` / `inputFloat` / `inputTextMultiline` / `colorEdit3` / `colorEdit4` / `colorPicker4` / `colorButton` / `progressBar` / `plotLines` / `plotHistogram`, entre autres.
- Conteneurs et navigation: `withTabBar` / `withTabItem` / `withTreeNode` / `treeNodeEx` / `collapsingHeader` / la famille de tableaux `withTable` / `withListBox` / `withCombo` / `selectable`.
- Popups et menus: `openPopup` / `withPopup` / `withPopupModal` / `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow` / `closeCurrentPopup` / `withMenuBar` / `withMenu` / `menuItem` / `setTooltip` / `setItemTooltip` / `withItemTooltip`.
- Style et mise en page: `styleColorsDark` / `styleColorsLight` / `styleColorsClassic` / `pushStyleColor` / `pushStyleVar` / `setWindowFontScale` / `withGroup` / `withDisabled` / `withId` / `indent` / `sameLine` / `separator` / `spacing`, ainsi que les familles de curseur et de défilement.
- Textures et dessin : `createTexture` / `destroyTexture` / `image` / `imageButton` / `colorU32`, ainsi que `getWindowDrawList` / `getForegroundDrawList` / `getBackgroundDrawList` avec des primitives de ligne, rectangle, cercle, triangle, texte, polyligne, Bézier et image.
- Requêtes et entrée: requêtes d'état telles que `isItemClicked` / `isItemHovered` / `isItemActive` / `isItemEdited` / `isMouseDown` / `getMousePos` / `calcTextSize` / `framerate`, focus actif via `setKeyboardFocusHere`, et primitives `addInputCharacters` / `sendKey` / `addMouseWheel` / `wantTextInput`. Toutes les valeurs `InputTextFlags` actuellement exposées sont transmises à Dear ImGui; les drapeaux dépendant de callbacks sont omis et `WordWrap` ne s'applique qu'à l'entrée multiligne.
- Composants de haut niveau et exemples : `logWindow` / `toast` / `alert` / `confirm` / `singleChoice` / `multiChoice` / `statsOverlay` / `dataTable`, plus `listExamples` / `getExampleSource` / `runExample` ; chaque session propose les mêmes fabriques.
- Références modifiables : `imgui.ref` léger (ou un objet `{value: x}`), plus les assistants compatibles à tableaux Java `imgui.bool` / `imgui.int` / `imgui.float` / `imgui.string` / `imgui.floats` / `imgui.strings`.
- Constantes: `Cond` / `WindowFlags` / `ChildFlags` / `InputTextFlags` / `SliderFlags` / `TreeNodeFlags` / `SelectableFlags` / `TabBarFlags` / `TabItemFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `Col` / `StyleVar` / `Themes` / `Appearance` / `Fonts` / `Icons` / `Dir` / `Key` / `MouseButton` / `ButtonFlags` / `TextureFlags` / `DrawListLayer` / `DrawFlags` / `LogLevel` / `ToastPosition` / `Limits`, correspondant aux énumérations Dear ImGui ou tables du plugin du même nom.

******

### Limitations connues

******

- Chaque moteur de script prend en charge une seule session de rendu native à la fois ; créez plusieurs fenêtres racines ImGui dans cette session pour plusieurs panneaux. Une nouvelle session superposée ou Activity ferme la précédente.
- `imgui.launch` nécessite une Activity AutoJs6 actuellement à l’état resumed ; utilisez `launchFloaty` lorsque le script doit continuer sans Activity hôte au premier plan.
- En v1.9, le mode privilégié est fixe en plein écran et limité au pointeur: pas d'IME/clavier, d'alpha/sécurité du calque hôte, de réduction, de boutons Android annexes ni de reconstruction dynamique après rotation. L'entrée directe n'utilise pas `EVIOCGRAB` et les politiques OEM SurfaceControl/SELinux peuvent encore refuser le démarrage; la sonde n'exécute pas `su` et ne demande pas Shizuku.

******

### Historique des versions

******

#### v1.9.4

###### 2026/10/05

* `Amélioration` Les icônes du centre de plugins utilisent les tailles, positions, images claires et sombres et fonds circulaires réglés dans Icon Studio, avec les sources et paramètres permettant de les reproduire
* `Amélioration` Les icônes des informations d'application Android utilisent les illustrations et les fonds clairs et sombres d'Icon Studio, en conservant les images transparentes du centre de plugins et les choix du lanceur

#### v1.9.3

###### 2026/09/19

* `Correctif` Avertissements de lecture SDK XML v4 avec AGP 9.1 et contrôles d'alignement natif des APK déclenchés par erreur lors de l'assemblage des tests unitaires JVM, avec les plugins de compilation partagés 1.8.3
* `Amélioration` compileSdk et targetSdk passent à 37 (Android 17) ; le comportement du plugin ne dépend pas de la nouvelle cible

#### v1.9.2

###### 2026/09/13

* `Correctif` Les informations de version et d'ABI du centre des plugins correspondent à l'APK installé
* `Correctif` Les dates de version utilisent un format anglais uniforme
* `Amélioration` Validation des versions, signatures et variantes complètes des APK avant la création des fichiers à télécharger

##### Pour consulter davantage de versions

* [CHANGELOG.md](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/assets/doc/CHANGELOG-fr.md)

******

### Compilation

******

```powershell
.\gradlew.bat :app:assembleDebug
```

Compilation Release avec noms de fichiers contenant le condensé CRC32:

```powershell
.\gradlew.bat :app:appendDigestToReleasedFiles
```

Vérification de l'inventaire des sources natives, de la parité des déclarations JNI, des tests unitaires et de l'intégrité de la répartition par ABI:

```powershell
.\gradlew.bat :app:verifyImGuiDebugApks
```

Les paramètres de compilation proviennent de `version.properties`; le SDK minimal actuel est 24 et le SDK cible est 36.

******

### Structure du projet

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

`index.js` est le module `imgui` côté moteur de script et `ImGuiBridge.cpp` est le pont JNI vers Dear ImGui. `strings.xml` contient les descriptions localisées du plugin et `plugin_instruction.md` contient les instructions d'utilisation affichées par l'hôte. Les fichiers README et CHANGELOG sont générés à partir des sources JSON par `.python/generate_markdown.py`; modifiez les sources JSON plutôt que les fichiers générés.

******

### Liens

******

- Projet AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Projet officiel Dear ImGui: https://github.com/ocornut/imgui
- Feuille de route des fonctionnalités: https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/Roadmap.md


[16 KB page alignment and build verification](https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/docs/16kb.md)

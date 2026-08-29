<!--suppress HtmlDeprecatedAttribute, HttpUrlsUsage -->

<div align="center">
  <p>
    <img src="https://github.com/SuperMonster003/AutoJs6-Plugin-ImGui/blob/master/app/src/main/res/mipmap/ic_launcher.png?raw=true" alt="autojs6-plugin-imgui-ic-launcher" border="0" width="128" />
  </p>

  <p>Créez des interfaces flottantes avec Dear ImGui</p>

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

Le plugin ImGui expose Dear ImGui sous la forme de l'objet global `imgui` dans les moteurs de script. Il affiche des contrôles en mode immédiat dans une fenêtre flottante transparente et réunit la création de fenêtre, la cadence des images, les interactions tactiles et la libération des ressources natives dans une API compacte.

******

### Fonctionnalités

******

- Charge l'objet global `imgui` par montage automatique ou avec `plugins.load(packageName)`.
- Crée des fenêtres flottantes transparentes dont la taille, la position, la fréquence d'image, la police et le déplacement par zone vide sont configurables.
- Fournit fenêtres, zones enfants, onglets, arbres, textes, boutons, entrées modifiables, sélecteurs, barres de progression, aides de mise en page, thèmes et fenêtre de démonstration Dear ImGui.
- Fournit des références modifiables booléennes, entières, décimales, textuelles et colorimétriques pour les contrôles avec état.
- Localise les informations du plugin, les instructions, le README et le CHANGELOG dans dix langues.

******

### Utilisation

******

Activez le montage automatique dans le Centre des plugins ou chargez explicitement le plugin, puis créez une fenêtre flottante:

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

Les contrôles modifiables mettent à jour les objets créés par `imgui.bool`, `imgui.int`, `imgui.float`, `imgui.string` et `imgui.floats`. `width`, `height` et `fontSize` utilisent des unités indépendantes de la densité. Faites glisser une zone vide pour déplacer la fenêtre ou utilisez `movable: false` pour la fixer.

******

### Aperçu de l'API

******

Les méthodes lower camel case correspondent aux opérations Dear ImGui courantes et des alias PascalCase sont disponibles pour les appels de contrôles familiers:

- Cycle de vie: `createWindow`, `closeWindow`, `withWindow`, `withChild`, `withTabBar`, `withTabItem` et `withTreeNode`.
- Contrôles: `text`, `button`, `checkbox`, `radioButton`, curseurs, champs modifiables, couleurs, progression, listes et éléments sélectionnables.
- Mise en page et état: méthodes de curseur et de largeur, `sameLine`, `separator`, `spacing`, requêtes d'élément et de capture.
- Constantes: `Cond`, `WindowFlags`, `InputTextFlags`, `SliderFlags`, `TreeNodeFlags`, `SelectableFlags`, `TabBarFlags`, `TabItemFlags` et `MouseButton`.

******

### Historique des versions

******

# v1.0.0

###### 2026/08/29

* `Fonctionnalité` Objet global `imgui` avec montage automatique et chargement explicite par `plugins.load`
* `Fonctionnalité` Fenêtres flottantes transparentes rendues par Dear ImGui 1.92.9 avec dimensions, fréquence d'image, polices et déplacement par zone vide configurables
* `Fonctionnalité` API en mode immédiat pour les fenêtres, la mise en page, le texte, les entrées, la sélection, les couleurs, la progression, les arbres, les onglets, les thèmes et la démonstration
* `Fonctionnalité` Références modifiables booléennes, entières, décimales, textuelles et colorimétriques pour les contrôles avec état
* `Fonctionnalité` Informations du plugin, instructions, README et CHANGELOG localisés dans dix langues
* `Dépendance` Ajout de Common Plugin API pour les métadonnées de découverte du plugin
* `Dépendance` Ajout de la bibliothèque standard Kotlin et de l'environnement d'exécution Parcelize 2.2.21
* `Dépendance` Ajout d'Apache Commons Compress 1.28.0 et de XZ for Java 1.10 pour les outils de compilation
* `Dépendance` Ajout de JUnit 4.13.2 pour les tests du contrat du plugin

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

Les paramètres proviennent de `version.properties`; le SDK minimal actuel est 24 et le SDK cible est 36.

******

### Structure des ressources

******

```text
.readme/lang_*.json
.changelog/lang_*.json
.python/generate_markdown.py
app/src/main/res/values-*/strings.xml
app/src/main/res/raw-*/plugin_instruction.md
```

`strings.xml` contient les descriptions localisées et `plugin_instruction.md` les instructions affichées par l'hôte. `.python/generate_markdown.py` génère les fichiers README et CHANGELOG à partir des sources JSON.

******

### Liens

******

- Projet AutoJs6: https://github.com/SuperMonster003/AutoJs6
- Projet officiel Dear ImGui: https://github.com/ocornut/imgui

******

### Historial de versiones

******

# v1.13.0

###### 2026/10/30

* `Aviso` Cambio de comportamiento: para ahorrar batería, una ventana dibuja ahora solo 10 fotogramas por segundo tras 3 segundos sin toques ni teclas, y deja de dibujar con la pantalla apagada o bloqueada; el siguiente toque recupera de inmediato la frecuencia completa. Si la ventana muestra una animación o datos que cambian sin entrada (un temporizador, un gráfico, una barra de progreso), pase idleFps: 0 a createWindow o llame a session.setIdleFps(0) para mantener la frecuencia completa
* `Función` ui.listClipper(itemCount, options, callback) (alias ListClipper) dibuja solo las filas visibles, de modo que una lista de 100000 filas se desplaza con fluidez; vea el nuevo ejemplo large-list
* `Función` Control de la frecuencia de fotogramas: opciones idleFps / idleDelay de createWindow, session.setFps / setIdleFps / getFps, los eventos de sesión idle / active y los campos idle / paused
* `Función` texture.update(source) reemplaza la imagen de una textura y conserva su identificador, así que las llamadas a image que la muestran no cambian; texture.width / height siguen el nuevo tamaño. Vea el nuevo ejemplo texture-refresh, que actualiza una vista previa dos veces por segundo
* `Función` createTexture y texture.update también aceptan un ArrayBuffer o un arreglo tipado (como Uint8Array) con datos PNG o JPEG
* `Función` statsOverlay muestra el tiempo de trabajo de cada fotograma (el tiempo de dibujo, sin esperar a la pantalla) y snapshot() lo devuelve como workTime
* `Mejora` docs/FRAME-LOOP.md explica las frecuencias de fotogramas y el ahorro de energía, y docs/LIMITS.md los límites de listClipper

# v1.12.0

###### 2026/10/29

* `Aviso` Cambio incompatible: las posiciones y tamaños de la ventana están ahora en dp en todas partes. Antes estaban en px los x / y de createWindow, los x / y / width / height / displayWidth / displayHeight de Session, setPosition / setSize, los datos de los eventos y los x / y de los botones flotantes; las coordenadas dentro de un fotograma siguen en px. Cómo actualizar los scripts se explica en docs/MIGRATION-1.12.md
* `Aviso` Cambio incompatible: un argumento incorrecto (tipo erróneo, NaN, número como cadena o valor fuera de rango) ahora lanza TypeError o RangeError con el nombre del método y del argumento, por ejemplo `imgui.sliderFloat: argument "max" must be a finite number`, en lugar de convertirse o limitarse en silencio; las opciones de ventana como fps, alpha y fontSize se comprueban igual
* `Aviso` Cambio incompatible: los campos de Session y de los botones flotantes son de solo lectura (asignar uno lanza una excepción en modo estricto); use los métodos set. FloatingButton.setPosition ya no acepta el argumento source, y un número como color de un botón flotante se interpreta como cualquier otro color de imgui (0xAABBGGRR, como devuelve colorU32) y no como un color ARGB de Android
* `Aviso` Cambio incompatible: los eventos de sesión, las devoluciones de llamada de los botones flotantes y los resultados de los diálogos se ejecutan en el hilo del script, donde se ejecuta la función de renderizado, y no en el hilo de interfaz de Android; consulte docs/THREADING.md
* `Función` imgui.dp() / imgui.px() (alias Dp / Px) convierten entre dp y px, e imgui.density da el número de px por dp
* `Función` Los colores aceptan en todas partes un número empaquetado, [r, g, b, a], {r, g, b, a} o "#rrggbbaa", incluidos textColored / pushStyleColor / setStyleColor / colorButton / tableSetBgColor; los argumentos r, g, b, a por separado siguen funcionando
* `Función` Ejemplo background-task: un hilo de trabajo realiza una tarea lenta mientras la ventana sigue dibujándose, con progreso y cancelación
* `Función` docs/THREADING.md explica en qué hilo se ejecuta cada devolución de llamada y cómo hacer trabajo lento en segundo plano, y docs/MIGRATION-1.12.md enumera los cambios en los scripts necesarios para esta versión
* `Corrección` Las devoluciones de llamada de eventos y de botones flotantes podían ejecutarse a la vez que la función de renderizado, y llamar a sleep en ellas producía un error
* `Corrección` Session.theme no cambiaba después de imgui.setTheme
* `Corrección` Al arrastrar la ventana, el evento moved informaba la fuente api en lugar de drag
* `Mejora` Los ejemplos usan ui.dp() en lugar de multiplicar por window.density
* `Mejora` Las declaraciones TypeScript indican la unidad y el rango permitido de cada tamaño, posición y opción, y marcan como readonly los campos de Session y de los botones flotantes
* `Mejora` Cada versión de GitHub incluye un archivo SHA256SUMS para comprobar los APK descargados

# v1.11.0

###### 2026/10/29

* `Aviso` Los métodos globales que actúan sobre la sesión de ventana activa (setTouchable / setMoreTouch / setGlobalAlpha / setSecure / collapseWindow / expandWindow / addButtonEx / getComponent) ahora lanzan `imgui.<name>: no active session` cuando no hay una sesión activa; antes getComponent devolvía null
* `Aviso` La opción de gráfico offset queda obsoleta; use valuesOffset en su lugar (offset sigue funcionando)
* `Función` Evento error de las sesiones de ventana: se emite cuando la función de renderizado o una devolución de llamada de evento lanza una excepción, con error, phase (render o event) y frame; con un oyente de error la sesión sigue renderizando y el manejador puede cerrarla, sin oyente se cierra con render-error como antes
* `Función` Opción de ventana debug: activa la recuperación de errores y el registro de depuración de Dear ImGui, avisa por console.warn de errores de uso como un Begin / End sin pareja y muestra las ventanas Metrics y Debug Log
* `Función` Ejemplo error-handling que muestra el evento error, el modo debug y cómo localizar errores comunes
* `Función` docs/ALIASES.md enumera todos los alias PascalCase y sus diferencias con las firmas C++ de Dear ImGui
* `Corrección` Las opciones valuesOffset y stride de plotLines / plotHistogram no tenían efecto
* `Mejora` Los errores de la función de renderizado o de una devolución de llamada de evento se muestran en la consola con su pila de llamadas, y un mismo error repetido se muestra una sola vez
* `Mejora` El README describe los alias como "alias de las API comunes", explica el modelo de sesión única (una sesión nueva cierra la anterior) y el uso de los miembros nuevos, e indica el SDK de destino 37

# v1.10.0

###### 2026/10/29

* `Aviso` Requiere AutoJs6 6.8.0 o posterior (versionCode 5935 o superior)
* `Corrección` Los parámetros del callback de renderizado de createWindow / launchFloaty / launch / launchPrivileged se declaraban como (session) en las declaraciones TypeScript; ahora coinciden con la llamada real (ui, session) y se añade el tipo RenderCallback
* `Mejora` Una vez habilitado, el plugin se usa directamente como objeto global imgui, que AutoJs6 registra y que carga el plugin en la primera llamada a un miembro, por lo que ya no se necesita plugins.load; la forma anterior plugins.load("io.github.supermonster003.autojs6.plugin.imgui") devuelve el mismo objeto
* `Mejora` Scripts de ejemplo, instrucciones de uso, README y declaraciones TypeScript actualizados al uso del objeto global; el archivo de declaraciones ya no amplía plugins.load con sobrecargas

# v1.9.4

###### 2026/10/05

* `Mejora` Los iconos del centro de plugins usan los tamaños, posiciones, imágenes claras y oscuras y fondos circulares ajustados en Icon Studio, conservando fuentes y parámetros reproducibles
* `Mejora` Los iconos de información de la aplicación de Android comparten las imágenes y los fondos claros y oscuros de Icon Studio, conservando las imágenes transparentes del centro de plugins y las opciones del lanzador

# v1.9.3

###### 2026/09/19

* `Corrección` Advertencias de lectura de SDK XML v4 con AGP 9.1 y comprobaciones de alineación nativa de APK activadas por error al ensamblar pruebas unitarias JVM, mediante los plugins de compilación compartidos 1.8.3
* `Mejora` compileSdk y targetSdk suben a 37 (Android 17); el comportamiento del plugin no depende del nuevo objetivo

# v1.9.2

###### 2026/09/13

* `Corrección` La versión y las ABI del centro de complementos coinciden con el APK instalado
* `Corrección` Las fechas de versión mantienen un formato uniforme en inglés
* `Mejora` Validación de las versiones, firmas y variantes completas de los APK antes de crear los archivos de descarga

# v1.9.1

###### 2026/09/11

* `Mejora` Verificación de compilación de la alineación de páginas de 16 KB en bibliotecas nativas de 64 bits, con controles del contrato manifest e informes JSON

# v1.9.0

###### 2026/08/30

* `Función` Añadido el backend seleccionable `launchPrivileged` / `WindowMode.Privileged`, con políticas explícitas `auto`, `shizuku` y `root` y diagnósticos en vivo mediante `Session.getBackendInfo()`
* `Función` Añadido un adaptador de host solo por reflexión que reutiliza RootMode, `RootUtils` / `ProcessShell` y el UserService `WrappedShizuku` ya autorizado por AutoJs6
* `Función` Añadido el protocolo Binder Surface v2 autenticado: un proceso privilegiado UID 0/2000 conserva la capa SurfaceControl y transfiere únicamente su Surface al renderizador completo existente del host
* `Función` Conectado el lector privilegiado Type A/Type B de `/dev/input` a la cola acotada de ImGui, con política de observación no exclusiva y control de callbacks mediante `Passthrough`
* `Corrección` Seleccionada la sobrecarga autoritativa de `IContentProvider.call` en Android 29+, conservando la authority real del Broker en el encuentro con Provider externo de API 31+
* `Corrección` El hijo `app_process` ahora usa un Looper que puede finalizar, eliminando el falso error `Main thread not allowed to quit` durante una limpieza correcta
* `Corrección` Protegido el enlace normal del Broker con el permiso de plugin de AutoJs6 y registro único del endpoint, además de las comprobaciones de UID, propietario, token en tiempo constante y muerte de Binder
* `Mejora` Capacidades del backend y TypeScript actualizados al schema v2 con estado Root/Shizuku del host, transporte Binder, límite de token de 256 bits, ubicación del renderizador y política direct-input
* `Mejora` Verificada la cadena real del host AutoJs6 en API 28 con Magisk root y API 31 con Shizuku 13.5: capas UID 0/2000, renderizado de la fachada JS existente, entrada Type A/Type B, capturas y cierre sin procesos huérfanos

# v1.8.0

###### 2026/08/30

* `Función` Se añadieron opciones `moreTouch` para ventanas/botones flotantes y `setMoreTouch` de sesión/global, controlando `FLAG_SPLIT_TOUCH` de forma uniforme
* `Función` Se añadieron `BackendStatus` y `getBackendCapabilities` con estados tipados para el backend de ventana, split-touch, proceso privilegiado, entrada directa, Docking y Multi-Viewport
* `Función` Se creó un corte vertical experimental en un `app_process` independiente: capa SurfaceControl → Surface → EGL ES 3 → Dear ImGui, con protocolo de frames por socket local autenticado mediante token de 256 bits
* `Función` Se implementó decodificación `/dev/input` de 16/24 bytes, seguimiento multitáctil Type A/Type B, mapeo con rotación y una cola acotada consumida al inicio del frame
* `Corrección` Los flags split-touch de Activity/overlay ahora cambian en ejecución; el cierre restaura los flags originales del host y sincroniza los botones existentes
* `Corrección` El protocolo privilegiado rechaza magic/versión incorrectos, cargas truncadas o excesivas y clientes sin autenticar, y limpia entrada, EGL, SurfaceControl y proceso
* `Mejora` Se validaron frames por socket UID 2000 → UID 0, la capa ImGui independiente y down/move/up de `/dev/input/event6` en un dispositivo root API 28; los tres tests conectados pasan en API 28 y 35
* `Mejora` Se añadieron documentos de arquitectura del backend privilegiado y Docking/Multi-Viewport, pruebas de protocolo/evdev y controles de build; P6 sigue explícitamente experimental

# v1.7.0

###### 2026/08/30

* `Función` Publicación de un `types/imgui.d.ts` completo que cubre las 214 API invocables, 36 grupos de constantes, sesiones, componentes, DrawList y entradas global/plugin/módulo, protegido por una prueba TypeScript estricta
* `Función` Ampliación de la biblioteca a cinco ejemplos ejecutables directamente: resumen de controles, panel de parámetros, HUD de registros, demo de tabla y galería de temas
* `Función` Nueva prueba instrumentada Android sobre una Surface real que cubre inicialización, construcción de cuadro, controles, renderizado, línea base semántica PixelCopy y cierre
* `Función` Nueva verificación de PR con GitHub Actions y automatización de versiones `v*` firmadas, con comprobación de firma y publicación de APK
* `Función` Nuevo snapshot de Dear ImGui con sumas verificadas y actualizador seguro por tag/commit inmutable, con verificación de archivo, dry-run y extracción por lista blanca
* `Corrección` Los eventos táctiles, IME, teclado y rueda ahora entran en una cola FIFO acotada sin bloqueo consumida al inicio del cuadro; reemplazarla durante el ciclo de vida impide que eventos tardíos lleguen a una nueva sesión nativa
* `Corrección` La planificación de cuadros ahora compensa plazos absolutos, reduce la deriva acumulada del trabajo y el temporizador y se restablece tras cuadros tardíos o contraídos
* `Mejora` Publicación y aplicación de `Limits`: 64 KiB de texto, 512 elementos de selección y 2.048 eventos de entrada en cola, con la decisión de configuración y su justificación de seguridad documentadas
* `Mejora` Verificación de compilación ampliada para cruzar API, alias, constantes, declaraciones TypeScript, ejemplos, invariantes de la cola de entrada y todos los hashes de fuentes vendorizadas

# v1.6.0

###### 2026/08/30

* `Función` Se añadieron referencias ligeras `imgui.ref(value)` y `{ value: ... }` a todos los controles con estado, manteniendo los ayudantes de matrices Java anteriores
* `Función` Se añadieron `logWindow` administrada por la sesión y notificaciones `toast` apiladas y temporizadas, con colores por nivel, exportación y limpieza determinista
* `Función` Se añadieron los diálogos Promise `alert`, `confirm`, `singleChoice` y `multiChoice`, con presentación modal en cola
* `Función` Se añadieron `statsOverlay` con colores por umbral y `dataTable` seleccionable, con filas estables, operaciones CRUD, barra de herramientas y renderizado personalizado
* `Función` Se incluyó el ejemplo completo `widget-overview` con `listExamples`, `getExampleSource`, `runExample` y metadatos de descubrimiento para el host
* `Corrección` Las promesas de diálogos pendientes ahora se resuelven con valores de cancelación deterministas y todos los componentes de alto nivel se eliminan al cerrar la sesión
* `Corrección` La consulta del código fuente de ejemplos queda limitada a una lista permitida del contrato y rechaza el recorrido de rutas
* `Corrección` Se serializó la recuperación tardía del Surface con los callbacks del holder de Android para evitar una inicialización nativa duplicada en dispositivos lentos
* `Mejora` Se añadieron `LogLevel` y `ToastPosition`, elevando el inventario a 35 grupos de constantes, además de alias PascalCase y verificación de fuentes ampliada
* `Mejora` Se validaron el renderizado de alto nivel, la ejecución del ejemplo público, la semántica de resultados y la limpieza en un dispositivo físico OpenGL ES 3.2

# v1.5.0

###### 2026/08/30

* `Función` Se añadieron `TouchMode.Touchable` / `Passthrough` / `Auto`; el modo Auto crea proxies táctiles transparentes por ventana ImGui para que las zonas vacías lleguen a la aplicación inferior
* `Función` Se añadieron `collapse` / `expand`, una miniburbuja de pocos FPS, botones `addButtonEx` arrastrables e independientes y controles dinámicos de opacidad y `FLAG_SECURE`
* `Función` Se añadieron el modo Activity de pantalla completa `imgui.launch` y el modo superpuesto explícito `launchFloaty`; un renderizador admite varias raíces `begin` / `withWindow`
* `Función` Se añadieron seguimiento adaptable de pantalla, tamaño externo `AlwaysAutoResize`, persistencia `iniPath` opcional y eventos de sesión
* `Corrección` Al destruirse, el Surface ahora se separa y vuelve a adjuntar sin perder el contexto EGL/ImGui ni los identificadores de textura administrados
* `Corrección` El paso táctil automático usa solo API públicas de Android y limita los proxies a 64 raíces interactivas
* `Mejora` La superficie JNI pasó de 186 a 190 enlaces y la verificación de fuentes cubre ahora la fachada de sesión P3
* `Mejora` Los indicadores de Activity, la interfaz del sistema, las superposiciones, los proxies táctiles y los botones flotantes se restauran o limpian de forma determinista al cerrar
* `Mejora` Se declaró el requisito de hardware OpenGL ES 3.0 en el manifiesto del APK y en la documentación de instalación

# v1.4.0

###### 2026/08/30

* `Función` Se añadió `createTexture` administrado por la sesión para rutas, datos codificados `byte[]` / `ByteBuffer`, `Bitmap` de Android, flujos y objetos `Image` de AutoJs6
* `Función` Se añadieron `image` / `imageButton` con tamaño natural y conservación de proporción, rangos UV, color de tinte y fondo
* `Función` Los resultados de AutoJs6 `images.read` y capturas de pantalla se conectan directamente a la creación de texturas sin reciclar imágenes propiedad del llamador
* `Función` Se añadieron capas DrawList de ventana, primer plano y fondo con primitivas de línea, rectángulo, círculo, triángulo, texto, polilínea, Bézier cúbica e imagen
* `Corrección` La carga de Bitmap ahora respeta el paso de fila y revierte el Alpha premultiplicado de Android, evitando bordes oscuros en colores translúcidos
* `Corrección` La eliminación de texturas se pospone hasta renderizar los datos en cola; los identificadores obsoletos, eliminados o de otra sesión se rechazan de forma segura
* `Mejora` Las vinculaciones JNI aumentaron de 172 a 186 y la verificación del código fuente cubre ahora la fachada de texturas y DrawList
* `Mejora` Se añadieron límites de 128 MiB para datos codificados, 32 megapíxeles y tamaño máximo de OpenGL, además de la limpieza automática de las texturas restantes de la sesión

# v1.3.0

###### 2026/08/30

* `Función` Se añadieron 11 temas completos mediante `Themes` / `setTheme(name)`, incluidos Pink, Blue, ModernDark, CyanDusk, OrangeDark, CrystalClear, VibrantNight y PurpleDream
* `Función` Se añadieron `setStyleColor` persistente y `setStyleProperties` por lotes; `createWindow` admite `theme`, `appearance`, `style` y accesos directos de redondeo, borde y sombra
* `Función` Se activó el canal de fuentes `AssetManager` con un subconjunto CJK integrado de unos 9.800 caracteres para sistemas reducidos sin Noto CJK
* `Función` Se añadieron `Fonts`, `pushFont` / `popFont` / `withFont` y `createWindow.fonts` para fuentes de assets/archivos, identificadores con nombre y tamaños dinámicos de Dear ImGui 1.92
* `Función` Se incluyó un subconjunto de 38 glifos Material Icons con la tabla `Icons` y el auxiliar `icon(name, label)`
* `Corrección` Los cambios de tema ahora restablecen de forma determinista el estilo base escalado por densidad, conservando el tamaño y las escalas globales de fuente
* `Mejora` La superficie JNI pasó de 167 a 172 enlaces; la verificación comprueba el inventario de temas/fuentes y la integridad SHA-256 de ambas fuentes
* `Mejora` Las fuentes predeterminada y adicionales fusionan el respaldo CJK y los iconos, sin que el script tenga que montar atlas manualmente

# v1.2.0

###### 2026/08/30

* `Función` Integración con el IME del sistema: al enfocar `inputText` / `inputTextMultiline` se abre automáticamente el teclado con texto en composición, texto confirmado y teclas de edición como Retroceso, Intro y flechas
* `Función` Se añadió `setKeyboardFocusHere` para que los scripts enfoquen activamente el siguiente control de entrada y lo entreguen al IME
* `Función` El desplazamiento con dos dedos ahora tiene inercia configurable mediante `fling` / `flingFriction` / `flingMinVelocity` / `flingMaxVelocity`
* `Función` Una pulsación larga configurable con un dedo emite un clic derecho; se añadieron `beginPopupContextItem` / `beginPopupContextWindow` / `withContextItem` / `withContextWindow`
* `Corrección` Al cancelar un arrastre, desplazamiento con dos dedos o transición de pulsación larga se limpia el control activo para evitar clics accidentales
* `Corrección` El callback de SurfaceHolder se registra antes de crear el proxy del IME para que una superficie ya válida no deje la sesión de renderizado sin inicializar
* `Corrección` La solicitud del teclado se reintenta cuando la ventana flotante obtiene el foco, evitando perderla antes de que Android sirva la vista del IME
* `Corrección` La documentación de inicio usa ahora `plugins.load` de forma predeterminada y describe el montaje automático del host como ajuste opcional de AutoJs6
* `Mejora` `verifyImGuiSource` comprueba ahora la cobertura de envoltorios en tres capas: JNI → conexión Java → fachada JavaScript
* `Mejora` La composición del IME sustituye la cadena de preedición anterior sin que el script gestione el proceso de candidatos

# v1.1.0

###### 2026/08/30

* `Función` Familia de API de tablas: `withTable` / `beginTable` / `tableNextRow` / `tableNextColumn` / `tableSetupColumn` / `tableSetupScrollFreeze` / `tableHeadersRow` / `tableSetBgColor`, con bordes, filas alternas, filas/columnas congeladas y colores de fondo
* `Función` Ventanas emergentes y menús: `openPopup` / `withPopup` / `withPopupModal` / `closeCurrentPopup` / `isPopupOpen` / `withMenuBar` / `withMenu` / `menuItem`
* `Función` Tooltips: `setTooltip` / `setItemTooltip` / `withTooltip` / `withItemTooltip`
* `Función` Control de interruptor `toggle` de estilo móvil con los alias `toggleSwitch` y `ToggleSwitch`
* `Función` Más controles y elementos de texto: `separatorText` / `bullet` / `bulletText` / `labelText` / `textDisabled` / `arrowButton` / `invisibleButton` / `inputInt` / `inputFloat` / `inputTextMultiline` / `listBox` / `withListBox` / `colorPicker3` / `colorPicker4` / `colorButton` / `plotLines` / `plotHistogram` / `treeNodeEx` / `vSliderFloat` / `vSliderInt` / `withCombo`
* `Función` Pilas de estilo y API de estructura: `pushStyleColor` / `popStyleColor` / `pushStyleVar` / `popStyleVar` / `setWindowFontScale` / `pushId` / `withId` / `withGroup` / `withDisabled` / `indent` / `unindent` / `alignTextToFramePadding`
* `Función` Familia de desplazamiento: `getScrollX/Y` / `getScrollMaxX/Y` / `setScrollX/Y` / `setScrollHereX/Y`
* `Función` Consultas de estado: `isItemActive` / `isItemEdited` / `isItemDeactivatedAfterEdit` / `isItemFocused` / `isWindowHovered` / `isWindowFocused` / `isWindowCollapsed` / `isMouseDown` / `isMouseClicked` / `isMouseDragging` / `getMousePos` / `getMouseDragDelta` / `calcTextSize` / `getFrameHeight` / `framerate`, entre otras
* `Función` Primitivas de entrada: `addInputCharacters` / `addKeyEvent` / `sendKey` / `addMouseWheel` / `wantTextInput`, que sientan el canal de eventos para la futura compatibilidad con IME
* `Función` El deslizamiento vertical con dos dedos desplaza el contenido de la ventana y se distingue automáticamente del arrastre de la ventana con un solo dedo
* `Función` Tablas de constantes ampliadas a 24 grupos con los nuevos `ChildFlags` / `ComboFlags` / `PopupFlags` / `HoveredFlags` / `FocusedFlags` / `ColorEditFlags` / `TableFlags` / `TableColumnFlags` / `TableRowFlags` / `TableBgTarget` / `Col` / `StyleVar` / `Dir` / `Key` / `ButtonFlags`
* `Corrección` Se corrigió una condición de carrera entre el hilo táctil y el hilo de renderizado sobre el contexto nativo; las consultas de interacción ahora leen una instantánea de fin de fotograma
* `Corrección` Se añadieron los alias PascalCase que faltaban para `WantCaptureMouse` y `StyleColorsDark` / `StyleColorsLight` / `StyleColorsClassic`
* `Mejora` La documentación y los ejemplos ahora describen el mecanismo del objeto global residente en el host y ya no sugieren llamar a `plugins.load`
* `Mejora` El código de versión requerido del host y la lista de ABI ahora proceden de la fuente única `ImGuiPluginContract` y los analiza el script de compilación
* `Mejora` Cada nueva API incluye un alias PascalCase que coincide con su homóloga de Dear ImGui

# v1.0.0

###### 2026/08/29

* `Función` Objeto global `imgui` montado automáticamente en los motores de scripts por el host
* `Función` Ventanas flotantes transparentes renderizadas por Dear ImGui 1.92.9 con dimensiones, frecuencia de fotogramas, fuentes y arrastre desde áreas vacías configurables
* `Función` API de modo inmediato para ventanas, diseño, texto, entrada, selección, color, progreso, árboles, pestañas, temas y demostración
* `Función` Referencias mutables booleanas, enteras, decimales, de texto y de color para controles con estado
* `Función` Metadatos del plugin, instrucciones de uso, README y CHANGELOG localizados en diez idiomas
* `Dependencia` Se añadió la Common Plugin API integrada para los metadatos de descubrimiento del plugin
* `Dependencia` Se añadieron la biblioteca estándar de Kotlin y el entorno de ejecución Parcelize versión 2.2.21
* `Dependencia` Se añadieron Apache Commons Compress 1.28.0 y XZ for Java 1.10 para las herramientas de compilación
* `Dependencia` Se añadió JUnit versión 4.13.2 para las pruebas del contrato del plugin

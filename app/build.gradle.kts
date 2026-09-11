import com.android.build.api.variant.FilterConfiguration
import org.gradle.api.GradleException
import org.gradle.api.file.RelativePath
import org.gradle.api.provider.Property
import java.io.File
import java.security.MessageDigest
import java.util.Properties
import java.util.zip.ZipFile

plugins {
    id("io.github.supermonster003.autojs6-native-alignment")
    id("org.autojs.build.utils")
    id("org.autojs.build.versions")
    id("org.autojs.build.signs")
    id("org.autojs.build.jvm-convention")
    id("com.android.application")
}

val globalApplicationId = "io.github.supermonster003.autojs6.plugin.imgui"
val buildTypeDebug = "debug"
val buildTypeRelease = "release"
val dearImGuiVersion = versions["IMGUI_VERSION"]
val nativeLibraryName = "autojs6_imgui"
val pluginContractFile = file(
    "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPluginContract.java",
)
val requiredHostVersionCode = Regex("REQUIRED_HOST_VERSION\\s*=\\s*(\\d+)L")
    .find(pluginContractFile.readText())
    ?.groupValues?.get(1)?.toLong()
    ?: throw GradleException("Unable to resolve REQUIRED_HOST_VERSION from ImGuiPluginContract.java")
val supportedAbis = listOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")

var isSignsValid = false

android {
    namespace = globalApplicationId
    compileSdk = versions.sdkVersionCompile
    ndkVersion = versions["IMGUI_NDK_VERSION"]

    defaultConfig {
        applicationId = globalApplicationId
        minSdk = versions.sdkVersionMin
        targetSdk = versions.sdkVersionTarget
        versionCode = versions.appVersionCode
        versionName = versions.appVersionName
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "DEAR_IMGUI_VERSION", "\"$dearImGuiVersion\"")
        buildConfigField("String", "VERSION_DATE", "\"${utils.getDateString("MMM d, yyyy", "GMT+08:00")}\"")

        resValue("string", "plugin_author", "SuperMonster003")

        manifestPlaceholders["imguiNativeAbis"] = supportedAbis.joinToString(",")
        manifestPlaceholders["imguiNativeLibrary"] = nativeLibraryName
        manifestPlaceholders["imguiRequiredHostVersion"] = requiredHostVersionCode
        manifestPlaceholders["imguiVersion"] = dearImGuiVersion

        ndk {
            abiFilters += supportedAbis.toSet()
        }
        externalNativeBuild {
            cmake {
                arguments += listOf(
                    "-DANDROID_STL=c++_static",
                )
                cppFlags += listOf("-std=c++17")
            }
        }
    }

    signingConfigs {
        val props = Properties().also { properties ->
            File("${project.rootDir}/sign.properties").takeIf(File::exists)?.let { signFile ->
                signFile.inputStream().use(properties::load)
                isSignsValid = properties.isNotEmpty()
            }
        }
        if (isSignsValid) {
            create(buildTypeRelease) {
                storeFile = props["storeFile"]?.let { file(it as String) }
                keyPassword = props["keyPassword"] as String
                keyAlias = props["keyAlias"] as String
                storePassword = props["storePassword"] as String
            }
        }
    }

    buildTypes {
        val proguardFiles = arrayOf<Any>(
            getDefaultProguardFile("proguard-android-optimize.txt"),
            "proguard-rules.pro",
        )
        val releaseSigningConfig = takeIf { isSignsValid }?.let {
            signingConfigs.getByName(buildTypeRelease)
        }
        debug {
            isMinifyEnabled = false
            proguardFiles(*proguardFiles)
            releaseSigningConfig?.let { signingConfig = it }
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(*proguardFiles)
            releaseSigningConfig?.let { signingConfig = it }
        }
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
            version = versions["IMGUI_CMAKE_VERSION"]
        }
    }

    splits {
        abi {
            isEnable = true
            reset()
            include(*supportedAbis.toTypedArray())
            isUniversalApk = true
        }
    }

    buildFeatures {
        aidl = true
        buildConfig = true
        resValues = true
    }

    lint {
        abortOnError = false
    }

    packaging {
        jniLibs.useLegacyPackaging = true
        resources.pickFirsts += setOf(
            "META-INF/LICENSE*",
            "META-INF/NOTICE*",
        )
    }
}

androidComponents {
    onVariants { variant ->
        variant.outputs.forEach { output ->
            val architecture = output.filters.find {
                it.filterType == FilterConfiguration.FilterType.ABI
            }?.identifier ?: "universal"
            val outputFileNameProperty = output.javaClass.methods.firstOrNull {
                it.name == "getOutputFileName" && it.parameterTypes.isEmpty()
            }?.invoke(output) as? Property<*>

            @Suppress("UNCHECKED_CAST")
            (outputFileNameProperty as? Property<String>)?.set(
                output.versionName.map { versionName ->
                    "${rootProject.name}-v$versionName-$architecture.apk".lowercase()
                },
            )
        }
    }
}

dependencies {
    implementation(files("$rootDir/libs/common-plugin-api.aar"))
    implementation(libs.kotlin.stdlib)
    implementation(libs.kotlin.parcelize.runtime)

    testImplementation(libs.junit)
    androidTestImplementation(libs.test.core)
    androidTestImplementation(libs.test.ext.junit)
    androidTestImplementation(libs.test.runner)
}

tasks {
    withType(JavaCompile::class.java) {
        options.encoding = "UTF-8"
    }

    register("verifyImGuiSource") {
        group = "verification"
        description = "Verifies Dear ImGui sources and JNI/Java/JavaScript bridge coverage"
        inputs.dir(file("src/main/cpp"))
        inputs.dir(file("src/main/assets/examples"))
        inputs.dir(file("src/main/aidl"))
        inputs.files(
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiNative.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPluginConnection.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiInputQueue.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiBackendCapabilities.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiHostPrivileges.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiLinuxInput.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegeBrokerProvider.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegeBrokerService.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegedProcess.java"),
            file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegedProtocol.java"),
            file("src/main/assets/plugin/index.js"),
            file("src/main/assets/types/imgui.d.ts"),
            file("../docs/DOCKING-MULTI-VIEWPORT.md"),
            file("../docs/FRAME-LOOP.md"),
            file("../docs/LIMITS.md"),
            file("../docs/PRIVILEGED-BACKEND.md"),
            file("../tools/update_imgui_upstream.py"),
        )

        doLast {
            val requiredFiles = listOf(
                "src/main/cpp/CMakeLists.txt",
                "src/main/cpp/ImGuiBridge.cpp",
                "src/main/cpp/third_party/imgui/LICENSE.txt",
                "src/main/cpp/third_party/imgui/UPSTREAM.md",
                "src/main/cpp/third_party/imgui/UPSTREAM.sha256",
                "src/main/cpp/third_party/imgui/imgui.cpp",
                "src/main/cpp/third_party/imgui/imgui.h",
                "src/main/cpp/third_party/imgui/backends/imgui_impl_android.cpp",
                "src/main/cpp/third_party/imgui/backends/imgui_impl_opengl3.cpp",
                "src/main/assets/fonts/README.md",
                "src/main/assets/fonts/LICENSE-NOTO-OFL.txt",
                "src/main/assets/fonts/LICENSE-MATERIAL-ICONS-APACHE-2.0.txt",
                "src/main/assets/examples/index.json",
                "src/main/assets/examples/widget-overview.js",
                "src/main/assets/examples/parameter-panel.js",
                "src/main/assets/examples/log-hud.js",
                "src/main/assets/examples/data-table-demo.js",
                "src/main/assets/examples/theme-gallery.js",
                "src/main/assets/types/imgui.d.ts",
                "src/main/aidl/io/github/supermonster003/autojs6/plugin/imgui/IImGuiInputCallback.aidl",
                "src/main/aidl/io/github/supermonster003/autojs6/plugin/imgui/IImGuiPrivilegeBroker.aidl",
                "src/main/aidl/io/github/supermonster003/autojs6/plugin/imgui/IImGuiPrivilegedEndpoint.aidl",
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiBackendCapabilities.java",
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiHostPrivileges.java",
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiLinuxInput.java",
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegeBrokerProvider.java",
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegeBrokerService.java",
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegedProcess.java",
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegedProtocol.java",
                "../docs/DOCKING-MULTI-VIEWPORT.md",
                "../docs/FRAME-LOOP.md",
                "../docs/LIMITS.md",
                "../docs/PRIVILEGED-BACKEND.md",
                "../tools/update_imgui_upstream.py",
            )
            val missing = requiredFiles.filterNot { file(it).isFile }
            if (missing.isNotEmpty()) {
                throw GradleException("Dear ImGui source inventory is incomplete: $missing")
            }
            val bundledFontHashes = mapOf(
                "src/main/assets/fonts/AutoJs6CjkFallback-Regular.otf" to
                    "37D12BE5931E07B2615A25E31600F9E13465BE6DCE39C3F0DFBAC9AFD8953124",
                "src/main/assets/fonts/AutoJs6MaterialIcons-Subset.ttf" to
                    "816E1C8F5D806A0B21F8451672DCCDB88E927A6150DE2BA5252E93CFF474BDFF",
            )
            val invalidFontAssets = bundledFontHashes.mapNotNull { (path, expectedHash) ->
                val asset = file(path)
                if (!asset.isFile) {
                    return@mapNotNull "$path=missing"
                }
                val digest = MessageDigest.getInstance("SHA-256")
                    .digest(asset.readBytes())
                    .joinToString("") { byte -> "%02X".format(byte.toInt() and 0xFF) }
                if (digest == expectedHash) null else "$path=$digest"
            }
            if (invalidFontAssets.isNotEmpty()) {
                throw GradleException("Bundled ImGui font assets failed verification: $invalidFontAssets")
            }
            val upstreamDirectory = file("src/main/cpp/third_party/imgui")
            val upstreamManifest = file("src/main/cpp/third_party/imgui/UPSTREAM.sha256")
            val upstreamEntries = upstreamManifest.readLines()
                .filter(String::isNotBlank)
                .associate { line ->
                    val match = Regex("^([0-9a-f]{64})  (.+)$").matchEntire(line)
                        ?: throw GradleException("Malformed Dear ImGui hash manifest line: $line")
                    match.groupValues[2] to match.groupValues[1].uppercase()
                }
            val invalidUpstreamFiles = upstreamEntries.mapNotNull { (path, expectedHash) ->
                val source = upstreamDirectory.resolve(path)
                if (!source.isFile) {
                    return@mapNotNull "$path=missing"
                }
                val canonicalBytes = source.readText(Charsets.UTF_8)
                    .replace("\r\n", "\n")
                    .replace("\r", "\n")
                    .toByteArray(Charsets.UTF_8)
                val digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonicalBytes)
                    .joinToString("") { byte -> "%02X".format(byte.toInt() and 0xFF) }
                if (digest == expectedHash) null else "$path=$digest"
            }
            if (upstreamEntries.isEmpty() || invalidUpstreamFiles.isNotEmpty()) {
                throw GradleException(
                    "Vendored Dear ImGui sources diverge from UPSTREAM.sha256: $invalidUpstreamFiles",
                )
            }
            val header = file("src/main/cpp/third_party/imgui/imgui.h").readText()
            val versionDefinition = Regex(
                "#define\\s+IMGUI_VERSION\\s+\\\"${Regex.escape(dearImGuiVersion)}\\\"",
            )
            if (!versionDefinition.containsMatchIn(header)) {
                throw GradleException("Expected Dear ImGui $dearImGuiVersion source")
            }
            val bridge = file("src/main/cpp/ImGuiBridge.cpp").readText()
            val nativeSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiNative.java",
            ).readText()
            val connectionSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPluginConnection.java",
            ).readText()
            val inputQueueSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiInputQueue.java",
            ).readText()
            val privilegedProcessSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegedProcess.java",
            ).readText()
            val privilegeBrokerProviderSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegeBrokerProvider.java",
            ).readText()
            val privilegeBrokerServiceSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegeBrokerService.java",
            ).readText()
            val hostPrivilegesSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiHostPrivileges.java",
            ).readText()
            val privilegedProtocolSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiPrivilegedProtocol.java",
            ).readText()
            val linuxInputSource = file(
                "src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiLinuxInput.java",
            ).readText()
            val scriptSource = file("src/main/assets/plugin/index.js").readText()
            val declarationSource = file("src/main/assets/types/imgui.d.ts").readText()
            val requiredFacadeTokens = listOf(
                "api.Limits",
                "api.BackendStatus",
                "api.getBackendCapabilities =",
                "api.Themes",
                "api.setTheme =",
                "api.setStyleProperties =",
                "api.Appearance",
                "api.Fonts",
                "api.pushFont =",
                "api.withFont =",
                "api.Icons",
                "api.icon =",
                "api.TextureFlags",
                "api.createTexture =",
                "api.destroyTexture =",
                "api.image =",
                "api.imageButton =",
                "api.DrawListLayer",
                "api.DrawFlags",
                "api.getWindowDrawList =",
                "api.getForegroundDrawList =",
                "api.getBackgroundDrawList =",
                "addBezierCubic:",
                "api.TouchMode",
                "api.WindowMode",
                "api.launch =",
                "api.launchPrivileged =",
                "api.addButtonEx =",
                "setTouchable: function",
                "api.setMoreTouch =",
                "setMoreTouch: function",
                "bridge.setWindowSplitTouch(",
                "collapse: function",
                "configurationChanged",
                "ref: valueRef",
                "api.LogLevel",
                "api.ToastPosition",
                "api.logWindow =",
                "api.toast =",
                "api.alert =",
                "api.confirm =",
                "api.singleChoice =",
                "api.multiChoice =",
                "api.statsOverlay =",
                "api.dataTable =",
                "api.listExamples =",
                "api.getExampleSource =",
                "api.runExample =",
                "renderHighLevelComponents(session)",
            )
            val missingFacadeTokens = requiredFacadeTokens.filterNot(scriptSource::contains)
            if (missingFacadeTokens.isNotEmpty()) {
                throw GradleException(
                    "ImGui JS facade and high-level component inventory is incomplete: $missingFacadeTokens",
                )
            }
            val inputQueueCapacity = Regex("DEFAULT_CAPACITY\\s*=\\s*(\\d+)")
                .find(inputQueueSource)?.groupValues?.get(1)?.toInt()
                ?: throw GradleException("Unable to resolve ImGui input queue capacity")
            val scriptInputQueueCapacity = Regex("InputQueueCapacity:\\s*(\\d+)")
                .find(scriptSource)?.groupValues?.get(1)?.toInt()
            val declarationInputQueueCapacity = Regex("InputQueueCapacity:\\s*(\\d+)")
                .find(declarationSource)?.groupValues?.get(1)?.toInt()
            if (scriptInputQueueCapacity != inputQueueCapacity ||
                declarationInputQueueCapacity != inputQueueCapacity
            ) {
                throw GradleException(
                    "Input queue capacity must agree across Java/JavaScript/TypeScript: " +
                        "$inputQueueCapacity/$scriptInputQueueCapacity/$declarationInputQueueCapacity",
                )
            }
            val queuedInputTokens = listOf(
                "inputQueue.drainTo(NATIVE_INPUT_SINK)",
                "queue.offerTouch(",
                "queue.offerCharacters(",
                "queue.offerKey(",
                "queue.offerWheel(",
            )
            val missingQueuedInputTokens = queuedInputTokens.filterNot(connectionSource::contains)
            if (missingQueuedInputTokens.isNotEmpty() || "NATIVE_LOCK.lock()" in
                connectionSource.substringAfter("public void touchEvent(int action, float x, float y, int mouseButton)")
                    .substringBefore("public long[] createTexture")
            ) {
                throw GradleException(
                    "ImGui input handoff is no longer lock-free: $missingQueuedInputTokens",
                )
            }
            val privilegedBackendTokens = mapOf(
                privilegedProcessSource to listOf(
                    "SurfaceControl\$Builder",
                    "getContentProviderExternal",
                    "broker.registerEndpoint(token, endpoint)",
                    "ImGuiLinuxInput.open(",
                    "callback.onTouch(",
                ),
                connectionSource to listOf(
                    "ImGuiHostPrivileges.execute(",
                    "broker.prepare(token)",
                    "endpoint.createSurface(",
                    "newPrivilegedSessionToken()",
                ),
                hostPrivilegesSource to listOf(
                    "WrappedShizuku",
                    "RootUtils",
                    "ProcessShell",
                    "execCommand",
                ),
                privilegeBrokerServiceSource to listOf(
                    "MessageDigest.isEqual(",
                    "enforcePrivilegedCaller()",
                    "A privileged endpoint is already registered",
                ),
                privilegeBrokerProviderSource to listOf(
                    "Binder.getCallingUid()",
                    "acquirePreparedBroker(arg)",
                ),
                privilegedProtocolSource to listOf(
                    "MAGIC = 0x4136494D",
                    "MAX_PAYLOAD_BYTES = 1024 * 1024",
                    "MAX_FRAME_TEXT_BYTES = 4096",
                ),
                linuxInputSource to listOf(
                    "EVENT_BYTES_32 = 16",
                    "EVENT_BYTES_64 = 24",
                    "ABS_MT_SLOT = 0x2F",
                    "ABS_MT_TRACKING_ID = 0x39",
                    "new ProcessBuilder(\"/system/bin/getevent\", \"-pl\")",
                ),
            )
            val missingPrivilegedBackendTokens = privilegedBackendTokens.flatMap { (source, tokens) ->
                tokens.filterNot(source::contains)
            }
            if (missingPrivilegedBackendTokens.isNotEmpty()) {
                throw GradleException(
                    "Privileged backend safety/transport/input inventory is incomplete: " +
                        missingPrivilegedBackendTokens,
                )
            }
            val initialApiFunctions = setOf(
                "bool",
                "float",
                "int",
                "string",
                "ref",
                "floats",
                "bytes",
                "strings",
                "version",
            )
            val facadeFunctions = Regex(
                "api\\.(\\w+)\\s*=\\s*function\\s*\\(",
            ).findAll(scriptSource).map { it.groupValues[1] }.toSet() +
                initialApiFunctions + setOf("toggleSwitch")
            val declaredFunctions = Regex(
                "(?m)^\\s+(\\w+)(?:<[^>\\n]+>)?\\s*\\(",
            ).findAll(declarationSource).map { it.groupValues[1] }.toSet()
            val missingFunctionDeclarations = facadeFunctions - declaredFunctions
            if (missingFunctionDeclarations.isNotEmpty()) {
                throw GradleException(
                    "imgui.d.ts is missing API functions: ${missingFunctionDeclarations.sorted()}",
                )
            }

            val aliasBlock = scriptSource.substringAfter("var aliases = {")
                .substringBefore("};", "")
            val facadeAliases = Regex("(?m)^\\s*(\\w+):\\s*\"(\\w+)\",?\\s*$")
                .findAll(aliasBlock)
                .associate { it.groupValues[1] to it.groupValues[2] }
            val missingAliasDeclarations = facadeAliases.filter { (alias, target) ->
                "readonly $alias: ApiCore[\"$target\"]" !in declarationSource
            }
            if (facadeAliases.isEmpty() || missingAliasDeclarations.isNotEmpty()) {
                throw GradleException(
                    "imgui.d.ts is missing PascalCase aliases: ${missingAliasDeclarations.keys.sorted()}",
                )
            }

            val constantBlocks = Regex(
                "api\\.(\\w+)\\s*=\\s*freeze\\(\\{(.*?)\\}\\);",
                setOf(RegexOption.DOT_MATCHES_ALL),
            ).findAll(scriptSource).toList()
            val missingConstantDeclarations = mutableListOf<String>()
            constantBlocks.forEach { match ->
                val group = match.groupValues[1]
                if (!Regex("readonly\\s+$group\\s*:").containsMatchIn(declarationSource)) {
                    missingConstantDeclarations += group
                    return@forEach
                }
                Regex("(?m)^\\s*(\\w+)\\s*:").findAll(match.groupValues[2]).forEach { member ->
                    if (!Regex("\\b${Regex.escape(member.groupValues[1])}\\b")
                            .containsMatchIn(declarationSource)
                    ) {
                        missingConstantDeclarations += "$group.${member.groupValues[1]}"
                    }
                }
            }
            if (constantBlocks.isEmpty() || missingConstantDeclarations.isNotEmpty()) {
                throw GradleException(
                    "imgui.d.ts is missing constants: ${missingConstantDeclarations.sorted()}",
                )
            }
            val declarationContractTokens = listOf(
                "declare const imgui: ImGui.Api",
                "(name: \"io.github.supermonster003.autojs6.plugin.imgui\"): ImGui.Api",
                "load(name: \"io.github.supermonster003.autojs6.plugin.imgui\"): ImGui.Api",
                "declare module \"io.github.supermonster003.autojs6.plugin.imgui\"",
            )
            val missingDeclarationContract = declarationContractTokens.filterNot(
                declarationSource::contains,
            )
            if (missingDeclarationContract.isNotEmpty()) {
                throw GradleException(
                    "imgui.d.ts is not integrated with the AutoJs6 declaration contract: " +
                        missingDeclarationContract,
                )
            }
            val holderCallbackRegistration = scriptSource.indexOf("holder.addCallback(surfaceCallback);")
            val queuedSurfaceProbe = scriptSource.indexOf(
                "surfaceView.post(new Runnable({",
                holderCallbackRegistration.coerceAtLeast(0),
            )
            val recoveredSurfaceCreated = scriptSource.indexOf(
                "surfaceCallback.surfaceCreated(holder);",
                queuedSurfaceProbe.coerceAtLeast(0),
            )
            if (holderCallbackRegistration < 0 || queuedSurfaceProbe < holderCallbackRegistration ||
                recoveredSurfaceCreated < queuedSurfaceProbe
            ) {
                throw GradleException(
                    "The late-Surface recovery probe must remain serialized on the SurfaceView UI queue",
                )
            }
            val nativeDeclarations = Regex(
                "static\\s+native\\s+\\S+\\s+(native\\w+)\\s*\\(",
            ).findAll(nativeSource)
                .map { it.groupValues[1] }
                .toSet()
            val missingSymbols = nativeDeclarations.filterNot { method ->
                "ImGuiNative_$method" in bridge
            }
            if (nativeDeclarations.isEmpty() || missingSymbols.isNotEmpty()) {
                throw GradleException(
                    "ImGui JNI bridge is missing native methods: ${missingSymbols.sorted()}",
                )
            }

            val connectionNativeCalls = Regex(
                "ImGuiNative\\.(native\\w+)\\s*\\(",
            ).findAll(connectionSource).map { it.groupValues[1] }.toSet()
            val unwrappedNativeMethods = nativeDeclarations - connectionNativeCalls
            if (unwrappedNativeMethods.isNotEmpty()) {
                throw GradleException(
                    "ImGuiPluginConnection does not wrap native methods: " +
                        unwrappedNativeMethods.sorted(),
                )
            }

            val connectionMethods = Regex(
                "(?m)^ {4}public\\s+[\\w<>?\\[\\]]+\\s+(\\w+)\\s*\\(",
            ).findAll(connectionSource).map { it.groupValues[1] }.toSet()
            val hostLifecycleMethods = setOf(
                "getVersion",
                "getAssetsScriptDir",
                "getService",
                "onServiceConnected",
                "onServiceDisconnected",
            )
            val scriptBridgeCalls = Regex(
                "bridge\\.(\\w+)\\s*\\(",
            ).findAll(scriptSource).map { it.groupValues[1] }.toSet()
            val unwrappedConnectionMethods = connectionMethods - hostLifecycleMethods - scriptBridgeCalls
            if (connectionMethods.isEmpty() || unwrappedConnectionMethods.isNotEmpty()) {
                throw GradleException(
                    "index.js does not wrap ImGuiPluginConnection methods: " +
                        unwrappedConnectionMethods.sorted(),
                )
            }
        }
    }

    register("verifyImGuiDebugApks") {
        group = "verification"
        description = "Verifies unit tests and native ABI inventories in debug APKs"
        dependsOn("assembleDebug", "testDebugUnitTest", "verifyImGuiSource")

        doLast {
            val apkDirectory = layout.buildDirectory.dir("outputs/apk/debug").get().asFile
            val apks = apkDirectory.walkTopDown()
                .filter { it.isFile && it.extension == "apk" }
                .sortedBy(File::getName)
                .toList()
            val inventories = apks.map { apk ->
                ZipFile(apk).use { zip ->
                    zip.entries().asSequence()
                        .map { it.name }
                        .filter { it.matches(Regex("lib/[^/]+/lib$nativeLibraryName\\.so")) }
                        .map { it.substringAfter("lib/").substringBefore('/') }
                        .toSet()
                }
            }
            val expected = supportedAbis.mapTo(mutableSetOf()) { setOf(it) }.apply {
                add(supportedAbis.toSet())
            }
            if (apks.size != supportedAbis.size + 1 || inventories.toSet() != expected) {
                throw GradleException(
                    "Unexpected ImGui APK inventory: " + apks.indices.joinToString {
                        "${apks[it].name}=${inventories[it]}"
                    },
                )
            }
            println(
                "Verified ImGui debug APKs: " + apks.indices.joinToString {
                    "${apks[it].name}=${inventories[it]}"
                },
            )
        }
    }

    register<Sync>("appendDigestToReleasedFiles") {
        group = "distribution"
        description = "Copies release APKs and appends a CRC32 digest to each filename"
        dependsOn("assembleRelease")

        val extension = utils.FILE_EXTENSION_APK
        val sourceDirectory = layout.buildDirectory.dir("outputs/apk/$buildTypeRelease")
        val destinationDirectory = file("${buildTypeRelease}s")

        from(sourceDirectory) {
            include("**/*.$extension")
        }
        into(destinationDirectory)
        includeEmptyDirs = false
        duplicatesStrategy = DuplicatesStrategy.FAIL

        eachFile {
            val digest = utils.digestCRC32(file)
            val digestedName = "${name.removeSuffix(".$extension")}-$digest.$extension"
            relativePath = RelativePath(true, digestedName)
        }

        doLast {
            println("Destination: $destinationDirectory")
        }
    }
}

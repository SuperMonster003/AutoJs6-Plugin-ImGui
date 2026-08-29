import com.android.build.api.variant.FilterConfiguration
import org.gradle.api.GradleException
import org.gradle.api.file.RelativePath
import org.gradle.api.provider.Property
import java.io.File
import java.util.Properties
import java.util.zip.ZipFile

plugins {
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
val requiredHostVersionCode = 3853L
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

        buildConfigField("String", "DEAR_IMGUI_VERSION", "\"$dearImGuiVersion\"")
        buildConfigField("String", "VERSION_DATE", "\"${utils.getDateString("MMM d, yyyy", "GMT+08:00")}\"")

        resValue("string", "plugin_author", "SuperMonster003")

        manifestPlaceholders["imguiNativeAbis"] = supportedAbis.joinToString(",")
        manifestPlaceholders["imguiNativeLibrary"] = nativeLibraryName
        manifestPlaceholders["imguiRequiredHostVersion"] = requiredHostVersionCode
        manifestPlaceholders["imguiVersion"] = dearImGuiVersion

        ndk {
            abiFilters += setOf("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
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
            include("arm64-v8a", "armeabi-v7a", "x86_64", "x86")
            isUniversalApk = true
        }
    }

    buildFeatures {
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
}

tasks {
    withType(JavaCompile::class.java) {
        options.encoding = "UTF-8"
    }

    register("verifyImGuiSource") {
        group = "verification"
        description = "Verifies the vendored Dear ImGui source and JNI bridge inventory"
        inputs.dir(file("src/main/cpp"))

        doLast {
            val requiredFiles = listOf(
                "src/main/cpp/CMakeLists.txt",
                "src/main/cpp/ImGuiBridge.cpp",
                "src/main/cpp/third_party/imgui/LICENSE.txt",
                "src/main/cpp/third_party/imgui/imgui.cpp",
                "src/main/cpp/third_party/imgui/imgui.h",
                "src/main/cpp/third_party/imgui/backends/imgui_impl_android.cpp",
                "src/main/cpp/third_party/imgui/backends/imgui_impl_opengl3.cpp",
            )
            val missing = requiredFiles.filterNot { file(it).isFile }
            if (missing.isNotEmpty()) {
                throw GradleException("Dear ImGui source inventory is incomplete: $missing")
            }
            val header = file("src/main/cpp/third_party/imgui/imgui.h").readText()
            val versionDefinition = Regex(
                "#define\\s+IMGUI_VERSION\\s+\\\"${Regex.escape(dearImGuiVersion)}\\\"",
            )
            if (!versionDefinition.containsMatchIn(header)) {
                throw GradleException("Expected Dear ImGui $dearImGuiVersion source")
            }
            val bridge = file("src/main/cpp/ImGuiBridge.cpp").readText()
            val nativeDeclarations = Regex(
                "static\\s+native\\s+\\S+\\s+(native\\w+)\\s*\\(",
            ).findAll(file("src/main/java/io/github/supermonster003/autojs6/plugin/imgui/ImGuiNative.java").readText())
                .map { it.groupValues[1] }
                .toSet()
            val missingSymbols = nativeDeclarations.filterNot { method ->
                "ImGuiNative_$method" in bridge
            }
            if (nativeDeclarations.isEmpty() || missingSymbols.isNotEmpty()) {
                throw GradleException("ImGui JNI bridge is missing native methods: $missingSymbols")
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

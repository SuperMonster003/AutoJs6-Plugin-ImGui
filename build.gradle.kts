plugins {
    id("com.android.application") version System.getProperty("gradle.agp.version") apply false
}

allprojects {
    repositories {
        mavenCentral()
        google()
        gradlePluginPortal()
        maven("https://maven.aliyun.com/repository/central")
        maven("https://maven.aliyun.com/repository/google")
        maven("https://maven.aliyun.com/repository/gradle-plugin")
        maven("https://maven.aliyun.com/repository/public")
    }
}

tasks {
    register<Delete>("clean").configure {
        delete(rootProject.layout.buildDirectory)
    }
}

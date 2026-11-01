// The AutoJs6 globals that the bundled examples use. Java packages stay `any`: the type check is about the ImGui API.

/// <reference path="../../main/assets/types/imgui.d.ts" />

/** The loader of imgui.runExample passes the example as a module. */
declare const module: { exports: ImGui.ExampleRunner | object };
declare const options: { __imguiExampleLoader?: boolean };

declare const android: any;
declare const java: any;
declare const images: any;
declare const threads: { start(body: () => void): object };

declare const console: { log(...values: any[]): void };
declare function setTimeout(callback: () => void, delay?: number): number;
declare function setInterval(callback: () => void, delay?: number): number;
declare function clearInterval(id: number): void;

# 角色来源与处理

玩家角色来自学生在 2026-09-09 提供的 `peak-characters.zip`。附件内层 `PEAK Characters.rar` 包含 Blender / FBX 网格和贴图；原文件没有骨骼与动画。

本项目选用第三个角色，用本地 Blender 修复贴图路径、压缩贴图尺寸、简化部分围巾网格、添加基础骨骼并导出 `peak-character.glb`。动作由 `source/main.js` 实时驱动。模型与贴图一同包含在 GLB 中，无远程资源依赖。

这是学生提供素材的来源记录，不表示这些模型由 Codex 原创，也不表示本项目与 PEAK 官方有关联。详细处理信息见 `provenance.json`。父母角色和室内家具继续使用项目原有的程序化几何。

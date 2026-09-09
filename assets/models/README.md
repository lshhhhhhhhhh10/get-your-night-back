# 角色来源与处理

玩家角色来自学生在 2026-09-09 提供的 `peak-characters.zip`。附件内层 `PEAK Characters.rar` 包含 Blender / FBX 网格和贴图；原文件没有骨骼与动画。

本项目选用第三个角色，用本地 Blender 修复贴图路径、压缩贴图尺寸、简化部分围巾网格、添加基础骨骼并导出 `peak-character.glb`。动作由 `source/main.js` 实时驱动。模型与贴图一同包含在 GLB 中，无远程资源依赖。

这是学生提供素材的来源记录，不表示这些模型由 Codex 原创，也不表示本项目与 PEAK 官方有关联。详细处理信息见 `provenance.json`。家长现在也使用同一份附件角色，独立克隆骨骼，体型放大 12%，服装轻微偏紫，带睡姿和巡查动作；没有新增或声称来自附件的原生动画。室内家具仍由程序化几何构成。


## v0.7.0 衣柜新增

- `peak-character-1.glb`：附件 Character 1，螃蟹造型。修复贴图，螃蟹帽减面，补同名基础骨骼。
- `peak-character-2.glb`：附件 Character 2，厨师造型。修复贴图，厨师帽减面，补同名基础骨骼。
- 纸箱、抱枕耳罩、星星睡帽由 `source/skin-model.js` 用程序化几何构成，部分衣服使用独立纯色材质。基础人体、脸部和骨架来源仍是第三个附件角色。

新增角色处理记录见 `character-1-provenance.json`、`character-2-provenance.json`，可重现脚本见 `source/tools/export-wardrobe.py`。六张卡片缩略图与首页衣柜图由实际游戏预览截取。此记录不赋予或声称其他游戏的模型许可；没有下载其他游戏角色包。


## 家猫（v0.9.0）

家猫由本项目 `source/cat-model.js` 的程序几何直接生成，未使用 PEAK 附件或下载其他游戏的猫模型。橘色身体、曲面条纹、圆头、耳朵、胡须、眼睛、四肢和分节尾巴均在代码中制作与驱动。没有新增 GLB 或贴图文件；场景和接花瓶特写共用这套模型。行为在 `source/cat.js` 中维护，声音在 `source/audio.js` 中合成。

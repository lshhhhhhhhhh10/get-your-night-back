# 门与物件录音来源

除 `hinge-real.wav` 外，本目录 WAV 由 laleksic 的 **Various Sound Effects** 剪辑转换而来。

- 作者与来源：https://opengameart.org/content/various-sound-effects
- 下载地址：https://opengameart.org/sites/default/files/sounds_8.zip
- 许可：CC0 1.0，https://creativecommons.org/publicdomain/zero/1.0/
- 2026-09-09 核对：作者说明为手机录音、经 Audacity 去噪，页面明确标注 CC0。
- 处理：65 Hz 高通、8 ms 淡入、峰值限制至 0.85、32 kHz 单声道 PCM；运行时按动作切片、调整音量与播放速率。

| 本地文件 | 原文件 | 用途 |
| --- | --- | --- |
| door-handle.wav | door_open.wav | 转动把手、开门起始 |
| door-hinge.wav | door_creak_open.wav | 家长推门与新录音载入失败时的后备素材 |
| door-bump.wav | door_close.wav | 旧版木门碰撞素材；v0.11 玩家推门不再周期触发 |
| door-latch.wav | lock.wav | 门锁机械声切片 |
| drawer.wav | drawer_open.wav | 搜索抽屉时的滑动 |
| metal-drop.wav | clang_metal.wav | 叉子、铁盒落地 |

其余音乐和音效仍由项目 Web Audio 程序生成。运行时只访问本仓库资源，不请求外部音频服务。

## v0.11 连续门轴录音

- 本地文件：`hinge-real.wav`。
- 作者：**chonkdonk**；作品：**creaky door hinge.wav**。
- 原始页面：https://freesound.org/people/chonkdonk/sounds/619819/
- 页面公开提供的 HQ MP3 试听：https://cdn.freesound.org/previews/619/619819_13093778-hq.mp3
- 2026-09-10 核对：作者说明是门轴吱响、页面同时标注 CC0 / Public Domain 和 CC0 许可链接：https://creativecommons.org/publicdomain/zero/1.0/ 。使用的是公开 HQ 试听转换素材，并非声称取得登录后原始 24 bit WAV。
- 处理：选择原录音 0.55 秒起的约 16.3 秒；85 Hz 高通、6500 Hz 低通、增益 26 倍（原试听电平很低）；移除超过 0.13 秒、低于 −42 dB 的静段，保留短停顿；局部动态电平调整最大 4 倍、峰值限制 0.85；32 kHz 单声道 PCM 和起始淡入。
- 运行时：约 2.35 秒长的不同声段交叠 0.32 秒；按施力微调播放速率，摩擦控制音量与滤波，释放后约 65 ms 结束声源。没有把短促电子滑音叠在此录音上，也不把其当作角色语音。

新文件由仓库本地加载，无运行时 Freesound 请求。门把手与门锁仍沿用上表的真实录音。

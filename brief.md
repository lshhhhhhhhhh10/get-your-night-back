# First Playable Web Game Brief

> This summary and the accompanying system graph are the two primary development references. Build from both. If they conflict, preserve the learning goal and ask the student before changing the core design.

## 1. Project Identity
- Student / Team: Daniel
- Project Title: Get Your Night Back
- Domain: 在晚上偷手机
- Tool / AI Agent: codex

## 2. Design Summary
**Domain and real experience:** 在晚上偷被家长藏起来的电子设备

这是我初中时几乎每个晚上的必玩项目，在游戏时，我发现他不只看起来这么简单，你要考虑到木地板是否会在落脚时发出吱呀声，家长是否已经熟睡，开关门时门轴是否会发出声响等等。整个过程不仅取决于自身的敏捷性以及肢体协调性，更考验对外界环境的判断以及在压力环境下的即时决策。

**Novice misconception:** 初学者认为：只要走的够轻巧，就不会被发现

**Most important domain challenge:** 光线，声音，信息不足

初学者通常把门开的太慢，但未发现这反而会增加门轴发出声音的几率，初学者虽然注意落脚的轻巧程度，但是忘记注意脚下的木地板是否实心是否会发出声音，

**Core learning shift:** 一开始只关注自己的动作，但精通后更多是对于环境的判断以及对父母行为的预测

## 3. Core Player Learning Loop
**Observe:** 需要观察地形，考察地板材质，门轴新旧程度，听父母动静是否还有鼾声，听门轴或者地板踩下时发出时声响是否超出阈值需要终止行动

**Judge:** 判断手机被藏在哪些有可能的机会，还有多远，判断推门时的速度，落脚的轻巧程度，重心是否稳定和时机，是否有掩体如果家长起夜

**Act:** 调整出脚的敏捷度，当来回转的指针在一个区间内落脚时为最好；开门的速度，开门快慢觉得门轴发生声响的响度以及几率；躲进那个掩体后面躲避家长的视线；面对突发事件比如花瓶不小心被碰掉时的反应，当来回转的指针在一个区间内则可以捡起

**Read feedback:** 用家长的鼾声强弱，是否翻身，是否起床检视；环境变量中的门轴发出的音量，地板踩下后的音量等反馈

**Adjust:** 若音量太高，鼾声变小，则停止行动；若音量超出阈值，家长起身，则终止行动或找掩体等

**Ability improved through repetition:** 更敏捷，洞察力更强，更等随机应变

## 4. Data Model for the System Graph

### Environment Data
- 需要观察地形，考察地板材质，门轴新旧程度，听父母动静是否还有鼾声，听门轴或者地板踩下时发出时声响是否超出阈值需要终止行动

### Player-Controlled Data
- 调整出脚的敏捷度，当来回转的指针在一个区间内落脚时为最好；开门的速度，开门快慢觉得门轴发生声响的响度以及几率；躲进那个掩体后面躲避家长的视线；面对突发事件比如花瓶不小心被碰掉时的反应，当来回转的指针在一个区间内则可以捡起

### System-Calculated Results
- 用家长的鼾声强弱，是否翻身，是否起床检视；环境变量中的门轴发出的音量，地板踩下后的音量等反馈

### Feedback Translation
- 动作产生的声响：来自落脚、门轴和碰到物件；告诉玩家当前动作是否适合这块地板或这扇门。用不同强度的脚步声、吱呀声、短暂声波和物件晃动表现，让玩家把自己的操作与声音来源对应起来。
- 父母的状态变化：来自卧室里的鼾声、翻身、床板声和起身脚步。提示父母可能由熟睡转为警觉或开始检查。用声音停顿、翻身动画、门缝灯光和靠近的脚步表现；单一线索不直接等于被发现，需要结合多个信号判断。
- 危险的空间关系：来自玩家与父母、掩体、设备可能藏点的位置关系。告诉玩家当前路线是否暴露、是否还有撤退和躲藏的余地。用有限照明、遮挡关系、移动的灯光和声音方位表现；不直接透视显示设备位置。

## 5. Challenge Space
**Challenge factors (affecting player-controlled data):** 落脚时机←地板材质、易响区域与目标区间宽度；开门速度←门轴状态与门后空间；路线／移动方向←房间布局、光线、掩体和父母动向；停下／继续←鼾声变化、翻身声、脚步距离；搜索／躲藏←候选藏点、遮挡和巡查路线；接物件时机←物件位置和晃动预警。环境改变输入的最佳选择及后果，而不是替玩家操作。

**Factors that force a new judgment:** 地板更易响时需要换落脚点或路线，不能只追求精准按键；门轴变旧时需要重新试探速度；父母由熟睡转为检查时应停止搜索、判断路径并躲藏；照明和掩体位置变化会改变安全路线；设备藏点变化要求搜索而非背答案。

**Perceivable vs inferred factors:** 直接感知：视野内的地板外观、门、掩体、物件、照明和操作指针，以及当下的脚步、门轴声与鼾声。
逐步推断：哪块地板容易响、某扇门适合的速度、连续声响是否已惊动父母、视野外脚步的方向、哪些藏点更可能有设备。线索可能不完整，玩家需要交叉验证；不让关键危险毫无预兆。

**Challenge dimension table:** 1. 地板：简单状态是易响区域清楚、落脚区间宽；困难状态是安全落脚点较少、区间变窄。先学按时落脚，再学换路线。
2. 门轴：简单状态是合适速度区间宽、声音反馈清楚；困难状态是区间窄、靠近父母。先学动作与声音的关系，再判断是否应暂停或换路。
3. 父母状态：简单状态为稳定熟睡；困难状态有起夜和检查，但保留翻身、床声、脚步等预警。先学观察，再学应急躲藏和恢复行动。

**2-3 progressive challenge combinations:** 挑战一“第一声吱呀”：固定短路线＋一块易响地板＋一扇门＋熟睡父母。玩家从卧室进入走廊，试出落脚时机和开门速度，训练动作与声响的因果判断。
挑战二“今晚走哪边”：两条路线＋不同地板与门轴＋多个候选藏点＋有限照明。玩家权衡距离与声响，训练环境观察、路线选择和搜索。
挑战三“脚步近了”：沿用已学地形＋有预警的父母起夜＋掩体＋一次可接住的晃动物件。玩家决定停下、躲藏、处理意外或撤退，训练压力下的判断。先分别教会每个要素，再组合考验。

**Simple-to-complex sequence:** 有。先在低压力环境学习一个动作及其声音反馈，再加入路线与藏点选择，最后加入父母移动和意外事件。难度来自需要综合的信息和决策增多，不只来自指针变快。新机制先给安全练习机会，再进入组合挑战。

**What failure teaches next:** 失败后简短回放关键因果链，例如“踩响地板→父母翻身→继续开门→父母起身→进入视线”。标出当时已出现的声音和画面线索，提示下一次应观察地板、门轴声或脚步，再选择改时机、换路、暂停或躲藏。保留快速重试，避免只显示“失败”或揭示全部隐藏信息。

## 6. Visual & Camera
**Camera perspective:** 以略高角度的第三人称跟随镜头为主，能同时看清搞笑角色的身体动作、附近地板、路线和掩体。开门、搜索、接住物件时平滑拉近为肩后或手部特写，突出动作细节；完成后回到探索镜头。混合的是同一3D场景里的镜头距离与角度，不切换成另一套操作模式。关键声响提示始终保留，不在追查中强制切镜，不让镜头显示墙后的父母或设备。

**Why this perspective fits the learning shift:** 较高的第三人称镜头帮助玩家从只盯落脚指针，转向观察地板、路线、掩体和父母动向，符合核心学习转变；近距离操作特写让玩家看清门缝、手脚动作和摇晃的花瓶，也放大蹑手蹑脚的喜剧感。镜头切换短而平滑，保持方向与操作一致，让好看服务于判断，而不是挡住线索。

**2D / 2.5D / 3D:** 采用真正的3D场景与角色，搭配简洁的2D指针和状态提示。第一版用低多边形几何体、模块化室内家具、少量骨骼动画和有限灯光完成一间住宅。混合镜头共用同一套场景、模型与控制，不额外制作独立2D关卡。夸张动作优先用预设动画，不依赖全身布娃娃物理，以控制制作量和判定稳定性。

**Visual style:** 美术定为“低多边形的深夜家庭潜行喜剧”。角色参考方向采用PEAK式的简洁、滑稽气质，具体使用原创角色：圆润的大脑袋、豆子或胶囊状躯干、简化四肢、少量五官和纯色睡衣。用夸张踮脚、突然僵住、慌张接花瓶和成功后的得意动作制造幽默；父母也保持卡通感。家具轮廓清楚，采用平涂色块与柔和阴影，避免写实皮肤和复杂纹理。模型简单不等于动画自动简单，因此先用少量关键动作建立表现力。

**Color tone:** 总体昏暗、偏冷，用深蓝与灰紫表现夜晚；卧室和门缝透出少量暖黄，形成冷暖对比，卧室也成为返程的视觉目标。玩家睡衣保留清楚的轮廓与辨识色，重要地板、掩体和物件不能黑到看不清。父母检查时移动的暖光改变可见空间；警觉提示少量使用橙红，并同时配合动作或声音。氛围紧张但带生活感和喜剧感，不走血腥恐怖路线。

**Sound:** 声音以紧张、克制和留白为主：不同材质的脚步、门轴吱呀、衣物摩擦、物件晃动与落地、父母鼾声、翻身床声、开门声和有方向感的脚步。保留安静时段，让细小变化成为可判断的信息；背景音乐尽量少，不能盖住关键线索。提供音量调节与对应的视觉提示／字幕，避免必须听清微弱声音才能玩。

## 7. AI Collaboration Boundary
**Student-owned decisions (AI must not change):** 保留的核心：夜间取回被家长藏起的电子设备这一情境；从只关注自身动作到观察环境、判断父母状态的学习转变；落脚指针、可调开门速度、掩体躲藏及带预警的接物件机制；动作声音影响父母警觉、父母状态影响行动选择的因果链。已确认成功条件为携带设备安全返回卧室，拿到设备本身不结算；被父母识别后失败，一次声响只引发风险和检查。视觉基线为低多边形3D潜行喜剧，高位第三人称探索配近距离操作特写，角色简洁、圆润、滑稽。AI可在这个方向内细化美术与镜头，但不得改成纯反应按键、纯找物或无预警随机失败；改变胜负条件、核心机制、整体视觉方向或操作模式前需要我确认。

**AI-autonomous decisions:** 允许AI自主完成代码结构、输入处理、状态管理、声音与动画接入、保存与重试、适配不同屏幕，以及修复问题；可以在已确认的视觉方向内微调排版、颜色对比和反馈可读性。数值、指针区间与警觉阈值可提出可调的初版并通过试玩优化，但不得擅自改变核心体验、胜负条件、视角，或增加复杂的新系统。涉及这些变化时先说明原因和方案，再由我决定。

**How to detect and pull back a generic game:** Not specified yet.

## 8. Rules, Boundaries, and Outcomes
**Important states:** 父母：熟睡／警觉／起身检查／返回休息。玩家：静止观察／移动／开门／搜索／躲藏／被发现。物件：稳定／晃动／掉落。设备：未找到／已取得。掩体：有效遮挡／暴露。状态转换应有对应的声音或画面线索。

**How player actions change the system:** 按下落脚键的时机改变落脚质量与动作音量；调整开门速度改变门轴声；选择路线和掩体改变位置与暴露程度；停下观察让时间经过，并在没有新刺激时给警觉回落的机会；及时接住晃动的物件避免落地声；搜索藏点改变设备是否找到。第一版不加入体力变量；根据学生授权，以低学习成本和观察判断为优先。

**Success condition:** 玩家找到被藏起的电子设备，并携带设备安全返回自己的卧室，才算成功。拿到设备只是中途目标，返程仍需观察父母状态、地板和掩体；不能在拿到设备时直接结算。进入卧室安全区域且未处于被发现状态后，触发简短的松一口气庆祝动画。

**Failure conditions:** 父母在无遮挡且距离足够近的视线内持续看见玩家，完成识别后判定失败；判定前给出短暂的转头、注视或灯光预警。一次踩响地板、开门过响、物件落地或父母起床只会增加警觉、引发检查，不直接失败，玩家仍可停止、躲藏或撤退。没拿到设备就回卧室不算成功，可以等待后再尝试。第一版不额外加入生命值或强制倒计时失败。

**Just-right ranges and thresholds:** 落脚指针进入目标区间时更安静，偏离越多则失衡或踩响的风险越高；目标区间由地板情况影响。开门也有与该门轴对应的合适速度区间：本游戏中的旧门过慢可能持续吱响，过快可能撞门，玩家需听声音调整。区间宽度先用原型测试，不把这种关系当成所有现实门轴的规律。

## 9. Feedback Priorities
**Immediate feedback:** 落脚或推门后产生的声音、指针是否落在合适区间、物件被碰到后的晃动，应立即反馈。让玩家马上知道这次输入造成了什么，但不要把一次操作失误直接等同于整局失败。

**Feedback discovered over time:** 父母被连续声响惊动后的翻身、停鼾和起身可以稍后出现；短暂安静后的警觉回落也需要时间。玩家通过连续观察学习累积风险，不能在一次声响后立刻假定安全。延迟前应有可识别的预警。

**Feedback that must be visual, spatial, audible, or state-based:** 地板与门轴声要有来源和强弱差别；父母的状态要通过鼾声、翻身、脚步和灯光变化表达；碰倒物件要有晃动和下落过程；掩体是否有效要通过遮挡表现。可以配字幕和视觉声响提示，但不能只用一个总分代替这些信息。

## 10. First Playable Version Scope
- Build a small desktop-browser game that validates one complete observe → judge → act → feedback → adjust loop.
- Use the accompanying system graph to implement 2-3 challenge presets when they are clearly defined. Each challenge should change system variables or relationships, not only visual decoration.
- Keep graphics simple and readable. Prioritize interaction, feedback, and learning over polish.
- Do not add realistic simulation, complex menus, accounts, online multiplayer, large asset pipelines, or unrelated features in the first version.
- Do not convert the project into a generic mini-game that only uses the domain as a theme.

## 11. Web Game Technical Dependencies and GitHub Pages

This project is published as a GitHub Pages site. The published site IS the exhibition. There is no ZIP packaging step and no separate offline build.

### GitHub Pages Publishing Rules
- The site is served from the repository root on the `main` branch, at `https://<username>.github.io/<repository-name>/`.
- Because GitHub Pages serves the site from a subpath, **every internal link and every asset path must be relative**. Root-absolute paths beginning with `/` will break on the published site even when they work locally.
- Store all required models, textures, audio, fonts, and libraries inside the repository. Do not load them from a CDN or another remote service.
- The repository is public. Never commit passwords, tokens, API keys, or personal information the student has not agreed to publish.
- After every push, the site republishes automatically. Verify the live URL, not only the local server.

### Choose the Lowest Necessary Dependency Track
1. **Track A - No build step:** Prefer HTML, CSS, plain JavaScript, and Canvas 2D for simple 2D games. This is the default choice and needs no extra configuration.
2. **Track B - Local vendored library:** For one small browser library, pin its version and store it under `assets/vendor/`.
3. **Track C - npm + build tool:** Use npm and Vite only for Three.js, multiple ES Modules, loaders, or other complex dependency graphs.

### Three.js and Vite Rules
- Three.js is allowed when 3D is important to the designed experience; do not replace meaningful 3D interaction only to avoid npm.
- Pin dependency versions in `package.json` and preserve `package-lock.json`.
- Configure Vite with a relative base such as `base: './'` so built assets work under the Pages subpath.
- Run `npm run build`, then copy the verified static output into the repository root so GitHub Pages serves it.
- Add a `.gitignore` that excludes `node_modules`. Never commit `node_modules`.
- Record dependency names, exact versions, licenses, build command, and output directory in `README.md`.

### Expected Repository Structure
```text
repository/
├── index.html                 # Project home: designer statement, system graph, play link
├── game.html                  # Playable game (or game/index.html)
├── process.html               # Human-AI development timeline
├── assets/                    # JS/CSS, system graph image, models, textures, audio, fonts
├── development-log/
│   └── agent-development-log.md
├── brief.md                   # This design and development specification
├── system-graph.png
├── ratings.csv                # Exported question-clarity ratings (teaching feedback)
├── README.md                  # How to run, controls, dependency track, main variables
└── source/                    # Track C only: src/, package.json, package-lock.json
```

## 12. Integrated Project Website Requirements
The website is the project space, not a final report and not a separate marketing page. It must exist from the first milestone and stay current as development progresses.

### Website From Day One
- Create the first version of `index.html` in the same pass as the first playable demo. Do not defer the website to the end of the project.
- The website is the exhibition surface: classmates and visitors will read it before or instead of playing, so it carries the designer statement, the system graph, and the play link.
- When the design changes, the website changes with it. A website that describes an older version of the game is worse than no website.

### Required Website Content
- **Game Idea:** project title, short concept, player goal, and core learning shift.
- **Domain Knowledge:** explain the real-world domain, novice misconception, expert judgment, and why this knowledge becomes playable.
- **System Design:** show the system graph and summarize environment data, player-controlled data, calculated results, feedback, success, failure, and challenge presets.
- **Development Process:** present a concise chronological timeline based on `agent-development-log.md`, including important changes, failures, tests, student decisions, and AI influence.
- **Play the Game:** the current playable version must be accessible from clear navigation and run directly in the website.

### Website Update Rules
- Create clear navigation among Home, Domain Knowledge / System Design, Development Process, and Play Game.
- Use only information supported by this brief, the system graph, the actual game, and the development log. Do not invent a smoother or more complete process.
- After every meaningful milestone, update the relevant website content and the development timeline.
- Keep the game idea and domain-learning explanation readable by classmates who have not seen the project before.
- Keep styling coherent across the informational pages and playable game, but prioritize clarity and function over decorative effects.
- Make the website usable on a typical student laptop. Mobile support is helpful but is not the first-version priority.
- Use relative links and asset paths. GitHub Pages serves the site from `https://<username>.github.io/<repository-name>/`, so root-absolute paths beginning with `/` will fail.
- Support a clean 1920×1080 exhibition view for display on an iMac. Important controls and text must fit without overlap.

## 13. Automatic Human-AI Development Log Protocol
In addition to building the website and game, maintain one Markdown file named `agent-development-log.md`. This file documents how the project develops through human-AI collaboration.

### Initialize the Log
At the beginning of development, create the file with:

```markdown
# Agent Development Log

- Project Title: Get Your Night Back
- Student / Team: Daniel
- Domain: 在晚上偷手机
- Core Learning Shift: 一开始只关注自己的动作，但精通后更多是对于环境的判断以及对父母行为的预测
- Current Game Idea: 这是我初中时几乎每个晚上的必玩项目，在游戏时，我发现他不只看起来这么简单，你要考虑到木地板是否会在落脚时发出吱呀声，家长是否已经熟睡，开关门时门轴是否会发出声响等等。整个过程不仅取决于自身的敏捷性以及肢体协调性，更考验对外界环境的判断以及在压力环境下的即时决策。
- AI Agent Used: codex
- System Graph: add the image file or Canva link when available
- Development Period: add start and end dates
```

### Two Entry Types in One Timeline
Keep Raw Interaction Logs and Stage Reflections in chronological order in the same file. Do not separate them into two large sections.

#### A. Raw Interaction Log — Create Automatically
After every meaningful development interaction, append a short factual entry. A meaningful interaction includes implementation, debugging, code explanation that changes the project, mechanic or level changes, visual or audio changes, website updates, playtesting, or an AI suggestion that affects direction. Do not log casual clarification that produces no development change.

Use this format:

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Interaction 01 — Raw Interaction Log

**Time:**
**Development Stage:**
**Current Goal:**

### Student Request
What the student asked the AI Agent to do.

### Agent Response Summary
What the Agent suggested, generated, explained, or changed.

### Development Action
What was actually implemented, modified, tested, or removed.

### Website Update
Which website section changed, or why no website update was needed.

### Files / Systems Changed
List files, mechanics, assets, data, UI, or challenge settings changed.

### Test and Immediate Result
What was tested and whether it worked, failed, partially worked, or remains uncertain.

### Student Decision / Follow-up
What the student accepted, rejected, modified, did not understand, or decided to try next.
```

#### B. Stage Reflection — Prompt the Student at Milestones
Do not fabricate student reflection. At a meaningful milestone—such as finishing the first playable loop, changing design direction, completing a challenge, or finishing a playtest stage—create a Reflection entry with factual fields, then explicitly ask the student to answer the Required Student Reflection.

Use this format:

```markdown
════════════════════════════════════
## Reflection 01 — Stage Reflection

**Time:**
**Covered Interactions:** Interaction 01–04
**Development Stage:**

### Goal of This Stage
### What Changed in the Playable Game and Website
### How AI Helped
### Student Decisions
### AI Influence on Design Direction
### Relationship to the Core Learning Shift
### Problems / Open Questions
### Next Step

### Required Student Reflection
Does the current game still help the player experience the intended domain-learning shift? What became stronger, weaker, or different? Which AI suggestion did you accept, reject, or change, and why?

> The AI Agent must ask the student to answer this section and must not answer it for them.
```

### Logging Rules
- Append new entries to the end of `agent-development-log.md` and continue Interaction and Reflection numbering.
- Be honest and specific. Record failures, partial results, misunderstandings, abandoned directions, and unresolved questions.
- Record when AI introduces a design direction, when the student rejects or modifies it, and when the student accepts code without fully understanding it.
- Separate factual development events from student reflection. Never invent student opinions or decisions.
- After milestone reflections, update the Development Process section of the website with a concise, truthful timeline summary.

## 14. GitHub Pages Exhibition

The exhibition is the published Pages site. No archive is packaged and nothing is uploaded to a shared drive.

### Enable GitHub Pages
1. Open the repository on GitHub.
2. `Settings` -> `Pages`.
3. Under Build and deployment, set Source to `Deploy from a branch`.
4. Branch: `main`, Folder: `/ (root)`. Save.
5. Wait a few minutes, then open `https://<username>.github.io/<repository-name>/`.

Every later push to `main` republishes the site automatically.

### Pre-Publish Audit
- Run the project through a local static HTTP server and test every navigation link, the playable game, controls, challenge selection, success, failure, and restart.
- Confirm every internal link and asset path is relative. Root-absolute paths are the most common cause of a Pages site that loads but shows nothing.
- Test the layout at 1920x1080 for exhibition display; text, controls, canvas, and navigation must not overlap.
- Confirm `node_modules`, caches, temporary files, passwords, tokens, and API keys are not committed.
- Push, then open the live Pages URL and repeat the navigation and gameplay test.

### What the Student Submits
- The GitHub Pages URL: the playable exhibition link.
- The repository URL.
- Nothing else. The repository is already public, so there is no upload step.

### Public Display
- The repository and the published site are public, because GitHub Pages requires a public repository on the free plan.
- Anything the student does not want published simply stays out of the repository.
- The student must confirm before publishing that `brief.md`, `ratings.csv`, and `development-log/agent-development-log.md` may be publicly visible.

## 15. Instructions for the AI Agent

1. **Index the workspace before planning anything.** List every file in the project folder, then read `brief.md` and `system-graph.png`. Report what you found: which files exist, what the brief specifies, and what is missing or contradictory. Do not write code before this step.
2. Restate the core learning shift, core loop, main variables, feedback mappings, and challenge presets in a short implementation plan.
3. Identify missing or contradictory information. Ask only questions that block the first playable version.
4. Propose the repository structure, then create the website skeleton (`index.html`, `game.html`, `process.html`, `assets/`) and initialize `development-log/agent-development-log.md`.
5. Implement the smallest complete game loop first, then add the defined challenge presets.
6. Keep variable names clear, and keep environment data, player-controlled data, and calculated results visibly separated in the code.
7. Add short comments only where a high-school student needs help understanding a rule.
8. **The first milestone must ship the playable demo and the first version of `index.html` together.** Never let the website fall behind the game, and never leave the site to the end of the project.
9. Start a local static server, test navigation and gameplay, and give the student the local URL and simple controls.
10. Automatically append a Raw Interaction Log after meaningful development work, and request student reflection at milestones.
11. After every milestone, update the website so its Development Process page matches the actual log.
12. Before the exhibition, run the pre-publish audit and confirm the live GitHub Pages URL works.

## 16. Acceptance Checklist
- [ ] The player can take a meaningful action within 30 seconds.
- [ ] Player actions visibly change system data or state.
- [ ] Important invisible data is translated into readable feedback.
- [ ] Success and failure conditions work and can be understood.
- [ ] A second attempt can improve because the player learned from feedback.
- [ ] Challenge presets differ through variables, relationships, information, or constraints.
- [ ] The game runs in a browser without a complex installation process.
- [ ] README.md identifies the dependency track and explains how to run, the controls, and the main variables.
- [ ] `index.html` existed from the first milestone and was kept current, not added at the end.
- [ ] The site clearly presents the game idea, domain knowledge, system design, development process, and playable game.
- [ ] `development-log/agent-development-log.md` contains chronological Interaction and Reflection entries.
- [ ] The Development Process page matches the actual log and does not hide failures or unfinished work.
- [ ] All internal links and assets use relative paths, because Pages serves from a subpath.
- [ ] The published GitHub Pages URL has been opened and tested at 1920x1080.
- [ ] No passwords, API keys, tokens, or `node_modules` are committed.
- [ ] The student has confirmed the brief, ratings, and development log may be publicly visible.

## 2026-09-09 — 学生授权后的实施补充

本节记录当前开发范围，优先于以上工作簿中的未定实现细节。桌面原稿保持不变。

- 学生明确删除喝水量变量，授权 Codex 自行决定小地图、藏点分布、父母巡查路线，直接开发并上线。
- 学生要求低学习成本，整体约五分钟；实现为三个挑战合计约五分钟的设计目标，无强制倒计时。真实人类试玩时长尚未测量。
- 美术由学生再次确认：低多边形 3D 潜行喜剧、圆润角色、夸张动作、冷蓝夜景与暖黄门缝光，参考 PEAK 的风格气质，角色和模型自行创作。
- AI 暂不实现尚未定义的体力系统；采用格点移动与平滑动画。危险地板触发落脚时机，普通地板可直接移动。
- 一间紧凑住宅：自己的卧室、父母房间、客厅，后两关开放绕行路线。候选藏点分别为 1 / 3 / 3 个，位置和设备藏点按关卡固定，避免无预警随机结果。
- 第三关在 32 秒开始起夜预警，起床准备保留 5 秒；巡查结束并休息后可再次起夜。该计时在游戏内部运行，不显示倒计时或用于判负。
- 落脚和门速按输入确定声音；父母警觉结合距离、墙体与安静回落计算。暂不引入随机踩响。
- 使用 Three.js 0.180.0 与 Vite 6.3.6 构建静态资源。页面和成品资源位于仓库根目录，GitHub Pages 从 main 根目录发布。
- 阶段反思遵循学生直接要求：学生说“reflect on this stage”后起草；Required Student Reflection 留给学生。

## 2026-09-09 — 首次试玩后的学生修订（v0.2.0）

本节是最新学生要求及相应实现说明，取代上一节的格点移动与自制玩家模型选择；上文保留为原始设计及开发历史。

- 菜单改为 START、挑战关卡、设置。挑战以弹层地图选择，确认后从所选关卡开始。
- START 第一次进入第一关，之后恢复当前浏览器保存的游戏；通关后进入下一关，失败后重试当前关。后两项结束状态规则为 AI 在授权范围内的具体选择。
- 普通行走改为连续位置、逐帧速度和身体碰撞，移除旧版步间停顿。危险地板的落脚判断保留。
- 初始全景，第一次移动切第一人称。点击左上角小地图切换第三人称全景；M 为快捷键，Tab 释放鼠标。第一人称鼠标转头，WASD 相对视线移动。
- 学生提供 peak-characters.zip 并要求使用。玩家改用附件第三个角色，Blender 补基础骨骼，动作由程序驱动。住宅及父母保留原有程序化模型。
- 设置包括总音量、环境音、动作提示音、鼠标灵敏度和可选镜头起伏；默认关闭镜头起伏。设置与进度本机保存，无账号和跨设备同步。
- 三个挑战的噪声、警觉、搜索、躲藏与返程核心规则不因本次界面/视角修订而另行扩展。

## 2026-09-09 — 第二次试玩后的探索与声音修订（v0.3.0）

学生最新指令优先于此前的小地图、约五分钟、固定蹲下与 1.65 秒识别设定。

- 扩建住宅：第一关边界 19×19，后两关 24×19，保留卧室、客厅和父母房间，增加东侧书房、餐厅、储物间、洗衣间与后走廊。可搜索藏点为 2 / 5 / 5；按关卡固定设备位置。
- 小地图以玩家为中心，只显示附近四格半径，不展示全屋、父母或设备位置；点击或 M 仍可切换此前要求的第三人称全景。
- 父母在无遮挡有效视线中连续看见玩家 0.25 秒后失败；打断视线立即清空识别累计。起床前五秒预警保留。
- C 随处切换蹲行/站立。蹲行可移动、搜索、推门；移动速度由 2.05 降为 1.05，普通脚步噪声由 3 降为 1。蹲下不提供空地隐身，仍计算家具与墙体遮挡。
- 第三关安静时起夜按轮次巡视东侧书房、储物区域和后走廊；足够明显的声响可以提供调查目标。
- 加入原创 Web Audio 拨弦与钟琴循环音乐，危险时压低音量。脚步、蹲行、瓷砖、鼾声、床响、门轴摩擦、撞门、门锁、翻找、花瓶均使用独立声音。设置新增背景音乐滑块。
- 以上房间布局、0.25 秒、半径、具体速度和声音参数为 AI 按学生授权选定的可调整实现。扩建版人类时长和难度仍需试玩，不再用五分钟强行限制探索。
- 旧版存档保留所在关卡，从新户型该关开局；不直接迁移旧设备/搜索状态。音量和鼠标设置保留。

## 2026-09-09 — 家长角色与木板声音修订（v0.3.2）

- 学生要求家长同步使用 PEAK 模型，修复第一人称看不到家长，并增加踩地板吱呀声。
- 家长使用附件第三个角色的独立骨骼克隆；体型放大 12%、服装偏紫以区分玩家。睡觉、准备起身、巡查使用不同姿态。
- 第一人称不再以地面二维遮挡判断隐藏整个家长，由实际三维几何深度遮挡；全景仍保留避免隔墙透露位置的限制。家长手电启用墙体阴影。游戏识别条件保持 0.25 秒，不因模型修复改变。
- 松动地板先播放轻微受力声；成功落脚播放短而轻的吱声，失误播放更长更响的吱呀声。成功/失误的噪声风险仍为 5 / 50，受力提示不额外累计警觉。


## 2026-09-09 — 家居空间与巡查修订（v0.4.0）

本节依学生最新试玩意见更新；此前版本说明保留为历史。

- 主菜单采用带夜行主题图形的「开始夜探 / START」「挑战关卡」「夜间设置」三个入口，分别配门牌、折叠地图、床头收音机。续玩、选图、设置的功能保留。
- 住宅家具按生活用途重新布置：沙发面对电视，床靠墙，书桌与座椅靠侧墙，餐椅面对桌子，洗衣机与整理柜组合。家具尺寸与朝向由同一份清单供模型、碰撞和小地图使用，移除旧整格空气墙。
- 适度补充柜门与拉手、书架与书本、床品、座垫、桌脚、洗衣机滚筒、窗框与踢脚线。第一人称有完整墙高、天花板与门洞过梁；全景仍使用剖面查看住宅。
- 门板旋转时，其真实占地随之变化；通道可通过时不必等待隐形整格屏障消失，打开后的门板仍有物理位置。
- 家长按半格导航经过多个地点，每处停下观察约 2.6 秒；明显声响提供最近调查位置并中断原巡查或回程，抵达声源附近观察约 3.5 秒。普通轻脚步不会不断更新调查位置。找不到玩家后实际走回床边；遇到关门先推开，避免穿门或瞬移。
- 具体家具摆放、轮次路线、观察时长与菜单表现是 AI 在学生授权范围内的实现选择。起床前五秒预警、0.25 秒识别、局部小地图和现有音效规则保留。
- v4 存档格式保留旧版所在关卡，从本轮新布置重新开局；音量和鼠标设置保留，菜单提示布置更新。


## 2026-09-09 — 表现评分与场景意外（v0.5.0）

本节按学生最新要求更新；前文保留为设计历史。

- 通关后以 100 分评价：任务完成 40、声音控制 25、动作判断 25、避开视线 10。探索时长、等待和未遇到随机事件不扣分，不改为竞速或即时刷分玩法。未完成任务时只展示练习记录，不给通关等级。
- 任务分只在携设备回到卧室后获得。声音分根据明显声响累计量下降，动作分根据落脚、接物和安静推门的表现计算；进入家长有效视线次数影响避视线分。S / A / B / C 的阈值为 90 / 75 / 60 / 低于 60。这些具体权重和阈值由 AI 在授权范围内选择。
- 松动地板与所在房间普通地板共用颜色和纹理，移除特殊裂纹、提示色和小地图地板标记；踩上时仍有受力轻响和字幕。落脚及接物亮区缩为第一关 22%、后两关 16%。
- 翻找餐边柜约 2.2 秒时，有 65% 概率碰落叉子；书房抽屉有 45% 概率碰到笔筒，储物柜有 50% 概率滑落铁盒。每种事件一局最多一次，结果由每局种子固定，取消搜索和刷新不会重抽。花瓶保留固定地点触发。
- 事件切入物件近景：约 0.45 秒准备，随后指针单次扫过亮区，按空格接住；整个反应阶段约 3.2 秒，结束后展示约 0.7 秒结果。成功安静放回，失败发出对应落地声，再恢复原视角与搜索进度。Esc 可放弃接物，结果阶段再按 Esc 可取消继续搜索。
- 特写期间世界以 12% 速度继续，接物窗口按真实时间运行；由于玩家不能移动，期间暂缓视线识别，恢复后继续使用原有 0.25 秒识别。暂停同时冻结世界与接物时钟。
- 门把手、门轴、木门撞击、门锁、抽屉和金属落地改用 laleksic 的 CC0 真实录音，经剪辑与音量处理，来源见 assets/audio/README.md。其余音乐和声音保留原程序生成。
- 兼容当前 v4 存档并保存接物、概率和评分状态；缺少旧行为数据时明确注明评价仅统计更新后的续玩部分。存档不因本次更新强制重开。


## 2026-09-09 实施补充：PS5 手柄（v0.6.0）

学生要求 USB 连接 PS5 手柄后即可游玩。新增完整菜单和游戏的标准 Gamepad 输入，不改变探索、评分、噪声和关卡规则。左摇杆模拟移动、右摇杆转头；× 落脚／接物，□ 交互／按住推门，○ 蹲行／取消，△ 全景，L1/R1 门速，Options 暂停。菜单方向键或左摇杆选择、× 确认、○ 返回，设置左右调节。

AI 实施选择：16% 径向死区与右摇杆非线性细调，手柄转头速度独立于鼠标；支持调整与本机保存。失焦、断开手柄时暂停，重连或菜单切换后必须松开旧输入，防止自动行动。保留键鼠并切换对应提示。不使用专有驱动或新增依赖，仅接受浏览器标准映射。

首次识别可能需要页面有焦点并按一下手柄按钮；浏览器若阻止声音，则提供一次页面点击开启提示。自动模拟输入可以验证游戏逻辑，实体 USB 识别与手感仍待学生连接自己的手柄检验。


## 2026-09-09 实施补充：皮肤衣柜（v0.7.0）

学生要求增加类似游戏的人物外观，放在菜单换肤。当前实现使用用户附件中的三套角色，并在已有角色上增加纸箱、抱枕耳罩与睡帽改装，共六套。没有提取其他商业游戏模型。

AI 选择：全部外观直接可用，不增设购买、货币或解锁。菜单选择只预览，支持旋转，确认“穿上这套”后生效并独立保存。只更换玩家，家长、碰撞、移动、噪声、识别和评分保持原规则。沿用 PS5 手柄导航，并以右摇杆转动预览。模型按需加载，失败可重试，快速选图时最后选择生效。造型名称、六套数量和改装配件为 AI 在本次授权范围内的具体选择。


## 2026-09-09 实施补充：观察与声源选择（v0.8.0）

**学生授权**：“增加1 2 3和5”，指上一轮建议中的线索寻找、环境声掩护、主动引开家长与取物后的返程振动／来电。本补充覆盖原简报中尚未包含的新增行为，保留取物返程与视线识别的胜负条件。

**AI 实施选择**：每关两条可选便条，分别放在床头和客厅茶几，指向现有固定藏点，不重新随机设备。读过的线索记入可暂停查看的线索本；目标柜子有可见的充电器微光。熟睡时长鼾声约 1.5 秒，洗衣机每 18 秒有 6 秒脱水，附近 7.5 场景单位内可掩护，噪声系数分别 0.28 / 0.30；进入木板时可直接通过，视线仍有效。

收音机和玩具鸭每夜各一次，启动 2.5 秒后响四次，家长调查实际声源。主动设置的声源不计入失误评分。找到设备后 6 秒预警，停下按住 E / □ 1.2 秒静音；移动、松手打断。错过后最多响三次，每次基础噪声 38，间隔 2.4 秒，仍可补救；不直接判负。特写期间冻结来电预警，避免玩家不能行动时受罚。

新增 `night` 状态随现有进度保存，线索、已用道具与来电剩余时间刷新后保留；物理按住状态不保存。旧存档已持有设备时不追加入场来电。上述时长、范围与线索文本由 AI 选择，尚待学生试玩评价，不作为已验证的人类体验结论。


## 2026-09-09 实施补充：家里的猫（v0.9.0）

**学生授权**：增加跟随、停下蹭腿、准备跳上摆着花瓶的桌子的家猫，允许绕开、安抚或用玩具引走，增加生活感和潜行喜剧。

**AI 实施选择**：原创程序几何橘猫，三关各一只，从客厅走廊出现，使用真实门和家具约束寻路，不阻挡玩家。附近看见玩家后跟随，停下后蹭腿。靠近 E / □ 安抚后坐下约 18 秒；Q / R2 向前方可达空地丢软玩具球，追到后玩约 12 秒，14 秒冷却，可重复投。门、柜子和便条交互优先，猫咪面板也提供独立安抚入口。

猫和玩家都接近花瓶时，猫会接近桌边、蓄势 3.5 秒，可安抚、玩具或退开中断。当前操作和慢动作不消耗蓄势预警；每夜最多一次起跳。未及时处理则猫扑桌沿并碰动花瓶，沿用接物特写，成功继续探索、失败按花瓶位置发声。普通猫叫和呼噜不计额外噪声风险；花瓶落地仍影响家长调查与声音／动作评分，不直接判负。三关均显示原花瓶，第三关原触发方式与猫共用同一状态，避免重复。

新增 `cat` 状态和玩具与原进度一同保存，旧存档补默认猫。模型、条纹、动作与合成声音由本项目代码制作，没有从商业游戏提取猫素材或新增依赖。行为时长、互动频率与外观为 AI 具体选择，趣味仍需学生试玩反馈。


### 学生试玩追加：近景与解谜探索（2026-09-09，v0.10.0）

学生要求镜头跟随的近景第三人称；新增奶龙、奶蛙、奶鼠皮肤（确认后两者为奶白色圆滚造型）；线索先解谜；翻找书架与柜子要有推近镜头、抽屉打开和拨动物件；部分柜锁由一至三关逐渐提高难度；从网上选现成猫模型。

AI 实施补充：V / R3 切两种近景，M / △ 保留全景；读题暂停、翻找继续。第一关图案排序锁；第二关两处证据组合数字锁；第三关再翻书架获得反向读法，解四位锁。证据均可在开锁前获取，允许提示、重排、取消，不用消耗钥匙。奶龙/奶蛙按网络全身参考和学生配色改编，奶鼠缺少可确认唯一的官方版本，按学生确认形态自制，不冒称官方模型。猫选用 Quaternius CC0 Cat Blob 并补脚和尾巴，保留现有行为。原喝水量仍删除，无新倒计时或外观数值优势。

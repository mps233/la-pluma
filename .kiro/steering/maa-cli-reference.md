# MAA CLI 参考文档

本文档基于 [MAA CLI 官方文档](https://docs.maa.plus/zh-cn/manual/cli/)

## 核心功能

MAA CLI 主要通过调用 MaaCore 自动化完成明日方舟的游戏任务，同时提供 MaaCore 管理功能。

## 管理命令

### 安装和更新
```bash
maa install          # 安装 MaaCore 及资源
maa update           # 更新 MaaCore 及资源
maa self update      # 更新 maa-cli 自身（Homebrew 用户请用 brew upgrade）
```

### 配置管理
```bash
maa init             # 交互式初始化配置
maa list             # 列出所有可用任务
maa dir <dir>        # 获取特定目录路径（如 maa dir config）
```

### 其他工具命令
```bash
maa version          # 获取版本信息
maa activity [client] # 获取当前活动信息
maa cleanup          # 清除缓存
maa convert <input> [output]  # 转换配置文件格式（JSON/YAML/TOML）
maa import <file> [-t <type>] # 导入配置文件
maa complete <shell> # 生成自动补全脚本
```

## 预定义任务

### 基础任务
```bash
maa startup [client]     # 启动游戏并进入主界面
maa closedown [client]   # 关闭游戏客户端（默认 Official）
```

### 战斗任务
```bash
maa fight [stage]        # 运行战斗任务，如 maa fight 1-7
                         # 留空选择上次或当前关卡
```

### 作业任务
```bash
maa copilot <maa_uri>... # 自动抄作业
                         # URI 格式: maa://1234 或本地文件路径
maa paradoxcopilot <maa_uri>... # 自动悖论模拟作业
maa sscopilot <maa_uri>  # 自动保全派驻
```

### 游戏模式
```bash
maa roguelike <theme>    # 自动集成战略
                         # theme: Phantom, Mizuki, Sami, Sarkaz, JieGarden
maa reclamation <theme>  # 自动生息演算
                         # theme: Tales
```

### 任务组合示例
```bash
# 官服：打开游戏 -> 使用3个理智药刷BB-7 -> 关闭游戏
maa startup Official && maa fight BB-7 -m 3 && maa closedown
```

## 自定义任务

### 任务定义
- 位置: `$MAA_CONFIG_DIR/tasks/`
- 格式: TOML/YAML/JSON
- 运行: `maa run <task>`（task 为文件名，不含扩展名）

### 任务结构
每个任务包含多个子任务，每个子任务包含：
- `name`: 任务名称
- `type`: 任务类型（参考 MAA 集成文档）
- `params`: 任务参数

### 条件执行
支持的条件类型：
- `Time`: 时间段条件
- `DateTime`: 日期时间条件
- `Weekday`: 星期条件
- `DayMod`: 自定义周期条件
- `OnSideStory`: 活动期间条件
- `And/Or/Not`: 逻辑组合

### 匹配策略
- 默认: 使用第一个匹配的变体
- `merge`: 合并所有匹配的变体参数

## 配置系统

### 配置目录
```bash
maa dir config  # 获取配置目录路径
# 或通过环境变量 MAA_CONFIG_DIR 设置
```

### 目录结构
```
$MAA_CONFIG_DIR/
├── tasks/          # 自定义任务
├── profiles/       # MaaCore 配置
├── infrast/        # 基建计划文件（JSON格式）
├── ssscopilot/     # 保全派驻作业
└── cli.toml        # CLI 配置
```

### 连接配置 (profiles/)
```toml
[connection]
adb_path = "adb"                    # ADB 路径
address = "127.0.0.1:5555"          # 连接地址
config = "CompatMac"                # 平台配置（macOS默认）
# 或使用预设
preset = "MuMuPro"                  # 模拟器预设
```

### 资源配置
```toml
[resource]
global_resource = "YoStarEN"        # 非简中客户端资源
platform_diff_resource = "iOS"      # iOS 平台资源
user_resource = true                # 加载用户自定义资源
```

### 实例选项
```toml
[instance_options]
touch_mode = "ADB"                  # 触摸模式
deployment_with_pause = false       # 部署时暂停
adb_lite_enabled = false            # ADB Lite 模式
kill_adb_on_exit = false            # 退出时关闭 ADB
```

## 日志系统

### 日志级别
从低到高: Error, Warn, Info, Debug, Trace
- 默认级别: Warn
- 设置: `MAA_LOG=debug` 或使用 `-v`/`-q` 参数

### 日志输出
```bash
# 输出到文件
maa fight --log-file
# 日志位置: $(maa dir log)/YYYY/MM/DD/HH:MM:SS.log

# 指定日志文件路径
maa fight --log-file=path/to/log
```

### 日志前缀
通过 `MAA_LOG_PREFIX` 环境变量控制:
- `Always`: 总是包含前缀
- `Auto`: 文件包含，stderr 不包含
- `Never`: 从不包含前缀

## 任务总结

任务结束后自动输出总结信息，包括：
- 子任务运行时间
- fight: 关卡、次数、理智药消耗、掉落统计
- infrast: 进驻干员、产物类型
- recruit: 公招 tag、星级、状态
- roguelike: 探索次数、投资次数

关闭总结: `--no-summary`

## WebUI 集成要点

### 需要封装的核心命令
1. 任务执行: `maa run <task>`
2. 预定义任务: `maa fight`, `maa roguelike` 等
3. 配置管理: 读写 `$MAA_CONFIG_DIR` 下的配置文件
4. 日志查看: 读取 `$(maa dir log)` 下的日志文件
5. 状态监控: 通过子进程监控 maa 命令执行状态

### 配置文件操作
- 支持 TOML/YAML/JSON 三种格式
- 使用 `maa convert` 进行格式转换
- 配置文件位置通过 `maa dir config` 获取

### 实时日志
- 通过 `--log-file` 参数指定日志文件
- 实时读取日志文件内容
- 解析日志级别和时间戳

### 进程管理
- 使用子进程执行 maa 命令
- 捕获 stdout/stderr 输出
- 支持任务中断和状态查询


---

## 详细命令参考（--help 输出）

### maa fight 命令

**用法**: `maa fight [OPTIONS] [STAGE]`

**参数**:
- `[STAGE]` - 要打的关卡，如 1-7，留空则打当前/上次关卡

**选项**:
- `-m, --medicine <MEDICINE>` - 使用理智药数量，默认 0
- `--expiring-medicine <EXPIRING_MEDICINE>` - 使用即将过期的理智药数量，默认 0
- `--stone <STONE>` - 使用源石数量，默认 0
- `--times <TIMES>` - 战斗指定次数后退出，默认无限
- `-D, --drops <DROPS>` - 收集指定数量掉落后退出，例如 `-D30012=100` 表示获得 100 个固源岩后退出
- `--series <SERIES>` - 单次代理作战重复次数（-1 ~ 6），默认 1
  - -1: 禁用切换系列
  - 0: 自动切换到当前可用的最大系列数
  - 1 ~ 6: 使用指定次数
- `--report-to-penguin` - 是否向企鹅物流数据统计报告掉落
- `--penguin-id <PENGUIN_ID>` - 企鹅物流 ID，留空则匿名报告
- `--report-to-yituliu` - 是否向一图流报告掉落
- `--yituliu-id <YITULIU_ID>` - 一图流 ID，留空则匿名报告
- `--client-type <CLIENT_TYPE>` - 游戏崩溃时用于重启的客户端类型
- `--dr-grandet` - 是否像葛朗台博士一样使用源石（等理智恢复到 1 点时立即使用）

### maa roguelike 命令

**用法**: `maa roguelike [OPTIONS] <THEME>`

**参数**:
- `<THEME>` - 肉鸽主题：Phantom（傀影）, Mizuki（水月）, Sami（萨米）, Sarkaz（萨卡兹）, JieGarden（界园）

**选项**:
- `--mode <MODE>` - 模式，默认 0
  - 0: 刷分模式
  - 1: 刷源石锭模式
  - 3: 通关模式（未实现）
  - 4: 3层后退出模式
  - 5: 崩坏范式模式（仅萨米）
- `--squad <SQUAD>` - 起始分队（中文），如 "指挥分队"（默认）、"后勤分队"
- `--core-char <CORE_CHAR>` - 起始核心干员（中文），如 "维什戴尔"
- `--roles <ROLES>` - 起始干员招募组合（中文），如 "取长补短"、"先手必胜"（默认）
- `--start-count <START_COUNT>` - 运行指定次数后停止
- `--difficulty <DIFFICULTY>` - 难度等级（傀影主题无效）
- `--disable-investment` - 禁用投资
- `--investment-with-more-score` - 投资模式下尝试获得更多分数
- `--investments-count <INVESTMENTS_COUNT>` - 投资达到指定次数后停止
- `--no-stop-when-investment-full` - 投资满时不停止探索
- `--use-support` - 使用助战干员
- `--use-nonfriend-support` - 使用非好友助战干员
- `--start-with-elite-two` - 以精二干员开局
- `--only-start-with-elite-two` - 仅以精二干员开局
- `--stop-at-final-boss` - 在最终 Boss 前停止
- `--refresh-trader-with-dice` - 是否用骰子刷新商人（仅水月主题）
- `--use-foldartal` - 是否使用折叠装置（萨米主题）
- `-F, --start-foldartals <START_FOLDARTALS>` - 期望的起始折叠装置列表
- `-P, --expected-collapsal-paradigms <EXPECTED_COLLAPSAL_PARADIGMS>` - 期望的崩坏范式列表
- `--start-with-seed` - 是否以种子开局（仅萨卡兹主题模式 1）

### maa startup 命令

**用法**: `maa startup [OPTIONS] [CLIENT_TYPE]`

**参数**:
- `[CLIENT_TYPE]` - 客户端类型：Official, Bilibili, Txwy, YoStarEN, YoStarJP, YoStarKR

**选项**:
- `--account-name <ACCOUNT_NAME>` - 账号名称

### maa closedown 命令

**用法**: `maa closedown [OPTIONS] [CLIENT]`

**参数**:
- `[CLIENT]` - 客户端类型，默认 Official

### maa copilot 命令

**用法**: `maa copilot [OPTIONS] [URI_LIST]...`

**参数**:
- `[URI_LIST]...` - 作业任务文件的 URI
  - 可以是 maa URI 或本地文件路径
  - 可以提供多个 URI 来打多个关卡
  - URI 格式：
    - `maa://<code>` - 单个作业
    - `maa://<code>s` - 作业集
    - `file://<path>` 或直接路径 - 本地文件

**选项**:
- `--raid <RAID>` - 是否以突袭模式战斗，默认 0
  - 0: 普通模式
  - 1: 突袭模式
  - 2: 两种模式各运行一次
- `--formation` - 启用自动编队
  - 当提供多个 URI 或作业集包含多个关卡时，强制为 true
  - 否则默认为 false
- `--formation-index <FORMATION_INDEX>` - 选择使用哪个编队（1-4）
  - 如果不提供，使用当前编队
- `--add-trust` - 在自动编队时按信赖值升序填充空位
- `--ignore-requirements` - 忽略干员要求
- `--use-sanity-potion` - 理智不足时使用理智药恢复
- `--support-unit-usage <SUPPORT_UNIT_USAGE>` - 助战干员使用模式
  - 仅在 formation 为 true 时有效
  - 0: 不使用助战干员（默认）
  - 1: 仅当缺少一个干员时使用助战；否则不使用
  - 2: 缺少一个干员时使用助战；否则使用指定的助战
  - 3: 缺少一个干员时使用助战；否则使用随机助战
- `--support-unit-name <SUPPORT_UNIT_NAME>` - 使用指定名称的助战干员
  - 如果不提供，则不使用助战

### maa paradoxcopilot 命令

**用法**: `maa paradoxcopilot [OPTIONS] [URI_LIST]...`

**参数**:
- `[URI_LIST]...` - 悖论模拟作业任务文件的 URI
  - 可以是 maa URI 或本地文件路径
  - 可以提供多个 URI
  - URI 格式：
    - `maa://<code>` - 单个作业
    - `maa://<code>s` - 作业集
    - `file://<path>` 或直接路径 - 本地文件

**说明**: 用于自动悖论模拟（Paradox Simulation）作业任务

### 通用选项（所有命令）

以下选项适用于大多数 MAA 命令：

- `-a, --addr <ADDR>` - ADB 设备序列号或 PlayCover 中的 MaaTools 地址
  - 默认为 `emulator-5554`
  - PlayCover 需要在配置文件中设置连接类型
- `-p, --profile <PROFILE>` - 配置文件名称
  - 默认加载 `$MAA_CONFIG_DIR/profiles/default.toml`
  - 配置文件应放在 `$MAA_CONFIG_DIR/profiles/` 目录
- `--user-resource` - 从配置目录加载资源
  - 可以修改 MaaCore 配置或使用自定义资源
  - 资源目录为配置目录的 `resource` 子目录
- `--dry-run` - 解析配置但不连接游戏
  - 用于检查配置文件
  - 会将日志级别设置为 debug
- `--no-summary` - 不显示任务摘要
- `--batch` - 启用批处理模式
  - 跳过所有输入提示，使用默认值
- `-v, --verbose...` - 增加详细程度，可重复使用
  - `-v`: Info 级别
  - `-vv`: Debug 级别
  - `-vvv`: Trace 级别
- `-q, --quiet...` - 减少详细程度，可重复使用
- `--log-file[=<PATH>]` - 将日志重定向到文件
  - 不指定路径则写入 `$(maa dir log)/YYYY/MM/DD/HH:MM:SS.log`
- `-h, --help` - 显示帮助信息


### maa ssscopilot 命令

**用法**: `maa ssscopilot [OPTIONS] <URI>`

**参数**:
- `<URI>` - 保全派驻作业 URI

**选项**:
- `--loop-times <LOOP_TIMES>` - 循环次数，默认 1

**说明**: 用于自动保全派驻（SSS Copilot）任务

### maa reclamation 命令

**用法**: `maa reclamation [OPTIONS] <THEME>`

**参数**:
- `<THEME>` - 生息演算主题
  - Tales: 沙中之火

**选项**:
- `-m, --mode <MODE>` - 生息演算任务模式，默认 1
  - 0: 通过反复进出关卡刷繁荣度（仅在无存档时使用，否则会丢失进度）
  - 1: 通过制作工具刷繁荣度（需要已有存档且能制作特定工具，建议从新计算日开始）
- `-C, --tools-to-craft <TOOLS_TO_CRAFT>` - 模式 1 中要制作的工具名称，默认 "荧光棒"
- `--increase-mode <INCREASE_MODE>` - 增加制作数量时与添加按钮的交互方式，默认 0
  - 0: 通过点击按钮增加数量
  - 1: 通过按住按钮增加数量
- `--num-craft-batches <NUM_CRAFT_BATCHES>` - 每次游戏运行的批次数，每批 99 个，默认 16

### maa run 命令

**用法**: `maa run [OPTIONS] <TASK>`

**参数**:
- `<TASK>` - 要运行的任务名称
  - 任务名称是任务文件名（不含扩展名）
  - 任务文件必须在配置目录的 tasks 目录中
  - 任务文件格式：TOML、YAML 或 JSON

**说明**: 
- 运行自定义任务
- 任务定义在 maa-cli 的配置目录中
- 使用 `maa dir config` 获取配置目录路径
- 在配置目录中创建 tasks 目录，然后创建 TOML 或 JSON 文件定义任务
- 使用 `maa list` 列出所有可用任务

## 其他管理命令

### maa install
安装 MaaCore 和资源文件

### maa update
更新 MaaCore 和资源文件

### maa hot-update
热更新资源文件

**用法**: `maa hot-update [OPTIONS]`

**说明**: 
- 通过拉取 MaaResource git 仓库来更新可热更新的资源
- 注意：随 maa-core 安装的基础资源不会被更新
- 远程仓库可以在 maa-cli 的配置文件中配置

### maa dir
打印 MAA 目录路径
- `maa dir config` - 配置目录
- `maa dir log` - 日志目录
- `maa dir data` - 数据目录

### maa version
打印指定组件的版本信息

### maa list
列出所有可用的自定义任务

### maa activity
显示指定客户端的关卡活动信息

### maa remainder
获取给定除数和当前日期的余数

### maa cleanup
清除 maa-cli 和 maa core 的缓存

### maa import
从本地路径或远程 URL 导入配置文件

### maa init
初始化 maa-cli 的配置

### maa convert
在 TOML、YAML 和 JSON 之间转换文件格式

### maa complete
为指定 shell 生成补全脚本

### maa mangen
生成 man 手册页

## 命令使用示例

### 战斗任务示例
```bash
# 刷 1-7，使用 3 个理智药
maa fight 1-7 -m 3

# 刷当前关卡，使用 2 个源石
maa fight --stone 2

# 刷 1-7，获得 100 个固源岩后停止
maa fight 1-7 -D30012=100

# 刷关卡并报告掉落到企鹅物流
maa fight 1-7 --report-to-penguin
```

### 肉鸽任务示例
```bash
# 傀影刷分模式
maa roguelike Phantom

# 水月刷源石锭模式
maa roguelike Mizuki --mode 1

# 萨米刷分，指定分队和核心干员
maa roguelike Sami --squad "指挥分队" --core-char "维什戴尔"

# 萨卡兹刷源石锭，运行 5 次后停止
maa roguelike Sarkaz --mode 1 --start-count 5
```

### 作业任务示例
```bash
# 执行单个作业
maa copilot maa://81933 --formation

# 执行作业集
maa copilot maa://26766s --formation

# 执行本地作业文件
maa copilot /path/to/copilot.json --formation

# 执行作业并忽略干员要求
maa copilot maa://81933 --formation --ignore-requirements

# 突袭模式执行作业
maa copilot maa://81933 --formation --raid 1

# 执行悖论模拟作业
maa paradoxcopilot maa://12345

# 执行保全派驻作业，循环 3 次
maa ssscopilot maa://67890 --loop-times 3
```

### 组合任务示例
```bash
# 启动游戏 -> 刷关卡 -> 关闭游戏
maa startup Official && maa fight 1-7 -m 3 && maa closedown

# 启动游戏 -> 执行作业 -> 刷肉鸽 -> 关闭游戏
maa startup && maa copilot maa://81933 --formation && maa roguelike Phantom && maa closedown
```

### 自定义任务示例
```bash
# 列出所有自定义任务
maa list

# 运行自定义任务
maa run daily

# 运行自定义任务（详细日志）
maa run daily -vv
```

### 日志和调试示例
```bash
# 详细日志（Info 级别）
maa fight 1-7 -v

# 更详细日志（Debug 级别）
maa fight 1-7 -vv

# 最详细日志（Trace 级别）
maa fight 1-7 -vvv

# 将日志输出到文件
maa fight 1-7 --log-file

# 将日志输出到指定文件
maa fight 1-7 --log-file=/path/to/log.txt

# 仅验证配置不实际执行
maa copilot maa://81933 --dry-run
```

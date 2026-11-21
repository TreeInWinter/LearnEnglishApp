/* ============================================================
 * Cloze · 场景填词  词库
 * 纯数据文件，挂在 window 上，普通 <script> 加载，file:// 下亦可用。
 *
 * 词条字段：
 *   id          唯一编号
 *   cat         场景分类 business | agent | thinking
 *   word        目标词（答案）
 *   accepted    其他可接受的拼写/变体
 *   phonetic    音标
 *   pos         词性
 *   meaning     中文释义
 *   meaningEn   英文释义（训练英英理解）
 *   scene       具体场景（中文）
 *   sentence    含 ___ 占位的目标句
 *   translation 句子翻译
 *   collocation 常见搭配 / 延伸
 *   level       难度标签
 * ============================================================ */

window.CATEGORIES = [
  { id: 'business',  name: '商务协作', en: 'Business', desc: '会议 · 汇报 · 谈判 · 项目推进', color: '#2f6df6' },
  { id: 'agent',     name: 'Agent 开发', en: 'AI & Agents', desc: 'Prompt · 上下文 · 编排 · 评估', color: '#8b5cf6' },
  { id: 'thinking',  name: '思维认知', en: 'Thinking', desc: '第一性原理 · 决策 · 反脆弱', color: '#e08a2e' },
  { id: 'strategy',  name: '商业思考', en: 'Strategy', desc: '战略 · 竞争 · 商业模式 · 增长', color: '#0f9d8a' }
];

/* 精编层：手写的场景填词题，带真人级音频。
 * 扩展层见 bank-extended.js（window.EXTENDED_BANK），量大、走释义填词。 */
window.CORE_WORDS = true;

window.WORDBANK = [
  /* ---------------- 商务协作 20 ---------------- */
  {
    id: 'b01', cat: 'business', word: 'leverage', accepted: [],
    phonetic: '/ˈlevərɪdʒ/', pos: 'v.',
    meaning: '利用、撬动（已有资源）',
    meaningEn: 'to use something you already have to gain more value',
    scene: '季度复盘会上，老板问「不加预算还能怎么增长」。你想说：把已有的客户数据用起来，而不是再买流量。',
    sentence: 'We can ___ our existing customer data to improve targeting without extra budget.',
    translation: '我们可以利用现有的客户数据来提升定向效果，而不增加预算。',
    collocation: 'leverage data / leverage an advantage / leverage the network',
    level: 'CET-6 · 商务高频'
  },
  {
    id: 'b02', cat: 'business', word: 'align', accepted: [],
    phonetic: '/əˈlaɪn/', pos: 'v.',
    meaning: '使一致、对齐（认知/目标）',
    meaningEn: 'to bring people or things into agreement',
    scene: '项目启动会前，销售、产品、研发对「什么算成功」各说各话。你想先把衡量标准统一，再谈排期。',
    sentence: 'Before the kickoff, we need to ___ on the success metrics.',
    translation: '启动会之前，我们需要先就成功指标达成一致。',
    collocation: 'align on / align with / aligned incentives',
    level: 'CET-6 · 商务高频'
  },
  {
    id: 'b03', cat: 'business', word: 'stakeholder', accepted: [],
    phonetic: '/ˈsteɪkhoʊldər/', pos: 'n.',
    meaning: '利益相关方',
    meaningEn: 'anyone who is affected by or can affect a decision',
    scene: '要调整线索定价模型，法务、财务、一线销售都会被影响。你提醒团队先拉齐所有相关方签字。',
    sentence: 'Every ___ should sign off before we change the pricing model.',
    translation: '在改动定价模型之前，每个利益相关方都应签字确认。',
    collocation: 'key stakeholder / stakeholder buy-in / manage stakeholders',
    level: 'CET-6 · 商务高频'
  },
  {
    id: 'b04', cat: 'business', word: 'deliverable', accepted: [],
    phonetic: '/dɪˈlɪvərəbl/', pos: 'n.',
    meaning: '交付物、可交付成果',
    meaningEn: 'a concrete output that can be handed over and checked',
    scene: '给领导排期时，你想强调第一阶段交的是能跑的原型，不是又一份 PPT。',
    sentence: 'The first ___ is a working prototype, not a slide deck.',
    translation: '第一个交付物是一个可运行的原型，而不是一份幻灯片。',
    collocation: 'define deliverables / tangible deliverable / deliverable-based',
    level: '商务项目'
  },
  {
    id: 'b05', cat: 'business', word: 'escalate', accepted: [],
    phonetic: '/ˈeskəleɪt/', pos: 'v.',
    meaning: '上报、升级（问题）',
    meaningEn: 'to raise an issue to a higher level of authority',
    scene: '依赖方接口卡了一整天，团队自己推不动。你在站会上定规则：超过一天就往上升级。',
    sentence: 'If the blocker lasts more than a day, ___ it to the steering committee.',
    translation: '如果这个阻塞持续超过一天，就把它上报给指导委员会。',
    collocation: 'escalate to / escalation path / escalate an issue',
    level: 'CET-6 · 商务高频'
  },
  {
    id: 'b06', cat: 'business', word: 'mitigate', accepted: [],
    phonetic: '/ˈmɪtɪɡeɪt/', pos: 'v.',
    meaning: '缓解、减轻（风险）',
    meaningEn: 'to make something bad less severe',
    scene: '核心链路依赖第三方服务，你在方案里加了一层兜底，用来降低对方宕机带来的影响。',
    sentence: 'We added a fallback to ___ the risk of a third-party outage.',
    translation: '我们加了一层兜底，以降低第三方服务中断的风险。',
    collocation: 'mitigate risk / risk mitigation / mitigate the impact',
    level: 'CET-6 · 商务高频'
  },
  {
    id: 'b07', cat: 'business', word: 'consensus', accepted: [],
    phonetic: '/kənˈsensəs/', pos: 'n.',
    meaning: '共识',
    meaningEn: 'general agreement among a group',
    scene: '路线图争了两轮，你想宣布终于可以往下走了：大家已经形成一致意见。',
    sentence: 'After two rounds of debate we finally reached a ___ on the roadmap.',
    translation: '经过两轮争论，我们终于就路线图达成了共识。',
    collocation: 'reach a consensus / build consensus / consensus-driven',
    level: 'CET-6'
  },
  {
    id: 'b08', cat: 'business', word: 'bandwidth', accepted: [],
    phonetic: '/ˈbændwɪdθ/', pos: 'n.',
    meaning: '（人的）精力、可承载余量',
    meaningEn: 'the capacity to take on more work',
    scene: '又有人想往这个迭代塞需求。你想委婉但明确地说明：团队这周接不动了。',
    sentence: "I don't have the ___ to take on another project this sprint.",
    translation: '这个迭代我没有余力再接另一个项目了。',
    collocation: 'have the bandwidth / limited bandwidth / free up bandwidth',
    level: '商务口语 · 引申义'
  },
  {
    id: 'b09', cat: 'business', word: 'trade-off', accepted: ['tradeoff'],
    phonetic: '/ˈtreɪd ɔːf/', pos: 'n.',
    meaning: '权衡、取舍',
    meaningEn: 'giving up one thing to gain another',
    scene: '为了把响应时间压下来，你们决定牺牲一点准确率。你想说明这是有意的选择，不是疏漏。',
    sentence: 'Choosing latency over accuracy is a deliberate ___.',
    translation: '选择低延迟而非高准确率，是一次有意的取舍。',
    collocation: 'make a trade-off / trade-off between A and B',
    level: 'CET-6 · 决策高频'
  },
  {
    id: 'b10', cat: 'business', word: 'scalable', accepted: [],
    phonetic: '/ˈskeɪləbl/', pos: 'adj.',
    meaning: '可扩展的、可规模化的',
    meaningEn: 'able to grow without being rebuilt',
    scene: '规则引擎先在一个区域试点。你评审时要求：这套设计必须能复制到所有区域团队。',
    sentence: 'The rules engine must be ___ across all regional teams.',
    translation: '这套规则引擎必须能扩展到所有区域团队。',
    collocation: 'scalable architecture / scale up / scalability',
    level: '技术商务'
  },
  {
    id: 'b11', cat: 'business', word: 'onboarding', accepted: [],
    phonetic: '/ˈɒnbɔːrdɪŋ/', pos: 'n.',
    meaning: '新人上手 / 融入流程',
    meaningEn: 'the process of getting a new person productive',
    scene: '新人第一周还在到处问环境怎么起。你想推动把上手流程文档化，把磨合时间砍一半。',
    sentence: 'A good ___ flow cuts the ramp-up time in half.',
    translation: '一套好的上手流程能把磨合时间缩短一半。',
    collocation: 'onboarding flow / onboard a new hire / ramp-up time',
    level: '商务管理'
  },
  {
    id: 'b12', cat: 'business', word: 'prioritize', accepted: ['prioritise'],
    phonetic: '/praɪˈɒrətaɪz/', pos: 'v.',
    meaning: '排优先级',
    meaningEn: 'to decide what matters most and do it first',
    scene: '需求池二十条，你在排期会上定原则：先做能解开销售团队阻塞的那几条。',
    sentence: 'We ___ the requests that unblock the sales team first.',
    translation: '我们优先处理那些能解开销售团队阻塞的需求。',
    collocation: 'prioritize tasks / ruthless prioritization / top priority',
    level: 'CET-6 · 商务高频'
  },
  {
    id: 'b13', cat: 'business', word: 'bottleneck', accepted: [],
    phonetic: '/ˈbɒtlnek/', pos: 'n.',
    meaning: '瓶颈',
    meaningEn: 'the slowest step that limits the whole system',
    scene: '转化漏斗分析完，你发现真正拖慢全流程的不是代码，而是人工审核这一环。',
    sentence: 'Manual review turned out to be the real ___ in the funnel.',
    translation: '人工审核才是整个漏斗里真正的瓶颈。',
    collocation: 'identify the bottleneck / remove a bottleneck',
    level: 'CET-6 · 系统思考'
  },
  {
    id: 'b14', cat: 'business', word: 'contingency', accepted: [],
    phonetic: '/kənˈtɪndʒənsi/', pos: 'n.',
    meaning: '应急预案、备选方案',
    meaningEn: 'a plan for something that might go wrong',
    scene: '供应商 SLA 不太靠谱。你要求关键活动都必须准备一套 B 计划。',
    sentence: 'Always keep a ___ plan when the vendor SLA is weak.',
    translation: '当供应商的 SLA 不牢靠时，永远要留一套应急预案。',
    collocation: 'contingency plan / contingency budget',
    level: 'CET-6 · 商务'
  },
  {
    id: 'b15', cat: 'business', word: 'articulate', accepted: [],
    phonetic: '/ɑːrˈtɪkjuleɪt/', pos: 'v.',
    meaning: '清晰表达（复杂想法）',
    meaningEn: 'to express an idea clearly and precisely',
    scene: '申请编制前，鹏哥让你把价值讲清楚。他追问：能不能一句话说明白？',
    sentence: 'Can you ___ the business value in one sentence?',
    translation: '你能不能用一句话把业务价值讲清楚？',
    collocation: 'articulate a vision / clearly articulated / articulate the why',
    level: 'CET-6 · 汇报高频'
  },
  {
    id: 'b16', cat: 'business', word: 'feasible', accepted: [],
    phonetic: '/ˈfiːzəbl/', pos: 'adj.',
    meaning: '可行的',
    meaningEn: 'possible to do without unreasonable effort',
    scene: '业务方问两周能不能上线。你给的技术判断是：做得到，但风险不小。',
    sentence: 'Shipping in two weeks is technically ___ but risky.',
    translation: '两周内上线在技术上可行，但风险较高。',
    collocation: 'technically feasible / feasibility study / not feasible',
    level: 'CET-6'
  },
  {
    id: 'b17', cat: 'business', word: 'delegate', accepted: [],
    phonetic: '/ˈdelɪɡeɪt/', pos: 'v.',
    meaning: '授权、委派',
    meaningEn: 'to give someone else the authority to decide',
    scene: '你自己成了团队瓶颈。带团队复盘时你写下一条：要授的是决策权，不只是任务。',
    sentence: 'A manager should ___ decisions, not just tasks.',
    translation: '管理者应该委派决策权，而不只是派活。',
    collocation: 'delegate authority / delegate to / delegation',
    level: 'CET-6 · 管理'
  },
  {
    id: 'b18', cat: 'business', word: 'retrospective', accepted: [],
    phonetic: '/ˌretrəˈspektɪv/', pos: 'n.',
    meaning: '复盘（会）',
    meaningEn: 'a structured review of what happened and why',
    scene: '项目延期后开会复盘，你引导大家别急着归咎于人，先看流程：真正原因是范围蔓延。',
    sentence: 'In the ___ we found that scope creep, not code, caused the delay.',
    translation: '在复盘中我们发现，导致延期的是范围蔓延，而不是代码。',
    collocation: 'run a retrospective / blameless retrospective',
    level: '敏捷 / 管理'
  },
  {
    id: 'b19', cat: 'business', word: 'streamline', accepted: [],
    phonetic: '/ˈstriːmlaɪn/', pos: 'v.',
    meaning: '精简、优化（流程）',
    meaningEn: 'to make a process simpler and faster',
    scene: '一个审批要过五道。你牵头把它压到两道，想用一句话写进改进项。',
    sentence: 'We plan to ___ the approval chain from five steps to two.',
    translation: '我们计划把审批链从五步精简到两步。',
    collocation: 'streamline the process / streamline operations',
    level: 'CET-6 · 商务'
  },
  {
    id: 'b20', cat: 'business', word: 'compelling', accepted: [],
    phonetic: '/kəmˈpelɪŋ/', pos: 'adj.',
    meaning: '有说服力的、引人入胜的',
    meaningEn: 'so convincing that people feel they must act',
    scene: '你要向 X2 申请资源。同事提醒：数字之外，还得先有一个让人愿意听下去的叙事。',
    sentence: 'You need a ___ narrative before asking for headcount.',
    translation: '在申请编制之前，你需要一个足够有说服力的叙事。',
    collocation: 'a compelling case / compelling evidence / compelling story',
    level: 'CET-6 · 汇报'
  },

  /* ---------------- Agent 开发 20 ---------------- */
  {
    id: 'a01', cat: 'agent', word: 'prompt', accepted: [],
    phonetic: '/prɒmpt/', pos: 'n.',
    meaning: '提示词',
    meaningEn: 'the instruction given to a language model',
    scene: '同一个工具调用时灵时不灵。排查后你发现，问题不在模型，而是指令写得太含糊。',
    sentence: 'A vague ___ produces inconsistent tool calls.',
    translation: '含糊的提示词会导致工具调用结果不稳定。',
    collocation: 'system prompt / prompt template / prompt engineering',
    level: 'AI 基础'
  },
  {
    id: 'a02', cat: 'agent', word: 'context', accepted: [],
    phonetic: '/ˈkɒntekst/', pos: 'n.',
    meaning: '上下文',
    meaningEn: 'the information available to the model at decision time',
    scene: '上下文窗口又被塞满了。你定了一条原则：只保留会真正改变下一步决策的信息。',
    sentence: 'Keep only the ___ that changes the next decision.',
    translation: '只保留那些会改变下一步决策的上下文。',
    collocation: 'context window / in context / context engineering',
    level: 'AI 基础'
  },
  {
    id: 'a03', cat: 'agent', word: 'inference', accepted: [],
    phonetic: '/ˈɪnfərəns/', pos: 'n.',
    meaning: '推理（模型计算）；推断',
    meaningEn: 'running a trained model to produce an output',
    scene: '成本评审时你指出：把请求合批，能把这部分的调用开销砍掉一半。',
    sentence: 'Batch the requests to cut ___ cost by half.',
    translation: '把请求合批，可以把推理成本砍掉一半。',
    collocation: 'inference cost / inference latency / draw an inference',
    level: 'CET-6 · AI 引申'
  },
  {
    id: 'a04', cat: 'agent', word: 'latency', accepted: [],
    phonetic: '/ˈleɪtənsi/', pos: 'n.',
    meaning: '延迟',
    meaningEn: 'the delay before a response arrives',
    scene: '加了工具调用后用户明显觉得「卡」。你在评审里点出：每一跳都会累积等待。',
    sentence: 'Tool calling adds ___ that users notice immediately.',
    translation: '工具调用带来的延迟，用户立刻就能感觉到。',
    collocation: 'p99 latency / low latency / latency budget',
    level: 'AI 工程'
  },
  {
    id: 'a05', cat: 'agent', word: 'robust', accepted: [],
    phonetic: '/rəʊˈbʌst/', pos: 'adj.',
    meaning: '健壮的、抗异常的',
    meaningEn: 'able to handle bad input without breaking',
    scene: '模型偶尔吐出格式不合法的 JSON。你要求解析层不能一遇脏数据就崩。',
    sentence: 'The parser must be ___ to malformed model output.',
    translation: '解析器必须对格式不合法的模型输出具备健壮性。',
    collocation: 'robust to / robust parsing / robustness',
    level: 'CET-6 · 工程'
  },
  {
    id: 'a06', cat: 'agent', word: 'orchestrate', accepted: [],
    phonetic: '/ˈɔːkɪstreɪt/', pos: 'v.',
    meaning: '编排、协调（多个组件/Agent）',
    meaningEn: 'to coordinate several parts so they work as one',
    scene: '设计主控 Agent 时你划清边界：它负责调度子 Agent，而不是替它们把活干了。',
    sentence: 'A controller agent should ___ the sub-agents, not do their work.',
    translation: '主控 Agent 应该编排子 Agent，而不是替它们干活。',
    collocation: 'orchestrate workflows / orchestration layer',
    level: 'Agent 架构'
  },
  {
    id: 'a07', cat: 'agent', word: 'deterministic', accepted: [],
    phonetic: '/dɪˌtɜːmɪˈnɪstɪk/', pos: 'adj.',
    meaning: '确定性的（同样输入必得同样输出）',
    meaningEn: 'always producing the same result for the same input',
    scene: '计费和权限这类逻辑必须可审计。你要求这部分交给规则，别交给模型自由发挥。',
    sentence: 'Use a ___ rule for anything that must be auditable.',
    translation: '凡是需要可审计的地方，都用确定性的规则。',
    collocation: 'deterministic logic / non-deterministic output',
    level: 'Agent 架构'
  },
  {
    id: 'a08', cat: 'agent', word: 'trajectory', accepted: [],
    phonetic: '/trəˈdʒektəri/', pos: 'n.',
    meaning: '（推理/执行）轨迹',
    meaningEn: 'the full sequence of steps an agent took',
    scene: '一次线上失败复现不了。你要求把完整执行链路记下来，才能回放定位。',
    sentence: 'Log the full agent ___ so failures can be replayed.',
    translation: '把 Agent 的完整执行轨迹记下来，这样失败才能被回放。',
    collocation: 'reasoning trajectory / replay a trajectory',
    level: 'Agent 可观测'
  },
  {
    id: 'a09', cat: 'agent', word: 'threshold', accepted: [],
    phonetic: '/ˈθreʃhoʊld/', pos: 'n.',
    meaning: '阈值、临界值',
    meaningEn: 'a value that triggers a different behaviour when crossed',
    scene: '你想让 Agent 在没把握时主动找人确认，而不是硬猜。做法就是设一道置信度门槛。',
    sentence: 'Set a confidence ___ below which the agent asks a human.',
    translation: '设一个置信度阈值，低于它时 Agent 就向人求助。',
    collocation: 'set a threshold / above the threshold / threshold-based',
    level: 'CET-6 · 工程'
  },
  {
    id: 'a10', cat: 'agent', word: 'fallback', accepted: [],
    phonetic: '/ˈfɔːlbæk/', pos: 'n.',
    meaning: '兜底方案',
    meaningEn: 'a safe alternative used when the main path fails',
    scene: '外部 API 超时是常态。你评审时问的第一句永远是：这一跳失败后走哪条路？',
    sentence: 'Every tool call needs a ___ when the API times out.',
    translation: '每次工具调用都需要一个接口超时时的兜底方案。',
    collocation: 'fallback path / fall back to / graceful degradation',
    level: 'AI 工程'
  },
  {
    id: 'a11', cat: 'agent', word: 'scaffold', accepted: [],
    phonetic: '/ˈskæfoʊld/', pos: 'n.',
    meaning: '脚手架、外围框架',
    meaningEn: 'the supporting structure built around a core component',
    scene: '你在写 Harness 设计文档：裸模型本身不会记、不会调工具，是外围这层把它变成可用的系统。',
    sentence: 'The harness provides the ___ around a bare model.',
    translation: 'Harness 为裸模型提供了外围的脚手架。',
    collocation: 'scaffolding / agent scaffold / provide a scaffold',
    level: 'Harness 设计'
  },
  {
    id: 'a12', cat: 'agent', word: 'retrieve', accepted: [],
    phonetic: '/rɪˈtriːv/', pos: 'v.',
    meaning: '检索、取回',
    meaningEn: 'to fetch relevant pieces of information',
    scene: '知识库有几千页。你提醒团队别把整本文档塞进上下文，只取最相关的几段。',
    sentence: '___ only the top-k chunks instead of the whole document.',
    translation: '只检索 top-k 个片段，而不是整篇文档。',
    collocation: 'retrieve chunks / retrieval-augmented / RAG',
    level: 'CET-6 · RAG'
  },
  {
    id: 'a13', cat: 'agent', word: 'embed', accepted: [],
    phonetic: '/ɪmˈbed/', pos: 'v.',
    meaning: '嵌入（转成向量）',
    meaningEn: 'to represent content as a vector for semantic search',
    scene: '政策文档要支持语义检索。你想说：一次性做好向量化，后面反复复用。',
    sentence: '___ the policies once and reuse the vectors.',
    translation: '把政策文档一次性向量化，之后复用这些向量。',
    collocation: 'embedding model / embed a document / vector store',
    level: 'AI 基础'
  },
  {
    id: 'a14', cat: 'agent', word: 'evaluate', accepted: [],
    phonetic: '/ɪˈvæljueɪt/', pos: 'v.',
    meaning: '评估、评测',
    meaningEn: 'to measure how well something performs',
    scene: '团队凭感觉调 Prompt。你推的第一件事是先把评测集搭起来：没有度量就没有改进。',
    sentence: 'You cannot improve what you do not ___ systematically.',
    translation: '你无法改进一件没有被系统性评估过的事。',
    collocation: 'eval set / evaluate against / evaluation harness',
    level: 'CET-6 · Eval'
  },
  {
    id: 'a15', cat: 'agent', word: 'constraint', accepted: [],
    phonetic: '/kənˈstreɪnt/', pos: 'n.',
    meaning: '约束条件',
    meaningEn: 'a hard limit that must not be violated',
    scene: '有人把边界写在代码注释里。你纠正：凡是必须被遵守的约束，要写进系统提示。',
    sentence: 'State the ___ in the system prompt, not in a comment.',
    translation: '把约束写进系统提示词里，而不是写在注释里。',
    collocation: 'hard constraint / under constraints / constraint satisfaction',
    level: 'CET-6'
  },
  {
    id: 'a16', cat: 'agent', word: 'iterate', accepted: [],
    phonetic: '/ˈɪtəreɪt/', pos: 'v.',
    meaning: '迭代、反复打磨',
    meaningEn: 'to repeat a cycle of change and measurement',
    scene: '大家一上来就想换模型。你拦住：先把评测集跑几轮，别急着动底座。',
    sentence: '___ on the eval set before touching the model.',
    translation: '在动模型之前，先在评测集上迭代几轮。',
    collocation: 'iterate on / iteration cycle / rapid iteration',
    level: 'CET-6 · 工程'
  },
  {
    id: 'a17', cat: 'agent', word: 'ambiguous', accepted: [],
    phonetic: '/æmˈbɪɡjuəs/', pos: 'adj.',
    meaning: '有歧义的、含糊的',
    meaningEn: 'open to more than one interpretation',
    scene: 'Agent 跑着跑着就跑偏。你归因到指令层：同一句话能被理解成两种意思。',
    sentence: 'An ___ instruction is the main source of agent drift.',
    translation: '有歧义的指令是 Agent 行为漂移的主要来源。',
    collocation: 'ambiguous wording / resolve ambiguity',
    level: 'CET-6'
  },
  {
    id: 'a18', cat: 'agent', word: 'harness', accepted: [],
    phonetic: '/ˈhɑːrnɪs/', pos: 'n.',
    meaning: '（Agent）运行框架 / 外壳',
    meaningEn: 'the runtime that wraps a model with memory, tools and control',
    scene: '和领导讲 Agent 运作机制，你要一句话说清 Harness 到底管什么：记忆、工具、以及什么时候停。',
    sentence: 'The ___ owns memory, tools, and the stop condition.',
    translation: 'Harness 负责记忆、工具，以及停止条件。',
    collocation: 'agent harness / evaluation harness',
    level: 'Harness 设计'
  },
  {
    id: 'a19', cat: 'agent', word: 'granular', accepted: [],
    phonetic: '/ˈɡrænjələr/', pos: 'adj.',
    meaning: '细粒度的',
    meaningEn: 'divided into small, precise units',
    scene: '给 Agent 开权限时有人想直接给全量密钥。你要求按工具逐个授权。',
    sentence: 'Give the agent ___ permissions, not a root key.',
    translation: '给 Agent 细粒度的权限，而不是一把万能密钥。',
    collocation: 'fine-grained / granular control / granularity',
    level: 'Agent 安全'
  },
  {
    id: 'a20', cat: 'agent', word: 'guardrail', accepted: ['guard-rail'],
    phonetic: '/ˈɡɑːrdreɪl/', pos: 'n.',
    meaning: '护栏、安全边界',
    meaningEn: 'a rule that blocks unsafe behaviour',
    scene: 'Agent 能写库之后，你补的最后一道设计是：任何越出沙箱的写操作直接拦掉。',
    sentence: 'Add a ___ that rejects any write outside the sandbox.',
    translation: '加一道护栏，拒绝任何越出沙箱的写操作。',
    collocation: 'safety guardrail / put guardrails on',
    level: 'Agent 安全'
  },

  /* ---------------- 思维认知 20 ---------------- */
  {
    id: 't01', cat: 'thinking', word: 'assumption', accepted: [],
    phonetic: '/əˈsʌmpʃən/', pos: 'n.',
    meaning: '假设（未被验证的前提）',
    meaningEn: 'something taken as true without proof',
    scene: '一个方案看起来天经地义。你想先把藏在论证底下、还没验证过的前提全部揪出来。',
    sentence: 'Write down every ___ before you argue for a conclusion.',
    translation: '在为结论辩护之前，先把每一个假设写下来。',
    collocation: 'hidden assumption / challenge an assumption / underlying assumption',
    level: 'CET-6 · 第一性原理'
  },
  {
    id: 't02', cat: 'thinking', word: 'principle', accepted: ['principles'],
    phonetic: '/ˈprɪnsəpl/', pos: 'n.',
    meaning: '原理、根本原则',
    meaningEn: 'a fundamental truth that other things are built on',
    scene: '讨论方案时大家都在类比竞品。你把话题拉回来：先说清底层原理，再谈做法。',
    sentence: 'State the underlying ___ before you debate the solution.',
    translation: '在争论方案之前，先把底层原理说清楚。',
    collocation: 'first principles / from first principles / guiding principle',
    level: 'CET-6 · 第一性原理'
  },
  {
    id: 't03', cat: 'thinking', word: 'bias', accepted: [],
    phonetic: '/ˈbaɪəs/', pos: 'n.',
    meaning: '偏差、偏见',
    meaningEn: 'a systematic tilt in judgement',
    scene: '你发现自己只在找支持结论的证据。想提醒自己：这叫确认偏误，找的是佐证不是真相。',
    sentence: 'Confirmation ___ makes you search for evidence, not truth.',
    translation: '确认偏误让你去找证据，而不是去找真相。',
    collocation: 'confirmation bias / cognitive bias / biased towards',
    level: 'CET-6 · 批判性思维'
  },
  {
    id: 't04', cat: 'thinking', word: 'incentive', accepted: [],
    phonetic: '/ɪnˈsentɪv/', pos: 'n.',
    meaning: '激励、动机机制',
    meaningEn: 'what a person is actually rewarded for doing',
    scene: '一线动作变形，你没先怪人，而是去看考核口径：机制拧了，好人也会做出坏结果。',
    sentence: 'When the ___ is wrong, good people produce bad outcomes.',
    translation: '当激励设计错了，好人也会产出坏结果。',
    collocation: 'aligned incentives / incentive structure / perverse incentive',
    level: '博弈 / 决策'
  },
  {
    id: 't05', cat: 'thinking', word: 'resilience', accepted: [],
    phonetic: '/rɪˈzɪliəns/', pos: 'n.',
    meaning: '韧性、恢复力',
    meaningEn: 'the ability to recover after a shock',
    scene: '你在笔记里区分两个概念：扛住冲击只是韧性，能从冲击里变强才叫反脆弱。',
    sentence: '___ is surviving the shock; antifragility is gaining from it.',
    translation: '韧性是熬过冲击，反脆弱是从冲击中获益。',
    collocation: 'build resilience / resilient system',
    level: '反脆弱'
  },
  {
    id: 't06', cat: 'thinking', word: 'asymmetry', accepted: [],
    phonetic: '/ˌeɪˈsɪmətri/', pos: 'n.',
    meaning: '不对称（收益与损失）',
    meaningEn: 'an imbalance between upside and downside',
    scene: '评估一个副业方向，你只问一件事：上行够不够大，下行是不是封顶的。',
    sentence: 'Look for an ___ where upside is large and downside is capped.',
    translation: '去找那种上行空间大、而下行被封顶的不对称。',
    collocation: 'information asymmetry / asymmetric payoff',
    level: '反脆弱 / 决策'
  },
  {
    id: 't07', cat: 'thinking', word: 'paradox', accepted: [],
    phonetic: '/ˈpærədɒks/', pos: 'n.',
    meaning: '悖论',
    meaningEn: 'a statement that seems contradictory but may be true',
    scene: '选项越多，人反而越不满意。你想把这个反直觉的现象记进决策笔记。',
    sentence: 'The ___ of choice: more options often reduce satisfaction.',
    translation: '选择的悖论：选项越多，满意度反而常常越低。',
    collocation: 'the paradox of / seemingly paradoxical',
    level: 'CET-6'
  },
  {
    id: 't08', cat: 'thinking', word: 'heuristic', accepted: [],
    phonetic: '/hjuːˈrɪstɪk/', pos: 'n.',
    meaning: '启发式、经验法则',
    meaningEn: 'a mental shortcut that is fast but imperfect',
    scene: '时间不够做完整分析，你用一条经验规则先拍方向，同时提醒自己它什么时候会失效。',
    sentence: 'A ___ is fast, cheap, and sometimes wrong.',
    translation: '启发式很快、很省，但有时会错。',
    collocation: 'availability heuristic / use a heuristic',
    level: '认知科学'
  },
  {
    id: 't09', cat: 'thinking', word: 'deduce', accepted: [],
    phonetic: '/dɪˈdjuːs/', pos: 'v.',
    meaning: '推断、演绎',
    meaningEn: 'to reach a conclusion by reasoning from evidence',
    scene: '只有三个数据点。你提醒自己：从这里能看出模式，但还称不上规律。',
    sentence: 'From three data points you can ___ a pattern, not a law.',
    translation: '从三个数据点你能推断出一个模式，而不是一条规律。',
    collocation: 'deduce from / deduction vs induction',
    level: 'CET-6'
  },
  {
    id: 't10', cat: 'thinking', word: 'cognitive', accepted: [],
    phonetic: '/ˈkɒɡnətɪv/', pos: 'adj.',
    meaning: '认知的',
    meaningEn: 'related to how the mind knows and reasons',
    scene: '读完偏误清单，你写了句扎心的话：能叫出名字，不代表就能自动摆脱它。',
    sentence: 'Naming the ___ bias does not automatically remove it.',
    translation: '说出这个认知偏差的名字，并不会自动消除它。',
    collocation: 'cognitive bias / cognitive load / cognitive dissonance',
    level: 'CET-6 · 认知'
  },
  {
    id: 't11', cat: 'thinking', word: 'reframe', accepted: [],
    phonetic: '/ˌriːˈfreɪm/', pos: 'v.',
    meaning: '重构（问题的提法）',
    meaningEn: 'to ask the same question in a different, more useful way',
    scene: '团队卡在「怎么做得更快」。你把问题换掉：真正该问的是「哪些事干脆别做」。',
    sentence: "___ the question from 'how to go faster' to 'what to stop doing'.",
    translation: '把问题从「怎么更快」重构为「哪些事该停掉」。',
    collocation: 'reframe the problem / reframing',
    level: '结构化思考'
  },
  {
    id: 't12', cat: 'thinking', word: 'nuance', accepted: [],
    phonetic: '/ˈnjuːɑːns/', pos: 'n.',
    meaning: '细微差别',
    meaningEn: 'a small but important distinction',
    scene: '汇报被压成「做 / 不做」两栏。你想提醒：真正决定成败的，恰恰是被二选一抹掉的中间地带。',
    sentence: 'Binary framing erases the ___ that actually matters.',
    translation: '二元 framing 会抹掉那些真正要紧的细微差别。',
    collocation: 'capture the nuance / nuanced view',
    level: '批判性思维'
  },
  {
    id: 't13', cat: 'thinking', word: 'premise', accepted: [],
    phonetic: '/ˈpremɪs/', pos: 'n.',
    meaning: '前提（论证的起点）',
    meaningEn: 'the starting statement an argument rests on',
    scene: '一段论证逻辑漂亮，但你发现起点就站不住。想写一句：推理再完美也救不了错误前提。',
    sentence: 'If the ___ is false, a flawless argument still fails.',
    translation: '如果前提是错的，再无懈可击的论证也会失败。',
    collocation: 'false premise / start from the premise that',
    level: 'CET-6 · 逻辑'
  },
  {
    id: 't14', cat: 'thinking', word: 'synthesize', accepted: ['synthesise'],
    phonetic: '/ˈsɪnθəsaɪz/', pos: 'v.',
    meaning: '综合、整合出更高层结论',
    meaningEn: 'to combine separate ideas into a new whole',
    scene: '两派观点各执一词都有道理。你不想选边，而是想把它们合出一个第三种立场。',
    sentence: '___ the two opposing views into a third position.',
    translation: '把两种对立的观点综合成第三种立场。',
    collocation: 'synthesize findings / synthesis over summary',
    level: 'CET-6 · 思考'
  },
  {
    id: 't15', cat: 'thinking', word: 'deliberate', accepted: [],
    phonetic: '/dɪˈlɪbərət/', pos: 'adj.',
    meaning: '审慎的、刻意的',
    meaningEn: 'done on purpose, with conscious attention',
    scene: '你给自己定了一条：换一种思考方式不是靠灵感，而是靠可以重复的刻意练习。',
    sentence: 'Thinking is a ___ practice, not a reflex.',
    translation: '思考是一种刻意的练习，而不是条件反射。',
    collocation: 'deliberate practice / deliberate decision',
    level: 'CET-6'
  },
  {
    id: 't16', cat: 'thinking', word: 'framework', accepted: [],
    phonetic: '/ˈfreɪmwɜːrk/', pos: 'n.',
    meaning: '框架、分析框架',
    meaningEn: 'a structure used to organise how you see a problem',
    scene: '学了一堆模型后你想提醒自己别迷信：框架只是看问题的透镜，不是问题本身。',
    sentence: 'A ___ is a lens, not the territory.',
    translation: '框架是一副透镜，不是疆域本身。',
    collocation: 'apply a framework / mental framework',
    level: '商业决策'
  },
  {
    id: 't17', cat: 'thinking', word: 'falsify', accepted: [],
    phonetic: '/ˈfɔːlsɪfaɪ/', pos: 'v.',
    meaning: '证伪',
    meaningEn: 'to try to prove a claim wrong',
    scene: '你改了复盘习惯：不再找证据支持自己，而是先设计一个能推翻自己的检验。',
    sentence: 'Try to ___ your favorite hypothesis first.',
    translation: '先试着去证伪你最偏爱的那个假设。',
    collocation: 'falsifiable / falsification / attempt to falsify',
    level: '科学思维'
  },
  {
    id: 't18', cat: 'thinking', word: 'distill', accepted: [],
    phonetic: '/dɪˈstɪl/', pos: 'v.',
    meaning: '提炼、浓缩（本质）',
    meaningEn: 'to reduce material to its most essential form',
    scene: '读完上百页调研，你要交给领导的不是摘要，而是一条能直接用的判断规则。',
    sentence: '___ a hundred pages of notes into one decision rule.',
    translation: '把上百页笔记提炼成一条决策规则。',
    collocation: 'distill into / distilled insight',
    level: 'CET-6 · 思考'
  },
  {
    id: 't19', cat: 'thinking', word: 'counterfactual', accepted: [],
    phonetic: '/ˌkaʊntərˈfæktʃuəl/', pos: 'n.',
    meaning: '反事实（假如当初没这么选）',
    meaningEn: 'what would have happened if the choice had been different',
    scene: '复盘一个决策，你不只看结果，还追问：如果当时不做这个选择，会怎样？',
    sentence: 'Ask the ___: what would have happened without this choice?',
    translation: '问一个反事实：如果没有做这个选择，会发生什么？',
    collocation: 'counterfactual reasoning / run a counterfactual',
    level: '决策复盘'
  },
  {
    id: 't20', cat: 'thinking', word: 'scrutinize', accepted: ['scrutinise'],
    phonetic: '/ˈskruːtɪnaɪz/', pos: 'v.',
    meaning: '细察、审视',
    meaningEn: 'to examine something very carefully',
    scene: '团队开始冲一个指标。你先泼冷水：在优化它之前，先看清楚这个指标到底在量什么。',
    sentence: '___ the metric before you optimize it.',
    translation: '在优化这个指标之前，先仔细审视它。',
    collocation: 'scrutinize the data / under scrutiny',
    level: 'CET-6 · 决策'
  },

  /* ---------------- 商业思考 20 ---------------- */
  {
    id: 's01', cat: 'strategy', word: 'moat', accepted: [],
    phonetic: '/moʊt/', pos: 'n.',
    meaning: '护城河、竞争壁垒',
    meaningEn: 'a structural advantage that keeps competitors from copying you',
    scene: '投资人问「大厂抄你怎么办」。你要说清楚：真正挡住对手的不是功能，是几年攒下来的工作流数据。',
    sentence: 'The workflow data is our real ___ , not the feature list.',
    translation: '工作流数据才是我们真正的护城河，不是功能清单。',
    collocation: 'build a moat / economic moat / a wide moat',
    level: '商业战略'
  },
  {
    id: 's02', cat: 'strategy', word: 'incumbent', accepted: [],
    phonetic: '/ɪnˈkʌmbənt/', pos: 'n.',
    meaning: '在位者、现有市场领先者',
    meaningEn: 'the established player already serving a market',
    scene: '你评估一个小众 B2B 机会：别只看市场空白，还要想清楚在位者为什么一直没做这件事。',
    sentence: 'The ___ ignores this segment because its margins look too small.',
    translation: '在位者忽略这个细分市场，是因为它的利润率看起来太小。',
    collocation: 'incumbent advantage / displace the incumbent',
    level: '商业战略'
  },
  {
    id: 's03', cat: 'strategy', word: 'wedge', accepted: [],
    phonetic: '/wedʒ/', pos: 'n.',
    meaning: '切入点、楔子（从一个窄口进入市场）',
    meaningEn: 'a narrow entry point used to get into a larger market',
    scene: '你想做 Micro-SaaS，但一上来就规划平台。提醒自己：先用一个窄到没人愿意做的场景扎进去。',
    sentence: 'Start with a narrow ___ before you try to build a platform.',
    translation: '先找一个窄切入点，别一上来就想做平台。',
    collocation: 'a wedge into the market / wedge strategy',
    level: '商业战略'
  },
  {
    id: 's04', cat: 'strategy', word: 'commoditize', accepted: ['commoditise'],
    phonetic: '/kəˈmɒdɪtaɪz/', pos: 'v.',
    meaning: '使商品化、沦为无差别标准品',
    meaningEn: 'to become interchangeable so price is the only differentiator',
    scene: '你判断某个 AI 能力值不值得投入：如果半年后所有模型都免费提供，这层就只是成本，不是壁垒。',
    sentence: 'Raw model quality will ___ ; the workflow around it will not.',
    translation: '裸模型能力终将商品化，围绕它的工作流不会。',
    collocation: 'commoditized feature / resist commoditization',
    level: '商业战略'
  },
  {
    id: 's05', cat: 'strategy', word: 'retention', accepted: [],
    phonetic: '/rɪˈtenʃn/', pos: 'n.',
    meaning: '留存、客户留存率',
    meaningEn: 'the share of customers who keep using a product over time',
    scene: '看一个订阅产品健不健康，你先不看新增，先看三个月后还有多少人在用。',
    sentence: 'Growth means nothing if ___ is falling every month.',
    translation: '如果留存每月都在掉，增长毫无意义。',
    collocation: 'retention rate / net revenue retention / churn vs retention',
    level: 'CET-6 · 增长'
  },
  {
    id: 's06', cat: 'strategy', word: 'churn', accepted: [],
    phonetic: '/tʃɜːrn/', pos: 'n.',
    meaning: '客户流失、流失率',
    meaningEn: 'the rate at which customers stop using a service',
    scene: '数据看着还行，但你发现每个月走掉的客户和新进的差不多——增长其实在原地踏步。',
    sentence: 'High ___ quietly cancels out all of our new sign-ups.',
    translation: '高流失率悄悄抵消了所有新增注册。',
    collocation: 'churn rate / reduce churn / voluntary churn',
    level: '增长'
  },
  {
    id: 's07', cat: 'strategy', word: 'pricing', accepted: [],
    phonetic: '/ˈpraɪsɪŋ/', pos: 'n.',
    meaning: '定价（策略）',
    meaningEn: 'how a product is priced and what that signals to buyers',
    scene: '你把副业产品定得太便宜，反而没人认真用。想提醒自己：定价本身就在筛选客户。',
    sentence: '___ is not a number; it defines which buyer you are talking to.',
    translation: '定价不是一个数字，它定义了你在跟哪类买家说话。',
    collocation: 'pricing strategy / tiered pricing / value-based pricing',
    level: '商业战略'
  },
  {
    id: 's08', cat: 'strategy', word: 'differentiation', accepted: [],
    phonetic: '/ˌdɪfərenʃiˈeɪʃn/', pos: 'n.',
    meaning: '差异化',
    meaningEn: 'what makes an offer meaningfully different from alternatives',
    scene: '同类工具一大堆，你想说服团队：如果讲不清和替代方案的差别，最后只能拼价格。',
    sentence: 'Without clear ___ , you end up competing on price alone.',
    translation: '没有清晰的差异化，最终只能靠价格竞争。',
    collocation: 'product differentiation / a point of differentiation',
    level: '商业战略'
  },
  {
    id: 's09', cat: 'strategy', word: 'recurring', accepted: [],
    phonetic: '/rɪˈkɜːrɪŋ/', pos: 'adj.',
    meaning: '经常性（收入）、循环发生的',
    meaningEn: 'happening repeatedly, especially revenue that renews itself',
    scene: '你比较两种副业：一次性项目交付和订阅制。前者每月归零，后者会自己叠上去。',
    sentence: '___ revenue compounds; a one-off project resets to zero every month.',
    translation: '经常性收入会复利累积；一次性项目每个月都归零。',
    collocation: 'recurring revenue / recurring billing / MRR',
    level: 'CET-6 · 商业模式'
  },
  {
    id: 's10', cat: 'strategy', word: 'margin', accepted: [],
    phonetic: '/ˈmɑːrdʒɪn/', pos: 'n.',
    meaning: '利润率、边际',
    meaningEn: 'the gap between revenue and the cost of serving a customer',
    scene: '算完账你发现：调用大模型的成本吃掉了大半收入，这个定价撑不住。',
    sentence: 'Inference cost is eating our gross ___ on every request.',
    translation: '推理成本正在吃掉每一次请求的毛利润。',
    collocation: 'gross margin / profit margin / margin pressure',
    level: 'CET-6 · 财务'
  },
  {
    id: 's11', cat: 'strategy', word: 'positioning', accepted: [],
    phonetic: '/pəˈzɪʃənɪŋ/', pos: 'n.',
    meaning: '定位（在客户心智中的位置）',
    meaningEn: 'how a product is framed relative to alternatives in buyers\' minds',
    scene: '同一个功能，说成「AI 助手」和说成「电销线索清洗工具」，来问的人完全不一样。',
    sentence: 'Good ___ decides who compares you to whom.',
    translation: '好的定位决定了客户拿你去和谁比较。',
    collocation: 'market positioning / reposition a product',
    level: '商业战略'
  },
  {
    id: 's12', cat: 'strategy', word: 'cannibalize', accepted: ['cannibalise'],
    phonetic: '/ˈkænɪbəlaɪz/', pos: 'v.',
    meaning: '（新产品）蚕食自家原有业务',
    meaningEn: 'of a new offer, taking sales away from your own existing one',
    scene: '新订阅版会抢走老授权版的收入，团队犹豫要不要上。你的判断是：自己不蚕食，别人也会。',
    sentence: 'We should ___ our own legacy product before a competitor does.',
    translation: '我们应该自己蚕食老产品，而不是等竞争对手来做。',
    collocation: 'cannibalize sales / cannibalization risk',
    level: '商业战略'
  },
  {
    id: 's13', cat: 'strategy', word: 'distribution', accepted: [],
    phonetic: '/ˌdɪstrɪˈbjuːʃn/', pos: 'n.',
    meaning: '分发、渠道',
    meaningEn: 'the way a product actually reaches its buyers',
    scene: '你不想做泛化产品，但也清楚：安静开发不等于没人看见——没有渠道，再好的工具也没人付钱。',
    sentence: 'A better product loses to a worse one with better ___ .',
    translation: '更好的产品会输给渠道更好的较差产品。',
    collocation: 'distribution channel / own the distribution / distribution advantage',
    level: 'CET-6 · 商业'
  },
  {
    id: 's14', cat: 'strategy', word: 'payoff', accepted: [],
    phonetic: '/ˈpeɪɔːf/', pos: 'n.',
    meaning: '回报、收益结果',
    meaningEn: 'the eventual return from an action or investment',
    scene: '评估要不要花两周做自动化，你先问一句：这个投入多久能回本，最坏又能坏到哪。',
    sentence: 'Before automating, estimate the ___ and the worst-case downside.',
    translation: '做自动化之前，先估一下回报和最坏情况下的损失。',
    collocation: 'asymmetric payoff / expected payoff / payoff matrix',
    level: '决策'
  },
  {
    id: 's15', cat: 'strategy', word: 'headwind', accepted: [],
    phonetic: '/ˈhedwɪnd/', pos: 'n.',
    meaning: '逆风、不利的外部因素',
    meaningEn: 'an external force that makes progress harder',
    scene: '业务增长放缓，团队想归因到环境。你提醒：先分清是行业逆风，还是我们自己的转化出了问题。',
    sentence: 'Is this a market ___ , or a funnel problem we created?',
    translation: '这是市场逆风，还是我们自己造成的漏斗问题？',
    collocation: 'macro headwind / face headwinds / tailwind vs headwind',
    level: '商业分析'
  },
  {
    id: 's16', cat: 'strategy', word: 'adjacent', accepted: [],
    phonetic: '/əˈdʒeɪsnt/', pos: 'adj.',
    meaning: '相邻的、邻近的（市场/领域）',
    meaningEn: 'closely related to what you already do',
    scene: '第一个产品站稳了，你想扩品类。原则是先做老客户顺手也会买的邻近场景，别跳到陌生赛道。',
    sentence: 'Expand into an ___ market where the same buyer already trusts you.',
    translation: '往同一批客户已经信任你的邻近市场扩张。',
    collocation: 'adjacent market / adjacent opportunity',
    level: 'CET-6 · 战略'
  },
  {
    id: 's17', cat: 'strategy', word: 'friction', accepted: [],
    phonetic: '/ˈfrɪkʃn/', pos: 'n.',
    meaning: '摩擦、使用阻力',
    meaningEn: 'anything that makes it harder for a user to take the next step',
    scene: '注册要填七项，转化掉了一大半。你想说的不是「界面丑」，而是每一步多余动作都在赶人走。',
    sentence: 'Every extra field adds ___ to the sign-up flow.',
    translation: '每多一个字段，都给注册流程增加一分摩擦。',
    collocation: 'remove friction / frictionless / user friction',
    level: 'CET-6 · 产品'
  },
  {
    id: 's18', cat: 'strategy', word: 'defensible', accepted: [],
    phonetic: '/dɪˈfensəbl/', pos: 'adj.',
    meaning: '可防御的、守得住的',
    meaningEn: 'able to resist being copied or displaced',
    scene: 'Demo 很惊艳，但你想提醒团队：能被一个周末复刻的东西，不构成生意。',
    sentence: 'A slick demo is not the same as a ___ business.',
    translation: '漂亮的演示和一桩守得住的生意，不是一回事。',
    collocation: 'defensible advantage / defensibility',
    level: '商业战略'
  },
  {
    id: 's19', cat: 'strategy', word: 'niche', accepted: [],
    phonetic: '/niːʃ/', pos: 'n.',
    meaning: '利基市场、小而专的细分',
    meaningEn: 'a narrow, specialised segment that big players overlook',
    scene: '你不想做泛化 AI 工具，因为说不清谁买。反而一个具体到岗位的小场景，付费触发点很清楚。',
    sentence: 'A boring ___ with a named buyer beats a vague mass market.',
    translation: '一个有着明确买家的无聊利基市场，胜过一个含糊的大众市场。',
    collocation: 'niche market / find a niche / niche down',
    level: '商业战略'
  },
  {
    id: 's20', cat: 'strategy', word: 'optionality', accepted: [],
    phonetic: '/ˌɒpʃəˈnæləti/', pos: 'n.',
    meaning: '选择权、保留未来选项的余地',
    meaningEn: 'keeping multiple future choices open at low cost',
    scene: '你不想为副业押上全部周末，于是分阶段做：每一步都留着转向或停掉的余地，上行却不封顶。',
    sentence: 'Small bets preserve ___ while keeping the upside uncapped.',
    translation: '小赌注保留了选择权，同时上行空间不被封顶。',
    collocation: 'preserve optionality / real options / strategic optionality',
    level: '反脆弱 · 战略'
  }
];

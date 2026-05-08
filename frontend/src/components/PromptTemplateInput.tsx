import { useState, useRef, useEffect, useCallback } from 'react';

interface Template {
  id: string;
  icon: string;
  label: string;
  desc: string;
  prompt: string;
  color: string; // tailwind bg color
}

export const PROMPT_TEMPLATES: Template[] = [
  {
    id: 'rebirth-rich',
    icon: '💰',
    label: '重生暴富',
    desc: '回到过去靠信息差发家',
    prompt: `写一个番茄平台商业爽文：

主角【请填写姓名】重生回到2008年，带着前世所有记忆。他发现此刻比特币才几美分、拼多多还没诞生、抖音还没上线——遍地都是黄金。

前世他是个被资本碾压的底层社畜，这一世他要抢占所有风口：先用比特币和美股完成原始积累，再提前布局移动互联网、直播带货、新能源赛道。

前世看不起他的校花、嘲讽他的室友、坑死他的老板，这一世他要让他们高攀不起。`,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    id: 'rebirth-revenge',
    icon: '🩸',
    label: '重生复仇',
    desc: '含恨而死，重生手刃仇人',
    prompt: `写一个番茄平台复仇爽文：

主角【请填写姓名】前世被最信任的妻子和兄弟联手背叛——夺他家产、毁他名声、害他家破人亡，最后惨死街头。

睁开眼，他发现自己回到了悲剧发生的前一年。他还是那个一无所有的穷小子，但他知道所有人的秘密、所有即将发生的事。

这一次他要步步为营：先利用先知优势积累第一桶金，再一个个猎杀前世仇人。他要让背叛者跪在脚下求饶，要让前世看不起他的人一个个后悔。

不做圣母，不搞原谅，有仇必报，十倍奉还。`,
    color: 'bg-red-50 border-red-200 text-red-700',
  },
  {
    id: 'system-signin',
    icon: '📱',
    label: '签到系统',
    desc: '每日签到获得逆天奖励',
    prompt: `写一个番茄平台系统爽文：

主角【请填写姓名】一觉醒来，手机里多了一个「签到系统」。

第1天签到：奖励现金100万
第7天签到：奖励顶级商业技能
第30天签到：奖励某某集团100%股权
第100天签到：奖励一座私人岛屿

别人996卷生卷死，他每天躺着签到就能登顶世界之巅。名校学霸？签到给智力药水。国际巨头？签到给核心技术。当红女星？签到给魅力光环。

本书主打：日常签到流 + 神豪流 + 商战流，轻松日常穿插打脸爽点。`,
    color: 'bg-green-50 border-green-200 text-green-700',
  },
  {
    id: 'god-tier-return',
    icon: '👑',
    label: '王者归来',
    desc: '满级大佬回归都市',
    prompt: `写一个番茄平台王者归来爽文：

主角【请填写姓名】——在异界修行十万年归来，修为通天，手段逆天。

但他现在身份证过期、学历只有初中、存款零元。重回都市的第一天被保安拦在小区门口，被亲戚嫌穷赶出家门。

不装了，摊牌了。异界十万年的积累不是吃素的：随手一张丹方价值十亿，随手一套功法震惊武林世家，随手救个人引来豪门千金倒追。

本书卖点：仙帝归来 + 扮猪吃老虎 + 豪门赘婿反杀，前中期打脸装逼，后期布局全球势力。`,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
  {
    id: 'son-in-law',
    icon: '💍',
    label: '赘婿逆袭',
    desc: '隐忍赘婿一朝翻盘',
    prompt: `写一个番茄平台赘婿逆袭文：

主角【请填写姓名】入赘某豪门三年，被丈母娘当狗骂，被小姨子当笑话看，老婆对他冷若冰霜。全家没人知道他的真实身份——他是某神秘势力继承人、身价万亿、战力天花板。

三年期满，他签下离婚协议，摘下隐藏实力的戒指。当天下午，丈母娘收到一份收购合同：家族企业一夜间易主。小姨子在酒吧被人下药，出手相救的神秘男子竟是她看不起的穷姐夫。

他不知道的是，离婚之后，那个冷若冰霜的妻子开始疯狂找他。

核心爽点：隐忍三年终于摊牌 + 离婚后前妻后悔 + 身份一层层揭秘。`,
    color: 'bg-pink-50 border-pink-200 text-pink-700',
  },
  {
    id: 'transmigrate-villain',
    icon: '📖',
    label: '穿书反派',
    desc: '穿成小说反派逆天改命',
    prompt: `写一个番茄平台穿书逆袭文：

主角【请填写姓名】熬夜看了一本都市爽文，一觉醒来发现自己穿成了书里只活了50章的炮灰反派——全书最高光的男主踏脚石，结局是被男主打断腿丢进监狱。

但他是读者啊！他知道原书所有剧情走向、所有机缘、所有女主的秘密。

开局就抢在男主之前拿到第一桶金，在女主最无助的时候抢先出手，把原书男主的金手指一一截胡。本来应该喊男主「老公」的女一现在喊他「恩人」，本来应该给男主送资源的贵人现在只认他。

他要让这个世界的剧本重写——主角是他，气运是他的，这个世界，也是他的。`,
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  },
  {
    id: 'urban-god',
    icon: '🏙️',
    label: '都市神豪',
    desc: '花钱就变强的神豪流',
    prompt: `写一个番茄平台神豪爽文：

主角【请填写姓名】获得「神豪系统」，系统规则简单粗暴：你花的每一分钱都会以百倍金额返还，而且能兑换技能点和属性点。

花10万买衣服 → 到账1000万 + 魅力+1
花100万买车 → 到账1亿 + 魅力+5
花1000万买房 → 到账10亿 + 解锁新技能

别的神豪文是「钱太多不知道怎么花」，这本书是「越花钱越强，不花就亏」。从买下整条街到收购上市集团，从私人飞机到私人岛屿，花钱就是修炼。

过程中自然吸引各路美女和商界对手，打脸装逼两不误。`,
    color: 'bg-orange-50 border-orange-200 text-orange-700',
  },
  {
    id: 'entertainment',
    icon: '🎬',
    label: '文娱天王',
    desc: '抄歌抄剧本制霸娱乐圈',
    prompt: `写一个番茄平台文娱爽文：

主角【请填写姓名】是从平行世界穿越来的。这个世界的文娱产业落后十年：没有周杰伦，没有漫威，没有《三体》，连抖音都没人做。

第一步：在酒吧随手弹了一首《晴天》，第二天全网爆火，签约费开价1000万。
第二步：写了个剧本叫《流浪地球》，被骂「中国拍不出科幻片」，上映后票房50亿。
第三步：注册了一家叫「字节跳动」的公司，做了个叫「抖音」的APP。

各国娱乐圈跪求合作，好莱坞导演排着队买改编权。而主角只是谦虚地说：「这也没什么，我就随便抄抄。」

本书卖点：平行世界文娱抄 + 商战布局 + 女星暧昧线。`,
    color: 'bg-sky-50 border-sky-200 text-sky-700',
  },
  {
    id: 'apocalypse-lord',
    icon: '🧟',
    label: '末世领主',
    desc: '丧尸末世建立基地称王',
    prompt: `写一个番茄平台末世争霸文：

主角【请填写姓名】重生回到丧尸爆发前7天。上一世他在末世苟活十年最终死在队友背叛下，这一世他要提前囤积物资、收服最强队友、抢占安全据点。

第1天：取出全部存款购买军火和粮食
第3天：说服前世最忠诚的战友提前入伙
第5天：占领一座易守难攻的工业园作为基地
第7天：丧尸病毒全球爆发，世界沦陷

当幸存者们在废墟里为一块面包杀人时，主角的基地里灯火通明、粮仓满溢、美女环绕。他从一座基地开始，一步步建立末世帝国。

核心卖点：重生先知 + 基地建设 + 末世争霸 + 多女主暧昧。`,
    color: 'bg-zinc-50 border-zinc-200 text-zinc-700',
  },
  {
    id: 'xianxia-sect',
    icon: '🐉',
    label: '修仙建宗',
    desc: '从凡人到开宗立派的修仙路',
    prompt: `写一个番茄平台修仙爽文：

主角【请填写姓名】——山村穷小子，意外得到一块上古大能留下的玉简，里面有完整的修仙传承。

这个世界修仙资源被五大宗门垄断，散修连修炼功法都买不起。但他有玉简在手：功法是最顶级的，丹方是失传的，阵法是上古的。

他偷偷修炼，低调发育。当宗门天才还在为突破练气期沾沾自喜时，他已悄然凝丹。当五大宗门为了一条灵脉大打出手时，他已布下十座护山大阵。

从山野散修到开宗立派，从被宗门欺压到让五大宗门低头。他要建立一个不受宗门垄断的新秩序，让天下散修都有修炼的机会。

本书卖点：凡人修仙 + 越级打脸 + 宗门争霸 + 红颜知己。`,
    color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
  },
  {
    id: 'live-stream',
    icon: '🎥',
    label: '直播封神',
    desc: '从零到直播界一哥的崛起',
    prompt: `写一个番茄平台直播题材爽文：

主角【请填写姓名】被公司裁员、被女朋友分手、卡里只剩800块。绝望中打开直播软件，打算随便播点什么打发时间。

但他不知道的是，他绑定了一个「直播封神系统」。

第1天直播聊天 → 触发「口吐莲花」，观众疯狂打赏
第3天直播做饭 → 触发「食神附体」，在线人数破10万
第7天直播唱歌 → 触发「天籁之音」，榜一大姐怒刷500万

当红主播看不起新人？主角一场直播收入顶她一年。平台想封杀他？全网观众直接炸锅。

从出租屋到千万豪宅，从底层小人物到直播界神话——他证明了普通人也可以一朝封神。

卖点：直播行业真实刻画 + 系统爽点 + 情感共鸣。`,
    color: 'bg-rose-50 border-rose-200 text-rose-700',
  },
  {
    id: 'game-realm',
    icon: '🎮',
    label: '游戏神豪',
    desc: '游戏里砸钱称霸全服',
    prompt: `写一个番茄平台游戏题材爽文：

主角【请填写姓名】——现实中的穷学生，网吧通宵都要凑钱。但他偶然绑定了「游戏反哺系统」：游戏里的充值金额100倍返还到现实账户，游戏里的等级可以兑换现实技能。

开局充值100块 → 现实到账10000块
全服第一把+20神器强化成功 → 现实获得「力量+10」
拿下全服PK赛冠军 → 现实资产翻倍

别人打游戏氪金，他打游戏赚钱。别人在游戏里被大佬欺负，他反手砸100万装备碾压回去。全服第一公会求他加入，排行榜前十的神豪排队求组队。

而所有人都不知道，这个在游戏里挥金如土的神秘大佬，现实中只是个穿着校服吃泡面的高中生。

本书卖点：游戏爽文 + 神豪元素 + 校园日常 + 身份反差。`,
    color: 'bg-teal-50 border-teal-200 text-teal-700',
  },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  error?: string;
}

export default function PromptTemplateInput({ value, onChange, onSubmit, error }: Props) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const slashRef = useRef<HTMLDivElement>(null);
  const [selectedSlash, setSelectedSlash] = useState(0);

  // Click outside closes slash menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) {
        setShowSlash(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const pos = e.target.selectionStart;
    setCursorPos(pos);
    onChange(newValue);

    // Check for slash trigger
    const beforeCursor = newValue.slice(0, pos);
    const slashIdx = beforeCursor.lastIndexOf('/');
    if (slashIdx >= 0) {
      const textAfterSlash = beforeCursor.slice(slashIdx + 1);
      // Only trigger if / is at start of line or after space/newline
      const charBeforeSlash = slashIdx > 0 ? beforeCursor[slashIdx - 1] : '\n';
      if (charBeforeSlash === ' ' || charBeforeSlash === '\n' || slashIdx === 0) {
        if (!textAfterSlash.includes(' ') && textAfterSlash.length < 20) {
          setSlashFilter(textAfterSlash);
          setShowSlash(true);
          setSelectedSlash(0);
        } else {
          setShowSlash(false);
        }
      } else {
        setShowSlash(false);
      }
    } else {
      setShowSlash(false);
    }
  }, [onChange]);

  const applyTemplate = (template: Template) => {
    const beforeCursor = value.slice(0, cursorPos);
    const afterCursor = value.slice(cursorPos);
    const slashIdx = beforeCursor.lastIndexOf('/');
    
    let newValue: string;
    if (slashIdx >= 0 && showSlash) {
      // Replace /filter with template prompt
      newValue = beforeCursor.slice(0, slashIdx) + template.prompt + afterCursor;
    } else {
      // Append template prompt
      newValue = (value ? value + ' ' : '') + template.prompt;
    }
    
    onChange(newValue);
    setShowSlash(false);
    setShowTemplates(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSlash) {
      const filtered = filterTemplates(slashFilter);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlash(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlash(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedSlash]) {
        e.preventDefault();
        applyTemplate(filtered[selectedSlash]);
      } else if (e.key === 'Escape') {
        setShowSlash(false);
      }
      return;
    }
    
    // Enter submits
    if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
      e.preventDefault();
      onSubmit();
    }
  };

  const filterTemplates = (filter: string) => {
    if (!filter) return PROMPT_TEMPLATES;
    const lower = filter.toLowerCase();
    return PROMPT_TEMPLATES.filter(t =>
      t.label.includes(lower) || t.desc.includes(lower) || t.prompt.includes(lower)
    );
  };

  return (
    <div className="space-y-3">
      {/* Template chips - first row shows 6 */}
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-gray-400 shrink-0 mt-1">模板：</span>
        <div className="flex flex-wrap gap-1.5 flex-1">
          {PROMPT_TEMPLATES.slice(0, 6).map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className={`text-[10px] sm:text-xs px-2 py-1 rounded-full border transition hover:scale-105 active:scale-95 ${t.color}`}
            >
              {t.icon} {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 transition"
          >
            {showTemplates ? '收起 ▴' : `+${PROMPT_TEMPLATES.length - 6}`}
          </button>
        </div>
      </div>

      {/* Expanded templates grid */}
      {showTemplates && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 animate-fadeIn">
          {PROMPT_TEMPLATES.slice(6).map(t => (
            <button
              key={t.id}
              onClick={() => applyTemplate(t)}
              className={`text-left p-2.5 rounded-lg border transition hover:shadow-sm active:scale-[0.97] ${t.color}`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-sm">{t.icon}</span>
                <span className="text-xs font-medium">{t.label}</span>
              </div>
              <div className="text-[10px] opacity-60">{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Textarea with slash overlay */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
          rows={3}
          placeholder={`输入故事创意，或点击上方模板快速填充...
输入 / 也可唤出模板选择菜单`}
        />
        
        {/* Slash command dropdown */}
        {showSlash && (
          <div
            ref={slashRef}
            className="absolute left-2 bottom-full mb-1 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-20 animate-slideUp"
          >
            <div className="px-3 py-2 text-[10px] text-gray-400 bg-gray-50 border-b">
              选择模板 — 输入关键字筛选，↓↑ 选择，Enter 确认，Esc 取消
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filterTemplates(slashFilter).map((t, i) => (
                <button
                  key={t.id}
                  onMouseDown={e => { e.preventDefault(); applyTemplate(t); }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2.5 text-xs transition ${
                    i === selectedSlash ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-sm">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{t.label}</div>
                    <div className="text-[10px] opacity-50 truncate">{t.desc}</div>
                  </div>
                </button>
              ))}
              {filterTemplates(slashFilter).length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-400 text-center">无匹配模板</div>
              )}
            </div>
          </div>
        )}

        {/* Hint */}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[10px] text-gray-400">
            输入 <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px]">/</kbd> 唤出模板 · 
            <kbd className="px-1 py-0.5 rounded bg-gray-100 text-gray-500 text-[9px] ml-0.5">Enter</kbd> 提交
          </p>
          {value.trim().length > 0 && (
            <span className="text-[10px] text-gray-400">{value.length} 字</span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>
      )}
    </div>
  );
}

interface Props {
  content: string;
  theme?: 'light' | 'dark' | 'sepia';
}

export default function ReviewNotes({ content, theme = 'light' }: Props) {
  const textColors: Record<string, string> = {
    light: 'text-gray-700',
    dark: 'text-gray-300',
    sepia: 'text-[#5b4636]',
  };

  const borderColors: Record<string, string> = {
    light: 'border-gray-200',
    dark: 'border-gray-700',
    sepia: 'border-[#d5c8a8]',
  };

  const sectionBg: Record<string, string> = {
    light: 'bg-white',
    dark: 'bg-gray-800',
    sepia: 'bg-[#f4ecd8]',
  };

  const parseReviewContent = (text: string) => {
    const trimmed = text.trim();

    if (trimmed.startsWith('{')) {
      try {
        const json = JSON.parse(trimmed);
        return parseStructuredReview(json);
      } catch {
        return [{ title: '审校意见', items: [text], type: 'general' }];
      }
    }

    const sections: { title: string; items: string[]; type: string }[] = [];
    const lines = text.split('\n');
    let currentSection: { title: string; items: string[]; type: string } | null = null;

    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;

      if (l.startsWith('【逻辑问题】')) {
        currentSection = { title: '逻辑问题', items: [], type: 'logic' };
        sections.push(currentSection);
      } else if (l.startsWith('【内容审核】')) {
        currentSection = { title: '内容审核', items: [], type: 'content' };
        sections.push(currentSection);
      } else if (l.startsWith('【文笔建议】')) {
        currentSection = { title: '文笔建议', items: [], type: 'style' };
        sections.push(currentSection);
      } else if (l.startsWith('【综合评分】')) {
        currentSection = { title: '综合评分', items: [], type: 'score' };
        sections.push(currentSection);
      } else if (l.startsWith('【修改后版本】')) {
        currentSection = { title: '修改后版本', items: [], type: 'revised' };
        sections.push(currentSection);
      } else if (currentSection) {
        currentSection.items.push(l);
      } else {
        if (!sections.length) {
          currentSection = { title: '审校意见', items: [l], type: 'general' };
          sections.push(currentSection);
        } else {
          sections[0].items.push(l);
        }
      }
    }
    return sections;
  };

  const parseStructuredReview = (json: any): { title: string; items: string[]; type: string }[] => {
    const sections: { title: string; items: string[]; type: string }[] = [];

    if (json.characters && Array.isArray(json.characters)) {
      const charItems = json.characters.map((c: any) =>
        `【${c.name}】（${c.role}）${c.appearance_method || ''} ${c.function || ''}`
      );
      sections.push({ title: '人物分析', items: charItems, type: 'characters' });
    }

    if (json.consistency_checks && Array.isArray(json.consistency_checks)) {
      const checkItems = json.consistency_checks.map((ck: any) =>
        `❌ ${ck.character}: ${ck.check}`
      );
      sections.push({ title: '一致性检查', items: checkItems, type: 'logic' });
    }

    if (json.development_notes && Array.isArray(json.development_notes)) {
      const devItems = json.development_notes.map((n: any) =>
        `📌 ${n.character}: ${n.note}`
      );
      sections.push({ title: '人物发展建议', items: devItems, type: 'style' });
    }

    if (json.scene_advice) {
      sections.push({ title: '场景建议', items: [json.scene_advice], type: 'content' });
    }

    return sections;
  };

  const sections = parseReviewContent(content);

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'logic': return '🔍';
      case 'content': return '📋';
      case 'style': return '✨';
      case 'score': return '📊';
      case 'revised': return '📝';
      case 'characters': return '👤';
      default: return '📌';
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'logic': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      case 'content': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20';
      case 'style': return 'text-purple-600 bg-purple-50 dark:bg-purple-900/20';
      case 'score': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'revised': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'characters': return 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  const renderLine = (line: string, index: number) => {
    if (line.includes('❌')) {
      const parts = line.split('→');
      return (
        <div key={index} className="flex flex-col gap-1 py-1">
          <span className="text-red-600 font-medium">{line}</span>
          {parts.length > 1 && (
            <span className="text-green-700 dark:text-green-400 text-xs ml-2">→ {parts[1].replace(/建议修改为：|建议：/, '')}</span>
          )}
        </div>
      );
    }
    if (line.includes('⚠️')) {
      const parts = line.split('→');
      return (
        <div key={index} className="flex flex-col gap-1 py-1">
          <span className="text-orange-600">{line}</span>
          {parts.length > 1 && (
            <span className="text-green-700 dark:text-green-400 text-xs ml-2">→ {parts[1].replace(/建议修改为：|建议：/, '')}</span>
          )}
        </div>
      );
    }
    if (line.match(/节奏：|逻辑：|人设：|爽感：|钩子：/)) {
      const scores = line.split('·').map(s => s.trim());
      return (
        <div key={index} className="flex flex-wrap gap-2 py-1">
          {scores.map((score, i) => (
            <span key={i} className={`text-xs px-2 py-1 rounded ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
            }`}>{score}</span>
          ))}
        </div>
      );
    }
    if (line.match(/字数：|脏话：|合规问题：/)) {
      return (
        <div key={index} className="text-xs py-0.5">
          <span className="text-gray-500">{line.split('：')[0]}：</span>
          <span className="font-medium">{line.split('：').slice(1).join('：')}</span>
        </div>
      );
    }
    return <div key={index} className="text-xs py-0.5">{line}</div>;
  };

  return (
    <div className={`border-b ${borderColors[theme]} ${theme === 'dark' ? 'bg-gray-850' : theme === 'sepia' ? 'bg-[#ede0c3]' : 'bg-blue-50'}`}>
      <div className="px-4 py-3 max-h-72 overflow-y-auto">
        <div className="text-xs font-medium text-blue-600 mb-3 flex items-center gap-2">
          <span>📝</span>
          <span>AI 审校意见</span>
        </div>
        <div className="space-y-3">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className={`rounded-lg p-3 ${sectionBg[theme]}`}>
              <div className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${getSectionColor(section.type)}`}>
                <span>{getSectionIcon(section.type)}</span>
                <span>{section.title}</span>
              </div>
              <div className={`${textColors[theme]}`}>
                {section.items.map((item, iIdx) => renderLine(item, iIdx))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
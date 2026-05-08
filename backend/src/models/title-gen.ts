import OpenAI from 'openai';
import { logger } from '../logger';

const TITLE_PROMPT = `你是番茄小说平台的资深内容策划，专门为商业网络小说起书名和写简介。

番茄小说平台的商业文特点：
1. 书名要抓眼球，6-12个字最佳，要有网感
2. 常用套路：重生/穿越/系统/签到/打脸/逆袭/赘婿/神医/神豪
3. 一句话简介要制造期待感和爽感，让读者一秒想看
4. 分类要准确：都市、玄幻、仙侠、科幻、历史、言情、悬疑

请根据用户提供的故事核心创意，输出以下JSON格式（不要加markdown代码块）：

{
  "titles": ["书名1", "书名2", "书名3", "书名4", "书名5"],
  "synopsis": "一句话简介，30-80字，要有钩子",
  "fullSynopsis": "详细简介，100-300字",
  "genre": "最适合的分类（urban/fantasy/xianxia/scifi/historical/romance/suspense之一）",
  "tags": ["标签1", "标签2", "标签3"],
  "sellingPoints": ["卖点1", "卖点2", "卖点3"],
  "targetAudience": "目标读者画像",
  "openingHook": "黄金开篇建议（前3章的钩子设计）"
}`;

export async function generateBookIdea(userPrompt: string): Promise<{
  titles: string[];
  synopsis: string;
  fullSynopsis: string;
  genre: string;
  tags: string[];
  sellingPoints: string[];
  targetAudience: string;
  openingHook: string;
}> {
  const client = new OpenAI({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseURL: 'https://api.deepseek.com/v1',
  });

  const completion = await client.chat.completions.create({
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: TITLE_PROMPT },
      { role: 'user', content: `故事核心创意：${userPrompt}` },
    ],
    temperature: 0.8,
    max_tokens: 2048,
  });

  const content = completion.choices[0]?.message?.content || '{}';
  
  logger.agent.call('title-gen', 'deepseek-chat', 
    (completion.usage?.prompt_tokens || 0) + (completion.usage?.completion_tokens || 0)
  );

  try {
    // Try to extract JSON from the response (may have markdown wrapping)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    return JSON.parse(jsonStr);
  } catch {
    // Fallback: return a basic structure
    return {
      titles: ['未命名作品'],
      synopsis: userPrompt.slice(0, 80),
      fullSynopsis: userPrompt,
      genre: 'urban',
      tags: [],
      sellingPoints: [],
      targetAudience: '',
      openingHook: '',
    };
  }
}

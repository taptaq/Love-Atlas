import type { DiscoveryCategory, DiscoveryItem } from '../../types';

export const discoveryPool = [
  // 事件类
  { id: 'event_switch_01', icon: '🔄', title: '换一个角度', message: '不是对错，而是不同。', category: 'event', condition: { event: 'switch' }, hidden: false, rarity: 'common', hint: '当你们选择换一个角度时……' },
  { id: 'event_switch_02', icon: '🔄', title: '理解的偏差', message: '以为懂，其实只是自己的想象。', category: 'event', condition: { event: 'switch', count: 2 }, hidden: false, rarity: 'common', hint: '再一次，从另一个角度看彼此。' },
  { id: 'event_moment_01', icon: '📸', title: '今天被认真记录', message: '这个瞬间被留下来了。', category: 'event', condition: { event: 'moment' }, hidden: false, rarity: 'common', hint: '当此刻被认真记录下来。' },
  { id: 'event_moment_02', icon: '📸', title: '此刻成了痕迹', message: '上传的每张图，都是一次定格。', category: 'event', condition: { event: 'moment', count: 2 }, hidden: false, rarity: 'common', hint: '又一次，把此刻留住了。' },
  { id: 'event_memory_01', icon: '🌊', title: '过去重新被提起', message: '有些话很久没说出口了。', category: 'event', condition: { event: 'memory' }, hidden: false, rarity: 'common', hint: '当旧时光被重新提起。' },
  { id: 'event_memory_02', icon: '🌊', title: '最初的靠近', message: '第一次觉得亲近，现在还记得。', category: 'event', condition: { event: 'memory', count: 2 }, hidden: false, rarity: 'common', hint: '又一次回到最初的靠近。' },
  { id: 'event_future_01', icon: '🏙', title: '第一次谈论以后', message: '未来开始出现轮廓。', category: 'event', condition: { event: 'future' }, hidden: false, rarity: 'common', hint: '当你们第一次谈起以后。' },
  { id: 'event_future_02', icon: '🏙', title: '你们的未来在对齐', message: '对未来的想象开始重叠。', category: 'event', condition: { event: 'future', count: 2 }, hidden: false, rarity: 'common', hint: '当未来的想象开始重叠。' },
  { id: 'event_silence_01', icon: '🌙', title: '沉默也是对话', message: '30秒不说话，也在靠近。', category: 'event', condition: { event: 'silence' }, hidden: false, rarity: 'common', hint: '当沉默也成了靠近。' },
  { id: 'event_silence_02', icon: '🌙', title: '在安静里听见', message: '不说话的时刻，反而有很多内容。', category: 'event', condition: { event: 'silence', count: 2 }, hidden: false, rarity: 'common', hint: '又一次，在安静里听见。' },

  // 区域类
  { id: 'region_forest_01', icon: '🌲', title: '开始表达', message: '有些感受，今天被说出来了。', category: 'region', condition: { region: 'forest' }, hidden: false, rarity: 'common', hint: '走进情绪森林的第一步。' },
  { id: 'region_forest_02', icon: '🌲', title: '情绪森林深处', message: '更深层的感受被提起来了。', category: 'region', condition: { region: 'forest', count: 2 }, hidden: false, rarity: 'common', hint: '再次走进情绪森林深处。' },
  { id: 'region_coast_01', icon: '🌊', title: '过去重新浮现', message: '海边的记忆被带回来了。', category: 'region', condition: { region: 'coast' }, hidden: false, rarity: 'common', hint: '海边的记忆被带回来。' },
  { id: 'region_coast_02', icon: '🌊', title: '海岸的回声', message: '有些事，很久没一起提起了。', category: 'region', condition: { region: 'coast', count: 2 }, hidden: false, rarity: 'common', hint: '又一次听见海岸的回声。' },
  { id: 'region_valley_01', icon: '🏡', title: '日常值得被看见', message: '一起走过的平凡日子也很珍贵。', category: 'region', condition: { region: 'valley' }, hidden: false, rarity: 'common', hint: '走进日常山谷。' },
  { id: 'region_valley_02', icon: '🏡', title: '生活的节奏', message: '日常的节奏让你们彼此更近。', category: 'region', condition: { region: 'valley', count: 2 }, hidden: false, rarity: 'common', hint: '再次感受生活的节奏。' },
  { id: 'region_city_01', icon: '🏙', title: '未来开始具体', message: '对未来的想象有了形状。', category: 'region', condition: { region: 'city' }, hidden: false, rarity: 'common', hint: '未来之城开始有了轮廓。' },
  { id: 'region_city_02', icon: '🏙', title: '共同的方向', message: '你们开始一起想象未来的样子。', category: 'region', condition: { region: 'city', count: 2 }, hidden: false, rarity: 'common', hint: '再一次，一起想象未来。' },
  { id: 'region_garden_01', icon: '🌸', title: '开始讨论差异', message: '边界也是可以一起探索的。', category: 'region', condition: { region: 'garden' }, hidden: false, rarity: 'common', hint: '走进边界花园。' },
  { id: 'region_garden_02', icon: '🌸', title: '花园在变化', message: '你们之间的界限在慢慢调整。', category: 'region', condition: { region: 'garden', count: 2 }, hidden: false, rarity: 'common', hint: '花园里的界限在变化。' },

  // 旅程类
  { id: 'journey_short_01', icon: '✨', title: '今天没有急着结束', message: '2题的轻量旅程也有重量。', category: 'journey', condition: { journeyLength: 2 }, hidden: false, rarity: 'common', hint: '完成一次轻盈的对话。' },
  { id: 'journey_normal_01', icon: '✨', title: '标准的一次对话', message: '3题的日常探索完成了。', category: 'journey', condition: { journeyLength: 3 }, hidden: false, rarity: 'common', hint: '完成一次日常的探索。' },
  { id: 'journey_deep_01', icon: '💫', title: '比平时聊得更深', message: '5题的深度探索，不常见的认真。', category: 'journey', condition: { journeyLength: 5 }, hidden: false, rarity: 'rare', hint: '一次少见的深度旅程。' },
  { id: 'journey_guess_mismatch_01', icon: '🌱', title: '出现新的理解', message: '原来你以为的，并不是对方想的。', category: 'journey', condition: { guessMatched: false }, hidden: false, rarity: 'rare', hint: '当理解出现新的角度。' },
  { id: 'journey_guess_match_01', icon: '🪞', title: '你们猜到了一起', message: '有些事情，你们想的很像。', category: 'journey', condition: { guessMatched: true }, hidden: false, rarity: 'common', hint: '当你们猜到了一起。' },
  { id: 'journey_long_answers_01', icon: '📝', title: '第一次认真回答', message: '回答比平时更真诚、更长。', category: 'journey', condition: { answersLong: true }, hidden: false, rarity: 'common', hint: '当回答比平时更真诚。' },
  { id: 'journey_multi_answers_01', icon: '📝', title: '完整的回答', message: '双方都写下了内容。', category: 'journey', condition: { answersBoth: true }, hidden: false, rarity: 'common', hint: '当双方都写下了心事。' },
  { id: 'journey_first_complete_01', icon: '✨', title: '第一次完整旅程', message: '你们第一次走完一次探索。', category: 'journey', condition: { firstComplete: true }, hidden: false, rarity: 'rare', hint: '第一次走完整段旅程。' },
  { id: 'journey_5_complete_01', icon: '🌟', title: '第5次完成', message: '已经有5次认真对话了。', category: 'journey', condition: { completeCount: 5 }, hidden: false, rarity: 'rare', hint: '第五次认真对话的标记。' },
  { id: 'journey_10_complete_01', icon: '🌟', title: '第10次完成', message: '累计10次完整的探索。', category: 'journey', condition: { completeCount: 10 }, hidden: false, rarity: 'rare', hint: '第十次探索的印记。' },
  { id: 'journey_multi_regions_01', icon: '🗺', title: '走过不同的地方', message: '你们进入了多个不同区域。', category: 'journey', condition: { multiRegion: true }, hidden: false, rarity: 'rare', hint: '当你们走过不同的地方。' },
  { id: 'journey_all_regions_01', icon: '🗺', title: '所有区域都去过', message: '5个区域都留下了你们的痕迹。', category: 'journey', condition: { allRegions: true }, hidden: false, rarity: 'rare', hint: '当五个区域都留下痕迹。' },
  { id: 'journey_with_event_01', icon: '🪞', title: '事件让旅程变了节奏', message: '这次旅程出现了转折。', category: 'journey', condition: { hasEvent: true }, hidden: false, rarity: 'common', hint: '当旅程出现转折。' },
  { id: 'journey_3_event_01', icon: '🪞', title: '多次的转折', message: '你们已经触发了3次事件。', category: 'journey', condition: { eventCount: 3 }, hidden: false, rarity: 'rare', hint: '当转折多次出现。' },
  { id: 'journey_keep_explore_01', icon: '✨', title: '持续的靠近', message: '最近连续在探索彼此。', category: 'journey', condition: { recentExplore: true }, hidden: false, rarity: 'common', hint: '当你们持续靠近。' },

  // 特殊类（隐藏，传说级）
  { id: 'special_first_upload_01', icon: '📷', title: '记录此刻的人', message: '第一次上传了此刻的照片。', category: 'special', condition: { firstMomentUpload: true }, hidden: true, rarity: 'hidden', hint: '一个关于记录的隐秘成就。' },
  { id: 'special_coast_3_01', icon: '🌊', title: '熟悉也会变化', message: '回忆海岸探索累计3次。', category: 'special', condition: { coastCount: 3 }, hidden: true, rarity: 'hidden', hint: '海边的常客会留下什么。' },
  { id: 'special_night_01', icon: '🌙', title: '适合说心里话', message: '在深夜完成了一次探索。', category: 'special', condition: { nightExplore: true }, hidden: true, rarity: 'hidden', hint: '深夜适合说心里话。' },
  { id: 'special_deep_journey_01', icon: '💫', title: '一次认真聊天', message: '一次深入的5题旅程。', category: 'special', condition: { deepJourney: true }, hidden: true, rarity: 'hidden', hint: '一次难得的认真聊天。' },
  { id: 'special_long_answers_01', icon: '📝', title: '长篇的回答', message: '有一次回答特别认真。', category: 'special', condition: { longestAnswer: true }, hidden: true, rarity: 'hidden', hint: '有一段特别长的回答。' },
  { id: 'special_emotion_forest_01', icon: '🌲', title: '情绪森林的常客', message: '多次走进情绪森林。', category: 'special', condition: { forestCount: 5 }, hidden: true, rarity: 'hidden', hint: '情绪森林的常客。' },
  { id: 'special_full_circle_01', icon: '🌟', title: '完整的一轮', message: '所有类型探索都尝试过了。', category: 'special', condition: { fullCircle: true }, hidden: true, rarity: 'hidden', hint: '当所有探索都尝试过。' },
] satisfies DiscoveryItem[];

export const discoveryCategories: DiscoveryCategory[] = ['event', 'region', 'journey', 'special'];

export const totalDiscoveries = discoveryPool.length;

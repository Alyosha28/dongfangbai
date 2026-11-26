export type Locale = 'en' | 'zh';

export function localizePath(path: string, locale: Locale): string {
  if (
    !path ||
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('mailto:') ||
    path.startsWith('#') ||
    path.endsWith('.pdf')
  ) {
    return path;
  }

  const [pathnamePart, hashPart] = path.split('#');
  const cleanPath = pathnamePart.replace(/^\/zh(?=\/|$)/, '') || '/';
  const localized =
    locale === 'zh'
      ? cleanPath === '/'
        ? '/zh'
        : `/zh${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`
      : cleanPath;

  return hashPart ? `${localized}#${hashPart}` : localized;
}

export function getAlternatePath(pathname: string, targetLocale: Locale): string {
  const trimmed = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return localizePath(trimmed || '/', targetLocale);
}

export interface UiStrings {
  skipToContent: string;
  nav: {
    home: string;
    projects: string;
    papers: string;
    thoughts: string;
    about: string;
    menu: string;
    primaryLabel: string;
  };
  header: {
    openQuickIndex: string;
    quickIndexTitle: string;
    switchToDark: string;
    switchToLight: string;
    langToggleText: string;
    langToggleAria: string;
    langToggleTitle: string;
  };
  footer: {
    inkGroupAria: string;
  };
  home: {
    moreAboutMe: string;
    papersHeading: string;
    allPapers: string;
    projectsHeading: string;
    allProjects: string;
    thoughtsHeading: string;
    allThoughts: string;
    epigraphAria: string;
    sealAria: string;
  };
  papers: {
    titleSuffix: string;
    heading: string;
    intro: string;
    description: (name: string) => string;
    expandAll: string;
    collapseAll: string;
    abstract: string;
    bibtex: string;
    copyBibtex: string;
    bibtexCopied: string;
    topicsAria: string;
  };
  projects: {
    titleSuffix: string;
    heading: string;
    intro: string;
    description: (name: string) => string;
    keywordsAria: string;
  };
  thoughts: {
    titleSuffix: string;
    heading: string;
    intro: string;
    description: (name: string, moniker: string) => string;
    filterAria: string;
    filterAll: string;
    filterEmpty: string;
    tagsAria: string;
    tocAria: string;
    tocTitle: string;
    backToThoughts: string;
    copyLink: string;
    linkCopied: string;
    top: string;
    adjacentAria: string;
    previous: string;
    next: string;
    sideNotesAria: string;
  };
  about: {
    titleSuffix: string;
    heading: string;
    description: (name: string, moniker: string) => string;
    introduction: string;
    researchInterests: string;
    experienceAndEducation: string;
    technicalToolkit: string;
    contactAndChannels: string;
    copy: string;
    emailCopied: string;
  };
  cmd: {
    dialogTitle: string;
    placeholder: string;
    filterAria: string;
    closeAria: string;
    pages: string;
    papers: string;
    projects: string;
    thoughts: string;
    actions: string;
    switchLangTitle: string;
    switchLangSub: string;
    switchLangMeta: string;
    toggleThemeTitle: string;
    toggleThemeSub: string;
    toggleThemeMeta: string;
    inkPrefix: string;
    copyEmailTitle: string;
    copyEmailMeta: string;
    petTitle: string;
    petSub: string;
    petMeta: string;
    empty: string;
    hintNavigate: string;
    hintOpen: string;
    hintClose: string;
  };
}

const EN_UI: UiStrings = {
  skipToContent: 'Skip to main content',
  nav: {
    home: 'Home',
    projects: 'Projects',
    papers: 'Papers',
    thoughts: 'Thoughts',
    about: 'About',
    menu: 'Menu',
    primaryLabel: 'Primary',
  },
  header: {
    openQuickIndex: 'Open quick index',
    quickIndexTitle: 'Quick Index (Cmd/Ctrl + K)',
    switchToDark: 'Switch to dark theme',
    switchToLight: 'Switch to light theme',
    langToggleText: '中文',
    langToggleAria: '切换到中文',
    langToggleTitle: '切换到中文',
  },
  footer: {
    inkGroupAria: 'Editorial ink edition',
  },
  home: {
    moreAboutMe: 'More about me',
    papersHeading: 'Papers',
    allPapers: 'All papers',
    projectsHeading: 'Projects',
    allProjects: 'All projects',
    thoughtsHeading: 'Thoughts',
    allThoughts: 'All thoughts',
    epigraphAria: 'Epigraph',
    sealAria: 'Press archival seal',
  },
  papers: {
    titleSuffix: 'Papers',
    heading: 'Papers',
    intro: 'Research manuscripts and working papers on neural-guided symbolic factor search and automated research harnesses.',
    description: (name) => `Working papers and research manuscripts by ${name}.`,
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    abstract: 'Abstract',
    bibtex: 'BibTeX',
    copyBibtex: 'Copy BibTeX',
    bibtexCopied: 'BibTeX copied',
    topicsAria: 'Topics',
  },
  projects: {
    titleSuffix: 'Projects',
    heading: 'Projects',
    intro: 'Empirical research systems, cross-asset event studies, and personal software projects.',
    description: (name) => `Selected quantitative research systems, empirical studies, and open-source work by ${name}.`,
    keywordsAria: 'Keywords',
  },
  thoughts: {
    titleSuffix: 'Thoughts',
    heading: 'Thoughts',
    intro: 'Essays, market reflections, and reading notes.',
    description: (name, moniker) =>
      moniker
        ? `Essays, reading notes, and reflections by ${name} (${moniker}).`
        : `Essays, reading notes, and reflections by ${name}.`,
    filterAria: 'Filter thoughts by topic',
    filterAll: 'All',
    filterEmpty: 'No thoughts match this topic yet.',
    tagsAria: 'Tags',
    tocAria: 'Table of contents',
    tocTitle: 'On this page',
    backToThoughts: 'Back to Thoughts',
    copyLink: 'Copy link',
    linkCopied: 'Essay link copied',
    top: 'Top',
    adjacentAria: 'Adjacent thoughts',
    previous: 'Previous',
    next: 'Next',
    sideNotesAria: 'Side notes',
  },
  about: {
    titleSuffix: 'About',
    heading: 'About',
    description: (name, moniker) =>
      moniker
        ? `Background, research interests, and contact details for ${name} (${moniker}).`
        : `Background, research interests, and contact details for ${name}.`,
    introduction: 'Introduction',
    researchInterests: 'Research Interests',
    experienceAndEducation: 'Experience & Education',
    technicalToolkit: 'Technical Toolkit',
    contactAndChannels: 'Contact & Channels',
    copy: 'Copy',
    emailCopied: 'Email copied',
  },
  cmd: {
    dialogTitle: 'Quick Index and Commands',
    placeholder: 'Search pages, work, or atelier...',
    filterAria: 'Filter index and commands',
    closeAria: 'Close quick index',
    pages: 'Pages',
    papers: 'Papers',
    projects: 'Projects',
    thoughts: 'Thoughts',
    actions: 'Atelier & Actions',
    switchLangTitle: 'Switch to 中文',
    switchLangSub: '浏览中文版页面',
    switchLangMeta: '中文',
    toggleThemeTitle: 'Toggle Paper / Charcoal Theme',
    toggleThemeSub: 'Switch between light rag paper and dark ink-stone',
    toggleThemeMeta: 'Theme',
    inkPrefix: 'Ink Edition: ',
    copyEmailTitle: 'Copy Email Address',
    copyEmailMeta: 'Copy',
    petTitle: 'Greet Pixel Mouse Companion',
    petSub: 'Wake companion with a wave',
    petMeta: 'Companion',
    empty: 'No matching entries in the index.',
    hintNavigate: 'Navigate',
    hintOpen: 'Open',
    hintClose: 'Close',
  },
};

const ZH_UI: UiStrings = {
  skipToContent: '跳至正文',
  nav: {
    home: '首页',
    projects: '项目',
    papers: '论文',
    thoughts: '随笔',
    about: '关于',
    menu: '菜单',
    primaryLabel: '主导航',
  },
  header: {
    openQuickIndex: '打开快速索引',
    quickIndexTitle: '快速索引 (Cmd/Ctrl + K)',
    switchToDark: '切换至深色主题',
    switchToLight: '切换至浅色主题',
    langToggleText: 'EN',
    langToggleAria: 'Switch to English',
    langToggleTitle: 'Switch to English',
  },
  footer: {
    inkGroupAria: '印色主题',
  },
  home: {
    moreAboutMe: '关于我',
    papersHeading: '论文',
    allPapers: '全部论文',
    projectsHeading: '项目',
    allProjects: '全部项目',
    thoughtsHeading: '随笔',
    allThoughts: '全部随笔',
    epigraphAria: '题记',
    sealAria: '加盖印章',
  },
  papers: {
    titleSuffix: '论文',
    heading: '论文',
    intro: '围绕神经引导符号因子搜索与自动化研究框架的工作论文与在审手稿（标题、摘要与 BibTeX 保持英文原文）。',
    description: (name) => `${name} 的工作论文与研究手稿。`,
    expandAll: '全部展开',
    collapseAll: '全部收起',
    abstract: 'Abstract',
    bibtex: 'BibTeX',
    copyBibtex: '复制 BibTeX',
    bibtexCopied: 'BibTeX 已复制',
    topicsAria: '主题标签',
  },
  projects: {
    titleSuffix: '项目',
    heading: '项目',
    intro: '实证研究系统、跨资产事件研究与个人开源软件项目。',
    description: (name) => `${name} 的量化研究系统、实证研究与开源项目。`,
    keywordsAria: '关键词',
  },
  thoughts: {
    titleSuffix: '随笔',
    heading: '随笔',
    intro: '长文随笔、市场观察与读书笔记。',
    description: (name, moniker) =>
      moniker ? `${name}（${moniker}）的随笔、读书笔记与思考。` : `${name} 的随笔、读书笔记与思考。`,
    filterAria: '按主题筛选随笔',
    filterAll: '全部',
    filterEmpty: '该主题下暂无随笔。',
    tagsAria: '标签',
    tocAria: '文章目录',
    tocTitle: '目录',
    backToThoughts: '返回随笔',
    copyLink: '复制链接',
    linkCopied: '文章链接已复制',
    top: '回到顶部',
    adjacentAria: '相邻随笔',
    previous: '上一篇',
    next: '下一篇',
    sideNotesAria: '边注',
  },
  about: {
    titleSuffix: '关于',
    heading: '关于',
    description: (name, moniker) =>
      moniker ? `${name}（${moniker}）的个人背景、研究方向与联系方式。` : `${name} 的个人背景、研究方向与联系方式。`,
    introduction: '简介',
    researchInterests: '研究方向',
    experienceAndEducation: '经历与教育',
    technicalToolkit: '技术栈',
    contactAndChannels: '联系与主页',
    copy: '复制',
    emailCopied: '邮箱已复制',
  },
  cmd: {
    dialogTitle: '快速索引与命令',
    placeholder: '搜索页面、论文、项目或操作...',
    filterAria: '筛选索引与命令',
    closeAria: '关闭快速索引',
    pages: '页面',
    papers: '论文',
    projects: '项目',
    thoughts: '随笔',
    actions: '外观与操作',
    switchLangTitle: 'Switch to English',
    switchLangSub: 'View the English edition of this page',
    switchLangMeta: 'EN',
    toggleThemeTitle: '切换浅色 / 深色主题',
    toggleThemeSub: '在宣纸浅色与砚石深色之间切换',
    toggleThemeMeta: '主题',
    inkPrefix: '印色：',
    copyEmailTitle: '复制联系邮箱',
    copyEmailMeta: '复制',
    petTitle: '向像素小老鼠打招呼',
    petSub: '唤醒陪伴角色挥手致意',
    petMeta: '互动',
    empty: '未找到匹配条目。',
    hintNavigate: '移动',
    hintOpen: '打开',
    hintClose: '关闭',
  },
};

export function getUi(locale: Locale): UiStrings {
  return locale === 'zh' ? ZH_UI : EN_UI;
}

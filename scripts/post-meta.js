'use strict';

const AREA_LABELS = {
  engineering: 'Engineering',
  ai: 'AI & Agents',
  systems: 'Systems & Learning',
  learning: 'Systems & Learning',
  mind: 'Mind & Practice',
  life: 'Life'
};

const AREA_LABELS_ZH = {
  engineering: '工程',
  ai: 'AI 与 Agent',
  systems: '系统与学习',
  learning: '系统与学习',
  mind: '心智与实践',
  life: '生活'
};

const AREA_SLUGS = Object.keys(AREA_LABELS);

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value.toArray === 'function') return value.toArray();
  if (Array.isArray(value.data)) return value.data;
  return [value];
}

function normalizeList(value) {
  return asArray(value)
    .flatMap(function(item) {
      if (typeof item === 'string') return item.split(',');
      if (item && typeof item.name === 'string') return [item.name];
      if (item && typeof item.slug === 'string') return [item.slug];
      return [];
    })
    .map(function(item) {
      return item.trim();
    })
    .filter(Boolean);
}

function tagNames(post) {
  return normalizeList(post && post.tags);
}

function lowerText(post) {
  return [
    post && post.title,
    post && post.slug,
    post && post.path,
    tagNames(post).join(' ')
  ].filter(Boolean).join(' ').toLowerCase();
}

function normalizeArea(area) {
  if (!area) return '';
  var normalized = String(area).trim().toLowerCase().replace(/[^a-z]+/g, '-');
  if (normalized === 'ai-agents') return 'ai';
  if (normalized === 'systems-learning') return 'systems';
  if (normalized === 'mind-practice') return 'mind';
  return AREA_SLUGS.includes(normalized) ? normalized : '';
}

function inferArea(post) {
  var explicit = normalizeArea(post && post.area);
  if (explicit) return explicit;

  var text = lowerText(post);
  if (/\b(ai|chatgpt|copilot|agent|agents|claude|openspec|vibe coding|skill)\b/.test(text)) return 'ai';
  if (/\b(frontend|react|testing|tdd|performance|reliability|browser|redux|tailwind|error-boundary|architecture|software engineering|web performance)\b/.test(text)) return 'engineering';
  if (/\b(sicp|sicpjs|abstraction|learning|mental model|model)\b/.test(text)) return 'systems';
  if (/\b(buddhism|attention|meditation|mind|inner practice|living well|life)\b/.test(text)) return 'mind';
  return 'engineering';
}

function areaLabel(area, lang) {
  var labels = lang === 'zh' ? AREA_LABELS_ZH : AREA_LABELS;
  return labels[normalizeArea(area) || area] || labels[inferArea({ area: area })] || labels.engineering;
}

function cleanText(value, stripHtml) {
  if (!value) return '';
  var text = String(value);
  if (stripHtml) text = stripHtml(text);
  return text
    .replace(/^TL;DR:\s*/i, '')
    .replace(/^\*\*TL;DR\*\*:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text || '';
  var cut = text.slice(0, maxLength - 1);
  var lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > 80) cut = cut.slice(0, lastSpace);
  return cut.replace(/[.,;:!?-]\s*$/, '') + '...';
}

function firstUsefulParagraph(content) {
  return String(content || '')
    .split(/\n{2,}/)
    .map(function(part) {
      return part
        .replace(/^>\s?/, '')
        .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
        .trim();
    })
    .find(function(part) {
      return part && !/^#/.test(part) && !/^\|/.test(part);
    }) || '';
}

function postSummary(post, stripHtml, maxLength) {
  var limit = maxLength || 180;
  var source = post && (post.summary || post.description || post.excerpt || firstUsefulParagraph(post.content || post._content));
  return truncate(cleanText(source, stripHtml), limit);
}

function readingTime(post) {
  var text = cleanText((post && (post.content || post._content)) || '');
  if (!text) return '';
  var words = text.split(/\s+/).filter(Boolean).length;
  var minutes = Math.max(1, Math.ceil(words / 220));
  return minutes + ' min read';
}

function dateValue(post) {
  if (!post || !post.date) return 0;
  if (typeof post.date.valueOf === 'function') return post.date.valueOf();
  return new Date(post.date).getTime() || 0;
}

function sortedPosts(posts, lang) {
  return asArray(posts)
    .filter(function(post) {
      return (post.lang || 'en') === lang;
    })
    .sort(function(a, b) {
      return dateValue(b) - dateValue(a);
    });
}

function postsInArea(posts, lang, area, limit) {
  var normalized = normalizeArea(area);
  var results = sortedPosts(posts, lang).filter(function(post) {
    return inferArea(post) === normalized;
  });
  return limit ? results.slice(0, limit) : results;
}

function includesAudience(post, name) {
  return normalizeList(post && post.audience).map(function(item) {
    return item.toLowerCase();
  }).includes(String(name).toLowerCase());
}

function isFeatured(post) {
  return post && (post.featured === true || String(post.featured).toLowerCase() === 'true');
}

const INTERVIEWER_TITLE_PRIORITY = [
  'Workspace v2 Tab System: Building Browser Tabs Inside Workspace',
  'Workspace v2 Tab System Performance: First Load, Hot Switch, And Background Pressure',
  'Automated AI Performance Optimization with Harness and Goal-Driven Loops',
  'React Runtime Performance Optimization',
  'Building Fault Tolerant React App With Error Boundary(Error Boundary Best Practice)',
  'React Server Component Internals(Source Code Review)',
  'How to Design GOOD Test Cases',
  'Web Performance Optimization Strategies and Practices'
];

const INTERVIEWER_KEY_PRIORITY = [
  'Workspace-v2-Tab-System-Browser-Grade-Tabs',
  'Workspace-v2-Tab-System-Performance-First-Load-Hot-Switch-Background-Pressure',
  'Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops',
  'React-Performance-Optimization',
  'Building-Fault-Tolerant-React-App-With-Error-Boundary',
  'React-Server-Component-Internals',
  'How-to-Design-GOOD-Test-Cases',
  'Web-Performance-Optimization'
];

function interviewerScore(post) {
  if (!post) return 0;
  var keyIndex = INTERVIEWER_KEY_PRIORITY.indexOf(post.i18n_key || post.slug);
  if (keyIndex >= 0) return 1100 - keyIndex;
  var titleIndex = INTERVIEWER_TITLE_PRIORITY.indexOf(post.title);
  if (titleIndex >= 0) return 1000 - titleIndex;
  var text = lowerText(post);
  var score = includesAudience(post, 'interviewers') ? 800 : 0;
  if (isFeatured(post)) score += 100;
  if (/\b(frontend|react|testing|performance|reliability|architecture|software engineering|web performance)\b/.test(text)) score += 60;
  if (/\b(ai|agent|agents|copilot|chatgpt)\b/.test(text)) score += 20;
  return score;
}

function interviewerPosts(posts, lang, limit) {
  return sortedPosts(posts, lang)
    .map(function(post) {
      return { post: post, score: interviewerScore(post) };
    })
    .filter(function(item) {
      return item.score > 0;
    })
    .sort(function(a, b) {
      return b.score - a.score || dateValue(b.post) - dateValue(a.post);
    })
    .slice(0, limit || 6)
    .map(function(item) {
      return item.post;
    });
}

const PROJECT_TITLE_MATCHES = [
  'Automated AI Performance Optimization with Harness and Goal-Driven Loops',
  'Agent Skills: The Functional Blueprint for AI Agents',
  'Build a Toy Browser with NodeJS',
  'Build a Redux from Scratch(Redux Source Code Review)',
  'Workspace v2 Tab System: Building Browser Tabs Inside Workspace'
];

const PROJECT_KEY_MATCHES = [
  'Automated-AI-Performance-Optimization-with-Harness-and-Goal-Driven-Loops',
  'Agent-Skills-The-Functional-Blueprint-for-AI-Agents',
  'Build-a-Toy-Browser-with-NodeJS',
  'build-a-redux-from-scratch',
  'Workspace-v2-Tab-System-Browser-Grade-Tabs'
];

function projectPosts(posts, lang) {
  var all = sortedPosts(posts, lang);
  var byKey = PROJECT_KEY_MATCHES
    .map(function(key) {
      return all.find(function(post) {
        return post.i18n_key === key || post.slug === key;
      });
    })
    .filter(Boolean);
  if (byKey.length) return byKey;
  return PROJECT_TITLE_MATCHES
    .map(function(title) {
      return all.find(function(post) {
        return post.title === title;
      });
    })
    .filter(Boolean);
}

module.exports = {
  AREA_LABELS,
  AREA_LABELS_ZH,
  asArray,
  areaLabel,
  inferArea,
  interviewerPosts,
  isFeatured,
  normalizeArea,
  normalizeList,
  postSummary,
  postsInArea,
  projectPosts,
  readingTime,
  sortedPosts,
  tagNames
};

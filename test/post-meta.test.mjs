import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  inferArea,
  interviewerPosts,
  postSummary,
  postsInArea,
  projectPosts,
  readingTime,
  tagNames,
} = require('../scripts/post-meta.js');

test('infers high-level writing areas from explicit metadata and tags', () => {
  assert.equal(inferArea({ area: 'ai', tags: ['Frontend'] }), 'ai');
  assert.equal(inferArea({ title: 'React Runtime Performance Optimization', tags: ['React'] }), 'engineering');
  assert.equal(inferArea({ title: 'Testing Best Practice Tdd', tags: ['testing', 'tdd'] }), 'engineering');
  assert.equal(inferArea({ title: 'Agent Skills', tags: ['AI', 'Agent'] }), 'ai');
  assert.equal(inferArea({ title: 'SICPJS 1', tags: 'sicpjs' }), 'systems');
});

test('extracts clean summaries without depending on UI templates', () => {
  const post = {
    content: '> **TL;DR**: This is the practical summary.\n\n## Body\n\nMore text.',
  };

  assert.equal(postSummary(post, (html) => html.replace(/\*\*/g, '')), 'This is the practical summary.');
});

test('sorts and filters posts for writing sections and interviewer pages', () => {
  const posts = [
    {
      title: 'Agent Skills: The Functional Blueprint for AI Agents',
      date: new Date('2026-03-23T00:00:00Z'),
      tags: ['AI', 'Software Engineering'],
      lang: 'en',
    },
    {
      title: 'React Runtime Performance Optimization',
      date: new Date('2024-04-16T00:00:00Z'),
      tags: ['React', 'Frontend'],
      lang: 'en',
    },
    {
      title: '中文文章',
      date: new Date('2026-03-23T00:00:00Z'),
      tags: ['AI'],
      lang: 'zh',
    },
  ];

  assert.deepEqual(postsInArea(posts, 'en', 'ai').map((post) => post.title), [
    'Agent Skills: The Functional Blueprint for AI Agents',
  ]);
  assert.deepEqual(interviewerPosts(posts, 'en', 1).map((post) => post.title), [
    'React Runtime Performance Optimization',
  ]);
  assert.equal(tagNames({ tags: { data: [{ name: 'AI' }, { name: 'React' }] } }).join(','), 'AI,React');
});

test('selects real project notes from existing post titles', () => {
  const posts = [
    {
      title: 'Build a Toy Browser with NodeJS',
      date: new Date('2022-04-27T00:00:00Z'),
      tags: ['browser'],
      lang: 'en',
    },
    {
      title: 'Unrelated',
      date: new Date('2022-04-28T00:00:00Z'),
      tags: ['life'],
      lang: 'en',
    },
  ];

  assert.equal(projectPosts(posts, 'en')[0].title, 'Build a Toy Browser with NodeJS');
  assert.equal(readingTime({ content: 'word '.repeat(230) }), '2 min read');
});

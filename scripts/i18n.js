'use strict';

const pagination = require('hexo-pagination');

const DEFAULT_LANG = 'en';

// --------------- Filters ---------------

hexo.extend.filter.register('before_post_render', function(data) {
  if (!data.lang) data.lang = DEFAULT_LANG;
  if (!data.i18n_key && data.slug) data.i18n_key = data.slug.replace(/-zh$/, '');
  return data;
});

// --------------- Helpers ---------------

hexo.extend.helper.register('page_lang', function() {
  if (this.page.lang) return this.page.lang;
  var path = this.page.path || '';
  return path.startsWith('zh/') ? 'zh' : DEFAULT_LANG;
});

hexo.extend.helper.register('is_zh', function() {
  return this.page_lang() === 'zh';
});

hexo.extend.helper.register('alternate_url', function() {
  var page = this.page;
  var isZh = this.page_lang() === 'zh';

  if (this.is_post()) {
    var targetLang = isZh ? DEFAULT_LANG : 'zh';
    var all = this.site.posts.toArray();
    var alt = all.find(function(p) {
      return p.i18n_key === page.i18n_key && p.lang === targetLang;
    });
    if (alt) return this.url_for(alt.path);
  }

  var pagePath = page.path || '';
  if (isZh) {
    var enPath = pagePath.replace(/^zh\//, '');
    return this.url_for(enPath || '/');
  }
  return this.url_for('zh/' + pagePath);
});

hexo.extend.helper.register('lang_url', function(path) {
  var clean = path.replace(/^\//, '');
  if (this.page_lang() === 'zh') return this.url_for('zh/' + clean);
  return this.url_for(clean);
});

hexo.extend.helper.register('lang_root', function() {
  return this.page_lang() === 'zh' ? this.url_for('zh/') : this.url_for('/');
});

// --------------- Generators ---------------

function filterByLang(posts, lang) {
  return posts.filter(function(p) {
    return (p.lang || DEFAULT_LANG) === lang;
  });
}

// English index (overrides hexo-generator-index)
hexo.extend.generator.register('index', function(locals) {
  var config = this.config;
  var posts = filterByLang(locals.posts, 'en')
    .sort(config.index_generator.order_by || '-date');
  var paginationDir = config.pagination_dir || 'page';

  return pagination('', posts, {
    perPage: config.index_generator.per_page || config.per_page,
    layout: ['index', 'archive'],
    format: paginationDir + '/%d/',
    data: { __index: true, lang: 'en' }
  });
});

// Chinese index
hexo.extend.generator.register('zh_index', function(locals) {
  var config = this.config;
  var posts = filterByLang(locals.posts, 'zh')
    .sort(config.index_generator.order_by || '-date');
  var paginationDir = config.pagination_dir || 'page';

  return pagination('zh/', posts, {
    perPage: config.index_generator.per_page || config.per_page,
    layout: ['index', 'archive'],
    format: paginationDir + '/%d/',
    data: { __index: true, lang: 'zh' }
  });
});

// English archive (overrides hexo-generator-archive)
hexo.extend.generator.register('archive', function(locals) {
  var config = this.config;
  var posts = filterByLang(locals.posts, 'en').sort('-date');
  var paginationDir = config.pagination_dir || 'page';

  return pagination('archives/', posts, {
    perPage: config.per_page,
    layout: ['archive'],
    format: paginationDir + '/%d/',
    data: { archive: true, lang: 'en' }
  });
});

// Chinese archive
hexo.extend.generator.register('zh_archive', function(locals) {
  var config = this.config;
  var posts = filterByLang(locals.posts, 'zh').sort('-date');
  var paginationDir = config.pagination_dir || 'page';

  return pagination('zh/archives/', posts, {
    perPage: config.per_page,
    layout: ['archive'],
    format: paginationDir + '/%d/',
    data: { archive: true, lang: 'zh' }
  });
});

// Tag generator for both languages (overrides hexo-generator-tag)
hexo.extend.generator.register('tag', function(locals) {
  var config = this.config;
  var tagDir = config.tag_dir || 'tags';
  var paginationDir = config.pagination_dir || 'page';
  var results = [];

  locals.tags.forEach(function(tag) {
    if (!tag.length) return;

    var enPosts = filterByLang(tag.posts, 'en');
    if (enPosts.length) {
      var enPath = tagDir + '/' + tag.slug + '/';
      results = results.concat(pagination(enPath, enPosts.sort('-date'), {
        perPage: config.per_page,
        layout: ['tag', 'archive'],
        format: paginationDir + '/%d/',
        data: { tag: tag.name, lang: 'en' }
      }));
    }

    var zhPosts = filterByLang(tag.posts, 'zh');
    if (zhPosts.length) {
      var zhPath = 'zh/' + tagDir + '/' + tag.slug + '/';
      results = results.concat(pagination(zhPath, zhPosts.sort('-date'), {
        perPage: config.per_page,
        layout: ['tag', 'archive'],
        format: paginationDir + '/%d/',
        data: { tag: tag.name, lang: 'zh' }
      }));
    }
  });

  return results;
});

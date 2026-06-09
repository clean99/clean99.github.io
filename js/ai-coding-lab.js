(function() {
  var root = document.querySelector('.ai-lab');
  if (!root) return;

  var state = {
    catalog: null,
    query: '',
    filter: 'all'
  };

  var lang = root.getAttribute('data-lang') === 'zh' ? 'zh' : 'en';
  var copy = lang === 'zh' ? {
    loading: '加载中',
    ready: '已同步',
    missing: '源仓库不可用',
    failed: '加载失败',
    files: '配置文件',
    skills: 'Skills',
    redacted: '已脱敏',
    indexed: '已索引',
    noResults: '没有匹配的公开条目。',
    redactedBadge: '已脱敏',
    publicBadge: '公开摘要',
    bytes: '字节',
    policy: '脱敏策略',
    source: '来源'
  } : {
    loading: 'Loading',
    ready: 'Synced',
    missing: 'Source unavailable',
    failed: 'Load failed',
    files: 'Config files',
    skills: 'Skills',
    redacted: 'Redacted',
    indexed: 'Indexed',
    noResults: 'No public entries match this filter.',
    redactedBadge: 'Redacted',
    publicBadge: 'Public summary',
    bytes: 'bytes',
    policy: 'Redaction policy',
    source: 'Source'
  };

  var statusEl = document.getElementById('aiCatalogStatus');
  var generatedEl = document.getElementById('aiCatalogGenerated');
  var commitEl = document.getElementById('aiCatalogCommit');
  var statsEl = document.getElementById('aiCatalogStats');
  var itemsEl = document.getElementById('aiCatalogItems');
  var searchEl = document.getElementById('aiCatalogSearch');
  var filterButtons = Array.prototype.slice.call(root.querySelectorAll('[data-filter]'));

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function formatDate(value) {
    var date = new Date(value);
    if (Number.isNaN(date.valueOf())) return '-';
    return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function formatSize(value) {
    var number = Number(value) || 0;
    if (number > 1024 * 1024) return (number / 1024 / 1024).toFixed(1) + ' MB';
    if (number > 1024) return (number / 1024).toFixed(1) + ' KB';
    return number + ' ' + copy.bytes;
  }

  function matchesFilter(item) {
    if (state.filter === 'all') return true;
    if (state.filter === 'redacted') return item.redacted;
    return item.kind === state.filter;
  }

  function matchesQuery(item) {
    if (!state.query) return true;
    var haystack = [
      item.name,
      item.description,
      item.category,
      item.source,
      item.path
    ].join(' ').toLowerCase();
    return haystack.indexOf(state.query) >= 0;
  }

  function filteredItems() {
    if (!state.catalog) return [];
    return state.catalog.items.filter(function(item) {
      return matchesFilter(item) && matchesQuery(item);
    });
  }

  function statCard(label, value) {
    var article = document.createElement('article');
    article.className = 'ai-lab__stat';
    var strong = document.createElement('strong');
    strong.textContent = value;
    var span = document.createElement('span');
    span.textContent = label;
    article.append(strong, span);
    return article;
  }

  function renderStats() {
    if (!state.catalog) return;
    statsEl.replaceChildren(
      statCard(copy.skills, state.catalog.stats.skills),
      statCard(copy.files, state.catalog.stats.files),
      statCard(copy.redacted, state.catalog.stats.redacted),
      statCard(copy.indexed, formatSize(state.catalog.stats.bytesIndexed))
    );
  }

  function renderPolicy(catalog) {
    var policy = document.createElement('div');
    policy.className = 'ai-lab__policy';
    var title = document.createElement('strong');
    title.textContent = copy.policy;
    var list = document.createElement('ul');
    catalog.redaction.policy.forEach(function(rule) {
      var item = document.createElement('li');
      item.textContent = rule;
      list.appendChild(item);
    });
    policy.append(title, list);
    return policy;
  }

  function renderItem(item) {
    var article = document.createElement('article');
    article.className = 'ai-lab__item';

    var top = document.createElement('div');
    top.className = 'ai-lab__item-top';

    var titleWrap = document.createElement('div');
    var kind = document.createElement('span');
    kind.className = 'ai-lab__kind';
    kind.textContent = item.kind === 'skill' ? copy.skills : copy.files;
    var heading = document.createElement('h2');
    heading.textContent = item.name;
    titleWrap.append(kind, heading);

    var badge = document.createElement('span');
    badge.className = item.redacted ? 'ai-lab__badge ai-lab__badge--redacted' : 'ai-lab__badge';
    badge.textContent = item.redacted ? copy.redactedBadge : copy.publicBadge;

    top.append(titleWrap, badge);

    var description = document.createElement('p');
    description.textContent = item.description;

    var meta = document.createElement('dl');
    meta.className = 'ai-lab__item-meta';
    [
      ['Category', item.category],
      [copy.source, item.source],
      ['Path', item.path],
      ['Size', formatSize(item.size)]
    ].forEach(function(pair) {
      var group = document.createElement('div');
      var dt = document.createElement('dt');
      dt.textContent = pair[0];
      var dd = document.createElement('dd');
      dd.textContent = pair[1];
      group.append(dt, dd);
      meta.appendChild(group);
    });

    article.append(top, description, meta);
    return article;
  }

  function renderItems() {
    var items = filteredItems();
    if (!items.length) {
      var empty = document.createElement('p');
      empty.className = 'ai-lab__empty';
      empty.textContent = copy.noResults;
      itemsEl.replaceChildren(empty);
      return;
    }
    itemsEl.replaceChildren.apply(itemsEl, items.map(renderItem));
  }

  function renderCatalog(catalog) {
    state.catalog = catalog;
    setText(statusEl, catalog.status === 'ready' ? copy.ready : copy.missing);
    setText(generatedEl, formatDate(catalog.generatedAt));
    setText(commitEl, catalog.source.commit ? catalog.source.commit.slice(0, 12) : '-');
    renderStats();
    renderItems();
    statsEl.after(renderPolicy(catalog));
  }

  function loadCatalog() {
    setText(statusEl, copy.loading);
    var url = root.getAttribute('data-catalog-url');
    fetch(url, { cache: 'no-store' })
      .then(function(response) {
        if (!response.ok) throw new Error('catalog request failed');
        return response.json();
      })
      .then(renderCatalog)
      .catch(function(error) {
        console.error('AI skills catalog failed', error);
        setText(statusEl, copy.failed);
        var empty = document.createElement('p');
        empty.className = 'ai-lab__empty';
        empty.textContent = copy.noResults;
        itemsEl.replaceChildren(empty);
      });
  }

  if (searchEl) {
    searchEl.addEventListener('input', function(event) {
      state.query = event.target.value.trim().toLowerCase();
      renderItems();
    });
  }

  filterButtons.forEach(function(button) {
    button.addEventListener('click', function() {
      state.filter = button.getAttribute('data-filter') || 'all';
      filterButtons.forEach(function(item) {
        item.classList.toggle('is-active', item === button);
      });
      renderItems();
    });
  });

  loadCatalog();
})();

const API_BASE = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

const modeBtns = document.querySelectorAll('.mode-btn');
const singleSearchRow = document.getElementById('singleSearchRow');
const compareSearchRow = document.getElementById('compareSearchRow');
const result = document.getElementById('result');

const searchBox = document.getElementById('searchBox');
const searchBtn = document.getElementById('searchBtn');

const searchBoxA = document.getElementById('searchBoxA');
const searchBoxB = document.getElementById('searchBoxB');
const compareBtn = document.getElementById('compareBtn');

const historyWrap = document.getElementById('historyWrap');
const historyList = document.getElementById('historyList');

let history = [];

function setState(state) {
    result.className = 'state-' + state;
}

function resetResult() {
    setState('idle');
    result.innerHTML = '<p class="placeholder-msg">The archive is waiting. Type any topic — a place, a person, an event — and search.</p>';
}

function addToHistory(title) {
    history = history.filter(item => item !== title);
    history.unshift(title);
    if (history.length > 5) history = history.slice(0, 5);
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyWrap.hidden = true;
        return;
    }
    historyWrap.hidden = false;
    historyList.innerHTML = history
        .map(title => `<button type="button" class="history-chip" data-title="${title}">${title}</button>`)
        .join('');
}

historyList.addEventListener('click', (e) => {
    const chip = e.target.closest('.history-chip');
    if (!chip) return;
    const title = chip.dataset.title;

    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === 'single'));
    singleSearchRow.hidden = false;
    compareSearchRow.hidden = true;

    searchBox.value = title;
    runSearch();
});

modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const mode = btn.dataset.mode;
        singleSearchRow.hidden = mode !== 'single';
        compareSearchRow.hidden = mode !== 'compare';
        resetResult();
    });
});

function fetchTopic(topic) {
    const url = API_BASE + encodeURIComponent(topic);
    return fetch(url).then(response => {
        if (!response.ok) throw new Error('Not found');
        return response.json();
    });
}

function buildPageCard(data, compact) {
    const thumbHTML = data.thumbnail
        ? `<img class="page-thumb" src="${data.thumbnail.source}" alt="${data.title}">`
        : '';

    const descHTML = (!compact && data.description)
        ? `<p class="page-desc">${data.description}</p>`
        : '';

    const pageUrl = data.content_urls && data.content_urls.desktop && data.content_urls.desktop.page;
    const linkHTML = (!compact && pageUrl)
        ? `<a class="page-link" href="${pageUrl}" target="_blank" rel="noopener">Read full article \u2192</a>`
        : '';

    return `
        <div class="page-card${compact ? ' compact' : ''}">
            <h2 class="page-title">${data.title}</h2>
            ${descHTML}
            ${thumbHTML}
            <p class="page-extract">${data.extract}</p>
            ${linkHTML}
        </div>`;
}

function runSearch() {
    const topic = searchBox.value.trim();
    if (!topic) return;

    setState('loading');
    result.innerHTML = '<p class="placeholder-msg">Pulling the entry from the archive\u2026</p>';

    fetchTopic(topic)
        .then(data => {
            setState('found');
            result.innerHTML = buildPageCard(data, false);
            addToHistory(data.title);
        })
        .catch(() => {
            setState('error');
            result.innerHTML = `<p class="not-found-msg">No entry in the archive for "${topic}". Check the spelling and try again.</p>`;
        });
}

function runCompare() {
    const topicA = searchBoxA.value.trim();
    const topicB = searchBoxB.value.trim();
    if (!topicA || !topicB) return;

    setState('loading');
    result.innerHTML = '<p class="placeholder-msg">Pulling both entries from the archive\u2026</p>';

    Promise.all([fetchTopic(topicA), fetchTopic(topicB)])
        .then(([dataA, dataB]) => {
            setState('found');
            result.innerHTML = `
                <div class="compare-grid">
                    ${buildPageCard(dataA, true)}
                    <div class="compare-divider"><span class="vs-tag">VS</span></div>
                    ${buildPageCard(dataB, true)}
                </div>`;
            addToHistory(dataA.title);
            addToHistory(dataB.title);
        })
        .catch(() => {
            setState('error');
            result.innerHTML = '<p class="not-found-msg">One or both topics weren\u2019t found. Check spelling and compare again.</p>';
        });
}

searchBtn.addEventListener('click', runSearch);
searchBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearch();
});

compareBtn.addEventListener('click', runCompare);
[searchBoxA, searchBoxB].forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') runCompare();
    });
});
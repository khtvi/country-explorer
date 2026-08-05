// Elements
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

// Session-only search history (last 5, most recent first, no duplicates)
let history = [];

function resetResult() {
    result.innerHTML = '<p class="placeholder-msg">No entry logged yet. Type a country and search to begin.</p>';
}

function addToHistory(entry) {
    history = history.filter(item => item.name !== entry.name);
    history.unshift(entry);
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
        .map(item => `
            <button type="button" class="history-chip" data-name="${item.name}">
                <img src="${item.flag}" alt="">${item.name}
            </button>`)
        .join('');
}

historyList.addEventListener('click', (e) => {
    const chip = e.target.closest('.history-chip');
    if (!chip) return;
    const name = chip.dataset.name;

    // Re-run this search in single mode
    modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === 'single'));
    singleSearchRow.hidden = false;
    compareSearchRow.hidden = true;

    searchBox.value = name;
    runSearch();
});

// Mode switching
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

// Fetch helper — returns the first match from the REST Countries name search
function fetchCountry(name) {
    const url = 'https://restcountries.com/v3.1/name/' + encodeURIComponent(name);
    return fetch(url).then(response => {
        if (!response.ok) throw new Error('Not found');
        return response.json();
    }).then(data => data[0]);
}

function formatLanguages(data) {
    if (!data.languages) return '\u2014';
    return Object.values(data.languages).join(', ');
}

function formatCurrencies(data) {
    if (!data.currencies) return '\u2014';
    return Object.values(data.currencies)
        .map(c => c.symbol ? `${c.name} (${c.symbol})` : c.name)
        .join(', ');
}

// Build a country card. compact=true is used for the side-by-side compare view.
function buildCountryCard(data, compact) {
    const name = data.name.common;
    const capital = data.capital && data.capital[0] ? data.capital[0] : '\u2014';
    const region = data.region || '\u2014';
    const population = data.population != null ? data.population.toLocaleString() : '\u2014';
    const code = (data.cca2 || data.cca3 || '??').toUpperCase();
    const flagUrl = (data.flags && (data.flags.png || data.flags.svg)) || '';

    if (compact) {
        return `
            <div class="country-card">
                <div class="flag-frame compact">
                    <img src="${flagUrl}" alt="Flag of ${name}">
                </div>
                <h3 class="country-name compact">${name}</h3>
                <div class="manifest compact">
                    <div class="manifest-row"><span class="m-label">Capital</span><span class="m-value">${capital}</span></div>
                    <div class="manifest-row"><span class="m-label">Pop.</span><span class="m-value">${population}</span></div>
                </div>
            </div>`;
    }

    return `
        <div class="country-card">
            <div class="flag-frame">
                <img src="${flagUrl}" alt="Flag of ${name}">
                <div class="stamp show">
                    <span class="line1">Verified</span>
                    <span class="code">${code}</span>
                </div>
            </div>
            <h2 class="country-name">${name}</h2>
            <div class="manifest">
                <div class="manifest-row"><span class="m-label">Capital</span><span class="m-value">${capital}</span></div>
                <div class="manifest-row"><span class="m-label">Region</span><span class="m-value">${region}</span></div>
                <div class="manifest-row"><span class="m-label">Population</span><span class="m-value">${population}</span></div>
                <div class="manifest-row"><span class="m-label">Languages</span><span class="m-value">${formatLanguages(data)}</span></div>
                <div class="manifest-row"><span class="m-label">Currency</span><span class="m-value">${formatCurrencies(data)}</span></div>
            </div>
        </div>`;
}

function notFoundHTML(message) {
    return `
        <div class="stamp error-stamp show">
            <span class="line1">Not</span>
            <span class="code">Found</span>
        </div>
        <p class="not-found-msg">${message}</p>`;
}

// Single search
function runSearch() {
    const name = searchBox.value.trim();
    if (!name) return;

    result.innerHTML = '<p class="placeholder-msg">Checking the records\u2026</p>';

    fetchCountry(name)
        .then(data => {
            result.innerHTML = buildCountryCard(data, false);
            addToHistory({ name: data.name.common, flag: (data.flags && (data.flags.png || data.flags.svg)) || '' });
        })
        .catch(() => {
            result.innerHTML = notFoundHTML('No match found. Check the spelling and try again.');
        });
}

// Compare search
function runCompare() {
    const nameA = searchBoxA.value.trim();
    const nameB = searchBoxB.value.trim();
    if (!nameA || !nameB) return;

    result.innerHTML = '<p class="placeholder-msg">Checking both records\u2026</p>';

    Promise.all([fetchCountry(nameA), fetchCountry(nameB)])
        .then(([dataA, dataB]) => {
            result.innerHTML = `
                <div class="compare-grid">
                    ${buildCountryCard(dataA, true)}
                    <div class="compare-divider"><span class="vs-tag">VS</span></div>
                    ${buildCountryCard(dataB, true)}
                </div>`;
            addToHistory({ name: dataA.name.common, flag: (dataA.flags && (dataA.flags.png || dataA.flags.svg)) || '' });
            addToHistory({ name: dataB.name.common, flag: (dataB.flags && (dataB.flags.png || dataB.flags.svg)) || '' });
        })
        .catch(() => {
            result.innerHTML = notFoundHTML('One or both countries didn\u2019t match. Check spelling and compare again.');
        });
}

// Wire up events
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
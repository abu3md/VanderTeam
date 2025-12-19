const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// --- Router ---
const navigateTo = url => { history.pushState(null, null, url); router(); };
const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="spinner"></div>';

    const { data } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    mangas = data || [];

    if (path === "/" || path === "/index.html") renderHome(app);
    else if (path === "/admin") renderAdmin(app);
    else if (path.startsWith("/manga/")) {
        const parts = path.split("/");
        const mTitle = decodeURIComponent(parts[2]);
        const cTitle = parts[3] ? decodeURIComponent(parts[3]) : null;
        cTitle ? renderReader(app, mTitle, cTitle) : renderDetails(app, mTitle);
    }
};

window.onpopstate = router;
document.addEventListener("click", e => {
    if (e.target.closest("[data-link]")) { e.preventDefault(); navigateTo(e.target.closest("[data-link]").href); }
});

// --- Pages ---
function renderHome(container) {
    container.innerHTML = `<div class="grid-container">
        ${mangas.map(m => `
            <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link>
                <div class="card-img-box"><img src="${m.cover}" onerror="this.src='/mainL.png'"></div>
                <div class="card-text">
                    <span class="card-title">${m.title}</span><br>
                    <span class="card-genres">${m.genres || 'تصنيف'}</span>
                </div>
            </a>
        `).join('')}
    </div>`;
}

function renderDetails(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return container.innerHTML = "<h1>غير موجود</h1>";
    container.innerHTML = `
        <div class="manga-detail-container">
            <div class="chapters-column">
                <h3>الفصول</h3>
                ${(m.chapters || []).map(ch => `
                    <div class="chapter-item" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">
                        <span>${ch.title}</span> <span>←</span>
                    </div>
                `).join('')}
            </div>
            <div class="main-info-box">
                <h1>${m.title}</h1>
                <div class="meta-item"><strong>الكاتب:</strong> ${m.author || '-'}</div>
                <div class="meta-item"><strong>الرسام:</strong> ${m.artist || '-'}</div>
                <div class="meta-item"><strong>الحالة:</strong> ${m.publisher || 'مستمر'}</div>
                <p style="margin-top:20px; line-height:1.7;">${m.desc || 'لا يوجد وصف.'}</p>
            </div>
            <div class="side-cover-box">
                <img src="${m.cover}">
                <div class="interaction-icons">❤️ 💬 🔖</div>
            </div>
        </div>`;
}

function renderReader(container, mTitle, cTitle) {
    const m = mangas.find(x => x.title === mTitle);
    const ch = m?.chapters.find(c => c.title === cTitle);
    container.innerHTML = `<button class="action-btn" style="width:auto;" onclick="history.back()">إغلاق</button>
    <iframe src="${ch.url}" style="width:100%; height:90vh; border:none; margin-top:10px; border-radius:15px;"></iframe>`;
}

// --- Admin Section ---
function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `<div style="max-width:400px; margin:auto;"><input type="password" id="p" placeholder="كلمة المرور"><button class="action-btn" onclick="login()">دخول</button></div>`;
        return;
    }
    container.innerHTML = `
        <div class="admin-tabs">
            <button id="t1" class="active-tab" onclick="switchAdmin('add')">إضافة جديدة</button>
            <button id="t2" onclick="switchAdmin('edit')">تعديل وإدارة</button>
        </div>
        <div id="admin-body"></div>`;
    switchAdmin('add');
}

function switchAdmin(mode) {
    const body = document.getElementById('admin-body');
    if (mode === 'add') {
        body.innerHTML = `
            <div class="manga-detail-container">
                <div class="chapters-column"><h3>الفصول</h3><p>ارفع المانجا أولاً</p></div>
                <div class="main-info-box">
                    <input id="in-t" placeholder="العنوان">
                    <input id="in-a" placeholder="الكاتب">
                    <input id="in-g" placeholder="التصنيفات">
                    <textarea id="in-d" placeholder="الوصف" style="height:200px;"></textarea>
                    <button class="action-btn" onclick="sendAdd()">نشر الآن</button>
                </div>
                <div class="side-cover-box">
                    <div style="height:300px; background:#ddd; border-radius:20px; display:flex; align-items:center; justify-content:center;">معاينة الغلاف</div>
                    <input type="file" id="in-c" style="margin-top:10px;">
                </div>
            </div>`;
    } else {
        body.innerHTML = `<select onchange="loadEdit(this.value)"><option>اختر المانجا</option>${mangas.map(m=>`<option>${m.title}</option>`).join('')}</select><div id="edit-zone"></div>`;
    }
}

async function sendAdd() {
    toggleL(true);
    const file = document.getElementById('in-c').files[0];
    const path = `covers/${Date.now()}.png`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);
    
    await _supabase.from('mangas').insert([{
        title: document.getElementById('in-t').value,
        cover: data.publicUrl,
        author: document.getElementById('in-a').value,
        genres: document.getElementById('in-g').value,
        desc: document.getElementById('in-d').value,
        chapters: [], lastUpdated: new Date()
    }]);
    router();
}

function loadEdit(title) {
    const m = mangas.find(x => x.title === title);
    document.getElementById('edit-zone').innerHTML = `
        <div class="manga-detail-container">
            <div class="chapters-column">
                <input id="ch-t" placeholder="اسم الفصل">
                <input type="file" id="ch-f">
                <button class="action-btn" onclick="addCh('${m.title}')">رفع فصل</button>
                <hr>
                ${m.chapters.map(c=>`<div class="chapter-item">${c.title} <span onclick="delCh('${m.title}','${c.title}')">🗑️</span></div>`).join('')}
            </div>
            <div class="main-info-box">
                <input id="ed-t" value="${m.title}">
                <textarea id="ed-d" style="height:200px;">${m.desc || ''}</textarea>
                <button class="action-btn" onclick="saveEd('${m.title}')">تحديث</button>
            </div>
            <div class="side-cover-box"><img src="${m.cover}"></div>
        </div>`;
}

async function addCh(title) {
    toggleL(true);
    const m = mangas.find(x => x.title === title);
    const file = document.getElementById('ch-f').files[0];
    const path = `chapters/${Date.now()}.pdf`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);
    const chapters = [...m.chapters, { title: document.getElementById('ch-t').value, url: data.publicUrl }];
    await _supabase.from('mangas').update({ chapters, lastUpdated: new Date() }).eq('title', title);
    router();
}

function login() { if(document.getElementById('p').value === "Samer#1212") { sessionStorage.setItem('isAdmin','t'); router(); } }
function toggleL(s) { document.getElementById('loading-overlay').classList.toggle('hidden', !s); }

window.onload = router;
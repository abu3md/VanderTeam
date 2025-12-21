const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

const navigateTo = url => { history.pushState(null, null, url); router(); };

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    const { data } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    mangas = data || [];

    if (path === "/" || path === "/index.html") {
        app.innerHTML = renderHome();
    } else if (path === "/admin") {
        renderAdmin(app);
    } else if (path.startsWith("/manga/")) {
        const parts = path.split("/");
        const mTitle = decodeURIComponent(parts[2]);
        const cTitle = parts[3] ? decodeURIComponent(parts[3]) : null;
        cTitle ? renderReader(app, mTitle, cTitle) : renderDetails(app, mTitle);
    }
};

// --- وظائف العرض الرئيسية ---
function renderHome() {
    return `<div class="grid-container">${mangas.map(m => `
        <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link style="text-decoration:none;">
            <div class="gray-box"></div>
            <div class="placeholder-lines"><div class="line"></div><div class="line"></div><div class="line short"></div></div>
        </a>`).join('')}</div>`;
}

function renderDetails(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return;
    container.innerHTML = `
    <div class="manga-detail-layout">
        <div class="island cover-island">
            <img src="${m.cover}">
            <div style="margin-top:15px; display:flex; justify-content:center; gap:15px;">
                <img src="/hart.png" style="width:25px; cursor:pointer;">
                <img src="/comment.png" style="width:25px; cursor:pointer;">
                <img src="/save.png" style="width:25px; cursor:pointer;">
            </div>
        </div>
        <div class="island info-island">
            <h1>${m.title}</h1>
            <div class="data-row"><span>الحالة:</span><span>${m.status || 'مستمر'}</span></div>
            <div class="data-row"><span>الرسام:</span><span>${m.artist || '-'}</span></div>
            <div class="data-row"><span>المؤلف:</span><span>${m.author || '-'}</span></div>
            <div class="data-row"><span>التصنيفات:</span><span>${m.genres || '-'}</span></div>
            <p style="margin-top:20px; line-height:1.8; color:#555;">${m.desc || 'لا يوجد وصف متاح حالياً لهذه المانجا.'}</p>
        </div>
        <div class="island chapters-island">
            <h3>الفصول</h3>
            <div style="margin-top:15px; max-height:500px; overflow-y:auto;">
                ${(m.chapters || []).map(ch => `
                    <div class="ch-item" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">
                        ${ch.title}
                    </div>
                `).join('')}
            </div>
        </div>
    </div>`;
}

function renderReader(container, mTitle, cTitle) {
    const m = mangas.find(x => x.title === mTitle);
    const ch = m?.chapters.find(c => c.title === cTitle);
    if (!ch) return;
    const googleUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(ch.url)}&embedded=true`;
    container.innerHTML = `
        <div class="reader-container">
            <div class="reader-controls">
                <button class="action-btn" style="width:auto;" onclick="navigateTo('/manga/${encodeURIComponent(mTitle)}')">خروج</button>
                <h3>${cTitle}</h3>
                <div style="width:50px;"></div>
            </div>
            <iframe src="${googleUrl}" class="reader-iframe"></iframe>
        </div>`;
}

// --- الإدارة (المنطق الطويل الكامل) ---
function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `<div class="island admin-login-small" style="max-width:350px; margin:100px auto;">
            <h2 style="text-align:center; margin-bottom:15px;">تسجيل الدخول</h2>
            <input type="password" id="adminPass" placeholder="كلمة المرور">
            <button class="action-btn" style="width:100%;" onclick="login()">دخول</button>
        </div>`;
        return;
    }
    container.innerHTML = `
    <div style="max-width:1100px; margin:auto; padding:20px;">
        <div class="nav-links" style="margin-bottom:20px; justify-content:center;">
            <button class="action-btn" onclick="showAdminTab('add')">نشر مانجا جديدة</button>
            <button class="action-btn" onclick="showAdminTab('edit')">تعديل المانجا والفصول</button>
        </div>
        <div id="admin-content"></div>
    </div>`;
    showAdminTab('add');
}

function login() { if(document.getElementById('adminPass').value === "Samer#1212") { sessionStorage.setItem('isAdmin', 't'); router(); } }

function showAdminTab(tab) {
    const content = document.getElementById('admin-content');
    if(tab === 'add') {
        content.innerHTML = `<div class="island">
            <h3>نشر عمل جديد</h3>
            <input id="in-title" placeholder="عنوان المانجا">
            <input id="in-author" placeholder="المؤلف">
            <input id="in-artist" placeholder="الرسام">
            <input id="in-genres" placeholder="التصنيفات (خيال، أكشن...)">
            <textarea id="in-desc" placeholder="الوصف"></textarea>
            <p>غلاف المانجا:</p>
            <input type="file" id="in-cover" accept="image/*">
            <button class="action-btn" onclick="saveNewManga()">حفظ المانجا</button>
        </div>`;
    } else {
        content.innerHTML = `<div class="island">
            <h3>إدارة الأعمال</h3>
            <select id="select-manga" onchange="loadMangaForEdit(this.value)">
                <option value="">اختر مانجا لتعديلها...</option>
                ${mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('')}
            </select>
            <div id="edit-area"></div>
        </div>`;
    }
}

async function saveNewManga() {
    const title = document.getElementById('in-title').value;
    const coverFile = document.getElementById('in-cover').files[0];
    if(!title || !coverFile) return alert("العنوان والغلاف مطلوبان");

    const path = `covers/${Date.now()}_${coverFile.name}`;
    await _supabase.storage.from('vander-files').upload(path, coverFile);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);

    await _supabase.from('mangas').insert([{
        title, author: document.getElementById('in-author').value,
        artist: document.getElementById('in-artist').value,
        genres: document.getElementById('in-genres').value,
        desc: document.getElementById('in-desc').value,
        cover: data.publicUrl, chapters: [], lastUpdated: new Date()
    }]);
    alert("تم النشر!"); router();
}

function loadMangaForEdit(title) {
    const m = mangas.find(x => x.title === title);
    if(!m) return;
    const area = document.getElementById('edit-area');
    area.innerHTML = `
        <div style="margin-top:20px; padding-top:20px; border-top:2px solid #ddd;">
            <h4>إضافة فصل لـ ${m.title}</h4>
            <input id="ch-title" placeholder="رقم أو عنوان الفصل">
            <input type="file" id="ch-file" accept=".pdf">
            <button class="action-btn" onclick="addChapter('${m.title}')">رفع الفصل</button>
            
            <h4 style="margin-top:30px;">الفصول الحالية:</h4>
            ${(m.chapters || []).map((ch, index) => `
                <div class="edit-ch-row">
                    <span>${ch.title}</span>
                    <button class="action-btn btn-del" style="margin:0; padding:5px 15px;" onclick="deleteChapter('${m.title}', ${index})">حذف</button>
                </div>
            `).join('')}
            <button class="action-btn btn-del" style="width:100%; margin-top:40px;" onclick="deleteManga('${m.title}')">حذف المانجا بالكامل</button>
        </div>`;
}

async function addChapter(mTitle) {
    const title = document.getElementById('ch-title').value;
    const file = document.getElementById('ch-file').files[0];
    if(!title || !file) return alert("املاً بيانات الفصل");

    const path = `chapters/${Date.now()}_${file.name}`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);

    const m = mangas.find(x => x.title === mTitle);
    const newChapters = [...(m.chapters || []), { title, url: data.publicUrl }];
    await _supabase.from('mangas').update({ chapters: newChapters, lastUpdated: new Date() }).eq('title', mTitle);
    alert("تم رفع الفصل"); router();
}

async function deleteChapter(mTitle, index) {
    if(!confirm("هل أنت متأكد من حذف هذا الفصل؟")) return;
    const m = mangas.find(x => x.title === mTitle);
    const newChapters = m.chapters.filter((_, i) => i !== index);
    await _supabase.from('mangas').update({ chapters: newChapters }).eq('title', mTitle);
    router();
}

async function deleteManga(title) {
    if(!confirm("سيتم حذف المانجا وكافة فصولها نهائياً. هل أنت متأكد؟")) return;
    await _supabase.from('mangas').delete().eq('title', title);
    alert("تم الحذف"); router();
}

window.onpopstate = router;
window.onload = router;
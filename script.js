const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// --- محرك التوجيه (Router) ---
const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="spinner"></div>';

    // جلب البيانات مرة واحدة عند كل تغيير مسار لضمان التحديث
    const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    mangas = data || [];

    if (path === "/" || path === "/index.html") {
        renderHomePage(app);
    } else if (path === "/admin") {
        renderAdminPage(app);
    } else if (path.startsWith("/manga/")) {
        const parts = path.split("/");
        const mangaTitle = decodeURIComponent(parts[2]);
        const chapterTitle = parts[3] ? decodeURIComponent(parts[3]) : null;

        if (chapterTitle) {
            renderReaderPage(app, mangaTitle, chapterTitle);
        } else {
            renderDetailsPage(app, mangaTitle);
        }
    }
};

window.onpopstate = router;

document.addEventListener("click", e => {
    if (e.target.matches("[data-link]")) {
        e.preventDefault();
        navigateTo(e.target.href);
    }
});

// --- عرض الصفحة الرئيسية ---
function renderHomePage(container) {
    container.innerHTML = `
        <h2 class="section-title">آخر التحديثات</h2>
        <div class="grid-container">
            ${mangas.map(m => `
                <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link>
                    <img src="${m.cover}" class="card-image" onerror="this.src='/mainL.png'">
                    <div class="manga-title-overlay">${m.title}</div>
                </a>
            `).join('')}
        </div>
    `;
}

// --- عرض تفاصيل المانجا ---
function renderDetailsPage(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return container.innerHTML = "<h1>المانجا غير موجودة</h1>";

    const updateDate = new Date(m.lastUpdated).toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

    container.innerHTML = `
        <button onclick="navigateTo('/')" class="back-btn">← عودة للرئيسية</button>
        <div class="manga-layout">
            <div class="manga-info-card">
                <img src="${m.cover}">
                <h1>${m.title}</h1>
                <div class="manga-meta">
                    <p><strong>تاريخ التحديث:</strong> ${updateDate}</p>
                    <p><strong>تاريخ الصدور:</strong> ${m.releaseDate || '-'}</p>
                    <p><strong>الكاتب:</strong> ${m.author || 'غير معروف'}</p>
                    <p><strong>الرسام:</strong> ${m.artist || 'غير معروف'}</p>
                    <p><strong>الناشر:</strong> ${m.publisher || '-'}</p>
                    <p><strong>التصنيفات:</strong> ${m.genres || '-'}</p>
                </div>
                <p class="desc-text">${m.desc || ''}</p>
            </div>
            <div class="chapters-list-container">
                <h3>الفصول المتاحة</h3>
                <ul class="chapters-list">
                    ${(m.chapters || []).map(ch => `
                        <li onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">
                            <span>${ch.title}</span>
                            <span>قراءة ←</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

// --- عرض القارئ ---
function renderReaderPage(container, mangaTitle, chapterTitle) {
    const m = mangas.find(x => x.title === mangaTitle);
    const chapter = m?.chapters.find(c => c.title === chapterTitle);
    
    if (!chapter) return container.innerHTML = "<h1>الفصل غير موجود</h1>";

    container.innerHTML = `
        <div class="reader-header">
            <button onclick="navigateTo('/manga/${encodeURIComponent(mangaTitle)}')" class="back-btn">إغلاق القارئ</button>
            <span style="font-weight:bold; color:var(--primary)">${mangaTitle} - ${chapterTitle}</span>
        </div>
        <iframe src="${chapter.url}" id="pdf-viewer" style="width:100%; height:85vh; border:none; border-radius:10px;"></iframe>
    `;
}

// --- عرض لوحة الأدمن (الممتازة كما كانت) ---
function renderAdminPage(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `
            <div class="login-box" style="max-width:400px; margin:50px auto; text-align:center;">
                <h2>دخول المشرفين</h2>
                <input type="text" id="admin-user" placeholder="اسم المستخدم">
                <input type="password" id="admin-pass" placeholder="كلمة المرور">
                <button onclick="handleLogin()" class="action-btn">دخول</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="admin-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h2>لوحة التحكم الإدارية</h2>
            <button class="action-btn delete-btn" style="width:auto; padding:5px 15px;" onclick="handleLogout()">خروج</button>
        </div>
        <div class="admin-tabs">
            <button onclick="switchTab('add')" id="tab-add" class="active-tab">إضافة مانجا</button>
            <button onclick="switchTab('manage')" id="tab-manage">إدارة المحتوى</button>
        </div>

        <div id="panel-add" class="admin-panel">
            <div class="form-grid">
                <input type="text" id="m-title" placeholder="اسم المانجا">
                <input type="text" id="m-author" placeholder="الكاتب">
                <input type="text" id="m-artist" placeholder="الرسام">
                <input type="text" id="m-date" placeholder="تاريخ الصدور">
                <input type="text" id="m-genres" placeholder="التصنيفات">
                <input type="text" id="m-pub" placeholder="اسم الناشر">
            </div>
            <textarea id="m-desc" placeholder="وصف المانجا"></textarea>
            <label>غلاف المانجا:</label>
            <input type="file" id="m-cover" accept="image/*">
            <button onclick="apiAddNewManga()" class="action-btn">حفظ المانجا</button>
        </div>

        <div id="panel-manage" class="admin-panel hidden">
            <select id="m-select-manage" onchange="loadMangaForEdit(this.value)">
                <option value="">اختر المانجا لإدارتها</option>
                ${mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('')}
            </select>
            <div id="edit-area" class="hidden" style="margin-top:20px; border-top:2px solid #eee; padding-top:20px;">
                <div class="form-grid" id="edit-fields"></div>
                <textarea id="edit-desc"></textarea>
                <label>تغيير الغلاف (اختياري):</label>
                <input type="file" id="edit-cover" accept="image/*">
                <div style="display:flex; gap:10px;">
                    <button onclick="apiUpdateManga()" class="action-btn">تحديث البيانات</button>
                    <button onclick="apiDeleteManga()" class="action-btn delete-btn">حذف المانجا</button>
                </div>
                <hr style="margin:20px 0;">
                <h4>إدارة الفصول</h4>
                <div class="form-grid">
                    <input type="text" id="ch-title" placeholder="عنوان الفصل">
                    <input type="file" id="ch-file" accept="application/pdf">
                    <button onclick="apiAddChapter()" class="action-btn">إضافة فصل</button>
                </div>
                <ul id="admin-ch-list" class="admin-list" style="margin-top:20px;"></ul>
            </div>
        </div>
    `;
}

// --- وظائف منطق الأدمن (API) ---

function switchTab(tab) {
    document.getElementById('panel-add').classList.toggle('hidden', tab !== 'add');
    document.getElementById('panel-manage').classList.toggle('hidden', tab !== 'manage');
    document.getElementById('tab-add').classList.toggle('active-tab', tab === 'add');
    document.getElementById('tab-manage').classList.toggle('active-tab', tab === 'manage');
}

async function apiAddNewManga() {
    const title = document.getElementById('m-title').value;
    const file = document.getElementById('m-cover').files[0];
    if(!title || !file) return alert("الاسم والغلاف مطلوبان");

    toggleLoader(true);
    const fileName = `covers/${Date.now()}.png`;
    await _supabase.storage.from('vander-files').upload(fileName, file);
    const coverUrl = _supabase.storage.from('vander-files').getPublicUrl(fileName).data.publicUrl;

    const { error } = await _supabase.from('mangas').insert([{
        title, cover: coverUrl, desc: document.getElementById('m-desc').value,
        author: document.getElementById('m-author').value, artist: document.getElementById('m-artist').value,
        releaseDate: document.getElementById('m-date').value, genres: document.getElementById('m-genres').value,
        publisher: document.getElementById('m-pub').value, chapters: [], lastUpdated: new Date()
    }]);
    
    if(!error) { alert("تم الحفظ!"); router(); }
    toggleLoader(false);
}

function loadMangaForEdit(title) {
    const area = document.getElementById('edit-area');
    const m = mangas.find(x => x.title === title);
    if(!m) return area.classList.add('hidden');

    area.classList.remove('hidden');
    document.getElementById('edit-fields').innerHTML = `
        <input type="text" id="e-title" value="${m.title}" placeholder="الاسم">
        <input type="text" id="e-author" value="${m.author || ''}" placeholder="الكاتب">
        <input type="text" id="e-artist" value="${m.artist || ''}" placeholder="الرسام">
        <input type="text" id="e-date" value="${m.releaseDate || ''}" placeholder="التاريخ">
        <input type="text" id="e-genres" value="${m.genres || ''}" placeholder="التصنيفات">
        <input type="text" id="e-pub" value="${m.publisher || ''}" placeholder="الناشر">
    `;
    document.getElementById('edit-desc').value = m.desc || '';
    
    const chList = document.getElementById('admin-ch-list');
    chList.innerHTML = (m.chapters || []).map(ch => `
        <li style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #eee;">
            <span>${ch.title}</span>
            <div>
                <button class="action-btn" style="width:auto; padding:2px 10px; font-size:12px;" onclick="apiReplaceChapter('${ch.title}')">تبديل</button>
                <button class="action-btn delete-btn" style="width:auto; padding:2px 10px; font-size:12px;" onclick="apiDeleteChapter('${ch.title}')">حذف</button>
            </div>
        </li>
    `).join('');
}

async function apiUpdateManga() {
    const oldTitle = document.getElementById('m-select-manage').value;
    const newFile = document.getElementById('edit-cover').files[0];
    const m = mangas.find(x => x.title === oldTitle);

    toggleLoader(true);
    let coverUrl = m.cover;
    if(newFile) {
        const fileName = `covers/${Date.now()}.png`;
        await _supabase.storage.from('vander-files').upload(fileName, newFile);
        coverUrl = _supabase.storage.from('vander-files').getPublicUrl(fileName).data.publicUrl;
    }

    const { error } = await _supabase.from('mangas').update({
        title: document.getElementById('e-title').value,
        author: document.getElementById('e-author').value,
        artist: document.getElementById('e-artist').value,
        releaseDate: document.getElementById('e-date').value,
        genres: document.getElementById('e-genres').value,
        publisher: document.getElementById('e-pub').value,
        desc: document.getElementById('edit-desc').value,
        cover: coverUrl, lastUpdated: new Date()
    }).eq('title', oldTitle);

    if(!error) { alert("تم التحديث"); router(); }
    toggleLoader(false);
}

async function apiDeleteManga() {
    const title = document.getElementById('m-select-manage').value;
    if(!confirm("حذف نهائي؟")) return;
    toggleLoader(true);
    await _supabase.from('mangas').delete().eq('title', title);
    router();
    toggleLoader(false);
}

async function apiAddChapter() {
    const title = document.getElementById('m-select-manage').value;
    const chTitle = document.getElementById('ch-title').value;
    const file = document.getElementById('ch-file').files[0];
    if(!chTitle || !file) return alert("اكمل البيانات");

    toggleLoader(true);
    const fileName = `chapters/${Date.now()}.pdf`;
    await _supabase.storage.from('vander-files').upload(fileName, file);
    const url = _supabase.storage.from('vander-files').getPublicUrl(fileName).data.publicUrl;

    const m = mangas.find(x => x.title === title);
    const newChapters = [...(m.chapters || []), { title: chTitle, url }];

    await _supabase.from('mangas').update({ chapters: newChapters, lastUpdated: new Date() }).eq('title', title);
    alert("تم الإضافة");
    router();
    toggleLoader(false);
}

async function apiDeleteChapter(chTitle) {
    const title = document.getElementById('m-select-manage').value;
    const m = mangas.find(x => x.title === title);
    const newChapters = m.chapters.filter(c => c.title !== chTitle);
    await _supabase.from('mangas').update({ chapters: newChapters }).eq('title', title);
    router();
}

function handleLogin() {
    if(document.getElementById('admin-user').value === "samer" && document.getElementById('admin-pass').value === "Samer#1212") {
        sessionStorage.setItem('isAdmin', 'true');
        router();
    } else alert("بيانات خاطئة");
}

function handleLogout() { sessionStorage.removeItem('isAdmin'); router(); }
function toggleLoader(show) { document.getElementById('loading-overlay').classList.toggle('hidden', !show); }

// تشغيل النظام
window.onload = router;
const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// --- نظام التوجيه (Router) ---
const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="spinner"></div>';

    const { data } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
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
    if (e.target.closest("[data-link]")) {
        e.preventDefault();
        navigateTo(e.target.closest("[data-link]").href);
    }
});

// --- عرض الرئيسية (العناصر الطائرة) ---
function renderHomePage(container) {
    container.innerHTML = `
        <div class="grid-container">
            ${mangas.map(m => `
                <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link>
                    <div class="card-image-container">
                        <img src="${m.cover}" class="card-image" onerror="this.src='/mainL.png'">
                    </div>
                    <div class="card-info">
                        <span class="manga-card-title">${m.title}</span><br>
                        <span class="manga-card-genres">${m.genres || 'تصنيف'}</span>
                    </div>
                </a>
            `).join('')}
        </div>
    `;
}

// --- عرض تفاصيل المانجا ---
function renderDetailsPage(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return container.innerHTML = "<h1>غير موجود</h1>";

    container.innerHTML = `
        <div class="content-box">
            <button onclick="navigateTo('/')" class="action-btn" style="width:auto; padding:8px 20px; margin-bottom:20px;">← العودة</button>
            <div class="manga-layout">
                <div class="manga-info-card">
                    <img src="${m.cover}">
                    <h1 style="margin-top:15px;">${m.title}</h1>
                    <div class="manga-meta">
                        <p><strong>تاريخ التحديث:</strong> ${new Date(m.lastUpdated).toLocaleDateString('ar-EG')}</p>
                        <p><strong>الكاتب:</strong> ${m.author || '-'}</p>
                        <p><strong>الرسام:</strong> ${m.artist || '-'}</p>
                        <p><strong>التصنيفات:</strong> ${m.genres || '-'}</p>
                    </div>
                    <p>${m.desc || ''}</p>
                </div>
                <div class="chapters-list-container">
                    <h3>الفصول</h3>
                    <ul class="chapters-list">
                        ${(m.chapters || []).map(ch => `
                            <li onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">
                                <span>${ch.title}</span> <span>اقرأ ←</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
}

// --- عرض القارئ ---
function renderReaderPage(container, mangaTitle, chapterTitle) {
    const m = mangas.find(x => x.title === mangaTitle);
    const chapter = m?.chapters.find(c => c.title === chapterTitle);
    container.innerHTML = `
        <div class="content-box">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <button onclick="navigateTo('/manga/${encodeURIComponent(mangaTitle)}')" class="action-btn" style="width:auto;">خروج</button>
                <h2>${chapterTitle}</h2>
            </div>
            <iframe src="${chapter.url}" style="width:100%; height:80vh; border:none; border-radius:15px;"></iframe>
        </div>
    `;
}

// --- لوحة الأدمن (الكاملة) ---
function renderAdminPage(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `
            <div class="content-box" style="max-width:400px; margin:auto; text-align:center;">
                <h2>دخول المشرفين</h2>
                <input type="text" id="adm-user" placeholder="المستخدم">
                <input type="password" id="adm-pass" placeholder="كلمة المرور">
                <button onclick="doLogin()" class="action-btn">دخول</button>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="content-box">
            <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
                <h2>لوحة التحكم</h2>
                <button onclick="doLogout()" class="action-btn delete-btn" style="width:auto;">خروج</button>
            </div>
            <div class="admin-tabs">
                <button onclick="tab('add')" id="t-add" class="active-tab">إضافة</button>
                <button onclick="tab('man')" id="t-man">إدارة</button>
            </div>

            <div id="p-add">
                <div class="form-grid">
                    <input type="text" id="in-title" placeholder="الاسم">
                    <input type="text" id="in-author" placeholder="الكاتب">
                    <input type="text" id="in-artist" placeholder="الرسام">
                    <input type="text" id="in-genres" placeholder="التصنيفات">
                    <input type="text" id="in-pub" placeholder="الناشر">
                    <input type="text" id="in-date" placeholder="التاريخ">
                </div>
                <textarea id="in-desc" placeholder="الوصف"></textarea>
                <input type="file" id="in-cover" accept="image/*">
                <button onclick="addManga()" class="action-btn">حفظ المانجا</button>
            </div>

            <div id="p-man" class="hidden">
                <select id="sel-man" onchange="editManga(this.value)">
                    <option value="">اختر للتعديل</option>
                    ${mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('')}
                </select>
                <div id="edit-ctrl" class="hidden" style="margin-top:20px;">
                    <div id="edit-fields-container"></div>
                    <textarea id="ed-desc"></textarea>
                    <input type="file" id="ed-cover" accept="image/*">
                    <button onclick="saveUpdate()" class="action-btn">تحديث المعلومات</button>
                    <button onclick="delManga()" class="action-btn delete-btn">حذف المانجا</button>
                    <hr style="margin:20px 0;">
                    <h4>الفصول</h4>
                    <div class="form-grid">
                        <input type="text" id="ch-t" placeholder="رقم الفصل">
                        <input type="file" id="ch-f" accept="application/pdf">
                        <button onclick="newChapter()" class="action-btn">رفع فصل</button>
                    </div>
                    <ul id="ed-ch-list" class="chapters-list" style="margin-top:20px;"></ul>
                </div>
            </div>
        </div>
    `;
}

// --- العمليات ---
function tab(name) {
    document.getElementById('p-add').classList.toggle('hidden', name !== 'add');
    document.getElementById('p-man').classList.toggle('hidden', name !== 'man');
    document.getElementById('t-add').classList.toggle('active-tab', name === 'add');
    document.getElementById('t-man').classList.toggle('active-tab', name === 'man');
}

async function addManga() {
    toggleLoader(true);
    const title = document.getElementById('in-title').value;
    const file = document.getElementById('in-cover').files[0];
    const fileName = `covers/${Date.now()}.png`;
    await _supabase.storage.from('vander-files').upload(fileName, file);
    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    await _supabase.from('mangas').insert([{
        title, cover: urlData.publicUrl, desc: document.getElementById('in-desc').value,
        author: document.getElementById('in-author').value, artist: document.getElementById('in-artist').value,
        genres: document.getElementById('in-genres').value, publisher: document.getElementById('in-pub').value,
        releaseDate: document.getElementById('in-date').value, chapters: [], lastUpdated: new Date()
    }]);
    router();
}

function editManga(title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return document.getElementById('edit-ctrl').classList.add('hidden');
    document.getElementById('edit-ctrl').classList.remove('hidden');
    document.getElementById('edit-fields-container').innerHTML = `
        <div class="form-grid">
            <input type="text" id="ed-title" value="${m.title}">
            <input type="text" id="ed-author" value="${m.author || ''}">
            <input type="text" id="ed-artist" value="${m.artist || ''}">
            <input type="text" id="ed-genres" value="${m.genres || ''}">
            <input type="text" id="ed-pub" value="${m.publisher || ''}">
            <input type="text" id="ed-date" value="${m.releaseDate || ''}">
        </div>
    `;
    document.getElementById('ed-desc').value = m.desc || '';
    document.getElementById('ed-ch-list').innerHTML = (m.chapters || []).map(c => `
        <li style="font-size:14px;">${c.title} <button onclick="delChapter('${c.title}')" class="delete-btn" style="padding:2px 10px; border-radius:5px; color:white; border:none;">حذف</button></li>
    `).join('');
}

async function saveUpdate() {
    toggleLoader(true);
    const oldTitle = document.getElementById('sel-man').value;
    const updateData = {
        title: document.getElementById('ed-title').value,
        author: document.getElementById('ed-author').value,
        artist: document.getElementById('ed-artist').value,
        genres: document.getElementById('ed-genres').value,
        publisher: document.getElementById('ed-pub').value,
        releaseDate: document.getElementById('ed-date').value,
        desc: document.getElementById('ed-desc').value,
        lastUpdated: new Date()
    };
    await _supabase.from('mangas').update(updateData).eq('title', oldTitle);
    router();
}

async function newChapter() {
    toggleLoader(true);
    const title = document.getElementById('sel-man').value;
    const chT = document.getElementById('ch-t').value;
    const file = document.getElementById('ch-f').files[0];
    const path = `chapters/${Date.now()}.pdf`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(path);

    const m = mangas.find(x => x.title === title);
    const chapters = [...(m.chapters || []), { title: chT, url: urlData.publicUrl }];
    await _supabase.from('mangas').update({ chapters, lastUpdated: new Date() }).eq('title', title);
    router();
}

async function delManga() {
    if (!confirm("حذف نهائي؟")) return;
    await _supabase.from('mangas').delete().eq('title', document.getElementById('sel-man').value);
    router();
}

function doLogin() {
    if (document.getElementById('adm-user').value === "samer" && document.getElementById('adm-pass').value === "Samer#1212") {
        sessionStorage.setItem('isAdmin', 'true');
        router();
    }
}
function doLogout() { sessionStorage.removeItem('isAdmin'); router(); }
function toggleLoader(s) { document.getElementById('loading-overlay').classList.toggle('hidden', !s); }

window.onload = router;
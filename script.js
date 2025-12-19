const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// --- Router Engine ---
const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="spinner"></div>';

    // Route: /
    if (path === "/" || path === "/index.html") {
        renderHomePage(app);
    } 
    // Route: /admin
    else if (path === "/admin") {
        renderAdminPage(app);
    } 
    // Route: /manga/NAME/CHAPTER
    else if (path.startsWith("/manga/")) {
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

window.addEventListener("popstate", router);

document.addEventListener("click", e => {
    if (e.target.matches("[data-link]")) {
        e.preventDefault();
        navigateTo(e.target.href);
    }
});

// --- Page Renderers ---

async function renderHomePage(container) {
    const { data } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    container.innerHTML = `
        <h2 style="margin-bottom:20px;">آخر التحديثات</h2>
        <div class="grid-container">
            ${data.map(m => `
                <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link>
                    <img src="${m.cover}" class="card-image" onerror="this.src='/mainL.png'">
                    <div class="manga-title-overlay">${m.title}</div>
                </a>
            `).join('')}
        </div>
    `;
}

async function renderDetailsPage(container, title) {
    const { data } = await _supabase.from('mangas').select('*').eq('title', title).single();
    if (!data) return container.innerHTML = "<h1>المانجا غير موجودة</h1>";

    const date = new Date(data.lastUpdated).toLocaleDateString('ar-EG');
    
    container.innerHTML = `
        <div class="manga-layout">
            <div class="manga-info-card">
                <img src="${data.cover}">
                <h1>${data.title}</h1>
                <div class="manga-meta">
                    <p><strong>تاريخ التحديث:</strong> ${date}</p>
                    <p><strong>الكاتب:</strong> ${data.author || 'غير معروف'}</p>
                    <p><strong>الرسام:</strong> ${data.artist || 'غير معروف'}</p>
                    <p><strong>التصنيفات:</strong> ${data.genres || '-'}</p>
                    <p><strong>الناشر:</strong> ${data.publisher || '-'}</p>
                </div>
                <p>${data.desc || ''}</p>
            </div>
            <div class="chapters-list">
                <h3>قائمة الفصول</h3>
                ${(data.chapters || []).map(ch => `
                    <a href="/manga/${encodeURIComponent(data.title)}/${encodeURIComponent(ch.title)}" data-link>
                        <span>${ch.title}</span>
                        <span>اقرأ الآن ←</span>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
}

async function renderReaderPage(container, mangaTitle, chapterTitle) {
    const { data } = await _supabase.from('mangas').select('chapters').eq('title', mangaTitle).single();
    const chapter = data.chapters.find(c => c.title === chapterTitle);
    
    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
            <a href="/manga/${encodeURIComponent(mangaTitle)}" class="action-btn" style="width:auto; text-decoration:none;" data-link>← العودة للمانجا</a>
            <h2>${mangaTitle} - ${chapterTitle}</h2>
        </div>
        <iframe src="${chapter.url}" id="pdf-viewer"></iframe>
    `;
}

async function renderAdminPage(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `
            <div style="max-width:400px; margin:auto; text-align:center;">
                <h2>دخول الأدمن</h2>
                <input type="password" id="admin-pass" placeholder="كلمة المرور">
                <button onclick="checkAdminPass()" class="action-btn">دخول</button>
            </div>
        `;
        return;
    }

    // هنا يتم بناء لوحة التحكم (نفس الأكواد السابقة ولكن داخل دالة)
    container.innerHTML = `<h1>لوحة التحكم</h1><p>جاري تحميل الإعدادات...</p>`;
    // استدعي وظائف الإدارة هنا...
    buildAdminUI(container);
}

// تشغيل الـ Router عند تحميل الصفحة
window.onload = router;

// وظائف مساعدة للأدمن
async function checkAdminPass() {
    const pass = document.getElementById('admin-pass').value;
    if (pass === "Samer#1212") {
        sessionStorage.setItem('isAdmin', 'true');
        router();
    } else alert("خطأ!");
}

async function buildAdminUI(container) {
    const { data: mangas } = await _supabase.from('mangas').select('*');
    container.innerHTML = `
        <div class="admin-panel">
            <h3>إضافة مانجا جديدة</h3>
            <div class="form-grid">
                <input type="text" id="m-title" placeholder="الاسم">
                <input type="text" id="m-author" placeholder="الكاتب">
            </div>
            <input type="file" id="m-cover" accept="image/*">
            <button onclick="handleNewManga()" class="action-btn">حفظ</button>
            <hr style="margin:20px 0;">
            <h3>إدارة الفصول والبيانات</h3>
            <select id="m-select" onchange="loadAdminManga(this.value)">
                <option value="">اختر المانجا</option>
                ${mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('')}
            </select>
            <div id="admin-edit-area"></div>
        </div>
    `;
}
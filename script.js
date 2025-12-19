const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// Router Logic
const navigateTo = url => { history.pushState(null, null, url); router(); };
const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="spinner"></div>';

    const { data } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    mangas = data || [];

    // حقن البانر فقط في الصفحة الرئيسية
    const bannerHtml = path === "/" || path === "/index.html" ? `<div class="site-banner"></div>` : "";
    
    if (path === "/" || path === "/index.html") {
        app.innerHTML = bannerHtml + renderHome();
    } else if (path === "/admin") {
        renderAdmin(app);
    } else if (path.startsWith("/manga/")) {
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

// Renderers
function renderHome() {
    return `<div class="grid-container">
        ${mangas.map(m => `
            <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link style="text-decoration:none;">
                <div class="card-img-box"><img src="${m.cover}" style="width:100%; height:100%; object-fit:cover;"></div>
                <div class="card-text" style="margin-top:10px; text-align:center;">
                    <span style="background:var(--primary); color:white; padding:5px 15px; border-radius:8px; font-weight:900;">${m.title}</span>
                </div>
            </a>
        `).join('')}
    </div>`;
}

function renderDetails(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return container.innerHTML = "<h1>غير موجود</h1>";

    container.innerHTML = `
        <div class="manga-detail-layout">
            <div class="island cover-island">
                <img src="${m.cover}">
                <div class="interaction-bar">
                    <img src="/hart.png" title="إعجاب">
                    <img src="/comment.png" title="تعليق">
                    <img src="/save.png" title="حفظ">
                </div>
            </div>

            <div class="island info-island">
                <h1>${m.title}</h1>
                <div class="data-item"><span>تاريخ التحديث:</span> <span>${new Date(m.lastUpdated).toLocaleDateString('ar-EG')}</span></div>
                <div class="data-item"><span>الكاتب:</span> <span>${m.author || '-'}</span></div>
                <div class="data-item"><span>الرسام:</span> <span>${m.artist || '-'}</span></div>
                <div class="data-item"><span>التصنيفات:</span> <span>${m.genres || '-'}</span></div>
                <div class="data-item"><span>الحالة:</span> <span>${m.publisher || '-'}</span></div>
                <hr style="margin:20px 0;">
                <p style="line-height:1.8; font-size:1.1rem;">${m.desc || 'لا يوجد وصف.'}</p>
            </div>

            <div class="island chapters-island">
                <h3 style="margin-bottom:20px; color:var(--primary); text-align:center;">قائمة الفصول</h3>
                ${(m.chapters || []).map(ch => `
                    <div class="ch-item" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">
                        ${ch.title}
                    </div>
                `).join('')}
            </div>
        </div>`;
}

// Admin Logic
function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `
            <div class="island" style="max-width:400px; margin:100px auto;">
                <h2 style="text-align:center;">دخول الإدارة</h2>
                <input type="text" id="user" placeholder="اسم المستخدم">
                <input type="password" id="pass" placeholder="كلمة المرور">
                <button class="action-btn" style="width:100%;" onclick="login()">دخول</button>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div style="display:flex; justify-content:center; gap:20px; margin-bottom:30px;">
            <button class="action-btn" onclick="renderAdminForm('add')">إضافة مانجا</button>
            <button class="action-btn" onclick="renderAdminForm('edit')">تعديل مانجا</button>
            <button class="action-btn" style="background:var(--accent)" onclick="logout()">خروج</button>
        </div>
        <div id="admin-action-area"></div>`;
}

function renderAdminForm(type) {
    const area = document.getElementById('admin-action-area');
    if(type === 'add') {
        area.innerHTML = `
            <div class="island" style="max-width:800px; margin:auto;">
                <h3>نشر مانجا جديدة</h3>
                <input id="t" placeholder="العنوان">
                <input id="a" placeholder="الكاتب">
                <input id="g" placeholder="التصنيفات">
                <textarea id="d" placeholder="الوصف" style="height:150px;"></textarea>
                <label>غلاف المانجا:</label>
                <input type="file" id="c">
                <button class="action-btn" onclick="executeAdd()">حفظ ونشر</button>
            </div>`;
    } else {
        area.innerHTML = `
            <div class="island" style="max-width:800px; margin:auto;">
                <select id="sel" onchange="setupEdit(this.value)">
                    <option>اختر مانجا للتعديل</option>
                    ${mangas.map(m => `<option>${m.title}</option>`).join('')}
                </select>
                <div id="edit-fields"></div>
            </div>`;
    }
}

async function executeAdd() {
    const file = document.getElementById('c').files[0];
    const path = `covers/${Date.now()}.png`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);

    await _supabase.from('mangas').insert([{
        title: document.getElementById('t').value,
        cover: data.publicUrl,
        author: document.getElementById('a').value,
        genres: document.getElementById('g').value,
        desc: document.getElementById('d').value,
        chapters: [], lastUpdated: new Date()
    }]);
    alert("تم الإضافة!");
    router();
}

function login() {
    if(document.getElementById('user').value === "samer" && document.getElementById('pass').value === "Samer#1212") {
        sessionStorage.setItem('isAdmin','t');
        router();
    }
}
function logout() { sessionStorage.removeItem('isAdmin'); router(); }

window.onload = router;
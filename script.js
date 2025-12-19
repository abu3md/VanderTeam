const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

const navigateTo = url => { history.pushState(null, null, url); router(); };

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="spinner"></div>';

    const { data } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    mangas = data || [];

    if (path === "/" || path === "/index.html") {
        app.innerHTML = `<div class="site-banner"></div>` + renderHome();
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

function renderHome() {
    return `<div class="grid-container">${mangas.map(m => `
        <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link style="text-decoration:none;">
            <div class="island" style="padding:0; overflow:hidden; aspect-ratio:1/1;">
                <img src="${m.cover}" style="width:100%; height:100%; object-fit:cover;">
            </div>
            <div style="margin-top:10px; text-align:center;">
                <span style="background:var(--primary); color:white; padding:5px 15px; border-radius:8px; font-weight:900;">${m.title}</span>
            </div>
        </a>`).join('')}</div>`;
}

function renderDetails(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return container.innerHTML = "<h1>غير موجود</h1>";
    container.innerHTML = `
        <div class="manga-detail-layout">
            <div class="island cover-island">
                <img src="${m.cover}">
                <div class="interaction-bar">
                    <img src="/hart.png"> <img src="/comment.png"> <img src="/save.png">
                </div>
            </div>
            <div class="island info-island">
                <h1>${m.title}</h1>
                <div class="data-row"><span>تاريخ التحديث:</span> <span>${new Date(m.lastUpdated).toLocaleDateString('ar-EG')}</span></div>
                <div class="data-row"><span>الكاتب:</span> <span>${m.author || '-'}</span></div>
                <div class="data-row"><span>الرسام:</span> <span>${m.artist || '-'}</span></div>
                <div class="data-row"><span>التصنيفات:</span> <span>${m.genres || '-'}</span></div>
                <div class="data-row"><span>الناشر:</span> <span>${m.publisher || '-'}</span></div>
                <div class="data-row"><span>تاريخ الصدور:</span> <span>${m.releaseDate || '-'}</span></div>
                <hr style="margin:20px 0;">
                <p style="line-height:1.8;">${m.desc || ''}</p>
            </div>
            <div class="island chapters-island">
                <h3 style="margin-bottom:15px; text-align:center;">قائمة الفصول</h3>
                ${(m.chapters || []).map(ch => `<div class="ch-item" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">${ch.title}</div>`).join('')}
            </div>
        </div>`;
}

function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `<div class="island" style="max-width:400px; margin:100px auto;">
            <h2 style="text-align:center; margin-bottom:15px;">دخول المشرفين</h2>
            <input type="text" id="u" placeholder="اسم المستخدم">
            <input type="password" id="p" placeholder="كلمة المرور">
            <button class="action-btn" onclick="login()">دخول</button>
        </div>`;
        return;
    }
    container.innerHTML = `
        <div style="max-width:1200px; margin:auto; padding:20px;">
            <div style="display:flex; gap:10px; margin-bottom:20px;">
                <button class="action-btn" onclick="showForm('add')">نشر مانجا جديدة</button>
                <button class="action-btn" onclick="showForm('edit')">إدارة وتعديل</button>
                <button class="action-btn" style="background:var(--accent)" onclick="logout()">خروج</button>
            </div>
            <div id="form-area"></div>
        </div>`;
}

function showForm(type) {
    const area = document.getElementById('form-area');
    if(type === 'add') {
        area.innerHTML = `<div class="island">
            <h3>إضافة مانجا كاملة البيانات</h3>
            <div class="admin-form-grid">
                <input id="in-t" placeholder="عنوان المانجا">
                <input id="in-a" placeholder="اسم الكاتب">
                <input id="in-r" placeholder="اسم الرسام">
                <input id="in-g" placeholder="التصنيفات">
                <input id="in-pub" placeholder="الناشر">
                <input id="in-date" placeholder="تاريخ الصدور">
            </div>
            <textarea id="in-d" placeholder="وصف القصة بالتفصيل" style="height:120px;"></textarea>
            <label>غلاف المانجا:</label>
            <input type="file" id="in-c">
            <button class="action-btn" onclick="saveNew()">حفظ المانجا الآن</button>
        </div>`;
    } else {
        area.innerHTML = `<div class="island">
            <select id="s-m" onchange="setupEdit(this.value)">
                <option>اختر المانجا للتعديل عليها</option>
                ${mangas.map(m=>`<option>${m.title}</option>`).join('')}
            </select>
            <div id="e-fields"></div>
        </div>`;
    }
}

async function saveNew() {
    const title = document.getElementById('in-t').value;
    const file = document.getElementById('in-c').files[0];
    if(!title || !file) return alert("العنوان والغلاف مطلوبان");

    const path = `covers/${Date.now()}_${file.name}`;
    const { data: uploadData } = await _supabase.storage.from('vander-files').upload(path, file);
    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(path);

    const { error } = await _supabase.from('mangas').insert([{
        title: title,
        cover: urlData.publicUrl,
        author: document.getElementById('in-a').value,
        artist: document.getElementById('in-r').value,
        genres: document.getElementById('in-g').value,
        publisher: document.getElementById('in-pub').value,
        releaseDate: document.getElementById('in-date').value,
        desc: document.getElementById('in-d').value,
        chapters: [],
        lastUpdated: new Date()
    }]);

    if(!error) { alert("تم الحفظ بنجاح!"); router(); }
    else alert("حدث خطأ أثناء الحفظ");
}

function login() {
    if(document.getElementById('u').value === "samer" && document.getElementById('p').value === "Samer#1212") {
        sessionStorage.setItem('isAdmin','t'); router();
    } else alert("بيانات خاطئة");
}
function logout() { sessionStorage.removeItem('isAdmin'); router(); }

window.onload = router;
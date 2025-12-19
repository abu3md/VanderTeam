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

function renderHome(container) {
    container.innerHTML = `<div class="grid-container">
        ${mangas.map(m => `
            <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link>
                <div class="card-img-box"><img src="${m.cover}"></div>
                <div class="card-text">
                    <span class="card-title">${m.title}</span>
                </div>
            </a>
        `).join('')}
    </div>`;
}

function renderDetails(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return container.innerHTML = "<h1>غير موجود</h1>";
    
    container.innerHTML = `
        <div class="floating-layout">
            <div class="island side-cover-island">
                <img src="${m.cover}">
                <div class="interaction-bar">
                    <img src="/hart.png" alt="Like">
                    <img src="/comment.png" alt="Comment">
                    <img src="/save.png" alt="Save">
                </div>
            </div>

            <div class="island info-island">
                <h1>${m.title}</h1>
                <div class="data-row"><span>الكاتب:</span> <span>${m.author || '-'}</span></div>
                <div class="data-row"><span>الرسام:</span> <span>${m.artist || '-'}</span></div>
                <div class="data-row"><span>تاريخ الصدور:</span> <span>${m.releaseDate || '-'}</span></div>
                <div class="data-row"><span>التصنيفات:</span> <span>${m.genres || '-'}</span></div>
                <div class="data-row"><span>الناشر:</span> <span>${m.publisher || '-'}</span></div>
                <div class="data-row"><span>آخر تحديث:</span> <span>${new Date(m.lastUpdated).toLocaleDateString('ar-EG')}</span></div>
                <p style="margin-top:20px; line-height:1.8;">${m.desc || 'لا يوجد وصف متاح.'}</p>
            </div>

            <div class="island chapters-island">
                <h3 style="margin-bottom:15px; text-align:center; color:var(--primary)">الفصول</h3>
                ${(m.chapters || []).map(ch => `
                    <div class="chapter-btn" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">
                        ${ch.title}
                    </div>
                `).join('')}
            </div>
        </div>`;
}

function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `
            <div class="island admin-login-box">
                <h2 style="text-align:center; margin-bottom:15px;">دخول المشرفين</h2>
                <input type="text" id="adm-user" placeholder="اسم المستخدم">
                <input type="password" id="adm-pass" placeholder="كلمة المرور">
                <button class="action-btn" onclick="login()">دخول</button>
            </div>`;
        return;
    }
    container.innerHTML = `
        <div style="text-align:center; margin-bottom:20px;">
            <button class="action-btn" style="width:auto; padding:5px 20px;" onclick="logout()">خروج</button>
        </div>
        <div class="floating-layout">
            <div class="island side-cover-island">
                <h3>الغلاف</h3>
                <input type="file" id="in-c">
            </div>
            <div class="island info-island">
                <h3>إضافة/تعديل مانجا</h3>
                <input id="in-t" placeholder="العنوان">
                <input id="in-a" placeholder="الكاتب">
                <input id="in-r" placeholder="الرسام">
                <input id="in-g" placeholder="التصنيفات">
                <input id="in-p" placeholder="الناشر">
                <input id="in-d" placeholder="التاريخ">
                <textarea id="in-desc" placeholder="الوصف" style="height:100px; width:100%;"></textarea>
                <button class="action-btn" onclick="sendAdd()">حفظ البيانات</button>
            </div>
            <div class="island chapters-island">
                <h3>رفع الفصول</h3>
                <input id="ch-t" placeholder="عنوان الفصل">
                <input type="file" id="ch-f">
                <p>اختر مانجا أولاً للتعديل أو أضف واحدة جديدة.</p>
            </div>
        </div>`;
}

function login() {
    const user = document.getElementById('adm-user').value;
    const pass = document.getElementById('adm-pass').value;
    if(user === "samer" && pass === "Samer#1212") {
        sessionStorage.setItem('isAdmin','t');
        router();
    } else alert("خطأ في البيانات");
}
function logout() { sessionStorage.removeItem('isAdmin'); router(); }
function toggleL(s) { document.getElementById('loading-overlay').classList.toggle('hidden', !s); }

window.onload = router;
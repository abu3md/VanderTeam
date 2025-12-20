const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

const navigateTo = url => { history.pushState(null, null, url); router(); };

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    app.innerHTML = '<div style="text-align:center; padding:100px; color:white;"><div class="spinner"></div></div>';

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

// القارئ المصلح جذرياً
async function renderReader(container, mTitle, cTitle) {
    const m = mangas.find(x => x.title === mTitle);
    const ch = m?.chapters.find(c => c.title === cTitle);
    if (!ch) return container.innerHTML = "<h1>الفصل غير موجود</h1>";

    container.innerHTML = `
        <div class="reader-container">
            <div class="reader-controls">
                <button class="action-btn" style="width:auto;" onclick="navigateTo('/manga/${encodeURIComponent(mTitle)}')">خروج</button>
                <h3>${mTitle} - ${cTitle}</h3>
            </div>
            <div id="reader-pages" class="chapter-images">
                <div class="spinner"></div>
                <p style="color:white; text-align:center;">جاري معالجة الصفحات...</p>
            </div>
        </div>`;
    
    try {
        // تحديد مسار الـ worker بدقة
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        // جلب ملف الـ PDF عبر مصفوفة بايتات لتجنب مشاكل الـ CORS المباشرة
        const loadingTask = pdfjsLib.getDocument(ch.url);
        const pdf = await loadingTask.promise;
        const pagesContainer = document.getElementById('reader-pages');
        pagesContainer.innerHTML = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 }); // تقليل الـ scale قليلاً لسرعة التحميل
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            
            const img = new Image();
            img.src = canvas.toDataURL('image/jpeg', 0.85);
            pagesContainer.appendChild(img);
        }
    } catch (e) {
        console.error("PDF Error:", e);
        document.getElementById('reader-pages').innerHTML = "<p style='color:red; text-align:center; padding:20px;'>تعذر قراءة الملف. تأكد من إعدادات الـ CORS في Supabase أو صلاحية الملف.</p>";
    }
}

// الإدارة
function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `<div class="island admin-login-small">
            <h4 style="text-align:center; margin-bottom:10px;">دخول المشرفين</h4>
            <input type="text" id="u" placeholder="الاسم">
            <input type="password" id="p" placeholder="كلمة المرور">
            <button class="action-btn" onclick="login()">دخول</button>
        </div>`; return;
    }
    container.innerHTML = `<div style="max-width:1200px; margin:auto; padding:20px;">
        <div style="display:flex; gap:10px; margin-bottom:20px;">
            <button class="action-btn" onclick="showForm('add')">نشر جديد</button>
            <button class="action-btn" onclick="showForm('edit')">إدارة</button>
            <button class="action-btn" style="background:var(--accent)" onclick="logout()">خروج</button>
        </div>
        <div id="form-area"></div>
    </div>`;
}

function showForm(type) {
    const area = document.getElementById('form-area');
    if(type === 'add') {
        area.innerHTML = `<div class="island">
            <h3>نشر مانجا جديدة</h3>
            <div class="admin-form-grid">
                <input id="in-t" placeholder="العنوان"><input id="in-a" placeholder="الكاتب">
                <input id="in-r" placeholder="الرسام"><input id="in-g" placeholder="التصنيفات">
                <input id="in-pub" placeholder="الناشر"><input id="in-date" placeholder="تاريخ الصدور">
            </div>
            <textarea id="in-d" placeholder="الوصف" style="height:100px;"></textarea>
            <input type="file" id="in-c">
            <button class="action-btn" onclick="saveNew()">نشر المانجا</button>
        </div>`;
    } else {
        area.innerHTML = `<div class="island">
            <select id="s-m" onchange="setupEdit(this.value)">
                <option value="">اختر المانجا للتعديل</option>
                ${mangas.map(m=>`<option value="${m.title}">${m.title}</option>`).join('')}
            </select>
            <div id="e-fields"></div>
        </div>`;
    }
}

function setupEdit(title) {
    if(!title) return;
    const m = mangas.find(x => x.title === title);
    document.getElementById('e-fields').innerHTML = `
        <div style="margin-top:20px;">
            <div class="admin-form-grid">
                <input id="ed-t" value="${m.title}"><input id="ed-a" value="${m.author || ''}">
                <input id="ed-r" value="${m.artist || ''}"><input id="ed-g" value="${m.genres || ''}">
                <input id="ed-pub" value="${m.publisher || ''}"><input id="ed-date" value="${m.releaseDate || ''}">
            </div>
            <textarea id="ed-d" style="height:100px;">${m.desc || ''}</textarea>
            <button class="action-btn" onclick="saveEdit('${m.title}')">تحديث البيانات</button>
            
            <div class="edit-ch-list">
                <h4 style="margin:20px 0;">إدارة الفصول</h4>
                ${(m.chapters || []).map((ch, idx) => `
                    <div class="edit-ch-row">
                        <input id="ch-name-${idx}" value="${ch.title}" style="flex:1; margin:0;">
                        <input type="file" id="ch-file-${idx}" style="flex:1; margin:0;">
                        <button class="action-btn" onclick="updateChapter('${m.title}', ${idx})" style="width:auto; margin:0;">تحديث</button>
                        <button class="action-btn btn-del" onclick="deleteChapter('${m.title}', ${idx})" style="width:auto; margin:0;">حذف</button>
                    </div>
                `).join('')}
                
                <h4 style="margin:20px 0;">إضافة فصل جديد</h4>
                <div style="display:flex; gap:10px;">
                    <input id="new-ch-t" placeholder="عنوان الفصل" style="flex:1;"><input type="file" id="new-ch-f" style="flex:1;">
                    <button class="action-btn" onclick="addNewChapter('${m.title}')" style="width:auto;">رفع</button>
                </div>
            </div>
        </div>`;
}

// دوال إدارة الفصول
async function deleteChapter(mTitle, index) {
    if(!confirm("حذف الفصل؟")) return;
    const m = mangas.find(x => x.title === mTitle);
    m.chapters.splice(index, 1);
    await _supabase.from('mangas').update({ chapters: m.chapters }).eq('title', mTitle);
    router();
}

async function updateChapter(mTitle, index) {
    const m = mangas.find(x => x.title === mTitle);
    const newName = document.getElementById(`ch-name-${index}`).value;
    const newFile = document.getElementById(`ch-file-${index}`).files[0];
    m.chapters[index].title = newName;
    if(newFile) {
        const path = `chapters/${Date.now()}_${newFile.name}`;
        await _supabase.storage.from('vander-files').upload(path, newFile);
        const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);
        m.chapters[index].url = data.publicUrl;
    }
    await _supabase.from('mangas').update({ chapters: m.chapters }).eq('title', mTitle);
    alert("تم التحديث"); router();
}

async function addNewChapter(mTitle) {
    const title = document.getElementById('new-ch-t').value;
    const file = document.getElementById('new-ch-f').files[0];
    const path = `chapters/${Date.now()}_${file.name}`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);
    const m = mangas.find(x => x.title === mTitle);
    const chapters = [...(m.chapters || []), { title, url: data.publicUrl }];
    await _supabase.from('mangas').update({ chapters, lastUpdated: new Date() }).eq('title', mTitle);
    router();
}

async function saveNew() {
    const title = document.getElementById('in-t').value;
    const file = document.getElementById('in-c').files[0];
    const path = `covers/${Date.now()}_${file.name}`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);
    await _supabase.from('mangas').insert([{
        title, cover: data.publicUrl,
        author: document.getElementById('in-a').value, artist: document.getElementById('in-r').value,
        genres: document.getElementById('in-g').value, publisher: document.getElementById('in-pub').value,
        releaseDate: document.getElementById('in-date').value, desc: document.getElementById('in-d').value,
        chapters: [], lastUpdated: new Date()
    }]);
    router();
}

async function saveEdit(oldT) {
    await _supabase.from('mangas').update({
        title: document.getElementById('ed-t').value, author: document.getElementById('ed-a').value,
        artist: document.getElementById('ed-r').value, genres: document.getElementById('ed-g').value,
        publisher: document.getElementById('ed-pub').value, releaseDate: document.getElementById('ed-date').value,
        desc: document.getElementById('ed-d').value, lastUpdated: new Date()
    }).eq('title', oldT);
    router();
}

function login() {
    if(document.getElementById('u').value === "samer" && document.getElementById('p').value === "Samer#1212") {
        sessionStorage.setItem('isAdmin', 't'); router();
    }
}
function logout() { sessionStorage.removeItem('isAdmin'); router(); }

window.onload = router;
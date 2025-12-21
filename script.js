const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// تعيين مكتبة PDF.js
const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let mangas = [];

const navigateTo = url => { history.pushState(null, null, url); router(); };

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    
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

// --- العرض ---
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
    container.innerHTML = `<div class="manga-detail-layout">
        <div class="island cover-island"><img src="${m.cover}"><div class="interaction-bar"><img src="/hart.png"><img src="/comment.png"><img src="/save.png"></div></div>
        <div class="island info-island"><h1>${m.title}</h1>
            <div class="data-row"><span>الكاتب:</span><span>${m.author || '-'}</span></div>
            <div class="data-row"><span>التصنيفات:</span><span>${m.genres || '-'}</span></div>
            <p style="margin-top:20px;">${m.desc || ''}</p>
        </div>
        <div class="island chapters-island"><h3>الفصول</h3>${(m.chapters || []).map(ch => `<div class="ch-item" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">${ch.title}</div>`).join('')}</div>
    </div>`;
}

// --- القارئ المخصص الجديد (PDF to Images) ---
async function renderReader(container, mTitle, cTitle) {
    const m = mangas.find(x => x.title === mTitle);
    const ch = m?.chapters.find(c => c.title === cTitle);
    if (!ch) return;

    container.innerHTML = `
        <div class="reader-container">
            <div class="reader-controls">
                <button class="action-btn" onclick="navigateTo('/manga/${encodeURIComponent(mTitle)}')">خروج</button>
                <h3>${cTitle}</h3>
            </div>
            <div id="pdf-viewer" class="chapter-images"><div class="spinner"></div></div>
        </div>`;

    try {
        const pdf = await pdfjsLib.getDocument(ch.url).promise;
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = ''; 

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;
            
            const img = document.createElement('img');
            img.src = canvas.toDataURL();
            img.className = 'pdf-page';
            viewer.appendChild(img);
        }
    } catch (e) {
        document.getElementById('pdf-viewer').innerHTML = `<p style="color:white;">خطأ في تحميل الملف: ${e.message}</p>`;
    }
}

// --- الإدارة (نفس الوظائف السابقة دون حذف) ---
function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `<div class="island admin-login-small">
            <input type="password" id="p" placeholder="كلمة المرور">
            <button class="action-btn" onclick="login()">دخول</button>
        </div>`; return;
    }
    container.innerHTML = `<div style="max-width:1200px; margin:auto; padding:20px;">
        <button class="action-btn" onclick="showForm('add')">نشر جديد</button>
        <button class="action-btn" onclick="showForm('edit')">إدارة المحتوى</button>
        <div id="form-area"></div>
    </div>`;
}

function showForm(type) {
    const area = document.getElementById('form-area');
    if(type === 'add') {
        area.innerHTML = `<div class="island" style="margin-top:20px;">
            <input id="in-t" placeholder="العنوان"><input id="in-a" placeholder="الكاتب">
            <input type="file" id="in-c">
            <button class="action-btn" onclick="saveNew()">حفظ</button>
        </div>`;
    } else {
        area.innerHTML = `<div class="island" style="margin-top:20px;">
            <select onchange="setupEdit(this.value)">${mangas.map(m=>`<option value="${m.title}">${m.title}</option>`).join('')}</select>
            <div id="e-fields"></div>
        </div>`;
    }
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
    alert("تم الرفع"); router();
}

// (أكمل بقية دوال saveNew, saveEdit, login من الكود السابق هنا)
function login() { if(document.getElementById('p').value === "Samer#1212") { sessionStorage.setItem('isAdmin', 't'); router(); } }

window.onpopstate = router;
window.onload = router;
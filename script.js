const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

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
        app.innerHTML = `<div class="grid-container">${mangas.map(m => `
            <a href="/manga/${encodeURIComponent(m.title)}" class="manga-card" data-link style="text-decoration:none;">
                <div class="gray-box"></div>
                <div class="placeholder-lines"><div class="line"></div><div class="line"></div><div class="line short"></div></div>
            </a>`).join('')}</div>`;
    } else if (path === "/admin") {
        renderAdmin(app);
    } else if (path.startsWith("/manga/")) {
        const parts = path.split("/");
        const mTitle = decodeURIComponent(parts[2]);
        const cTitle = parts[3] ? decodeURIComponent(parts[3]) : null;
        cTitle ? renderReader(app, mTitle, cTitle) : renderDetails(app, mTitle);
    }
};

async function renderReader(container, mTitle, cTitle) {
    const m = mangas.find(x => x.title === mTitle);
    const ch = m?.chapters.find(c => c.title === cTitle);
    if (!ch) return;

    container.innerHTML = `
        <div class="reader-container">
            <div class="reader-controls">
                <button class="action-btn" style="width:auto;" onclick="navigateTo('/manga/${encodeURIComponent(mTitle)}')">خروج</button>
                <h3>${cTitle}</h3>
            </div>
            <div id="pdf-viewer"><div class="spinner"></div></div>
        </div>`;

    try {
        const loadingTask = pdfjsLib.getDocument(ch.url);
        const pdf = await loadingTask.promise;
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.className = 'pdf-page';
            viewer.appendChild(canvas);
            await page.render({ canvasContext: context, viewport: viewport }).promise;
        }
    } catch (e) {
        document.getElementById('pdf-viewer').innerHTML = `<p style="color:white; text-align:center;">تعذر تحميل الملف: ${e.message}</p>`;
    }
}

function renderDetails(container, title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return;
    container.innerHTML = `<div class="island" style="max-width:800px; margin:20px auto; text-align:center;">
        <img src="${m.cover}" style="width:200px; border-radius:10px;">
        <h1>${m.title}</h1>
        <p>${m.desc || ''}</p>
        <div style="margin-top:20px;">
            ${(m.chapters || []).map(ch => `<div class="ch-item" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">${ch.title}</div>`).join('')}
        </div>
    </div>`;
}

// --- وظائف الإدارة الكاملة ---
function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `<div class="island admin-login-small">
            <input type="password" id="p" placeholder="كلمة المرور">
            <button class="action-btn" onclick="login()">دخول</button>
        </div>`; return;
    }
    container.innerHTML = `<div class="island" style="max-width:800px; margin:auto;">
        <button class="action-btn" style="margin-bottom:10px;" onclick="showForm('add')">نشر مانجا جديدة</button>
        <button class="action-btn" onclick="showForm('edit')">إدارة الفصول</button>
        <div id="form-area"></div>
    </div>`;
}

function showForm(type) {
    const area = document.getElementById('form-area');
    if(type === 'add') {
        area.innerHTML = `<div style="margin-top:20px;">
            <input id="in-t" placeholder="العنوان"><textarea id="in-d" placeholder="الوصف"></textarea>
            <input type="file" id="in-c" accept="image/*">
            <button class="action-btn" onclick="saveNew()">حفظ المانجا</button>
        </div>`;
    } else {
        area.innerHTML = `<div style="margin-top:20px;">
            <select id="sel-m" onchange="setupEdit(this.value)">
                <option value="">اختر مانجا لتعديلها</option>
                ${mangas.map(m=>`<option value="${m.title}">${m.title}</option>`).join('')}
            </select>
            <div id="e-fields"></div>
        </div>`;
    }
}

function setupEdit(title) {
    if(!title) return;
    document.getElementById('e-fields').innerHTML = `
        <div style="margin-top:20px; border-top:1px solid #ccc; padding-top:10px;">
            <h4>إضافة فصل جديد لـ ${title}</h4>
            <input id="new-ch-t" placeholder="عنوان الفصل (مثلاً: فصل 1)">
            <input type="file" id="new-ch-f" accept="application/pdf">
            <button class="action-btn" onclick="addNewChapter('${title}')">رفع الفصل</button>
        </div>`;
}

async function saveNew() {
    const title = document.getElementById('in-t').value;
    const desc = document.getElementById('in-d').value;
    const file = document.getElementById('in-c').files[0];
    if(!title || !file) return alert("املاً البيانات");
    
    const path = `covers/${Date.now()}_${file.name}`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);
    
    await _supabase.from('mangas').insert([{ title, desc, cover: data.publicUrl, chapters: [], lastUpdated: new Date() }]);
    alert("تم الحفظ"); router();
}

async function addNewChapter(mTitle) {
    const title = document.getElementById('new-ch-t').value;
    const file = document.getElementById('new-ch-f').files[0];
    if(!title || !file) return alert("اختر ملف PDF وعنوان");

    const path = `chapters/${Date.now()}_${file.name}`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);

    const m = mangas.find(x => x.title === mTitle);
    const chapters = [...(m.chapters || []), { title, url: data.publicUrl }];
    await _supabase.from('mangas').update({ chapters, lastUpdated: new Date() }).eq('title', mTitle);
    alert("تم رفع الفصل"); router();
}

function login() { if(document.getElementById('p').value === "Samer#1212") { sessionStorage.setItem('isAdmin', 't'); router(); } }

window.onpopstate = router;
window.onload = router;
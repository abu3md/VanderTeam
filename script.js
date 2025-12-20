// إعدادات Supabase
const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// التنقل بين الصفحات (Router)
const navigateTo = url => { 
    history.pushState(null, null, url); 
    router(); 
};

const router = async () => {
    const path = window.location.pathname;
    const app = document.getElementById('app');
    
    // شاشة تحميل بسيطة
    app.innerHTML = '<div style="text-align:center; padding:100px; color:white;"><div class="spinner"></div></div>';

    // جلب البيانات من Supabase
    const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    if (error) console.error("Error fetching data:", error);
    mangas = data || [];

    // تحديد الصفحة المراد عرضها
    if (path === "/" || path === "/index.html") {
        app.innerHTML = `<div class="site-banner"></div>` + renderHome();
    } else if (path === "/admin") {
        renderAdmin(app);
    } else if (path.startsWith("/manga/")) {
        const parts = path.split("/");
        const mTitle = decodeURIComponent(parts[2]);
        const cTitle = parts[3] ? decodeURIComponent(parts[3]) : null;
        
        if (cTitle) {
            renderReader(app, mTitle, cTitle);
        } else {
            renderDetails(app, mTitle);
        }
    }
};

// مراقبة أزرار المتصفح (للخلف وللأمام)
window.onpopstate = router;

// جعل الروابط تعمل بدون إعادة تحميل الصفحة
document.addEventListener("click", e => {
    if (e.target.closest("[data-link]")) { 
        e.preventDefault(); 
        navigateTo(e.target.closest("[data-link]").href); 
    }
});

// --- وظائف العرض (Rendering) ---

function renderHome() {
    if (mangas.length === 0) return '<p style="text-align:center; color:white; padding:50px;">لا توجد مانجا حالياً.</p>';
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
    if (!m) return container.innerHTML = "<h1 style='color:white; text-align:center;'>المحتوى غير موجود</h1>";
    
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
                <div class="data-row"><span>تاريخ التحديث:</span> <span>${new Date(m.lastUpdated).toLocaleDateString('ar-EG')}</span></div>
                <div class="data-row"><span>الكاتب:</span> <span>${m.author || '-'}</span></div>
                <div class="data-row"><span>الرسام:</span> <span>${m.artist || '-'}</span></div>
                <div class="data-row"><span>التصنيفات:</span> <span>${m.genres || '-'}</span></div>
                <div class="data-row"><span>الناشر:</span> <span>${m.publisher || '-'}</span></div>
                <div class="data-row"><span>تاريخ الصدور:</span> <span>${m.releaseDate || '-'}</span></div>
                <hr style="margin:20px 0;">
                <p style="line-height:1.8; white-space: pre-wrap;">${m.desc || 'لا يوجد وصف متاح.'}</p>
            </div>
            <div class="island chapters-island">
                <h3 style="margin-bottom:15px; text-align:center;">قائمة الفصول</h3>
                <div style="max-height: 500px; overflow-y: auto;">
                    ${(m.chapters || []).length > 0 
                        ? m.chapters.map(ch => `<div class="ch-item" onclick="navigateTo('/manga/${encodeURIComponent(m.title)}/${encodeURIComponent(ch.title)}')">${ch.title}</div>`).join('')
                        : '<p style="text-align:center; color:#999;">لا توجد فصول بعد.</p>'}
                </div>
            </div>
        </div>`;
}

// --- القارئ المتطور (PDF to Smooth Images) ---

async function renderReader(container, mTitle, cTitle) {
    const m = mangas.find(x => x.title === mTitle);
    const ch = m?.chapters.find(c => c.title === cTitle);
    if (!ch) return container.innerHTML = "<h1 style='color:white; text-align:center;'>الفصل غير موجود</h1>";

    container.innerHTML = `
        <div class="reader-container">
            <div class="reader-controls">
                <button class="action-btn" style="width:auto;" onclick="navigateTo('/manga/${encodeURIComponent(mTitle)}')">خروج</button>
                <h3 style="font-size:1.1rem;">${mTitle} - ${cTitle}</h3>
            </div>
            <div id="reader-pages" class="chapter-images">
                <div class="spinner"></div>
                <p style="color:white; text-align:center;">جاري معالجة الصفحات... (يرجى الانتظار قليلاً)</p>
            </div>
        </div>`;
    
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        
        // جلب الملف عبر Fetch لتجاوز قيود المتصفح المباشرة
        const response = await fetch(ch.url, { mode: 'cors' });
        if (!response.ok) throw new Error("Network response was not ok");
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const pagesContainer = document.getElementById('reader-pages');
        pagesContainer.innerHTML = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2 }); // دقة عالية
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport }).promise;
            
            const img = new Image();
            img.src = canvas.toDataURL('image/jpeg', 0.85); // ضغط خفيف للأداء
            pagesContainer.appendChild(img);
        }
    } catch (e) {
        console.error("Reader Error:", e);
        document.getElementById('reader-pages').innerHTML = `
            <div style="text-align:center; padding:40px; color: #ff4d4d;">
                <p>⚠️ تعذر قراءة الملف برمجياً.</p>
                <p style="font-size: 13px; margin-bottom:15px;">قد يكون السبب هو إعدادات CORS في Supabase.</p>
                <a href="${ch.url}" target="_blank" class="action-btn" style="display:inline-block; text-decoration:none;">فتح الملف يدوياً</a>
            </div>`;
    }
}

// --- لوحة التحكم (Admin) ---

function renderAdmin(container) {
    if (!sessionStorage.getItem('isAdmin')) {
        container.innerHTML = `<div class="island admin-login-small">
            <h4 style="text-align:center; margin-bottom:15px;">دخول المشرفين</h4>
            <input type="text" id="u" placeholder="الاسم">
            <input type="password" id="p" placeholder="كلمة المرور">
            <button class="action-btn" onclick="login()">دخول</button>
        </div>`; return;
    }
    container.innerHTML = `<div style="max-width:1200px; margin:auto; padding:20px;">
        <div style="display:flex; gap:10px; margin-bottom:20px;">
            <button class="action-btn" onclick="showForm('add')">نشر مانجا جديدة</button>
            <button class="action-btn" onclick="showForm('edit')">إدارة المانجا والفصول</button>
            <button class="action-btn" style="background:var(--accent)" onclick="logout()">خروج</button>
        </div>
        <div id="form-area"></div>
    </div>`;
}

function showForm(type) {
    const area = document.getElementById('form-area');
    if(type === 'add') {
        area.innerHTML = `<div class="island">
            <h3>بيانات المانجا الجديدة</h3>
            <div class="admin-form-grid">
                <input id="in-t" placeholder="العنوان"><input id="in-a" placeholder="الكاتب">
                <input id="in-r" placeholder="الرسام"><input id="in-g" placeholder="التصنيفات">
                <input id="in-pub" placeholder="الناشر"><input id="in-date" placeholder="تاريخ الصدور">
            </div>
            <textarea id="in-d" placeholder="الوصف الكامل" style="height:100px;"></textarea>
            <p>اختر غلاف المانجا:</p>
            <input type="file" id="in-c">
            <button class="action-btn" onclick="saveNew()">نشر المانجا</button>
        </div>`;
    } else {
        area.innerHTML = `<div class="island">
            <select id="s-m" onchange="setupEdit(this.value)">
                <option value="">-- اختر المانجا للتعديل --</option>
                ${mangas.map(m=>`<option value="${m.title}">${m.title}</option>`).join('')}
            </select>
            <div id="e-fields"></div>
        </div>`;
    }
}

function setupEdit(title) {
    if(!title) return;
    const m = mangas.find(x => x.title === title);
    const eFields = document.getElementById('e-fields');
    eFields.innerHTML = `
        <div style="margin-top:20px;">
            <h4>تعديل معلومات المانجا الأساسية</h4>
            <div class="admin-form-grid">
                <input id="ed-t" value="${m.title}"><input id="ed-a" value="${m.author || ''}">
                <input id="ed-r" value="${m.artist || ''}"><input id="ed-g" value="${m.genres || ''}">
                <input id="ed-pub" value="${m.publisher || ''}"><input id="ed-date" value="${m.releaseDate || ''}">
            </div>
            <textarea id="ed-d" style="height:100px;">${m.desc || ''}</textarea>
            <button class="action-btn" onclick="saveEdit('${m.title}')">حفظ التغييرات</button>
            
            <div class="edit-ch-list">
                <h4 style="margin:25px 0 15px;">إدارة الفصول المرفوعة</h4>
                ${(m.chapters || []).map((ch, idx) => `
                    <div class="edit-ch-row">
                        <input id="ch-name-${idx}" value="${ch.title}" style="flex:1; margin:0;">
                        <input type="file" id="ch-file-${idx}" style="flex:1; margin:0;" title="اختر ملف جديد لاستبدال الحالي">
                        <button class="action-btn" onclick="updateChapter('${m.title}', ${idx})" style="width:auto; margin:0;">تحديث</button>
                        <button class="action-btn btn-del" onclick="deleteChapter('${m.title}', ${idx})" style="width:auto; margin:0;">حذف</button>
                    </div>
                `).join('')}
                
                <h4 style="margin-top:25px;">إضافة فصل جديد لهذه المانجا</h4>
                <div style="display:flex; gap:10px;">
                    <input id="new-ch-t" placeholder="رقم أو اسم الفصل" style="flex:1;">
                    <input type="file" id="new-ch-f" style="flex:1;">
                    <button class="action-btn" onclick="addNewChapter('${m.title}')" style="width:auto;">رفع الفصل</button>
                </div>
            </div>
        </div>`;
}

// --- العمليات على البيانات (Supabase Actions) ---

async function deleteChapter(mTitle, index) {
    if(!confirm("هل أنت متأكد من حذف هذا الفصل نهائياً؟")) return;
    const m = mangas.find(x => x.title === mTitle);
    m.chapters.splice(index, 1);
    const { error } = await _supabase.from('mangas').update({ chapters: m.chapters }).eq('title', mTitle);
    if (!error) { alert("تم الحذف بنجاح"); router(); }
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
    
    const { error } = await _supabase.from('mangas').update({ chapters: m.chapters }).eq('title', mTitle);
    if (!error) { alert("تم تحديث الفصل"); router(); }
}

async function addNewChapter(mTitle) {
    const title = document.getElementById('new-ch-t').value;
    const file = document.getElementById('new-ch-f').files[0];
    if(!title || !file) return alert("يرجى إدخال اسم الفصل واختيار ملف PDF");

    const path = `chapters/${Date.now()}_${file.name}`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);

    const m = mangas.find(x => x.title === mTitle);
    const chapters = [...(m.chapters || []), { title, url: data.publicUrl }];
    
    const { error } = await _supabase.from('mangas').update({ 
        chapters, 
        lastUpdated: new Date() 
    }).eq('title', mTitle);
    
    if (!error) { alert("تم الرفع!"); router(); }
}

async function saveNew() {
    const title = document.getElementById('in-t').value;
    const file = document.getElementById('in-c').files[0];
    if(!title || !file) return alert("العنوان والغلاف مطلوبان");

    const path = `covers/${Date.now()}_${file.name}`;
    await _supabase.storage.from('vander-files').upload(path, file);
    const { data } = _supabase.storage.from('vander-files').getPublicUrl(path);

    const { error } = await _supabase.from('mangas').insert([{
        title, 
        cover: data.publicUrl,
        author: document.getElementById('in-a').value,
        artist: document.getElementById('in-r').value,
        genres: document.getElementById('in-g').value,
        publisher: document.getElementById('in-pub').value,
        releaseDate: document.getElementById('in-date').value,
        desc: document.getElementById('in-d').value,
        chapters: [], 
        lastUpdated: new Date()
    }]);

    if (!error) { alert("تم النشر بنجاح"); router(); }
}

async function saveEdit(oldT) {
    const { error } = await _supabase.from('mangas').update({
        title: document.getElementById('ed-t').value,
        author: document.getElementById('ed-a').value,
        artist: document.getElementById('ed-r').value,
        genres: document.getElementById('ed-g').value,
        publisher: document.getElementById('ed-pub').value,
        releaseDate: document.getElementById('ed-date').value,
        desc: document.getElementById('ed-d').value,
        lastUpdated: new Date()
    }).eq('title', oldT);

    if (!error) { alert("تم تحديث البيانات بنجاح"); router(); }
}

// --- نظام الدخول ---

function login() {
    const u = document.getElementById('u').value;
    const p = document.getElementById('p').value;
    if(u === "samer" && p === "Samer#1212") {
        sessionStorage.setItem('isAdmin', 't'); 
        router();
    } else {
        alert("بيانات الدخول خاطئة!");
    }
}

function logout() { 
    sessionStorage.removeItem('isAdmin'); 
    router(); 
}

// تشغيل الراوتر عند تحميل الصفحة
window.onload = router;
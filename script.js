// إدارة البيانات باستخدام التخزين المحلي لضمان العمل على Vercel فوراً
let mangas = JSON.parse(localStorage.getItem('vanderData')) || [];
let currentManga = null;

// دالة التنقل بين الصفحات
function showSection(id) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden-section'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden-section');
    if(id === 'home-view') renderHome();
}

// العرض الرئيسي
function renderHome() {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = '';
    mangas.sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    
    mangas.forEach(m => {
        const div = document.createElement('div');
        div.className = 'manga-card';
        div.onclick = () => openManga(m.id);
        div.innerHTML = `
            <img src="${m.cover}" class="card-image">
            <div class="manga-title-overlay">${m.title}</div>
        `;
        grid.appendChild(div);
    });
}

// تسجيل الدخول
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if(u === 'samer' && p === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else {
        document.getElementById('login-error').innerText = "خطأ في البيانات";
    }
}

function checkAdminStatus() {
    if(sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        updateSelect();
    } else {
        showSection('login-view');
    }
}

function logout() {
    sessionStorage.removeItem('isAdmin');
    showSection('home-view');
}

// تبويبات الأدمن
function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-manga-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'add-chapter-panel');
}

// إضافة مانجا
function addNewManga() {
    const file = document.getElementById('manga-cover').files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const newM = {
            id: Date.now(),
            title: document.getElementById('manga-title').value,
            author: document.getElementById('manga-author').value,
            artist: document.getElementById('manga-artist').value,
            desc: document.getElementById('manga-desc').value,
            cover: e.target.result,
            lastUpdated: new Date().toISOString(),
            chapters: []
        };
        mangas.push(newM);
        localStorage.setItem('vanderData', JSON.stringify(mangas));
        alert("تم الحفظ!");
        showSection('home-view');
    };
    reader.readAsDataURL(file);
}

function updateSelect() {
    const s = document.getElementById('manga-select');
    s.innerHTML = '<option value="">اختر المانجا</option>';
    mangas.forEach(m => {
        s.innerHTML += `<option value="${m.id}">${m.title}</option>`;
    });
}

// إضافة فصل
function addChapter() {
    const id = document.getElementById('manga-select').value;
    const file = document.getElementById('chapter-file').files[0];
    const title = document.getElementById('chapter-title').value;

    if(!id || !file) return alert("اختر المانجا والملف");

    const m = mangas.find(x => x.id == id);
    // ملاحظة: التخزين المحلي محدود المساحة، يفضل رفع ملفات صغيرة للتجربة
    // في Vercel مع Firebase سيعمل بشكل أفضل
    const reader = new FileReader();
    reader.onload = function(e) {
        m.chapters.push({ title: title, url: e.target.result, date: new Date().toLocaleDateString() });
        m.lastUpdated = new Date().toISOString();
        localStorage.setItem('vanderData', JSON.stringify(mangas));
        alert("تم رفع الفصل!");
    };
    reader.readAsDataURL(file);
}

// عرض التفاصيل
function openManga(id) {
    currentManga = mangas.find(x => x.id == id);
    document.getElementById('detail-cover').src = currentManga.cover;
    document.getElementById('detail-title').innerText = currentManga.title;
    document.getElementById('detail-author').innerText = currentManga.author;
    document.getElementById('detail-desc').innerText = currentManga.desc;
    
    const list = document.getElementById('chapters-list');
    list.innerHTML = '';
    currentManga.chapters.forEach(c => {
        const li = document.createElement('li');
        li.innerText = c.title;
        li.onclick = () => {
            document.getElementById('pdf-viewer').src = c.url;
            document.getElementById('reader-chapter-title').innerText = c.title;
            showSection('reader-view');
        };
        list.appendChild(li);
    });
    showSection('manga-details-view');
}

function backToManga() {
    showSection('manga-details-view');
}

// بحث
function filterManga() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtered = mangas.filter(m => m.title.toLowerCase().includes(q));
    // إعادة رسم الشبكة بناء على البحث
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = '';
    filtered.forEach(m => {
        const div = document.createElement('div');
        div.className = 'manga-card';
        div.onclick = () => openManga(m.id);
        div.innerHTML = `<img src="${m.cover}" class="card-image"><div class="manga-title-overlay">${m.title}</div>`;
        grid.appendChild(div);
    });
}

// تشغيل عند البداية
window.onload = () => {
    document.getElementById('loading-overlay').classList.add('hidden-section');
    renderHome();
};
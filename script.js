// إدارة البيانات
let mangas = JSON.parse(localStorage.getItem('vanderData')) || [];

// التنقل
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if(id === 'home-view') renderHome();
}

// العرض الرئيسي
function renderHome() {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = '';
    mangas.sort((a,b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    mangas.forEach(m => {
        grid.innerHTML += `
            <div class="manga-card" onclick="openManga('${m.id}')">
                <img src="${m.cover}" class="card-image">
                <div class="manga-title-overlay">${m.title}</div>
            </div>`;
    });
}

// نظام الأدمن
function checkAdminStatus() {
    if(sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        refreshAdminSelects();
    } else {
        showSection('login-view');
    }
}

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if(u === 'samer' && p === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else {
        alert("خطأ في البيانات");
    }
}

function logout() {
    sessionStorage.removeItem('isAdmin');
    showSection('home-view');
}

function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-manga-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

// إضافة وحذف وتعديل
function refreshAdminSelects() {
    const html = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add-chapter').innerHTML = '<option value="">اختر المانجا</option>' + html;
    document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر المانجا للإدارة</option>' + html;
}

function addNewManga() {
    const file = document.getElementById('manga-cover').files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        mangas.push({
            id: 'm-' + Date.now(),
            title: document.getElementById('manga-title').value,
            desc: document.getElementById('manga-desc').value,
            cover: e.target.result,
            lastUpdated: new Date().toISOString(),
            chapters: []
        });
        save();
        alert("تم الحفظ");
        refreshAdminSelects();
    };
    reader.readAsDataURL(file);
}

function addChapter() {
    const id = document.getElementById('manga-select-add-chapter').value;
    const file = document.getElementById('chapter-file').files[0];
    const title = document.getElementById('chapter-title').value;
    if(!id || !file) return alert("اكمل البيانات");

    const reader = new FileReader();
    reader.onload = (e) => {
        const m = mangas.find(x => x.id === id);
        m.chapters.push({ id: 'c-'+Date.now(), title, url: e.target.result });
        m.lastUpdated = new Date().toISOString();
        save();
        alert("تم رفع الفصل");
    };
    reader.readAsDataURL(file);
}

// الإدارة (تعديل/حذف)
let editingId = null;
function loadMangaForEdit() {
    editingId = document.getElementById('manga-select-manage').value;
    if(!editingId) return document.getElementById('edit-area').classList.add('hidden-section');
    
    const m = mangas.find(x => x.id === editingId);
    document.getElementById('edit-area').classList.remove('hidden-section');
    document.getElementById('edit-title').value = m.title;
    document.getElementById('edit-desc').value = m.desc;
    
    const cList = document.getElementById('edit-chapters-list');
    cList.innerHTML = m.chapters.map(c => `
        <li>${c.title} <button onclick="deleteChapter('${c.id}')" class="delete-btn" style="padding:2px 5px">حذف</button></li>
    `).join('');
}

function updateManga() {
    const m = mangas.find(x => x.id === editingId);
    m.title = document.getElementById('edit-title').value;
    m.desc = document.getElementById('edit-desc').value;
    save();
    alert("تم التحديث");
    renderHome();
}

function deleteManga() {
    if(confirm("هل أنت متأكد من حذف المانجا نهائياً؟")) {
        mangas = mangas.filter(x => x.id !== editingId);
        save();
        refreshAdminSelects();
        document.getElementById('edit-area').classList.add('hidden-section');
    }
}

function deleteChapter(chapId) {
    const m = mangas.find(x => x.id === editingId);
    m.chapters = m.chapters.filter(c => c.id !== chapId);
    save();
    loadMangaForEdit();
}

// القارئ
function openManga(id) {
    const m = mangas.find(x => x.id === id);
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc;
    
    const list = document.getElementById('chapters-list');
    list.innerHTML = m.chapters.map(c => `<li onclick="viewPDF('${c.url}', '${c.title}')">${c.title}</li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    const wrapper = document.getElementById('pdf-wrapper');
    // استخدام embed بدلاً من iframe لحل مشاكل عرض PDF في بعض المتصفحات
    wrapper.innerHTML = `<embed src="${url}" type="application/pdf">`;
    showSection('reader-view');
}

function backToManga() { showSection('manga-details-view'); }

function save() { localStorage.setItem('vanderData', JSON.stringify(mangas)); }

function filterManga() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.manga-card');
    cards.forEach(c => {
        const t = c.innerText.toLowerCase();
        c.style.display = t.includes(q) ? 'block' : 'none';
    });
}

window.onload = () => { renderHome(); };
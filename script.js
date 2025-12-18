// البيانات في التخزين المحلي
let mangas = JSON.parse(localStorage.getItem('vanderDB')) || [];

function save() {
    localStorage.setItem('vanderDB', JSON.stringify(mangas));
}

// التنقل
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if(id === 'home-view') renderHome();
}

// عرض الرئيسية
function renderHome() {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = '';
    mangas.forEach(m => {
        grid.innerHTML += `
            <div class="manga-card" onclick="openManga('${m.id}')">
                <img src="${m.cover}" class="card-image">
                <div class="manga-title-overlay">${m.title}</div>
            </div>`;
    });
}

// الأدمن
function checkAdminStatus() {
    if(sessionStorage.getItem('isVanderAdmin')) {
        showSection('admin-dashboard');
        updateAdminSelects();
    } else {
        showSection('login-view');
    }
}

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if(u === 'samer' && p === 'Samer#1212') {
        sessionStorage.setItem('isVanderAdmin', 'true');
        checkAdminStatus();
    } else {
        document.getElementById('login-error').innerText = "بيانات خاطئة";
    }
}

function logout() {
    sessionStorage.removeItem('isVanderAdmin');
    showSection('home-view');
}

function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

// إدارة البيانات
function updateAdminSelects() {
    const options = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = '<option value="">اختر مانجا</option>' + options;
    document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر مانجا للإدارة</option>' + options;
}

function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const coverFile = document.getElementById('manga-cover').files[0];

    if(!title || !coverFile) return alert("أكمل البيانات");

    const reader = new FileReader();
    reader.onload = function(e) {
        mangas.push({
            id: 'm' + Date.now(),
            title, desc, cover: e.target.result,
            chapters: [], lastUpdated: new Date()
        });
        save();
        alert("تمت الإضافة");
        updateAdminSelects();
        renderHome();
    };
    reader.readAsDataURL(coverFile);
}

function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const cTitle = document.getElementById('chapter-title').value;
    const cFile = document.getElementById('chapter-file').files[0];

    if(!mId || !cFile) return alert("أكمل البيانات");

    const reader = new FileReader();
    reader.onload = function(e) {
        const m = mangas.find(x => x.id === mId);
        m.chapters.push({ id: 'c' + Date.now(), title: cTitle, url: e.target.result });
        m.lastUpdated = new Date();
        save();
        alert("تم رفع الفصل");
    };
    reader.readAsDataURL(cFile);
}

// تعديل وحذف
let currentEditId = null;
function loadMangaToEdit() {
    currentEditId = document.getElementById('manga-select-manage').value;
    if(!currentEditId) return document.getElementById('edit-box').classList.add('hidden-section');
    
    const m = mangas.find(x => x.id === currentEditId);
    document.getElementById('edit-box').classList.remove('hidden-section');
    document.getElementById('edit-manga-title').value = m.title;
    document.getElementById('edit-manga-desc').value = m.desc;
    
    const list = document.getElementById('edit-chapters-list');
    list.innerHTML = m.chapters.map(c => `
        <li>${c.title} <button class="delete-btn" onclick="deleteChapter('${c.id}')">حذف</button></li>
    `).join('');
}

function updateManga() {
    const m = mangas.find(x => x.id === currentEditId);
    m.title = document.getElementById('edit-manga-title').value;
    m.desc = document.getElementById('edit-manga-desc').value;
    save();
    alert("تم التحديث");
    renderHome();
}

function deleteManga() {
    if(confirm("حذف المانجا نهائياً؟")) {
        mangas = mangas.filter(x => x.id !== currentEditId);
        save();
        updateAdminSelects();
        document.getElementById('edit-box').classList.add('hidden-section');
        renderHome();
    }
}

function deleteChapter(cId) {
    const m = mangas.find(x => x.id === currentEditId);
    m.chapters = m.chapters.filter(c => c.id !== cId);
    save();
    loadMangaToEdit();
}

// العرض والقارئ
function openManga(id) {
    const m = mangas.find(x => x.id === id);
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc;
    
    const list = document.getElementById('chapters-list');
    list.innerHTML = m.chapters.map(c => `<li onclick="openReader('${c.url}', '${c.title}')">${c.title}</li>`).join('');
    showSection('manga-details-view');
}

function openReader(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    const container = document.getElementById('pdf-container');
    // حل مشكلة عرض PDF في المتصفح عبر iframe مع blob/base64
    container.innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

function backToManga() { showSection('manga-details-view'); }

function filterManga() {
    const val = document.getElementById('search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.manga-card');
    cards.forEach(c => {
        c.style.display = c.innerText.toLowerCase().includes(val) ? 'block' : 'none';
    });
}

window.onload = renderHome;
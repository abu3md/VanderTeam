// التخزين المحلي (LocalStorage) - سيظل يعمل طالما لم يتم مسح بيانات المتصفح
let mangas = JSON.parse(localStorage.getItem('vanderDB')) || [];

function saveToStorage() {
    localStorage.setItem('vanderDB', JSON.stringify(mangas));
}

// دالة التنقل
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if (id === 'home-view') renderHome();
}

// عرض الصفحة الرئيسية
function renderHome() {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = '';
    mangas.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
    mangas.forEach(m => {
        const card = document.createElement('div');
        card.className = 'manga-card';
        card.onclick = () => openManga(m.id);
        card.innerHTML = `
            <img src="${m.cover}" class="card-image">
            <div class="manga-title-overlay">${m.title}</div>
        `;
        grid.appendChild(card);
    });
}

// نظام الأدمن
function checkAdminStatus() {
    if (sessionStorage.getItem('vander_admin')) {
        showSection('admin-dashboard');
        updateAdminSelects();
    } else {
        showSection('login-view');
    }
}

function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u === 'samer' && p === 'Samer#1212') {
        sessionStorage.setItem('vander_admin', 'true');
        checkAdminStatus();
    } else {
        document.getElementById('login-error').innerText = "بيانات الدخول غير صحيحة";
    }
}

function logout() {
    sessionStorage.removeItem('vander_admin');
    showSection('home-view');
}

function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

// إضافة البيانات
function updateAdminSelects() {
    const options = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = '<option value="">اختر المانجا</option>' + options;
    document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر المانجا</option>' + options;
}

function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("الرجاء إدخال الاسم والغلاف");

    const reader = new FileReader();
    reader.onload = (e) => {
        mangas.push({
            id: 'm' + Date.now(),
            title, desc, cover: e.target.result,
            chapters: [], lastUpdated: new Date().toISOString()
        });
        saveToStorage();
        alert("تمت إضافة المانجا بنجاح!");
        updateAdminSelects();
        renderHome();
    };
    reader.readAsDataURL(file);
}

function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if (!mId || !file) return alert("أكمل بيانات الفصل");

    const reader = new FileReader();
    reader.onload = (e) => {
        const m = mangas.find(x => x.id === mId);
        m.chapters.push({ id: 'c' + Date.now(), title, url: e.target.result });
        m.lastUpdated = new Date().toISOString();
        saveToStorage();
        alert("تم رفع الفصل بنجاح!");
    };
    reader.readAsDataURL(file);
}

// تعديل وحذف
let editId = null;
function loadMangaToEdit() {
    editId = document.getElementById('manga-select-manage').value;
    if (!editId) return document.getElementById('edit-box').classList.add('hidden-section');

    const m = mangas.find(x => x.id === editId);
    document.getElementById('edit-box').classList.remove('hidden-section');
    document.getElementById('edit-manga-title').value = m.title;
    document.getElementById('edit-manga-desc').value = m.desc;

    const list = document.getElementById('edit-chapters-list');
    list.innerHTML = m.chapters.map(c => `
        <li>${c.title} <button class="action-btn delete-btn" onclick="deleteChapter('${c.id}')" style="padding:4px 8px; font-size:12px">حذف</button></li>
    `).join('');
}

function updateManga() {
    const m = mangas.find(x => x.id === editId);
    m.title = document.getElementById('edit-manga-title').value;
    m.desc = document.getElementById('edit-manga-desc').value;
    saveToStorage();
    alert("تم تحديث البيانات");
    renderHome();
}

function deleteManga() {
    if (confirm("هل تريد حذف المانجا وكل فصولها نهائياً؟")) {
        mangas = mangas.filter(x => x.id !== editId);
        saveToStorage();
        updateAdminSelects();
        document.getElementById('edit-box').classList.add('hidden-section');
        renderHome();
    }
}

function deleteChapter(cId) {
    const m = mangas.find(x => x.id === editId);
    m.chapters = m.chapters.filter(c => c.id !== cId);
    saveToStorage();
    loadMangaToEdit();
}

// عرض القارئ
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
    const container = document.getElementById('pdf-viewer-container');
    // استخدام iframe لعرض الـ Base64 الخاص بالـ PDF
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
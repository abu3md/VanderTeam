// إعداد الاتصال بـ Supabase باستخدام رابطك
const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// إظهار/إخفاء شاشة التحميل
function showLoader(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden-section', !show);
}

// جلب المانجا من Supabase
async function fetchData() {
    showLoader(true);
    const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    if (!error) {
        mangas = data;
        renderHome();
    }
    showLoader(false);
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if (id === 'home-view') fetchData();
}

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

// نظام الدخول
function login() {
    if (document.getElementById('username').value === 'samer' && 
        document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else {
        alert("بيانات خاطئة");
    }
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        updateSelects();
    } else {
        showSection('login-view');
    }
}

function logout() {
    sessionStorage.removeItem('isAdmin');
    showSection('home-view');
}

function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

function updateSelects() {
    const html = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = '<option value="">اختر المانجا</option>' + html;
    document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر للإدارة</option>' + html;
}

// إضافة مانجا جديدة للسيرفر
async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("أكمل البيانات");
    showLoader(true);

    // 1. رفع الغلاف للـ Storage
    const fileName = `covers/${Date.now()}_${file.name}`;
    const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);
    if (upErr) { showLoader(false); return alert("خطأ في رفع الصورة"); }

    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    // 2. الحفظ في قاعدة البيانات
    await _supabase.from('mangas').insert([{
        title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
    }]);

    alert("تم الحفظ في السيرفر!");
    fetchData();
}

// رفع فصل جديد
async function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if (!mId || !file) return alert("اختر المانجا والملف");
    showLoader(true);

    const fileName = `chapters/${Date.now()}.pdf`;
    await _supabase.storage.from('vander-files').upload(fileName, file);
    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    const m = mangas.find(x => x.id == mId);
    const updatedChapters = [...m.chapters, { id: Date.now(), title, url: urlData.publicUrl }];

    await _supabase.from('mangas').update({ chapters: updatedChapters, lastUpdated: new Date() }).eq('id', mId);

    alert("تم رفع الفصل أونلاين!");
    fetchData();
}

// عرض التفاصيل والقارئ
function openManga(id) {
    const m = mangas.find(x => x.id == id);
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc;
    document.getElementById('chapters-list').innerHTML = m.chapters.map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')">${c.title}</li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

function backToManga() { showSection('manga-details-view'); }

// البحث
function filterManga() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.manga-card');
    cards.forEach(c => c.style.display = c.innerText.toLowerCase().includes(q) ? 'block' : 'none');
}

window.onload = fetchData;
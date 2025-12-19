const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// التحكم في شاشة التحميل
function toggleLoader(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden-section', !show);
}

// جلب البيانات من Supabase
async function loadData() {
    toggleLoader(true);
    try {
        const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
        if (error) throw error;
        mangas = data || [];
        renderHome();
        updateAdminSelects();
    } catch (err) {
        console.error("خطأ جلب البيانات:", err.message);
    }
    toggleLoader(false);
}

// تنقل الصفحات
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if (id === 'home-view') loadData();
}

// عرض المانجا في الصفحة الرئيسية
function renderHome() {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = mangas.length ? '' : '<p>لا توجد مانجا حالياً</p>';
    mangas.forEach(m => {
        grid.innerHTML += `
            <div class="manga-card" onclick="openManga('${m.title}')">
                <img src="${m.cover}" class="card-image" onerror="this.src='mainL.png'">
                <div class="manga-title-overlay">${m.title}</div>
            </div>`;
    });
}

// إضافة مانجا جديدة
async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("الرجاء إدخال الاسم والغلاف");

    toggleLoader(true);
    try {
        const fileName = `covers/${Date.now()}_cover.png`;
        const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);
        if (upErr) throw upErr;

        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const { error: dbErr } = await _supabase.from('mangas').insert([{
            title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
        }]);

        if (dbErr) throw dbErr;
        alert("تم الحفظ بنجاح");
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// إدارة التعديل والحذف
function loadMangaToEdit() {
    const selectedTitle = document.getElementById('manga-select-manage').value;
    const m = mangas.find(x => x.title === selectedTitle);
    if (!m) return;

    document.getElementById('edit-box').classList.remove('hidden-section');
    document.getElementById('edit-manga-title').value = m.title;
    document.getElementById('edit-manga-desc').value = m.desc;
}

async function updateManga() {
    const oldTitle = document.getElementById('manga-select-manage').value;
    const newTitle = document.getElementById('edit-manga-title').value;
    const newDesc = document.getElementById('edit-manga-desc').value;

    toggleLoader(true);
    const { error } = await _supabase.from('mangas')
        .update({ title: newTitle, desc: newDesc })
        .eq('title', oldTitle);

    if (error) alert(error.message);
    else { alert("تم التحديث"); loadData(); }
    toggleLoader(false);
}

async function deleteManga() {
    if (!confirm("هل أنت متأكد من حذف هذه المانجا نهائياً؟")) return;
    const title = document.getElementById('manga-select-manage').value;

    toggleLoader(true);
    const { error } = await _supabase.from('mangas').delete().eq('title', title);
    if (error) alert(error.message);
    else { alert("تم الحذف"); loadData(); }
    toggleLoader(false);
}

// عرض التفاصيل والقراءة
function openManga(title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return;
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc;
    document.getElementById('chapters-list').innerHTML = (m.chapters || []).map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')">${c.title} <span>قراءة ←</span></li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

function backToManga() { showSection('manga-details-view'); }

// لوحة التحكم والتبويبات
function showAdminTab(tabId) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(tabId).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', tabId === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', tabId === 'manage-panel');
}

function updateAdminSelects() {
    const options = '<option value="">اختر المانجا</option>' + 
                    mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = options;
    document.getElementById('manga-select-manage').innerHTML = options;
}

// نظام الدخول
function login() {
    const u = document.getElementById('username').value;
    const p = document.getElementById('password').value;
    if (u === 'samer' && p === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("خطأ في البيانات");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        updateAdminSelects();
    } else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

window.onload = loadData;
const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// جلب البيانات
async function loadData() {
    toggleLoader(true);
    try {
        const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
        if (error) throw error;
        mangas = data || [];
        renderHome();
        updateAdminOptions();
    } catch (err) {
        console.error(err.message);
    }
    toggleLoader(false);
}

function renderHome() {
    const grid = document.getElementById('manga-grid');
    grid.innerHTML = mangas.map(m => `
        <div class="manga-card" onclick="openManga('${m.title}')">
            <img src="${m.cover}" class="card-image" onerror="this.src='mainL.png'">
            <div class="manga-title-overlay">${m.title}</div>
        </div>
    `).join('');
}

// التحكم في الأقسام
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if (id === 'home-view') loadData();
}

function showAdminTab(tabId) {
    // إخفاء جميع محتويات الأدمن أولاً
    document.getElementById('add-panel').classList.add('hidden-section');
    document.getElementById('manage-panel').classList.add('hidden-section');
    
    // إظهار التبويب المختار
    document.getElementById(tabId).classList.remove('hidden-section');
    
    // تغيير شكل الأزرار
    document.getElementById('btn-tab-1').classList.toggle('active-tab', tabId === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', tabId === 'manage-panel');
}

// تعديل المانجا (إظهار الخيارات)
function loadMangaToEdit() {
    const selectedTitle = document.getElementById('manga-select-manage').value;
    const editBox = document.getElementById('edit-box');
    
    if (!selectedTitle) {
        editBox.classList.add('hidden-section');
        return;
    }

    const manga = mangas.find(m => m.title === selectedTitle);
    if (manga) {
        editBox.classList.remove('hidden-section');
        document.getElementById('editing-now-name').innerText = manga.title;
        document.getElementById('edit-manga-title').value = manga.title;
        document.getElementById('edit-manga-desc').value = manga.desc || '';
    }
}

// تحديث المانجا
async function updateManga() {
    const oldTitle = document.getElementById('manga-select-manage').value;
    const newTitle = document.getElementById('edit-manga-title').value.trim();
    const newDesc = document.getElementById('edit-manga-desc').value.trim();

    toggleLoader(true);
    try {
        const { error } = await _supabase.from('mangas').update({ title: newTitle, desc: newDesc }).eq('title', oldTitle);
        if (error) throw error;
        alert("تم التحديث بنجاح");
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// حذف المانجا
async function deleteManga() {
    const title = document.getElementById('manga-select-manage').value;
    if (!confirm(`هل تريد حذف ${title} نهائياً؟`)) return;

    toggleLoader(true);
    try {
        const { error } = await _supabase.from('mangas').delete().eq('title', title);
        if (error) throw error;
        alert("تم الحذف");
        document.getElementById('edit-box').classList.add('hidden-section');
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// إضافة مانجا جديدة
async function addNewManga() {
    const title = document.getElementById('manga-title').value.trim();
    const desc = document.getElementById('manga-desc').value.trim();
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("أكمل البيانات");

    toggleLoader(true);
    try {
        const fileName = `covers/${Date.now()}.png`;
        await _supabase.storage.from('vander-files').upload(fileName, file);
        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const { error } = await _supabase.from('mangas').insert([{
            title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
        }]);
        if (error) throw error;
        alert("تم الحفظ!");
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// إضافة فصل
async function addChapter() {
    const mTitle = document.getElementById('manga-select-add').value;
    const cTitle = document.getElementById('chapter-title').value.trim();
    const file = document.getElementById('chapter-file').files[0];

    if (!mTitle || !cTitle || !file) return alert("أكمل بيانات الفصل");

    toggleLoader(true);
    try {
        const fileName = `chapters/${Date.now()}.pdf`;
        await _supabase.storage.from('vander-files').upload(fileName, file);
        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const manga = mangas.find(m => m.title === mTitle);
        const newChapters = [...(manga.chapters || []), { title: cTitle, url: urlData.publicUrl }];

        await _supabase.from('mangas').update({ chapters: newChapters, lastUpdated: new Date() }).eq('title', mTitle);
        alert("تم رفع الفصل!");
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// عرض التفاصيل
function openManga(title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return;
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc || '';
    document.getElementById('chapters-list').innerHTML = (m.chapters || []).map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')"><span>${c.title}</span> <b>قراءة ←</b></li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

// المساعدات
function toggleLoader(show) { document.getElementById('loading-overlay').classList.toggle('hidden-section', !show); }

function updateAdminOptions() {
    const opts = '<option value="">اختر المانجا</option>' + mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = opts;
    document.getElementById('manga-select-manage').innerHTML = opts;
}

function login() {
    if (document.getElementById('username').value === 'samer' && document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("خطأ");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) { showSection('admin-dashboard'); showAdminTab('add-panel'); }
    else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

window.onload = loadData;
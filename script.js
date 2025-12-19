const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// جلب البيانات الأساسية
async function loadData() {
    toggleLoader(true);
    try {
        const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
        if (error) throw error;
        mangas = data || [];
        renderHome();
        updateAdminLists();
    } catch (err) {
        console.error("خطأ جلب البيانات:", err.message);
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

// إضافة مانجا
async function addNewManga() {
    const title = document.getElementById('manga-title').value.trim();
    const desc = document.getElementById('manga-desc').value.trim();
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("أكمل البيانات المطلوبة");

    toggleLoader(true);
    try {
        const fileName = `covers/${Date.now()}.png`;
        await _supabase.storage.from('vander-files').upload(fileName, file);
        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const { error } = await _supabase.from('mangas').insert([{
            title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
        }]);

        if (error) throw error;
        alert("تمت الإضافة!");
        loadData();
    } catch (err) { alert("فشل: " + err.message); }
    toggleLoader(false);
}

// إضافة فصل (تحديث ملف المانجا)
async function addChapter() {
    const mTitle = document.getElementById('manga-select-add').value;
    const cTitle = document.getElementById('chapter-title').value.trim();
    const file = document.getElementById('chapter-file').files[0];

    if (!mTitle || !cTitle || !file) return alert("أكمل بيانات الفصل");

    toggleLoader(true);
    try {
        // 1. رفع ملف الـ PDF
        const fileName = `chapters/${Date.now()}_chapter.pdf`;
        const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);
        if (upErr) throw upErr;

        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        // 2. تحديث مصفوفة الفصول في الجدول
        const manga = mangas.find(m => m.title === mTitle);
        const updatedChapters = [...(manga.chapters || []), { title: cTitle, url: urlData.publicUrl }];

        const { error: dbErr } = await _supabase.from('mangas')
            .update({ chapters: updatedChapters, lastUpdated: new Date() })
            .eq('title', mTitle);

        if (dbErr) throw dbErr;
        
        alert("تم رفع الفصل وتحديث المانجا!");
        loadData();
    } catch (err) { alert("خطأ: " + err.message); }
    toggleLoader(false);
}

// تعديل وحذف
async function updateManga() {
    const oldTitle = document.getElementById('manga-select-manage').value;
    const newTitle = document.getElementById('edit-manga-title').value;
    const newDesc = document.getElementById('edit-manga-desc').value;

    toggleLoader(true);
    const { error } = await _supabase.from('mangas').update({ title: newTitle, desc: newDesc }).eq('title', oldTitle);
    if (error) alert(error.message);
    else { alert("تم التحديث"); loadData(); }
    toggleLoader(false);
}

async function deleteManga() {
    const title = document.getElementById('manga-select-manage').value;
    if (!confirm("حذف نهائي؟")) return;
    toggleLoader(true);
    const { error } = await _supabase.from('mangas').delete().eq('title', title);
    if (error) alert(error.message);
    else { alert("تم الحذف"); loadData(); }
    toggleLoader(false);
}

// وظائف الواجهة
function openManga(title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return;
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc || 'لا يوجد وصف.';
    document.getElementById('chapters-list').innerHTML = (m.chapters || []).map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')"><span>${c.title}</span> <b>قراءة ←</b></li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
}

function toggleLoader(show) { document.getElementById('loading-overlay').classList.toggle('hidden-section', !show); }

function updateAdminLists() {
    const options = '<option value="">اختر المانجا</option>' + mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = options;
    document.getElementById('manga-select-manage').innerHTML = options;
}

function showAdminTab(id) {
    document.getElementById('add-panel').classList.toggle('hidden-tab', id !== 'add-panel');
    document.getElementById('manage-panel').classList.toggle('hidden-tab', id !== 'manage-panel');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

function login() {
    if (document.getElementById('username').value === 'samer' && document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("بيانات خاطئة");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) { showSection('admin-dashboard'); updateAdminLists(); }
    else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

window.onload = loadData;
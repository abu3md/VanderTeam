const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

async function loadData() {
    toggleLoader(true);
    const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    if (!error) {
        mangas = data;
        renderHome();
        updateAdminSelects();
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

// إضافة مانجا جديدة مع التفاصيل
async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const file = document.getElementById('manga-cover').files[0];
    if (!title || !file) return alert("الاسم والغلاف مطلوبان");

    toggleLoader(true);
    try {
        const fileName = `covers/${Date.now()}.png`;
        await _supabase.storage.from('vander-files').upload(fileName, file);
        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const newManga = {
            title,
            desc: document.getElementById('manga-desc').value,
            author: document.getElementById('manga-author').value,
            artist: document.getElementById('manga-artist').value,
            releaseDate: document.getElementById('manga-date').value,
            genres: document.getElementById('manga-genres').value,
            publisher: document.getElementById('manga-publisher').value,
            cover: urlData.publicUrl,
            chapters: [],
            lastUpdated: new Date()
        };

        const { error } = await _supabase.from('mangas').insert([newManga]);
        if (error) throw error;
        alert("تم الحفظ بنجاح");
        loadData();
    } catch (e) { alert(e.message); }
    toggleLoader(false);
}

// تحميل بيانات التعديل
function loadMangaToEdit() {
    const title = document.getElementById('manga-select-manage').value;
    const m = mangas.find(x => x.title === title);
    if (!m) return;

    document.getElementById('edit-box').classList.remove('hidden-section');
    document.getElementById('edit-manga-title').value = m.title;
    document.getElementById('edit-manga-author').value = m.author || '';
    document.getElementById('edit-manga-artist').value = m.artist || '';
    document.getElementById('edit-manga-date').value = m.releaseDate || '';
    document.getElementById('edit-manga-genres').value = m.genres || '';
    document.getElementById('edit-manga-publisher').value = m.publisher || '';
    document.getElementById('edit-manga-desc').value = m.desc || '';

    renderAdminChapters(m);
}

// تحديث المانجا (بما في ذلك الغلاف)
async function updateManga() {
    const oldTitle = document.getElementById('manga-select-manage').value;
    const m = mangas.find(x => x.title === oldTitle);
    const newCoverFile = document.getElementById('edit-manga-cover').files[0];

    toggleLoader(true);
    let coverUrl = m.cover;

    if (newCoverFile) {
        const fileName = `covers/${Date.now()}.png`;
        await _supabase.storage.from('vander-files').upload(fileName, newCoverFile);
        coverUrl = _supabase.storage.from('vander-files').getPublicUrl(fileName).data.publicUrl;
    }

    const updates = {
        title: document.getElementById('edit-manga-title').value,
        author: document.getElementById('edit-manga-author').value,
        artist: document.getElementById('edit-manga-artist').value,
        releaseDate: document.getElementById('edit-manga-date').value,
        genres: document.getElementById('edit-manga-genres').value,
        publisher: document.getElementById('edit-manga-publisher').value,
        desc: document.getElementById('edit-manga-desc').value,
        cover: coverUrl,
        lastUpdated: new Date()
    };

    const { error } = await _supabase.from('mangas').update(updates).eq('title', oldTitle);
    if (!error) { alert("تم التحديث"); loadData(); }
    toggleLoader(false);
}

// إدارة الفصول (إضافة)
async function addChapter() {
    const title = document.getElementById('manga-select-manage').value;
    const chTitle = document.getElementById('new-chapter-title').value;
    const file = document.getElementById('new-chapter-file').files[0];

    if (!chTitle || !file) return alert("أكمل بيانات الفصل");

    toggleLoader(true);
    const fileName = `chapters/${Date.now()}.pdf`;
    await _supabase.storage.from('vander-files').upload(fileName, file);
    const url = _supabase.storage.from('vander-files').getPublicUrl(fileName).data.publicUrl;

    const m = mangas.find(x => x.title === title);
    const newChapters = [...(m.chapters || []), { title: chTitle, url, id: Date.now() }];

    await _supabase.from('mangas').update({ chapters: newChapters, lastUpdated: new Date() }).eq('title', title);
    alert("تمت إضافة الفصل");
    loadData();
    toggleLoader(false);
}

// حذف فصل
async function deleteChapter(chId) {
    if (!confirm("هل تريد حذف هذا الفصل؟")) return;
    const title = document.getElementById('manga-select-manage').value;
    const m = mangas.find(x => x.title === title);
    const newChapters = m.chapters.filter(c => c.id !== chId);

    await _supabase.from('mangas').update({ chapters: newChapters }).eq('title', title);
    loadData();
}

// تبديل ملف فصل
async function replaceChapterFile(chId) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.onchange = async () => {
        toggleLoader(true);
        const file = input.files[0];
        const fileName = `chapters/${Date.now()}.pdf`;
        await _supabase.storage.from('vander-files').upload(fileName, file);
        const url = _supabase.storage.from('vander-files').getPublicUrl(fileName).data.publicUrl;

        const title = document.getElementById('manga-select-manage').value;
        const m = mangas.find(x => x.title === title);
        const newChapters = m.chapters.map(c => c.id === chId ? { ...c, url } : c);

        await _supabase.from('mangas').update({ chapters: newChapters }).eq('title', title);
        loadData();
        toggleLoader(false);
    };
    input.click();
}

function renderAdminChapters(manga) {
    const list = document.getElementById('admin-chapters-list');
    list.innerHTML = (manga.chapters || []).map(c => `
        <li>
            <span>${c.title}</span>
            <div class="admin-list-btns">
                <button class="mini-btn" style="background:var(--primary)" onclick="replaceChapterFile(${c.id})">تبديل الملف</button>
                <button class="mini-btn delete-btn" onclick="deleteChapter(${c.id})">حذف</button>
            </div>
        </li>
    `).join('');
}

// فتح التفاصيل للمستخدم
function openManga(title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return;

    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-author').innerText = m.author || 'غير معروف';
    document.getElementById('detail-artist').innerText = m.artist || 'غير معروف';
    document.getElementById('detail-date').innerText = m.releaseDate || '-';
    document.getElementById('detail-genres').innerText = m.genres || '-';
    document.getElementById('detail-publisher').innerText = m.publisher || '-';
    document.getElementById('detail-desc').innerText = m.desc || '';
    
    // تاريخ آخر تحديث بتنسيق جميل
    const date = new Date(m.lastUpdated);
    document.getElementById('detail-last-update').innerText = date.toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });

    document.getElementById('chapters-list').innerHTML = (m.chapters || []).map(c => `
        <li onclick="viewPDF('${c.url}', '${c.title}')">
            <span>${c.title}</span>
            <span>قراءة ←</span>
        </li>
    `).join('');

    showSection('manga-details-view');
}

// وظائف مساعدة
function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}"></iframe>`;
    showSection('reader-view');
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
}

function showAdminTab(id) {
    document.getElementById('add-panel').classList.toggle('hidden-section', id !== 'add-panel');
    document.getElementById('manage-panel').classList.toggle('hidden-section', id !== 'manage-panel');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

function updateAdminSelects() {
    const options = '<option value="">اختر المانجا لإدارتها</option>' + 
                    mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    document.getElementById('manga-select-manage').innerHTML = options;
}

function toggleLoader(show) { document.getElementById('loading-overlay').classList.toggle('hidden-section', !show); }

function login() {
    if (document.getElementById('username').value === 'samer' && document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("خطأ في البيانات");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) showSection('admin-dashboard');
    else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

window.onload = loadData;
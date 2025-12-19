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
        updateAdminOptions();
    } catch (err) {
        console.error("Error loading data:", err.message);
    }
    toggleLoader(false);
}

// عرض المانجا في الرئيسية
function renderHome() {
    const grid = document.getElementById('manga-grid');
    if (!grid) return;
    grid.innerHTML = mangas.map(m => `
        <div class="manga-card" onclick="openManga('${m.title}')">
            <img src="${m.cover}" class="card-image" onerror="this.src='mainL.png'">
            <div class="manga-title-overlay">${m.title}</div>
        </div>
    `).join('');
}

// دالة الحذف المُصلحة
async function deleteManga() {
    const selectedTitle = document.getElementById('manga-select-manage').value;
    
    if (!selectedTitle) return alert("يرجى اختيار مانجا أولاً");
    
    const confirmDelete = confirm(`هل أنت متأكد تماماً من حذف مانجا "${selectedTitle}"؟ لا يمكن التراجع عن هذا الإجراء.`);
    
    if (confirmDelete) {
        toggleLoader(true);
        try {
            const { error } = await _supabase
                .from('mangas')
                .delete()
                .eq('title', selectedTitle);

            if (error) throw error;

            alert("تم حذف المانجا بنجاح من قاعدة البيانات");
            
            // إخفاء صندوق التعديل بعد الحذف
            document.getElementById('edit-box').classList.add('hidden-section');
            
            // إعادة تحميل البيانات لتحديث الموقع
            await loadData();
            
        } catch (err) {
            alert("حدث خطأ أثناء الحذف: " + err.message + "\nتأكد من تفعيل سياسة الـ DELETE في Supabase.");
        }
        toggleLoader(false);
    }
}

// تحديث المانجا
async function updateManga() {
    const oldTitle = document.getElementById('manga-select-manage').value;
    const newTitle = document.getElementById('edit-manga-title').value.trim();
    const newDesc = document.getElementById('edit-manga-desc').value.trim();

    if (!newTitle) return alert("الاسم لا يمكن أن يكون فارغاً");

    toggleLoader(true);
    try {
        const { error } = await _supabase.from('mangas').update({ title: newTitle, desc: newDesc }).eq('title', oldTitle);
        if (error) throw error;
        alert("تم التحديث بنجاح");
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// تحميل المانجا المختارة في صندوق التعديل
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

// إضافة مانجا جديدة
async function addNewManga() {
    const title = document.getElementById('manga-title').value.trim();
    const desc = document.getElementById('manga-desc').value.trim();
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("أكمل البيانات (الاسم والغلاف)");

    toggleLoader(true);
    try {
        const fileName = `covers/${Date.now()}.png`;
        const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);
        if (upErr) throw upErr;

        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const { error } = await _supabase.from('mangas').insert([{
            title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
        }]);
        if (error) throw error;
        alert("تم حفظ المانجا بنجاح!");
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

        const { error } = await _supabase.from('mangas').update({ chapters: newChapters, lastUpdated: new Date() }).eq('title', mTitle);
        if (error) throw error;
        alert("تم رفع الفصل!");
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// وظائف التنقل والواجهة
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
}

function showAdminTab(tabId) {
    document.getElementById('add-panel').classList.toggle('hidden-section', tabId !== 'add-panel');
    document.getElementById('manage-panel').classList.toggle('hidden-section', tabId !== 'manage-panel');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', tabId === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', tabId === 'manage-panel');
}

function updateAdminOptions() {
    const opts = '<option value="">اختر المانجا</option>' + mangas.map(m => `<option value="${m.title}">${m.title}</option>`).join('');
    document.getElementById('manga-select-add').innerHTML = opts;
    document.getElementById('manga-select-manage').innerHTML = opts;
}

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

function toggleLoader(show) { document.getElementById('loading-overlay').classList.toggle('hidden-section', !show); }

function login() {
    if (document.getElementById('username').value === 'samer' && document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("بيانات خاطئة");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) { showSection('admin-dashboard'); updateAdminOptions(); }
    else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

window.onload = loadData;
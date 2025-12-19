const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

// 1. جلب البيانات فور تحميل الموقع
async function loadData() {
    toggleLoader(true);
    try {
        const { data, error } = await _supabase
            .from('mangas')
            .select('*')
            .order('lastUpdated', { ascending: false });

        if (error) throw error;
        
        mangas = data || [];
        renderHome();
        updateAdminSelects();
    } catch (err) {
        console.error("خطأ في جلب البيانات:", err.message);
    }
    toggleLoader(false);
}

// 2. عرض المانجا في الشبكة
function renderHome() {
    const grid = document.getElementById('manga-grid');
    if (!grid) return;
    
    if (mangas.length === 0) {
        grid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">لا توجد بيانات متاحة حالياً.</p>';
        return;
    }

    grid.innerHTML = mangas.map(m => `
        <div class="manga-card" onclick="openManga('${m.title}')">
            <img src="${m.cover}" class="card-image" onerror="this.src='mainL.png'">
            <div class="manga-title-overlay">${m.title}</div>
        </div>
    `).join('');
}

// 3. التنقل بين الصفحات
function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if (id === 'home-view') loadData();
}

// 4. فتح صفحة التفاصيل
function openManga(title) {
    const m = mangas.find(x => x.title === title);
    if (!m) return;

    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc || 'لا يوجد وصف.';
    
    const list = document.getElementById('chapters-list');
    list.innerHTML = (m.chapters && m.chapters.length > 0) 
        ? m.chapters.map(c => `<li onclick="viewPDF('${c.url}', '${c.title}')"><span>${c.title}</span> <b>قراءة ←</b></li>`).join('')
        : '<li>لا توجد فصول حالياً</li>';

    showSection('manga-details-view');
}

// 5. إضافة مانجا جديدة
async function addNewManga() {
    const title = document.getElementById('manga-title').value.trim();
    const desc = document.getElementById('manga-desc').value.trim();
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("يرجى إدخال اسم المانجا واختيار صورة الغلاف.");

    toggleLoader(true);
    try {
        // رفع الغلاف
        const fileName = `covers/${Date.now()}_${title}.png`;
        const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);
        if (upErr) throw upErr;

        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        // حفظ في الجدول
        const { error: dbErr } = await _supabase.from('mangas').insert([{
            title: title,
            desc: desc,
            cover: urlData.publicUrl,
            chapters: [],
            lastUpdated: new Date()
        }]);

        if (dbErr) throw dbErr;
        alert("تمت الإضافة بنجاح!");
        loadData();
        showSection('home-view');
    } catch (err) { alert("خطأ: " + err.message); }
    toggleLoader(false);
}

// 6. رفع فصل جديد
async function addChapter() {
    const mTitle = document.getElementById('manga-select-add').value;
    const cTitle = document.getElementById('chapter-title').value.trim();
    const file = document.getElementById('chapter-file').files[0];

    if (!mTitle || !cTitle || !file) return alert("أكمل بيانات الفصل.");

    toggleLoader(true);
    try {
        const fileName = `chapters/${Date.now()}_${cTitle}.pdf`;
        await _supabase.storage.from('vander-files').upload(fileName, file);
        const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

        const m = mangas.find(x => x.title === mTitle);
        const updatedChapters = [...(m.chapters || []), { title: cTitle, url: urlData.publicUrl }];

        await _supabase.from('mangas').update({ chapters: updatedChapters, lastUpdated: new Date() }).eq('title', mTitle);
        
        alert("تم رفع الفصل!");
        loadData();
    } catch (err) { alert(err.message); }
    toggleLoader(false);
}

// 7. حذف وتعديل
async function deleteManga() {
    const title = document.getElementById('manga-select-manage').value;
    if (!title || !confirm(`هل أنت متأكد من حذف ${title}؟`)) return;

    toggleLoader(true);
    const { error } = await _supabase.from('mangas').delete().eq('title', title);
    if (error) alert(error.message);
    else { alert("تم الحذف"); loadData(); document.getElementById('edit-box').classList.add('hidden-section'); }
    toggleLoader(false);
}

function loadMangaToEdit() {
    const title = document.getElementById('manga-select-manage').value;
    const m = mangas.find(x => x.title === title);
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
    const { error } = await _supabase.from('mangas').update({ title: newTitle, desc: newDesc }).eq('title', oldTitle);
    if (error) alert(error.message);
    else { alert("تم التحديث!"); loadData(); }
    toggleLoader(false);
}

// قارئ PDF
function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}#toolbar=0"></iframe>`;
    showSection('reader-view');
}

// أدوات المساعدة
function toggleLoader(show) { document.getElementById('loading-overlay').classList.toggle('hidden-section', !show); }

function updateAdminSelects() {
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

// الدخول
function login() {
    if (document.getElementById('username').value === 'samer' && document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("خطأ!");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) { showSection('admin-dashboard'); updateAdminSelects(); }
    else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

window.onload = loadData;
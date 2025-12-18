const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

function toggleLoader(show, text = "جارٍ المعالجة...") {
    document.getElementById('loading-text').innerText = text;
    document.getElementById('loading-overlay').classList.toggle('hidden-section', !show);
}

// جلب البيانات من السيرفر
async function fetchAllData() {
    toggleLoader(true, "جارٍ جلب المانجا...");
    const { data, error } = await _supabase.from('mangas').select('*').order('lastUpdated', { ascending: false });
    if (error) {
        console.error("خطأ جلب البيانات:", error);
    } else {
        mangas = data;
        renderHome();
    }
    toggleLoader(false);
}

function showSection(id) {
    document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden-section'));
    document.getElementById(id).classList.remove('hidden-section');
    if (id === 'home-view') fetchAllData();
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

// إضافة مانجا مع معالجة أخطاء الرفع
async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("يرجى إدخال الاسم واختيار صورة");
    toggleLoader(true, "جارٍ رفع الصورة للسيرفر...");

    const fileName = `covers/${Date.now()}_${file.name}`;
    const { data: upData, error: upError } = await _supabase.storage
        .from('vander-files')
        .upload(fileName, file, { upsert: true });

    if (upError) {
        toggleLoader(false);
        console.error("خطأ الرفع التفصيلي:", upError);
        return alert("فشل الرفع! تأكد من إعداد الـ Policies في Supabase Storage للسماح بالرفع (INSERT).");
    }

    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    const { error: dbError } = await _supabase.from('mangas').insert([{
        title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
    }]);

    if(dbError) alert("خطأ في قاعدة البيانات: " + dbError.message);
    else alert("تم الحفظ بنجاح!");
    
    fetchAllData();
    toggleLoader(false);
}

// رفع فصل
async function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if (!mId || !file) return alert("اكمل بيانات الفصل");
    toggleLoader(true, "جارٍ رفع ملف الـ PDF...");

    const fileName = `chapters/${Date.now()}.pdf`;
    const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);

    if(upErr) { toggleLoader(false); return alert("خطأ في رفع ملف الفصل"); }

    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    const m = mangas.find(x => x.id == mId);
    const updatedChapters = [...m.chapters, { id: Date.now(), title, url: urlData.publicUrl }];

    await _supabase.from('mangas').update({ chapters: updatedChapters, lastUpdated: new Date() }).eq('id', mId);

    alert("تم رفع الفصل!");
    fetchAllData();
    toggleLoader(false);
}

// عرض التفاصيل
function openManga(id) {
    const m = mangas.find(x => x.id == id);
    document.getElementById('detail-cover').src = m.cover;
    document.getElementById('detail-title').innerText = m.title;
    document.getElementById('detail-desc').innerText = m.desc;
    document.getElementById('chapters-list').innerHTML = m.chapters.map(c => 
        `<li onclick="viewPDF('${c.url}', '${c.title}')">${c.title} <span>قراءة ←</span></li>`).join('');
    showSection('manga-details-view');
}

function viewPDF(url, title) {
    document.getElementById('reader-chapter-title').innerText = title;
    // إضافة پارامتر لضمان عدم الكاش وظهور الملف فوراً
    document.getElementById('pdf-viewer-container').innerHTML = `<iframe src="${url}#toolbar=0"></iframe>`;
    showSection('reader-view');
}

function backToManga() { showSection('manga-details-view'); }

// إدارة الأدمن
function login() {
    if (document.getElementById('username').value === 'samer' && 
        document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("بيانات خاطئة");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        const options = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
        document.getElementById('manga-select-add').innerHTML = '<option value="">اختر المانجا</option>' + options;
        document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر المانجا للإدارة</option>' + options;
    } else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

function showAdminTab(id) {
    document.querySelectorAll('.admin-content').forEach(c => c.classList.add('hidden-tab'));
    document.getElementById(id).classList.remove('hidden-tab');
    document.getElementById('btn-tab-1').classList.toggle('active-tab', id === 'add-panel');
    document.getElementById('btn-tab-2').classList.toggle('active-tab', id === 'manage-panel');
}

// إدارة وتعديل
let currentEditId = null;
function loadMangaToEdit() {
    currentEditId = document.getElementById('manga-select-manage').value;
    const m = mangas.find(x => x.id == currentEditId);
    if(!m) return document.getElementById('edit-box').classList.add('hidden-section');
    
    document.getElementById('edit-box').classList.remove('hidden-section');
    document.getElementById('edit-manga-title').value = m.title;
    document.getElementById('edit-manga-desc').value = m.desc;
    document.getElementById('edit-chapters-list').innerHTML = m.chapters.map(c => 
        `<li>${c.title} <button class="delete-btn" style="padding:4px" onclick="deleteChapter(${c.id})">حذف</button></li>`).join('');
}

async function updateManga() {
    toggleLoader(true, "جارٍ التحديث...");
    await _supabase.from('mangas').update({
        title: document.getElementById('edit-manga-title').value,
        desc: document.getElementById('edit-manga-desc').value
    }).eq('id', currentEditId);
    alert("تم التحديث");
    fetchAllData();
}

async function deleteManga() {
    if(!confirm("حذف نهائي؟")) return;
    toggleLoader(true, "جارٍ الحذف...");
    await _supabase.from('mangas').delete().eq('id', currentEditId);
    fetchAllData();
    document.getElementById('edit-box').classList.add('hidden-section');
}

window.onload = fetchAllData;
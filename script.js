const supabaseUrl = 'https://vmfqrsocsdtntealjyvh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZnFyc29jc2R0bnRlYWxqeXZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNzE2MzgsImV4cCI6MjA4MTY0NzYzOH0.Nc2MMDpqqrJwMsqH_pLjBQf6tXqLtNmwGA8LmPcqU34'; 
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let mangas = [];

function showLoader(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden-section', !show);
}

// جلب البيانات
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

// إضافة مانجا (إصلاح خطأ الرفع)
async function addNewManga() {
    const title = document.getElementById('manga-title').value;
    const desc = document.getElementById('manga-desc').value;
    const file = document.getElementById('manga-cover').files[0];

    if (!title || !file) return alert("أكمل البيانات");
    showLoader(true);

    // رفع الصورة
    const fileName = `covers/${Date.now()}_${file.name}`;
    const { data, error } = await _supabase.storage.from('vander-files').upload(fileName, file);

    if (error) {
        console.error(error);
        showLoader(false);
        return alert("فشل الرفع: تأكد من إنشاء Bucket باسم vander-files وجعله Public في Supabase");
    }

    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    const { error: dbError } = await _supabase.from('mangas').insert([{
        title, desc, cover: urlData.publicUrl, chapters: [], lastUpdated: new Date()
    }]);

    if(dbError) alert("خطأ في حفظ البيانات: " + dbError.message);
    else alert("تم الحفظ بنجاح!");
    
    fetchData();
}

// رفع فصل
async function addChapter() {
    const mId = document.getElementById('manga-select-add').value;
    const title = document.getElementById('chapter-title').value;
    const file = document.getElementById('chapter-file').files[0];

    if (!mId || !file) return alert("اختر المانجا والملف");
    showLoader(true);

    const fileName = `chapters/${Date.now()}.pdf`;
    const { error: upErr } = await _supabase.storage.from('vander-files').upload(fileName, file);

    if(upErr) { showLoader(false); return alert("خطأ رفع الـ PDF"); }

    const { data: urlData } = _supabase.storage.from('vander-files').getPublicUrl(fileName);

    const m = mangas.find(x => x.id == mId);
    const newChapters = [...m.chapters, { id: Date.now(), title, url: urlData.publicUrl }];

    await _supabase.from('mangas').update({ chapters: newChapters, lastUpdated: new Date() }).eq('id', mId);

    alert("تم رفع الفصل!");
    fetchData();
}

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

// نظام الأدمن المبسط
function login() {
    if (document.getElementById('username').value === 'samer' && 
        document.getElementById('password').value === 'Samer#1212') {
        sessionStorage.setItem('isAdmin', 'true');
        checkAdminStatus();
    } else alert("خطأ");
}

function checkAdminStatus() {
    if (sessionStorage.getItem('isAdmin')) {
        showSection('admin-dashboard');
        const html = mangas.map(m => `<option value="${m.id}">${m.title}</option>`).join('');
        document.getElementById('manga-select-add').innerHTML = '<option value="">اختر</option>' + html;
        document.getElementById('manga-select-manage').innerHTML = '<option value="">اختر</option>' + html;
    } else showSection('login-view');
}

function logout() { sessionStorage.removeItem('isAdmin'); showSection('home-view'); }

window.onload = fetchData;